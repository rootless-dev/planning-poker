# Create Room Revamp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reformular a tela "Criar sala" com layout 70/30 (carrossel + form), novo `DeckPicker` (dropdown + preview de 4 cartas grandes), `CustomDeckEditor` em chip/tag input, 6 novos presets de baralho e transição fade+lift entre todas as rotas.

**Architecture:** Tudo nativo: Vue 3 `<script setup>` + Composition API, CSS via Tailwind v4 + design tokens existentes (`--color-paper-soft`, `--color-brand`, etc.), Vue `<Transition>` para troca de rotas, `setTimeout` para auto-rotação do carrossel. Sem novas dependências. Registro de presets em `src/lib/decks.ts` como fonte única usada pelo picker e por `buildDeck`. Componentes filhos isolados em `src/components/create/`.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript, Tailwind 4, Vitest + @vue/test-utils + happy-dom, Pinia (não tocada). Firebase Firestore como backend (não tocado).

**Spec de referência:** `docs/superpowers/specs/2026-05-11-create-room-revamp-design.md`.

---

## Estrutura de arquivos

**Modificar:**
- `src/lib/decks.ts` — adicionar `DECK_PRESETS`, `pickPreview`, novos `DeckType`. Remover constantes antigas `FIBONACCI` / `TSHIRT` (substituídas pelo registro).
- `src/components/create/DeckPicker.vue` — refeito como dropdown + preview/custom.
- `src/components/create/CustomDeckEditor.vue` — refeito como chip input.
- `src/views/CreateSessionView.vue` — reescrito com layout 70/30 + ajuste de `canSubmit` para custom (`≥ 2 chips`).
- `src/App.vue` — envolve `<RouterView>` com `<Transition>`.
- `src/style.css` — adiciona classes `.page-*` para a transição.
- `tests/unit/lib/decks.test.ts` — atualizar (remoção de `FIBONACCI`/`TSHIRT` imports) + cobrir novos presets e `pickPreview`.

**Criar:**
- `src/components/create/DeckPreviewCards.vue` — render visual de 4 cartas grandes.
- `src/components/create/HowItWorksCarousel.vue` — carrossel auto-rotacionado de 4 cenas.
- `tests/unit/components/CustomDeckEditor.test.ts`
- `tests/unit/components/DeckPicker.test.ts`
- `tests/unit/components/HowItWorksCarousel.test.ts`
- `tests/unit/components/DeckPreviewCards.test.ts`

**Não tocar:**
- `src/types/room.ts` — `DeckType` é re-exportado de `decks.ts`; tipo na interface `Room` continua igual.

Espere — `DeckType` é declarado em `src/types/room.ts` hoje. Vamos manter a declaração lá (é o source-of-truth dos tipos) e ampliá-la. `decks.ts` importa o tipo, não exporta.

**Correção da lista acima:** `src/types/room.ts` **é modificado** (amplia `DeckType`).

---

## Task 1: Ampliar `decks.ts` com `DECK_PRESETS` e `pickPreview`

**Files:**
- Modify: `src/types/room.ts` (linha 3 — amplia `DeckType`)
- Modify: `src/lib/decks.ts` (rewrite completo)
- Modify: `tests/unit/lib/decks.test.ts` (rewrite completo)

- [ ] **Step 1.1: Atualizar testes existentes para a nova API**

