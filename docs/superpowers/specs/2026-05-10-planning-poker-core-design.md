# Planning Poker — Core (MVP enxuto)

**Data:** 2026-05-10
**Status:** Aprovado para implementação
**Escopo:** primeira fatia entregável de um Planning Poker em tempo real

## 1. Objetivo

Entregar uma SPA de Planning Poker que permita a um time distribuído criar uma sala em segundos, compartilhar por link, votar em conjunto e revelar votos em tempo real — sem cadastro e com baixíssima fricção.

Este spec descreve o **core enxuto**. Ele intencionalmente exclui várias features descritas em `docs/IDEA.md` (histórico de rodadas, spectator mode, integrações, login social, timer, chat etc.) — essas ficam para fases seguintes.

### Critérios de sucesso

- Um usuário cria uma sala, copia o link e um colega entra em outra aba/dispositivo, vê a sala em tempo real, vota e tem o voto revelado.
- Funciona bem em desktop e mobile (testado em viewport ≥360px).
- Reload de página mantém o usuário na mesa (rejoin transparente).
- Tempo do "criar sala" ao "todos votando" abaixo de 30 segundos.
- Salas inativas há 24h são removidas automaticamente.

## 2. Decisões-chave

| Item | Escolha |
|---|---|
| Stack frontend | Vue 3 + Vite + TypeScript + Bun + Pinia + Vue Router + Tailwind |
| Backend / realtime | Firebase: Auth Anônimo + Firestore (1 doc por sala) + Hosting |
| Identidade | Auth Anônimo do Firebase + nome digitado pelo usuário |
| Tema visual | Pastel brincalhão, com toggle dark/light persistente |
| Layout da sala | Mesa redonda central (responsivo: vira lista vertical em <768px) |
| Layout da home | Hero centralizado com CTAs "Criar sala" e "Entrar com link" |
| Sistemas de carta | Fibonacci, T-shirt e sequência customizada (escolha na criação) |
| Reveal | Manual pelo moderador |
| Resultado pós-reveal | Cartas individuais + média numérica + moda + min/max |
| Lifecycle da sala | TTL 24h após `lastActivityAt` (Firestore TTL nativo) |
| Presença | Heartbeat via Firestore a cada 15s |

## 3. Arquitetura geral

```text
SPA Vue 3 (Vite + TS + Tailwind + Pinia + Router)

Rotas:
  /              → HomeView
  /session       → CreateSessionView
  /session/:id   → RoomView

Camada de dados:
  Firebase JS SDK (modular v10+)
    ├─ Auth (anônimo)
    └─ Firestore: rooms/{roomId} (documento único por sala)
```

**Camadas no front:**

- `src/views/` — componentes de rota.
- `src/components/` — UI reutilizável; subdiretórios `home/`, `create/`, `room/`, `ui/`.
- `src/composables/` — `useRoom`, `useAuth`, `usePresence`, `useDarkMode`, `useToasts`.
- `src/services/firebase/` — wrappers de Firestore/Auth, **sem dependência de Vue** (testáveis isoladamente).
- `src/stores/` — Pinia (`authStore`, `roomStore`).
- `src/lib/` — lógica pura: `decks`, `stats`, `uuid`, `time`.
- `src/types/` — interfaces compartilhadas.

**Princípio:** services não conhecem Vue; composables/stores orquestram services e expõem reatividade; componentes consomem composables. Testes unitários atacam services e lógica pura sem renderizar nada.

## 4. Modelo de dados

### Documento `rooms/{roomId}`

```ts
interface Room {
  id: string                     // UUID v4 — também é o slug da URL
  name: string                   // ex: "Sprint 42 — backend"
  createdAt: Timestamp
  lastActivityAt: Timestamp      // tocado em qualquer escrita
  expiresAt: Timestamp           // = lastActivityAt + 24h, usado pelo TTL
  moderatorUid: string           // criador da sala

  deck: {
    type: 'fibonacci' | 'tshirt' | 'custom'
    values: string[]             // ex: ["1","2","3","5","8","?","☕"]
  }

  round: {
    taskTitle: string            // editável pelo moderador
    revealed: boolean            // false = votos escondidos
    startedAt: Timestamp
  }

  participants: {
    [uid: string]: {
      name: string
      vote: string | null        // valor da carta ou null
      lastSeenAt: Timestamp      // heartbeat
      joinedAt: Timestamp
    }
  }
}
```

### Decisões intencionais

