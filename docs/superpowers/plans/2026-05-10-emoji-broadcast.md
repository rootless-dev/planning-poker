# Emoji Broadcast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que qualquer participante envie reações em emoji que aparecem como balão animado sobre seu próprio nome, em tempo real para todos da sessão.

**Architecture:** Estende o doc da sala (`participants.{uid}.lastEmoji = { value, sentAt }`) sem subcoleções. Painel à direita (bottom sheet em mobile) abre pelo botão "⋯" da própria cadeira e usa `emoji-picker-element` para seleção. Cada cliente compara `sentAt` ao seu `clientMountTime` para disparar o `EmojiBubble` sobre o nome do remetente. Cooldown de 2s validado também via regra Firestore.

**Tech Stack:** Vue 3, TypeScript, Pinia, Firebase Firestore, `emoji-picker-element` (lazy), `lottie-web` (lazy, best-effort), Vitest, Firebase Emulator Suite, `@firebase/rules-unit-testing`.

**Referência:** `docs/superpowers/specs/2026-05-10-emoji-broadcast-design.md`.

---

## File Structure

**Criar:**
- `src/composables/useEmojiBroadcast.ts` — composable de orquestração (envio, fila de balões, cooldown)
- `src/lib/notoEmoji.ts` — fetcher + cache do Lottie do Noto Animated Emoji
- `src/components/room/EmojiPanel.vue` — painel à direita / bottom sheet com `<emoji-picker>`
- `src/components/room/EmojiBubble.vue` — balão animado sobre o nome
- `src/components/room/LottiePlayer.vue` — wrapper sobre `lottie-web` (lazy)
- `tests/integration/rooms-emoji.test.ts` — service `sendEmoji` + regras (cooldown, size, escopo)
- `tests/unit/composables/useEmojiBroadcast.test.ts` — filtros e cooldown
- `tests/unit/lib/notoEmoji.test.ts` — codepoint sequence + cache
- `tests/unit/components/EmojiPanel.test.ts` — smoke (evento, cooldown overlay)
- `tests/unit/components/EmojiBubble.test.ts` — smoke (montagem, troca por key)

**Modificar:**
- `src/types/room.ts` — adicionar `lastEmoji?: { value, sentAt }` em `Participant`
- `src/services/firebase/rooms.ts` — função `sendEmoji`
- `firestore.rules` — função `isSelfBroadcastingEmoji()` + ramo na `allow update`
- `src/lib/time.ts` — utilitário `useNow()` reativo
- `src/components/room/PlayerSeat.vue` — habilitar `⋯` em `isSelf` (abre painel), renderizar `EmojiBubble`
- `src/components/room/PokerTable.vue` — propagar evento `open-emoji-panel` e prop `activeBubble` por seat
- `src/views/RoomView.vue` — instanciar `EmojiPanel`, integrar com `useEmojiBroadcast`
- `package.json` — deps `emoji-picker-element` e `lottie-web`
- `README.md` — nota da nova feature

---

## Task 1: Instalar dependências

**Files:**
- Modify: `package.json` (via `bun add`)

- [ ] **Step 1: Adicionar `emoji-picker-element`**

Run:
```bash
bun add emoji-picker-element
```
Expected: aparece em `dependencies` no `package.json` sem fixar versão exata.

- [ ] **Step 2: Adicionar `lottie-web`**

Run:
```bash
bun add lottie-web
```
Expected: idem.

- [ ] **Step 3: Validar build**

Run:
```bash
bun run lint:types
```
Expected: PASS sem novos erros.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: install emoji-picker-element + lottie-web"
```

---

## Task 2: Adicionar `lastEmoji` ao tipo `Participant`

**Files:**
- Modify: `src/types/room.ts`

- [ ] **Step 1: Editar o tipo**

Adicionar o campo opcional em `Participant`. Conteúdo do arquivo após edição:

```ts
import type { Timestamp } from 'firebase/firestore'

export type DeckType = 'fibonacci' | 'tshirt' | 'custom'

export interface Deck {
  type: DeckType
  values: string[]
}

export interface EmojiEvent {
  value: string
  sentAt: Timestamp
}

export interface Participant {
  name: string
  vote: string | null
  lastSeenAt: Timestamp
  joinedAt: Timestamp
  lastEmoji?: EmojiEvent
}

export interface Round {
  taskTitle: string
  revealed: boolean
  startedAt: Timestamp
}

export interface Room {
  id: string
  name: string
  createdAt: Timestamp
  lastActivityAt: Timestamp
  expiresAt: Timestamp
  moderatorUid: string
  deck: Deck
  round: Round
  participants: Record<string, Participant>
}

export type PresenceState = 'online' | 'absent' | 'offline'
```

- [ ] **Step 2: Verificar tipos**

Run:
```bash
bun run lint:types
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/types/room.ts
git commit -m "feat(types): add lastEmoji optional field to Participant"
```

---

## Task 3: Serviço `sendEmoji` (TDD com integration test)

**Files:**
- Test: `tests/integration/rooms-emoji.test.ts`
- Modify: `src/services/firebase/rooms.ts`

- [ ] **Step 1: Criar teste de integração (happy path)**

Criar `tests/integration/rooms-emoji.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { doc, getDoc } from 'firebase/firestore'
import { makeTestEnv } from './_setup'

describe('sendEmoji service', () => {
  it('escreve participants.{uid}.lastEmoji com value e sentAt', async () => {
    const env = await makeTestEnv('emoji-svc')

    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: env.app, auth: env.auth, db: env.db }),
    }))
    const { createRoom, sendEmoji } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')

    const id = await createRoom({
      name: 'r',
      deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'M',
      moderatorUid: env.uid,
    })

    await sendEmoji(id, env.uid, '🎉')
    const snap = await getDoc(doc(env.db, 'rooms', id))
    const data = snap.data()!
    expect(data.participants[env.uid].lastEmoji.value).toBe('🎉')
    expect(data.participants[env.uid].lastEmoji.sentAt).toBeDefined()

    vi.doUnmock('@/services/firebase/index')
    await env.cleanup()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run:
```bash
bun run test:integration -- rooms-emoji
```
Expected: FAIL com `sendEmoji is not exported` (ou erro de tipo).

- [ ] **Step 3: Implementar `sendEmoji`**

