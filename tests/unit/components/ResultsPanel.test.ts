import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultsPanel from '@/components/room/ResultsPanel.vue'

const seatsHours = [
  { uid: 'a', name: 'A', vote: '1:00' },
  { uid: 'b', name: 'B', vote: '1:30' },
]

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
    expect(text).toContain('Média')
    expect(text).toContain('4.33')
    expect(text).toContain('Moda')
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
    expect(wrapper.text()).toContain('Vale uma conversa')
  })

  it('modo horas: formata a média em H:MM', () => {
    const w = mount(ResultsPanel, { props: { seats: seatsHours, unit: 'hours' } })
    // média de 60 e 90 = 75 min → 1:15
    expect(w.find('.stat.primary .numeral').text()).toBe('1:15')
  })

  it('modo horas: formata min e max em H:MM', () => {
    const w = mount(ResultsPanel, { props: { seats: seatsHours, unit: 'hours' } })
    const mids = w.findAll('.stat .mid').map(s => s.text())
    // ordem dos .mid: [moda, mínimo, máximo]
    expect(mids[1]).toBe('1:00') // min 60
    expect(mids[2]).toBe('1:30') // max 90
  })

  it('sem unit: mantém números crus', () => {
    const seats = [
      { uid: 'a', name: 'A', vote: '5' },
      { uid: 'b', name: 'B', vote: '8' },
    ]
    const w = mount(ResultsPanel, { props: { seats } })
    expect(w.find('.stat.primary .numeral').text()).toBe('6.5')
  })
})
