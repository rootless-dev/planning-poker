import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import EmojiPanel from '@/components/room/EmojiPanel.vue'

// Stub do web component para não dependerem do navegador real
vi.mock('emoji-picker-element', () => ({}))

describe('EmojiPanel', () => {
  it('renderiza header e botão fechar', async () => {
    const wrapper = mount(EmojiPanel, {
      props: { cooldownRemainingMs: 0 },
    })
    expect(wrapper.text()).toContain('Reagir')
    await wrapper.get('button[aria-label="Fechar"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emite select com unicode do emoji-click', async () => {
    const wrapper = mount(EmojiPanel, {
      props: { cooldownRemainingMs: 0 },
    })
    await flushPromises()
    // Simular o evento emitido pelo web component
    const picker = wrapper.get('emoji-picker').element as HTMLElement
    picker.dispatchEvent(new CustomEvent('emoji-click', { detail: { unicode: '🎉' } }))
    expect(wrapper.emitted('select')?.[0]).toEqual(['🎉'])
  })

  it('cooldown > 0 mostra overlay', () => {
    const wrapper = mount(EmojiPanel, {
      props: { cooldownRemainingMs: 1200 },
    })
    expect(wrapper.find('.cooldown-overlay').exists()).toBe(true)
  })
})
