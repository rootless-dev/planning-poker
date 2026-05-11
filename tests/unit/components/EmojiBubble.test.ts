import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EmojiBubble from '@/components/room/EmojiBubble.vue'

describe('EmojiBubble', () => {
  it('renderiza o value como unicode', () => {
    const w = mount(EmojiBubble, { props: { value: '🎉' } })
    expect(w.text()).toContain('🎉')
  })

  it('emite done após o ciclo completo (~2.3s)', async () => {
    vi.useFakeTimers()
    const w = mount(EmojiBubble, { props: { value: '🎉' } })
    vi.advanceTimersByTime(2400)
    expect(w.emitted('done')).toBeTruthy()
    vi.useRealTimers()
  })
})
