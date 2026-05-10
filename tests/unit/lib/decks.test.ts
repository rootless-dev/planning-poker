import { describe, it, expect } from 'vitest'
import { buildDeck, FIBONACCI, TSHIRT } from '@/lib/decks'

describe('buildDeck', () => {
  it('retorna a sequência Fibonacci canônica', () => {
    const deck = buildDeck({ type: 'fibonacci' })
    expect(deck.type).toBe('fibonacci')
    expect(deck.values).toEqual(FIBONACCI)
  })

  it('retorna a sequência T-shirt canônica', () => {
    const deck = buildDeck({ type: 'tshirt' })
    expect(deck.values).toEqual(TSHIRT)
  })

  it('aceita valores customizados, removendo duplicatas e vazios', () => {
    const deck = buildDeck({
      type: 'custom',
      customValues: ['1', '2', '2', '', '3', ' ', ' 5 '],
    })
    expect(deck.type).toBe('custom')
    expect(deck.values).toEqual(['1', '2', '3', '5'])
  })

  it('rejeita custom vazio', () => {
    expect(() => buildDeck({ type: 'custom', customValues: ['', ' '] }))
      .toThrow(/precisa de ao menos 2 valores/i)
  })

  it('rejeita custom com 1 valor', () => {
    expect(() => buildDeck({ type: 'custom', customValues: ['7'] }))
      .toThrow(/precisa de ao menos 2 valores/i)
  })
})