- **`participants` é um map**, não subcoleção. Lê e atualiza tudo em uma só leitura/listener (`onSnapshot`).
- **`vote` fica visível no doc**. O front esconde antes de `revealed=true`. Trade-off aceito (contexto de time confiável).
- **`expiresAt`** é Timestamp; o TTL do Firestore é configurado nesse campo via console — sem Cloud Function.
- **`lastActivityAt`** é tocado em qualquer mutação (`vote`, `reveal`, `reset`, `rename`, `kick`). Ao tocar, recalculo `expiresAt = lastActivityAt + 24h`.
- **Reset de rodada** = `participants.*.vote = null`, `round.revealed = false`, `round.startedAt = now`, `round.taskTitle` opcionalmente novo.
- **Expulsar** = `delete participants.{uid}`. O cliente alvo, ao detectar que sumiu do snapshot, é redirecionado para Home.

### Regras do Firestore

```
match /rooms/{roomId} {
  allow read: if request.auth != null;

  allow create: if request.auth != null
                && request.auth.uid == request.resource.data.moderatorUid;

  allow update: if request.auth != null && (
    isModeratorWriting() ||                 // moderador pode mudar tudo
    isSelfUpdatingOwnParticipant() ||       // participante só mexe no próprio map entry
    isSelfHeartbeatOnly()                   // heartbeat sempre permitido pra qualquer auth
  );

  // delete da sala inteira: reservado para fase 2 (sem UX no core).
  // Mantida restrita ao moderador para evitar exclusões indevidas se chegar.
  allow delete: if request.auth.uid == resource.data.moderatorUid;
}
```

Observação: **expulsar participante** usa `update` com `FieldValue.delete()` em `participants.{uid}` — cai sob `allow update` (`isModeratorWriting`), não sob `allow delete`. A regra `allow delete` acima é apenas para a hipótese futura de excluir a sala como um todo.

A implementação detalhada das funções de regra (`isModeratorWriting`, `isSelfUpdatingOwnParticipant`, `isSelfHeartbeatOnly`) fica em `firebase/firestore.rules`.

### Pré-requisitos no console Firebase

- Habilitar Auth provider **Anônimo**.
- Configurar **TTL** no campo `rooms.expiresAt`.
- Habilitar Hosting (para deploy).

## 5. Fluxos principais

### 5.1 Criar sala

```text
[Home] clica "Criar sala"
   → /session (form: nome da sala, seu nome, baralho)
   → submit
       services/firebase/auth.signInAnon()  (se ainda não auth)
       services/firebase/rooms.createRoom({ name, deck, moderatorName })
         - gera roomId (UUID v4 via crypto.randomUUID)
         - escreve doc com participants[uid] = { name, vote: null, ... }
         - moderatorUid = auth.currentUser.uid
   → router.push(`/session/${roomId}`)
```

### 5.2 Entrar pelo link

```text
Usuário abre /session/{roomId}
   → RoomView monta
   → services/firebase/auth.signInAnon()  (se ainda não auth)
   → services/firebase/rooms.subscribeToRoom(roomId) (onSnapshot)
   → doc existe?
       não → tela "Sala não encontrada" + link pra Home
       sim → meu uid está em participants?
              sim → entra direto (rejoin após reload)
              não → JoinNameModal: pede nome (pré-preenche com lastName do localStorage)
                    → services/firebase/rooms.joinRoom(roomId, name)
                    → adiciona participants[uid]
```

Persisto `lastName` em `localStorage` (chave global) para não pedir de novo.

### 5.3 Votar

```text
Participante clica numa carta da Hand
   → roomStore.castVote(value)
   → services/firebase/rooms.setVote(roomId, uid, value)
       update: participants.{uid}.vote = value
               lastActivityAt = serverTimestamp
               expiresAt = now + 24h
   → snapshot reativo: carta aparece "virada" (back) no lugar do participante
```

Antes de `revealed=true`, todos os clientes mostram cartas como **back**. O front lê apenas `vote !== null` para indicar "já votou".

### 5.4 Revelar

```text
Moderador clica "Revelar"
   → services/firebase/rooms.revealRound(roomId)
       update: round.revealed = true
               lastActivityAt + expiresAt
   → snapshot: clientes flipam as cartas (animação ~400ms)
   → ResultsPanel desliza com média/moda/min/max
```

Estatísticas são computadas no client a partir do snapshot — sem armazenar métricas no doc.

### 5.5 Nova rodada

```text
Moderador clica "Nova rodada"
   → modal opcional com novo taskTitle
   → services/firebase/rooms.startNewRound(roomId, newTitle?)
       update batch:
         - participants.*.vote = null  (loop nos uids)
         - round.revealed = false
         - round.startedAt = now
         - round.taskTitle = newTitle ?? mantém
```

