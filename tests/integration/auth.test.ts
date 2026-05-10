import { describe, it, expect } from 'vitest'
import { makeTestEnv } from './_setup'

describe('Firebase Auth Anônimo (emulator)', () => {
  it('cria um usuário anônimo com UID estável dentro da sessão', async () => {
    const env = await makeTestEnv('auth-1')
    expect(env.uid).toBeTruthy()
    expect(env.auth.currentUser?.uid).toBe(env.uid)
    await env.cleanup()
  })

  it('dois envs criam UIDs distintos', async () => {
    const a = await makeTestEnv('auth-2a')
    const b = await makeTestEnv('auth-2b')
    expect(a.uid).not.toBe(b.uid)
    await a.cleanup()
    await b.cleanup()
  })
})
