import { describe, it, expect, vi } from 'vitest'
import { doc, getDoc } from 'firebase/firestore'
import { makeTestEnv } from './_setup'

describe('joinRoom', () => {
  it('adiciona um novo participante ao map', async () => {
    const mod = await makeTestEnv('join-mod')
    const guest = await makeTestEnv('join-guest')

    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: mod.app, auth: mod.auth, db: mod.db }),
    }))
    const { createRoom } = await import('@/services/firebase/rooms')
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

    const snap = await getDoc(doc(mod.db, 'rooms', id))
    const data = snap.data()!
    expect(Object.keys(data.participants)).toHaveLength(2)
    expect(data.participants[guest.uid].name).toBe('Convidado')

    vi.doUnmock('@/services/firebase/index')
    await mod.cleanup()
    await guest.cleanup()
  })
})
