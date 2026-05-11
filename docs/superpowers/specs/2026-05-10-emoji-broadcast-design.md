# Emoji Broadcast — Reações simples por participante

**Data:** 2026-05-10
**Status:** Aprovado para implementação
**Escopo:** adicionar à sala um sistema simples de "chat-emoji": qualquer participante envia um emoji que aparece como balão sobre seu próprio nome para todos da sessão.

## 1. Objetivo

Permitir reações leves e em tempo real durante a sessão de Planning Poker — para celebrar, concordar, brincar — sem introduzir um chat textual completo. A entrada ocorre pelo botão "⋯" da própria cadeira; um painel abre à direita (bottom sheet em mobile) com um picker amplo de emojis; clicar envia para todos e exibe um balão animado sobre o nome do remetente.

### Critérios de sucesso

- Qualquer participante consegue abrir o painel, clicar num emoji e ver o balão aparecer sobre seu nome em todos os clientes em menos de 1s na maioria dos casos.
- O painel some com animação imediatamente após o clique.
- Cooldown de 2s impede spam acidental e é aplicado também server-side.
- Sem regressão nas funcionalidades existentes (votar, revelar, remover participante).

## 2. Decisões-chave

| Item | Escolha |
|---|---|
| Quem envia | Qualquer participante (não só moderador) |
| Entrada | Botão "⋯" da própria cadeira (`isSelf`) abre o painel; "⋯" em outros continua sendo "Remover" do moderador |
| Picker | Lib `emoji-picker-element` (web component) — categorias, busca, frequentes |
| Set de emojis | Universo Unicode completo do picker — sem allowlist curada |
| Animação no painel | Slide-in da direita (desktop) ou de baixo (mobile); slide-out ao enviar |
| Apresentação para os outros | Balão de fala animado sobre o nome do remetente (`EmojiBubble.vue`), ~2.2s total |
| Animação dos emojis | Best-effort: Lottie do Noto Animated Emoji quando disponível; fallback Unicode |
| Modelo de dados | Campo `lastEmoji = { value, sentAt }` em `participants.{uid}` no doc da sala |
| Anti-spam | Cooldown ≥ 2s, validado tanto no cliente quanto via regra Firestore |

## 3. Arquitetura geral

A feature reusa o doc único da sala e o pipeline existente de snapshots. Sem subcoleções nem Realtime Database.

```text
[EmojiPanel.vue] —click→ [useEmojiBroadcast.sendEmoji]
                            └→ [services/firebase/rooms.sendEmoji]
                                  └→ updateDoc rooms/{id}:
                                       participants.{uid}.lastEmoji = { value, sentAt }
                                       lastActivityAt + expiresAt
                                  └─ regra valida cooldown e tamanho

[subscribeToRoom snapshot] → [useEmojiBroadcast watcher]
                              └→ detecta lastEmoji.sentAt novo
                              └→ activeBubble[uid] = { value, key }
                              └→ PlayerSeat renderiza EmojiBubble
```

## 4. Modelo de dados

### Documento `rooms/{roomId}` — delta

Adiciona campo opcional em cada participante:

```ts
interface Participant {
  name: string
  vote: string | null
  lastSeenAt: Timestamp
  joinedAt: Timestamp
  lastEmoji?: {                  // novo
    value: string                // 1 emoji (até 16 chars com modificadores/ZWJ)
    sentAt: Timestamp            // serverTimestamp
  }
}
```

### Decisões intencionais

- **Sem histórico.** Apenas o último emoji por participante. Quem entra depois não vê emojis antigos como evento — `clientMountTime` filtra (ver §7).
- **Sem allowlist.** O picker já apresenta um set válido vindo do próprio `emoji-picker-element`. A regra Firestore só limita tamanho (1..16) para barrar texto colado.
- **`sentAt` é `serverTimestamp()`.** Garante ordenação e cooldown server-side independente do clock do cliente.
- **`activityPatch()` continua sendo tocado** em cada envio (mantém `lastActivityAt` e `expiresAt` consistentes com o resto do app).

