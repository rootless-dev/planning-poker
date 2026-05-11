import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DeckPicker from '@/components/create/DeckPicker.vue'
import { DECK_PRESETS } from '@/lib/decks'

describe('DeckPicker', () => {
  it('renderiza uma <option> para cada preset + Customizado', () => {
    const w = mount(DeckPicker, {
      props: { modelValue: 'fibonacci', customRaw: '' },
    })
    const options = w.findAll('select option')
    expect(options).toHaveLength(DECK_PRESETS.length + 1)
    expect(options[options.length - 1].text()).toBe('Customizado')
  })

  it('mostra DeckPreviewCards quando modelValue é preset', () => {
    const w = mount(DeckPicker, {
      props: { modelValue: 'fibonacci', customRaw: '' },
    })
    expect(w.findComponent({ name: 'DeckPreviewCards' }).exists()).toBe(true)
    expect(w.findComponent({ name: 'CustomDeckEditor' }).exists()).toBe(false)
  })

  it('mostra CustomDeckEditor quando modelValue é custom', () => {
    const w = mount(DeckPicker, {
      props: { modelValue: 'custom', customRaw: '1, 2' },
    })
    expect(w.findComponent({ name: 'CustomDeckEditor' }).exists()).toBe(true)
    expect(w.findComponent({ name: 'DeckPreviewCards' }).exists()).toBe(false)
  })

  it('mostra a description do preset selecionado', () => {
    const w = mount(DeckPicker, {
      props: { modelValue: 'risk', customRaw: '' },
    })
    const risk = DECK_PRESETS.find(p => p.type === 'risk')!
    expect(w.text()).toContain(risk.description)
  })

  it('NÃO mostra description quando custom está selecionado', () => {
    const w = mount(DeckPicker, {
      props: { modelValue: 'custom', customRaw: '' },
    })
    expect(w.find('.deck-description').exists()).toBe(false)
  })

  it('emite update:modelValue ao trocar o select', async () => {
    const w = mount(DeckPicker, {
      props: { modelValue: 'fibonacci', customRaw: '' },
    })
    await w.get('select').setValue('tshirt')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['tshirt'])
  })

  it('emite update:customRaw quando CustomDeckEditor emite', async () => {
    const w = mount(DeckPicker, {
      props: { modelValue: 'custom', customRaw: '' },
    })
    const editor = w.findComponent({ name: 'CustomDeckEditor' })
    editor.vm.$emit('update:modelValue', '1, 2, 3')
    await w.vm.$nextTick()
    expect(w.emitted('update:customRaw')?.[0]).toEqual(['1, 2, 3'])
  })
})
