import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LocaleSwitcher from '@/components/ui/LocaleSwitcher.vue'
import { i18n } from '@/i18n'

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    localStorage.clear()
    i18n.global.locale.value = 'pt-BR'
    document.documentElement.lang = 'pt-BR'
  })

  it('renderiza a sigla do locale atual', () => {
    const w = mount(LocaleSwitcher)
    expect(w.get('.locale-trigger').text()).toContain('PT')
  })

  it('abre o dropdown ao clicar no trigger', async () => {
    const w = mount(LocaleSwitcher)
    expect(w.find('[role="listbox"]').exists()).toBe(false)
    await w.get('.locale-trigger').trigger('click')
    expect(w.find('[role="listbox"]').exists()).toBe(true)
    const options = w.findAll('[role="option"]')
    expect(options).toHaveLength(3)
  })

  it('clicar numa opção troca o locale e fecha o dropdown', async () => {
    const w = mount(LocaleSwitcher)
    await w.get('.locale-trigger').trigger('click')
    const enOption = w.findAll('[role="option"]').find(o => o.text().includes('English'))!
    await enOption.trigger('click')
    expect(i18n.global.locale.value).toBe('en')
    expect(w.find('[role="listbox"]').exists()).toBe(false)
    expect(w.get('.locale-trigger').text()).toContain('EN')
  })

  it('Escape fecha o dropdown sem trocar locale', async () => {
    const w = mount(LocaleSwitcher)
    await w.get('.locale-trigger').trigger('click')
    await w.get('[role="listbox"]').trigger('keydown', { key: 'Escape' })
    expect(w.find('[role="listbox"]').exists()).toBe(false)
    expect(i18n.global.locale.value).toBe('pt-BR')
  })
})
