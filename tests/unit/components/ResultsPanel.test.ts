import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultsPanel from '@/components/room/ResultsPanel.vue'

describe('ResultsPanel', () => {
  it('mostra média/moda calculadas', () => {
    const wrapper = mount(ResultsPanel, {
      props: {
        seats: [
          { uid: 'a', name: 'Alice', vote: '3' },
          { uid: 'b', name: 'Bob', vote: '5' },
          { uid: 'c', name: 'Carol', vote: '5' },
        ],
      },
    })
    const text = wrapper.text()
    expect(text).toContain('Média:')
    expect(text).toContain('4.33')
    expect(text).toContain('Moda:')
    expect(text).toContain('5')
  })

  it('mostra divergência quando max-min > 5', () => {
    const wrapper = mount(ResultsPanel, {
      props: {
        seats: [
          { uid: 'a', name: 'Alice', vote: '1' },
          { uid: 'b', name: 'Bob', vote: '8' },
        ],
      },
    })
    expect(wrapper.text()).toContain('vale conversar')
  })
})
