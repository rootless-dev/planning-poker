import { describe, it, expect, vi } from 'vitest'
import { doc, getDoc } from 'firebase/firestore'
import { makeTestEnv } from './_setup'

describe('reveal + new round', () => {
  it('reveal flipa flag; nova rodada zera votos e apaga subcoleção', async () => {
    const mod = await makeTestEnv('rr-mod')
    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: mod.app, auth: mod.auth, db: mod.db }),
    }))
    const { createRoom, setVote, revealRound, startNewRound } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')

    const id = await createRoom({
      name: 'r', deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'M', moderatorUid: mod.uid,
    })
    await setVote(id, mod.uid, '8')
    await revealRound(id)

    let snap = await getDoc(doc(mod.db, 'rooms', id))
    expect(snap.data()!.round.revealed).toBe(true)
    expect(snap.data()!.participants[mod.uid].hasVoted).toBe(true)
    let voteSnap = await getDoc(doc(mod.db, 'rooms', id, 'votes', mod.uid))
    expect(voteSnap.data()!.value).toBe('8')

    await startNewRound(id, [mod.uid], 'OAuth')
    snap = await getDoc(doc(mod.db, 'rooms', id))
    expect(snap.data()!.round.revealed).toBe(false)
    expect(snap.data()!.round.taskTitle).toBe('OAuth')
    expect(snap.data()!.participants[mod.uid].hasVoted).toBe(false)
    voteSnap = await getDoc(doc(mod.db, 'rooms', id, 'votes', mod.uid))
    expect(voteSnap.exists()).toBe(false)

    vi.doUnmock('@/services/firebase/index')
    await mod.cleanup()
  })
})
