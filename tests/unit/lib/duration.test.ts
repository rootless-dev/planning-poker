import { describe, it, expect } from 'vitest'
import { formatMinutes, parseDurationLabel, isValidMinutes } from '@/lib/duration'

describe('formatMinutes', () => {
  it('valores abaixo de 60 viram Nm', () => {
    expect(formatMinutes(0)).toBe('0m')
    expect(formatMinutes(15)).toBe('15m')
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(59)).toBe('59m')
  })
  it('60+ vira H:MM com minutos em 2 dígitos', () => {
    expect(formatMinutes(60)).toBe('1:00')
    expect(formatMinutes(75)).toBe('1:15')
    expect(formatMinutes(90)).toBe('1:30')
    expect(formatMinutes(120)).toBe('2:00')
    expect(formatMinutes(605)).toBe('10:05')
  })
})

describe('parseDurationLabel', () => {
  it('parseia Nm', () => {
    expect(parseDurationLabel('15m')).toBe(15)
    expect(parseDurationLabel('0m')).toBe(0)
  })
  it('parseia H:MM', () => {
    expect(parseDurationLabel('1:00')).toBe(60)
    expect(parseDurationLabel('1:30')).toBe(90)
    expect(parseDurationLabel('2:05')).toBe(125)
  })
  it('retorna null para formato inválido', () => {
    expect(parseDurationLabel('abc')).toBeNull()
    expect(parseDurationLabel('15')).toBeNull()
    expect(parseDurationLabel('1:5')).toBeNull()
    expect(parseDurationLabel('1:60')).toBeNull()
    expect(parseDurationLabel('')).toBeNull()
  })
})

describe('isValidMinutes', () => {
  it('aceita inteiros não-negativos', () => {
    expect(isValidMinutes('0')).toBe(true)
    expect(isValidMinutes('15')).toBe(true)
    expect(isValidMinutes('600')).toBe(true)
  })
  it('rejeita não-inteiros', () => {
    expect(isValidMinutes('15m')).toBe(false)
    expect(isValidMinutes('abc')).toBe(false)
    expect(isValidMinutes('1:30')).toBe(false)
    expect(isValidMinutes('1.5')).toBe(false)
    expect(isValidMinutes('-5')).toBe(false)
    expect(isValidMinutes('')).toBe(false)
  })
})
