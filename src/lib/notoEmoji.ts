type CacheEntry = object | 'unavailable'
const cache = new Map<string, CacheEntry>()

export function _resetCache() { cache.clear() }

export function toCodepointSequence(value: string): string {
  const parts: string[] = []
  for (const ch of value) {
    const cp = ch.codePointAt(0)!
    // pula variation selector (U+FE0F) — Noto não usa no nome do arquivo
    if (cp === 0xfe0f) continue
    parts.push(cp.toString(16))
  }
  return parts.join('-')
}

export async function tryLoadLottie(value: string): Promise<object | null> {
  const cp = toCodepointSequence(value)
  if (!cp) return null
  const hit = cache.get(cp)
  if (hit === 'unavailable') return null
  if (hit) return hit
  try {
    const res = await fetch(`https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/lottie.json`)
    if (!res.ok) { cache.set(cp, 'unavailable'); return null }
    const json = (await res.json()) as object
    cache.set(cp, json)
    return json
  } catch {
    cache.set(cp, 'unavailable')
    return null
  }
}
