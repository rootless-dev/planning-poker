import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useLocale } from '@/composables/useLocale'
import { i18n, SUPPORTED_LOCALES } from '@/i18n'

const Harness = defineComponent({
  setup() {
    const api = useLocale()
    return { api }
  },
  render() { return h('div') },
})

describe('useLocale', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('expõe o locale atual', () => {
    const w = mount(Harness)
    expect(w.vm.api.current.value).toBe('pt-BR')
  })

  it('expõe a lista de suportados', () => {
    const w = mount(Harness)
    expect(w.vm.api.supported).toEqual(SUPPORTED_LOCALES)
  })

  it('setLocale atualiza o locale do vue-i18n', () => {
    const w = mount(Harness)
    w.vm.api.setLocale('en')
    expect(i18n.global.locale.value).toBe('en')
    expect(w.vm.api.current.value).toBe('en')
  })

  it('setLocale persiste em localStorage', () => {
    const w = mount(Harness)
    w.vm.api.setLocale('es')
    expect(localStorage.getItem('pp.locale')).toBe('es')
  })

  it('setLocale atualiza document.documentElement.lang', () => {
    const w = mount(Harness)
    w.vm.api.setLocale('en')
    expect(document.documentElement.lang).toBe('en')
  })
})
