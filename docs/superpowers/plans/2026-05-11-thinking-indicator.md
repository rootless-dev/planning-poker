# Thinking Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a inicial do participante por um 🤔 animado quando ele fica ≥1s com hover sobre as cartas, indicando deliberação aos outros jogadores em tempo real.

**Architecture:** Cliente persiste um `thinkingUntil: Timestamp` no próprio participant. Receptores derivam `Record<uid, boolean>` comparando contra `Date.now()`. State machine no emissor faz 1 write inicial após 1s de hover, heartbeats de 3s enquanto ativo, write único de "leave" com janela de 4s e limpa no voto via `deleteField` no mesmo write.

**Tech Stack:** Vue 3, TypeScript, Firebase Firestore, Vitest, `@vue/test-utils`, Firebase Emulator Suite.

**Referência:** `docs/superpowers/specs/2026-05-11-thinking-indicator-design.md`.

---

## File Structure

**Criar:**
- `src/composables/useThinking.ts` — composable de orquestração (receiver, lottie loader, emitter state machine)
- `tests/unit/composables/useThinking.test.ts` — testes do composable (receptor + emissor)
- `tests/integration/rooms-thinking.test.ts` — testes de `setThinking`/`clearThinking` no emulador + rule reinforcement

**Modificar:**
- `src/types/room.ts` — adicionar `thinkingUntil?: Timestamp` em `Participant`
- `src/services/firebase/rooms.ts` — funções `setThinking`, `clearThinking` e extensão do `setVote`
- `src/components/room/Hand.vue` — listeners de pointer/touch na `.hand-rail` que emitem `area-enter`/`area-move`/`area-leave`
- `src/components/room/PlayerSeat.vue` — props `isThinking` + `thinkingLottie`; troca da inicial pelo emoji
- `src/components/room/PokerTable.vue` — propagar `thinking` e `thinkingLottie` por seat
- `src/views/RoomView.vue` — instanciar `useThinking`, gating de suppression, conectar Hand → composable → PokerTable
- `firestore.rules` — reinforcement de `thinkingUntil` (validação de timestamp futuro dentro de 30s)
- `tests/unit/components/PlayerSeat.test.ts` — caso de `isThinking: true`

---

## Task 1: Adicionar `thinkingUntil` ao tipo `Participant`

**Files:**
- Modify: `src/types/room.ts`

- [ ] **Step 1: Adicionar o campo opcional**

Editar `src/types/room.ts` para incluir o campo:

```ts
export interface Participant {
  name: string
  vote: string | null
  lastSeenAt: Timestamp
  joinedAt: Timestamp
  lastEmoji?: EmojiEvent
  thinkingUntil?: Timestamp
}
```

- [ ] **Step 2: Verificar type-check**

Run:
```bash
bun run lint:types
```
Expected: PASS sem novos erros.

- [ ] **Step 3: Commit**

```bash
git add src/types/room.ts
git commit -m "feat(types): adicionar thinkingUntil em Participant"
```

---

## Task 2: Service helpers `setThinking`/`clearThinking` + extensão do `setVote`

**Files:**
- Modify: `src/services/firebase/rooms.ts`

Sem teste unitário neste task — a validação acontece nos testes de integração (Task 10) e nos testes do composable (Task 4).

- [ ] **Step 1: Adicionar `setThinking` e `clearThinking`**

No final de `src/services/firebase/rooms.ts`, adicionar:

```ts
export async function setThinking(roomId: string, uid: string, untilMs: number): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(doc(db, 'rooms', roomId), {
    [`participants.${uid}.thinkingUntil`]: Timestamp.fromMillis(untilMs),
    ...activityPatch(),
  })
}

export async function clearThinking(roomId: string, uid: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(doc(db, 'rooms', roomId), {
    [`participants.${uid}.thinkingUntil`]: deleteField(),
    ...activityPatch(),
  })
}
```

- [ ] **Step 2: Estender `setVote` para limpar `thinkingUntil` no mesmo write**

Substituir a função `setVote` existente por:

```ts
export async function setVote(roomId: string, uid: string, value: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(doc(db, 'rooms', roomId), {
    [`participants.${uid}.vote`]: value,
    [`participants.${uid}.lastSeenAt`]: serverTimestamp(),
    [`participants.${uid}.thinkingUntil`]: deleteField(),
    ...activityPatch(),
  })
}
```

- [ ] **Step 3: Verificar type-check**

Run:
```bash
bun run lint:types
```
Expected: PASS.

- [ ] **Step 4: Rodar testes unitários para confirmar que nada quebrou**

Run:
```bash
bun run test
```
Expected: todos os testes existentes passam.

- [ ] **Step 5: Commit**

```bash
git add src/services/firebase/rooms.ts
git commit -m "feat(rooms): setThinking/clearThinking + setVote limpa thinkingUntil"
```

---

## Task 3: Composable `useThinking` — receptor + carregamento do Lottie

**Files:**
- Create: `src/composables/useThinking.ts`
- Create: `tests/unit/composables/useThinking.test.ts`

Nesta etapa o composable só lê o estado da sala e expõe `thinking` (`Record<uid, boolean>`) + `thinkingLottie`. O emissor entra no Task 4.

- [ ] **Step 1: Escrever os testes de receptor (falhando)**

