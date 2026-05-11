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