### Regras do Firestore — extensão

A função `isSelfBroadcastingEmoji()` aceita update onde a única chave alterada do próprio participante é `lastEmoji`, validando:

- O update mexeu apenas em `participants.{request.auth.uid}.lastEmoji` (mais `lastActivityAt`/`expiresAt`, que vêm do `activityPatch`). Nada de outros participantes ou outros campos do próprio.
- `value is string` e `size(value) in 1..16`.
- `sentAt == request.time` (impede o cliente de mentir o timestamp).
- Cooldown: campo prévio ausente OU `prev.lastEmoji.sentAt + duration.value(2, 's') < request.time`.

Pseudocódigo:

```
function isSelfBroadcastingEmoji() {
  let uid = request.auth.uid;
  let prevPart = resource.data.participants[uid];
  let newPart  = request.resource.data.participants[uid];
  let newEmoji = newPart.lastEmoji;

  // 1) Só lastEmoji do próprio mudou
  let touchedKeys = request.resource.data.diff(resource.data).affectedKeys();
  let onlyAllowed = touchedKeys.hasOnly([
    'participants', 'lastActivityAt', 'expiresAt'
  ]);
  let onlyMyParticipant = request.resource.data.participants
        .diff(resource.data.participants).affectedKeys().hasOnly([uid]);
  let onlyMyEmoji = newPart.diff(prevPart).affectedKeys().hasOnly(['lastEmoji']);

  return onlyAllowed && onlyMyParticipant && onlyMyEmoji &&
    newEmoji.value is string &&
    newEmoji.value.size() >= 1 && newEmoji.value.size() <= 16 &&
    newEmoji.sentAt == request.time &&
    (
      !('lastEmoji' in prevPart) ||
      prevPart.lastEmoji.sentAt + duration.value(2, 's') < request.time
    );
}
```

A integração com `allow update` existente é por OR adicional (junto com `isModeratorWriting`, `isSelfUpdatingOwnParticipant`, `isSelfHeartbeatOnly`). Detalhes finais em `firestore.rules`.

## 5. Fluxos

### 5.1 Abrir painel

```text
Participante clica no "⋯" da sua própria cadeira
  → PlayerSeat emite `open-emoji-panel` para o pai (RoomView)
  → RoomView monta <EmojiPanel> (componente único; uma instância)
  → EmojiPanel slide-in (220ms cubic-bezier(.2,.7,.2,1))
  → <emoji-picker> recebe foco
```

### 5.2 Enviar emoji

```text
Usuário clica num emoji do picker
  → EmojiPanel captura evento `emoji-click` → extrai `unicode`
  → emite `select(value)` para o pai
  → useEmojiBroadcast.sendEmoji(value):
       - valida regex Unicode no cliente
       - chama services/firebase/rooms.sendEmoji(roomId, uid, value)
       - inicia cooldown local de 2s
  → EmojiPanel slide-out (180ms) → desmonta
```

### 5.3 Receber emoji (qualquer cliente, inclusive remetente)

```text
onSnapshot do doc da sala dispara
  → useEmojiBroadcast watcher itera participants
  → para cada uid:
       const evt = participants[uid].lastEmoji
       if evt && evt.sentAt > clientMountTime
              && evt.sentAt > (lastSeenEmojiAt[uid] ?? 0):
         activeBubble[uid] = { value: evt.value, key: evt.sentAt.toMillis() }
         lastSeenEmojiAt[uid] = evt.sentAt
  → PlayerSeat renderiza <EmojiBubble :value="..." :key="...">
  → EmojiBubble:
       entrada bounce (350ms) → permanência (1.6s) → saída fade+up (280ms)
       → emite `done` → pai limpa activeBubble[uid]
```

### 5.4 Cooldown