Criar `tests/unit/composables/useThinking.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { createApp } from 'vue'
import { Timestamp } from 'firebase/firestore'
import type { Room } from '@/types/room'

vi.mock('@/services/firebase/rooms', () => ({
  setThinking: vi.fn().mockResolvedValue(undefined),
  clearThinking: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/notoEmoji', () => ({
  tryLoadLottie: vi.fn().mockResolvedValue(null),
}))

function withSetup<T>(composable: () => T): [T, () => void] {
  let result!: T
  const app = createApp({ setup() { result = composable(); return () => null } })
  app.mount(document.createElement('div'))
  return [result, () => app.unmount()]
}

function ts(ms: number) {
  return Timestamp.fromMillis(ms)
}

function roomWith(
  parts: Record<string, { thinkingUntil?: Timestamp }>,
  revealed = false,
): Room {
  const baseParts: Room['participants'] = {}
  for (const [uid, p] of Object.entries(parts)) {
    baseParts[uid] = {
      name: uid,
      vote: null,
      lastSeenAt: ts(Date.now()),
      joinedAt: ts(Date.now()),
      ...(p.thinkingUntil ? { thinkingUntil: p.thinkingUntil } : {}),
    }
  }
  return {
    id: 'r', name: 'n',
    createdAt: ts(Date.now()), lastActivityAt: ts(Date.now()), expiresAt: ts(Date.now()),
    moderatorUid: 'mod',
    deck: { type: 'fibonacci', values: [] },
    round: { taskTitle: '', revealed, startedAt: ts(Date.now()) },
    participants: baseParts,
  }
}

describe('useThinking — receiver', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => { vi.useRealTimers() })

  it('marca thinking=true para uid com thinkingUntil no futuro', async () => {
    const { useThinking } = await import('@/composables/useThinking')
    const room = ref<Room | null>(roomWith({ alice: { thinkingUntil: ts(Date.now() + 4000) } }))
    const [t, cleanup] = withSetup(() => useThinking({
      room, myUid: ref('me'), roomId: ref('r'),
      suppressOwn: ref(false),
    }))
    await nextTick()
    expect(t.thinking.value.alice).toBe(true)
    cleanup()
  })

  it('marca thinking=false para uid com thinkingUntil no passado', async () => {
    const { useThinking } = await import('@/composables/useThinking')
    const room = ref<Room | null>(roomWith({ alice: { thinkingUntil: ts(Date.now() - 1000) } }))
    const [t, cleanup] = withSetup(() => useThinking({
      room, myUid: ref('me'), roomId: ref('r'),
      suppressOwn: ref(false),
    }))
    await nextTick()
    expect(t.thinking.value.alice).toBeFalsy()
    cleanup()
  })

  it('quando round.revealed=true, ninguém aparece pensando', async () => {
    const { useThinking } = await import('@/composables/useThinking')
    const room = ref<Room | null>(roomWith({ alice: { thinkingUntil: ts(Date.now() + 4000) } }, true))
    const [t, cleanup] = withSetup(() => useThinking({
      room, myUid: ref('me'), roomId: ref('r'),
      suppressOwn: ref(false),
    }))
    await nextTick()
    expect(t.thinking.value.alice).toBeFalsy()
    cleanup()
  })

  it('quando suppressOwn=true, esconde só o próprio uid', async () => {
    const { useThinking } = await import('@/composables/useThinking')
    const room = ref<Room | null>(roomWith({
      me: { thinkingUntil: ts(Date.now() + 4000) },
      alice: { thinkingUntil: ts(Date.now() + 4000) },
    }))
    const [t, cleanup] = withSetup(() => useThinking({
      room, myUid: ref('me'), roomId: ref('r'),
      suppressOwn: ref(true),
    }))
    await nextTick()
    expect(t.thinking.value.me).toBeFalsy()
    expect(t.thinking.value.alice).toBe(true)
    cleanup()
  })

  it('tick avança e thinkingUntil expirado vira false', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const { useThinking } = await import('@/composables/useThinking')
    const room = ref<Room | null>(roomWith({ alice: { thinkingUntil: ts(Date.now() + 600) } }))
    const [t, cleanup] = withSetup(() => useThinking({
      room, myUid: ref('me'), roomId: ref('r'),
      suppressOwn: ref(false),
    }))
    await nextTick()
    expect(t.thinking.value.alice).toBe(true)
    vi.advanceTimersByTime(1500)
    await nextTick()
    expect(t.thinking.value.alice).toBeFalsy()
    cleanup()
  })
})
```

- [ ] **Step 2: Rodar testes para confirmar que falham**

Run:
```bash
bun x vitest run tests/unit/composables/useThinking.test.ts
```
Expected: FAIL com `Cannot find module '@/composables/useThinking'`.

- [ ] **Step 3: Implementar a versão mínima do composable (receptor + lottie)**

Criar `src/composables/useThinking.ts`:

```ts
import { computed, ref, onUnmounted, watchEffect, type Ref } from 'vue'
import type { Room } from '@/types/room'
import { tryLoadLottie } from '@/lib/notoEmoji'

export interface UseThinkingOptions {
  room: Ref<Room | null>
  myUid: Ref<string | null>
  roomId: Ref<string>
  suppressOwn: Ref<boolean>
}

export interface UseThinkingApi {
  thinking: Ref<Record<string, boolean>>
  thinkingLottie: Ref<object | null>
  onAreaEnter: () => void
  onAreaMove: () => void
  onAreaLeave: () => void
}

export function useThinking(opts: UseThinkingOptions): UseThinkingApi {
  const now = ref(Date.now())
  const interval = window.setInterval(() => { now.value = Date.now() }, 500)
  onUnmounted(() => clearInterval(interval))

  const thinkingLottie = ref<object | null>(null)
  watchEffect(async () => {
    if (thinkingLottie.value) return
    const data = await tryLoadLottie('🤔')
    if (data) thinkingLottie.value = data
  })

  const thinking = computed<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {}
    const r = opts.room.value
    if (!r) return out
    if (r.round.revealed) return out
    const myUid = opts.myUid.value
    const suppress = opts.suppressOwn.value
    for (const [uid, p] of Object.entries(r.participants)) {
      const until = p.thinkingUntil?.toMillis() ?? 0
      if (until <= now.value) continue
      if (suppress && uid === myUid) continue
      out[uid] = true
    }
    return out
  })

  // Placeholders preenchidos no Task 4 (emitter)
  function onAreaEnter() {}
  function onAreaMove() {}
  function onAreaLeave() {}

  return { thinking, thinkingLottie, onAreaEnter, onAreaMove, onAreaLeave }
}
```

