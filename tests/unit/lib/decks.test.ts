import { describe, it, expect } from 'vitest'
import { buildDeck, pickPreview, DECK_PRESETS } from '@/lib/decks'
import { i18n } from '@/i18n'

describe('DECK_PRESETS', () => {
  it('contém os 7 presets esperados (Horas é editável, fora dos presets)', () => {
    const types = DECK_PRESETS.map(p => p.type)
    expect(types).toEqual([
      'fibonacci',
      'fibonacci-modified',
      'tshirt',
      'powers-of-2',
      'sequential',
      'risk',
      'yes-no',
    ])
  })

  it('todo preset tem labelKey, descKey e pelo menos 2 valores', () => {
    for (const p of DECK_PRESETS) {
      expect(p.labelKey.length).toBeGreaterThan(0)
      expect(p.descKey.length).toBeGreaterThan(0)
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
      .toThrow(i18n.global.t('decks.errors.needTwoValues'))
  })

  it('rejeita custom com 1 valor', () => {
    expect(() => buildDeck({ type: 'custom', customValues: ['7'] }))
      .toThrow(i18n.global.t('decks.errors.needTwoValues'))
  })
})

describe('buildDeck — horas', () => {
  it('converte minutos em rótulos preservando a ordem', () => {
    const deck = buildDeck({ type: 'hours', customValues: ['15', '60', '90'] })
    expect(deck.type).toBe('hours')
    expect(deck.values).toEqual(['15m', '1:00', '1:30'])
  })

  it('deduplica rótulos preservando a primeira ocorrência', () => {
    const deck = buildDeck({ type: 'hours', customValues: ['60', '60', '15'] })
    expect(deck.values).toEqual(['1:00', '15m'])
  })

  it('faz trim e ignora vazios', () => {
    const deck = buildDeck({ type: 'hours', customValues: [' 15 ', '', '60', ' '] })
    expect(deck.values).toEqual(['15m', '1:00'])
  })

  it('rejeita tokens não-numéricos', () => {
    expect(() => buildDeck({ type: 'hours', customValues: ['15', '15m'] }))
      .toThrow(i18n.global.t('decks.errors.invalidHoursValues'))
  })

  it('rejeita menos de 2 rótulos únicos', () => {
    expect(() => buildDeck({ type: 'hours', customValues: ['60', '60'] }))
      .toThrow(i18n.global.t('decks.errors.needTwoValues'))
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

  it('retorna todos os valores quando há apenas 2 não-filtrados', () => {
    const result = pickPreview(['1', '2', '?'])
    expect(result).toEqual(['1', '2'])
  })

  it('retorna array vazio se input só tiver ? e ☕', () => {
    expect(pickPreview(['?', '☕'])).toEqual([])
  })
})