Substituir o conteúdo de `tests/unit/lib/decks.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildDeck, pickPreview, DECK_PRESETS } from '@/lib/decks'

describe('DECK_PRESETS', () => {
  it('contém os 8 presets esperados', () => {
    const types = DECK_PRESETS.map(p => p.type)
    expect(types).toEqual([
      'fibonacci',
      'fibonacci-modified',
      'tshirt',
      'powers-of-2',
      'sequential',
      'hours',
      'risk',
      'yes-no',
    ])
  })

  it('todo preset tem label, description e pelo menos 2 valores', () => {
    for (const p of DECK_PRESETS) {
      expect(p.label.length).toBeGreaterThan(0)
      expect(p.description.length).toBeGreaterThan(0)
      expect(p.values.length).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('buildDeck — presets', () => {
  it('Fibonacci retorna sequência canônica', () => {
    const deck = buildDeck({ type: 'fibonacci' })
    expect(deck.type).toBe('fibonacci')
    expect(deck.values).toEqual(['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'])
  })

  it('Fibonacci modificado inclui ½ e 100', () => {
    const deck = buildDeck({ type: 'fibonacci-modified' })
    expect(deck.values).toContain('½')
    expect(deck.values).toContain('100')
  })

  it('T-shirt retorna XS a XXL com ? e ☕', () => {
    const deck = buildDeck({ type: 'tshirt' })
    expect(deck.values).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'])
  })

  it('Potências de 2 vai de 1 a 64', () => {
    const deck = buildDeck({ type: 'powers-of-2' })
    expect(deck.values).toEqual(['1', '2', '4', '8', '16', '32', '64', '?', '☕'])
  })

  it('Sequencial vai de 1 a 10', () => {
    const deck = buildDeck({ type: 'sequential' })
    expect(deck.values).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?', '☕'])
  })

  it('Horas inclui ½h e 16h', () => {
    const deck = buildDeck({ type: 'hours' })
    expect(deck.values).toEqual(['½h', '1h', '2h', '4h', '8h', '16h', '?', '☕'])
  })

  it('Risco vai de Baixo a Crítico', () => {
    const deck = buildDeck({ type: 'risk' })
    expect(deck.values).toEqual(['Baixo', 'Médio', 'Alto', 'Crítico', '?'])
  })

  it('Sim/Não retorna apenas Sim, Não, ?', () => {
    const deck = buildDeck({ type: 'yes-no' })
    expect(deck.values).toEqual(['Sim', 'Não', '?'])
  })

  it('retorna cópia (não a referência interna)', () => {
    const a = buildDeck({ type: 'fibonacci' })
    const b = buildDeck({ type: 'fibonacci' })
    expect(a.values).not.toBe(b.values)
    a.values.push('mutated')
    expect(b.values).not.toContain('mutated')
  })
})

describe('buildDeck — custom', () => {
  it('aceita valores customizados, removendo duplicatas e vazios', () => {
    const deck = buildDeck({
      type: 'custom',
      customValues: ['1', '2', '2', '', '3', ' ', ' 5 '],
    })
    expect(deck.type).toBe('custom')
    expect(deck.values).toEqual(['1', '2', '3', '5'])
  })

  it('rejeita custom vazio', () => {
    expect(() => buildDeck({ type: 'custom', customValues: ['', ' '] }))
      .toThrow(/precisa de ao menos 2 valores/i)
  })

  it('rejeita custom com 1 valor', () => {
    expect(() => buildDeck({ type: 'custom', customValues: ['7'] }))
      .toThrow(/precisa de ao menos 2 valores/i)
  })
})

describe('pickPreview', () => {
  it('filtra ? e ☕', () => {
    expect(pickPreview(['1', '2', '?', '☕'])).toEqual(['1', '2'])
  })

  it('retorna todos se houver ≤ 4 não-filtrados', () => {
    expect(pickPreview(['Sim', 'Não', '?'])).toEqual(['Sim', 'Não'])
    expect(pickPreview(['Baixo', 'Médio', 'Alto', 'Crítico', '?'])).toEqual(['Baixo', 'Médio', 'Alto', 'Crítico'])
  })

  it('retorna 4 amostras do miolo quando há > 4', () => {
    const result = pickPreview(['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'])
    expect(result).toHaveLength(4)
    // 8 valores não-filtrados → índices ~[1, 3, 4, 6] → ['1', '3', '5', '13']
    expect(result).toEqual(['1', '3', '5', '13'])
  })

  it('deduplica se a amostragem cair em índices duplicados', () => {
    const result = pickPreview(['1', '2', '?'])
    // só 2 não-filtrados, retorna todos sem duplicar
    expect(result).toEqual(['1', '2'])
  })

  it('retorna array vazio se input só tiver ? e ☕', () => {
    expect(pickPreview(['?', '☕'])).toEqual([])
  })
})
```

- [ ] **Step 1.2: Rodar testes para verificar que falham**

Run: `bun run test`
Expected: FAIL — imports `pickPreview`, `DECK_PRESETS` não existem; `DeckType` `'fibonacci-modified'` etc. não são aceitos.

- [ ] **Step 1.3: Ampliar `DeckType` em `src/types/room.ts`**

Substituir a linha 3 atual:

```ts
export type DeckType = 'fibonacci' | 'tshirt' | 'custom'
```

Por:

```ts
export type DeckType =
  | 'fibonacci'
  | 'fibonacci-modified'
  | 'tshirt'
  | 'powers-of-2'
  | 'sequential'
  | 'hours'
  | 'risk'
  | 'yes-no'
  | 'custom'
```

- [ ] **Step 1.4: Reescrever `src/lib/decks.ts`**

Substituir o conteúdo inteiro por:

```ts
import type { Deck, DeckType } from '@/types/room'

export interface DeckPreset {
  type: Exclude<DeckType, 'custom'>
  label: string
  description: string
  values: readonly string[]
}

export const DECK_PRESETS: readonly DeckPreset[] = [
  {
    type: 'fibonacci',
    label: 'Fibonacci',
    description: 'Clássico ágil. Granularidade pequena no início.',
    values: ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'],
  },
  {
    type: 'fibonacci-modified',
    label: 'Fibonacci modificado',
    description: 'Estende com meio ponto e valores altos para épicos.',
    values: ['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'],
  },
  {
    type: 'tshirt',
    label: 'T-shirt',
    description: 'Tamanhos abstratos, sem ancoragem em horas.',
    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'],
  },
  {
    type: 'powers-of-2',
    label: 'Potências de 2',
    description: 'Crescimento exponencial — bom para complexidade técnica.',
    values: ['1', '2', '4', '8', '16', '32', '64', '?', '☕'],
  },
  {
    type: 'sequential',
    label: 'Sequencial 1–10',
    description: 'Escala linear — granularidade fina e uniforme.',
    values: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?', '☕'],
  },
  {
    type: 'hours',
    label: 'Horas',
    description: 'Estimativa direta em horas para tarefas pequenas.',
    values: ['½h', '1h', '2h', '4h', '8h', '16h', '?', '☕'],
  },
  {
    type: 'risk',
    label: 'Risco',
    description: 'Avaliação qualitativa para spikes e análise de impacto.',
    values: ['Baixo', 'Médio', 'Alto', 'Crítico', '?'],
  },
  {
    type: 'yes-no',
    label: 'Sim / Não',
    description: 'Decisão binária para go/no-go.',
    values: ['Sim', 'Não', '?'],
  },
] as const

const NON_NUMERIC_TOKENS = new Set(['?', '☕'])

interface BuildOptions {
  type: DeckType
  customValues?: string[]
}

export function buildDeck(opts: BuildOptions): Deck {
  if (opts.type === 'custom') {
    const cleaned = (opts.customValues ?? [])
      .map(v => v.trim())
      .filter(v => v.length > 0)
    const unique = Array.from(new Set(cleaned))
    if (unique.length < 2) {
      throw new Error('Deck custom precisa de ao menos 2 valores únicos')
    }
    return { type: 'custom', values: unique }
  }

  const preset = DECK_PRESETS.find(p => p.type === opts.type)
  if (!preset) {
    throw new Error(`DeckType desconhecido: ${opts.type}`)
  }
  return { type: preset.type, values: [...preset.values] }
}

export function pickPreview(values: readonly string[]): string[] {
  const meaningful = values.filter(v => !NON_NUMERIC_TOKENS.has(v))
  if (meaningful.length <= 4) return [...meaningful]
  const n = meaningful.length
  const indices = [
    Math.floor(n * 0.2),
    Math.floor(n * 0.4),
    Math.floor(n * 0.6),
    Math.floor(n * 0.8),
  ]
  const uniqueIndices = Array.from(new Set(indices))
  return uniqueIndices.map(i => meaningful[i])
}
```

