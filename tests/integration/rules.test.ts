import { describe, it, beforeAll, afterAll } from 'vitest'
import { initializeTestEnvironment, type RulesTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { doc, setDoc, updateDoc, deleteDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore'

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

function baseRoom(modUid: string, otherUid?: string, revealed = false) {
  const now = Timestamp.now()
  const participants: Record<string, unknown> = {
    [modUid]: { name: 'Mod', hasVoted: false, lastSeenAt: now, joinedAt: now },
  }
  if (otherUid) participants[otherUid] = { name: 'Other', hasVoted: false, lastSeenAt: now, joinedAt: now }
  return {
    id: 'r1',
    name: 'Sala',
    createdAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(now.toMillis() + 86_400_000),
    moderatorUid: modUid,
    deck: { type: 'fibonacci', values: ['1', '2', '3'] },
    round: { taskTitle: '', revealed, startedAt: now },
    participants,
  }
}

describe('firestore.rules — room doc', () => {
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

  it('participante pode atualizar próprio nó (hasVoted/lastSeenAt)', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'r4'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('alice')
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'rooms', 'r4'), {
      'participants.alice.hasVoted': true,
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
      'participants.mod.hasVoted': true,
    }))
  })

  it('participante NÃO pode gravar campo `vote` em texto puro dentro do próprio nó', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rNoPlainVote'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('alice')
    await assertFails(updateDoc(doc(ctx.firestore(), 'rooms', 'rNoPlainVote'), {
      'participants.alice.vote': '8',
      lastActivityAt: serverTimestamp(),
    }))
  })

  it('participante novo pode entrar (join) adicionando próprio nó', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rJoin'), baseRoom('mod'))
    })
    const ctx = env.authenticatedContext('bob')
    const now = Timestamp.now()
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'rooms', 'rJoin'), {
      'participants.bob': { name: 'Bob', hasVoted: false, lastSeenAt: now, joinedAt: now },
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
          mod: { name: 'Mod', hasVoted: false, lastSeenAt: past, joinedAt: past },
          alice: { name: 'Alice', hasVoted: false, lastSeenAt: past, joinedAt: past,
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

describe('firestore.rules — votes subcollection (sigilo pré-reveal)', () => {
  it('dono escreve próprio voto pré-reveal e consegue lê-lo', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rV1'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('alice')
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'rooms', 'rV1', 'votes', 'alice'), {
      value: '8', updatedAt: serverTimestamp(),
    }))
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'rooms', 'rV1', 'votes', 'alice')))
  })

  it('alice NÃO pode ler o voto do bob pré-reveal', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rV2'), baseRoom('mod', 'bob'))
      await setDoc(doc(admin.firestore(), 'rooms', 'rV2', 'votes', 'bob'), {
        value: '5', updatedAt: Timestamp.now(),
      })
    })
    const aliceCtx = env.authenticatedContext('alice')
    await assertFails(getDoc(doc(aliceCtx.firestore(), 'rooms', 'rV2', 'votes', 'bob')))
  })

  it('alice PODE ler o voto do bob pós-reveal', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rV3'), baseRoom('mod', 'bob', true))
      await setDoc(doc(admin.firestore(), 'rooms', 'rV3', 'votes', 'bob'), {
        value: '5', updatedAt: Timestamp.now(),
      })
    })
    const aliceCtx = env.authenticatedContext('alice')
    await assertSucceeds(getDoc(doc(aliceCtx.firestore(), 'rooms', 'rV3', 'votes', 'bob')))
  })

  it('alice NÃO pode escrever no documento de voto do bob', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rV4'), baseRoom('mod', 'bob'))
    })
    const aliceCtx = env.authenticatedContext('alice')
    await assertFails(setDoc(doc(aliceCtx.firestore(), 'rooms', 'rV4', 'votes', 'bob'), {
      value: '13', updatedAt: serverTimestamp(),
    }))
  })

  it('escrita de voto pós-reveal é bloqueada (round congelado)', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rV5'), baseRoom('mod', 'alice', true))
    })
    const aliceCtx = env.authenticatedContext('alice')
    await assertFails(setDoc(doc(aliceCtx.firestore(), 'rooms', 'rV5', 'votes', 'alice'), {
      value: '8', updatedAt: serverTimestamp(),
    }))
  })

  it('rejeita value > 64 bytes', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rV6'), baseRoom('mod', 'alice'))
    })
    const aliceCtx = env.authenticatedContext('alice')
    await assertFails(setDoc(doc(aliceCtx.firestore(), 'rooms', 'rV6', 'votes', 'alice'), {
      value: 'x'.repeat(65), updatedAt: serverTimestamp(),
    }))
  })

  it('rejeita campos fora do schema (extra key)', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rV7'), baseRoom('mod', 'alice'))
    })
    const aliceCtx = env.authenticatedContext('alice')
    await assertFails(setDoc(doc(aliceCtx.firestore(), 'rooms', 'rV7', 'votes', 'alice'), {
      value: '8', updatedAt: serverTimestamp(), spoof: '<script>',
    }))
  })

  it('moderador pode deletar voto de qualquer participante (reset)', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rV8'), baseRoom('mod', 'bob'))
      await setDoc(doc(admin.firestore(), 'rooms', 'rV8', 'votes', 'bob'), {
        value: '5', updatedAt: Timestamp.now(),
      })
    })
    const modCtx = env.authenticatedContext('mod')
    await assertSucceeds(deleteDoc(doc(modCtx.firestore(), 'rooms', 'rV8', 'votes', 'bob')))
  })

  it('participante comum NÃO pode deletar voto de outro', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'rV9'), baseRoom('mod', 'bob'))
      await setDoc(doc(admin.firestore(), 'rooms', 'rV9', 'votes', 'bob'), {
        value: '5', updatedAt: Timestamp.now(),
      })
    })
    const aliceCtx = env.authenticatedContext('alice')
    await assertFails(deleteDoc(doc(aliceCtx.firestore(), 'rooms', 'rV9', 'votes', 'bob')))
  })
})
