import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import HowItWorksCarousel from '@/components/create/HowItWorksCarousel.vue'

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

describe('HowItWorksCarousel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockMatchMedia(false)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renderiza 4 dots e a primeira cena ativa', () => {
    const w = mount(HowItWorksCarousel)
    expect(w.findAll('.dot')).toHaveLength(4)
    const scenes = w.findAll('[role="group"]')
    expect(scenes).toHaveLength(4)
    expect(scenes[0].attributes('aria-hidden')).toBe('false')
    expect(scenes[1].attributes('aria-hidden')).toBe('true')
  })

  it('click no dot N ativa a cena N (1-based no aria-label)', async () => {
    const w = mount(HowItWorksCarousel)
    const dots = w.findAll('.dot')
    await dots[2].trigger('click')
    const scenes = w.findAll('[role="group"]')
    expect(scenes[2].attributes('aria-hidden')).toBe('false')
    expect(scenes[0].attributes('aria-hidden')).toBe('true')
    expect(dots[2].attributes('aria-current')).toBe('step')
  })

  it('auto-rotaciona a cada 5s', async () => {
    const w = mount(HowItWorksCarousel)
    let scenes = w.findAll('[role="group"]')
    expect(scenes[0].attributes('aria-hidden')).toBe('false')

    await vi.advanceTimersByTimeAsync(5000)
    scenes = w.findAll('[role="group"]')
    expect(scenes[1].attributes('aria-hidden')).toBe('false')

    await vi.advanceTimersByTimeAsync(5000)
    scenes = w.findAll('[role="group"]')
    expect(scenes[2].attributes('aria-hidden')).toBe('false')
  })

  it('rotação dá loop após a cena 4 (volta para 1)', async () => {
    const w = mount(HowItWorksCarousel)
    await vi.advanceTimersByTimeAsync(5000 * 4)
    const scenes = w.findAll('[role="group"]')
    expect(scenes[0].attributes('aria-hidden')).toBe('false')
  })

  it('pointerenter pausa o timer', async () => {
    const w = mount(HowItWorksCarousel)
    await w.get('.carousel').trigger('pointerenter')
    await vi.advanceTimersByTimeAsync(5000)
    const scenes = w.findAll('[role="group"]')
    expect(scenes[0].attributes('aria-hidden')).toBe('false')
  })

  it('pointerleave retoma o timer', async () => {
    const w = mount(HowItWorksCarousel)
    await w.get('.carousel').trigger('pointerenter')
    await vi.advanceTimersByTimeAsync(3000)
    await w.get('.carousel').trigger('pointerleave')
    await vi.advanceTimersByTimeAsync(5000)
    const scenes = w.findAll('[role="group"]')
    expect(scenes[1].attributes('aria-hidden')).toBe('false')
  })

  it('prefers-reduced-motion desativa auto-rotação', async () => {
    mockMatchMedia(true)
    const w = mount(HowItWorksCarousel)
    await vi.advanceTimersByTimeAsync(5000 * 3)
    const scenes = w.findAll('[role="group"]')
    expect(scenes[0].attributes('aria-hidden')).toBe('false')
  })

  it('click em dot reinicia contagem (5s a partir dali)', async () => {
    const w = mount(HowItWorksCarousel)
    await vi.advanceTimersByTimeAsync(3000)
    await w.findAll('.dot')[2].trigger('click')
    await vi.advanceTimersByTimeAsync(4500)
    let scenes = w.findAll('[role="group"]')
    expect(scenes[2].attributes('aria-hidden')).toBe('false')
    await vi.advanceTimersByTimeAsync(600)
    scenes = w.findAll('[role="group"]')
    expect(scenes[3].attributes('aria-hidden')).toBe('false')
  })
})
