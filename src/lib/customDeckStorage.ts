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