- [ ] **Step 1.5: Rodar testes — devem passar**

Run: `bun run test`
Expected: PASS — todos os testes de `decks.test.ts` verdes.

- [ ] **Step 1.6: Type check**

Run: `bun run lint:types`
Expected: PASS — sem erros. Se quebrar em `DeckPicker.vue` ou `CustomDeckEditor.vue` (que ainda usam o tipo antigo), está OK — vamos consertar nas próximas tasks. Mas certifique-se que **só** os erros vêm desses dois arquivos (e não de outro lugar inesperado).

Se aparecer erro de import `FIBONACCI`/`TSHIRT` em outro arquivo qualquer fora de `DeckPicker.vue` / `CustomDeckEditor.vue`, parar e investigar antes de seguir.

- [ ] **Step 1.7: Commit**

```bash
git add src/types/room.ts src/lib/decks.ts tests/unit/lib/decks.test.ts
git commit -m "$(cat <<'EOF'
feat(decks): registro de 8 presets + helper pickPreview

Substitui constantes FIBONACCI/TSHIRT por DECK_PRESETS (fonte única usada
pelo DeckPicker e buildDeck). Adiciona 6 novos presets: fibonacci-modified,
powers-of-2, sequential, hours, risk, yes-no. pickPreview retorna até 4
valores do miolo do deck (excluindo ? e ☕) para uso no componente de preview.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Criar `DeckPreviewCards.vue`

**Files:**
- Create: `src/components/create/DeckPreviewCards.vue`
- Create: `tests/unit/components/DeckPreviewCards.test.ts`

- [ ] **Step 2.1: Escrever testes failing**

Criar `tests/unit/components/DeckPreviewCards.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DeckPreviewCards from '@/components/create/DeckPreviewCards.vue'

describe('DeckPreviewCards', () => {
  it('renderiza uma carta para cada valor', () => {
    const w = mount(DeckPreviewCards, { props: { values: ['1', '2', '3'] } })
    const cards = w.findAll('.preview-card')
    expect(cards).toHaveLength(3)
    expect(cards[0].text()).toBe('1')
    expect(cards[1].text()).toBe('2')
    expect(cards[2].text()).toBe('3')
  })

  it('aplica classes de tilt nas extremidades quando há 4 valores', () => {
    const w = mount(DeckPreviewCards, { props: { values: ['1', '2', '3', '5'] } })
    const cards = w.findAll('.preview-card')
    expect(cards[0].classes()).toContain('tilt-left')
    expect(cards[3].classes()).toContain('tilt-right')
    expect(cards[1].classes()).not.toContain('tilt-left')
    expect(cards[2].classes()).not.toContain('tilt-right')
  })

  it('atualiza ao trocar values', async () => {
    const w = mount(DeckPreviewCards, { props: { values: ['1', '2'] } })
    expect(w.findAll('.preview-card')).toHaveLength(2)
    await w.setProps({ values: ['A', 'B', 'C', 'D'] })
    const cards = w.findAll('.preview-card')
    expect(cards).toHaveLength(4)
    expect(cards.map(c => c.text())).toEqual(['A', 'B', 'C', 'D'])
  })
})
```

- [ ] **Step 2.2: Rodar testes — devem falhar**

Run: `bun run test tests/unit/components/DeckPreviewCards.test.ts`
Expected: FAIL — `Cannot find module '@/components/create/DeckPreviewCards.vue'`.

- [ ] **Step 2.3: Criar o componente**

Criar `src/components/create/DeckPreviewCards.vue`:

```vue
<script setup lang="ts">
defineProps<{ values: string[] }>()
</script>

<template>
  <div class="preview-row" aria-hidden="true">
    <div
      v-for="(v, i) in values"
      :key="`${i}-${v}`"
      class="preview-card"
      :class="{
        'tilt-left':  i === 0 && values.length === 4,
        'tilt-right': i === 3 && values.length === 4,
        'lift':       (i === 1 || i === 2) && values.length === 4,
      }"
    >
      {{ v }}
    </div>
  </div>
</template>

<style scoped>
.preview-row {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: flex-end;
  padding: 16px 8px 20px;
}
.preview-card {
  width: 72px;
  height: 104px;
  border-radius: 10px;
  background: linear-gradient(180deg,
    var(--color-paper-soft) 0%,
    var(--color-paper) 55%,
    var(--color-paper-deep) 100%);
  color: var(--color-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.6rem;
  font-feature-settings: "lnum", "tnum";
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 50%, transparent),
    0 6px 16px -4px rgb(var(--color-shadow) / 0.35);
  transition: transform 180ms cubic-bezier(.2,.7,.2,1);
}
.preview-card.tilt-left  { transform: rotate(-3deg); }
.preview-card.tilt-right { transform: rotate(3deg);  }
.preview-card.lift       { transform: translateY(-4px); }

