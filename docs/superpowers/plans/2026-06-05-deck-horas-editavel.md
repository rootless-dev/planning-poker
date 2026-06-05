# Deck "Horas" editável (minutos → rótulos) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a opção de deck "Horas" num deck editável onde o usuário digita minutos que são convertidos para rótulos de horas (`60 → 1:00`), com validação de inteiros e reflexo no cálculo da revelação.

**Architecture:** O sinal de "modo horas" é `deck.type === 'hours'` — sem flag nova no schema. O valor canônico armazenado é o rótulo formatado (`"15m"`, `"1:00"`); o voto é o próprio rótulo. Um utilitário `src/lib/duration.ts` é a fonte única do formato (usado pelo editor, por `buildDeck` e por `stats`). O cálculo faz parse do rótulo de volta para minutos.

**Tech Stack:** Vue 3 (`<script setup>` + Composition API), TypeScript, Vitest + @vue/test-utils (happy-dom), vue-i18n.

**Convenções deste projeto (obrigatórias):**
- Sempre `bun` — nunca `npm`/`npx`. Rodar a suíte: `bun run test`. Rodar um arquivo: `bun x vitest run <caminho>`. Typecheck: `bun run lint:types`.
- Testes usam o `i18n` real (instalado globalmente em `tests/setup.ts`, locale `pt-BR`). Asserts de mensagens usam `i18n.global.t('chave')` — nunca hardcode a string traduzida.
- `localStorage` é in-memory no setup; limpe com `localStorage.clear()` no `beforeEach`.

---

## File Structure

**Criar:**
- `src/lib/duration.ts` — format/parse/validação de minutos↔rótulos (fonte única do formato).
- `tests/unit/lib/duration.test.ts` — testes do utilitário.
- `tests/unit/components/ResultsPanel.test.ts` — testes de formatação em horas no painel.

**Modificar:**
- `src/i18n/locales/{pt-BR,en,es}.json` — novas chaves + descrição de Horas.
- `src/lib/decks.ts` — remover Horas dos presets; ramo `'hours'` no `buildDeck`.
- `src/lib/customDeckStorage.ts` — persistência própria do deck Horas.
- `src/lib/stats.ts` — `computeStats(votes, unit?)` com parse de horas e limiar de divergência.
- `src/components/create/CustomDeckEditor.vue` — prop `hoursMode`: conversão exibida, chip inválido, mensagem de erro.
- `src/components/create/DeckPicker.vue` — opção "Horas", editor para horas, v-model `hoursRaw`, descrição.
- `src/components/room/ResultsPanel.vue` — prop `unit`, formatação de média/min/max.
- `src/views/CreateSessionView.vue` — estado `hoursRaw`, `canSubmit`, `submit`, persistência.
- `src/views/RoomView.vue` — passar `:unit` ao `ResultsPanel`.

**Testes a ajustar:**
- `tests/unit/lib/decks.test.ts` — remover asserts do preset Horas; adicionar ramo horas.
- `tests/unit/lib/stats.test.ts` — adicionar casos do modo horas.
- `tests/unit/lib/customDeckStorage.test.ts` — adicionar casos do deck Horas.
- `tests/unit/components/CustomDeckEditor.test.ts` — adicionar casos de `hoursMode`.
- `tests/unit/components/DeckPicker.test.ts` — atualizar contagem de opções + casos de Horas.

---

## Task 1: Utilitário `duration.ts`

**Files:**
- Create: `src/lib/duration.ts`
- Test: `tests/unit/lib/duration.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `tests/unit/lib/duration.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatMinutes, parseDurationLabel, isValidMinutes } from '@/lib/duration'

describe('formatMinutes', () => {
  it('valores abaixo de 60 viram Nm', () => {
    expect(formatMinutes(0)).toBe('0m')
    expect(formatMinutes(15)).toBe('15m')
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(59)).toBe('59m')
  })
  it('60+ vira H:MM com minutos em 2 dígitos', () => {
    expect(formatMinutes(60)).toBe('1:00')
    expect(formatMinutes(75)).toBe('1:15')
    expect(formatMinutes(90)).toBe('1:30')
    expect(formatMinutes(120)).toBe('2:00')
    expect(formatMinutes(605)).toBe('10:05')
  })
})

describe('parseDurationLabel', () => {
  it('parseia Nm', () => {
    expect(parseDurationLabel('15m')).toBe(15)
    expect(parseDurationLabel('0m')).toBe(0)
  })
  it('parseia H:MM', () => {
    expect(parseDurationLabel('1:00')).toBe(60)
    expect(parseDurationLabel('1:30')).toBe(90)
    expect(parseDurationLabel('2:05')).toBe(125)
  })
  it('retorna null para formato inválido', () => {
    expect(parseDurationLabel('abc')).toBeNull()
    expect(parseDurationLabel('15')).toBeNull()
    expect(parseDurationLabel('1:5')).toBeNull()
    expect(parseDurationLabel('1:60')).toBeNull()
    expect(parseDurationLabel('')).toBeNull()
  })
})

