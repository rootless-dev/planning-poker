import { describe, it, expect, vi } from 'vitest'
import { doc, getDoc } from 'firebase/firestore'
import { makeTestEnv } from './_setup'

describe('createRoom', () => {
  it('escreve o documento com participantes contendo o moderador', async () => {
    const env = await makeTestEnv('rooms-create')
    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: env.app, auth: env.auth, db: env.db }),
    }))
    const { createRoom } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')

    const id = await createRoom({
      name: 'Sprint 1',
      deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'Carlos',
      moderatorUid: env.uid,
    })

    expect(id).toMatch(/^[0-9a-fA-F-]{36}$/)
    const snap = await getDoc(doc(env.db, 'rooms', id))
    expect(snap.exists()).toBe(true)
    const data = snap.data()!
    expect(data.moderatorUid).toBe(env.uid)
    expect(data.deck.type).toBe('fibonacci')
    expect(data.participants[env.uid].name).toBe('Carlos')
    expect(data.participants[env.uid].hasVoted).toBe(false)
    expect(data.participants[env.uid].vote).toBeUndefined()
    expect(data.round.revealed).toBe(false)

    vi.doUnmock('@/services/firebase/index')
    await env.cleanup()
  })
})