Adicionar ao final de `src/services/firebase/rooms.ts`:

```ts
export async function sendEmoji(roomId: string, uid: string, value: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(doc(db, 'rooms', roomId), {
    [`participants.${uid}.lastEmoji`]: { value, sentAt: serverTimestamp() },
    ...activityPatch(),
  })
}
```

- [ ] **Step 4: Rodar e ver passar**

Run:
```bash
bun run test:integration -- rooms-emoji
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/firebase/rooms.ts tests/integration/rooms-emoji.test.ts
git commit -m "feat(rooms): add sendEmoji service writing participants.{uid}.lastEmoji"
```

---

## Task 4: Regra Firestore `isSelfBroadcastingEmoji` (TDD)

**Files:**
- Test: `tests/integration/rules.test.ts` (estender)
- Modify: `firestore.rules`

- [ ] **Step 1: Estender o setup do teste de regras para o caso emoji**

Adicionar ao final de `tests/integration/rules.test.ts`, dentro do `describe('firestore.rules', () => { ... })`:

```ts
  it('participante pode escrever próprio lastEmoji', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rE1'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('alice')
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'rooms', 'rE1'), {
      'participants.alice.lastEmoji': { value: '🎉', sentAt: serverTimestamp() },
      lastActivityAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000),
    }))
  })

  it('participante NÃO pode escrever lastEmoji em outro uid', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rE2'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('alice')
    await assertFails(updateDoc(doc(ctx.firestore(), 'rooms', 'rE2'), {
      'participants.mod.lastEmoji': { value: '🎉', sentAt: serverTimestamp() },
    }))
  })

  it('rejeita lastEmoji com value > 16 chars', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rE3'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('alice')
    await assertFails(updateDoc(doc(ctx.firestore(), 'rooms', 'rE3'), {
      'participants.alice.lastEmoji': { value: 'x'.repeat(17), sentAt: serverTimestamp() },
      lastActivityAt: serverTimestamp(),
    }))
  })

  it('rejeita segundo lastEmoji dentro do cooldown de 2s', async () => {
    const past = Timestamp.fromMillis(Date.now() - 500) // 0.5s atrás
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rE4'), {
        ...baseRoom('mod', 'alice'),
        participants: {
          mod: { name: 'Mod', vote: null, lastSeenAt: past, joinedAt: past },
          alice: { name: 'Alice', vote: null, lastSeenAt: past, joinedAt: past,
                   lastEmoji: { value: '🎉', sentAt: past } },
        },
      })
    })
    const ctx = env.authenticatedContext('alice')
    await assertFails(updateDoc(doc(ctx.firestore(), 'rooms', 'rE4'), {
      'participants.alice.lastEmoji': { value: '🔥', sentAt: serverTimestamp() },
      lastActivityAt: serverTimestamp(),
    }))
  })
```

- [ ] **Step 2: Rodar e ver os 4 falharem**

Run:
```bash
bun run test:integration -- rules
```
Expected: 4 testes novos FAIL (regra ainda não existe; o primeiro falha porque a regra atual `isSelfUpdatingOwnParticipant` permite mas o teste do segundo cooldown depende da regra nova).

Nota: dependendo do estado atual da `isSelfUpdatingOwnParticipant`, o primeiro teste pode até passar (porque atualizar `lastEmoji` cai sob "mexer só no próprio nó"). Se passar, ótimo — a função nova adiciona validação. Confirmar mentalmente qual está protegendo.

- [ ] **Step 3: Implementar a regra**

Editar `firestore.rules`. Substituir o bloco completo por:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /rooms/{roomId} {

      allow read: if request.auth != null;

      allow create: if request.auth != null
                    && request.auth.uid == request.resource.data.moderatorUid
                    && request.resource.data.id == roomId;

      allow update: if request.auth != null && (
        isModerator()
        || isSelfBroadcastingEmoji()
        || isSelfUpdatingOwnParticipant()
      );

      allow delete: if request.auth != null && resource.data.moderatorUid == request.auth.uid;

      function isModerator() {
        return resource.data.moderatorUid == request.auth.uid;
      }

      function isSelfUpdatingOwnParticipant() {
        let allowedRootKeys = ['participants', 'lastActivityAt', 'expiresAt'].toSet();
        let changedRoot = request.resource.data.diff(resource.data).affectedKeys();
        let onlyAllowedRoot = changedRoot.hasOnly(allowedRootKeys);

        let myKey = request.auth.uid;
        let oldParticipants = resource.data.participants;
        let newParticipants = request.resource.data.participants;
        let participantKeysChanged = newParticipants.diff(oldParticipants).affectedKeys();

        let onlySelfKeyChanged = participantKeysChanged.hasOnly([myKey].toSet());

        let stillPresent = newParticipants.keys().hasAll([myKey]);

        return onlyAllowedRoot && onlySelfKeyChanged && stillPresent;
      }

      function isSelfBroadcastingEmoji() {
        let uid = request.auth.uid;

        // Só raiz e só meu participante mudaram
        let allowedRootKeys = ['participants', 'lastActivityAt', 'expiresAt'].toSet();
        let changedRoot = request.resource.data.diff(resource.data).affectedKeys();
        let onlyAllowedRoot = changedRoot.hasOnly(allowedRootKeys);

        let oldParticipants = resource.data.participants;
        let newParticipants = request.resource.data.participants;
        let participantKeysChanged = newParticipants.diff(oldParticipants).affectedKeys();
        let onlySelfKeyChanged = participantKeysChanged.hasOnly([uid].toSet());

        // Dentro do meu participante, só lastEmoji mudou
        let oldMine = oldParticipants[uid];
        let newMine = newParticipants[uid];
        let mineDiffKeys = newMine.diff(oldMine).affectedKeys();
        let onlyMyEmoji = mineDiffKeys.hasOnly(['lastEmoji'].toSet());

        let evt = newMine.lastEmoji;
        let validShape = evt.value is string
          && evt.value.size() >= 1
          && evt.value.size() <= 16
          && evt.sentAt == request.time;

        let cooldownOk = !('lastEmoji' in oldMine)
          || oldMine.lastEmoji.sentAt + duration.value(2, 's') < request.time;

        return onlyAllowedRoot && onlySelfKeyChanged && onlyMyEmoji
          && validShape && cooldownOk;
      }
    }
  }
}
```

- [ ] **Step 4: Rodar testes de regras**

Run:
```bash
bun run test:integration -- rules
```
Expected: todos PASS, incluindo os 4 novos.

- [ ] **Step 5: Rodar o teste do service Task 3 de novo**

Run:
```bash
bun run test:integration -- rooms-emoji
```
Expected: PASS (a regra aprova a escrita).

- [ ] **Step 6: Commit**

```bash
git add firestore.rules tests/integration/rules.test.ts
git commit -m "feat(rules): add isSelfBroadcastingEmoji with size + cooldown checks"
```

---

## Task 5: `EmojiPanel.vue` isolado (sem cooldown ainda)

**Files:**
- Create: `src/components/room/EmojiPanel.vue`
- Test: `tests/unit/components/EmojiPanel.test.ts`

- [ ] **Step 1: Criar smoke test**

Criar `tests/unit/components/EmojiPanel.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EmojiPanel from '@/components/room/EmojiPanel.vue'