```text
Após sendEmoji:
  cooldownRemainingMs reativo conta de 2000 → 0
  Se painel reaberto enquanto > 0:
    overlay sutil sobre o <emoji-picker>, opacidade 0.5, pointer-events: none
    microcopy "aguarde…"
  Quando zera:
    overlay desmonta
```

## 6. UI / componentes

### Árvore (deltas)

```text
RoomView.vue
├─ PokerTable.vue
│   └─ PlayerSeat.vue × N            ← muda
│       └─ EmojiBubble.vue           ← novo (montado condicionalmente)
└─ EmojiPanel.vue                    ← novo (montado quando aberto)
```

### `PlayerSeat.vue` — mudanças

- `kick-trigger` ("⋯") passa a aparecer também em `isSelf`.
- Lógica do menu condicionada:
  - **Self:** ao clicar, emite `open-emoji-panel`. Não mostra menu dropdown.
  - **Outros + canKick (moderador):** mantém o menu atual com "Remover".
- Prop nova: `activeEmoji?: { value: string, key: number }` controlado pelo pai.
- `<EmojiBubble>` renderizado condicionalmente quando `activeEmoji` está presente.

### `EmojiPanel.vue` — novo

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{ cooldownRemainingMs: number }>()
const emit = defineEmits<{ select: [value: string]; close: [] }>()
const ready = ref(false)

onMounted(async () => {
  await import('emoji-picker-element')
  ready.value = true
})

function onPickerClick(e: CustomEvent) {
  const value = e.detail.unicode
  if (props.cooldownRemainingMs > 0) return
  emit('select', value)
}
</script>

<template>
  <Transition name="panel">
    <aside class="emoji-panel" @keydown.esc="emit('close')">
      <header>
        <h3>Reagir</h3>
        <button @click="emit('close')" aria-label="Fechar">×</button>
      </header>
      <div class="picker-wrap" :class="{ disabled: cooldownRemainingMs > 0 }">
        <emoji-picker v-if="ready" @emoji-click="onPickerClick" />
        <p v-else class="loading">Carregando…</p>
        <div v-if="cooldownRemainingMs > 0" class="cooldown-overlay">
          aguarde…
        </div>
      </div>
    </aside>
  </Transition>
</template>
```

- **Desktop (≥768px):** `position: fixed; right: 0; top: 50%; transform: translateY(-50%); width: 340px; max-height: 80vh;`. Slide-in da direita.
- **Mobile (<768px):** `position: fixed; left: 0; right: 0; bottom: 0; max-height: 60vh;`. Slide-in de baixo.
- Tema dark/light: aplicar CSS custom properties do `emoji-picker-element` apontando para tokens do projeto (`--background`, `--input-border-color`, etc.).
- Fechamento: `×`, `Esc`, clicar fora (overlay invisível em mobile; sem overlay em desktop, fechar via click externo capturado em document listener).
- Lazy-import de `emoji-picker-element` na primeira abertura.

### `EmojiBubble.vue` — novo

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{ value: string }>()
const lottieData = ref<unknown | null>(null)
const phase = ref<'in' | 'hold' | 'out'>('in')

onMounted(async () => {
  // tenta carregar Lottie do Noto; se falhar, fica no Unicode
  tryLoadLottie(props.value).then((data) => {
    if (data) lottieData.value = data
  })
  // sequência: in 350ms → hold 1600ms → out 280ms → done
  setTimeout(() => (phase.value = 'hold'), 350)
  setTimeout(() => (phase.value = 'out'), 350 + 1600)
})
</script>

<template>
  <div class="bubble" :class="phase">
    <!-- se Lottie carregou, renderiza com lottie-web; senão, texto -->
    <LottiePlayer v-if="lottieData" :animation="lottieData" />
    <span v-else class="unicode">{{ value }}</span>
    <span class="tail" aria-hidden="true" />
  </div>
</template>
```

- Posicionado absolute sobre o `.name-line` do `PlayerSeat`.
- Animações em CSS keyframes (não JS) para performance:
  - `.bubble.in` — `@keyframes bubble-in` com scale 0 → 1.1 → 1, 350ms.
  - `.bubble.hold` — estado parado.
  - `.bubble.out` — `@keyframes bubble-out` com scale → 0.9, opacity → 0, translateY -8px, 280ms.
