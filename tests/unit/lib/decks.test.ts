import { describe, it, expect } from 'vitest'
import { buildDeck, pickPreview, DECK_PRESETS } from '@/lib/decks'

describe('DECK_PRESETS', () => {
  it('contém os 8 presets esperados', () => {
    const types = DECK_PRESETS.map(p => p.type)
    expect(types).toEqual([
      'fibonacci',
      'fibonacci-modified',
      'tshirt',
      'powers-of-2',
      'sequential',
      'hours',
      'risk',
      'yes-no',
    ])
  })

  it('todo preset tem label, description e pelo menos 2 valores', () => {
    for (const p of DECK_PRESETS) {
      expect(p.label.length).toBeGreaterThan(0)
      expect(p.description.length).toBeGreaterThan(0)
      expect(p.values.length).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('buildDeck — presets', () => {
  it('Fibonacci retorna sequência canônica', () => {
    const deck = buildDeck({ type: 'fibonacci' })
    expect(deck.type).toBe('fibonacci')
    expect(deck.values).toEqual(['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'])
  })

  it('Fibonacci modificado inclui ½ e 100', () => {
    const deck = buildDeck({ type: 'fibonacci-modified' })
    expect(deck.values).toContain('½')
    expect(deck.values).toContain('100')
  })

  it('T-shirt retorna XS a XXL com ? e ☕', () => {
    const deck = buildDeck({ type: 'tshirt' })
    expect(deck.values).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'])
  })

  it('Potências de 2 vai de 1 a 64', () => {
    const deck = buildDeck({ type: 'powers-of-2' })
    expect(deck.values).toEqual(['1', '2', '4', '8', '16', '32', '64', '?', '☕'])
  })

  it('Sequencial vai de 1 a 10', () => {
    const deck = buildDeck({ type: 'sequential' })
    expect(deck.values).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?', '☕'])
  })

  it('Horas inclui ½h e 16h', () => {
    const deck = buildDeck({ type: 'hours' })
    expect(deck.values).toEqual(['½h', '1h', '2h', '4h', '8h', '16h', '?', '☕'])
  })

  it('Risco vai de Baixo a Crítico', () => {
    const deck = buildDeck({ type: 'risk' })
    expect(deck.values).toEqual(['Baixo', 'Médio', 'Alto', 'Crítico', '?'])
  })

  it('Sim/Não retorna apenas Sim, Não, ?', () => {
    const deck = buildDeck({ type: 'yes-no' })
    expect(deck.values).toEqual(['Sim', 'Não', '?'])
  })

  it('retorna cópia (não a referência interna)', () => {
    const a = buildDeck({ type: 'fibonacci' })
    const b = buildDeck({ type: 'fibonacci' })
    expect(a.values).not.toBe(b.values)
    a.values.push('mutated')
    expect(b.values).not.toContain('mutated')
  })
})

describe('buildDeck — custom', () => {
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

describe('pickPreview', () => {
  it('filtra ? e ☕', () => {
    expect(pickPreview(['1', '2', '?', '☕'])).toEqual(['1', '2'])
  })

  it('retorna todos se houver ≤ 4 não-filtrados', () => {
    expect(pickPreview(['Sim', 'Não', '?'])).toEqual(['Sim', 'Não'])
    expect(pickPreview(['Baixo', 'Médio', 'Alto', 'Crítico', '?'])).toEqual(['Baixo', 'Médio', 'Alto', 'Crítico'])
  })

  it('retorna 4 amostras do miolo quando há > 4', () => {
    const result = pickPreview(['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'])
    expect(result).toHaveLength(4)
    // 8 valores não-filtrados → índices ~[1, 3, 4, 6] → ['1', '3', '5', '13']
    expect(result).toEqual(['1', '3', '5', '13'])
  })

  it('deduplica se a amostragem cair em índices duplicados', () => {
    const result = pickPreview(['1', '2', '?'])
    // só 2 não-filtrados, retorna todos sem duplicar
    expect(result).toEqual(['1', '2'])
  })

  it('retorna array vazio se input só tiver ? e ☕', () => {
    expect(pickPreview(['?', '☕'])).toEqual([])
  })
})
