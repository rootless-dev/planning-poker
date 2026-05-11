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
