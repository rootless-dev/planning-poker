# Reformulação da tela "Criar sala" + transições de rota

Data: 2026-05-11
Branch: `develop`

Reformulação visual e funcional da tela de criação de sala com (1) layout 70/30 com carrossel explicativo à esquerda; (2) novo `DeckPicker` baseado em dropdown nativo com preview de 4 cartas grandes; (3) editor de baralho customizado em formato chip/tag; (4) seis novos presets de baralho; (5) transição fade+lift entre todas as rotas. Sem deps novas — tudo CSS e Vue nativos.

## Escopo

- Reescrita do `CreateSessionView.vue` (layout, responsividade, componentes filhos).
- Refeito do `DeckPicker.vue` e `CustomDeckEditor.vue`.
- Dois componentes novos: `HowItWorksCarousel.vue` e `DeckPreviewCards.vue`.
- Ampliação de `src/lib/decks.ts` com registro de presets e helper de preview.
- `<Transition>` envolvendo `<RouterView>` em `App.vue` + CSS em `style.css`.

**Fora de escopo:**

- `HomeView`, `RoomView` e demais componentes da sala.
- Modelo Firestore (continua `Deck.values: string[]`, indiferente a `type`).
- Tema claro/escuro (continua via `useDarkMode`).

## 1. Registro de baralhos

`src/lib/decks.ts` passa a expor uma fonte única para os presets, usada pelo `DeckPicker` (popular o `<select>`) e pelo `buildDeck` (lookup).

### Tipos

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

### Registro

```ts
export interface DeckPreset {
  type: Exclude<DeckType, 'custom'>
  label: string
  description: string
  values: readonly string[]
}

export const DECK_PRESETS: readonly DeckPreset[] = [
  { type: 'fibonacci',          label: 'Fibonacci',            description: 'Clássico ágil. Granularidade pequena no início.',           values: ['0','1','2','3','5','8','13','21','?','☕'] },
  { type: 'fibonacci-modified', label: 'Fibonacci modificado', description: 'Estende com meio ponto e valores altos para épicos.',     values: ['0','½','1','2','3','5','8','13','20','40','100','?','☕'] },
  { type: 'tshirt',             label: 'T-shirt',              description: 'Tamanhos abstratos, sem ancoragem em horas.',             values: ['XS','S','M','L','XL','XXL','?','☕'] },
  { type: 'powers-of-2',        label: 'Potências de 2',       description: 'Crescimento exponencial — bom para complexidade técnica.', values: ['1','2','4','8','16','32','64','?','☕'] },
  { type: 'sequential',         label: 'Sequencial 1–10',      description: 'Escala linear — granularidade fina e uniforme.',          values: ['1','2','3','4','5','6','7','8','9','10','?','☕'] },
  { type: 'hours',              label: 'Horas',                description: 'Estimativa direta em horas para tarefas pequenas.',       values: ['½h','1h','2h','4h','8h','16h','?','☕'] },
  { type: 'risk',               label: 'Risco',                description: 'Avaliação qualitativa para spikes e análise de impacto.', values: ['Baixo','Médio','Alto','Crítico','?'] },
  { type: 'yes-no',             label: 'Sim / Não',            description: 'Decisão binária para go/no-go.',                          values: ['Sim','Não','?'] },
] as const
```

### Funções

```ts
export function buildDeck(opts: { type: DeckType; customValues?: string[] }): Deck
```

- Para presets: lookup em `DECK_PRESETS` e retorna `{ type, values: [...preset.values] }`.
- Para `'custom'`: mantém validação atual — trim, filter vazios, dedup. Lança `Error('Deck custom precisa de ao menos 2 valores únicos')` se `< 2`.

```ts
export function pickPreview(values: readonly string[]): string[]
```

Retorna até 4 valores para o componente de preview visual:

