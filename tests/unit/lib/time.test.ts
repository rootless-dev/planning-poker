import { describe, it, expect } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { presenceFor } from '@/lib/time'

function tsAgo(seconds: number): Timestamp {
  return Timestamp.fromMillis(Date.now() - seconds * 1000)
}

describe('presenceFor', () => {
  it('online se < 30s', () => {
    expect(presenceFor(tsAgo(5))).toBe('online')
    expect(presenceFor(tsAgo(29))).toBe('online')
  })

  it('absent se 30..89s', () => {
    expect(presenceFor(tsAgo(30))).toBe('absent')
    expect(presenceFor(tsAgo(89))).toBe('absent')
  })

  it('offline se >= 90s', () => {
    expect(presenceFor(tsAgo(90))).toBe('offline')
    expect(presenceFor(tsAgo(3600))).toBe('offline')
  })

  it('null/undefined → offline', () => {
    expect(presenceFor(null)).toBe('offline')
    expect(presenceFor(undefined)).toBe('offline')
  })
})
