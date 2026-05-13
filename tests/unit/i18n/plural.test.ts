import { describe, it, expect, beforeEach } from 'vitest'
import { i18n } from '@/i18n'

describe('i18n plural — room.players', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'pt-BR'
  })

  it('pt-BR: 0 / 1 / 2 jogadores', () => {
    expect(i18n.global.t('room.players', 0)).toBe('nenhum jogador')
    expect(i18n.global.t('room.players', 1, { named: { n: 1 } })).toBe('1 jogador')
    expect(i18n.global.t('room.players', 2, { named: { n: 2 } })).toBe('2 jogadores')
  })

  it('en: 0 / 1 / 2 players', () => {
    i18n.global.locale.value = 'en'
    expect(i18n.global.t('room.players', 0)).toBe('no players')
    expect(i18n.global.t('room.players', 1, { named: { n: 1 } })).toBe('1 player')
    expect(i18n.global.t('room.players', 2, { named: { n: 2 } })).toBe('2 players')
  })

  it('es: 0 / 1 / 2 jugadores', () => {
    i18n.global.locale.value = 'es'
    expect(i18n.global.t('room.players', 0)).toBe('sin jugadores')
    expect(i18n.global.t('room.players', 1, { named: { n: 1 } })).toBe('1 jugador')
    expect(i18n.global.t('room.players', 2, { named: { n: 2 } })).toBe('2 jugadores')
  })
})
