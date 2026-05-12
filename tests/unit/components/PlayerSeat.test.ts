import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayerSeat from '@/components/room/PlayerSeat.vue'

vi.mock('@/lib/notoEmoji', () => ({ tryLoadLottie: vi.fn().mockResolvedValue(null) }))

const base = {
  uid: 'u1',
  name: 'Alice',
  vote: null,
  presence: 'online' as const,
  revealed: false,
}

describe('PlayerSeat — trigger menu', () => {
  it('"⋯" em isSelf abre menu com "Reagir" e só emite ao clicar no item', async () => {
    const w = mount(PlayerSeat, {
      props: { ...base, isSelf: true, canKick: false },
    })
    const trigger = w.get('button[aria-label="Opções"]')
    await trigger.trigger('click')
    expect(w.find('.kick-menu').exists()).toBe(true)
    expect(w.text()).toContain('Reagir')
    expect(w.emitted('open-emoji-panel')).toBeFalsy()

    await w.get('.kick-menu button').trigger('click')
    expect(w.emitted('open-emoji-panel')).toBeTruthy()
    expect(w.find('.kick-menu').exists()).toBe(false)
  })

  it('"⋯" em outro com canKick mostra menu Remover', async () => {
    const w = mount(PlayerSeat, {
      props: { ...base, isSelf: false, canKick: true },
    })
    await w.get('button[aria-label="Opções"]').trigger('click')
    expect(w.find('.kick-menu').exists()).toBe(true)
    expect(w.text()).toContain('Remover')
    // Não emite open-emoji-panel
    expect(w.emitted('open-emoji-panel')).toBeFalsy()
  })

  it('"⋯" NÃO aparece em outro sem canKick', () => {
    const w = mount(PlayerSeat, {
      props: { ...base, isSelf: false, canKick: false },
    })
    expect(w.find('button[aria-label="Opções"]').exists()).toBe(false)
  })

  it('renderiza EmojiBubble quando activeEmoji está presente', () => {
    const w = mount(PlayerSeat, {
      props: {
        ...base,
        isSelf: false,
        canKick: false,
        activeEmoji: { value: '🎉', key: 123 },
      },
    })
    expect(w.text()).toContain('🎉')
  })
})

describe('PlayerSeat — thinking indicator', () => {
  it('com isThinking=true e sem voto, mostra fallback 🤔 no avatar (sem Lottie)', () => {
    const w = mount(PlayerSeat, {
      props: { ...base, isSelf: false, canKick: false, isThinking: true, thinkingLottie: null },
    })
    const avatar = w.get('.avatar')
    expect(avatar.text()).toContain('🤔')
    expect(avatar.text()).not.toContain('A')
  })

  it('com isThinking=false, mostra a inicial normalmente', () => {
    const w = mount(PlayerSeat, {
      props: { ...base, isSelf: false, canKick: false, isThinking: false, thinkingLottie: null },
    })
    expect(w.get('.avatar').text()).toContain('A')
  })

  it('com isThinking=true e moderador, mantém a coroa', () => {
    const w = mount(PlayerSeat, {
      props: { ...base, isSelf: false, canKick: false, isModerator: true, isThinking: true, thinkingLottie: null },
    })
    expect(w.get('.crown').exists()).toBe(true)
  })
})