@media (max-width: 767px) {
  .preview-card { width: 56px; height: 84px; font-size: 1.25rem; border-radius: 8px; }
}
</style>
```

- [ ] **Step 2.4: Rodar testes — devem passar**

Run: `bun run test tests/unit/components/DeckPreviewCards.test.ts`
Expected: PASS.

- [ ] **Step 2.5: Type check**

Run: `bun run lint:types`
Expected: PASS (sem novos erros — os de `DeckPicker.vue` / `CustomDeckEditor.vue` ainda podem existir, esperado).

- [ ] **Step 2.6: Commit**

```bash
git add src/components/create/DeckPreviewCards.vue tests/unit/components/DeckPreviewCards.test.ts
git commit -m "$(cat <<'EOF'
feat(create): DeckPreviewCards renderiza 4 cartas grandes

Componente visual usado pelo DeckPicker para mostrar preview do deck
selecionado. 72x104 desktop, 56x84 mobile. Tilt nas extremidades e
elevação no miolo quando há 4 cartas.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Reescrever `CustomDeckEditor.vue` como chip input

**Files:**
- Modify: `src/components/create/CustomDeckEditor.vue` (rewrite)
- Create: `tests/unit/components/CustomDeckEditor.test.ts`

- [ ] **Step 3.1: Escrever testes failing**

Criar `tests/unit/components/CustomDeckEditor.test.ts`:

```ts
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
    // modelValue não muda (chip não foi adicionado) — mas o componente pode emitir o mesmo valor.
    // O que importa: input limpo e ainda 2 chips na props.
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
    // não deve emitir um update com 31 chips
    const events = (w.emitted('update:modelValue') as string[][] | undefined) ?? []
    const last = events.length > 0 ? events[events.length - 1][0] : initial
    expect(last.split(',').length).toBeLessThanOrEqual(30)
  })
})
```

- [ ] **Step 3.2: Rodar testes — devem falhar**

Run: `bun run test tests/unit/components/CustomDeckEditor.test.ts`
Expected: FAIL — componente atual não tem chips, só `<TextField>` único.

- [ ] **Step 3.3: Reescrever o componente**

Substituir o conteúdo de `src/components/create/CustomDeckEditor.vue`:

```vue
<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const MAX_CHIPS = 30

const chips = computed(() =>
  props.modelValue
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
)

const typing = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function emitChips(next: string[]) {
  emit('update:modelValue', next.join(', '))
}

function addFromInput() {
  const raw = typing.value.trim()
  typing.value = ''
  if (!raw) return
  addValues([raw])
}

function addValues(values: string[]) {
  const current = chips.value
  const next = [...current]
  for (const v of values) {
    const trimmed = v.trim()
    if (!trimmed) continue
    if (next.includes(trimmed)) continue
    if (next.length >= MAX_CHIPS) break
    next.push(trimmed)
  }
  if (next.length !== current.length) {
    emitChips(next)
  }
}

function removeAt(index: number) {
  const next = chips.value.slice()
  next.splice(index, 1)
  emitChips(next)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    addFromInput()
  } else if (e.key === ',') {
    e.preventDefault()
    addFromInput()
  } else if (e.key === 'Backspace' && typing.value === '' && chips.value.length > 0) {
    e.preventDefault()
    removeAt(chips.value.length - 1)
  }
}

function onBlur() {
  if (typing.value.trim()) addFromInput()
}

function onPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text/plain') ?? ''
  if (!text.includes(',') && !text.includes('\n')) return
  e.preventDefault()
  const parts = text.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
  addValues(parts)
  typing.value = ''
}

defineExpose({
  focus: () => nextTick(() => inputRef.value?.focus()),
})
</script>

<template>
  <div class="chip-field" :class="{ 'is-focused': false }">
    <span class="field-label kicker">Valores do baralho</span>
    <div class="chip-wrap focus-gold" @click="inputRef?.focus()">
      <span v-for="(c, i) in chips" :key="`${i}-${c}`" class="chip">
        {{ c }}
        <button
          type="button"
          class="chip-remove"
          :aria-label="`Remover ${c}`"
          @click.stop="removeAt(i)"
        >×</button>
      </span>
      <input
        ref="inputRef"
        type="text"
        class="chip-input"
        v-model="typing"
        :placeholder="chips.length === 0 ? 'digite e tecle Enter…' : ''"
        @keydown="onKeydown"
        @blur="onBlur"
        @paste="onPaste"
      />
    </div>
    <p class="chip-hint kicker">Enter adiciona · Backspace remove · mínimo 2 valores</p>
  </div>
</template>

<style scoped>
.chip-field { display: flex; flex-direction: column; gap: 6px; }
.field-label { display: block; }
.chip-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent);
  min-height: 56px;
  cursor: text;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.chip-wrap:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px 5px 12px;
  border-radius: 999px;
  background: var(--color-brand);
  color: var(--color-paper-soft);
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 500;
}
.chip-remove {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  border-radius: 999px;
  font-size: 0.95rem;
  line-height: 1;
}
.chip-remove:hover, .chip-remove:focus-visible { opacity: 1; outline: none; }
.chip-input {
  flex: 1;
  min-width: 90px;
  background: transparent;
  border: 0;
  outline: 0;
  padding: 4px 6px;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 14, "SOFT" 60, "wght" 400;
  font-size: 1rem;
}
.chip-input::placeholder {
  color: color-mix(in srgb, var(--color-ink) 40%, transparent);
}
.chip-hint { font-size: 0.65rem; margin: 0; }
</style>
```

- [ ] **Step 3.4: Rodar testes — devem passar**

Run: `bun run test tests/unit/components/CustomDeckEditor.test.ts`
Expected: PASS — todos os 10 testes verdes.

