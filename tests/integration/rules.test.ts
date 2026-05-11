import { describe, it, beforeAll, afterAll } from 'vitest'
import { initializeTestEnvironment, type RulesTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { doc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'planning-poker-rules',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  })
})

afterAll(async () => { await env.cleanup() })

function baseRoom(modUid: string, otherUid?: string) {
  const now = Timestamp.now()
  const participants: Record<string, unknown> = {
    [modUid]: { name: 'Mod', vote: null, lastSeenAt: now, joinedAt: now },
  }
  if (otherUid) participants[otherUid] = { name: 'Other', vote: null, lastSeenAt: now, joinedAt: now }
  return {
    id: 'r1',
    name: 'Sala',
    createdAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(now.toMillis() + 86_400_000),
    moderatorUid: modUid,
    deck: { type: 'fibonacci', values: ['1', '2', '3'] },
    round: { taskTitle: '', revealed: false, startedAt: now },
    participants,
  }
}

describe('firestore.rules', () => {
  it('proíbe escrita sem auth', async () => {
    const ctx = env.unauthenticatedContext()
    const room = baseRoom('mod')
    room.id = 'rUnauth'
    await assertFails(setDoc(doc(ctx.firestore(), 'rooms', 'rUnauth'), room))
  })

  it('permite criar sala onde uid == moderatorUid', async () => {
    const ctx = env.authenticatedContext('mod')
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'rooms', 'r1'), baseRoom('mod')))
  })

  it('proíbe criar sala forjando outro moderatorUid', async () => {
    const ctx = env.authenticatedContext('alice')
    const room = baseRoom('bob')
    room.id = 'rForge'
    await assertFails(setDoc(doc(ctx.firestore(), 'rooms', 'rForge'), room))
  })

  it('moderador pode setar round.revealed=true', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'r2'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('mod')
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'rooms', 'r2'), { 'round.revealed': true, lastActivityAt: serverTimestamp() }))
  })

  it('participante NÃO pode setar round.revealed', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'r3'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('alice')
    await assertFails(updateDoc(doc(ctx.firestore(), 'rooms', 'r3'), { 'round.revealed': true }))
  })

  it('participante pode atualizar próprio nó (vote/lastSeenAt)', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'r4'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('alice')
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'rooms', 'r4'), {
      'participants.alice.vote': '5',
      'participants.alice.lastSeenAt': serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    }))
  })

  it('participante NÃO pode mexer no nó de outro', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'r5'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('alice')
    await assertFails(updateDoc(doc(ctx.firestore(), 'rooms', 'r5'), {
      'participants.mod.vote': '5',
    }))
  })

  it('participante novo pode entrar (join) adicionando próprio nó', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rJoin'), baseRoom('mod'))
    })
    const ctx = env.authenticatedContext('bob')
    const now = Timestamp.now()
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'rooms', 'rJoin'), {
      'participants.bob': { name: 'Bob', vote: null, lastSeenAt: now, joinedAt: now },
      lastActivityAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000),
    }))
  })

  it('participante pode escrever próprio lastEmoji', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rE1'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('alice')
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'rooms', 'rE1'), {
      'participants.alice.lastEmoji': { value: '🎉', sentAt: serverTimestamp() },
      lastActivityAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000),
    }))
  })

  it('participante NÃO pode escrever lastEmoji em outro uid', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rE2'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('alice')
    await assertFails(updateDoc(doc(ctx.firestore(), 'rooms', 'rE2'), {
      'participants.mod.lastEmoji': { value: '🎉', sentAt: serverTimestamp() },
    }))
  })

  it('rejeita lastEmoji com value > 64 bytes', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rE3'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('alice')
    await assertFails(updateDoc(doc(ctx.firestore(), 'rooms', 'rE3'), {
      'participants.alice.lastEmoji': { value: 'x'.repeat(65), sentAt: serverTimestamp() },
      lastActivityAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000),
    }))
  })

  it('aceita lastEmoji com emoji de família (multi-codepoint)', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rE5'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('alice')
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'rooms', 'rE5'), {
      'participants.alice.lastEmoji': { value: '👨‍👩‍👦', sentAt: serverTimestamp() },
      lastActivityAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000),
    }))
  })

  it('rejeita segundo lastEmoji dentro do cooldown de 2s', async () => {
    const past = Timestamp.fromMillis(Date.now() - 500) // 0.5s atrás
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rE4'), {
        ...baseRoom('mod', 'alice'),
        participants: {
          mod: { name: 'Mod', vote: null, lastSeenAt: past, joinedAt: past },
          alice: { name: 'Alice', vote: null, lastSeenAt: past, joinedAt: past,
                   lastEmoji: { value: '🎉', sentAt: past } },
        },
      })
    })
    const ctx = env.authenticatedContext('alice')
    await assertFails(updateDoc(doc(ctx.firestore(), 'rooms', 'rE4'), {
      'participants.alice.lastEmoji': { value: '🔥', sentAt: serverTimestamp() },
      lastActivityAt: serverTimestamp(),
    }))
  })
})