describe('isValidMinutes', () => {
  it('aceita inteiros não-negativos', () => {
    expect(isValidMinutes('0')).toBe(true)
    expect(isValidMinutes('15')).toBe(true)
    expect(isValidMinutes('600')).toBe(true)
  })
  it('rejeita não-inteiros', () => {
    expect(isValidMinutes('15m')).toBe(false)
    expect(isValidMinutes('abc')).toBe(false)
    expect(isValidMinutes('1:30')).toBe(false)
    expect(isValidMinutes('1.5')).toBe(false)
    expect(isValidMinutes('-5')).toBe(false)
    expect(isValidMinutes('')).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `bun x vitest run tests/unit/lib/duration.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/duration"`.

- [ ] **Step 3: Implementar o utilitário**

Criar `src/lib/duration.ts`:

```ts
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

export function parseDurationLabel(label: string): number | null {
  const minutesMatch = /^(\d+)m$/.exec(label)
  if (minutesMatch) return Number(minutesMatch[1])
  const hoursMatch = /^(\d+):([0-5]\d)$/.exec(label)
  if (hoursMatch) return Number(hoursMatch[1]) * 60 + Number(hoursMatch[2])
  return null
}

export function isValidMinutes(token: string): boolean {
  return /^\d+$/.test(token)
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `bun x vitest run tests/unit/lib/duration.test.ts`
Expected: PASS (3 describes, todos verdes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/duration.ts tests/unit/lib/duration.test.ts
git commit -m "feat(duration): util de conversão minutos↔rótulos de horas"
```

---

## Task 2: Chaves de i18n (3 locales)

**Files:**
- Modify: `src/i18n/locales/pt-BR.json`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/es.json`

> O tipo `MessageSchema` é `typeof ptBR`. As três línguas precisam ter exatamente as mesmas chaves, senão `bun run lint:types` falha.

- [ ] **Step 1: pt-BR — atualizar descrição de Horas**

Em `src/i18n/locales/pt-BR.json`, no objeto `decks.hours`, trocar a `description`:

De:
```json
    "description": "Estimativa direta em horas para tarefas pequenas."
```
Para:
```json
    "description": "Digite minutos no editor; convertidos para horas (60 vira 1:00)."
```

- [ ] **Step 2: pt-BR — adicionar chaves em `customEditor` e `errors`**

Em `decks.customEditor`, trocar a linha do `removeChip` para incluir as novas chaves:

De:
```json
    "removeChip": "Remover {value}"
```
Para:
```json
    "removeChip": "Remover {value}",
    "hoursHint": "digite minutos · 60 vira 1:00 · mínimo 2 valores",
    "invalidValues": "Valores inválidos. Use apenas números (minutos)."
```

Em `decks.errors`, trocar a linha do `unknownType`:

De:
```json
    "unknownType": "Tipo de deck desconhecido: {type}"
```
Para:
```json
    "unknownType": "Tipo de deck desconhecido: {type}",
    "invalidHoursValues": "Deck de horas aceita apenas números (minutos)"
```

- [ ] **Step 3: en — mesmas alterações**

`decks.hours.description`:
```json
    "description": "Type minutes in the editor; converted to hours (60 becomes 1:00)."
```
`decks.customEditor` (após `removeChip`):
```json
    "removeChip": "Remove {value}",
    "hoursHint": "type minutes · 60 becomes 1:00 · minimum 2 values",
    "invalidValues": "Invalid values. Use numbers only (minutes)."
```
`decks.errors` (após `unknownType`):
```json
    "unknownType": "Unknown deck type: {type}",
    "invalidHoursValues": "Hours deck accepts numbers only (minutes)"
```

- [ ] **Step 4: es — mesmas alterações**

`decks.hours.description`:
```json
    "description": "Escribe minutos en el editor; convertidos a horas (60 se vuelve 1:00)."
```
`decks.customEditor` (após `removeChip`):
```json
    "removeChip": "Quitar {value}",
    "hoursHint": "escribe minutos · 60 se vuelve 1:00 · mínimo 2 valores",
    "invalidValues": "Valores no válidos. Usa solo números (minutos)."
```
`decks.errors` (após `unknownType`):
```json
    "unknownType": "Tipo de baraja desconocido: {type}",
    "invalidHoursValues": "La baraja de horas solo acepta números (minutos)"
```

- [ ] **Step 5: Verificar sintaxe JSON + tipos**

Run: `bun run lint:types`
Expected: PASS (as 3 línguas em sincronia; nenhum erro de chave faltando).

- [ ] **Step 6: Commit**

```bash
git add src/i18n/locales/pt-BR.json src/i18n/locales/en.json src/i18n/locales/es.json
git commit -m "feat(i18n): chaves do deck Horas editável (hoursHint, invalidValues, erro)"
```

---

## Task 3: `buildDeck` — remover Horas dos presets e adicionar ramo editável

**Files:**
- Modify: `src/lib/decks.ts`
- Test: `tests/unit/lib/decks.test.ts`

- [ ] **Step 1: Ajustar os testes (failing)**

Em `tests/unit/lib/decks.test.ts`:

(a) Trocar o teste de presets — agora são 7, sem `'hours'`:

De:
```ts
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
```
Para:
```ts
  it('contém os 7 presets esperados (Horas é editável, fora dos presets)', () => {
    const types = DECK_PRESETS.map(p => p.type)
    expect(types).toEqual([
      'fibonacci',
      'fibonacci-modified',
      'tshirt',
      'powers-of-2',
      'sequential',
      'risk',
      'yes-no',
    ])
  })
```

(b) Remover o teste do preset Horas inteiro:

```ts
  it('Horas inclui ½h e 16h', () => {
    const deck = buildDeck({ type: 'hours' })
    expect(deck.values).toEqual(['½h', '1h', '2h', '4h', '8h', '16h', '?', '☕'])
  })
```

(c) Adicionar um novo bloco `describe` logo após o bloco `describe('buildDeck — custom', ...)`:

```ts
describe('buildDeck — horas', () => {
  it('converte minutos em rótulos preservando a ordem', () => {
    const deck = buildDeck({ type: 'hours', customValues: ['15', '60', '90'] })
    expect(deck.type).toBe('hours')
    expect(deck.values).toEqual(['15m', '1:00', '1:30'])
  })

  it('deduplica rótulos preservando a primeira ocorrência', () => {
    const deck = buildDeck({ type: 'hours', customValues: ['60', '60', '15'] })
    expect(deck.values).toEqual(['1:00', '15m'])
  })

  it('faz trim e ignora vazios', () => {
    const deck = buildDeck({ type: 'hours', customValues: [' 15 ', '', '60', ' '] })
    expect(deck.values).toEqual(['15m', '1:00'])
  })

  it('rejeita tokens não-numéricos', () => {
    expect(() => buildDeck({ type: 'hours', customValues: ['15', '15m'] }))
      .toThrow(i18n.global.t('decks.errors.invalidHoursValues'))
  })

  it('rejeita menos de 2 rótulos únicos', () => {
    expect(() => buildDeck({ type: 'hours', customValues: ['60', '60'] }))
      .toThrow(i18n.global.t('decks.errors.needTwoValues'))
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun x vitest run tests/unit/lib/decks.test.ts`
Expected: FAIL — preset Horas ainda existe; ramo `'hours'` cai no preset/`unknownType`.

- [ ] **Step 3: Editar `src/lib/decks.ts`**

(a) Adicionar o import no topo (logo após o import do `i18n`):

```ts
import { formatMinutes, isValidMinutes } from './duration'
```

(b) Apertar o tipo de `DeckPreset.type` (linha ~5):

De:
```ts
  type: Exclude<DeckType, 'custom'>
```
Para:
```ts
  type: Exclude<DeckType, 'custom' | 'hours'>
```

(c) Remover o objeto do preset Horas do array `DECK_PRESETS`:

```ts
  {
    type: 'hours',
    labelKey: 'decks.hours.name',
    descKey: 'decks.hours.description',
    values: ['½h', '1h', '2h', '4h', '8h', '16h', '?', '☕'],
  },
```

(d) No `buildDeck`, adicionar o ramo `'hours'` logo após o bloco `if (opts.type === 'custom') { ... }` e antes do lookup de preset:

```ts
  if (opts.type === 'hours') {
    const tokens = (opts.customValues ?? [])
      .map(v => v.trim())
      .filter(v => v.length > 0)
    if (tokens.some(t => !isValidMinutes(t))) {
      throw new Error(i18n.global.t('decks.errors.invalidHoursValues'))
    }
    const labels = tokens.map(t => formatMinutes(Number(t)))
    const unique = Array.from(new Set(labels))
    if (unique.length < 2) {
      throw new Error(i18n.global.t('decks.errors.needTwoValues'))
    }
    return { type: 'hours', values: unique }
  }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun x vitest run tests/unit/lib/decks.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `bun run lint:types`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/decks.ts tests/unit/lib/decks.test.ts
git commit -m "feat(decks): Horas vira deck editável (minutos→rótulos) fora dos presets"
```

---

## Task 4: Persistência do deck Horas

**Files:**
- Modify: `src/lib/customDeckStorage.ts`
- Test: `tests/unit/lib/customDeckStorage.test.ts`

- [ ] **Step 1: Adicionar testes (failing)**

Em `tests/unit/lib/customDeckStorage.test.ts`, ajustar o import e adicionar casos.

Trocar o import (linha 2):
```ts
import {
  loadLastCustomDeck,
  saveLastCustomDeck,
  loadLastHoursDeck,
  saveLastHoursDeck,
} from '@/lib/customDeckStorage'
```

Adicionar um novo `describe` no fim do arquivo:
```ts
describe('customDeckStorage — horas', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('retorna string vazia quando não há nada salvo', () => {
    expect(loadLastHoursDeck()).toBe('')
  })

  it('salva minutos crus como CSV e recarrega', () => {
    saveLastHoursDeck(['15', '60', '90'])
    expect(localStorage.getItem('pp:lastHoursDeck')).toBe('15, 60, 90')
    expect(loadLastHoursDeck()).toBe('15, 60, 90')
  })

  it('usa chave separada do deck custom', () => {
    saveLastCustomDeck(['XS', 'S'])
    saveLastHoursDeck(['15', '60'])
    expect(loadLastCustomDeck()).toBe('XS, S')
    expect(loadLastHoursDeck()).toBe('15, 60')
  })

  it('não lança quando setItem falha', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => saveLastHoursDeck(['1', '2'])).not.toThrow()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun x vitest run tests/unit/lib/customDeckStorage.test.ts`
Expected: FAIL — `loadLastHoursDeck`/`saveLastHoursDeck` não existem.

- [ ] **Step 3: Implementar em `src/lib/customDeckStorage.ts`**

Adicionar abaixo do código existente (mantendo `STORAGE_KEY` e as funções custom intactas):

```ts
const HOURS_KEY = 'pp:lastHoursDeck'

export function loadLastHoursDeck(): string {
  try {
    return localStorage.getItem(HOURS_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveLastHoursDeck(rawTokens: string[]): void {
  try {
    localStorage.setItem(HOURS_KEY, rawTokens.join(', '))
  } catch {
    // localStorage indisponível (modo privado/cota) — persistência é best-effort
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `bun x vitest run tests/unit/lib/customDeckStorage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/customDeckStorage.ts tests/unit/lib/customDeckStorage.test.ts
git commit -m "feat(decks): persistir último deck Horas em chave própria"
```

---

## Task 5: `computeStats` com modo horas

**Files:**
- Modify: `src/lib/stats.ts`
- Test: `tests/unit/lib/stats.test.ts`

- [ ] **Step 1: Adicionar testes (failing)**

Em `tests/unit/lib/stats.test.ts`, adicionar um novo `describe` no fim do arquivo:

```ts
describe('computeStats — modo horas', () => {
  it('parseia rótulos e calcula em minutos', () => {
    const r = computeStats(['15m', '1:00', '1:30'], 'hours')
    expect(r.numericCount).toBe(3)
    expect(r.average).toBe(55) // (15 + 60 + 90) / 3
    expect(r.min).toBe(15)
    expect(r.max).toBe(90)
  })

  it('ignora rótulos não-parseáveis', () => {
    const r = computeStats(['1:00', '?'], 'hours')
    expect(r.numericCount).toBe(1)
    expect(r.average).toBe(60)
  })

  it('divergência usa limiar de 60 min', () => {
    expect(computeStats(['1:00', '2:00'], 'hours').divergent).toBe(false) // diff 60
    expect(computeStats(['1:00', '2:01'], 'hours').divergent).toBe(true)  // diff 61
  })

  it('moda continua sendo o rótulo mais comum', () => {
    const r = computeStats(['1:00', '1:00', '1:30'], 'hours')
    expect(r.mode).toBe('1:00')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun x vitest run tests/unit/lib/stats.test.ts`
Expected: FAIL — `'hours'` é ignorado; `average` usa `Number('1:00')` (NaN) → `numericCount` 0.

- [ ] **Step 3: Editar `src/lib/stats.ts`**

(a) Adicionar import no topo:
```ts
import { parseDurationLabel } from './duration'
```

(b) Trocar a assinatura e o laço de extração numérica e o cálculo de `divergent`.

De:
```ts
export function computeStats(votes: string[]): Stats {
  if (votes.length === 0) {
    return { numericCount: 0, average: null, mode: null, min: null, max: null, divergent: false }
  }

  const numericValues: number[] = []
  for (const v of votes) {
    const n = Number(v)
    if (Number.isFinite(n)) numericValues.push(n)
  }
```
Para:
```ts
export function computeStats(votes: string[], unit?: 'hours'): Stats {
  if (votes.length === 0) {
    return { numericCount: 0, average: null, mode: null, min: null, max: null, divergent: false }
  }

  const numericValues: number[] = []
  for (const v of votes) {
    const n = unit === 'hours' ? parseDurationLabel(v) : Number(v)
    if (n !== null && Number.isFinite(n)) numericValues.push(n)
  }
```

E a linha do `divergent`:

De:
```ts
  const divergent = min !== null && max !== null && max - min > 5
```
Para:
```ts
  const threshold = unit === 'hours' ? 60 : 5
  const divergent = min !== null && max !== null && max - min > threshold
```

- [ ] **Step 4: Rodar e ver passar (incluindo os testes antigos)**

Run: `bun x vitest run tests/unit/lib/stats.test.ts`
Expected: PASS — novos casos verdes e os antigos (sem `unit`) inalterados.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.ts tests/unit/lib/stats.test.ts
git commit -m "feat(stats): modo horas (parse de rótulos + divergência a 60 min)"
```

---

## Task 6: `CustomDeckEditor` com `hoursMode`

**Files:**
- Modify: `src/components/create/CustomDeckEditor.vue`
- Test: `tests/unit/components/CustomDeckEditor.test.ts`

- [ ] **Step 1: Adicionar testes (failing)**

Em `tests/unit/components/CustomDeckEditor.test.ts`, adicionar no fim do `describe('CustomDeckEditor', ...)`:

```ts
  it('hoursMode: chip válido exibe o rótulo convertido', () => {
    const w = mount(CustomDeckEditor, { props: { modelValue: '15, 60, 90', hoursMode: true } })
    const chips = w.findAll('.chip')
    expect(chips.map(c => c.text().replace('×', '').trim())).toEqual(['15m', '1:00', '1:30'])
  })

  it('hoursMode: chip inválido recebe classe vermelha e mostra mensagem de erro', () => {
    const w = mount(CustomDeckEditor, { props: { modelValue: '15, 15m, abc', hoursMode: true } })
    expect(w.findAll('.chip.invalid')).toHaveLength(2)
    expect(w.find('.chip-error').exists()).toBe(true)
  })

  it('sem hoursMode não converte nem marca inválido', () => {
    const w = mount(CustomDeckEditor, { props: { modelValue: '15, 15m', hoursMode: false } })
    expect(w.findAll('.chip.invalid')).toHaveLength(0)
    expect(w.find('.chip-error').exists()).toBe(false)
    const chips = w.findAll('.chip')
    expect(chips.map(c => c.text().replace('×', '').trim())).toEqual(['15', '15m'])
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun x vitest run tests/unit/components/CustomDeckEditor.test.ts`
Expected: FAIL — sem conversão, `.chip.invalid` e `.chip-error` não existem.

- [ ] **Step 3: Editar o `<script setup>` de `CustomDeckEditor.vue`**

(a) Trocar o `defineProps` (linha ~5):

De:
```ts
const props = defineProps<{ modelValue: string }>()
```
Para:
```ts
const props = defineProps<{ modelValue: string; hoursMode?: boolean }>()
```

(b) Adicionar o import do util logo após o import do `vue-i18n` (linha ~3):

```ts
import { formatMinutes, isValidMinutes } from '@/lib/duration'
```

(c) Adicionar, logo após a definição de `chips` (linha ~17), os derivados de exibição:

```ts
const displayChips = computed(() =>
  chips.value.map((raw) => {
    if (!props.hoursMode) return { raw, display: raw, invalid: false }
    const valid = isValidMinutes(raw)
    return { raw, display: valid ? formatMinutes(Number(raw)) : raw, invalid: !valid }
  })
)

const hasInvalid = computed(() => displayChips.value.some(c => c.invalid))
```

- [ ] **Step 4: Editar o `<template>` de `CustomDeckEditor.vue`**

(a) Trocar o laço de chips para usar `displayChips`.

De:
```html
      <span v-for="(c, i) in chips" :key="`${i}-${c}`" class="chip">
        {{ c }}
        <button
          type="button"
          class="chip-remove"
          :aria-label="t('decks.customEditor.removeChip', { value: c })"
          @click.stop="removeAt(i)"
        >×</button>
      </span>
```
Para:
```html
      <span
        v-for="(c, i) in displayChips"
        :key="`${i}-${c.raw}`"
        class="chip"
        :class="{ invalid: c.invalid }"
      >
        {{ c.display }}
        <button
          type="button"
          class="chip-remove"
          :aria-label="t('decks.customEditor.removeChip', { value: c.raw })"
          @click.stop="removeAt(i)"
        >×</button>
      </span>
```

(b) Logo após o fechamento da `</div>` do `.chip-wrap` e antes do `<p class="chip-hint">`, adicionar a mensagem de erro:

```html
    <p v-if="hoursMode && hasInvalid" class="chip-error">{{ t('decks.customEditor.invalidValues') }}</p>
```

(c) Tornar o hint condicional ao modo horas:

De:
```html
    <p class="chip-hint kicker">{{ t('decks.customEditor.hint') }}</p>
```
Para:
```html
    <p class="chip-hint kicker">{{ hoursMode ? t('decks.customEditor.hoursHint') : t('decks.customEditor.hint') }}</p>
```

- [ ] **Step 5: Adicionar CSS de chip inválido + mensagem de erro**

No bloco `<style scoped>`, logo após a regra `.chip { ... }` (que termina antes de `.chip-remove`), adicionar:

```css
.chip.invalid {
  background: var(--color-claret);
}
.chip-error {
  margin: 0;
  font-size: 0.7rem;
  color: var(--color-claret);
}
```

- [ ] **Step 6: Rodar e ver passar (inclusive os testes antigos)**

Run: `bun x vitest run tests/unit/components/CustomDeckEditor.test.ts`
Expected: PASS — novos casos verdes; testes antigos (sem `hoursMode`) continuam passando (o ramo `!props.hoursMode` mantém `display: raw`).

- [ ] **Step 7: Typecheck**

Run: `bun run lint:types`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/create/CustomDeckEditor.vue tests/unit/components/CustomDeckEditor.test.ts
git commit -m "feat(decks): CustomDeckEditor em modo horas (conversão, chip inválido, erro)"
```

---

## Task 7: `DeckPicker` — opção Horas + editor + v-model `hoursRaw`

**Files:**
- Modify: `src/components/create/DeckPicker.vue`
- Test: `tests/unit/components/DeckPicker.test.ts`

- [ ] **Step 1: Atualizar/adicionar testes (failing)**

Substituir o conteúdo de `tests/unit/components/DeckPicker.test.ts` por:

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun x vitest run tests/unit/components/DeckPicker.test.ts`
Expected: FAIL — opção Horas/description/`hoursRaw` ainda não existem.

- [ ] **Step 3: Reescrever o `<script setup>` de `DeckPicker.vue`**

Substituir do `const props = defineProps...` até a função `onSelectChange` por:

```ts
const props = defineProps<{
  modelValue: DeckType
  customRaw: string
  hoursRaw: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: DeckType]
  'update:customRaw': [value: string]
  'update:hoursRaw': [value: string]
}>()

const { t } = useI18n()

const isHours = computed(() => props.modelValue === 'hours')
const isEditable = computed(() => props.modelValue === 'custom' || props.modelValue === 'hours')
const editorModel = computed(() => (isHours.value ? props.hoursRaw : props.customRaw))

function onEditorUpdate(value: string) {
  if (isHours.value) emit('update:hoursRaw', value)
  else emit('update:customRaw', value)
}

const activePreset = computed(() =>
  DECK_PRESETS.find(p => p.type === props.modelValue) ?? null
)
const previewValues = computed(() =>
  activePreset.value ? pickPreview(activePreset.value.values) : []
)

const editorRef = ref<{ focus: () => void } | null>(null)

watch(() => props.modelValue, async (next, prev) => {
  const editableNow = next === 'custom' || next === 'hours'
  if (editableNow && next !== prev) {
    await nextTick()
    editorRef.value?.focus()
  }
})

function onSelectChange(e: Event) {
  emit('update:modelValue', (e.target as HTMLSelectElement).value as DeckType)
}
```

- [ ] **Step 4: Reescrever o `<template>` de `DeckPicker.vue`**

Substituir o `<select>...</select>`, o `<p ... description>`, e o bloco preview/editor por:

```html
    <select
      id="deck-type"
      class="deck-select focus-gold"
      :value="modelValue"
      @change="onSelectChange"
    >
      <option v-for="p in DECK_PRESETS" :key="p.type" :value="p.type">{{ t(p.labelKey) }}</option>
      <option value="hours">{{ t('decks.hours.name') }}</option>
      <option value="custom">{{ t('decks.custom') }}</option>
    </select>

    <p v-if="activePreset" class="deck-description">{{ t(activePreset.descKey) }}</p>
    <p v-else-if="isHours" class="deck-description">{{ t('decks.hours.description') }}</p>

    <DeckPreviewCards v-if="!isEditable" :values="previewValues" />
    <CustomDeckEditor
      v-else
      ref="editorRef"
      :model-value="editorModel"
      :hours-mode="isHours"
      @update:model-value="onEditorUpdate"
    />
```

- [ ] **Step 5: Rodar e ver passar**

Run: `bun x vitest run tests/unit/components/DeckPicker.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `bun run lint:types`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/create/DeckPicker.vue tests/unit/components/DeckPicker.test.ts
git commit -m "feat(decks): DeckPicker com opção Horas editável e v-model hoursRaw"
```

---

## Task 8: `ResultsPanel` formata média/min/max em horas

**Files:**
- Modify: `src/components/room/ResultsPanel.vue`
- Test: `tests/unit/components/ResultsPanel.test.ts` (criar)

- [ ] **Step 1: Criar o teste (failing)**

Criar `tests/unit/components/ResultsPanel.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultsPanel from '@/components/room/ResultsPanel.vue'

const seatsHours = [
  { uid: 'a', name: 'A', vote: '1:00' },
  { uid: 'b', name: 'B', vote: '1:30' },
]

describe('ResultsPanel', () => {
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `bun x vitest run tests/unit/components/ResultsPanel.test.ts`
Expected: FAIL — no modo horas a média sai como `—`/NaN (sem parse) e não há formatação.

- [ ] **Step 3: Editar o `<script setup>` de `ResultsPanel.vue`**

(a) Adicionar import:
```ts
import { formatMinutes } from '@/lib/duration'
```

(b) Trocar o `defineProps`:

De:
```ts
const props = defineProps<{ seats: SeatVote[]; embedded?: boolean }>()
```
Para:
```ts
const props = defineProps<{ seats: SeatVote[]; embedded?: boolean; unit?: 'hours' }>()
```

(c) Trocar a linha do `stats` para repassar `unit` e adicionar os derivados de exibição logo abaixo:

De:
```ts
const stats = computed(() => computeStats(votes.value))
```
Para:
```ts
const stats = computed(() => computeStats(votes.value, props.unit))

function fmtStat(value: number | null): string {
  if (value === null) return '—'
  return props.unit === 'hours' ? formatMinutes(Math.round(value)) : String(value)
}
const displayAverage = computed(() => fmtStat(stats.value.average))
const displayMin = computed(() => fmtStat(stats.value.min))
const displayMax = computed(() => fmtStat(stats.value.max))
```

- [ ] **Step 4: Editar o `<template>` de `ResultsPanel.vue`**

Trocar as três células numéricas (média, mínimo, máximo) para usar os derivados; `mode` continua igual.

De:
```html
      <div class="stat primary">
        <span class="kicker">{{ t('room.results.average') }}</span>
        <span class="numeral big num-tabular">{{ stats.average ?? '—' }}</span>
      </div>
```
Para:
```html
      <div class="stat primary">
        <span class="kicker">{{ t('room.results.average') }}</span>
        <span class="numeral big num-tabular">{{ displayAverage }}</span>
      </div>
```

De:
```html
      <div class="stat">
        <span class="kicker">{{ t('room.results.min') }}</span>
        <span class="numeral mid num-tabular">{{ stats.min ?? '—' }}</span>
      </div>
      <div class="stat">
        <span class="kicker">{{ t('room.results.max') }}</span>
        <span class="numeral mid num-tabular">{{ stats.max ?? '—' }}</span>
      </div>
```
Para:
```html
      <div class="stat">
        <span class="kicker">{{ t('room.results.min') }}</span>
        <span class="numeral mid num-tabular">{{ displayMin }}</span>
      </div>
      <div class="stat">
        <span class="kicker">{{ t('room.results.max') }}</span>
        <span class="numeral mid num-tabular">{{ displayMax }}</span>
      </div>
```

> Observação: a célula da **moda** (`{{ stats.mode ?? '—' }}`) NÃO muda — `mode` já é um rótulo de voto.

- [ ] **Step 5: Rodar e ver passar**

Run: `bun x vitest run tests/unit/components/ResultsPanel.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `bun run lint:types`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/room/ResultsPanel.vue tests/unit/components/ResultsPanel.test.ts
git commit -m "feat(room): ResultsPanel formata média/min/max em horas (prop unit)"
```

---

## Task 9: Fiação em `CreateSessionView` e `RoomView`

**Files:**
- Modify: `src/views/CreateSessionView.vue`
- Modify: `src/views/RoomView.vue`

> Estas views não têm testes unitários no projeto (precisariam de mocks de Firebase/router). A verificação aqui é por `bun run lint:types` + smoke manual no app (Task 10).

- [ ] **Step 1: `CreateSessionView.vue` — imports**

Trocar o import de `customDeckStorage` (linha ~13):

De:
```ts
import { loadLastCustomDeck, saveLastCustomDeck } from '@/lib/customDeckStorage'
```
Para:
```ts
import {
  loadLastCustomDeck,
  saveLastCustomDeck,
  loadLastHoursDeck,
  saveLastHoursDeck,
} from '@/lib/customDeckStorage'
import { formatMinutes, isValidMinutes } from '@/lib/duration'
```

- [ ] **Step 2: `CreateSessionView.vue` — estado e `canSubmit`**

Trocar o trecho do estado custom + `canSubmit`.

De:
```ts
const deckType = ref<DeckType>('fibonacci')
const customRaw = ref(loadLastCustomDeck())
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
```
Para:
```ts
const deckType = ref<DeckType>('fibonacci')
const customRaw = ref(loadLastCustomDeck())
const hoursRaw = ref(loadLastHoursDeck())
const submitting = ref(false)

const activeRaw = computed(() => (deckType.value === 'hours' ? hoursRaw.value : customRaw.value))
const activeTokens = computed(() =>
  activeRaw.value.split(',').map(s => s.trim()).filter(Boolean)
)

const editableValid = computed(() => {
  if (deckType.value !== 'custom' && deckType.value !== 'hours') return true
  if (deckType.value === 'hours') {
    if (activeTokens.value.some(t => !isValidMinutes(t))) return false
    const labels = new Set(activeTokens.value.map(t => formatMinutes(Number(t))))
    return labels.size >= 2
  }
  return new Set(activeTokens.value).size >= 2
})

const canSubmit = computed(() =>
  roomName.value.trim().length > 0
  && moderatorName.value.trim().length > 0
  && editableValid.value
  && uid.value !== null
  && !submitting.value,
)
```

- [ ] **Step 3: `CreateSessionView.vue` — `submit`**

Trocar o miolo do `try` da função `submit`.

De:
```ts
    const deck = buildDeck({
      type: deckType.value,
      customValues: deckType.value === 'custom' ? customRaw.value.split(',') : undefined,
    })
    if (deck.type === 'custom') {
      saveLastCustomDeck(deck.values)
    }
```
Para:
```ts
    const isEditable = deckType.value === 'custom' || deckType.value === 'hours'
    const deck = buildDeck({
      type: deckType.value,
      customValues: isEditable ? activeRaw.value.split(',') : undefined,
    })
    if (deck.type === 'custom') {
      saveLastCustomDeck(deck.values)
    } else if (deck.type === 'hours') {
      saveLastHoursDeck(activeTokens.value)
    }
```

- [ ] **Step 4: `CreateSessionView.vue` — template do `DeckPicker`**

De:
```html
        <DeckPicker v-model="deckType" v-model:custom-raw="customRaw" />
```
Para:
```html
        <DeckPicker v-model="deckType" v-model:custom-raw="customRaw" v-model:hours-raw="hoursRaw" />
```

- [ ] **Step 5: `RoomView.vue` — passar `unit` ao `ResultsPanel`**

Localizar (linha ~222):
```html
      <ResultsPanel
        embedded
        :seats="room.seats.value.map(s => ({ uid: s.uid, name: s.name, vote: s.vote }))"
      />
```
Trocar por:
```html
      <ResultsPanel
        embedded
        :unit="room.room.value.deck.type === 'hours' ? 'hours' : undefined"
        :seats="room.seats.value.map(s => ({ uid: s.uid, name: s.name, vote: s.vote }))"
      />
```

- [ ] **Step 6: Typecheck**

Run: `bun run lint:types`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/views/CreateSessionView.vue src/views/RoomView.vue
git commit -m "feat(decks): fiar deck Horas editável em CreateSessionView e RoomView"
```

---

## Task 10: Verificação final

**Files:** nenhum (verificação).

- [ ] **Step 1: Suíte completa**

Run: `bun run test`
Expected: PASS — toda a suíte verde.

- [ ] **Step 2: Typecheck completo**

Run: `bun run lint:types`
Expected: PASS — sem erros.

- [ ] **Step 3: Smoke manual no app**

Run: `bun run dev` e validar no navegador:
1. Em **Criar sessão**, selecionar **Horas** no dropdown → aparece o editor de chips (não o preview), descrição "Digite minutos…".
2. Digitar `15`, `60`, `90` → chips exibem `15m`, `1:00`, `1:30`.
3. Digitar `15m` → chip fica **vermelho** e aparece a mensagem de erro abaixo dos chips; o botão de criar fica desabilitado.
4. Remover o chip inválido, manter ≥2 válidos → botão habilita; criar a sala.
5. Na sala, as cartas da mão mostram os rótulos (`1:00`, `1:30`…). Votar com ≥2 participantes (ou abas) e **revelar**.
6. No painel de resultados: **média/mín/máx** aparecem formatados em horas; o aviso de **divergência** só aparece se o spread passar de 60 min.
7. Recarregar **Criar sessão** e reabrir **Horas** → os últimos minutos digitados são restaurados; **Customizado** continua com sua própria lista, independente.

- [ ] **Step 4: Encerramento**

Após o smoke manual OK, considerar a feature concluída. (A integração final / PR é decidida pelo usuário — ver skill `finishing-a-development-branch`.)

---

## Self-Review (preenchido)

**Cobertura do spec:** todos os itens do spec têm tarefa correspondente — `duration.ts` (T1), i18n (T2), `buildDeck`/presets (T3), persistência (T4), `stats` (T5), editor (T6), `DeckPicker` (T7), `ResultsPanel` (T8), `CreateSessionView`+`RoomView` (T9), verificação (T10). Os componentes marcados como "não mudam" no spec (PlayingCard, Hand, PlayerSeat, DeckPreviewCards) não têm tarefa — correto.

**Placeholders:** nenhum — todo passo tem código/comando concreto.

**Consistência de tipos/nomes:** `formatMinutes`/`parseDurationLabel`/`isValidMinutes` (T1) são usados com a mesma assinatura em T3/T5/T6/T9. `computeStats(votes, unit?)` (T5) casa com o uso em `ResultsPanel` (T8). Props `hoursMode` (editor) e `unit` (painel) e os v-models `customRaw`/`hoursRaw` são consistentes entre T6/T7/T8/T9. Deck mantém schema `{ type, values }` (sem `unit`) — `deck.type === 'hours'` é o sinal, usado de forma idêntica em `buildDeck`, `RoomView` e `CreateSessionView`.