// Stub do web component para não dependerem do navegador real
vi.mock('emoji-picker-element', () => ({}))

describe('EmojiPanel', () => {
  it('renderiza header e botão fechar', async () => {
    const wrapper = mount(EmojiPanel, {
      props: { cooldownRemainingMs: 0 },
    })
    expect(wrapper.text()).toContain('Reagir')
    await wrapper.get('button[aria-label="Fechar"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emite select com unicode do emoji-click', async () => {
    const wrapper = mount(EmojiPanel, {
      props: { cooldownRemainingMs: 0 },
    })
    await wrapper.vm.$nextTick()
    // Simular o evento emitido pelo web component
    const picker = wrapper.find('emoji-picker').element as HTMLElement
    picker.dispatchEvent(new CustomEvent('emoji-click', { detail: { unicode: '🎉' } }))
    expect(wrapper.emitted('select')?.[0]).toEqual(['🎉'])
  })

  it('cooldown > 0 mostra overlay', () => {
    const wrapper = mount(EmojiPanel, {
      props: { cooldownRemainingMs: 1200 },
    })
    expect(wrapper.find('.cooldown-overlay').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run:
```bash
bun run test -- EmojiPanel
```
Expected: FAIL (componente não existe).

- [ ] **Step 3: Implementar `EmojiPanel.vue`**

Criar `src/components/room/EmojiPanel.vue`:

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'

defineProps<{ cooldownRemainingMs: number }>()
const emit = defineEmits<{ select: [value: string]; close: [] }>()

const ready = ref(false)

onMounted(async () => {
  try {
    await import('emoji-picker-element')
    ready.value = true
  } catch {
    ready.value = false
  }
})

function onPickerClick(e: Event) {
  const ce = e as CustomEvent<{ unicode: string }>
  if (!ce.detail?.unicode) return
  emit('select', ce.detail.unicode)
}
</script>

<template>
  <aside class="emoji-panel" role="dialog" aria-label="Reagir com emoji" @keydown.esc="emit('close')">
    <header class="panel-head">
      <h3>Reagir</h3>
      <button type="button" aria-label="Fechar" @click="emit('close')">×</button>
    </header>
    <div class="picker-wrap" :class="{ disabled: cooldownRemainingMs > 0 }">
      <emoji-picker v-if="ready" @emoji-click="onPickerClick" />
      <p v-else class="loading">Carregando…</p>
      <div v-if="cooldownRemainingMs > 0" class="cooldown-overlay">aguarde…</div>
    </div>
  </aside>
</template>

<style scoped>
.emoji-panel {
  position: fixed;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 340px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  color: var(--color-ink);
  border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent);
  border-radius: 14px;
  box-shadow: 0 20px 40px -12px rgb(var(--color-shadow) / 0.55);
  z-index: 50;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-ink) 12%, transparent);
}
.panel-head h3 {
  font-family: var(--font-display);
  font-size: 0.95rem;
  margin: 0;
}
.panel-head button {
  background: none;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-ink);
}
.picker-wrap {
  position: relative;
  flex: 1;
  min-height: 320px;
}
.picker-wrap.disabled emoji-picker { opacity: 0.45; pointer-events: none; }
.cooldown-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-ink) 80%, transparent);
  background: color-mix(in srgb, var(--color-surface) 60%, transparent);
}
.loading {
  padding: 24px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-align: center;
}
emoji-picker {
  --background: var(--color-surface);
  --border-color: transparent;
  --input-border-color: color-mix(in srgb, var(--color-ink) 18%, transparent);
  width: 100%;
  height: 100%;
}
</style>
```

- [ ] **Step 4: Configurar Vue para aceitar `emoji-picker` como elemento custom**

Editar `vite.config.ts`. Se ainda não tem `compilerOptions.isCustomElement`, adicionar no plugin `vue()`:

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// ... outros imports

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'emoji-picker',
        },
      },
    }),
    // ... outros plugins
  ],
  // ...
})
```

Antes de editar, abrir `vite.config.ts` e confirmar a forma do `vue()`. Aplicar a mesma chave em `vitest.config.ts` se necessário.

- [ ] **Step 5: Rodar testes**

Run:
```bash
bun run test -- EmojiPanel
```
Expected: PASS.

- [ ] **Step 6: Validar tipos**

Run:
```bash
bun run lint:types
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/room/EmojiPanel.vue tests/unit/components/EmojiPanel.test.ts vite.config.ts vitest.config.ts
git commit -m "feat(panel): EmojiPanel com picker lazy e overlay de cooldown"
```

---

## Task 6: `PlayerSeat.vue` — botão `⋯` em self abre painel

**Files:**
- Modify: `src/components/room/PlayerSeat.vue`

- [ ] **Step 1: Editar o `<script setup>` e o template**

Substituir o `<script setup>` no topo do arquivo por:

