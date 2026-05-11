import { describe, it, expect, beforeEach, vi } from 'vitest'
import { toCodepointSequence, tryLoadLottie, _resetCache } from '@/lib/notoEmoji'

describe('toCodepointSequence', () => {
  it('emoji simples', () => {
    expect(toCodepointSequence('🎉')).toBe('1f389')
  })
  it('emoji com variation selector é normalizado (sem fe0f)', () => {
    expect(toCodepointSequence('❤️')).toBe('2764')
  })
  it('emoji ZWJ sequence', () => {
    expect(toCodepointSequence('👨‍💻')).toBe('1f468-200d-1f4bb')
  })
})

describe('tryLoadLottie', () => {
  beforeEach(() => { _resetCache() })

  it('retorna JSON em 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ v: '5.5', layers: [] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const res = await tryLoadLottie('🎉')
    expect(res).toEqual({ v: '5.5', layers: [] })
  })

  it('retorna null em 404 e cacheia como unavailable', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    vi.stubGlobal('fetch', fetchMock)
    const a = await tryLoadLottie('🎉')
    const b = await tryLoadLottie('🎉')
    expect(a).toBeNull()
    expect(b).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retorna null em erro de rede', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))
    const res = await tryLoadLottie('🎉')
    expect(res).toBeNull()
  })
})
