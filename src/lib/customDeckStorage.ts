const STORAGE_KEY = 'pp:lastCustomDeck'

export function loadLastCustomDeck(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveLastCustomDeck(values: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, values.join(', '))
  } catch {
    // localStorage indisponível (modo privado/cota) — persistência é best-effort
  }
}

const HOURS_KEY = 'pp:lastHoursDeck'

export function loadLastHoursDeck(): string {
  try {
    return localStorage.getItem(HOURS_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveLastHoursDeck(rawTokens: string[]): void {
  try {
    localStorage.setItem(HOURS_KEY, rawTokens.join(', '))
  } catch {
    // localStorage indisponível (modo privado/cota) — persistência é best-effort
  }
}