- Setinha (`.tail`) é um pseudo-elemento pseudo-triangle apontando para baixo.
- Emite `done` ao final da fase `out`. O `PlayerSeat` repassa esse evento para `RoomView`, que chama `useEmojiBroadcast.clearBubble(uid)` para liberar a entrada do `activeBubble`.
- Quando uma nova emissão do mesmo uid chega antes do `done`, o `:key` (derivado de `sentAt.toMillis()`) muda — o Vue desmonta o `EmojiBubble` atual e monta um novo, refazendo a animação de entrada. Não há acúmulo de balões.

### `LottiePlayer.vue` — utilitário interno (lazy)

Wrapper minimalista sobre `lottie-web`. Lazy-import na primeira instância em `EmojiBubble`. Recebe `animation: object`, monta no `onMounted`, destrói no `onUnmounted`.

### Cache de Lottie

`src/lib/notoEmoji.ts`:

```ts
const cache = new Map<string, object | 'unavailable'>()
const FAILED: Promise<null> = Promise.resolve(null)

export async function tryLoadLottie(value: string): Promise<object | null> {
  const cp = toCodepointSequence(value) // ex: "1f389" ou "1f469-200d-1f4bb"
  const hit = cache.get(cp)
  if (hit === 'unavailable') return null
  if (hit) return hit
  try {
    const res = await fetch(`https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/lottie.json`)
    if (!res.ok) { cache.set(cp, 'unavailable'); return null }
    const json = await res.json()
    cache.set(cp, json)
    return json
  } catch {
    cache.set(cp, 'unavailable')
    return null
  }
}
```

Detalhes de implementação:
- `toCodepointSequence(value)` — converte para sequência hex separada por `-`, removendo `fe0f` (variation selector) que o Noto não inclui no nome do arquivo.
- Sem CDN próprio. A própria infra do Google Fonts cacheia.
- Cache em memória vive enquanto a aba viver — não persistido em `localStorage` para evitar complexidade de invalidação.

## 7. Composable `useEmojiBroadcast`

Em `src/composables/useEmojiBroadcast.ts`:

```ts
import { ref, watch, onMounted, computed } from 'vue'
import { Timestamp } from 'firebase/firestore'
import type { Room } from '@/types/room'
import { sendEmoji as sendEmojiSvc } from '@/services/firebase/rooms'

const COOLDOWN_MS = 2000

export function useEmojiBroadcast(opts: {
  room: Ref<Room | null>
  myUid: Ref<string | null>
  roomId: Ref<string>
}) {
  const clientMountAt = Timestamp.now()
  const lastSeenEmojiAt = new Map<string, number>()
  const activeBubble = ref<Record<string, { value: string; key: number } | undefined>>({})

  watch(() => opts.room.value?.participants, (parts) => {
    if (!parts) return
    for (const [uid, p] of Object.entries(parts)) {
      const evt = p.lastEmoji
      if (!evt) continue
      const sentMs = evt.sentAt.toMillis()
      if (sentMs <= clientMountAt.toMillis()) continue
      if (sentMs <= (lastSeenEmojiAt.get(uid) ?? 0)) continue
      lastSeenEmojiAt.set(uid, sentMs)
      activeBubble.value = { ...activeBubble.value, [uid]: { value: evt.value, key: sentMs } }
    }
  }, { deep: true })

  function clearBubble(uid: string) {
    const next = { ...activeBubble.value }
    delete next[uid]
    activeBubble.value = next
  }

  const lastSelfSentAt = ref(0)
  const now = useNow() // util reativo de timestamp atual
  const cooldownRemainingMs = computed(() =>
    Math.max(0, COOLDOWN_MS - (now.value - lastSelfSentAt.value))
  )

  async function sendEmoji(value: string) {
    if (!opts.myUid.value) return
    if (cooldownRemainingMs.value > 0) return
    // validação cliente
    if (!/^\p{Extended_Pictographic}(\p{Emoji_Modifier}|‍\p{Extended_Pictographic})*$/u.test(value)) return
    if (value.length > 16) return
    lastSelfSentAt.value = Date.now()
    await sendEmojiSvc(opts.roomId.value, opts.myUid.value, value)
  }

  return { activeBubble, clearBubble, sendEmoji, cooldownRemainingMs }
}
```