```ts
<script setup lang="ts">
import { ref, computed } from 'vue'
import PlayingCard from './PlayingCard.vue'
import EmojiBubble from './EmojiBubble.vue'
import type { PresenceState } from '@/types/room'

const props = defineProps<{
  uid: string
  name: string
  vote: string | null
  presence: PresenceState
  isModerator?: boolean
  isSelf?: boolean
  revealed: boolean
  canKick?: boolean
  cardSize?: 'xs' | 'sm' | 'md' | 'lg'
  activeEmoji?: { value: string; key: number } | null
}>()
const emit = defineEmits<{
  kick: [uid: string]
  'open-emoji-panel': []
  'emoji-bubble-done': [uid: string]
}>()

const showMenu = ref(false)

function onTriggerClick() {
  if (props.isSelf) {
    emit('open-emoji-panel')
    return
  }
  if (props.canKick) {
    showMenu.value = !showMenu.value
  }
}

function confirmKick() {
  if (confirm(`Remover ${props.name} da sala?`)) emit('kick', props.uid)
  showMenu.value = false
}

const initial = computed(() => props.name.slice(0, 1).toUpperCase())
const showTrigger = computed(() => props.isSelf || (props.canKick && !props.isSelf))
</script>
```

Substituir o template inteiro por:

```vue
<template>
  <div
    class="seat"
    :class="[
      `size-${cardSize ?? 'sm'}`,
      { absent: presence === 'absent', self: isSelf },
    ]"
  >
    <PlayingCard
      v-if="vote === null"
      state="idle"
      :size="cardSize ?? 'sm'"
      value=""
      class="card-empty"
    />
    <PlayingCard v-else-if="!revealed" state="back" :size="cardSize ?? 'sm'" />
    <PlayingCard v-else state="revealed" :size="cardSize ?? 'sm'" :value="vote" />

    <div class="avatar numeral">
      <span>{{ initial }}</span>
      <span v-if="isModerator" class="crown" aria-hidden="true">♛</span>
    </div>

    <div class="name-line">
      <span class="name">{{ name }}</span>
      <EmojiBubble
        v-if="activeEmoji"
        :key="activeEmoji.key"
        :value="activeEmoji.value"
        @done="emit('emoji-bubble-done', uid)"
      />
    </div>

    <button
      v-if="showTrigger"
      type="button"
      @click="onTriggerClick"
      class="kick-trigger"
      aria-label="Opções"
    >⋯</button>
    <div v-if="showMenu" class="kick-menu">
      <button type="button" @click="confirmKick">Remover</button>
    </div>
  </div>
</template>
```

Adicionar ao bloco `<style scoped>` no final, mantendo o resto:

```css
.name-line {
  position: relative;
}
```

(O resto do CSS já existente permanece igual.)

- [ ] **Step 2: Verificar tipos**

Run:
```bash
bun run lint:types
```
Expected: vai falhar porque `EmojiBubble` não existe ainda. Isso é esperado — Task 8 cria o componente. **Não commitar agora.**

Alternativa: criar um `EmojiBubble.vue` stub temporário **apenas para destravar**:

```vue
<!-- src/components/room/EmojiBubble.vue (stub temporário) -->
<script setup lang="ts">
defineProps<{ value: string }>()
defineEmits<{ done: [] }>()
</script>
<template><span class="bubble-stub">{{ value }}</span></template>
```

Rodar `bun run lint:types` novamente. Expected: PASS.

- [ ] **Step 3: Commit (stub + PlayerSeat)**

```bash
git add src/components/room/PlayerSeat.vue src/components/room/EmojiBubble.vue
git commit -m "feat(seat): trigger '⋯' em self abre painel emoji; stub EmojiBubble"
```

---

## Task 7: Propagar evento via `PokerTable` e integrar `EmojiPanel` no `RoomView`

**Files:**
- Modify: `src/components/room/PokerTable.vue`
- Modify: `src/views/RoomView.vue`

- [ ] **Step 1: Atualizar `PokerTable.vue`**

Editar o `<script setup>`:

```ts
<script setup lang="ts">
import { computed } from 'vue'
import PlayerSeat from './PlayerSeat.vue'
import type { PresenceState } from '@/types/room'

interface Seat {
  uid: string
  name: string
  vote: string | null
  presence: PresenceState
  isModerator: boolean
  isSelf: boolean
}

const props = defineProps<{
  seats: Seat[]
  revealed: boolean
  canKick?: boolean
  activeBubble?: Record<string, { value: string; key: number } | undefined>
}>()
const emit = defineEmits<{
  kick: [uid: string]
  'open-emoji-panel': []
  'emoji-bubble-done': [uid: string]
}>()

const positions = computed(() => {
  const n = props.seats.length || 1
  const stepDeg = 360 / n
  return props.seats.map((s, i) => {
    const angle = -90 + i * stepDeg
    return { ...s, angle }
  })
})

const cardSize = computed<'xs' | 'sm' | 'md' | 'lg'>(() => {
  const n = props.seats.length
  if (n <= 4) return 'md'
  if (n <= 8) return 'sm'
  return 'xs'
})
</script>
```

No template, em **ambos** os blocos `<PlayerSeat ...>` (desktop e mobile), adicionar:

```vue
:active-emoji="activeBubble?.[seat.uid] ?? null"
@open-emoji-panel="emit('open-emoji-panel')"
@emoji-bubble-done="(uid: string) => emit('emoji-bubble-done', uid)"
```

- [ ] **Step 2: Atualizar `RoomView.vue`**

Adicionar imports no topo do `<script setup>`:

```ts
import EmojiPanel from '@/components/room/EmojiPanel.vue'
import { useEmojiBroadcast } from '@/composables/useEmojiBroadcast'
```

Após `usePresence(...)`, adicionar:

```ts
const emoji = useEmojiBroadcast({
  room: computed(() => room.room.value),
  myUid: uid,
  roomId: computed(() => props.id),
})

const emojiPanelOpen = ref(false)
function openEmojiPanel() { emojiPanelOpen.value = true }
function closeEmojiPanel() { emojiPanelOpen.value = false }
async function onSelectEmoji(value: string) {
  await emoji.sendEmoji(value)
  closeEmojiPanel()
}
```

No template, dentro do `<PokerTable ...>`, adicionar atributos e listeners:

```vue
<PokerTable
  :seats="room.seats.value"
  :revealed="room.room.value.round.revealed"
  :can-kick="room.isModerator.value"
  :active-bubble="emoji.activeBubble.value"
  @kick="onKick"
  @open-emoji-panel="openEmojiPanel"
  @emoji-bubble-done="emoji.clearBubble"
>
```

