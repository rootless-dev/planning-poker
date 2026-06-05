export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

export function parseDurationLabel(label: string): number | null {
  const minutesMatch = /^(\d+)m$/.exec(label)
  if (minutesMatch) return Number(minutesMatch[1])
  const hoursMatch = /^(\d+):([0-5]\d)$/.exec(label)
  if (hoursMatch) return Number(hoursMatch[1]) * 60 + Number(hoursMatch[2])
  return null
}

export function isValidMinutes(token: string): boolean {
  return /^\d+$/.test(token)
}
