import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { detectInitialLocale, type Locale } from '@/i18n'

function setNavigatorLanguage(lang: string) {
  Object.defineProperty(navigator, 'language', {
    value: lang,
    configurable: true,
  })
}

const originalLanguage = navigator.language

describe('detectInitialLocale', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterAll(() => {
    Object.defineProperty(navigator, 'language', {
      value: originalLanguage,
      configurable: true,
    })
  })

  it('respeita localStorage quando válido', () => {
    localStorage.setItem('pp.locale', 'en')
    setNavigatorLanguage('es-AR')
    expect(detectInitialLocale()).toBe<Locale>('en')
  })

  it('ignora localStorage quando inválido e cai no navigator', () => {
    localStorage.setItem('pp.locale', 'de')
    setNavigatorLanguage('es-AR')
    expect(detectInitialLocale()).toBe<Locale>('es')
  })

  it('mapeia pt* para pt-BR', () => {
    setNavigatorLanguage('pt-PT')
    expect(detectInitialLocale()).toBe<Locale>('pt-BR')
  })

  it('mapeia en* para en', () => {
    setNavigatorLanguage('en-US')
    expect(detectInitialLocale()).toBe<Locale>('en')
  })

  it('mapeia es* para es', () => {
    setNavigatorLanguage('es-AR')
    expect(detectInitialLocale()).toBe<Locale>('es')
  })

  it('cai em pt-BR (default) quando navigator é desconhecido', () => {
    setNavigatorLanguage('fr-FR')
    expect(detectInitialLocale()).toBe<Locale>('pt-BR')
  })
})