- Filtra `?` e `☕`.
- Se o restante tiver `≤ 4` itens, retorna todos.
- Se tiver mais, retorna 4 amostras priorizando o miolo do deck:
  índices aproximados `[floor(n*0.2), floor(n*0.4), floor(n*0.6), floor(n*0.8)]`, deduplicados.
- Para decks sem `?`/`☕` curtos (Sim/Não, Risco), retorna todos os valores não-filtrados.

### Compatibilidade Firestore

Salas existentes têm `deck.type` salvo. `RoomView` só lê `deck.values: string[]`, indiferente ao `type`. Sem migração necessária.

## 2. Layout do `CreateSessionView`

### Estrutura (desktop ≥ 768px)

Container: `max-w-6xl mx-auto px-4 py-8`, grid `grid-cols-1 md:grid-cols-[7fr_3fr] gap-8`.

```
┌──────────────────────────────────────────────┬─────────────────┐
│ HowItWorksCarousel                            │ Form            │
│  · kicker "COMO FUNCIONA · 2 / 4"             │  · Nome sala    │
│  · título da cena                             │  · Seu nome     │
│  · ilustração CSS                             │  · Baralho ▾    │
│  · descrição curta                            │  · [4 cartas]   │
│  · dots clicáveis (1·2·3·4)                   │   ou ChipInput  │
│                  70%                          │ Cancelar Criar  │
│                                               │       30%       │
└──────────────────────────────────────────────┴─────────────────┘
```

- Coluna esquerda: `md:sticky md:self-start` para acompanhar scroll em telas altas. O `top` deve ficar igual à altura do `AppHeader` + folga (~24px) — ajustar empiricamente ao implementar (provavelmente `top-20` ou `top-24` em Tailwind).
- Coluna direita: mantém `flex flex-col gap-5`. Ganha `<DeckPreviewCards>` ou `<CustomDeckEditor>` dependendo da seleção.

### Mobile (< 768px)

`grid-cols-1` — carrossel acima do form. Usuário rola para chegar ao form. Sem botão "Pular".

## 3. `HowItWorksCarousel.vue` (novo)

Quatro cenas com auto-rotação:

| # | Título | Descrição | Ilustração |
|---|--------|-----------|------------|
| 1 | Crie uma sala em segundos | Sem cadastro. Escolha o baralho e pronto. | 3 cartas leques (mesmo estilo do `HeroSection`) |
| 2 | Compartilhe o link com o time | Cola no chat — quem entrar entra na hora. | Ícone link + cartas distribuídas |
| 3 | Vote em segredo | Ninguém vê os votos até o moderador revelar. | Cartas viradas (`card-back` existente) |
| 4 | Revele e veja as estatísticas | Média, moda, distribuição na hora. | Cartas reveladas + numeral grande |

### Comportamento

- Estado: `activeIndex: number` (0..3), `timerId: number | null`.
- Auto-rotaciona a cada **5s**. Transição entre cenas via fade (~250ms).
- Pausa quando:
  - mouse over no carrossel (`pointerenter`),
  - foco em qualquer dot (`focusin`),
  - `prefers-reduced-motion: reduce` está ativo (sem auto-rotação; apenas controle manual).
- Retoma em `pointerleave` / `focusout` (se não estiver em reduced-motion).
- **Click em dot:** pula imediatamente para a cena escolhida e **reinicia** a contagem de 5s a partir dali (não pausa permanentemente — o usuário consegue manualmente avançar, mas o auto continua se ele sair do carrossel).
- Cleanup: `onBeforeUnmount` cancela o timer.

### Acessibilidade

- Container: `role="region" aria-roledescription="carousel" aria-label="Como funciona"`.
- Cada cena: `role="group" aria-roledescription="slide" aria-label="N de 4"`. Apenas a ativa é exibida (`aria-hidden="false"`); as demais `aria-hidden="true"`.
- Dots: `<button>` com `aria-label="Ir para passo N"` e `aria-current="step"` quando ativo.
- Região de texto da cena: `aria-live="polite"` para anunciar troca.