- [ ] **Step 3.5: Type check**

Run: `bun run lint:types`
Expected: PASS para este arquivo. (Erros remanescentes em `DeckPicker.vue` ainda OK.)

- [ ] **Step 3.6: Commit**

```bash
git add src/components/create/CustomDeckEditor.vue tests/unit/components/CustomDeckEditor.test.ts
git commit -m "$(cat <<'EOF'
feat(create): CustomDeckEditor com chip input

Substitui o input único de valores separados por vírgula por chips/tags:
Enter ou , adiciona, Backspace com input vazio remove o último, paste
com vírgulas split automaticamente. Limite de 30 chips. Compatível com
o modelValue string que CreateSessionView e buildDeck consomem.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Reescrever `DeckPicker.vue` como dropdown + preview/custom

**Files:**
- Modify: `src/components/create/DeckPicker.vue` (rewrite)
- Create: `tests/unit/components/DeckPicker.test.ts`

- [ ] **Step 4.1: Escrever testes failing**

Criar `tests/unit/components/DeckPicker.test.ts`:

```ts
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
```

- [ ] **Step 4.2: Rodar testes — devem falhar**

Run: `bun run test tests/unit/components/DeckPicker.test.ts`
Expected: FAIL — o componente atual ainda usa radios; espera-se erro em `findComponent({ name: 'DeckPreviewCards' })` (nunca renderizado) etc.

- [ ] **Step 4.3: Reescrever o componente**

Substituir o conteúdo de `src/components/create/DeckPicker.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { DeckType } from '@/types/room'
import { DECK_PRESETS, pickPreview } from '@/lib/decks'
import DeckPreviewCards from './DeckPreviewCards.vue'
import CustomDeckEditor from './CustomDeckEditor.vue'

const props = defineProps<{
  modelValue: DeckType
  customRaw: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: DeckType]
  'update:customRaw': [value: string]
}>()

const activePreset = computed(() =>
  DECK_PRESETS.find(p => p.type === props.modelValue) ?? null
)
const previewValues = computed(() =>
  activePreset.value ? pickPreview(activePreset.value.values) : []
)

function onSelectChange(e: Event) {
  emit('update:modelValue', (e.target as HTMLSelectElement).value as DeckType)
}
</script>

<template>
  <div class="deck-picker">
    <label class="field-label kicker">Baralho</label>
    <select
      class="deck-select focus-gold"
      :value="modelValue"
      @change="onSelectChange"
    >
      <option v-for="p in DECK_PRESETS" :key="p.type" :value="p.type">{{ p.label }}</option>
      <option value="custom">Customizado</option>
    </select>

    <p v-if="activePreset" class="deck-description">{{ activePreset.description }}</p>

    <DeckPreviewCards v-if="modelValue !== 'custom'" :values="previewValues" />
    <CustomDeckEditor
      v-else
      :model-value="customRaw"
      @update:model-value="(v: string) => emit('update:customRaw', v)"
    />
  </div>
</template>

<style scoped>
.deck-picker { display: flex; flex-direction: column; gap: 8px; }
.field-label { display: block; }
.deck-select {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  padding: 12px 40px 12px 16px;
  border-radius: 12px;
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 14, "SOFT" 60, "wght" 400;
  font-size: 1rem;
  color: var(--color-ink);
  background-color: var(--color-surface);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'><path fill='%2314241b' d='M3 5l4 4 4-4z'/></svg>");
  background-repeat: no-repeat;
  background-position: right 14px center;
  border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent);
  outline: none;
  cursor: pointer;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.deck-select:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent);
}
.deck-description {
  font-size: 0.78rem;
  font-style: italic;
  color: var(--color-muted);
  margin: 2px 0 0;
}
</style>
```

- [ ] **Step 4.4: Rodar todos os testes**

Run: `bun run test`
Expected: PASS — incluindo `DeckPicker.test.ts` e tudo que já passava.

- [ ] **Step 4.5: Type check**

Run: `bun run lint:types`
Expected: PASS — `DeckPicker.vue` agora consistente com o resto.

- [ ] **Step 4.6: Commit**

```bash
git add src/components/create/DeckPicker.vue tests/unit/components/DeckPicker.test.ts
git commit -m "$(cat <<'EOF'
feat(create): DeckPicker como dropdown + preview de cartas

Substitui radios de baralho por <select> nativo estilizado. Renderiza
DeckPreviewCards com pickPreview do deck selecionado, ou CustomDeckEditor
quando 'custom'. Mostra a description do preset abaixo do select.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Criar `HowItWorksCarousel.vue`

**Files:**
- Create: `src/components/create/HowItWorksCarousel.vue`
- Create: `tests/unit/components/HowItWorksCarousel.test.ts`

- [ ] **Step 5.1: Escrever testes failing**

Criar `tests/unit/components/HowItWorksCarousel.test.ts`:

```ts
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
    await vi.advanceTimersByTimeAsync(5000 * 4) // 4 ciclos
    const scenes = w.findAll('[role="group"]')
    expect(scenes[0].attributes('aria-hidden')).toBe('false')
  })

  it('pointerenter pausa o timer', async () => {
    const w = mount(HowItWorksCarousel)
    await w.get('.carousel').trigger('pointerenter')
    await vi.advanceTimersByTimeAsync(5000)
    const scenes = w.findAll('[role="group"]')
    expect(scenes[0].attributes('aria-hidden')).toBe('false') // ainda na 1
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
    // ainda na 3 (5s não passaram desde o click)
    let scenes = w.findAll('[role="group"]')
    expect(scenes[2].attributes('aria-hidden')).toBe('false')
    await vi.advanceTimersByTimeAsync(600)
    scenes = w.findAll('[role="group"]')
    expect(scenes[3].attributes('aria-hidden')).toBe('false')
  })
})
```