Notas:
- `useNow()` é um util reativo trivial (`ref(Date.now())` atualizado por `setInterval(250)`); fica em `src/lib/time.ts` (arquivo já existente). É instanciado uma única vez por composable; o intervalo é parado em `onUnmounted`.
- Timestamps usam `toMillis()` para comparação — robusto contra `Timestamp` recriado.
- `activeBubble[uid]` é trocado por novo objeto com nova `key` mesmo se já houver um ativo. O `PlayerSeat` usa `:key` para forçar remount do `EmojiBubble` (animação de entrada toca de novo).

## 8. Service

`src/services/firebase/rooms.ts` ganha:

```ts
export async function sendEmoji(roomId: string, uid: string, value: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(doc(db, 'rooms', roomId), {
    [`participants.${uid}.lastEmoji`]: { value, sentAt: serverTimestamp() },
    ...activityPatch(),
  })
}
```

Sem mudanças nas funções existentes.

## 9. Erros, edge cases e race conditions

| Cenário | UX |
|---|---|
| Lottie do Noto não existe para o emoji | Render Unicode imediato. Cache marca `'unavailable'`. |
| Lottie chega depois do balão sumir | Ignorado (balão já desmontou; cache permanece para próximo). |
| `emoji-picker-element` falha ao importar | Painel mostra "Não foi possível carregar emojis". Restante da sala segue. |
| Reload da página | `clientMountAt` filtra eventos com `sentAt ≤ mount`. Balões antigos não disparam. |
| Mesmo uid manda 2 emojis em < 2.2s | Local: novo `:key` força remount imediato (substitui balão atual). Server: regra rejeita se < 2s. |
| Aba dormindo durante envio | Snapshot reanima ao voltar; `clientMountAt` permanece o mesmo, então emoji recente entra normalmente. |
| Usuário removido durante envio | Snapshot remove participante; balão em curso continua animação até desmontar naturalmente (não há mais cadeira host — desmonta com PlayerSeat). |
| Conexão offline | `updateDoc` enfileira no SDK. Envia ao reconectar. Cooldown server-side ainda vale. |
| Cliente com clock errado | Cooldown local pode permitir envio "cedo demais"; regra Firestore rejeita. UX: toast de erro. |

## 10. Testes

| Camada | Cobertura |
|---|---|
| `useEmojiBroadcast` (Vitest puro) | Filtra `sentAt < clientMountAt`; deduplica por `lastSeenEmojiAt`; troca `:key` para mesmo uid; cooldown bloqueia segundo envio em < 2s |
| `services/firebase/rooms.sendEmoji` (emulador) | Happy path; activityPatch presente; ordem dos campos não quebra |
| Regras Firestore (`rules-unit-testing`) | Aceita próprio uid escrevendo `lastEmoji`; rejeita outro uid escrevendo o seu; rejeita `size > 16`; rejeita cooldown < 2s; aceita após 2s |
| `EmojiPanel.vue` smoke | Emite `select` com unicode do evento `emoji-click`; mostra overlay quando `cooldownRemainingMs > 0`; importa `emoji-picker-element` ao montar |
| `EmojiBubble.vue` smoke | Monta com fase `in`, transita para `hold` e depois `out`; emite `done`; troca conteúdo quando recebe nova `:key` |
| `PlayerSeat.vue` smoke | "⋯" aparece em `isSelf`; clicar emite `open-emoji-panel`; "⋯" em outro mostra menu "Remover" (apenas com `canKick`) |
| `notoEmoji.tryLoadLottie` | Cacheia sucesso; cacheia `'unavailable'` em 404; converte sequência com ZWJ corretamente |

