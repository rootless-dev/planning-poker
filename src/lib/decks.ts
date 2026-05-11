import type { Deck, DeckType } from '@/types/room'

export interface DeckPreset {
  type: Exclude<DeckType, 'custom'>
  label: string
  description: string
  values: readonly string[]
}

export const DECK_PRESETS: readonly DeckPreset[] = [
  {
    type: 'fibonacci',
    label: 'Fibonacci',
    description: 'Clássico ágil. Granularidade pequena no início.',
    values: ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'],
  },
  {
    type: 'fibonacci-modified',
    label: 'Fibonacci modificado',
    description: 'Estende com meio ponto e valores altos para épicos.',
    values: ['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'],
  },
  {
    type: 'tshirt',
    label: 'T-shirt',
    description: 'Tamanhos abstratos, sem ancoragem em horas.',
    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'],
  },
  {
    type: 'powers-of-2',
    label: 'Potências de 2',
    description: 'Crescimento exponencial — bom para complexidade técnica.',
    values: ['1', '2', '4', '8', '16', '32', '64', '?', '☕'],
  },
  {
    type: 'sequential',
    label: 'Sequencial 1–10',
    description: 'Escala linear — granularidade fina e uniforme.',
    values: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?', '☕'],
  },
  {
    type: 'hours',
    label: 'Horas',
    description: 'Estimativa direta em horas para tarefas pequenas.',
    values: ['½h', '1h', '2h', '4h', '8h', '16h', '?', '☕'],
  },
  {
    type: 'risk',
    label: 'Risco',
    description: 'Avaliação qualitativa para spikes e análise de impacto.',
    values: ['Baixo', 'Médio', 'Alto', 'Crítico', '?'],
  },
  {
    type: 'yes-no',
    label: 'Sim / Não',
    description: 'Decisão binária para go/no-go.',
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
      throw new Error('Deck custom precisa de ao menos 2 valores únicos')
    }
    return { type: 'custom', values: unique }
  }

  const preset = DECK_PRESETS.find(p => p.type === opts.type)
  if (!preset) {
    throw new Error(`DeckType desconhecido: ${opts.type}`)
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