### Ilustrações

CSS puro reutilizando primitivas existentes (`card-back`, gradients do paper, cartas com `var(--color-paper-soft)`). Sem imagens externas, sem SVG inline complexo.

## 4. `DeckPicker.vue` (refeito)

```vue
<script setup lang="ts">
import { DECK_PRESETS } from '@/lib/decks'
import DeckPreviewCards from './DeckPreviewCards.vue'
import CustomDeckEditor from './CustomDeckEditor.vue'
import type { DeckType } from '@/types/room'

const props = defineProps<{ modelValue: DeckType; customRaw: string }>()
const emit = defineEmits<{
  'update:modelValue': [value: DeckType]
  'update:customRaw': [value: string]
}>()
</script>
```

### Estrutura

```
<label kicker> Baralho </label>
<select> ... DECK_PRESETS + 'Customizado' ... </select>
<p class="deck-description">{{ activePreset.description }}</p>  ← só quando !== custom
<DeckPreviewCards v-if="modelValue !== 'custom'" :values="previewValues" />
<CustomDeckEditor v-else v-model="customRaw" />
```

A linha `description` é o texto definido em `DECK_PRESETS` (ex.: "Clássico ágil. Granularidade pequena no início."). Estilo discreto: `font-size: 0.78rem`, `color: var(--color-muted)`, `font-style: italic`. Para `custom`, descrição é omitida.

### `<select>` estilizado

- `appearance: none`, mesma paleta do `TextField` (background `var(--color-surface)`, border `color-mix(in srgb, var(--color-ink) 18%, transparent)`, font-family `var(--font-display)`).
- Caret inline como `background-image: url("data:image/svg+xml;…")`.
- `focus-gold` para focus ring dourado.
- Native popover do SO para o menu de opções — acessível por padrão, sem custom popover.

### `previewValues`

`computed(() => pickPreview(DECK_PRESETS.find(p => p.type === modelValue.value)!.values))` — só calcula se não for custom.

### Comportamento

- Trocar entre presets ↔ custom **não** zera `customRaw` (preserva digitação do usuário).
- Default inicial: `'fibonacci'` (mantém atual).
- Trocar para `'custom'`: o `<CustomDeckEditor>` recebe `focus()` no input via `nextTick`.

## 5. `DeckPreviewCards.vue` (novo)

Visual puro. Renderiza N cartas grandes (≤ 4) lado a lado.

### Props

```ts
defineProps<{ values: string[] }>()
```

### Estilo

- Tamanho: `72×104px` no desktop, `56×84px` no mobile (< 768px).
- Background: `linear-gradient(180deg, var(--color-paper-soft), var(--color-paper-deep))`.
- Border: `1px solid color-mix(in srgb, var(--color-accent) 50%, transparent)`.
- Shadow: `0 6px 16px -4px rgb(var(--color-shadow) / 0.35)`.
- Font: `Fraunces` 600, tamanho proporcional ao valor (1.5rem para 1-2 chars, escala via `clamp` para valores longos como "100").
- Leve rotação alternada nas extremidades: cartas nos índices 0 e 3 ficam com `transform: rotate(-3deg)` / `rotate(3deg)`. Cartas do meio retas com `translateY(-4px)` para destaque.
- Container: `flex gap-3 justify-center items-end`.

### Transição

`<TransitionGroup name="card-swap">` envolvendo as cartas. Ao trocar `values`, cada carta faz fade rápido (180ms) — perceptível mas não distrai.

## 6. `CustomDeckEditor.vue` (refeito)

Substitui o `<TextField>` único atual por chip/tag input.

### API (sem mudança)

```ts
defineProps<{ modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
```

`modelValue` continua sendo `string` com valores separados por vírgula — minimiza mudança no `CreateSessionView` e mantém compatível com `buildDeck`.

