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
