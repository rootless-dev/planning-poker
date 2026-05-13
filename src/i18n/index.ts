import { createI18n } from 'vue-i18n'
import ptBR from './locales/pt-BR.json'
import en from './locales/en.json'
import es from './locales/es.json'
import type { MessageSchema } from './types'

export const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'pt-BR'

export const i18n = createI18n<[MessageSchema], Locale>({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    'pt-BR': ptBR,
    en,
    es,
  },
})
