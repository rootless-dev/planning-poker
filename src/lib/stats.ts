export interface Stats {
  numericCount: number
  average: number | null
  mode: string | null
  min: number | null
  max: number | null
  divergent: boolean
}

export function computeStats(votes: string[]): Stats {
  if (votes.length === 0) {
    return { numericCount: 0, average: null, mode: null, min: null, max: null, divergent: false }
  }

  const numericValues: number[] = []
  for (const v of votes) {
    const n = Number(v)
    if (Number.isFinite(n)) numericValues.push(n)
  }

  const numericCount = numericValues.length
  const average = numericCount > 0
    ? Math.round((numericValues.reduce((a, b) => a + b, 0) / numericCount) * 100) / 100
    : null
  const min = numericCount > 0 ? Math.min(...numericValues) : null
  const max = numericCount > 0 ? Math.max(...numericValues) : null
  const divergent = min !== null && max !== null && max - min > 5

  const counts = new Map<string, number>()
  const firstSeen = new Map<string, number>()
  votes.forEach((v, i) => {
    counts.set(v, (counts.get(v) ?? 0) + 1)
    if (!firstSeen.has(v)) firstSeen.set(v, i)
  })

  let mode: string | null = null
  let bestCount = 0
  let bestFirstSeen = Infinity
  for (const [value, count] of counts) {
    const seen = firstSeen.get(value) ?? Infinity
    if (count > bestCount || (count === bestCount && seen < bestFirstSeen)) {
      mode = value
      bestCount = count
      bestFirstSeen = seen
    }
  }

  return { numericCount, average, mode, min, max, divergent }
}
