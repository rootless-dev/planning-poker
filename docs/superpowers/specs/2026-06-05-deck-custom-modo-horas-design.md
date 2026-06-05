# Design — Deck "Horas" editável (minutos → rótulos)

**Data:** 2026-06-05
**Status:** Aprovado (aguardando revisão do spec)

## Objetivo

Transformar a opção de deck **"Horas"** (hoje um preset com valores fixos) em um
deck **editável**: o usuário digita números (minutos) num editor de chips e eles
são convertidos para rótulos de horas. A conversão aparece nos chips do editor,
nas cartas da sala e no cálculo da revelação. Valores inválidos devem ser
sinalizados (chip vermelho + mensagem de erro abaixo dos chips).

A opção **"Customizado"** (texto livre, qualquer valor) continua existindo,
separada e sem mudanças.

### Exemplos de conversão

| Digitado (minutos) | Exibido      |
| ------------------ | ------------ |
| `15`               | `15m`        |
| `45`               | `45m`        |
| `60`               | `1:00`       |
| `75`               | `1:15`       |
| `90`               | `1:30`       |
| `120`              | `2:00`       |
| `0`                | `0m`         |

**Regra:** `< 60` → `"Nm"`; `>= 60` → `"H:MM"` com os minutos sempre em 2 dígitos.

## Decisões fechadas (brainstorming)

1. **Sem checkbox, sem flag.** A opção "Horas" é reaproveitada como editor. O
   sinal de "modo horas" é simplesmente `deck.type === 'hours'` — não há campo
   novo no `Deck` nem checkbox no editor.
2. **Validação:** no deck Horas, só inteiros (`/^\d+$/`) são válidos. `"15m"`,
   `"abc"`, `"1:30"`, decimais → inválidos. Tokens `?` e `☕` **não** são
   permitidos.
3. **Valor canônico = rótulo formatado** (`"15m"`, `"1:00"`). O voto é o próprio
   rótulo; o cálculo faz parse de volta para minutos.
4. **Editor começa vazio.** Sem valores sugeridos pré-preenchidos.
5. **Divergência:** o aviso usa limiar de **60 minutos** quando o deck é Horas
   (em vez dos 5 atuais).
6. **Persistência:** o último deck Horas digitado (minutos crus) é salvo numa
   chave própria no localStorage, simétrico ao Customizado.

## Componentes e mudanças

### 1. `src/lib/duration.ts` (novo)

Fonte única do formato, usada pelo editor, por `buildDeck` e por `stats`.

- `formatMinutes(n: number): string` — `< 60` → `` `${n}m` ``; `>= 60` →
  `` `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}` ``.
- `parseDurationLabel(label: string): number | null` — inverso. Aceita
  `/^(\d+)m$/` e `/^(\d+):([0-5]\d)$/`; devolve minutos ou `null`. Como só
  parseia o formato que nós mesmos geramos, é determinístico e seguro.
- `isValidMinutes(token: string): boolean` — `true` apenas para inteiro `>= 0`
  (`/^\d+$/`).

### 2. `src/lib/decks.ts`

- **Remover `'hours'` de `DECK_PRESETS`** — Horas deixa de ser um deck fixo. Os
  presets passam a ser 7 decks fixos.
- (Opcional, recomendado) apertar `DeckPreset.type` para
  `Exclude<DeckType, 'custom' | 'hours'>`.
- `BuildOptions` ganha o tipo `'hours'` no ramo editável. `buildDeck`:
  - `type === 'custom'`: comportamento atual (texto livre), inalterado.
  - `type === 'hours'` (novo):
    1. Limpa/trim dos tokens crus de `customValues`.
    2. Valida que todos são `isValidMinutes`; se algum falhar, lança erro
       (`decks.errors.invalidHoursValues`). _A UI já bloqueia o submit antes;
       esta é a barreira de segurança._
    3. Converte cada token para rótulo com `formatMinutes(Number(token))`.
    4. Deduplica os rótulos, **preservando a ordem digitada**.
    5. Exige `>= 2` rótulos únicos (reaproveita `decks.errors.needTwoValues`).
    6. Retorna `{ type: 'hours', values }`.
  - Demais tipos: lookup nos presets (sem hours).