- [ ] **Step 5.2: Rodar testes — devem falhar**

Run: `bun run test tests/unit/components/HowItWorksCarousel.test.ts`
Expected: FAIL — componente não existe.

- [ ] **Step 5.3: Criar o componente**

Criar `src/components/create/HowItWorksCarousel.vue`:

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface Scene {
  kicker: string
  title: string
  description: string
}

const SCENES: Scene[] = [
  {
    kicker: 'PASSO 1 DE 4',
    title: 'Crie uma sala em segundos',
    description: 'Sem cadastro. Escolha o baralho e pronto.',
  },
  {
    kicker: 'PASSO 2 DE 4',
    title: 'Compartilhe o link com o time',
    description: 'Cola no chat — quem entrar entra na hora.',
  },
  {
    kicker: 'PASSO 3 DE 4',
    title: 'Vote em segredo',
    description: 'Ninguém vê os votos até o moderador revelar.',
  },
  {
    kicker: 'PASSO 4 DE 4',
    title: 'Revele e veja as estatísticas',
    description: 'Média, moda, distribuição na hora.',
  },
]

const INTERVAL_MS = 5000
const activeIndex = ref(0)
const timerId = ref<ReturnType<typeof setTimeout> | null>(null)
const paused = ref(false)

const reducedMotion = computed(() => {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
})

function clearTimer() {
  if (timerId.value !== null) {
    clearTimeout(timerId.value)
    timerId.value = null
  }
}

function scheduleNext() {
  clearTimer()
  if (reducedMotion.value || paused.value) return
  timerId.value = setTimeout(() => {
    activeIndex.value = (activeIndex.value + 1) % SCENES.length
    scheduleNext()
  }, INTERVAL_MS)
}

function goTo(index: number) {
  activeIndex.value = index
  scheduleNext()
}

function onPointerEnter() { paused.value = true;  clearTimer() }
function onPointerLeave() { paused.value = false; scheduleNext() }
function onFocusIn()      { paused.value = true;  clearTimer() }
function onFocusOut()     { paused.value = false; scheduleNext() }

watch(reducedMotion, (rm) => { if (rm) clearTimer() })

onMounted(() => { scheduleNext() })
onBeforeUnmount(() => { clearTimer() })
</script>

<template>
  <section
    class="carousel"
    role="region"
    aria-roledescription="carousel"
    aria-label="Como funciona o Planning Poker"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <div class="scenes">
      <div
        v-for="(scene, i) in SCENES"
        :key="i"
        class="scene"
        role="group"
        aria-roledescription="slide"
        :aria-label="`${i + 1} de ${SCENES.length}`"
        :aria-hidden="i !== activeIndex ? 'true' : 'false'"
      >
        <p class="kicker">{{ scene.kicker }}</p>
        <h2 class="scene-title">{{ scene.title }}</h2>
        <p class="scene-desc" aria-live="polite">{{ scene.description }}</p>
        <div class="scene-art" aria-hidden="true">
          <div class="card t1">{{ ['3', '5', '8', '13'][i] }}</div>
          <div class="card mid">{{ ['5', '8', '13', '20'][i] }}</div>
          <div class="card t3">{{ ['8', '13', '20', '40'][i] }}</div>
        </div>
      </div>
    </div>

    <div class="dots" role="tablist">
      <button
        v-for="(_, i) in SCENES"
        :key="i"
        type="button"
        class="dot"
        :class="{ active: i === activeIndex }"
        :aria-label="`Ir para passo ${i + 1}`"
        :aria-current="i === activeIndex ? 'step' : undefined"
        @click="goTo(i)"
      />
    </div>
  </section>
</template>

<style scoped>
.carousel {
  position: relative;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--color-accent) 14%, var(--color-canvas)),
    color-mix(in srgb, var(--color-brand) 12%, var(--color-canvas)));
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--color-accent) 24%, transparent);
  padding: 32px 28px 24px;
  overflow: hidden;
  min-height: 380px;
}
.scenes { position: relative; min-height: 280px; }
.scene {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: opacity 250ms ease;
  opacity: 0;
  pointer-events: none;
}
.scene[aria-hidden="false"] {
  opacity: 1;
  pointer-events: auto;
  position: relative;
}
.scene-title {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 2.5vw, 2.2rem);
  line-height: 1.1;
  color: var(--color-ink);
  margin: 0;
}
.scene-desc {
  color: var(--color-muted);
  font-size: 0.95rem;
  margin: 0 0 8px;
  max-width: 44ch;
}
.scene-art {
  margin-top: auto;
  display: flex;
  gap: 12px;
  justify-content: flex-start;
  align-items: flex-end;
  padding-top: 12px;
}
.card {
  width: 56px; height: 80px;
  border-radius: 10px;
  background: linear-gradient(180deg, var(--color-paper-soft), var(--color-paper-deep));
  color: var(--color-ink);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display); font-weight: 700; font-size: 1.2rem;
  box-shadow: 0 4px 12px rgb(var(--color-shadow) / 0.35), inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 45%, transparent);
}
.card.t1  { transform: rotate(-6deg); }
.card.t3  { transform: rotate(6deg); }
.card.mid { transform: translateY(-4px); }

.dots { display: flex; gap: 8px; justify-content: center; margin-top: 18px; }
.dot {
  width: 8px; height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-ink) 18%, transparent);
  border: 0;
  padding: 0;
  cursor: pointer;
  transition: background 180ms ease, width 180ms ease;
}
.dot.active { background: var(--color-accent); width: 24px; }
.dot:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; }

