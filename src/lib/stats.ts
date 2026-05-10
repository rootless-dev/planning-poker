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
  for (const v of votes) {
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }

  let mode: string | null = null
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      mode = value
      bestCount = count
    }
  }

  return { numericCount, average, mode, min, max, divergent }
}
