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
    vi.resetModules()
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
    vi.resetModules()
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
    vi.resetModules()
    const mod = await makeTestEnv('thinking-past-mod')
    const participant = await makeTestEnv('thinking-past-part')
    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: mod.app, auth: mod.auth, db: mod.db }),
    }))
    const { createRoom, joinRoom } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')

    const id = await createRoom({
      name: 'r',
      deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'M',
      moderatorUid: mod.uid,
    })
    vi.doUnmock('@/services/firebase/index')

    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: participant.app, auth: participant.auth, db: participant.db }),
    }))
    const { joinRoom: joinRoom2 } = await import('@/services/firebase/rooms')
    await joinRoom2(id, participant.uid, 'P')
    vi.doUnmock('@/services/firebase/index')

    // Participant (non-moderator) tries to set thinkingUntil in the past — must be rejected
    await expect(
      updateDoc(doc(participant.db, 'rooms', id), {
        [`participants.${participant.uid}.thinkingUntil`]: Timestamp.fromMillis(Date.now() - 1000),
      }),
    ).rejects.toThrow()

    await mod.cleanup()
    await participant.cleanup()
  })

  it('rules: thinkingUntil mais de 30s à frente é rejeitado', async () => {
    vi.resetModules()
    const mod = await makeTestEnv('thinking-future-mod')
    const participant = await makeTestEnv('thinking-future-part')
    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: mod.app, auth: mod.auth, db: mod.db }),
    }))
    const { createRoom } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')

    const id = await createRoom({
      name: 'r',
      deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'M',
      moderatorUid: mod.uid,
    })
    vi.doUnmock('@/services/firebase/index')

    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: participant.app, auth: participant.auth, db: participant.db }),
    }))
    const { joinRoom: joinRoom2 } = await import('@/services/firebase/rooms')
    await joinRoom2(id, participant.uid, 'P')
    vi.doUnmock('@/services/firebase/index')

    // Participant (non-moderator) tries to set thinkingUntil 60s ahead — must be rejected
    await expect(
      updateDoc(doc(participant.db, 'rooms', id), {
        [`participants.${participant.uid}.thinkingUntil`]: Timestamp.fromMillis(Date.now() + 60_000),
      }),
    ).rejects.toThrow()

    await mod.cleanup()
    await participant.cleanup()
  })
})
