import { createI18n } from 'vue-i18n'
import ptBR from './locales/pt-BR.json'
import en from './locales/en.json'
import es from './locales/es.json'
import type { MessageSchema } from './types'

export const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'pt-BR'
export const LOCALE_STORAGE_KEY = 'pp.locale'

function isSupported(value: string | null): value is Locale {
  return value !== null && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export function detectInitialLocale(): Locale {
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
      if (isSupported(stored)) return stored
    } catch {
      // ignora falhas de acesso a storage (modo privado, SSR, etc.)
    }
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : ''
  const prefix = nav.toLowerCase().split('-')[0]
  if (prefix === 'pt') return 'pt-BR'
  if (prefix === 'en') return 'en'
  if (prefix === 'es') return 'es'
  return DEFAULT_LOCALE
}

const initialLocale = detectInitialLocale()
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLocale
}

export const i18n = createI18n<[MessageSchema], Locale>({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    'pt-BR': ptBR,
    en,
    es,
  },
})