### 3. `src/lib/customDeckStorage.ts`

- Custom: **inalterado** (`loadLastCustomDeck` / `saveLastCustomDeck` continuam
  como hoje; valores == rótulos == tokens digitados).
- Hours (novo, chave própria `pp:lastHoursDeck`): salva/restaura os **minutos
  crus** digitados (NÃO os rótulos — senão `"1:00"` seria relido como token
  inválido).
  - `loadLastHoursDeck(): string` (default `''`).
  - `saveLastHoursDeck(rawTokens: string[]): void`.

### 4. `src/components/create/CustomDeckEditor.vue`

Componente reutilizado pelos dois decks editáveis (custom e hours).

- Nova prop `hoursMode: boolean` (sem checkbox — é o pai quem decide pelo tipo).
- `modelValue` (raw) continua sendo os tokens digitados (ex.: `"15, 60, 90"`).
- Cada chip computa validade quando `hoursMode`:
  - válido → exibe `formatMinutes(Number(token))`;
  - inválido → exibe o texto cru com classe `.invalid` (vermelho).
  - sem `hoursMode` → exibe o texto cru (comportamento atual).
- Se houver `>= 1` chip inválido (só no `hoursMode`), renderiza mensagem de erro
  **abaixo da área dos chips** (`decks.customEditor.invalidValues`).
- Hint condicional: `hint` normal vs `hoursHint` no modo horas.

### 5. `src/components/create/DeckPicker.vue`

- Adicionar `<option value="hours">{{ t('decks.hours.name') }}</option>` e manter
  `<option value="custom">` (Horas e Customizado, as duas editáveis, ficam ao
  final da lista; nota: isso move "Horas" do meio para o fim do dropdown).
- Mostrar `DeckPreviewCards` somente quando `modelValue` não é editável
  (`!== 'custom' && !== 'hours'`).
- Mostrar `CustomDeckEditor` quando `modelValue === 'custom'` (hoursMode=false) ou
  `=== 'hours'` (hoursMode=true), cada um ligado ao seu próprio raw.
- Descrição: presets via `activePreset.descKey`; para Horas, exibir
  `t('decks.hours.description')` (texto atualizado).
- Repassa dois v-models de raw: `customRaw` (existente) e `hoursRaw` (novo).

### 6. `src/views/CreateSessionView.vue`

- Estados separados: `customRaw` (de `loadLastCustomDeck()`) e `hoursRaw` (de
  `loadLastHoursDeck()`). Cada deck editável tem seu próprio raw/persistência.
- `v-model:custom-raw` e `v-model:hours-raw` ligados ao `DeckPicker`.
- `canSubmit` para o tipo ativo:
  - `custom`: `>= 2` valores únicos (regra atual).
  - `hours`: todos os tokens válidos (`isValidMinutes`) **e** `>= 2` rótulos
    únicos.
  - demais: como hoje.
- `submit`:
  - monta `customValues` a partir do raw do tipo ativo (custom **ou** hours).
  - `buildDeck({ type, customValues })`.
  - persiste: `saveLastCustomDeck(...)` se custom; `saveLastHoursDeck(...)` com os
    minutos crus se hours.

### 7. `src/lib/stats.ts` — `computeStats`

- Assinatura: `computeStats(votes: string[], unit?: 'hours')`.
- Quando `unit === 'hours'`: usa `parseDurationLabel` (em vez de `Number`) para
  extrair os minutos numéricos. `average/min/max` ficam em **minutos**.
