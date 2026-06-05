import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DeckPicker from '@/components/create/DeckPicker.vue'
import { DECK_PRESETS } from '@/lib/decks'
import { i18n } from '@/i18n'

const base = { customRaw: '', hoursRaw: '' }

describe('DeckPicker', () => {
  it('renderiza uma <option> por preset + Horas + Customizado', () => {
    const w = mount(DeckPicker, { props: { modelValue: 'fibonacci', ...base } })
    const options = w.findAll('select option')
    expect(options).toHaveLength(DECK_PRESETS.length + 2)
    expect(options[options.length - 1].text()).toBe(i18n.global.t('decks.custom'))
    expect(options[options.length - 2].text()).toBe(i18n.global.t('decks.hours.name'))
  })

  it('mostra DeckPreviewCards quando modelValue é preset', () => {
    const w = mount(DeckPicker, { props: { modelValue: 'fibonacci', ...base } })
    expect(w.findComponent({ name: 'DeckPreviewCards' }).exists()).toBe(true)
    expect(w.findComponent({ name: 'CustomDeckEditor' }).exists()).toBe(false)
  })

  it('mostra CustomDeckEditor quando modelValue é custom (hoursMode false)', () => {
    const w = mount(DeckPicker, { props: { modelValue: 'custom', ...base, customRaw: '1, 2' } })
    const editor = w.findComponent({ name: 'CustomDeckEditor' })
    expect(editor.exists()).toBe(true)
    expect(editor.props('hoursMode')).toBe(false)
    expect(w.findComponent({ name: 'DeckPreviewCards' }).exists()).toBe(false)
  })

  it('mostra CustomDeckEditor com hoursMode quando modelValue é hours', () => {
    const w = mount(DeckPicker, { props: { modelValue: 'hours', ...base, hoursRaw: '15, 60' } })
    const editor = w.findComponent({ name: 'CustomDeckEditor' })
    expect(editor.exists()).toBe(true)
    expect(editor.props('hoursMode')).toBe(true)
    expect(editor.props('modelValue')).toBe('15, 60')
    expect(w.findComponent({ name: 'DeckPreviewCards' }).exists()).toBe(false)
  })

  it('mostra a description do preset selecionado', () => {
    const w = mount(DeckPicker, { props: { modelValue: 'risk', ...base } })
    const risk = DECK_PRESETS.find(p => p.type === 'risk')!
    expect(w.text()).toContain(i18n.global.t(risk.descKey))
  })

  it('mostra a description de Horas quando selecionado', () => {
    const w = mount(DeckPicker, { props: { modelValue: 'hours', ...base } })
    expect(w.find('.deck-description').text()).toBe(i18n.global.t('decks.hours.description'))
  })

  it('NÃO mostra description quando custom está selecionado', () => {
    const w = mount(DeckPicker, { props: { modelValue: 'custom', ...base } })
    expect(w.find('.deck-description').exists()).toBe(false)
  })

  it('emite update:modelValue ao trocar o select', async () => {
    const w = mount(DeckPicker, { props: { modelValue: 'fibonacci', ...base } })
    await w.get('select').setValue('tshirt')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['tshirt'])
  })

  it('emite update:customRaw quando o editor emite em modo custom', async () => {
    const w = mount(DeckPicker, { props: { modelValue: 'custom', ...base } })
    const editor = w.findComponent({ name: 'CustomDeckEditor' })
    editor.vm.$emit('update:modelValue', '1, 2, 3')
    await w.vm.$nextTick()
    expect(w.emitted('update:customRaw')?.[0]).toEqual(['1, 2, 3'])
  })

  it('emite update:hoursRaw quando o editor emite em modo hours', async () => {
    const w = mount(DeckPicker, { props: { modelValue: 'hours', ...base } })
    const editor = w.findComponent({ name: 'CustomDeckEditor' })
    editor.vm.$emit('update:modelValue', '15, 60')
    await w.vm.$nextTick()
    expect(w.emitted('update:hoursRaw')?.[0]).toEqual(['15, 60'])
  })
})
