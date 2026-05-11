import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DeckPreviewCards from '@/components/create/DeckPreviewCards.vue'

describe('DeckPreviewCards', () => {
  it('renderiza uma carta para cada valor', () => {
    const w = mount(DeckPreviewCards, { props: { values: ['1', '2', '3'] } })
    const cards = w.findAll('.preview-card')
    expect(cards).toHaveLength(3)
    expect(cards[0].text()).toBe('1')
    expect(cards[1].text()).toBe('2')
    expect(cards[2].text()).toBe('3')
  })

  it('aplica classes de tilt nas extremidades quando há 4 valores', () => {
    const w = mount(DeckPreviewCards, { props: { values: ['1', '2', '3', '5'] } })
    const cards = w.findAll('.preview-card')
    expect(cards[0].classes()).toContain('tilt-left')
    expect(cards[3].classes()).toContain('tilt-right')
    expect(cards[1].classes()).not.toContain('tilt-left')
    expect(cards[2].classes()).not.toContain('tilt-right')
  })

  it('atualiza ao trocar values', async () => {
    const w = mount(DeckPreviewCards, { props: { values: ['1', '2'] } })
    expect(w.findAll('.preview-card')).toHaveLength(2)
    await w.setProps({ values: ['A', 'B', 'C', 'D'] })
    const cards = w.findAll('.preview-card')
    expect(cards).toHaveLength(4)
    expect(cards.map(c => c.text())).toEqual(['A', 'B', 'C', 'D'])
  })
})