### 5.6 Renomear tarefa

```text
Moderador clica no taskTitle no header → vira input → blur/Enter
   → services/firebase/rooms.renameTask(roomId, newTitle)
       update: round.taskTitle = newTitle
               lastActivityAt + expiresAt
```

### 5.7 Expulsar

```text
Moderador abre menu do participante → "Remover" → confirma
   → services/firebase/rooms.kickParticipant(roomId, uid)
       update: participants.{uid} = FieldValue.delete()
   → cliente alvo: useRoom detecta que seu uid sumiu → redirect /home + toast
```

### 5.8 Presença / heartbeat

```text
RoomView monta
   → usePresence(roomId, uid) inicia setInterval 15s:
       update: participants.{uid}.lastSeenAt = serverTimestamp
   → onUnmount + beforeunload: clearInterval

Render usa lib/time.ts:
   - online   se now - lastSeenAt < 30s
   - ausente  se 30s ≤ diff < 90s (avatar 50% opacidade)
   - offline  se diff ≥ 90s (não conta no votedCount, mas continua na mesa)
```

Não removo offline automaticamente — preserva nome/voto no rejoin. Moderador pode kickar.

## 6. UI / Componentes

### Árvore de componentes

```text
App.vue
├─ AppHeader.vue (logo + dark/light toggle)
└─ <RouterView/>
    ├─ HomeView.vue
    │   ├─ HeroSection.vue
    │   └─ HomeFooter.vue
    │
    ├─ CreateSessionView.vue
    │   ├─ TextField.vue × N
    │   ├─ DeckPicker.vue
    │   ├─ CustomDeckEditor.vue
    │   └─ PrimaryButton.vue
    │
    └─ RoomView.vue
        ├─ RoomHeader.vue
        ├─ PokerTable.vue
        │   └─ PlayerSeat.vue × N
        ├─ TableCenter.vue
        ├─ ResultsPanel.vue
        ├─ Hand.vue
        │   └─ PlayingCard.vue × N
        ├─ JoinNameModal.vue
        └─ ToastsLayer.vue
```

### Decisões de UI por componente-chave

- **`PokerTable.vue`** — anel de assentos com posições calculadas por ângulo (`transform: rotate(...) translate(...)`). ≥768px: mesa elíptica. <768px: lista vertical com cartas centralizadas.
- **`PlayingCard.vue`** — única source of truth visual. Props: `value`, `state: 'idle' | 'selected' | 'back' | 'revealed'`, `size: 'sm' | 'md' | 'lg'`. Flip via CSS 3D ~400ms. Cor pastel rotativa baseada em hash do nome (mesma lógica do avatar).
- **`Hand.vue`** — fan layout (cartas em leque) em desktop; barra horizontal scrollável em mobile. Carta selecionada ergue ~12px com tilt e cor mais saturada.
- **`RoomHeader.vue`** — `taskTitle` com click-to-edit pro moderador; share-link como botão "Copiar link" + toast.
- **`ResultsPanel.vue`** — slide-in quando `revealed=true`. 4 chips (Média, Moda, Mínimo, Máximo) + lista compacta "Nome → Carta". Indicador de divergência: quando `max - min ≥ 5` em decks numéricos, chip em laranja com microcopy "vale conversar".
- **`JoinNameModal.vue`** — modal não-fechável até preencher; pré-preenche com `localStorage.getItem('lastName')`.

### Estados visuais

- **Aguardando voto** — assento com **silhueta tracejada** (placeholder vazio) levemente flutuando (animação 2s infinite).
- **Já votou** — carta-back assentada (firme, sem flutuação) + chip "✓" no avatar.
- **Revelado** — flip → carta face com valor.
- **Ausente** — assento 50% opacidade, sem chip.
- **Moderador** — coroa pequena (👑) ao lado do nome.

### Tema (pastel brincalhão)

CSS variables no `:root` para light/dark, mapeadas em `tailwind.config.ts`:

| Token | Light | Dark |
|---|---|---|
| `brand` | `#9b6bff` | mesmo |
| `accent` | `#5cd4ff` | mesmo |
| `warm` / `sand` / `cool` | pastéis | mesmos |
| `ink` | `#3b1d6b` | `#f5efff` |
| `muted` | `#6b4aa1` | `#b9a7e0` |
| `surface` | `#ffffff` | `#1c1530` |
| `canvas` | gradiente warm→sand→cool claro | mesmo gradiente em 8% sobre `#0e0a1f` |