E, ao final do template (depois do `<JoinNameModal />`), montar:

```vue
<EmojiPanel
  v-if="emojiPanelOpen"
  :cooldown-remaining-ms="emoji.cooldownRemainingMs.value"
  @select="onSelectEmoji"
  @close="closeEmojiPanel"
/>
```

- [ ] **Step 3: Validar tipos**

Run:
```bash
bun run lint:types
```
Expected: vai falhar porque `useEmojiBroadcast` ainda não existe. Esperado — Task 8 implementa. **Não commitar agora.**

Para destravar provisoriamente: criar `src/composables/useEmojiBroadcast.ts` stub:

```ts
import { computed, ref, type Ref } from 'vue'

export function useEmojiBroadcast(_opts: {
  room: Ref<unknown>
  myUid: Ref<string | null>
  roomId: Ref<string>
}) {
  return {
    activeBubble: ref<Record<string, { value: string; key: number } | undefined>>({}),
    clearBubble: (_uid: string) => {},
    sendEmoji: async (_value: string) => {},
    cooldownRemainingMs: computed(() => 0),
  }
}
```

Rodar `bun run lint:types`. Expected: PASS.

- [ ] **Step 4: Commit (stub do composable + wiring)**

```bash
git add src/components/room/PokerTable.vue src/views/RoomView.vue src/composables/useEmojiBroadcast.ts
git commit -m "feat(view): integrate EmojiPanel + propagate emoji events through PokerTable"
```

---

## Task 8: `useEmojiBroadcast` real (TDD) + `EmojiBubble` real

**Files:**
- Test: `tests/unit/composables/useEmojiBroadcast.test.ts`
- Modify: `src/composables/useEmojiBroadcast.ts`
- Test: `tests/unit/components/EmojiBubble.test.ts`
- Modify: `src/components/room/EmojiBubble.vue`

### 8a) Composable

- [ ] **Step 1: Escrever testes do composable**

Criar `tests/unit/composables/useEmojiBroadcast.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { Timestamp } from 'firebase/firestore'
import type { Room } from '@/types/room'
import { useEmojiBroadcast } from '@/composables/useEmojiBroadcast'

vi.mock('@/services/firebase/rooms', () => ({
  sendEmoji: vi.fn(),
}))

function ts(msAgo: number) {
  return Timestamp.fromMillis(Date.now() - msAgo)
}

function roomWith(parts: Record<string, { lastEmoji?: { value: string; sentAt: Timestamp } }>): Room {
  const baseParts: Room['participants'] = {}
  for (const [uid, p] of Object.entries(parts)) {
    baseParts[uid] = {
      name: uid,
      vote: null,
      lastSeenAt: ts(0),
      joinedAt: ts(0),
      ...(p.lastEmoji ? { lastEmoji: p.lastEmoji } : {}),
    }
  }
  return {
    id: 'r', name: 'n', createdAt: ts(0), lastActivityAt: ts(0), expiresAt: ts(0),
    moderatorUid: 'mod',
    deck: { type: 'fibonacci', values: [] },
    round: { taskTitle: '', revealed: false, startedAt: ts(0) },
    participants: baseParts,
  }
}

describe('useEmojiBroadcast', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('ignora lastEmoji com sentAt anterior ao clientMountAt', async () => {
    const room = ref<Room | null>(roomWith({ alice: { lastEmoji: { value: '🎉', sentAt: ts(5000) } } }))
    const e = useEmojiBroadcast({
      room,
      myUid: ref('alice'),
      roomId: ref('r'),
    })
    await nextTick()
    expect(e.activeBubble.value.alice).toBeUndefined()
  })

  it('dispara bubble para lastEmoji novo (sentAt > mountAt)', async () => {
    const room = ref<Room | null>(roomWith({}))
    const e = useEmojiBroadcast({
      room,
      myUid: ref('alice'),
      roomId: ref('r'),
    })
    await nextTick()

    room.value = roomWith({ alice: { lastEmoji: { value: '🎉', sentAt: Timestamp.fromMillis(Date.now() + 100) } } })
    await nextTick()
    expect(e.activeBubble.value.alice?.value).toBe('🎉')
  })

  it('clearBubble remove o slot do uid', async () => {
    const room = ref<Room | null>(roomWith({}))
    const e = useEmojiBroadcast({ room, myUid: ref('alice'), roomId: ref('r') })
    await nextTick()
    room.value = roomWith({ alice: { lastEmoji: { value: '🎉', sentAt: Timestamp.fromMillis(Date.now() + 100) } } })
    await nextTick()
    e.clearBubble('alice')
    expect(e.activeBubble.value.alice).toBeUndefined()
  })

  it('cooldownRemainingMs > 0 imediatamente após sendEmoji e zera após 2s', async () => {
    vi.useFakeTimers()
    const room = ref<Room | null>(roomWith({}))
    const e = useEmojiBroadcast({ room, myUid: ref('alice'), roomId: ref('r') })
    await e.sendEmoji('🎉')
    expect(e.cooldownRemainingMs.value).toBeGreaterThan(1500)
    vi.advanceTimersByTime(2100)
    expect(e.cooldownRemainingMs.value).toBe(0)
    vi.useRealTimers()
  })

  it('sendEmoji rejeita valor não-emoji', async () => {
    const { sendEmoji: svc } = await import('@/services/firebase/rooms')
    const room = ref<Room | null>(roomWith({}))
    const e = useEmojiBroadcast({ room, myUid: ref('alice'), roomId: ref('r') })
    await e.sendEmoji('hello')
    expect(svc).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run:
```bash
bun run test -- useEmojiBroadcast
```
Expected: FAIL (o stub do composable da Task 7 não implementa watcher/cooldown).

- [ ] **Step 3: Implementar o composable**

Substituir o conteúdo de `src/composables/useEmojiBroadcast.ts` por:

```ts
import { computed, ref, watch, onUnmounted, type Ref } from 'vue'
import { Timestamp } from 'firebase/firestore'
import type { Room } from '@/types/room'
import { sendEmoji as sendEmojiSvc } from '@/services/firebase/rooms'

const COOLDOWN_MS = 2000
const EMOJI_RE = /^\p{Extended_Pictographic}(\p{Emoji_Modifier}|‍\p{Extended_Pictographic})*$/u

