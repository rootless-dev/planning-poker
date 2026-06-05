import type { Deck, DeckType } from '@/types/room'
import { i18n } from '@/i18n'
import { formatMinutes, isValidMinutes } from './duration'

export interface DeckPreset {
  type: Exclude<DeckType, 'custom' | 'hours'>
  labelKey: string
  descKey: string
  values: readonly string[]
}

export const DECK_PRESETS: readonly DeckPreset[] = [
  {
    type: 'fibonacci',
    labelKey: 'decks.fibonacci.name',
    descKey: 'decks.fibonacci.description',
    values: ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'],
  },
  {
    type: 'fibonacci-modified',
    labelKey: 'decks.fibonacci-modified.name',
    descKey: 'decks.fibonacci-modified.description',
    values: ['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'],
  },
  {
    type: 'tshirt',
    labelKey: 'decks.tshirt.name',
    descKey: 'decks.tshirt.description',
    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'],
  },
  {
    type: 'powers-of-2',
    labelKey: 'decks.powers-of-2.name',
    descKey: 'decks.powers-of-2.description',
    values: ['1', '2', '4', '8', '16', '32', '64', '?', '☕'],
  },
  {
    type: 'sequential',
    labelKey: 'decks.sequential.name',
    descKey: 'decks.sequential.description',
    values: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?', '☕'],
  },
  {
    type: 'risk',
    labelKey: 'decks.risk.name',
    descKey: 'decks.risk.description',
    values: ['Baixo', 'Médio', 'Alto', 'Crítico', '?'],
  },
  {
    type: 'yes-no',
    labelKey: 'decks.yes-no.name',
    descKey: 'decks.yes-no.description',
    values: ['Sim', 'Não', '?'],
  },
] as const

const UTILITY_TOKENS = new Set(['?', '☕'])

interface BuildOptions {
  type: DeckType
  customValues?: string[]
}

export function buildDeck(opts: BuildOptions): Deck {
  if (opts.type === 'custom') {
    const cleaned = (opts.customValues ?? [])
      .map(v => v.trim())
      .filter(v => v.length > 0)
    const unique = Array.from(new Set(cleaned))
    if (unique.length < 2) {
      throw new Error(i18n.global.t('decks.errors.needTwoValues'))
    }
    return { type: 'custom', values: unique }
  }

  if (opts.type === 'hours') {
    const tokens = (opts.customValues ?? [])
      .map(v => v.trim())
      .filter(v => v.length > 0)
    if (tokens.some(t => !isValidMinutes(t))) {
      throw new Error(i18n.global.t('decks.errors.invalidHoursValues'))
    }
    const labels = tokens.map(t => formatMinutes(Number(t)))
    const unique = Array.from(new Set(labels))
    if (unique.length < 2) {
      throw new Error(i18n.global.t('decks.errors.needTwoValues'))
    }
    return { type: 'hours', values: unique }
  }

  const preset = DECK_PRESETS.find(p => p.type === opts.type)
  if (!preset) {
    throw new Error(i18n.global.t('decks.errors.unknownType', { type: opts.type }))
  }
  return { type: preset.type, values: [...preset.values] }
}

export function pickPreview(values: readonly string[]): string[] {
  const meaningful = values.filter(v => !UTILITY_TOKENS.has(v))
  if (meaningful.length <= 4) return [...meaningful]
  const n = meaningful.length
  const indices = [
    Math.floor(n * 0.2),
    Math.floor(n * 0.4),
    Math.floor(n * 0.6),
    Math.floor(n * 0.8),
  ]
  const uniqueIndices = Array.from(new Set(indices))
  return uniqueIndices.map(i => meaningful[i])
}
