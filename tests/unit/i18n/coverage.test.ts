import { describe, it, expect } from 'vitest'
import ptBR from '@/i18n/locales/pt-BR.json'
import en from '@/i18n/locales/en.json'
import es from '@/i18n/locales/es.json'

type Json = Record<string, unknown>

function collectKeys(obj: Json, prefix = ''): string[] {
  const keys: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v as Json, path))
    } else {
      keys.push(path)
    }
  }
  return keys.sort()
}

describe('i18n coverage', () => {
  const ptKeys = collectKeys(ptBR as Json)
  const enKeys = collectKeys(en as Json)
  const esKeys = collectKeys(es as Json)

  it('en tem exatamente as mesmas chaves de pt-BR', () => {
    expect(enKeys).toEqual(ptKeys)
  })

  it('es tem exatamente as mesmas chaves de pt-BR', () => {
    expect(esKeys).toEqual(ptKeys)
  })
})
