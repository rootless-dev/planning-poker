import type { Deck, DeckType } from '@/types/room'

export const FIBONACCI = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕']
export const TSHIRT = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕']

interface BuildOptions {
  type: DeckType
  customValues?: string[]
}

export function buildDeck(opts: BuildOptions): Deck {
  if (opts.type === 'fibonacci') return { type: 'fibonacci', values: [...FIBONACCI] }
  if (opts.type === 'tshirt') return { type: 'tshirt', values: [...TSHIRT] }

  const cleaned = (opts.customValues ?? [])
    .map(v => v.trim())
    .filter(v => v.length > 0)
  const unique = Array.from(new Set(cleaned))
  if (unique.length < 2) {
    throw new Error('Deck custom precisa de ao menos 2 valores únicos')
  }
  return { type: 'custom', values: unique }
}