- Limiar de divergência: `unit === 'hours' ? 60 : 5`.
- `mode` continua sendo o rótulo de voto mais comum (string), sem conversão.
- Sem `unit`: comportamento atual 100% preservado (param opcional).

### 8. `src/components/room/ResultsPanel.vue`

- Nova prop `unit?: 'hours'`.
- Passa `unit` para `computeStats`.
- Quando `unit === 'hours'`, formata para exibição:
  - `average` → `formatMinutes(Math.round(stats.average))`;
  - `min`/`max` → `formatMinutes(...)`.
- `mode`, tally e lista de votantes já são rótulos — sem mudança.

### 9. `src/views/RoomView.vue`

- Passa `:unit="room.room.value.deck.type === 'hours' ? 'hours' : undefined"`
  para `ResultsPanel`.

### 10. i18n (`src/i18n/locales/{pt-BR,en,es}.json`)

- Atualizar `decks.hours.description` para refletir o comportamento editável
  (ex.: "Digite minutos; convertidos para horas — 60 vira 1:00").
- Novas chaves em `decks.customEditor`:
  - `hoursHint` — hint do modo horas ("digite minutos · 60 vira 1:00").
  - `invalidValues` — mensagem de erro ("Valores inválidos. Use apenas números
    (minutos).").
- Nova chave em `decks.errors`:
  - `invalidHoursValues` — erro lançado por `buildDeck` (barreira de segurança).

## Componentes que **não** mudam

`PlayingCard.vue`, `Hand.vue`, `PlayerSeat`, `DeckPreviewCards.vue`. Como o voto é
o próprio rótulo, todas as cartas e a distribuição renderizam corretamente sem
alteração. O tipo `DeckType` (já inclui `'hours'`) e o schema do `Deck` ficam
inalterados.

## Fluxo de dados (deck Horas)

```
Editor (minutos crus "15,60,90")  ──submit──►  buildDeck(type:'hours')
        │  exibe formatMinutes                        │ valida + converte → rótulos
        │  valida isValidMinutes                      ▼
        ▼                                  Deck { type:'hours',
   chip vermelho + erro se inválido               values:["15m","1:00","1:30"] }
                                                       │ Firestore
                                                       ▼
   Voto = rótulo ("1:30")  ◄── carta emite deck.values[i] ── Hand/PlayingCard
        │
        ▼
   ResultsPanel(unit:'hours') → computeStats(votes,'hours')
        parseDurationLabel("1:30")=90 → média/min/max em minutos
        → formatMinutes → "1:15" etc · divergência se spread > 60
```

## Testes (TDD)

- `duration.test.ts` (novo): `formatMinutes` (`0`, `<60`, exatas `60/120`,
  remainder `75/90`), `parseDurationLabel` (válidos + `null` para lixo),
  `isValidMinutes`.
- `decks.test.ts` (ajustar + adicionar):
  - O teste "contém os presets esperados" passa a esperar 7 presets, sem
    `'hours'`.
  - Substituir `buildDeck({ type: 'hours' })` (preset) por testes do novo ramo:
    conversão correta, dedup preservando ordem, rejeição de tokens inválidos,
    erro com `< 2` rótulos únicos.
  - `buildDeck({ type: 'custom' })` permanece como está.
- `DeckPicker.test.ts` (ajustar): contagem de `<option>` passa a
  `DECK_PRESETS.length + 2` (Horas + Customizado); Horas mostra o editor, não o
  preview.
- `stats.test.ts` (adicionar): modo horas — `average/min/max` em minutos a partir
  de rótulos; divergência dispara a `>60`, não a `>5`. Testes atuais (sem `unit`)
  permanecem.
- `customDeckStorage.test.ts` (adicionar): `save/loadLastHoursDeck` (round-trip e
  default `''`).
- `CustomDeckEditor.test.ts` (adicionar): com `hoursMode`, chip inválido recebe a
  classe vermelha e a mensagem de erro aparece; chip válido exibe o rótulo
  convertido.
