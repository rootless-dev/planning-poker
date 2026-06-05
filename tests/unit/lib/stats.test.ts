import { describe, it, expect } from 'vitest'
import { computeStats } from '@/lib/stats'

describe('computeStats', () => {
  it('ignora não-numéricos no cálculo', () => {
    const r = computeStats(['1', '3', '5', '?', '☕'])
    expect(r.numericCount).toBe(3)
    expect(r.average).toBe(3)
    expect(r.min).toBe(1)
    expect(r.max).toBe(5)
  })

  it('calcula moda na string original (mantém T-shirt sizes)', () => {
    const r = computeStats(['M', 'M', 'L', '?'])
    expect(r.mode).toBe('M')
    expect(r.numericCount).toBe(0)
    expect(r.average).toBeNull()
  })

  it('moda numérica volta como string', () => {
    const r = computeStats(['5', '5', '8'])
    expect(r.mode).toBe('5')
  })

  it('lista vazia retorna zeros', () => {
    const r = computeStats([])
    expect(r).toEqual({
      numericCount: 0,
      average: null,
      mode: null,
      min: null,
      max: null,
      divergent: false,
    })
  })

  it('marca divergent quando max - min > 5 (boundary inclusivo no 5)', () => {
    expect(computeStats(['3', '8']).divergent).toBe(false)   // diff=5 → não divergente
    expect(computeStats(['2', '8']).divergent).toBe(true)    // diff=6 → divergente
    expect(computeStats(['1', '8']).divergent).toBe(true)
    expect(computeStats(['3', '5', '8']).divergent).toBe(false)
    expect(computeStats(['1', '13']).divergent).toBe(true)
  })

  it('moda escolhe o primeiro empate na ordem do input', () => {
    const r = computeStats(['3', '5', '3', '5'])
    expect(r.mode).toBe('3')
  })
})

describe('computeStats — modo horas', () => {
  it('parseia rótulos e calcula em minutos', () => {
    const r = computeStats(['15m', '1:00', '1:30'], 'hours')
    expect(r.numericCount).toBe(3)
    expect(r.average).toBe(55) // (15 + 60 + 90) / 3
    expect(r.min).toBe(15)
    expect(r.max).toBe(90)
  })

  it('ignora rótulos não-parseáveis', () => {
    const r = computeStats(['1:00', '?'], 'hours')
    expect(r.numericCount).toBe(1)
    expect(r.average).toBe(60)
  })

  it('divergência usa limiar de 60 min', () => {
    expect(computeStats(['1:00', '2:00'], 'hours').divergent).toBe(false) // diff 60
    expect(computeStats(['1:00', '2:01'], 'hours').divergent).toBe(true)  // diff 61
  })

  it('moda continua sendo o rótulo mais comum', () => {
    const r = computeStats(['1:00', '1:00', '1:30'], 'hours')
    expect(r.mode).toBe('1:00')
  })
})