### Estado interno

```ts
const chips = computed(() => modelValue.split(',').map(s => s.trim()).filter(Boolean))
const typing = ref('')
const inputRef = ref<HTMLInputElement>()
```

### Adicionar chip

Triggers:
- `Enter` keydown;
- `,` keydown;
- `blur` do input com texto não-vazio;
- `paste` com texto contendo vírgulas → split, cada parte vira chip.

Regras:
- Trim antes de comparar.
- Duplicata (case-sensitive): silenciosamente ignorada, limpa o input.
- Vazio: limpa o input, não faz nada.
- Acima de **30 chips**: não adiciona (proteção contra paste gigante). Toast discreto: "Máximo de 30 valores".

### Remover chip

- Click no `×` do chip.
- `Backspace` keydown com input vazio: remove o último chip. O valor removido **não** volta para o input — remoção pura, sem reedição implícita.

### Emissão

Sempre que `chips` mudar, emite `update:modelValue` com `chips.join(', ')`.

### Visual

- Container: `flex flex-wrap gap-2 items-center p-3` com `background: var(--color-surface)`, `border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent)`, `border-radius: 12px`.
- Focus-within: ring dourado (mesmo do `TextField`).
- Chip: `padding: 6px 14px`, `border-radius: 999px`, `background: var(--color-brand)`, `color: var(--color-paper-soft)`, `font-family: var(--font-display)`. `×` à direita com `opacity: 0.6`, ganha `opacity: 1` no hover.
- Input inline: `flex: 1; min-width: 80px; background: transparent; border: 0;`. Italic Fraunces (consistente com `TextField`).

### Hint

Abaixo do container, kicker pequeno: "Enter adiciona · Backspace remove · mínimo 2 valores".

### Validação

`buildDeck` continua sendo a única fonte da regra `≥ 2 únicos`. `canSubmit` no `CreateSessionView` exige `chips.length >= 2` quando `deckType === 'custom'` (o `customRaw.trim().length > 0` atual é insuficiente).

## 7. Transição de rota

### `App.vue`

```vue
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

### CSS (em `src/style.css`, `@layer utilities`)

```css
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

### Notas

- `mode="out-in"`: rota anterior completa o leave antes da nova entrar. Evita sobreposição/scrollbar piscando. Trade-off: ~150ms vazios entre as duas — aceitável.
- `AppHeader` e `ToastsLayer` ficam **fora** do `<Transition>` — não piscam ao navegar; toasts ativos sobrevivem à transição.
- Scroll: `vue-router` reseta scroll por padrão. Mantém.
- Cliques rápidos: `mode="out-in"` enfileira animações; sem glitch.

## 8. Testes

### `src/lib/decks.test.ts` (ampliar)

- Para cada novo `DeckType` em `DECK_PRESETS`: `buildDeck({ type })` retorna `Deck` com `values` exatamente igual ao registro e `type` correto.
- `pickPreview`:
  - Filtra `?` e `☕`.
  - Decks pequenos (Sim/Não com 2 valores não-filtrados) retornam todos.
  - Decks médios (Risco com 4 valores não-filtrados) retornam todos.
  - Decks grandes (Fibonacci com 8 valores não-filtrados) retornam 4, do miolo.
  - Sem duplicatas.
- Custom: mantém testes existentes (`≥ 2 únicos`, trim, dedup, lança em `< 2`).

### `src/components/create/CustomDeckEditor.test.ts` (novo)

- Renderiza chips a partir do `modelValue` inicial (`"1, 2, 3"` → 3 chips).
- Enter no input com texto adiciona chip; emite `update:modelValue` com vírgulas.
- `,` no input adiciona chip; consome a vírgula.
- Blur com texto adiciona chip.
- Paste de `"a, b, c"` adiciona 3 chips.
- Duplicata (`modelValue="1"`, digitar `1` + Enter) não cria chip novo; input limpa.
- Backspace com input vazio remove último chip.
- Click no `×` remove chip específico.
- Acima de 30 chips, 31° é rejeitado.
- Trim: `"  5  "` → chip `"5"`.