@media (prefers-reduced-motion: reduce) {
  .scene { transition: none; }
}
</style>
```

- [ ] **Step 5.4: Rodar testes**

Run: `bun run test tests/unit/components/HowItWorksCarousel.test.ts`
Expected: PASS — todos os 8 testes verdes.

Se algum teste falhar em `aria-hidden`: pode ser que `:aria-hidden="..."` esteja serializando boolean em vez de string. O template usa `i !== activeIndex ? 'true' : 'false'` (strings literais) — verifique que essa expressão exata está no template. Se ainda falhar, ajuste o teste para usar `attributes('aria-hidden')` direto (já está usando).

- [ ] **Step 5.5: Type check**

Run: `bun run lint:types`
Expected: PASS.

- [ ] **Step 5.6: Commit**

```bash
git add src/components/create/HowItWorksCarousel.vue tests/unit/components/HowItWorksCarousel.test.ts
git commit -m "$(cat <<'EOF'
feat(create): HowItWorksCarousel com 4 cenas auto-rotacionadas

Carrossel explicativo da coluna esquerda da tela "Criar sala". Rotaciona
a cada 5s, pausa em hover/foco, retoma ao sair. Respeita
prefers-reduced-motion. Dots clicáveis reiniciam a contagem.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Reescrever `CreateSessionView.vue` com layout 70/30

**Files:**
- Modify: `src/views/CreateSessionView.vue` (rewrite)

- [ ] **Step 6.1: Reescrever o view**

Substituir o conteúdo de `src/views/CreateSessionView.vue`:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import TextField from '@/components/ui/TextField.vue'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'
import GhostButton from '@/components/ui/GhostButton.vue'
import DeckPicker from '@/components/create/DeckPicker.vue'
import HowItWorksCarousel from '@/components/create/HowItWorksCarousel.vue'
import { useAuth } from '@/composables/useAuth'
import { useToasts } from '@/composables/useToasts'
import { buildDeck } from '@/lib/decks'
import { createRoom } from '@/services/firebase/rooms'
import type { DeckType } from '@/types/room'

const router = useRouter()
const { uid } = useAuth()
const toasts = useToasts()

const roomName = ref('')
const moderatorName = ref(localStorage.getItem('pp:lastName') ?? '')
const deckType = ref<DeckType>('fibonacci')
const customRaw = ref('')
const submitting = ref(false)

const customChipsCount = computed(() =>
  customRaw.value.split(',').map(s => s.trim()).filter(Boolean).length
)

const canSubmit = computed(() =>
  roomName.value.trim().length > 0
  && moderatorName.value.trim().length > 0
  && (deckType.value !== 'custom' || customChipsCount.value >= 2)
  && uid.value !== null
  && !submitting.value,
)