- [ ] **Step 4: Rodar testes para confirmar que passam**

Run:
```bash
bun x vitest run tests/unit/composables/useThinking.test.ts
```
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useThinking.ts tests/unit/composables/useThinking.test.ts
git commit -m "feat(thinking): composable receptor + carregamento do Lottie 🤔"
```

---

## Task 4: Emitter state machine no `useThinking`

**Files:**
- Modify: `src/composables/useThinking.ts`
- Modify: `tests/unit/composables/useThinking.test.ts`

State machine: `idle → pending (1s) → active (heartbeats) → idle-active (sem movimento) → active (move) → leave (1 write +4s) → idle`. Voto e revelação resetam.

- [ ] **Step 1: Escrever testes do emissor (falhando)**

Adicionar no final de `tests/unit/composables/useThinking.test.ts`:

```ts
describe('useThinking — emitter', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => { vi.useRealTimers() })

  it('area-enter por menos de 1s NÃO escreve', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const { setThinking } = await import('@/services/firebase/rooms')
    const { useThinking } = await import('@/composables/useThinking')
    const room = ref<Room | null>(roomWith({ me: {} }))
    const [t, cleanup] = withSetup(() => useThinking({
      room, myUid: ref('me'), roomId: ref('r'),
      suppressOwn: ref(false),
    }))
    t.onAreaEnter()
    vi.advanceTimersByTime(900)
    t.onAreaLeave()
    vi.advanceTimersByTime(2000)
    expect(setThinking).not.toHaveBeenCalled()
    cleanup()
  })

  it('area-enter por ≥1s escreve thinkingUntil ≈ now + 5s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const { setThinking } = await import('@/services/firebase/rooms')
    const { useThinking } = await import('@/composables/useThinking')
    const room = ref<Room | null>(roomWith({ me: {} }))
    const [t, cleanup] = withSetup(() => useThinking({
      room, myUid: ref('me'), roomId: ref('r'),
      suppressOwn: ref(false),
    }))
    t.onAreaEnter()
    vi.advanceTimersByTime(1000)
    expect(setThinking).toHaveBeenCalledTimes(1)
    const [, , until] = (setThinking as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(until).toBeGreaterThan(Date.now() + 4000)
    expect(until).toBeLessThanOrEqual(Date.now() + 5000)
    cleanup()
  })

  it('heartbeat: 1 write inicial + writes a cada 3s enquanto move', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const { setThinking } = await import('@/services/firebase/rooms')
    const { useThinking } = await import('@/composables/useThinking')
    const room = ref<Room | null>(roomWith({ me: {} }))
    const [t, cleanup] = withSetup(() => useThinking({
      room, myUid: ref('me'), roomId: ref('r'),
      suppressOwn: ref(false),
    }))
    t.onAreaEnter()
    vi.advanceTimersByTime(1000) // 1 write inicial
    for (let i = 0; i < 9; i++) {
      vi.advanceTimersByTime(1000)
      t.onAreaMove()
    }
    // ~9s ativos com movimento contínuo => 1 inicial + ~3 heartbeats
    expect((setThinking as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(3)
    expect((setThinking as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(5)
    cleanup()
  })

  it('idle-detector: sem movimento por 1.5s, heartbeat para', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const { setThinking } = await import('@/services/firebase/rooms')
    const { useThinking } = await import('@/composables/useThinking')
    const room = ref<Room | null>(roomWith({ me: {} }))
    const [t, cleanup] = withSetup(() => useThinking({
      room, myUid: ref('me'), roomId: ref('r'),
      suppressOwn: ref(false),
    }))
    t.onAreaEnter()
    vi.advanceTimersByTime(1000) // 1 write inicial
    vi.advanceTimersByTime(10000) // sem area-move, idle-stop dispara depois de 1.5s
    expect((setThinking as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
    cleanup()
  })

  it('area-leave após active escreve 1 vez com janela de 4s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const { setThinking } = await import('@/services/firebase/rooms')
    const { useThinking } = await import('@/composables/useThinking')
    const room = ref<Room | null>(roomWith({ me: {} }))
    const [t, cleanup] = withSetup(() => useThinking({
      room, myUid: ref('me'), roomId: ref('r'),
      suppressOwn: ref(false),
    }))
    t.onAreaEnter()
    vi.advanceTimersByTime(1000) // active, 1 write
    t.onAreaLeave()
    const calls = (setThinking as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.length).toBe(2)
    const [, , leaveUntil] = calls[1]
    expect(leaveUntil).toBeGreaterThanOrEqual(Date.now() + 3900)
    expect(leaveUntil).toBeLessThanOrEqual(Date.now() + 4100)
    cleanup()
  })

  it('round.revealed=true emite clearThinking', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const { setThinking, clearThinking } = await import('@/services/firebase/rooms')
    const { useThinking } = await import('@/composables/useThinking')
    const room = ref<Room | null>(roomWith({ me: {} }))
    const [t, cleanup] = withSetup(() => useThinking({
      room, myUid: ref('me'), roomId: ref('r'),
      suppressOwn: ref(false),
    }))
    t.onAreaEnter()
    vi.advanceTimersByTime(1000)
    expect(setThinking).toHaveBeenCalledTimes(1)
    room.value = roomWith({ me: {} }, true)
    await nextTick()
    expect(clearThinking).toHaveBeenCalledTimes(1)
    cleanup()
  })

  it('quando me.vote muda para não-null, state machine reseta (sem novo write)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const { setThinking } = await import('@/services/firebase/rooms')
    const { useThinking } = await import('@/composables/useThinking')
    const room = ref<Room | null>(roomWith({ me: {} }))
    const [t, cleanup] = withSetup(() => useThinking({
      room, myUid: ref('me'), roomId: ref('r'),
      suppressOwn: ref(false),
    }))
    t.onAreaEnter()
    vi.advanceTimersByTime(1000) // 1 write
    // simula voto chegando
    const r = roomWith({ me: {} })
    r.participants.me.vote = '5'
    room.value = r
    await nextTick()
    vi.advanceTimersByTime(5000)
    t.onAreaMove()
    expect((setThinking as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
    cleanup()
  })

  it('suppressOwn=true ignora onAreaEnter (não escreve)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const { setThinking } = await import('@/services/firebase/rooms')
    const { useThinking } = await import('@/composables/useThinking')
    const room = ref<Room | null>(roomWith({ me: {} }))
    const suppress = ref(true)
    const [t, cleanup] = withSetup(() => useThinking({
      room, myUid: ref('me'), roomId: ref('r'),
      suppressOwn: suppress,
    }))
    t.onAreaEnter()
    vi.advanceTimersByTime(2000)
    expect(setThinking).not.toHaveBeenCalled()
    cleanup()
  })
})
```

- [ ] **Step 2: Rodar testes para confirmar que falham**

Run:
```bash
bun x vitest run tests/unit/composables/useThinking.test.ts
```
Expected: FAIL nos novos testes do emitter (onAreaEnter está vazio).

- [ ] **Step 3: Implementar a state machine**

Substituir o `useThinking.ts` por:

```ts
import { computed, ref, onUnmounted, watch, watchEffect, type Ref } from 'vue'
import type { Room } from '@/types/room'
import { tryLoadLottie } from '@/lib/notoEmoji'
import { setThinking as setThinkingSvc, clearThinking as clearThinkingSvc } from '@/services/firebase/rooms'

