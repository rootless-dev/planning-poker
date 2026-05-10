import { describe, it, expect, vi } from 'vitest'
import { doc, getDoc } from 'firebase/firestore'
import { makeTestEnv } from './_setup'

describe('setVote', () => {
  it('atualiza apenas o nó do próprio uid', async () => {
    const mod = await makeTestEnv('vote-mod')
    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: mod.app, auth: mod.auth, db: mod.db }),
    }))
    const { createRoom, setVote } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')
    const id = await createRoom({
      name: 'r', deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'M', moderatorUid: mod.uid,
    })

    await setVote(id, mod.uid, '5')
    const snap = await getDoc(doc(mod.db, 'rooms', id))
    expect(snap.data()!.participants[mod.uid].vote).toBe('5')

    vi.doUnmock('@/services/firebase/index')
    await mod.cleanup()
  })
})