async function submit() {
  if (!canSubmit.value || !uid.value) return
  submitting.value = true
  try {
    const deck = buildDeck({
      type: deckType.value,
      customValues: deckType.value === 'custom' ? customRaw.value.split(',') : undefined,
    })
    const id = await createRoom({
      name: roomName.value,
      deck,
      moderatorName: moderatorName.value,
      moderatorUid: uid.value,
    })
    localStorage.setItem('pp:lastName', moderatorName.value.trim())
    router.push({ name: 'room', params: { id } })
  } catch (err) {
    toasts.push((err as Error).message, 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="create-page">
    <div class="create-grid">
      <aside class="create-aside">
        <HowItWorksCarousel />
      </aside>

      <section class="create-form">
        <h1 class="form-title">Criar sala</h1>

        <TextField v-model="roomName" label="Nome da sala" placeholder="Sprint 42 — backend" :maxlength="60" />
        <TextField v-model="moderatorName" label="Seu nome" placeholder="Como você quer ser visto" :maxlength="30" />
        <DeckPicker v-model="deckType" v-model:custom-raw="customRaw" />

        <div class="form-actions">
          <GhostButton @click="router.push({ name: 'home' })">Cancelar</GhostButton>
          <PrimaryButton :disabled="!canSubmit" @click="submit">
            {{ submitting ? 'Criando…' : 'Criar sala' }}
          </PrimaryButton>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.create-page {
  max-width: 72rem;
  margin: 0 auto;
  padding: 32px 16px 64px;
}
.create-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  align-items: start;
}
@media (min-width: 768px) {
  .create-grid { grid-template-columns: 7fr 3fr; gap: 40px; }
  .create-aside { position: sticky; top: 88px; align-self: start; }
}
.create-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.form-title {
  font-size: clamp(1.6rem, 3vw, 2.1rem);
  margin: 0 0 4px;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
```

- [ ] **Step 6.2: Rodar todos os testes**

Run: `bun run test`
Expected: PASS — todos os testes continuam verdes.

- [ ] **Step 6.3: Type check**

Run: `bun run lint:types`
Expected: PASS — sem erros.

- [ ] **Step 6.4: Smoke manual rápido**

Em outro terminal, rodar `bun run emu` (emulator do Firebase) e em outro terminal `bun run dev`. Abrir <http://localhost:5173>, clicar "Criar sala", verificar:

- Layout 70/30 visível no desktop. Carrossel à esquerda rotaciona.
- Mobile (DevTools < 768px): carrossel em cima, form embaixo.
- Trocar baralho no `<select>` mostra preview de cartas grandes.
- Escolher "Customizado": preview some, chip input aparece. Digitar `1` + Enter cria chip; Backspace com input vazio remove; clicar `×` no chip remove.
- Criar sala com Fibonacci modificado funciona — verificar `deck.values` no UI do emulator (<http://localhost:4000>).
- Criar sala com customizado de 2 chips funciona; com 1 chip o botão fica desabilitado.

Se algo quebrar, parar e investigar antes de seguir para o commit.

- [ ] **Step 6.5: Commit**

```bash
git add src/views/CreateSessionView.vue
git commit -m "$(cat <<'EOF'
feat(create): layout 70/30 com carrossel + form

CreateSessionView reescrita: HowItWorksCarousel à esquerda (70%) e form
à direita (30%) no desktop; empilha no mobile. canSubmit para custom
agora exige >= 2 chips em vez de string não-vazia.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Transição fade+lift entre todas as rotas

**Files:**
- Modify: `src/App.vue`
- Modify: `src/style.css` (acrescentar no final, dentro de `@layer utilities`)

- [ ] **Step 7.1: Envolver `<RouterView>` com `<Transition>`**

Substituir o template de `src/App.vue`:

```vue
<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import ToastsLayer from '@/components/ToastsLayer.vue'
</script>

<template>
  <AppHeader />
  <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
  <ToastsLayer />
</template>
```

- [ ] **Step 7.2: Adicionar CSS da transição em `src/style.css`**

Acrescentar dentro do bloco `@layer utilities { … }` existente (antes do `}` final), logo após `.focus-gold:focus-visible { … }`:

```css
  /* Transição entre rotas — fade + lift */
  .page-enter-active,
  .page-leave-active {
    transition: opacity 320ms ease, transform 380ms cubic-bezier(.2, .7, .2, 1);
  }
  .page-enter-from {
    opacity: 0;
    transform: translateY(20px);
  }
  .page-leave-to {
    opacity: 0;
    transform: translateY(-20px);
  }

  @media (prefers-reduced-motion: reduce) {
    .page-enter-active,
    .page-leave-active {
      transition: opacity 120ms ease;
    }
    .page-enter-from,
    .page-leave-to {
      transform: none;
    }
  }
```

- [ ] **Step 7.3: Rodar todos os testes**

Run: `bun run test`
Expected: PASS — nada foi quebrado.

- [ ] **Step 7.4: Type check**

Run: `bun run lint:types`
Expected: PASS.

- [ ] **Step 7.5: Smoke manual da transição**

Com `bun run dev` rodando, abrir <http://localhost:5173> e verificar:

- Home → Criar sala: tela sai subindo + fade, próxima entra subindo + fade. Duração ~700ms total (out-in).
- Criar sala → Home (botão Cancelar): mesma transição em sentido inverso visual (na verdade é a mesma direção — out depois in).
- Criar sala → Sala (após criar): transição visível.
- Sala → Home (back do navegador): transição visível.
- DevTools → Rendering → Emulate CSS prefers-reduced-motion: reduce → transições rápidas só com opacity, sem translate.

- [ ] **Step 7.6: Commit**

```bash
git add src/App.vue src/style.css
git commit -m "$(cat <<'EOF'
feat(transitions): fade+lift entre todas as rotas

<RouterView> envolto por <Transition name="page" mode="out-in">.
CSS em @layer utilities respeita prefers-reduced-motion. AppHeader e
ToastsLayer ficam fora do Transition para não piscar.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Verificação final

- [ ] **Step F.1: Suite completa**

Run: `bun run test`
Expected: PASS.

Run: `bun run lint:types`
Expected: PASS.

Run: `bun run test:integration`
Expected: PASS (não foi tocada, mas confirma que o build do projeto está sadio).

- [ ] **Step F.2: Smoke manual abrangente**

Com `bun run emu` + `bun run dev`:

1. Home → Criar sala (transição visível).
2. Em "Criar sala", para cada um dos 8 presets:
   - Selecionar no `<select>`.
   - Description aparece abaixo.
   - 4 cartas grandes aparecem como preview (ou menos para Sim/Não, Risco).
3. Selecionar "Customizado":
   - Cartas de preview somem.
   - Chip input recebe foco.
   - Digite `1` Enter → chip "1".
   - Digite `2, 3, 5` (colando) → 3 chips novos.
   - Click no `×` do "2" → remove.
   - Backspace com input vazio → remove o último.
   - Tente adicionar "1" novamente → silenciosamente ignorado.
   - Com 1 chip, botão "Criar sala" desabilitado; com 2+, habilitado.
4. Criar sala com cada preset. Conferir no UI do emulator (<http://localhost:4000>) que `deck.type` e `deck.values` chegam corretos no Firestore.
5. Criar sala com custom (`1, 2, 3, 5, 8`). Conferir Firestore.
6. Entrar em uma sala criada (Home → Entrar com link, colar UUID). Transição visível.
7. DevTools < 768px (mobile):
   - Carrossel acima do form.
   - Preview de cartas em tamanho menor.
   - Chip input continua funcional.
8. DevTools → Emulate prefers-reduced-motion: reduce:
   - Carrossel para de auto-rotacionar.
   - Transição de rota fica curta, só opacity.

- [ ] **Step F.3: Limpeza opcional**

Se quiser, remova o diretório de mockups do brainstorming (não rastreado pelo git):

```bash
rm -rf .superpowers/brainstorm
```

---

## Dependências entre tasks

```
Task 1 (decks.ts)
  ↓
Task 2 (DeckPreviewCards)  ─┐
Task 3 (CustomDeckEditor)  ─┤
                            ├→ Task 4 (DeckPicker)
                            │
Task 5 (HowItWorksCarousel) ─┤
                            ↓
                         Task 6 (CreateSessionView)
                            ↓
                         Task 7 (App.vue Transition) — independente, pode ir antes ou depois
```

Tasks 2, 3, 5 podem ser feitas em paralelo após Task 1. Task 4 depende de 1, 2, 3. Task 6 depende de 4 e 5. Task 7 é independente das outras.