interface BubbleState { value: string; key: number }

export function useEmojiBroadcast(opts: {
  room: Ref<Room | null>
  myUid: Ref<string | null>
  roomId: Ref<string>
}) {
  const clientMountMs = Date.now()
  const lastSeenEmojiAt = new Map<string, number>()
  const activeBubble = ref<Record<string, BubbleState | undefined>>({})

  watch(
    () => opts.room.value?.participants,
    (parts) => {
      if (!parts) return
      const next: Record<string, BubbleState | undefined> = { ...activeBubble.value }
      let changed = false
      for (const [uid, p] of Object.entries(parts)) {
        const evt = p.lastEmoji
        if (!evt) continue
        const sentMs = evt.sentAt instanceof Timestamp
          ? evt.sentAt.toMillis()
          : new Timestamp((evt.sentAt as { seconds: number }).seconds, 0).toMillis()
        if (sentMs <= clientMountMs) continue
        if (sentMs <= (lastSeenEmojiAt.get(uid) ?? 0)) continue
        lastSeenEmojiAt.set(uid, sentMs)
        next[uid] = { value: evt.value, key: sentMs }
        changed = true
      }
      if (changed) activeBubble.value = next
    },
    { deep: true, immediate: true },
  )

  function clearBubble(uid: string) {
    if (!activeBubble.value[uid]) return
    const next = { ...activeBubble.value }
    delete next[uid]
    activeBubble.value = next
  }

  const now = ref(Date.now())
  const interval = window.setInterval(() => { now.value = Date.now() }, 250)
  onUnmounted(() => clearInterval(interval))

  const lastSelfSentAt = ref(0)
  const cooldownRemainingMs = computed(() =>
    Math.max(0, COOLDOWN_MS - (now.value - lastSelfSentAt.value)),
  )

  async function sendEmoji(value: string) {
    if (!opts.myUid.value) return
    if (cooldownRemainingMs.value > 0) return
    if (value.length > 16) return
    if (!EMOJI_RE.test(value)) return
    lastSelfSentAt.value = Date.now()
    now.value = Date.now() // sincroniza imediatamente para teste de cooldown
    await sendEmojiSvc(opts.roomId.value, opts.myUid.value, value)
  }

  return { activeBubble, clearBubble, sendEmoji, cooldownRemainingMs }
}
```

- [ ] **Step 4: Rodar testes**

Run:
```bash
bun run test -- useEmojiBroadcast
```
Expected: PASS.

### 8b) EmojiBubble

- [ ] **Step 5: Escrever smoke test do `EmojiBubble`**

Criar `tests/unit/components/EmojiBubble.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EmojiBubble from '@/components/room/EmojiBubble.vue'

describe('EmojiBubble', () => {
  it('renderiza o value como unicode', () => {
    const w = mount(EmojiBubble, { props: { value: '🎉' } })
    expect(w.text()).toContain('🎉')
  })

  it('emite done após o ciclo completo (~2.3s)', async () => {
    vi.useFakeTimers()
    const w = mount(EmojiBubble, { props: { value: '🎉' } })
    vi.advanceTimersByTime(2400)
    expect(w.emitted('done')).toBeTruthy()
    vi.useRealTimers()
  })
})
```

- [ ] **Step 6: Rodar e ver falhar**

Run:
```bash
bun run test -- EmojiBubble
```
Expected: FAIL (componente é stub).

- [ ] **Step 7: Implementar `EmojiBubble.vue`**

Substituir o stub por:

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

defineProps<{ value: string }>()
const emit = defineEmits<{ done: [] }>()

const phase = ref<'in' | 'hold' | 'out'>('in')
const timers: number[] = []

onMounted(() => {
  timers.push(window.setTimeout(() => (phase.value = 'hold'), 350))
  timers.push(window.setTimeout(() => (phase.value = 'out'), 350 + 1600))
  timers.push(window.setTimeout(() => emit('done'), 350 + 1600 + 280))
})

onUnmounted(() => {
  for (const t of timers) clearTimeout(t)
})
</script>

<template>
  <div class="bubble" :class="phase" role="status" aria-live="polite">
    <span class="content">{{ value }}</span>
    <span class="tail" aria-hidden="true" />
  </div>
</template>

<style scoped>
.bubble {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform-origin: 50% 100%;
  padding: 6px 10px;
  border-radius: 14px;
  background: var(--color-surface);
  color: var(--color-ink);
  border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent);
  box-shadow: 0 12px 22px -8px rgb(var(--color-shadow) / 0.55);
  font-size: 1.4rem;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
  z-index: 4;
}
.bubble.in     { animation: bubble-in 350ms cubic-bezier(.2,.7,.2,1) forwards; }
.bubble.hold   { transform: translate(-50%, 0) scale(1); opacity: 1; }
.bubble.out    { animation: bubble-out 280ms ease-in forwards; }
.content { display: inline-block; }
.tail {
  position: absolute;
  top: 100%;
  left: 50%;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid var(--color-surface);
  transform: translateX(-50%);
}
@keyframes bubble-in {
  0%   { transform: translate(-50%, 4px) scale(0); opacity: 0; }
  60%  { transform: translate(-50%, 0) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
}
@keyframes bubble-out {
  0%   { transform: translate(-50%, 0) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -8px) scale(0.9); opacity: 0; }
}
</style>
```

- [ ] **Step 8: Rodar testes do componente**

Run:
```bash
bun run test -- EmojiBubble
```
Expected: PASS.

- [ ] **Step 9: Rodar suíte unitária inteira**

Run:
```bash
bun run test
```
Expected: PASS em tudo.

- [ ] **Step 10: Validar tipos**