Toggle no `AppHeader`, persiste em `localStorage`, respeita `prefers-color-scheme` na primeira visita.

### Acessibilidade

- Foco visível em cartas e botões.
- `aria-pressed` na carta selecionada da mão.
- `aria-live="polite"` no `ResultsPanel`.
- Modal com focus trap + `aria-modal`.
- Atalho `r` no teclado: revela (só ativo pro moderador).

## 7. Erros, edge cases e race conditions

### 7.1 Erros previstos

| Cenário | UX |
|---|---|
| Sala não existe / expirada | Tela "Essa sala não existe ou expirou" + botão "Voltar pra home" |
| Falha ao autenticar anônimo | Toast "Não conseguimos te conectar" + botão retry |
| Falha de rede transiente | Banner discreto "Reconectando…" — Firestore reconecta sozinho |
| Escrita rejeitada por regras | Toast "Você não tem permissão" + log no console |
| Você foi removido | Redirect para `/` + toast "Você foi removido da sala" |
| Moderador saiu | Sem promoção automática no core. Mantém moderador (pode reconectar). |
| Nome duplicado | Permitido. Diferenciação por `uid` no menu de remover. |

### 7.2 Race conditions

- **Voto durante reveal**: comutativo. Se chegar antes do `revealed=true`, entra; se chegar depois, atualiza valor já visível. Aceito.
- **Reset durante voto**: voto novo pode persistir após reset se chegar depois. Moderador pode resetar de novo. Não vale complicar com transação no core.
- **Heartbeat enquanto sou removido**: o cliente, ao detectar `participants[meuUid] === undefined` no snapshot **antes** do próximo heartbeat, para o intervalo e redireciona. Janela de regeneração ~15s no pior caso.
- **Mesma conta anônima em duas abas**: as duas compartilham o mesmo assento. Limitação aceita (auth anônimo é por dispositivo).

### 7.3 Edge cases de presença

- **Aba dormindo**: heartbeat pausa; ao voltar, fica "ausente" 30–90s e depois "online".
- **Sala vazia**: doc continua até TTL de 24h. Próximo a abrir o link rejoin sem fricção.
- **Moderador caiu durante reveal**: `revealed=true` permanece. Sem moderador, ninguém reseta. Aceito no core.

## 8. Testes

### Estratégia

| Camada | Ferramenta | Cobertura |
|---|---|---|
| `services/firebase/*` | Vitest + Firebase Emulator Suite | Cada wrapper (`createRoom`, `joinRoom`, `setVote`, `revealRound`, `startNewRound`, `kickParticipant`, `renameTask`) — happy path e erros previstos |
| Regras Firestore | `@firebase/rules-unit-testing` | Não-mod não revela; participante só altera próprio nó; `create` exige `uid == moderatorUid`; `delete` só pelo mod |
| Composables (`useRoom`, `usePresence`) | Vitest + `@vue/test-utils` (services mockados) | Reatividade de `votedCount`, `allVoted`, `isModerator`; cleanup de heartbeat em unmount |
| `lib/stats.ts` | Vitest puro | Média/moda/min/max em decks numéricos e mistos (com `?`/`☕`) |
| Componentes-chave | `@vue/test-utils` (smoke) | `PlayingCard` em todos os estados; `PokerTable` com 1/3/8 participantes; `ResultsPanel` com diferentes estatísticas |

### Fora do core

- E2E (Playwright) — fica para fase 2.
- Testes de animação/visuais — não testados.
- Cobertura numérica — sem alvo fixo; critério é "services + regras + composables principais verdes antes de merge".

### Validação manual antes de merge final

Dois navegadores (normal + anônimo) lado a lado: criar sala, entrar pelo link, votar, revelar, resetar, expulsar, recarregar. Sem F5 forçado e sem console error = pronto.

## 9. Estrutura de arquivos final

