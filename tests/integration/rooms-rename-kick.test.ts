import { describe, it, expect, vi } from 'vitest'
import { doc, getDoc } from 'firebase/firestore'
import { makeTestEnv } from './_setup'

describe('renameTask + kickParticipant', () => {
  it('moderador renomeia e expulsa convidado', async () => {
    const mod = await makeTestEnv('rk-mod')
    const guest = await makeTestEnv('rk-guest')

    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: mod.app, auth: mod.auth, db: mod.db }),
    }))
    const { createRoom, renameTask, kickParticipant } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')

    const id = await createRoom({
      name: 'r', deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'M', moderatorUid: mod.uid,
    })
    vi.doUnmock('@/services/firebase/index')

    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: guest.app, auth: guest.auth, db: guest.db }),
    }))
    const { joinRoom } = await import('@/services/firebase/rooms')
    await joinRoom(id, guest.uid, 'Convidado')
    vi.doUnmock('@/services/firebase/index')

    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: mod.app, auth: mod.auth, db: mod.db }),
    }))
    const rooms = await import('@/services/firebase/rooms')
    await rooms.renameTask(id, 'Login API')
    await rooms.kickParticipant(id, guest.uid)
    vi.doUnmock('@/services/firebase/index')

    const snap = await getDoc(doc(mod.db, 'rooms', id))
    expect(snap.data()!.round.taskTitle).toBe('Login API')
    expect(snap.data()!.participants[guest.uid]).toBeUndefined()

    await mod.cleanup()
    await guest.cleanup()
  })
})