Run:
```bash
bun run lint:types
```
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/composables/useEmojiBroadcast.ts src/components/room/EmojiBubble.vue tests/unit/composables/useEmojiBroadcast.test.ts tests/unit/components/EmojiBubble.test.ts
git commit -m "feat(emoji): useEmojiBroadcast watcher/cooldown + EmojiBubble animado"
```

---

## Task 9: Validação manual end-to-end (sem Lottie)

**Files:** nenhum (apenas validação)

Este checkpoint garante que tudo funciona com fallback Unicode antes de adicionar Lottie.

- [ ] **Step 1: Subir o emulador**

Run (terminal 1):
```bash
bun run emu
```

- [ ] **Step 2: Subir o app**

Run (terminal 2):
```bash
bun run dev
```

- [ ] **Step 3: Abrir 2 navegadores (anônimo + normal) na URL local**

Critérios de aceitação:
- Criar sala em um, entrar pelo link no outro.
- Clicar no `⋯` da própria cadeira em qualquer um dos dois — painel surge à direita.
- Clicar num emoji — painel some, balão aparece sobre o nome do remetente nos **dois** clientes.
- Tentar enviar de novo em <2s no mesmo cliente — não acontece nada (cooldown local).
- No outro cliente, o `⋯` dele em mim não mostra "Reagir" (mostra "Remover" se ele é mod, senão nem aparece).

Se algo falhar, voltar ao task correspondente.

- [ ] **Step 4: Commit (vazio para marcar checkpoint, opcional)**

```bash
git commit --allow-empty -m "chore: emoji broadcast e2e validado sem Lottie"
```

---

## Task 10: `notoEmoji.ts` + `LottiePlayer.vue` (best-effort)

**Files:**
- Create: `src/lib/notoEmoji.ts`
- Test: `tests/unit/lib/notoEmoji.test.ts`
- Create: `src/components/room/LottiePlayer.vue`
- Modify: `src/components/room/EmojiBubble.vue`

### 10a) notoEmoji.ts

- [ ] **Step 1: Escrever testes do helper**

Criar `tests/unit/lib/notoEmoji.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { toCodepointSequence, tryLoadLottie, _resetCache } from '@/lib/notoEmoji'

describe('toCodepointSequence', () => {
  it('emoji simples', () => {
    expect(toCodepointSequence('🎉')).toBe('1f389')
  })
  it('emoji com variation selector é normalizado (sem fe0f)', () => {
    expect(toCodepointSequence('❤️')).toBe('2764')
  })
  it('emoji ZWJ sequence', () => {
    expect(toCodepointSequence('👨‍💻')).toBe('1f468-200d-1f4bb')
  })
})