### `src/components/create/DeckPicker.test.ts` (novo)

- Renderiza opção para cada item de `DECK_PRESETS` + opção "Customizado".
- Trocar `modelValue` para preset mostra `<DeckPreviewCards>` com `pickPreview` aplicado; esconde `<CustomDeckEditor>`.
- Trocar para `"custom"` mostra `<CustomDeckEditor>`; esconde preview.
- `customRaw` preservado entre alternâncias preset ↔ custom.

### `src/components/create/HowItWorksCarousel.test.ts` (novo)

Usar `vi.useFakeTimers()`.

- Renderiza 4 cenas; `aria-hidden="false"` só na ativa.
- Click no dot N ativa cena N; `aria-current="step"` atualiza.
- `vi.advanceTimersByTime(5000)` avança o `activeIndex` em 1; passa de 3 → 0 (loop).
- `pointerenter` no container pausa o timer (advanceTimer não muda activeIndex).
- `pointerleave` retoma.
- Mock `matchMedia` retornando `prefers-reduced-motion: reduce` → sem auto-rotação.
- `onBeforeUnmount` cancela o timer (sem warnings de timer pendente).

### `src/components/create/DeckPreviewCards.test.ts` (novo, opcional)

Snapshot ou contagem de cartas:

- `values: ['1','2','3']` → 3 cartas com esses textos.
- `values: ['1','2','3','5']` → 4 cartas; classes de tilt aplicadas em índices 0 e 3.
- `values: []` é considerado inalcançável — `DeckPicker` só renderiza `<DeckPreviewCards>` quando `modelValue !== 'custom'`, e todo preset tem ao menos 2 valores não-filtrados. Componente assume `values.length > 0` e não trata vazio.

### Integração

Sem novo teste de integração — `createRoom` já é coberto. `buildDeck` cobre o pipeline pré-`createRoom`.

## 9. Ordem de implementação

PR único, commits incrementais. Cada commit deve passar `bun run lint:types` e `bun run test`.

1. **`decks.ts` + testes**: `DECK_PRESETS`, `pickPreview`, novos `DeckType`. UI ainda não muda.
2. **`DeckPreviewCards.vue`**: componente puro visual + teste de render.
3. **`CustomDeckEditor.vue`** refeito como chip input + testes.
4. **`DeckPicker.vue`** refeito como dropdown + preview + testes.
5. **`HowItWorksCarousel.vue`** novo + testes.
6. **`CreateSessionView.vue`** reescrita: layout 70/30, integra carrossel + novo picker + canSubmit ajustado.
7. **`App.vue` + `style.css`**: `<Transition>` na `<RouterView>` + CSS `.page-*`.
8. **Smoke manual**: criar sala com cada preset; criar com custom (≥ 2 chips); transição em todas as rotas; mobile (< 768px); `prefers-reduced-motion`.

## 10. Verificação final

- `bun run lint:types`
- `bun run test`
- `bun run test:integration`
- Smoke manual no navegador:
  - Criar sala com cada um dos 8 presets — verificar `deck.values` no Firestore.
  - Criar com custom (2 valores, 5 valores, paste de "1, 2, 3, 5, 8", duplicatas, tentativa com 1 valor desabilita botão).
  - Transição Home → Create → Room → voltar (botão e back nativo do navegador).
  - Mobile DevTools < 768px — carrossel em cima, form embaixo, preview de cartas em tamanho mobile.
  - DevTools → "Emulate CSS prefers-reduced-motion: reduce" → carrossel sem auto-rotação, transição apenas fade.

## Sem dependências novas

Tudo nativo: `<Transition>` do Vue, CSS, `setTimeout` para o carrossel, `<select>` nativo.