const HOVER_START_MS = 1000
const WINDOW_MS = 5000
const HEARTBEAT_MS = 3000
const IDLE_STOP_MS = 1500
const LEAVE_GRACE_MS = 4000

export interface UseThinkingOptions {
  room: Ref<Room | null>
  myUid: Ref<string | null>
  roomId: Ref<string>
  suppressOwn: Ref<boolean>
}

export interface UseThinkingApi {
  thinking: Ref<Record<string, boolean>>
  thinkingLottie: Ref<object | null>
  onAreaEnter: () => void
  onAreaMove: () => void
  onAreaLeave: () => void
}

type State = 'idle' | 'pending' | 'active' | 'idle-active'

export function useThinking(opts: UseThinkingOptions): UseThinkingApi {
  // ---------- receptor ----------
  const now = ref(Date.now())
  const tickInterval = window.setInterval(() => { now.value = Date.now() }, 500)

  const thinkingLottie = ref<object | null>(null)
  watchEffect(async () => {
    if (thinkingLottie.value) return
    const data = await tryLoadLottie('🤔')
    if (data) thinkingLottie.value = data
  })

  const thinking = computed<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {}
    const r = opts.room.value
    if (!r) return out
    if (r.round.revealed) return out
    const myUid = opts.myUid.value
    const suppress = opts.suppressOwn.value
    for (const [uid, p] of Object.entries(r.participants)) {
      const until = p.thinkingUntil?.toMillis() ?? 0
      if (until <= now.value) continue
      if (suppress && uid === myUid) continue
      out[uid] = true
    }
    return out
  })

  // ---------- emissor ----------
  let state: State = 'idle'
  let startTimer: number | null = null
  let heartbeatTimer: number | null = null
  let idleTimer: number | null = null

  function clearAllTimers() {
    if (startTimer != null) { clearTimeout(startTimer); startTimer = null }
    if (heartbeatTimer != null) { clearInterval(heartbeatTimer); heartbeatTimer = null }
    if (idleTimer != null) { clearTimeout(idleTimer); idleTimer = null }
  }

  function writeUntil(deltaMs: number) {
    const myUid = opts.myUid.value
    if (!myUid) return
    void setThinkingSvc(opts.roomId.value, myUid, Date.now() + deltaMs)
  }

  function resetIdleTimer() {
    if (idleTimer != null) clearTimeout(idleTimer)
    idleTimer = window.setTimeout(() => {
      if (state === 'active') {
        if (heartbeatTimer != null) { clearInterval(heartbeatTimer); heartbeatTimer = null }
        state = 'idle-active'
      }
    }, IDLE_STOP_MS)
  }

  function enterActive() {
    state = 'active'
    writeUntil(WINDOW_MS)
    heartbeatTimer = window.setInterval(() => {
      if (state === 'active') writeUntil(WINDOW_MS)
    }, HEARTBEAT_MS)
    resetIdleTimer()
  }

  function goIdle(emitLeaveWrite: boolean) {
    const wasActive = state === 'active' || state === 'idle-active'
    clearAllTimers()
    state = 'idle'
    if (emitLeaveWrite && wasActive) writeUntil(LEAVE_GRACE_MS)
  }

  function onAreaEnter() {
    if (opts.suppressOwn.value) return
    if (state !== 'idle') return
    state = 'pending'
    startTimer = window.setTimeout(() => {
      startTimer = null
      if (state === 'pending') enterActive()
    }, HOVER_START_MS)
  }

  function onAreaMove() {
    if (state === 'active') {
      resetIdleTimer()
    } else if (state === 'idle-active') {
      enterActive()
    }
  }

  function onAreaLeave() {
    if (state === 'pending') {
      clearAllTimers()
      state = 'idle'
      return
    }
    if (state === 'active' || state === 'idle-active') {
      goIdle(true)
    }
  }

  // Reset em voto: quando o próprio uid passa de vote=null para !=null, sai do estado
  watch(
    () => {
      const uid = opts.myUid.value
      if (!uid) return null
      return opts.room.value?.participants[uid]?.vote ?? null
    },
    (newVote, oldVote) => {
      if (oldVote == null && newVote != null) {
        // O write de setVote já limpa thinkingUntil. Aqui só zeramos o state local.
        clearAllTimers()
        state = 'idle'
      }
    },
  )

  // Reset + clearThinking quando round vira revealed
  watch(
    () => opts.room.value?.round.revealed ?? false,
    (revealed, wasRevealed) => {
      if (revealed && !wasRevealed) {
        const wasThinking = state === 'active' || state === 'idle-active'
        clearAllTimers()
        state = 'idle'
        const uid = opts.myUid.value
        if (wasThinking && uid) void clearThinkingSvc(opts.roomId.value, uid)
      }
    },
  )

  onUnmounted(() => {
    clearInterval(tickInterval)
    clearAllTimers()
  })

  return { thinking, thinkingLottie, onAreaEnter, onAreaMove, onAreaLeave }
}
```

- [ ] **Step 4: Rodar testes para confirmar que passam**

Run:
```bash
bun x vitest run tests/unit/composables/useThinking.test.ts
```
Expected: PASS em todos (receptor + emissor).

- [ ] **Step 5: Rodar suite completa**

Run:
```bash
bun run test
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useThinking.ts tests/unit/composables/useThinking.test.ts
git commit -m "feat(thinking): state machine do emissor com heartbeat e janela pós-leave"
```

---

## Task 5: Renderizar 🤔 no `PlayerSeat.vue`

**Files:**
- Modify: `src/components/room/PlayerSeat.vue`
- Modify: `tests/unit/components/PlayerSeat.test.ts`

- [ ] **Step 1: Adicionar teste do novo comportamento (falhando)**

Em `tests/unit/components/PlayerSeat.test.ts`, adicionar um novo `describe`:

```ts
describe('PlayerSeat — thinking indicator', () => {
  it('com isThinking=true e sem voto, mostra fallback 🤔 no avatar (sem Lottie)', () => {
    const w = mount(PlayerSeat, {
      props: { ...base, isSelf: false, canKick: false, isThinking: true, thinkingLottie: null },
    })
    const avatar = w.get('.avatar')
    expect(avatar.text()).toContain('🤔')
    expect(avatar.text()).not.toContain('A')
  })

  it('com isThinking=false, mostra a inicial normalmente', () => {
    const w = mount(PlayerSeat, {
      props: { ...base, isSelf: false, canKick: false, isThinking: false, thinkingLottie: null },
    })
    expect(w.get('.avatar').text()).toContain('A')
  })

  it('com isThinking=true e moderador, mantém a coroa', () => {
    const w = mount(PlayerSeat, {
      props: { ...base, isSelf: false, canKick: false, isModerator: true, isThinking: true, thinkingLottie: null },
    })
    expect(w.get('.crown').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar testes para confirmar que falham**

Run:
```bash
bun x vitest run tests/unit/components/PlayerSeat.test.ts
```
Expected: FAIL — props `isThinking`/`thinkingLottie` não existem.

- [ ] **Step 3: Modificar `PlayerSeat.vue` para aceitar e renderizar**

Em `src/components/room/PlayerSeat.vue`, atualizar o `defineProps` e o template:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import PlayingCard from './PlayingCard.vue'
import EmojiBubble from './EmojiBubble.vue'
import LottiePlayer from './LottiePlayer.vue'
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
  isThinking?: boolean
  thinkingLottie?: object | null
}>()
const emit = defineEmits<{
  kick: [uid: string]
  'open-emoji-panel': []
  'emoji-bubble-done': [uid: string]
}>()

const showMenu = ref(false)

function onTriggerClick() {
  if (props.isSelf || props.canKick) {
    showMenu.value = !showMenu.value
  }
}

function chooseReact() {
  showMenu.value = false
  emit('open-emoji-panel')
}

function confirmKick() {
  if (confirm(`Remover ${props.name} da sala?`)) emit('kick', props.uid)
  showMenu.value = false
}

const initial = computed(() => props.name.slice(0, 1).toUpperCase())
const showTrigger = computed(() => props.isSelf || (props.canKick && !props.isSelf))

const lottieSize = computed(() => {
  switch (props.cardSize ?? 'sm') {
    case 'xs': return 20
    case 'sm': return 26
    case 'md': return 32
    case 'lg': return 40
  }
})
</script>
```

E no template, substituir o bloco `.avatar.numeral` por:

```vue
<div class="avatar numeral">
  <span v-if="isThinking" class="thinking-emoji" aria-label="pensando">
    <LottiePlayer v-if="thinkingLottie" :animation="thinkingLottie" :size="lottieSize" />
    <span v-else>🤔</span>
  </span>
  <span v-else>{{ initial }}</span>
  <span v-if="isModerator" class="crown" aria-hidden="true">♛</span>
</div>
```

Adicionar ao `<style scoped>` (próximo ao `.avatar`):

```css
.thinking-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05em;
  line-height: 1;
  animation: thinking-fade 150ms ease-out;
}
@keyframes thinking-fade {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}
```

- [ ] **Step 4: Rodar testes para confirmar que passam**

Run:
```bash
bun x vitest run tests/unit/components/PlayerSeat.test.ts
```
Expected: PASS em todos.

- [ ] **Step 5: Verificar type-check**

Run:
```bash
bun run lint:types
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/room/PlayerSeat.vue tests/unit/components/PlayerSeat.test.ts
git commit -m "feat(seat): trocar inicial por 🤔 quando isThinking"
```

---

## Task 6: Emitir eventos de área em `Hand.vue`

**Files:**
- Modify: `src/components/room/Hand.vue`

`Hand.vue` ganha listeners de `pointer*`, `scroll` e `focusin` na `.hand-rail` que emitem três eventos: `area-enter`, `area-move`, `area-leave`. Sem teste unitário direto — a fiação fica validada no smoke manual (Task 11).

- [ ] **Step 1: Atualizar emits e adicionar handlers no `<script setup>`**

Substituir o `<script setup>` de `src/components/room/Hand.vue` por:

```vue
<script setup lang="ts">
import PlayingCard from './PlayingCard.vue'

defineProps<{ values: string[]; selected: string | null; disabled?: boolean }>()
const emit = defineEmits<{
  select: [value: string]
  'area-enter': []
  'area-move': []
  'area-leave': []
}>()

function onPointerEnter() { emit('area-enter') }
function onPointerLeave() { emit('area-leave') }
function onPointerMove() { emit('area-move') }
function onScroll() { emit('area-move') }
function onFocusIn() { emit('area-enter') }
function onFocusOut(e: FocusEvent) {
  const rt = e.relatedTarget as HTMLElement | null
  const cur = e.currentTarget as HTMLElement | null
  if (cur && rt && cur.contains(rt)) return
  emit('area-leave')
}
</script>
```

- [ ] **Step 2: Adicionar os listeners na `.hand-rail` no template**

Substituir o `<template>` de `Hand.vue` por:

```vue
<template>
  <div class="hand-wrap">
    <p class="kicker hand-label">Sua mão</p>
    <div
      class="hand-rail"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @pointermove="onPointerMove"
      @scroll.passive="onScroll"
      @focusin="onFocusIn"
      @focusout="onFocusOut"
    >
      <div class="hand-track">
        <button
          v-for="(v, i) in values"
          :key="v"
          type="button"
          :disabled="disabled"
          @click="emit('select', v)"
          class="hand-btn"
          :class="{ picked: selected === v, dim: !!selected && selected !== v }"
          :style="{ '--i': i }"
          :aria-pressed="selected === v"
        >
          <PlayingCard
            :value="v"
            size="lg"
            :state="selected === v ? 'selected' : 'idle'"
          />
        </button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Verificar type-check**

Run:
```bash
bun run lint:types
```
Expected: PASS.

- [ ] **Step 4: Rodar suite completa**

Run:
```bash
bun run test
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/room/Hand.vue
git commit -m "feat(hand): emitir area-enter/move/leave para o composable thinking"
```

---

## Task 7: Propagar `thinking` em `PokerTable.vue`

**Files:**
- Modify: `src/components/room/PokerTable.vue`

- [ ] **Step 1: Adicionar props `thinking` e `thinkingLottie` + repassar em ambos os layouts**

Substituir o `<script setup>` de `src/components/room/PokerTable.vue` por:

```vue
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
  thinking?: Record<string, boolean>
  thinkingLottie?: object | null
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

E em cada `<PlayerSeat>` (desktop e mobile), adicionar as duas props:

```vue
:is-thinking="thinking?.[seat.uid] ?? false"
:thinking-lottie="thinkingLottie ?? null"
```

Por exemplo, o uso no layout desktop fica:

```vue
<PlayerSeat
  :uid="seat.uid"
  :name="seat.name"
  :vote="seat.vote"
  :presence="seat.presence"
  :is-moderator="seat.isModerator"
  :is-self="seat.isSelf"
  :revealed="revealed"
  :can-kick="canKick"
  :card-size="cardSize"
  :active-emoji="activeBubble?.[seat.uid] ?? null"
  :is-thinking="thinking?.[seat.uid] ?? false"
  :thinking-lottie="thinkingLottie ?? null"
  @kick="(uid: string) => emit('kick', uid)"
  @open-emoji-panel="emit('open-emoji-panel')"
  @emoji-bubble-done="(uid: string) => emit('emoji-bubble-done', uid)"
/>
```

Aplicar idêntico no `v-for` do bloco mobile.

- [ ] **Step 2: Verificar type-check**

Run:
```bash
bun run lint:types
```
Expected: PASS.

- [ ] **Step 3: Rodar suite completa**

Run:
```bash
bun run test
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/room/PokerTable.vue
git commit -m "feat(table): propagar thinking + thinkingLottie por seat"
```

---

## Task 8: Integrar tudo em `RoomView.vue`

**Files:**
- Modify: `src/views/RoomView.vue`

- [ ] **Step 1: Instanciar `useThinking` com `suppressOwn` derivado**

Em `src/views/RoomView.vue`, logo após a chamada `useEmojiBroadcast(...)`, adicionar:

```ts
import { useThinking } from '@/composables/useThinking'

// ... dentro do <script setup>, depois de `const emoji = useEmojiBroadcast(...)`:

const suppressOwnThinking = computed(() =>
  emojiPanelOpen.value || !!(uid.value && emoji.activeBubble.value[uid.value]),
)

const thinking = useThinking({
  room: computed(() => room.room.value),
  myUid: uid,
  roomId: computed(() => props.id),
  suppressOwn: suppressOwnThinking,
})
```

- [ ] **Step 2: Encadear eventos de `Hand` no composable e passar `thinking`/`thinkingLottie` para `PokerTable`**

Atualizar o `<template>`:

```vue
<PokerTable
  :seats="room.seats.value"
  :revealed="room.room.value.round.revealed"
  :can-kick="room.isModerator.value"
  :active-bubble="emoji.activeBubble.value"
  :thinking="thinking.thinking.value"
  :thinking-lottie="thinking.thinkingLottie.value"
  @kick="onKick"
  @open-emoji-panel="openEmojiPanel"
  @emoji-bubble-done="emoji.clearBubble"
>
  <template #center>
    <TableCenter
      :is-moderator="room.isModerator.value"
      :revealed="room.room.value.round.revealed"
      :voted-count="room.votedCount.value"
      :total-active="room.totalActive.value"
      :results-open="showResults"
      @reveal="onReveal"
      @reset="onReset"
      @show-results="showResults = true"
    />
  </template>
</PokerTable>

<Hand
  :values="room.room.value.deck.values"
  :selected="room.me.value?.vote ?? null"
  :disabled="room.room.value.round.revealed"
  @select="onPick"
  @area-enter="thinking.onAreaEnter"
  @area-move="thinking.onAreaMove"
  @area-leave="thinking.onAreaLeave"
/>
```

- [ ] **Step 3: Verificar type-check**

Run:
```bash
bun run lint:types
```
Expected: PASS.

- [ ] **Step 4: Rodar suite completa**

Run:
```bash
bun run test
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/RoomView.vue
git commit -m "feat(room): fiar useThinking ao Hand + PokerTable"
```

---

## Task 9: Reforço de regra Firestore

**Files:**
- Modify: `firestore.rules`

Validação: `thinkingUntil`, se presente no novo participant, é Timestamp futuro até 30s à frente. Bloqueia abuso (thinking de horas).

- [ ] **Step 1: Adicionar predicate na função `isSelfUpdatingOwnParticipant`**

Em `firestore.rules`, dentro de `isSelfUpdatingOwnParticipant()`, antes do `return`, adicionar:

```
let newMine = newParticipants[myKey];
let thinkingOk = !('thinkingUntil' in newMine)
  || (newMine.thinkingUntil is timestamp
      && newMine.thinkingUntil > request.time
      && newMine.thinkingUntil < request.time + duration.value(30, 's'));
```

E mudar o `return` para incluir `&& thinkingOk`:

```
return onlyAllowedRoot && onlySelfKeyChanged && stillPresent && !onlyEmojiChanged && thinkingOk;
```

- [ ] **Step 2: Validar sintaxe das rules localmente**

Run:
```bash
bun x firebase emulators:exec --only firestore 'echo OK'
```
Expected: emulador sobe sem erros de parse das rules.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(rules): validar thinkingUntil futuro até 30s à frente"
```

---

## Task 10: Teste de integração `setThinking`/`clearThinking` + rules

**Files:**
- Create: `tests/integration/rooms-thinking.test.ts`

- [ ] **Step 1: Escrever o teste**

Criar `tests/integration/rooms-thinking.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { makeTestEnv } from './_setup'

describe('thinking service + rules', () => {
  it('setThinking grava participants.{uid}.thinkingUntil futuro', async () => {
    const env = await makeTestEnv('thinking-set')
    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: env.app, auth: env.auth, db: env.db }),
    }))
    const { createRoom, setThinking } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')

    const id = await createRoom({
      name: 'r',
      deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'M',
      moderatorUid: env.uid,
    })

    await setThinking(id, env.uid, Date.now() + 5000)
    const snap = await getDoc(doc(env.db, 'rooms', id))
    const data = snap.data()!
    expect(data.participants[env.uid].thinkingUntil).toBeDefined()

    vi.doUnmock('@/services/firebase/index')
    await env.cleanup()
  })

  it('clearThinking remove o campo thinkingUntil', async () => {
    const env = await makeTestEnv('thinking-clear')
    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: env.app, auth: env.auth, db: env.db }),
    }))
    const { createRoom, setThinking, clearThinking } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')

    const id = await createRoom({
      name: 'r',
      deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'M',
      moderatorUid: env.uid,
    })

    await setThinking(id, env.uid, Date.now() + 5000)
    await clearThinking(id, env.uid)
    const snap = await getDoc(doc(env.db, 'rooms', id))
    const data = snap.data()!
    expect(data.participants[env.uid].thinkingUntil).toBeUndefined()

    vi.doUnmock('@/services/firebase/index')
    await env.cleanup()
  })

  it('setVote inclui thinkingUntil: deleteField no mesmo write', async () => {
    const env = await makeTestEnv('thinking-vote-clear')
    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: env.app, auth: env.auth, db: env.db }),
    }))
    const { createRoom, setThinking, setVote } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')

    const id = await createRoom({
      name: 'r',
      deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'M',
      moderatorUid: env.uid,
    })

    await setThinking(id, env.uid, Date.now() + 5000)
    await setVote(id, env.uid, '5')
    const snap = await getDoc(doc(env.db, 'rooms', id))
    const data = snap.data()!
    expect(data.participants[env.uid].vote).toBe('5')
    expect(data.participants[env.uid].thinkingUntil).toBeUndefined()

    vi.doUnmock('@/services/firebase/index')
    await env.cleanup()
  })

  it('rules: thinkingUntil no passado é rejeitado', async () => {
    const env = await makeTestEnv('thinking-past-rejected')
    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: env.app, auth: env.auth, db: env.db }),
    }))
    const { createRoom } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')

    const id = await createRoom({
      name: 'r',
      deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'M',
      moderatorUid: env.uid,
    })

    await expect(
      updateDoc(doc(env.db, 'rooms', id), {
        [`participants.${env.uid}.thinkingUntil`]: Timestamp.fromMillis(Date.now() - 1000),
      }),
    ).rejects.toThrow()

    vi.doUnmock('@/services/firebase/index')
    await env.cleanup()
  })

  it('rules: thinkingUntil mais de 30s à frente é rejeitado', async () => {
    const env = await makeTestEnv('thinking-far-future-rejected')
    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: env.app, auth: env.auth, db: env.db }),
    }))
    const { createRoom } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')

    const id = await createRoom({
      name: 'r',
      deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'M',
      moderatorUid: env.uid,
    })

    await expect(
      updateDoc(doc(env.db, 'rooms', id), {
        [`participants.${env.uid}.thinkingUntil`]: Timestamp.fromMillis(Date.now() + 60_000),
      }),
    ).rejects.toThrow()

    vi.doUnmock('@/services/firebase/index')
    await env.cleanup()
  })
})
```

- [ ] **Step 2: Rodar a suíte de integração**

Run:
```bash
bun run test:integration
```
Expected: PASS em todos os novos testes + os existentes.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/rooms-thinking.test.ts
git commit -m "test(integration): setThinking/clearThinking + reforço de rules"
```

---

## Task 11: Smoke manual + atualizar README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Subir dev server e validar visualmente**

Run:
```bash
bun run dev
```
Abrir em duas abas (uma como moderador, outra como participante). Verificar:
- Participante: passar mouse na área das cartas por >1s → moderador vê 🤔 no lugar da inicial daquela pessoa.
- Tirar mouse: emoji permanece ~4s e desaparece.
- Votar: emoji some imediatamente para todos.
- Revelar rodada: emoji some imediatamente em todos os assentos.
- Em mobile (DevTools mode mobile): scroll/foco na hand-rail ativa o thinking.

- [ ] **Step 2: Atualizar README**

Em `README.md`, na seção de features, adicionar item:

```md
- Indicador de "pensando": quando um participante hesita sobre as cartas, os outros veem um 🤔 animado no lugar da inicial dele na mesa.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: nota do indicador de pensando"
```

---

## Self-Review (autor do plano)

Coberturas vs. spec:

- **Start trigger ≥1s** → Task 4 (test: "area-enter por menos de 1s NÃO escreve" + "≥1s escreve ≈ now + 5s").
- **Janela pós-leave 4s** → Task 4 (test: "area-leave após active escreve 1 vez com janela de 4s") + Task 2 (writeUntil delta = LEAVE_GRACE_MS).
- **Heartbeat 3s + idle-stop 1.5s** → Task 4 (testes "heartbeat" + "idle-detector").
- **Voto limpa via deleteField** → Task 2 (setVote estendido) + Task 10 (integration: vote-clear).
- **Revelação para state machine + clearThinking** → Task 4 (test "round.revealed=true emite clearThinking").
- **Receptor filtra revealed** → Task 3 (test "round.revealed=true, ninguém aparece pensando").
- **suppressOwn (próprio uid)** → Task 3 (test "suppressOwn=true esconde só o próprio uid") + Task 4 (test "suppressOwn=true ignora onAreaEnter").
- **Visual: troca só a letra, mantém círculo + coroa** → Task 5 (3 testes: thinking, sem thinking, com moderador).
- **Mobile: scroll/foco ativa** → Task 6 (`@scroll.passive` + `@focusin/@focusout` em Hand.vue).
- **Reforço de rules** → Task 9 + Task 10 (dois testes negativos: passado e >30s).
- **Lottie compartilhado uma vez** → Task 3 (watchEffect com guarda `if (thinkingLottie.value) return`).

Placeholder scan: nenhum `TBD`, `TODO` ou "implement later". Todos os steps contêm o código real a ser usado.

Tipos consistentes:
- `setThinking(roomId, uid, untilMs: number)` em Task 2 ↔ chamada em Task 4 (`setThinkingSvc(opts.roomId.value, myUid, Date.now() + deltaMs)`).
- `clearThinking(roomId, uid)` em Task 2 ↔ chamada em Task 4.
- Props `isThinking` + `thinkingLottie` declaradas em Task 5 ↔ passadas em Task 7 ↔ originadas em Task 8.
- Eventos `area-enter/move/leave` declarados em Task 6 ↔ ouvidos em Task 8.

Nenhum gap identificado.
