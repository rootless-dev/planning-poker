import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  loadLastCustomDeck,
  saveLastCustomDeck,
  loadLastHoursDeck,
  saveLastHoursDeck,
} from '@/lib/customDeckStorage'

const KEY = 'pp:lastCustomDeck'

describe('customDeckStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('retorna string vazia quando não há nada salvo', () => {
    expect(loadLastCustomDeck()).toBe('')
  })

  it('salva valores como CSV e recarrega', () => {
    saveLastCustomDeck(['1', '2', '3', '5', '8'])
    expect(localStorage.getItem(KEY)).toBe('1, 2, 3, 5, 8')
    expect(loadLastCustomDeck()).toBe('1, 2, 3, 5, 8')
  })

  it('sobrescreve a lista salva anteriormente', () => {
    saveLastCustomDeck(['1', '2'])
    saveLastCustomDeck(['XS', 'S', 'M'])
    expect(loadLastCustomDeck()).toBe('XS, S, M')
  })

  it('não lança quando localStorage.getItem falha', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(loadLastCustomDeck()).toBe('')
  })

  it('não lança quando localStorage.setItem falha', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => saveLastCustomDeck(['1', '2'])).not.toThrow()
  })
})

describe('customDeckStorage — horas', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('retorna string vazia quando não há nada salvo', () => {
    expect(loadLastHoursDeck()).toBe('')
  })

  it('salva minutos crus como CSV e recarrega', () => {
    saveLastHoursDeck(['15', '60', '90'])
    expect(localStorage.getItem('pp:lastHoursDeck')).toBe('15, 60, 90')
    expect(loadLastHoursDeck()).toBe('15, 60, 90')
  })

  it('usa chave separada do deck custom', () => {
    saveLastCustomDeck(['XS', 'S'])
    saveLastHoursDeck(['15', '60'])
    expect(loadLastCustomDeck()).toBe('XS, S')
    expect(loadLastHoursDeck()).toBe('15, 60')
  })

  it('não lança quando setItem falha', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => saveLastHoursDeck(['1', '2'])).not.toThrow()
  })
})
