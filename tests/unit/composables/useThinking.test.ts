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
  parts: Record<string, { thinkingUntil?: Timestamp; vote?: string | null }>,
  revealed = false,
): Room {
  const baseParts: Room['participants'] = {}
  for (const [uid, p] of Object.entries(parts)) {
    baseParts[uid] = {
      name: uid,
      vote: p.vote !== undefined ? p.vote : null,
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

  it('movement após idle-active retoma heartbeats', async () => {
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
    vi.advanceTimersByTime(2000) // sem move -> idle-active (idle-stop em 1.5s)
    const baselineCalls = (setThinking as ReturnType<typeof vi.fn>).mock.calls.length
    t.onAreaMove() // retoma -> active (novo write + reinicia heartbeat)
    vi.advanceTimersByTime(4000)
    t.onAreaMove()
    vi.advanceTimersByTime(1) // permite heartbeats agendados rodarem
    const afterCalls = (setThinking as ReturnType<typeof vi.fn>).mock.calls.length
    expect(afterCalls).toBeGreaterThan(baselineCalls)
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