### Fora do core de testes

- Animação visual em si (CSS keyframes) não testada.
- Renderização real de Lottie não testada (mock do player nos componentes).

### Validação manual antes de merge

Dois navegadores lado a lado:
- Abrir painel da própria cadeira, enviar emoji, ver balão aparecer dos dois lados.
- Tentar enviar de novo em <2s: bloqueado client-side (overlay) e, se forçado, rejeitado pela regra.
- Painel sumir com slide-out após clique.
- Recarregar página: balões antigos não reaparecem.
- Mobile (DevTools viewport ≤375px): painel vira bottom sheet.
- Moderador: "⋯" em outros continua mostrando "Remover".

## 11. Dependências

Via `bun add`:

- `emoji-picker-element`
- `lottie-web`

Sem fixação de versão (registrado em `feedback_dependencies.md`). Bundle adicional estimado: ~50kb gz para o picker + ~80kb gz para o Lottie, ambos lazy-loaded.

## 12. Estrutura de arquivos — deltas

```text
src/
├─ components/
│  └─ room/
│     ├─ PlayerSeat.vue            ← muda
│     ├─ EmojiPanel.vue            ← novo
│     ├─ EmojiBubble.vue           ← novo
│     └─ LottiePlayer.vue          ← novo (interno do EmojiBubble)
├─ composables/
│  └─ useEmojiBroadcast.ts         ← novo
├─ lib/
│  └─ notoEmoji.ts                 ← novo (cache + fetcher do Noto)
├─ services/
│  └─ firebase/
│     └─ rooms.ts                  ← adiciona sendEmoji
├─ types/
│  └─ room.ts                      ← adiciona lastEmoji opcional
└─ views/
   └─ RoomView.vue                 ← orquestra EmojiPanel e activeBubble
firestore.rules                    ← adiciona isSelfBroadcastingEmoji
tests/
├─ unit/
│  ├─ composables/useEmojiBroadcast.test.ts
│  ├─ components/EmojiPanel.test.ts
│  ├─ components/EmojiBubble.test.ts
│  └─ lib/notoEmoji.test.ts
└─ integration/
   └─ rooms-emoji.test.ts          ← service + rules
```

## 13. Plano de entrega — commits incrementais

Cada commit deixa o app rodando.

1. `chore: install emoji-picker-element + lottie-web` — `bun add`, smoke import.
2. `feat(data): lastEmoji field + sendEmoji service + rules` — type, service, regra, testes de regra e service.
3. `feat(panel): EmojiPanel com picker e slide` — componente isolado, lazy-import, testes smoke.
4. `feat(seat): "⋯" em self abre painel emoji` — `PlayerSeat`, orquestração em `RoomView`, sem balão ainda (validar envio).
5. `feat(bubble): EmojiBubble com Unicode + animação CSS` — balão estático sem Lottie. End-to-end já funciona.
6. `feat(bubble): Lottie animado via Noto (best-effort)` — `notoEmoji.ts`, `LottiePlayer`, fallback gracioso.
7. `feat(cooldown): cooldown client + overlay no painel` — `cooldownRemainingMs`, UI de wait.
8. `feat(mobile): bottom sheet do EmojiPanel em <768px` — responsivo.
9. `chore: testes de composable + smoke de componentes`.
10. `docs: atualizar README com a nova feature`.

## 14. Fora de escopo

- Histórico de emojis enviados.
- Reações endereçadas a uma cadeira específica (sempre é broadcast a partir da minha).
- Emojis customizados / upload de imagens.
- Sons ao receber emoji.
- Configuração por sala para desligar emojis.
- Promoção de emoji para "spotlight" central da mesa.
- Persistência do cache Lottie em `localStorage` ou `IndexedDB`.
- Servir o Lottie de CDN próprio.