```text
planning-poker/
├─ docs/
│  ├─ IDEA.md
│  └─ superpowers/specs/2026-05-10-planning-poker-core-design.md
├─ public/
│  └─ favicon.svg
├─ src/
│  ├─ main.ts
│  ├─ App.vue
│  ├─ router/index.ts
│  ├─ services/
│  │  └─ firebase/
│  │     ├─ index.ts
│  │     ├─ auth.ts
│  │     └─ rooms.ts
│  ├─ stores/
│  │  ├─ authStore.ts
│  │  └─ roomStore.ts
│  ├─ composables/
│  │  ├─ useAuth.ts
│  │  ├─ useRoom.ts
│  │  ├─ usePresence.ts
│  │  ├─ useDarkMode.ts
│  │  └─ useToasts.ts
│  ├─ lib/
│  │  ├─ decks.ts
│  │  ├─ stats.ts
│  │  ├─ uuid.ts
│  │  └─ time.ts
│  ├─ types/
│  │  └─ room.ts
│  ├─ views/
│  │  ├─ HomeView.vue
│  │  ├─ CreateSessionView.vue
│  │  └─ RoomView.vue
│  ├─ components/
│  │  ├─ AppHeader.vue
│  │  ├─ home/{HeroSection,HomeFooter}.vue
│  │  ├─ create/{DeckPicker,CustomDeckEditor}.vue
│  │  ├─ room/{RoomHeader,PokerTable,PlayerSeat,TableCenter,ResultsPanel,Hand,PlayingCard,JoinNameModal}.vue
│  │  └─ ui/{TextField,PrimaryButton,GhostButton,Modal,Toast}.vue
│  ├─ assets/tokens.css
│  └─ style.css
├─ tests/
│  ├─ services/{rooms,rules}.test.ts
│  ├─ composables/useRoom.test.ts
│  ├─ lib/stats.test.ts
│  └─ components/{PlayingCard,ResultsPanel}.test.ts
├─ firebase/
│  ├─ firestore.rules
│  ├─ firestore.indexes.json
│  └─ firebase.json
├─ .env.example
├─ tailwind.config.ts
├─ postcss.config.js
├─ vite.config.ts
├─ vitest.config.ts
├─ tsconfig.app.json
├─ package.json
└─ README.md
```

## 10. Pré-requisitos manuais do usuário

Antes ou durante a implementação, o usuário precisa:

1. Instalar Firebase CLI (`bun add -d firebase-tools` ou global).
2. Rodar `firebase login`.
3. Rodar `firebase init` selecionando Firestore + Hosting + Emulators (Auth + Firestore).
4. Habilitar **Auth Anônimo** no console.
5. Configurar **TTL** em `rooms.expiresAt` no console.
6. Copiar config de Firebase Web App para `.env.local` a partir de `.env.example`.

A implementação fornece tudo o que é código (rules, indexes, scripts, `.env.example`).

## 11. Plano de entrega — commits incrementais

Cada commit deixa o app rodando.

1. `chore: setup tooling` — Tailwind + Pinia + Router + Vitest + emulator config + `.env.example`.
2. `feat: design tokens e UI base` — CSS variables, dark/light toggle, `PrimaryButton`, `GhostButton`, `TextField`, `Modal`, `Toast`.
3. `feat: home view` — `HomeView` com hero centralizado e CTAs.
4. `feat: firebase services + auth anônimo` — `services/firebase/index.ts` + `auth.ts`, `authStore`, `useAuth`. Smoke test contra emulador.
5. `feat: criar sala` — `rooms.ts` (createRoom), `CreateSessionView` com `DeckPicker` + `CustomDeckEditor`. Após criar, navega para `/session/:id`. Testes de service + rules.
6. `feat: entrar na sala + presença` — `subscribeToRoom`, `joinRoom`, `JoinNameModal`, `usePresence`. `RoomView` com lista crua de participantes.
7. `feat: mesa redonda + cartas` — `PokerTable`, `PlayerSeat`, `Hand`, `PlayingCard` com flip. `setVote` funcional.
8. `feat: revelar + resetar + estatísticas` — `TableCenter`, `ResultsPanel`, `lib/stats.ts`. `revealRound`, `startNewRound`. Atalho `r`.
9. `feat: editar tarefa + remover participante + share link` — edição inline em `RoomHeader`, menu kick em `PlayerSeat`, copy-link.
10. `feat: mobile responsivo + polish` — mesa vira lista vertical em <768px, mão scrollável.
11. `docs: README com instruções de dev` — emulador, deploy no Firebase Hosting, troubleshooting.

## 12. Fora de escopo (fase 2)

Confirmadas como **não inclusas** neste spec:

- Histórico de rodadas
- Spectator mode
- Promoção automática de moderador
- Voto cifrado client-side
- QR code de sharing
- Login com Google/GitHub
- Timer da rodada
- Chat
- Animações de reveal mais elaboradas (confete etc.)
- Integrações Jira/Trello
- Temas visuais alternativos (além do toggle dark/light)
- Limite configurável de usuários por sala
- Modo anônimo opt-in (sempre é anônimo no core)
