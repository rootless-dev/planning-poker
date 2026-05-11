# Ajustes menores de UX

Data: 2026-05-11
Branch: `develop`

Cinco ajustes pontuais. Cada item descreve causa raiz, solução e arquivos afetados.

## 1. Posições fixas dos participantes na mesa

**Sintoma:** A cada update (voto, presença), participantes "alternam" de posição na mesa oval.

**Causa raiz:** `useRoomStore.participantsList` faz `Object.entries(r.participants)` sem sort. A ordem de iteração de objetos JS preserva a inserção, mas a desserialização do snapshot do Firestore pode mudar a ordem entre updates dependendo das alterações.

**Solução:** Ordenar `participantsList` por `joinedAt` ascendente. `joinedAt` é um `Timestamp` já gravado quando o participante entra. Posição em `PokerTable` (`-90 + i * (360/n)`) passa a ser determinística pela ordem de entrada.

**Arquivos:**
- `src/stores/roomStore.ts` — adicionar sort por `joinedAt`
- `tests/unit/composables/useRoom.test.ts` (se houver assertiva de ordem) — atualizar/adicionar

## 2. Encolher EmojiPanel no desktop

**Atual:** `340px × 80vh`, `min-height: 320px`.

**Solução:** `300px × 360px` (com `max-height` para não passar disso), e definir `--num-columns: 7` no `emoji-picker-element`. Bottom-sheet mobile (`@media max-width: 767px`) permanece igual.

**Arquivos:**
- `src/components/room/EmojiPanel.vue`

## 3. Acessar reações via menu "..."

**Atual:** Clicar `⋯` na própria cadeira (`isSelf`) abre o `EmojiPanel` direto.

**Solução:** Unificar comportamento — `⋯` sempre abre um `kick-menu` estilizado:
- Self → item **"Reagir"** (emite `open-emoji-panel`)
- Outro participante, moderador → item **"Remover"** (comportamento atual)

**Arquivos:**
- `src/components/room/PlayerSeat.vue` — refatorar `onTriggerClick` / template do menu
- `tests/unit/components/PlayerSeat.test.ts` — adicionar test do novo fluxo

## 4. "Entrar com link" aceita apenas UUID

**Atual:** Campo aceita URL completa ou UUID. Mensagem genérica.

**Solução:** Restringir UI a UUID:
- Label: "ID da sala"
- Placeholder com exemplo de UUID v4
- Validação: regex UUID — se URL detectada, mostrar erro inline "Cole apenas o ID da sala"
- Rota `/session/:id` continua aceitando links colados na barra

**Arquivos:**
- `src/components/home/HeroSection.vue`

## 5. Modal "Copiar link" com duas opções

**Atual:** Botão "Copiar link" no `RoomHeader` copia URL inteira e mostra toast.

**Solução:** Botão abre `Modal` com dois botões:
- "Copiar link completo" → `window.location.href`
- "Copiar ID da sessão" → apenas UUID

Modal permanece aberto após copiar (usuário pode copiar ambos sem reabrir). Toast mantém-se. Fecha via X ou backdrop.

**Arquivos:**
- `src/components/room/RoomHeader.vue` — adicionar state, modal e funções

## Verificação

- `bun run lint:types`
- `bun run test`
- `bun run test:integration`
- Smoke manual no navegador (cada item)
