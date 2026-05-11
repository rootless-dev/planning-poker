import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomDeckEditor from '@/components/create/CustomDeckEditor.vue'

function lastEmitted(w: ReturnType<typeof mount>): string {
  const events = w.emitted('update:modelValue') as string[][] | undefined
  if (!events || events.length === 0) return ''
  return events[events.length - 1][0]
}

describe('CustomDeckEditor', () => {
  it('renderiza chips a partir do modelValue inicial', () => {
    const w = mount(CustomDeckEditor, { props: { modelValue: '1, 2, 3' } })
    const chips = w.findAll('.chip')
    expect(chips).toHaveLength(3)
    expect(chips.map(c => c.text().replace('×', '').trim())).toEqual(['1', '2', '3'])
  })

  it('Enter adiciona chip e emite update', async () => {
    const w = mount(CustomDeckEditor, { props: { modelValue: '1, 2' } })
    const input = w.get('input[type="text"]')
    await input.setValue('5')
    await input.trigger('keydown', { key: 'Enter' })
    expect(lastEmitted(w)).toBe('1, 2, 5')
  })

  it(', (vírgula) adiciona chip e consome a tecla', async () => {
    const w = mount(CustomDeckEditor, { props: { modelValue: '1' } })
    const input = w.get('input[type="text"]')
    await input.setValue('2')
    await input.trigger('keydown', { key: ',' })
    expect(lastEmitted(w)).toBe('1, 2')
  })

  it('blur com texto adiciona chip', async () => {
    const w = mount(CustomDeckEditor, { props: { modelValue: '1' } })
    const input = w.get('input[type="text"]')
    await input.setValue('XL')
    await input.trigger('blur')
    expect(lastEmitted(w)).toBe('1, XL')
  })

  it('paste com vírgulas adiciona múltiplos chips', async () => {
    const w = mount(CustomDeckEditor, { props: { modelValue: '' } })
    const input = w.get('input[type="text"]')
    const data = new DataTransfer()
    data.setData('text/plain', '1, 2, 3, 5')
    await input.trigger('paste', { clipboardData: data })
    expect(lastEmitted(w)).toBe('1, 2, 3, 5')
  })

  it('duplicata é ignorada silenciosamente e o input é limpo', async () => {
    const w = mount(CustomDeckEditor, { props: { modelValue: '1, 2' } })
    const input = w.get('input[type="text"]').element as HTMLInputElement
    await w.get('input[type="text"]').setValue('1')
    await w.get('input[type="text"]').trigger('keydown', { key: 'Enter' })
    expect(input.value).toBe('')
  })

  it('Backspace com input vazio remove o último chip', async () => {
    const w = mount(CustomDeckEditor, { props: { modelValue: '1, 2, 3' } })
    const input = w.get('input[type="text"]')
    await input.trigger('keydown', { key: 'Backspace' })
    expect(lastEmitted(w)).toBe('1, 2')
  })

  it('click no × do chip remove aquele chip', async () => {
    const w = mount(CustomDeckEditor, { props: { modelValue: '1, 2, 3' } })
    const removeButtons = w.findAll('.chip-remove')
    expect(removeButtons).toHaveLength(3)
    await removeButtons[1].trigger('click')
    expect(lastEmitted(w)).toBe('1, 3')
  })

  it('trim aplicado em chips adicionados', async () => {
    const w = mount(CustomDeckEditor, { props: { modelValue: '' } })
    const input = w.get('input[type="text"]')
    await input.setValue('  5  ')
    await input.trigger('keydown', { key: 'Enter' })
    expect(lastEmitted(w)).toBe('5')
  })

  it('limita a 30 chips', async () => {
    const initial = Array.from({ length: 30 }, (_, i) => String(i)).join(', ')
    const w = mount(CustomDeckEditor, { props: { modelValue: initial } })
    const input = w.get('input[type="text"]')
    await input.setValue('extra')
    await input.trigger('keydown', { key: 'Enter' })
    const events = (w.emitted('update:modelValue') as string[][] | undefined) ?? []
    const last = events.length > 0 ? events[events.length - 1][0] : initial
    expect(last.split(',').length).toBeLessThanOrEqual(30)
  })
})