describe('tryLoadLottie', () => {
  beforeEach(() => { _resetCache() })

  it('retorna JSON em 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ v: '5.5', layers: [] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const res = await tryLoadLottie('🎉')
    expect(res).toEqual({ v: '5.5', layers: [] })
  })

  it('retorna null em 404 e cacheia como unavailable', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    vi.stubGlobal('fetch', fetchMock)
    const a = await tryLoadLottie('🎉')
    const b = await tryLoadLottie('🎉')
    expect(a).toBeNull()
    expect(b).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retorna null em erro de rede', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))
    const res = await tryLoadLottie('🎉')
    expect(res).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run:
```bash
bun run test -- notoEmoji
```
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `notoEmoji.ts`**

Criar `src/lib/notoEmoji.ts`:

```ts
type CacheEntry = object | 'unavailable'
const cache = new Map<string, CacheEntry>()

export function _resetCache() { cache.clear() }

export function toCodepointSequence(value: string): string {
  const parts: string[] = []
  for (const ch of value) {
    const cp = ch.codePointAt(0)!
    // pula variation selector (U+FE0F) — Noto não usa no nome do arquivo
    if (cp === 0xfe0f) continue
    parts.push(cp.toString(16))
  }
  return parts.join('-')
}

export async function tryLoadLottie(value: string): Promise<object | null> {
  const cp = toCodepointSequence(value)
  if (!cp) return null
  const hit = cache.get(cp)
  if (hit === 'unavailable') return null
  if (hit) return hit
  try {
    const res = await fetch(`https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/lottie.json`)
    if (!res.ok) { cache.set(cp, 'unavailable'); return null }
    const json = (await res.json()) as object
    cache.set(cp, json)
    return json
  } catch {
    cache.set(cp, 'unavailable')
    return null
  }
}
```

- [ ] **Step 4: Rodar testes**

Run:
```bash
bun run test -- notoEmoji
```
Expected: PASS.

### 10b) LottiePlayer.vue

- [ ] **Step 5: Implementar `LottiePlayer.vue`**

Criar `src/components/room/LottiePlayer.vue`:

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{ animation: object; size?: number }>()
const root = ref<HTMLDivElement | null>(null)
let anim: { destroy: () => void } | null = null

onMounted(async () => {
  if (!root.value) return
  const { default: lottie } = await import('lottie-web')
  anim = lottie.loadAnimation({
    container: root.value,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData: props.animation,
  })
})

onUnmounted(() => { anim?.destroy() })
</script>

<template>
  <div ref="root" class="lottie" :style="{ width: (size ?? 40) + 'px', height: (size ?? 40) + 'px' }" />
</template>

<style scoped>
.lottie { display: inline-block; }
.lottie :deep(svg) { display: block; }
</style>
```

### 10c) Integrar no EmojiBubble

- [ ] **Step 6: Atualizar `EmojiBubble.vue`**

Substituir o `<script setup>` por:

```ts
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { tryLoadLottie } from '@/lib/notoEmoji'
import LottiePlayer from './LottiePlayer.vue'

const props = defineProps<{ value: string }>()
const emit = defineEmits<{ done: [] }>()

const phase = ref<'in' | 'hold' | 'out'>('in')
const lottieData = ref<object | null>(null)
const timers: number[] = []

onMounted(() => {
  tryLoadLottie(props.value).then((data) => { if (data) lottieData.value = data })
  timers.push(window.setTimeout(() => (phase.value = 'hold'), 350))
  timers.push(window.setTimeout(() => (phase.value = 'out'), 350 + 1600))
  timers.push(window.setTimeout(() => emit('done'), 350 + 1600 + 280))
})

onUnmounted(() => { for (const t of timers) clearTimeout(t) })
</script>
```

Substituir o `<template>` por:

```vue
<template>
  <div class="bubble" :class="phase" role="status" aria-live="polite">
    <LottiePlayer v-if="lottieData" :animation="lottieData" :size="32" />
    <span v-else class="content">{{ value }}</span>
    <span class="tail" aria-hidden="true" />
  </div>
</template>
```

(O `<style scoped>` permanece igual.)

- [ ] **Step 7: Rodar testes**

Run:
```bash
bun run test
```
Expected: PASS (o smoke do EmojiBubble já era flexível ao conteúdo; `tryLoadLottie` é chamado mas o fetch sem stub falha silenciosamente — cai no fallback Unicode).

Se algum teste de `EmojiBubble` falhar, ajustar para stubar `tryLoadLottie`:

```ts
vi.mock('@/lib/notoEmoji', () => ({ tryLoadLottie: vi.fn().mockResolvedValue(null) }))
```

- [ ] **Step 8: Validar tipos**

Run:
```bash
bun run lint:types
```
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/notoEmoji.ts tests/unit/lib/notoEmoji.test.ts src/components/room/LottiePlayer.vue src/components/room/EmojiBubble.vue tests/unit/components/EmojiBubble.test.ts
git commit -m "feat(emoji): Lottie animado via Noto Emoji (best-effort) + fallback Unicode"
```

---

## Task 11: Bottom sheet em mobile

**Files:**
- Modify: `src/components/room/EmojiPanel.vue`

- [ ] **Step 1: Adicionar media query no estilo**

Adicionar ao final do bloco `<style scoped>` em `EmojiPanel.vue`:

```css
@media (max-width: 767px) {
  .emoji-panel {
    right: 0;
    left: 0;
    top: auto;
    bottom: 0;
    transform: none;
    width: 100%;
    max-height: 60vh;
    border-radius: 14px 14px 0 0;
  }
}
```

- [ ] **Step 2: Validar no DevTools viewport 375px**

(Manual.) Rodar `bun run dev` e em DevTools mudar viewport. Painel deve aparecer como bottom sheet.

- [ ] **Step 3: Commit**

```bash
git add src/components/room/EmojiPanel.vue
git commit -m "feat(emoji): EmojiPanel vira bottom sheet em <768px"
```

---

## Task 12: Cooldown UX no painel (clique fora + Esc + slide-out)

**Files:**
- Modify: `src/views/RoomView.vue` (listener Esc, click-outside)
- Modify: `src/components/room/EmojiPanel.vue` (Transition slide)

- [ ] **Step 1: Adicionar animação slide-in/out**

No `<template>` do `EmojiPanel.vue`, envolver o `<aside>` numa `<Transition name="panel">`:

```vue
<template>
  <Transition name="panel" appear>
    <aside class="emoji-panel" ...>
      ...
    </aside>
  </Transition>
</template>
```

Adicionar ao `<style scoped>`:

```css
.panel-enter-active, .panel-leave-active {
  transition: transform 220ms cubic-bezier(.2,.7,.2,1), opacity 220ms ease;
}
.panel-enter-from, .panel-leave-to {
  transform: translateY(-50%) translateX(120%);
  opacity: 0;
}
@media (max-width: 767px) {
  .panel-enter-from, .panel-leave-to {
    transform: translateY(100%);
    opacity: 0;
  }
}
```

- [ ] **Step 2: Esc + click fora no `RoomView.vue`**

Adicionar listeners no `onMounted` existente de `RoomView.vue`. Localizar o trecho:

```ts
function onKey(e: KeyboardEvent) {
  // ...existente
  if (e.key === 'r' && room.isModerator.value && ...) { void onReveal() }
}
```

Substituir por:

```ts
function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
  if (e.key === 'Escape' && emojiPanelOpen.value) {
    closeEmojiPanel()
    return
  }
  if (e.key === 'r' && room.isModerator.value && room.room.value && !room.room.value.round.revealed) {
    void onReveal()
  }
}

function onDocClick(e: MouseEvent) {
  if (!emojiPanelOpen.value) return
  const t = e.target as HTMLElement
  if (t.closest('.emoji-panel') || t.closest('.kick-trigger')) return
  closeEmojiPanel()
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('click', onDocClick)
})
```

(O `onMounted` antigo precisa virar este — checar se já existe o do `keydown` e consolidar; remover duplicações.)

- [ ] **Step 3: Validar**

Run:
```bash
bun run test
bun run lint:types
```
Expected: PASS.

Manual: abrir painel, pressionar `Esc` → fecha. Abrir painel, clicar fora → fecha. Animação slide visível.

- [ ] **Step 4: Commit**

```bash
git add src/views/RoomView.vue src/components/room/EmojiPanel.vue
git commit -m "feat(emoji): slide animation + Esc/click-outside fecham o EmojiPanel"
```

---

## Task 13: Atualizar README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Adicionar seção curta sobre a feature**

Abrir `README.md` e localizar a seção de features (se existir; senão criar depois do título). Adicionar:

```markdown
### Reações com emoji

Cada participante pode abrir o `⋯` da própria cadeira para reagir com emoji. A reação aparece como balão sobre o nome em todos os clientes (com versão animada via Noto Emoji quando disponível). Cooldown de 2s evita spam.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README cita reações com emoji"
```

---

## Task 14: Suíte completa + smoke manual final

- [ ] **Step 1: Rodar tudo**

Run:
```bash
bun run lint:types && bun run test && bun run test:integration
```
Expected: tudo PASS.

- [ ] **Step 2: Smoke manual com 3 clientes**

Subir emulador + dev. Abrir 3 abas:
- Mod cria sala.
- 2 participantes entram.
- Cada um envia emojis distintos. Confirma:
  - Balão sai do nome correto em todos os clientes.
  - Recarregar uma aba não re-anima emojis antigos.
  - Mod ainda consegue "Remover" pelo `⋯` em outros.
  - Esc / clicar fora fecha o painel.

- [ ] **Step 3 (opcional): Squash de commits "feat(emoji)" não-feitos**

Apenas se o histórico tiver ficado verboso. Caso contrário, manter como está. **Não** force-push se a branch já estiver no remote.

- [ ] **Step 4: Pronto para PR**

Branch `develop` está com tudo necessário. PR contra `main` quando o usuário pedir.

---

## Notas de execução

- **Versões pinned:** nenhuma. `bun add` resolve para mais nova.
- **Subagents devem usar Write/Edit, não cat/heredoc** ao executar este plano.
- **Não fazer push sem permissão explícita** do usuário.
- Quando um teste falhar e a causa não estiver clara, parar e investigar antes de "corrigir" cegamente — `useEmojiBroadcast` tem lógica de `Timestamp` que vale tratar com cuidado, principalmente em testes que envolvem `vi.useFakeTimers`.
