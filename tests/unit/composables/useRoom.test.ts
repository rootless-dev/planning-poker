import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { Timestamp } from 'firebase/firestore'
import { useRoom } from '@/composables/useRoom'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'

vi.mock('@/services/firebase/rooms', () => ({
  subscribeToRoom: vi.fn(),
  joinRoom: vi.fn(),
  heartbeat: vi.fn(),
}))

function ts(secAgo: number) {
  return Timestamp.fromMillis(Date.now() - secAgo * 1000)
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useRoom derived state', () => {
  it('isModerator true quando uid == moderatorUid', () => {
    const auth = useAuthStore()
    auth.user = { uid: 'mod-1' } as never
    const room = useRoomStore()
    room.room = {
      id: 'r', name: 'n', createdAt: ts(0), lastActivityAt: ts(0), expiresAt: ts(0),
      moderatorUid: 'mod-1',
      deck: { type: 'fibonacci', values: [] },
      round: { taskTitle: '', revealed: false, startedAt: ts(0) },
      participants: { 'mod-1': { name: 'M', vote: null, lastSeenAt: ts(0), joinedAt: ts(0) } },
    }
    const r = useRoom()
    expect(r.isModerator.value).toBe(true)
    expect(r.inRoom.value).toBe(true)
  })

  it('votedCount ignora offline (>=90s)', () => {
    const auth = useAuthStore()
    auth.user = { uid: 'a' } as never
    const room = useRoomStore()
    room.room = {
      id: 'r', name: 'n', createdAt: ts(0), lastActivityAt: ts(0), expiresAt: ts(0),
      moderatorUid: 'a',
      deck: { type: 'fibonacci', values: [] },
      round: { taskTitle: '', revealed: false, startedAt: ts(0) },
      participants: {
        a: { name: 'A', vote: '5', lastSeenAt: ts(2), joinedAt: ts(0) },
        b: { name: 'B', vote: '3', lastSeenAt: ts(120), joinedAt: ts(0) },
        c: { name: 'C', vote: null, lastSeenAt: ts(2), joinedAt: ts(0) },
      },
    }
    const r = useRoom()
    expect(r.votedCount.value).toBe(1)
    expect(r.totalActive.value).toBe(2)
  })
})
