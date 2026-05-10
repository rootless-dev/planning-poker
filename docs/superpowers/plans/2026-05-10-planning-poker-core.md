# Planning Poker Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o core enxuto de um Planning Poker em tempo real (criar sala, compartilhar link, votar, revelar, presença) sobre Vue 3 + Firestore.

**Architecture:** SPA Vue 3 com camadas separadas — `services/firebase/` (sem Vue, testável), `composables/` (orquestração reativa), `views/` + `components/` (UI). Estado em tempo real via `onSnapshot` em um documento único `rooms/{roomId}` com map `participants`. Auth Anônimo do Firebase.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript 6, Bun, Pinia, Vue Router 4, Tailwind CSS 4 (`@tailwindcss/vite`), Firebase JS SDK 10+, Vitest, `@vue/test-utils`, `@firebase/rules-unit-testing`, Firebase Emulator Suite.

**Spec:** `docs/superpowers/specs/2026-05-10-planning-poker-core-design.md`

---

## Notas gerais para o executor

- **Linguagem das mensagens de commit:** inglês (convencional). Comentários no código: só quando o "porquê" não é óbvio.
- **TypeScript flag `erasableSyntaxOnly: true`** está ligado no `tsconfig.app.json`. Não use `enum`, `namespace`, parâmetros `private` em construtor — use `type` unions e classes "comuns".
- **TDD onde faz sentido:** lógica pura (`lib/stats.ts`), services (`services/firebase/rooms.ts`), composables, regras Firestore. Componentes puramente visuais (Hero, Footer) recebem smoke test depois.
- **Cada Task termina com um commit verde.** Se uma task ficou grande demais para um único commit lógico, ela já está dividida em sub-commits no plano.
- **Comandos do Bun:** este projeto usa Bun. Use `bun add`, `bun add -d`, `bun run <script>`, `bun x <bin>`. Onde precisar de CLI nativo, está explícito.
- **Política de versões:** **não fixe versões** ao adicionar dependências (`bun add foo`, não `bun add foo@^x.y`). Os pins que aparecem no plano são informacionais — Bun resolve a versão mais nova compatível. Aceitamos drift de major: `vue-router@5`, `pinia@3`, `happy-dom@20`, `@firebase/rules-unit-testing@5` são esperados e suas APIs core (createRouter, defineStore, initializeTestEnvironment etc.) são as que usamos. Se algum teste/build quebrar por mudança de API, ajustar pontualmente naquela task.
- **Firebase Emulator:** sempre que rodar testes que tocam Firestore/Auth, use `firebase emulators:exec "<comando>"` para subir o emulador, rodar o comando e derrubar — sem ficar pendurando processos.
- **Acessibilidade — focus trap:** o `Modal.vue` que entregamos no core tem `aria-modal="true"` e fecha com Escape (quando `closable !== false`), mas **não** implementa focus trap completo (manter foco preso dentro do modal com Tab). É um trade-off aceito para o core — adicionar uma lib (`focus-trap-vue`) ou implementação manual fica para fase 2 junto com o restante de polish de acessibilidade.

---

## Task 0: Pré-requisitos manuais do usuário

Esta task é **majoritariamente manual** (precisa do navegador + autenticação do Firebase CLI). O executor automatizado deve **pausar e pedir ao usuário** que execute estes passos antes de prosseguir para a Task 1.

**Files:**
- Nenhum no repo. Criação de projeto Firebase + configuração externa.

- [ ] **Step 1: Pedir ao usuário que crie um projeto Firebase**

Mostrar a mensagem:

> Acesse <https://console.firebase.google.com/>, crie um novo projeto chamado "planning-poker" (ou similar). Pode pular Google Analytics. Quando terminar, me diga o **Project ID** (algo como `planning-poker-1a2b3`).

Aguardar o `projectId` antes de seguir.

- [ ] **Step 2: Pedir ao usuário que habilite Auth Anônimo**

> No console do Firebase: **Build → Authentication → Get started → Sign-in method → Anonymous → Enable → Save**.

- [ ] **Step 3: Pedir ao usuário que crie banco Firestore**

> No console do Firebase: **Build → Firestore Database → Create database → Start in production mode → escolher região (recomendado `southamerica-east1` para latência no Brasil)**.

- [ ] **Step 4: Pedir ao usuário que registre um Web App**

> **Project settings (⚙️) → Your apps → Web (`</>`) → Register app → "planning-poker-web"** (sem Firebase Hosting por enquanto). Copiar o objeto `firebaseConfig` retornado e me passar (ou guardar para usar no Step 7).

- [ ] **Step 5: Pedir ao usuário que instale e autentique o Firebase CLI**

> No terminal:
>
> ```bash
> bun add -g firebase-tools
> firebase login
> ```

- [ ] **Step 6: Configurar Firestore TTL**

> No console: **Firestore Database → TTL → Add policy → Collection `rooms` → Field `expiresAt` → Save**.

- [ ] **Step 7: Confirmar conclusão**

Pedir ao usuário que confirme: "Auth anônimo habilitado? Firestore criado? CLI logado? TTL configurado? Web App registrado e config copiada?"

Quando confirmar, prosseguir para Task 1.

---

## Task 1: Setup de tooling e dependências

**Files:**
- Modify: `package.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js` *(só se Tailwind v4 não dispensar — ver Step 5)*
- Modify: `vite.config.ts`
- Create: `vitest.config.ts`
- Modify: `src/style.css`
- Modify: `src/main.ts`
- Modify: `src/App.vue`
- Delete: `src/components/HelloWorld.vue`, `src/assets/vue.svg`, `src/assets/hero.png`, `src/assets/vite.svg`
- Create: `.env.example`
- Create: `.env.local`
- Create: `firebase.json`
- Create: `.firebaserc`
- Create: `firestore.rules`
- Create: `firestore.indexes.json`

- [ ] **Step 1: Adicionar dependências de runtime**

```bash
bun add vue-router@^4.4 pinia@^2.2 firebase@^10.13
```

Saída esperada: dependências adicionadas em `package.json` e `bun.lock` atualizado.

- [ ] **Step 2: Adicionar dependências de dev**

```bash
bun add -d tailwindcss@^4 @tailwindcss/vite@^4 vitest@^2 @vue/test-utils@^2.4 happy-dom@^15 @firebase/rules-unit-testing@^3 firebase-tools@^13
```

- [ ] **Step 3: Atualizar `package.json` com scripts**

Substituir o bloco `"scripts"` em `package.json` por:

```json
"scripts": {
  "dev": "vite",
  "build": "vue-tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:integration": "firebase emulators:exec --only firestore,auth 'vitest run --config vitest.integration.config.ts'",
  "emu": "firebase emulators:start --only firestore,auth",
  "lint:types": "vue-tsc -b --noEmit"
}
```

- [ ] **Step 4: Configurar Vite com Tailwind plugin**

Substituir o conteúdo de `vite.config.ts` por:

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

- [ ] **Step 5: Configurar Tailwind 4 (CSS-first)**

Substituir o conteúdo de `src/style.css` por:

```css
@import "tailwindcss";

@theme {
  --color-brand: #9b6bff;
  --color-accent: #5cd4ff;
  --color-warm: #ffd6e8;
  --color-sand: #ffe7c2;
  --color-cool: #c2f0ff;

  --color-ink: #3b1d6b;
  --color-muted: #6b4aa1;
  --color-surface: #ffffff;
  --color-canvas: #fff5fa;

  --font-display: "Inter", ui-sans-serif, system-ui, sans-serif;
  --radius-card: 14px;
}

@layer base {
  :root {
    color-scheme: light;
  }
  .dark {
    color-scheme: dark;
    --color-ink: #f5efff;
    --color-muted: #b9a7e0;
    --color-surface: #1c1530;
    --color-canvas: #0e0a1f;
  }
  html, body, #app {
    height: 100%;
  }
  body {
    background: var(--color-canvas);
    color: var(--color-ink);
    font-family: var(--font-display);
    -webkit-font-smoothing: antialiased;
  }
  *, *::before, *::after {
    box-sizing: border-box;
  }
}
```

Tailwind 4 lê CSS variables direto do `@theme {}` — não precisa de `tailwind.config.ts` nem `postcss.config.js` para esse caso. **Pular** a criação desses dois arquivos listados nos "Files".

- [ ] **Step 6: Limpar arquivos do scaffold**

```bash
rm src/components/HelloWorld.vue src/assets/vue.svg src/assets/hero.png src/assets/vite.svg
```

Substituir conteúdo de `src/App.vue` por:

```vue
<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>
```

Substituir conteúdo de `src/main.ts` por:

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import App from './App.vue'
import './style.css'

createApp(App)
  .use(createPinia())
  .use(router)
  .mount('#app')
```

(O `./router` ainda não existe — será criado na Task 4. Para esta Task 1 terminar com `bun run dev` funcionando, pular criação do router por enquanto e remover `.use(router)` da chamada acima até a Task 4. **Decisão:** manter a referência ao router e criar um stub mínimo já neste passo:)

Criar `src/router/index.ts`:

```ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
```

Criar stub mínimo `src/views/HomeView.vue`:

```vue
<template>
  <main class="p-8">
    <h1 class="text-2xl font-bold">Planning Poker</h1>
    <p class="text-muted">Setup OK 👋</p>
  </main>
</template>
```

- [ ] **Step 7: Criar configuração Firebase + emulator**

Criar `firebase.json`:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
```

Criar `.firebaserc` (substituir `<PROJECT_ID>` pelo valor do usuário capturado na Task 0):

```json
{
  "projects": {
    "default": "<PROJECT_ID>"
  }
}
```

Criar `firestore.rules` (regras stub permissivas — endurecemos na Task 6):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Criar `firestore.indexes.json`:

```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

- [ ] **Step 8: Criar `.env.example` e `.env.local`**

Criar `.env.example`:

```bash
VITE_FB_API_KEY=
VITE_FB_AUTH_DOMAIN=
VITE_FB_PROJECT_ID=
VITE_FB_STORAGE_BUCKET=
VITE_FB_APP_ID=
VITE_USE_EMULATOR=true
```

Criar `.env.local` preenchendo cada campo com os valores que o usuário recebeu na Task 0 Step 4 (`firebaseConfig`). `VITE_USE_EMULATOR=true` para que o app rode contra o emulator em `bun run dev`.

Adicionar `.env.local` ao `.gitignore` se ainda não estiver coberto pelo `*.local` existente (já está — confirmar).

- [ ] **Step 9: Criar `vitest.config.ts` (testes unitários)**

```ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts'],
    globals: false,
  },
})
```

Criar também `vitest.integration.config.ts` (vamos popular na Task 5):

```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globals: false,
    testTimeout: 15000,
  },
})
```

- [ ] **Step 10: Validar tudo**

```bash
bun run lint:types
bun run dev
```

Esperado: `lint:types` passa sem erros; `bun run dev` sobe Vite em <http://localhost:5173> e mostra "Setup OK 👋" na home.

Encerrar `bun run dev` (Ctrl+C).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: setup tooling (tailwind, pinia, router, vitest, firebase)

Adds Vue Router, Pinia, Tailwind CSS 4 with CSS-first config, Vitest with
integration variant, Firebase SDK + emulator scaffolding, env example, and a
minimal HomeView stub so the dev server starts cleanly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Tipos e libs puras

Lógica que não depende de Vue nem de Firebase. TDD direto.

**Files:**
- Create: `src/types/room.ts`
- Create: `src/lib/uuid.ts`
- Create: `src/lib/decks.ts`
- Create: `src/lib/stats.ts`
- Create: `src/lib/time.ts`
- Create: `tests/unit/lib/decks.test.ts`
- Create: `tests/unit/lib/stats.test.ts`
- Create: `tests/unit/lib/time.test.ts`

- [ ] **Step 1: Criar tipos compartilhados**

Criar `src/types/room.ts`:

```ts
import type { Timestamp } from 'firebase/firestore'

export type DeckType = 'fibonacci' | 'tshirt' | 'custom'

export interface Deck {
  type: DeckType
  values: string[]
}

export interface Participant {
  name: string
  vote: string | null
  lastSeenAt: Timestamp
  joinedAt: Timestamp
}

export interface Round {
  taskTitle: string
  revealed: boolean
  startedAt: Timestamp
}

export interface Room {
  id: string
  name: string
  createdAt: Timestamp
  lastActivityAt: Timestamp
  expiresAt: Timestamp
  moderatorUid: string
  deck: Deck
  round: Round
  participants: Record<string, Participant>
}

export type PresenceState = 'online' | 'absent' | 'offline'
```

- [ ] **Step 2: `src/lib/uuid.ts`**

```ts
export function newRoomId(): string {
  return crypto.randomUUID()
}
```

(Sem teste — wrapper trivial sobre API nativa.)

- [ ] **Step 3: Teste de `decks.ts` (red)**

Criar `tests/unit/lib/decks.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildDeck, FIBONACCI, TSHIRT } from '@/lib/decks'

describe('buildDeck', () => {
  it('retorna a sequência Fibonacci canônica', () => {
    const deck = buildDeck({ type: 'fibonacci' })
    expect(deck.type).toBe('fibonacci')
    expect(deck.values).toEqual(FIBONACCI)
  })

  it('retorna a sequência T-shirt canônica', () => {
    const deck = buildDeck({ type: 'tshirt' })
    expect(deck.values).toEqual(TSHIRT)
  })

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
```

Rodar: `bun run test tests/unit/lib/decks.test.ts`
Esperado: FAIL — módulo `@/lib/decks` não existe.

- [ ] **Step 4: Implementar `decks.ts` (green)**

Criar `src/lib/decks.ts`:

```ts
import type { Deck, DeckType } from '@/types/room'

export const FIBONACCI = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕']
export const TSHIRT = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕']

interface BuildOptions {
  type: DeckType
  customValues?: string[]
}

export function buildDeck(opts: BuildOptions): Deck {
  if (opts.type === 'fibonacci') return { type: 'fibonacci', values: [...FIBONACCI] }
  if (opts.type === 'tshirt') return { type: 'tshirt', values: [...TSHIRT] }

  const cleaned = (opts.customValues ?? [])
    .map(v => v.trim())
    .filter(v => v.length > 0)
  const unique = Array.from(new Set(cleaned))
  if (unique.length < 2) {
    throw new Error('Deck custom precisa de ao menos 2 valores únicos')
  }
  return { type: 'custom', values: unique }
}
```

Rodar: `bun run test tests/unit/lib/decks.test.ts`
Esperado: PASS (5 testes).

- [ ] **Step 5: Teste de `stats.ts` (red)**

Criar `tests/unit/lib/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeStats } from '@/lib/stats'

describe('computeStats', () => {
  it('ignora não-numéricos no cálculo', () => {
    const r = computeStats(['1', '3', '5', '?', '☕'])
    expect(r.numericCount).toBe(3)
    expect(r.average).toBe(3)
    expect(r.min).toBe(1)
    expect(r.max).toBe(5)
  })

  it('calcula moda na string original (mantém T-shirt sizes)', () => {
    const r = computeStats(['M', 'M', 'L', '?'])
    expect(r.mode).toBe('M')
    expect(r.numericCount).toBe(0)
    expect(r.average).toBeNull()
  })

  it('moda numérica volta como string', () => {
    const r = computeStats(['5', '5', '8'])
    expect(r.mode).toBe('5')
  })

  it('lista vazia retorna zeros', () => {
    const r = computeStats([])
    expect(r).toEqual({
      numericCount: 0,
      average: null,
      mode: null,
      min: null,
      max: null,
      divergent: false,
    })
  })

  it('marca divergent quando max - min >= 5', () => {
    expect(computeStats(['1', '8']).divergent).toBe(true)
    expect(computeStats(['3', '5', '8']).divergent).toBe(false)
    expect(computeStats(['1', '13']).divergent).toBe(true)
  })

  it('moda escolhe o primeiro empate na ordem do input', () => {
    const r = computeStats(['3', '5', '3', '5'])
    expect(r.mode).toBe('3')
  })
})
```

Rodar: `bun run test tests/unit/lib/stats.test.ts`
Esperado: FAIL.

- [ ] **Step 6: Implementar `stats.ts` (green)**

Criar `src/lib/stats.ts`:

```ts
export interface Stats {
  numericCount: number
  average: number | null
  mode: string | null
  min: number | null
  max: number | null
  divergent: boolean
}

export function computeStats(votes: string[]): Stats {
  if (votes.length === 0) {
    return { numericCount: 0, average: null, mode: null, min: null, max: null, divergent: false }
  }

  const numericValues: number[] = []
  for (const v of votes) {
    const n = Number(v)
    if (Number.isFinite(n)) numericValues.push(n)
  }

  const numericCount = numericValues.length
  const average = numericCount > 0
    ? Math.round((numericValues.reduce((a, b) => a + b, 0) / numericCount) * 100) / 100
    : null
  const min = numericCount > 0 ? Math.min(...numericValues) : null
  const max = numericCount > 0 ? Math.max(...numericValues) : null
  const divergent = min !== null && max !== null && max - min >= 5

  const counts = new Map<string, number>()
  const firstSeen = new Map<string, number>()
  votes.forEach((v, i) => {
    counts.set(v, (counts.get(v) ?? 0) + 1)
    if (!firstSeen.has(v)) firstSeen.set(v, i)
  })

  let mode: string | null = null
  let bestCount = 0
  let bestFirstSeen = Infinity
  for (const [value, count] of counts) {
    const seen = firstSeen.get(value) ?? Infinity
    if (count > bestCount || (count === bestCount && seen < bestFirstSeen)) {
      mode = value
      bestCount = count
      bestFirstSeen = seen
    }
  }

  return { numericCount, average, mode, min, max, divergent }
}
```

Rodar: `bun run test tests/unit/lib/stats.test.ts`
Esperado: PASS (6 testes).

- [ ] **Step 7: Teste de `time.ts` (red)**

Criar `tests/unit/lib/time.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { presenceFor } from '@/lib/time'

function tsAgo(seconds: number): Timestamp {
  return Timestamp.fromMillis(Date.now() - seconds * 1000)
}

describe('presenceFor', () => {
  it('online se < 30s', () => {
    expect(presenceFor(tsAgo(5))).toBe('online')
    expect(presenceFor(tsAgo(29))).toBe('online')
  })

  it('absent se 30..89s', () => {
    expect(presenceFor(tsAgo(30))).toBe('absent')
    expect(presenceFor(tsAgo(89))).toBe('absent')
  })

  it('offline se >= 90s', () => {
    expect(presenceFor(tsAgo(90))).toBe('offline')
    expect(presenceFor(tsAgo(3600))).toBe('offline')
  })

  it('null/undefined → offline', () => {
    expect(presenceFor(null)).toBe('offline')
    expect(presenceFor(undefined)).toBe('offline')
  })
})
```

Rodar: `bun run test tests/unit/lib/time.test.ts` → FAIL.

- [ ] **Step 8: Implementar `time.ts` (green)**

Criar `src/lib/time.ts`:

```ts
import type { Timestamp } from 'firebase/firestore'
import type { PresenceState } from '@/types/room'

const ONLINE_LIMIT_MS = 30_000
const OFFLINE_LIMIT_MS = 90_000

export function presenceFor(lastSeenAt: Timestamp | null | undefined): PresenceState {
  if (!lastSeenAt) return 'offline'
  const diffMs = Date.now() - lastSeenAt.toMillis()
  if (diffMs < ONLINE_LIMIT_MS) return 'online'
  if (diffMs < OFFLINE_LIMIT_MS) return 'absent'
  return 'offline'
}
```

Rodar: `bun run test tests/unit/lib/time.test.ts` → PASS.

- [ ] **Step 9: Rodar a suíte completa**

```bash
bun run test
```

Esperado: 15 testes (5 + 6 + 4) verdes.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(lib): pure libs (decks, stats, time) and shared types

- decks: presets Fibonacci/T-shirt + custom builder with dedup/trim
- stats: average/mode/min/max with divergence flag (max-min>=5)
- time: presence state machine (online <30s, absent <90s, offline)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: UI base — design tokens, header e componentes reutilizáveis

**Files:**
- Create: `src/composables/useDarkMode.ts`
- Create: `src/composables/useToasts.ts`
- Create: `src/components/AppHeader.vue`
- Create: `src/components/ui/PrimaryButton.vue`
- Create: `src/components/ui/GhostButton.vue`
- Create: `src/components/ui/TextField.vue`
- Create: `src/components/ui/Modal.vue`
- Create: `src/components/ui/Toast.vue`
- Create: `src/components/ToastsLayer.vue`
- Modify: `src/App.vue`
- Create: `tests/unit/composables/useDarkMode.test.ts`

- [ ] **Step 1: Teste de `useDarkMode` (red)**

Criar `tests/unit/composables/useDarkMode.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useDarkMode } from '@/composables/useDarkMode'

describe('useDarkMode', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    localStorage.clear()
  })

  it('inicia em light por padrão', () => {
    const { isDark } = useDarkMode()
    expect(isDark.value).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggle alterna e persiste no localStorage', () => {
    const { toggle, isDark } = useDarkMode()
    toggle()
    expect(isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('pp:dark')).toBe('1')
  })

  it('respeita persistência ao reinicializar', () => {
    localStorage.setItem('pp:dark', '1')
    const { isDark } = useDarkMode()
    expect(isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
```

Rodar → FAIL.

- [ ] **Step 2: Implementar `useDarkMode` (green)**

Criar `src/composables/useDarkMode.ts`:

```ts
import { ref, watch } from 'vue'

const KEY = 'pp:dark'
const isDark = ref<boolean>(read())

function read(): boolean {
  if (typeof localStorage === 'undefined') return false
  const stored = localStorage.getItem(KEY)
  if (stored === '1') return true
  if (stored === '0') return false
  return typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-color-scheme: dark)').matches
}

function apply(value: boolean) {
  document.documentElement.classList.toggle('dark', value)
  localStorage.setItem(KEY, value ? '1' : '0')
}

apply(isDark.value)
watch(isDark, apply)

export function useDarkMode() {
  return {
    isDark,
    toggle: () => { isDark.value = !isDark.value },
  }
}
```

Rodar → PASS.

- [ ] **Step 3: Implementar `useToasts`**

Criar `src/composables/useToasts.ts`:

```ts
import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  variant: 'info' | 'success' | 'error'
}

const toasts = ref<Toast[]>([])
let nextId = 1

export function useToasts() {
  function push(message: string, variant: Toast['variant'] = 'info', timeoutMs = 3000) {
    const id = nextId++
    toasts.value.push({ id, message, variant })
    if (timeoutMs > 0) {
      setTimeout(() => dismiss(id), timeoutMs)
    }
  }
  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }
  return { toasts, push, dismiss }
}
```

(Sem teste — comportamento trivial; será usado nos smoke tests dos componentes que dependem dele.)

- [ ] **Step 4: `PrimaryButton` e `GhostButton`**

Criar `src/components/ui/PrimaryButton.vue`:

```vue
<script setup lang="ts">
defineProps<{ disabled?: boolean; type?: 'button' | 'submit' }>()
</script>

<template>
  <button
    :type="type ?? 'button'"
    :disabled="disabled"
    class="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform"
    style="background: linear-gradient(135deg, var(--color-brand), var(--color-accent));"
    :class="disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'"
  >
    <slot />
  </button>
</template>
```

Criar `src/components/ui/GhostButton.vue`:

```vue
<script setup lang="ts">
defineProps<{ disabled?: boolean; type?: 'button' | 'submit' }>()
</script>

<template>
  <button
    :type="type ?? 'button'"
    :disabled="disabled"
    class="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors"
    style="border: 1px solid color-mix(in srgb, var(--color-ink) 20%, transparent); color: var(--color-ink);"
    :class="disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)]'"
  >
    <slot />
  </button>
</template>
```

- [ ] **Step 5: `TextField`**

Criar `src/components/ui/TextField.vue`:

```vue
<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  required?: boolean
  maxlength?: number
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <label class="block">
    <span v-if="label" class="block text-sm font-semibold mb-1" style="color: var(--color-muted);">{{ label }}</span>
    <input
      :value="props.modelValue"
      :placeholder="placeholder"
      :required="required"
      :maxlength="maxlength"
      @input="onInput"
      class="w-full rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2"
      style="background: var(--color-surface); color: var(--color-ink); border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent);"
    />
  </label>
</template>
```

- [ ] **Step 6: `Modal`**

Criar `src/components/ui/Modal.vue`:

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'

const props = defineProps<{ open: boolean; title?: string; closable?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const dialogRef = ref<HTMLDialogElement | null>(null)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open && props.closable !== false) emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style="background: color-mix(in srgb, black 50%, transparent);"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref="dialogRef"
        class="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style="background: var(--color-surface); color: var(--color-ink);"
      >
        <h2 v-if="title" class="text-lg font-bold mb-4">{{ title }}</h2>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
```

- [ ] **Step 7: `Toast` e `ToastsLayer`**

Criar `src/components/ui/Toast.vue`:

```vue
<script setup lang="ts">
import type { Toast } from '@/composables/useToasts'

const props = defineProps<{ toast: Toast }>()
const emit = defineEmits<{ dismiss: [id: number] }>()

const variantStyle: Record<Toast['variant'], string> = {
  info: 'background: var(--color-surface); color: var(--color-ink); border: 1px solid color-mix(in srgb, var(--color-ink) 12%, transparent);',
  success: 'background: var(--color-cool); color: var(--color-ink);',
  error: 'background: var(--color-warm); color: var(--color-ink);',
}
</script>

<template>
  <button
    type="button"
    @click="emit('dismiss', props.toast.id)"
    class="px-4 py-2 rounded-full text-sm shadow-md cursor-pointer text-left"
    :style="variantStyle[props.toast.variant]"
  >
    {{ props.toast.message }}
  </button>
</template>
```

Criar `src/components/ToastsLayer.vue`:

```vue
<script setup lang="ts">
import { useToasts } from '@/composables/useToasts'
import Toast from './ui/Toast.vue'
const { toasts, dismiss } = useToasts()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end" aria-live="polite">
      <Toast v-for="t in toasts" :key="t.id" :toast="t" @dismiss="dismiss" />
    </div>
  </Teleport>
</template>
```

- [ ] **Step 8: `AppHeader` e plug em `App.vue`**

Criar `src/components/AppHeader.vue`:

```vue
<script setup lang="ts">
import { useDarkMode } from '@/composables/useDarkMode'
import { RouterLink } from 'vue-router'
const { isDark, toggle } = useDarkMode()
</script>

<template>
  <header
    class="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
    style="backdrop-filter: blur(12px); background: color-mix(in srgb, var(--color-canvas) 80%, transparent);"
  >
    <RouterLink to="/" class="font-bold text-lg" style="color: var(--color-ink);">🃏 Planning Poker</RouterLink>
    <button
      type="button"
      @click="toggle"
      class="rounded-full px-3 py-1.5 text-sm font-semibold"
      style="border: 1px solid color-mix(in srgb, var(--color-ink) 20%, transparent); color: var(--color-ink);"
      :aria-pressed="isDark"
      aria-label="Alternar tema"
    >
      {{ isDark ? '☀️ Claro' : '🌙 Escuro' }}
    </button>
  </header>
</template>
```

Substituir `src/App.vue`:

```vue
<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import ToastsLayer from '@/components/ToastsLayer.vue'
</script>

<template>
  <AppHeader />
  <RouterView />
  <ToastsLayer />
</template>
```

- [ ] **Step 9: Rodar testes + dev**

```bash
bun run test
bun run dev
```

Esperado: testes passam (15 + 3 = 18). Browser mostra header com toggle dark/light funcionando.

Encerrar dev.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(ui): design tokens, dark mode, header and base components

- useDarkMode composable with localStorage persistence and prefers-color-scheme fallback
- useToasts composable with auto-dismiss
- PrimaryButton, GhostButton, TextField, Modal, Toast/ToastsLayer
- AppHeader with theme toggle wired into App.vue

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Home view

**Files:**
- Modify: `src/views/HomeView.vue`
- Create: `src/components/home/HeroSection.vue`
- Create: `src/components/home/HomeFooter.vue`
- Modify: `src/router/index.ts` *(adicionar `/session`, `/session/:id`)*
- Create: `src/views/CreateSessionView.vue` *(stub)*
- Create: `src/views/RoomView.vue` *(stub)*

- [ ] **Step 1: Atualizar router**

Substituir `src/router/index.ts`:

```ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  { path: '/session', name: 'create-session', component: () => import('@/views/CreateSessionView.vue') },
  { path: '/session/:id', name: 'room', component: () => import('@/views/RoomView.vue'), props: true },
  { path: '/:catchAll(.*)', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
```

- [ ] **Step 2: Stubs de Create + Room**

Criar `src/views/CreateSessionView.vue`:

```vue
<template>
  <main class="p-8 max-w-md mx-auto">
    <h1 class="text-2xl font-bold mb-4">Criar sala</h1>
    <p style="color: var(--color-muted);">Form vem na Task 6.</p>
  </main>
</template>
```

Criar `src/views/RoomView.vue`:

```vue
<script setup lang="ts">
defineProps<{ id: string }>()
</script>

<template>
  <main class="p-8 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold">Sala {{ id }}</h1>
    <p style="color: var(--color-muted);">Sala vem na Task 7.</p>
  </main>
</template>
```

- [ ] **Step 3: `HeroSection`**

Criar `src/components/home/HeroSection.vue`:

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'
import GhostButton from '@/components/ui/GhostButton.vue'
import TextField from '@/components/ui/TextField.vue'
import Modal from '@/components/ui/Modal.vue'

const router = useRouter()
const showJoin = ref(false)
const joinUrl = ref('')

function goCreate() { router.push({ name: 'create-session' }) }

function tryJoin() {
  const match = joinUrl.value.match(/\/session\/([0-9a-fA-F-]{36})/)
  if (match) {
    router.push({ name: 'room', params: { id: match[1] } })
    showJoin.value = false
  } else if (/^[0-9a-fA-F-]{36}$/.test(joinUrl.value.trim())) {
    router.push({ name: 'room', params: { id: joinUrl.value.trim() } })
    showJoin.value = false
  }
}
</script>

<template>
  <section class="flex flex-col items-center justify-center px-4 py-16 text-center">
    <div class="flex gap-3 mb-8" aria-hidden="true">
      <div class="w-14 h-20 rounded-xl flex items-center justify-center text-xl font-extrabold" style="background: linear-gradient(135deg,var(--color-warm),#ffeaf2); color: var(--color-ink); transform: rotate(-6deg); box-shadow: 0 8px 24px rgba(91,58,138,.18);">3</div>
      <div class="w-14 h-20 rounded-xl flex items-center justify-center text-xl font-extrabold" style="background: var(--color-surface); color: var(--color-ink); box-shadow: 0 8px 24px rgba(91,58,138,.18); transform: translateY(-6px);">5</div>
      <div class="w-14 h-20 rounded-xl flex items-center justify-center text-xl font-extrabold" style="background: linear-gradient(135deg,var(--color-cool),#dff6ff); color: var(--color-ink); transform: rotate(6deg); box-shadow: 0 8px 24px rgba(91,58,138,.18);">8</div>
    </div>

    <h1 class="text-3xl sm:text-5xl font-extrabold mb-3" style="color: var(--color-ink);">
      Estimativas em time,<br />sem fricção.
    </h1>
    <p class="max-w-md mb-8 text-sm sm:text-base" style="color: var(--color-muted);">
      Crie uma sala em segundos, mande o link e vote junto. Sem cadastro.
    </p>

    <div class="flex flex-wrap gap-3 justify-center">
      <PrimaryButton @click="goCreate">Criar sala</PrimaryButton>
      <GhostButton @click="showJoin = true">Entrar com link</GhostButton>
    </div>

    <Modal :open="showJoin" title="Entrar em uma sala" @close="showJoin = false">
      <form @submit.prevent="tryJoin" class="flex flex-col gap-3">
        <TextField v-model="joinUrl" label="Link ou ID da sala" placeholder="https://… ou UUID" />
        <div class="flex justify-end gap-2">
          <GhostButton @click="showJoin = false">Cancelar</GhostButton>
          <PrimaryButton type="submit">Entrar</PrimaryButton>
        </div>
      </form>
    </Modal>
  </section>
</template>
```

- [ ] **Step 4: `HomeFooter`**

Criar `src/components/home/HomeFooter.vue`:

```vue
<template>
  <footer class="text-center py-6 text-xs" style="color: var(--color-muted);">
    Construído com Vue + Firebase. <a href="https://github.com" class="underline">Código no GitHub</a>.
  </footer>
</template>
```

- [ ] **Step 5: `HomeView` final**

Substituir `src/views/HomeView.vue`:

```vue
<script setup lang="ts">
import HeroSection from '@/components/home/HeroSection.vue'
import HomeFooter from '@/components/home/HomeFooter.vue'
</script>

<template>
  <HeroSection />
  <HomeFooter />
</template>
```

- [ ] **Step 6: Validar manualmente**

```bash
bun run dev
```

Abrir <http://localhost:5173>. Esperado:
- Hero com 3 cartas, headline, dois botões.
- "Criar sala" navega para `/session` (stub).
- "Entrar com link" abre modal; colar `<host>/session/<uuid-qualquer>` ou um UUID navega para `/session/:id`.
- Toggle dark/light funciona.

Encerrar dev.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(home): hero, join modal and routing scaffolding

HomeView with HeroSection (CTAs to create + join via UUID/link modal) and
HomeFooter. Router gains /session and /session/:id placeholder routes plus
catchall redirect to home.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Firebase services + Auth Anônimo

**Files:**
- Create: `src/services/firebase/index.ts`
- Create: `src/services/firebase/auth.ts`
- Create: `src/stores/authStore.ts`
- Create: `src/composables/useAuth.ts`
- Modify: `src/main.ts` *(garantir auth ready antes de mount)*
- Create: `tests/integration/auth.test.ts`
- Create: `tests/integration/_setup.ts`

- [ ] **Step 1: Helpers de inicialização**

Criar `src/services/firebase/index.ts`:

```ts
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore'

let _app: FirebaseApp | null = null
let _auth: Auth | null = null
let _db: Firestore | null = null

function readConfig() {
  return {
    apiKey: import.meta.env.VITE_FB_API_KEY,
    authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FB_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
    appId: import.meta.env.VITE_FB_APP_ID,
  }
}

export function getFirebase() {
  if (_app) return { app: _app, auth: _auth!, db: _db! }
  _app = initializeApp(readConfig())
  _auth = getAuth(_app)
  _db = getFirestore(_app)

  if (import.meta.env.VITE_USE_EMULATOR === 'true') {
    connectAuthEmulator(_auth, 'http://localhost:9099', { disableWarnings: true })
    connectFirestoreEmulator(_db, 'localhost', 8080)
  }
  return { app: _app, auth: _auth, db: _db }
}
```

- [ ] **Step 2: Service de auth**

Criar `src/services/firebase/auth.ts`:

```ts
import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth'
import { getFirebase } from './index'

export async function ensureAnonymousUser(): Promise<User> {
  const { auth } = getFirebase()
  if (auth.currentUser) return auth.currentUser
  const credential = await signInAnonymously(auth)
  return credential.user
}

export function onAuth(callback: (user: User | null) => void): () => void {
  const { auth } = getFirebase()
  return onAuthStateChanged(auth, callback)
}
```

- [ ] **Step 3: Pinia store + composable**

Criar `src/stores/authStore.ts`:

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from 'firebase/auth'
import { ensureAnonymousUser, onAuth } from '@/services/firebase/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const ready = ref(false)
  let unsubscribe: (() => void) | null = null

  async function init() {
    if (ready.value) return
    return new Promise<void>((resolve) => {
      unsubscribe = onAuth(async (u) => {
        if (u) {
          user.value = u
        } else {
          user.value = await ensureAnonymousUser()
        }
        ready.value = true
        resolve()
      })
    })
  }

  function dispose() {
    unsubscribe?.()
    unsubscribe = null
  }

  return { user, ready, init, dispose }
})
```

Criar `src/composables/useAuth.ts`:

```ts
import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const store = useAuthStore()
  return {
    uid: computed(() => store.user?.uid ?? null),
    ready: computed(() => store.ready),
    init: store.init,
  }
}
```

- [ ] **Step 4: Inicializar auth antes do mount**

Substituir `src/main.ts`:

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import App from './App.vue'
import { useAuthStore } from './stores/authStore'
import './style.css'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia).use(router)

  const authStore = useAuthStore(pinia)
  await authStore.init()

  app.mount('#app')
}

void bootstrap()
```

- [ ] **Step 5: Helper de testes integração**

Criar `tests/integration/_setup.ts`:

```ts
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, terminate } from 'firebase/firestore'

const PROJECT_ID = 'planning-poker-test'

export interface TestEnv {
  app: FirebaseApp
  auth: ReturnType<typeof getAuth>
  db: ReturnType<typeof getFirestore>
  uid: string
  cleanup: () => Promise<void>
}

export async function makeTestEnv(name = 'default'): Promise<TestEnv> {
  const app = initializeApp({ apiKey: 'fake-api-key', projectId: PROJECT_ID }, `${name}-${Math.random()}`)
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  const db = getFirestore(app)
  connectFirestoreEmulator(db, 'localhost', 8080)
  const cred = await signInAnonymously(auth)
  return {
    app,
    auth,
    db,
    uid: cred.user.uid,
    cleanup: async () => {
      await terminate(db)
      await deleteApp(app)
    },
  }
}
```

- [ ] **Step 6: Teste de integração de auth (red)**

Criar `tests/integration/auth.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { makeTestEnv } from './_setup'

describe('Firebase Auth Anônimo (emulator)', () => {
  it('cria um usuário anônimo com UID estável dentro da sessão', async () => {
    const env = await makeTestEnv('auth-1')
    expect(env.uid).toBeTruthy()
    expect(env.auth.currentUser?.uid).toBe(env.uid)
    await env.cleanup()
  })

  it('dois envs criam UIDs distintos', async () => {
    const a = await makeTestEnv('auth-2a')
    const b = await makeTestEnv('auth-2b')
    expect(a.uid).not.toBe(b.uid)
    await a.cleanup()
    await b.cleanup()
  })
})
```

- [ ] **Step 7: Rodar com emulator**

```bash
bun run test:integration
```

Esperado: o `firebase emulators:exec` sobe Firestore + Auth, roda o vitest integration, derruba. Saída: 2 testes verdes.

Se falhar com `EADDRINUSE`, garantir que nenhum emulator está pendurado: `lsof -ti:8080,9099 | xargs kill`.

- [ ] **Step 8: Validar app rodando**

```bash
bun run emu &  # em outro terminal: deixa emulator no ar
bun run dev
```

Abrir <http://localhost:5173>. Console do browser deve mostrar autenticação anônima silenciosa (sem erros). Conferir no UI do emulator (<http://localhost:4000>) → Auth: aparece um usuário anônimo.

Encerrar dev e emulator.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(auth): firebase init + anonymous sign-in pre-mount

- src/services/firebase/index.ts initializes app + connects to emulators when VITE_USE_EMULATOR=true
- ensureAnonymousUser + onAuth helpers
- authStore (Pinia) waits for first auth state before resolving init()
- bootstrap awaits authStore.init() before app.mount
- integration test harness (tests/integration/_setup.ts) and first auth test

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Criar sala — service + view + regras Firestore

**Files:**
- Create: `src/services/firebase/rooms.ts`
- Create: `src/components/create/DeckPicker.vue`
- Create: `src/components/create/CustomDeckEditor.vue`
- Modify: `src/views/CreateSessionView.vue`
- Modify: `firestore.rules`
- Create: `tests/integration/rooms-create.test.ts`
- Create: `tests/integration/rules.test.ts`

- [ ] **Step 1: Endurecer `firestore.rules`**

Substituir `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /rooms/{roomId} {

      allow read: if request.auth != null;

      allow create: if request.auth != null
                    && request.auth.uid == request.resource.data.moderatorUid
                    && request.resource.data.id == roomId;

      allow update: if request.auth != null && (
        isModerator()
        || isSelfUpdatingOwnParticipant()
      );

      allow delete: if request.auth != null && resource.data.moderatorUid == request.auth.uid;

      function isModerator() {
        return resource.data.moderatorUid == request.auth.uid;
      }

      function isSelfUpdatingOwnParticipant() {
        // Permite atualizar somente o próprio participants.{uid} e os campos de
        // atividade (lastActivityAt, expiresAt). Bloqueia mudar moderatorUid,
        // round.revealed, deck etc.
        let allowedRootKeys = ['participants', 'lastActivityAt', 'expiresAt'].toSet();
        let changedRoot = request.resource.data.diff(resource.data).affectedKeys();
        let onlyAllowedRoot = changedRoot.hasOnly(allowedRootKeys);

        let myKey = request.auth.uid;
        let oldParticipants = resource.data.participants;
        let newParticipants = request.resource.data.participants;
        let participantKeysChanged = newParticipants.diff(oldParticipants).affectedKeys();

        // Apenas a chave do próprio uid pode mudar dentro de participants.
        let onlySelfKeyChanged = participantKeysChanged.hasOnly([myKey].toSet());

        // Não pode remover seu próprio nó (kick é só do mod).
        let stillPresent = newParticipants.keys().hasAll([myKey]);

        return onlyAllowedRoot && onlySelfKeyChanged && stillPresent;
      }
    }
  }
}
```

- [ ] **Step 2: Service `rooms.ts` — só `createRoom` por enquanto**

Criar `src/services/firebase/rooms.ts`:

```ts
import {
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { getFirebase } from './index'
import { newRoomId } from '@/lib/uuid'
import type { Deck, Room } from '@/types/room'

const TTL_HOURS = 24

interface CreateRoomInput {
  name: string
  deck: Deck
  moderatorName: string
  moderatorUid: string
}

export async function createRoom(input: CreateRoomInput): Promise<string> {
  const { db } = getFirebase()
  const id = newRoomId()
  const now = Timestamp.now()
  const expiresAt = Timestamp.fromMillis(now.toMillis() + TTL_HOURS * 60 * 60 * 1000)

  const room: Omit<Room, 'createdAt' | 'lastActivityAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>
    lastActivityAt: ReturnType<typeof serverTimestamp>
  } = {
    id,
    name: input.name.trim(),
    createdAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
    expiresAt,
    moderatorUid: input.moderatorUid,
    deck: input.deck,
    round: {
      taskTitle: '',
      revealed: false,
      startedAt: now,
    },
    participants: {
      [input.moderatorUid]: {
        name: input.moderatorName.trim(),
        vote: null,
        lastSeenAt: now,
        joinedAt: now,
      },
    },
  }

  await setDoc(doc(db, 'rooms', id), room)
  return id
}
```

- [ ] **Step 3: Teste de integração — createRoom (red)**

Criar `tests/integration/rooms-create.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { doc, getDoc } from 'firebase/firestore'
import { makeTestEnv } from './_setup'

// Stub getFirebase para apontar pro env de teste:
import { vi } from 'vitest'

describe('createRoom', () => {
  it('escreve o documento com participantes contendo o moderador', async () => {
    const env = await makeTestEnv('rooms-create')
    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: env.app, auth: env.auth, db: env.db }),
    }))
    const { createRoom } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')

    const id = await createRoom({
      name: 'Sprint 1',
      deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'Carlos',
      moderatorUid: env.uid,
    })

    expect(id).toMatch(/^[0-9a-fA-F-]{36}$/)
    const snap = await getDoc(doc(env.db, 'rooms', id))
    expect(snap.exists()).toBe(true)
    const data = snap.data()!
    expect(data.moderatorUid).toBe(env.uid)
    expect(data.deck.type).toBe('fibonacci')
    expect(data.participants[env.uid].name).toBe('Carlos')
    expect(data.participants[env.uid].vote).toBeNull()
    expect(data.round.revealed).toBe(false)

    vi.doUnmock('@/services/firebase/index')
    await env.cleanup()
  })
})
```

Rodar: `bun run test:integration` → esperar PASS (criou).

(Se a importação dinâmica não pegar o mock por causa de cache, mover o `vi.doMock` para antes do `await import` em outro escopo, já feito acima.)

- [ ] **Step 4: Teste de regras (red)**

Criar `tests/integration/rules.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initializeTestEnvironment, RulesTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { doc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'planning-poker-rules',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  })
})

afterAll(async () => { await env.cleanup() })

function baseRoom(modUid: string, otherUid?: string) {
  const now = Timestamp.now()
  const participants: Record<string, unknown> = {
    [modUid]: { name: 'Mod', vote: null, lastSeenAt: now, joinedAt: now },
  }
  if (otherUid) participants[otherUid] = { name: 'Other', vote: null, lastSeenAt: now, joinedAt: now }
  return {
    id: 'r1',
    name: 'Sala',
    createdAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(now.toMillis() + 86_400_000),
    moderatorUid: modUid,
    deck: { type: 'fibonacci', values: ['1', '2', '3'] },
    round: { taskTitle: '', revealed: false, startedAt: now },
    participants,
  }
}

describe('firestore.rules', () => {
  it('proíbe leitura sem auth', async () => {
    const ctx = env.unauthenticatedContext()
    await assertFails(setDoc(doc(ctx.firestore(), 'rooms', 'r1'), baseRoom('mod')))
  })

  it('permite criar sala onde uid == moderatorUid', async () => {
    const ctx = env.authenticatedContext('mod')
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'rooms', 'r1'), baseRoom('mod')))
  })

  it('proíbe criar sala forjando outro moderatorUid', async () => {
    const ctx = env.authenticatedContext('alice')
    await assertFails(setDoc(doc(ctx.firestore(), 'rooms', 'r1'), baseRoom('bob')))
  })

  it('moderador pode setar round.revealed=true', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'r2'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('mod')
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'rooms', 'r2'), { 'round.revealed': true, lastActivityAt: serverTimestamp() }))
  })

  it('participante NÃO pode setar round.revealed', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'r3'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('alice')
    await assertFails(updateDoc(doc(ctx.firestore(), 'rooms', 'r3'), { 'round.revealed': true }))
  })

  it('participante pode atualizar próprio nó (vote/lastSeenAt)', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'r4'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('alice')
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'rooms', 'r4'), {
      'participants.alice.vote': '5',
      'participants.alice.lastSeenAt': serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    }))
  })

  it('participante NÃO pode mexer no nó de outro', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'rooms', 'r5'), baseRoom('mod', 'alice'))
    })
    const ctx = env.authenticatedContext('alice')
    await assertFails(updateDoc(doc(ctx.firestore(), 'rooms', 'r5'), {
      'participants.mod.vote': '5',
    }))
  })
})
```

Rodar: `bun run test:integration`
Esperado: 7 + 1 testes verdes. Se algum falhar, ler a saída do emulator (mostra qual deny dispara) e ajustar `firestore.rules`.

- [ ] **Step 5: `DeckPicker` e `CustomDeckEditor`**

Criar `src/components/create/CustomDeckEditor.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import TextField from '@/components/ui/TextField.vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const preview = computed(() => props.modelValue.split(',').map(s => s.trim()).filter(Boolean))
</script>

<template>
  <div class="flex flex-col gap-2">
    <TextField
      :model-value="modelValue"
      @update:model-value="(v: string) => emit('update:modelValue', v)"
      label="Valores separados por vírgula"
      placeholder="ex: 1, 2, 3, 5, 8, ?, ☕"
    />
    <div class="flex flex-wrap gap-2 text-sm" style="color: var(--color-muted);">
      <span v-for="v in preview" :key="v" class="px-2 py-0.5 rounded-full" style="background: color-mix(in srgb, var(--color-brand) 12%, transparent);">{{ v }}</span>
    </div>
  </div>
</template>
```

Criar `src/components/create/DeckPicker.vue`:

```vue
<script setup lang="ts">
import type { DeckType } from '@/types/room'
import CustomDeckEditor from './CustomDeckEditor.vue'

const props = defineProps<{
  modelValue: DeckType
  customRaw: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: DeckType]
  'update:customRaw': [value: string]
}>()

const options: { value: DeckType; label: string; preview: string }[] = [
  { value: 'fibonacci', label: 'Fibonacci', preview: '0, 1, 2, 3, 5, 8, 13, 21, ?, ☕' },
  { value: 'tshirt', label: 'T-shirt', preview: 'XS, S, M, L, XL, XXL, ?, ☕' },
  { value: 'custom', label: 'Customizado', preview: 'você define' },
]
</script>

<template>
  <div class="flex flex-col gap-3">
    <span class="text-sm font-semibold" style="color: var(--color-muted);">Baralho</span>
    <div class="flex flex-col gap-2">
      <label
        v-for="opt in options"
        :key="opt.value"
        class="flex gap-3 items-start p-3 rounded-2xl cursor-pointer"
        :style="props.modelValue === opt.value
          ? 'background: color-mix(in srgb, var(--color-brand) 14%, transparent); border: 1px solid var(--color-brand);'
          : 'border: 1px solid color-mix(in srgb, var(--color-ink) 14%, transparent);'"
      >
        <input
          type="radio"
          :checked="props.modelValue === opt.value"
          @change="emit('update:modelValue', opt.value)"
          class="mt-1"
        />
        <span class="flex-1">
          <span class="block font-bold" style="color: var(--color-ink);">{{ opt.label }}</span>
          <span class="block text-xs" style="color: var(--color-muted);">{{ opt.preview }}</span>
        </span>
      </label>
    </div>

    <CustomDeckEditor
      v-if="props.modelValue === 'custom'"
      :model-value="props.customRaw"
      @update:model-value="(v: string) => emit('update:customRaw', v)"
    />
  </div>
</template>
```

- [ ] **Step 6: View `CreateSessionView.vue`**

Substituir `src/views/CreateSessionView.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import TextField from '@/components/ui/TextField.vue'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'
import GhostButton from '@/components/ui/GhostButton.vue'
import DeckPicker from '@/components/create/DeckPicker.vue'
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

const canSubmit = computed(() =>
  roomName.value.trim().length > 0
  && moderatorName.value.trim().length > 0
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
  <main class="px-4 py-8 max-w-md mx-auto flex flex-col gap-5">
    <h1 class="text-2xl font-bold">Criar sala</h1>

    <TextField v-model="roomName" label="Nome da sala" placeholder="Sprint 42 — backend" maxlength="60" />
    <TextField v-model="moderatorName" label="Seu nome" placeholder="Como você quer ser visto" maxlength="30" />
    <DeckPicker v-model="deckType" v-model:custom-raw="customRaw" />

    <div class="flex justify-end gap-2 mt-2">
      <GhostButton @click="router.push({ name: 'home' })">Cancelar</GhostButton>
      <PrimaryButton :disabled="!canSubmit" @click="submit">
        {{ submitting ? 'Criando…' : 'Criar sala' }}
      </PrimaryButton>
    </div>
  </main>
</template>
```

- [ ] **Step 7: Validar manualmente**

```bash
bun run emu &
bun run dev
```

Em `/`, clicar "Criar sala". Preencher nome + seu nome + Fibonacci. Clicar criar. Esperado: navega para `/session/<uuid>` (que ainda é stub) e o emulator UI (<http://localhost:4000/firestore>) mostra um doc em `rooms/{uuid}` com forma certa.

Encerrar dev e emulator.

- [ ] **Step 8: Rodar suíte completa**

```bash
bun run test
bun run test:integration
```

Esperado: todos verdes (unit 18, integration auth 2 + rooms-create 1 + rules 7 = 10).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(rooms): create room flow + hardened firestore rules

- services/firebase/rooms.ts: createRoom writing single-doc shape with TTL expiresAt
- DeckPicker + CustomDeckEditor + CreateSessionView wired to PrimaryButton flow
- firestore.rules: only moderator can mutate global fields; participants can only
  edit their own map entry; rejects forging moderatorUid on create
- integration tests for createRoom shape and rules (positive + negative paths)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Entrar na sala + presença

**Files:**
- Modify: `src/services/firebase/rooms.ts` *(adicionar `subscribeToRoom`, `joinRoom`, `heartbeat`)*
- Create: `src/stores/roomStore.ts`
- Create: `src/composables/useRoom.ts`
- Create: `src/composables/usePresence.ts`
- Create: `src/components/room/JoinNameModal.vue`
- Modify: `src/views/RoomView.vue`
- Create: `tests/integration/rooms-join.test.ts`
- Create: `tests/unit/composables/useRoom.test.ts`

- [ ] **Step 1: Estender service `rooms.ts`**

Adicionar ao final de `src/services/firebase/rooms.ts`:

```ts
import {
  doc as fsDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp as fsServerTimestamp,
  Timestamp as FsTimestamp,
} from 'firebase/firestore'
import type { Room } from '@/types/room'

const TTL_MS = 24 * 60 * 60 * 1000

function activityPatch() {
  return {
    lastActivityAt: fsServerTimestamp(),
    expiresAt: FsTimestamp.fromMillis(Date.now() + TTL_MS),
  }
}

export type Unsubscribe = () => void

export function subscribeToRoom(
  roomId: string,
  onChange: (room: Room | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const { db } = getFirebase()
  return onSnapshot(
    fsDoc(db, 'rooms', roomId),
    (snap) => onChange(snap.exists() ? (snap.data() as Room) : null),
    (err) => onError?.(err),
  )
}

export async function joinRoom(roomId: string, uid: string, name: string): Promise<void> {
  const { db } = getFirebase()
  const now = FsTimestamp.now()
  await updateDoc(fsDoc(db, 'rooms', roomId), {
    [`participants.${uid}`]: {
      name: name.trim(),
      vote: null,
      lastSeenAt: now,
      joinedAt: now,
    },
    ...activityPatch(),
  })
}

export async function heartbeat(roomId: string, uid: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(fsDoc(db, 'rooms', roomId), {
    [`participants.${uid}.lastSeenAt`]: fsServerTimestamp(),
    ...activityPatch(),
  })
}
```

(Removendo os imports antigos duplicados de `doc/setDoc/serverTimestamp/Timestamp` se for necessário consolidar — ler topo do arquivo e ajustar.)

- [ ] **Step 2: `roomStore` Pinia**

Criar `src/stores/roomStore.ts`:

```ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Room } from '@/types/room'
import { subscribeToRoom, type Unsubscribe } from '@/services/firebase/rooms'

export const useRoomStore = defineStore('room', () => {
  const room = ref<Room | null>(null)
  const loading = ref(true)
  const notFound = ref(false)
  const error = ref<string | null>(null)
  let unsub: Unsubscribe | null = null

  function watch(roomId: string) {
    dispose()
    loading.value = true
    notFound.value = false
    error.value = null
    unsub = subscribeToRoom(
      roomId,
      (r) => {
        loading.value = false
        if (r === null) {
          notFound.value = true
          room.value = null
        } else {
          room.value = r
          notFound.value = false
        }
      },
      (err) => {
        loading.value = false
        error.value = err.message
      },
    )
  }

  function dispose() {
    unsub?.()
    unsub = null
    room.value = null
    loading.value = true
    notFound.value = false
    error.value = null
  }

  const participantsList = computed(() => {
    const r = room.value
    if (!r) return []
    return Object.entries(r.participants).map(([uid, p]) => ({ uid, ...p }))
  })

  return { room, loading, notFound, error, watch, dispose, participantsList }
})
```

- [ ] **Step 3: Composables `useRoom` e `usePresence`**

Criar `src/composables/useRoom.ts`:

```ts
import { computed } from 'vue'
import { useRoomStore } from '@/stores/roomStore'
import { useAuth } from './useAuth'
import { presenceFor } from '@/lib/time'

export function useRoom() {
  const store = useRoomStore()
  const { uid } = useAuth()

  const isModerator = computed(() => !!store.room && store.room.moderatorUid === uid.value)
  const me = computed(() => uid.value && store.room ? store.room.participants[uid.value] ?? null : null)
  const inRoom = computed(() => me.value !== null)
  const seats = computed(() =>
    store.participantsList.map(p => ({
      ...p,
      presence: presenceFor(p.lastSeenAt),
      isModerator: p.uid === store.room?.moderatorUid,
      isSelf: p.uid === uid.value,
    })),
  )
  const votedCount = computed(() =>
    store.participantsList.filter(p => p.vote !== null && presenceFor(p.lastSeenAt) !== 'offline').length,
  )
  const totalActive = computed(() =>
    store.participantsList.filter(p => presenceFor(p.lastSeenAt) !== 'offline').length,
  )

  return {
    room: computed(() => store.room),
    loading: computed(() => store.loading),
    notFound: computed(() => store.notFound),
    error: computed(() => store.error),
    isModerator,
    me,
    inRoom,
    seats,
    votedCount,
    totalActive,
    watch: store.watch,
    dispose: store.dispose,
  }
}
```

Criar `src/composables/usePresence.ts`:

```ts
import { onBeforeUnmount, watch } from 'vue'
import type { Ref } from 'vue'
import { heartbeat } from '@/services/firebase/rooms'

const INTERVAL_MS = 15_000

export function usePresence(roomId: string, uid: Ref<string | null>, active: Ref<boolean>) {
  let timer: number | null = null

  function start() {
    if (timer !== null || !active.value || !uid.value) return
    void heartbeat(roomId, uid.value).catch(() => {})
    timer = window.setInterval(() => {
      if (uid.value) void heartbeat(roomId, uid.value).catch(() => {})
    }, INTERVAL_MS)
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  watch([active, uid], ([a, u]) => {
    if (a && u) start()
    else stop()
  }, { immediate: true })

  onBeforeUnmount(stop)
}
```

- [ ] **Step 4: Teste unit do `useRoom` (red)**

Criar `tests/unit/composables/useRoom.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { Timestamp } from 'firebase/firestore'
import { useRoom } from '@/composables/useRoom'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'

vi.mock('@/services/firebase/rooms', () => ({
  subscribeToRoom: vi.fn(),
  joinRoom: vi.fn(),
  heartbeat: vi.fn(),
}))

function ts(secAgo: number) {
  return Timestamp.fromMillis(Date.now() - secAgo * 1000)
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useRoom derived state', () => {
  it('isModerator true quando uid == moderatorUid', () => {
    const auth = useAuthStore()
    auth.user = { uid: 'mod-1' } as never
    const room = useRoomStore()
    room.room = {
      id: 'r', name: 'n', createdAt: ts(0), lastActivityAt: ts(0), expiresAt: ts(0),
      moderatorUid: 'mod-1',
      deck: { type: 'fibonacci', values: [] },
      round: { taskTitle: '', revealed: false, startedAt: ts(0) },
      participants: { 'mod-1': { name: 'M', vote: null, lastSeenAt: ts(0), joinedAt: ts(0) } },
    }
    const r = useRoom()
    expect(r.isModerator.value).toBe(true)
    expect(r.inRoom.value).toBe(true)
  })

  it('votedCount ignora offline (>=90s)', () => {
    const auth = useAuthStore()
    auth.user = { uid: 'a' } as never
    const room = useRoomStore()
    room.room = {
      id: 'r', name: 'n', createdAt: ts(0), lastActivityAt: ts(0), expiresAt: ts(0),
      moderatorUid: 'a',
      deck: { type: 'fibonacci', values: [] },
      round: { taskTitle: '', revealed: false, startedAt: ts(0) },
      participants: {
        a: { name: 'A', vote: '5', lastSeenAt: ts(2), joinedAt: ts(0) },
        b: { name: 'B', vote: '3', lastSeenAt: ts(120), joinedAt: ts(0) }, // offline
        c: { name: 'C', vote: null, lastSeenAt: ts(2), joinedAt: ts(0) },
      },
    }
    const r = useRoom()
    expect(r.votedCount.value).toBe(1)
    expect(r.totalActive.value).toBe(2)
  })
})
```

Rodar: `bun run test` → FAIL.

- [ ] **Step 5: Verificar PASS após implementação**

Os arquivos do Step 1-3 já cobrem o teste. Rodar:

```bash
bun run test
```

Esperado: PASS (nova suíte com 2 testes).

- [ ] **Step 6: `JoinNameModal`**

Criar `src/components/room/JoinNameModal.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import TextField from '@/components/ui/TextField.vue'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ submit: [name: string] }>()

const name = ref(localStorage.getItem('pp:lastName') ?? '')

function go() {
  const trimmed = name.value.trim()
  if (trimmed.length === 0) return
  localStorage.setItem('pp:lastName', trimmed)
  emit('submit', trimmed)
}
</script>

<template>
  <Modal :open="open" :closable="false" title="Como devemos te chamar?">
    <form @submit.prevent="go" class="flex flex-col gap-3">
      <TextField v-model="name" placeholder="Seu nome" maxlength="30" />
      <PrimaryButton type="submit" :disabled="name.trim().length === 0">Entrar</PrimaryButton>
    </form>
  </Modal>
</template>
```

- [ ] **Step 7: `RoomView` com lista crua**

Substituir `src/views/RoomView.vue`:

```vue
<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRoom } from '@/composables/useRoom'
import { useAuth } from '@/composables/useAuth'
import { usePresence } from '@/composables/usePresence'
import { useToasts } from '@/composables/useToasts'
import { joinRoom } from '@/services/firebase/rooms'
import JoinNameModal from '@/components/room/JoinNameModal.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const room = useRoom()
const { uid } = useAuth()
const toasts = useToasts()

room.watch(props.id)
onBeforeUnmount(room.dispose)

const showJoin = computed(() => !room.loading.value && !room.notFound.value && !room.inRoom.value)
usePresence(props.id, uid, computed(() => room.inRoom.value))

const wasInRoom = ref(false)
watch(() => room.inRoom.value, (now) => {
  if (wasInRoom.value && !now && !room.notFound.value) {
    toasts.push('Você foi removido da sala', 'error')
    router.push({ name: 'home' })
  }
  wasInRoom.value = now
})

async function onJoin(name: string) {
  if (!uid.value) return
  try {
    await joinRoom(props.id, uid.value, name)
  } catch (err) {
    toasts.push((err as Error).message, 'error')
  }
}
</script>

<template>
  <main class="px-4 py-8 max-w-3xl mx-auto">
    <p v-if="room.loading.value" style="color: var(--color-muted);">Carregando…</p>

    <div v-else-if="room.notFound.value" class="text-center mt-10">
      <h1 class="text-2xl font-bold mb-2">Essa sala não existe ou expirou</h1>
      <p style="color: var(--color-muted);" class="mb-4">Voltar para a home e criar uma nova.</p>
      <button class="underline" @click="router.push({ name: 'home' })" style="color: var(--color-brand);">Ir para home</button>
    </div>

    <div v-else-if="room.error.value" class="text-center mt-10">
      <h1 class="text-2xl font-bold mb-2">Algo deu errado</h1>
      <p style="color: var(--color-muted);">{{ room.error.value }}</p>
    </div>

    <div v-else-if="room.room.value">
      <h1 class="text-2xl font-bold mb-1">{{ room.room.value.name }}</h1>
      <p style="color: var(--color-muted);" class="mb-6">{{ room.totalActive.value }} online</p>

      <ul class="flex flex-col gap-2">
        <li v-for="seat in room.seats.value" :key="seat.uid"
            class="flex items-center justify-between p-3 rounded-2xl"
            style="background: var(--color-surface);">
          <span>
            <span class="font-bold">{{ seat.name }}</span>
            <span v-if="seat.isModerator" class="ml-2" title="Moderador">👑</span>
            <span v-if="seat.isSelf" class="ml-2 text-xs" style="color: var(--color-muted);">(você)</span>
          </span>
          <span class="text-xs" style="color: var(--color-muted);">{{ seat.presence }}{{ seat.vote !== null ? ' · votou' : '' }}</span>
        </li>
      </ul>
    </div>

    <JoinNameModal :open="showJoin" @submit="onJoin" />
  </main>
</template>
```

- [ ] **Step 8: Teste integration `joinRoom`**

Criar `tests/integration/rooms-join.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { makeTestEnv } from './_setup'

describe('joinRoom', () => {
  it('adiciona um novo participante ao map', async () => {
    const mod = await makeTestEnv('join-mod')
    const guest = await makeTestEnv('join-guest')

    // Pelos rules, só mod pode criar a sala. Setamos via env do mod.
    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: mod.app, auth: mod.auth, db: mod.db }),
    }))
    const { createRoom } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')
    const id = await createRoom({
      name: 'r', deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'M', moderatorUid: mod.uid,
    })
    vi.doUnmock('@/services/firebase/index')

    // Agora, com env do guest, joinRoom.
    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: guest.app, auth: guest.auth, db: guest.db }),
    }))
    const { joinRoom } = await import('@/services/firebase/rooms')
    await joinRoom(id, guest.uid, 'Convidado')

    const snap = await getDoc(doc(mod.db, 'rooms', id))
    const data = snap.data()!
    expect(Object.keys(data.participants)).toHaveLength(2)
    expect(data.participants[guest.uid].name).toBe('Convidado')

    vi.doUnmock('@/services/firebase/index')
    await mod.cleanup()
    await guest.cleanup()
  })
})
```

Rodar: `bun run test:integration` → PASS.

- [ ] **Step 9: Validar manualmente com 2 abas**

```bash
bun run emu &
bun run dev
```

Aba 1 (normal): cria sala. Copia URL `/session/<id>`.
Aba 2 (anônima): abre URL. Esperado: modal pedindo nome → entra → ambas vêem 2 participantes online.
Recarregar Aba 2. Esperado: rejoin sem pedir nome de novo (mesmo `pp:lastName`/UID).

Encerrar dev/emu.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(room): subscribe, join and presence heartbeat

- services/firebase/rooms.ts: subscribeToRoom, joinRoom, heartbeat with TTL refresh
- roomStore (Pinia) tracks loading/notFound/error and exposes participant list
- useRoom composable: isModerator, seats with presence, votedCount, totalActive
- usePresence composable: 15s setInterval heartbeat with auto cleanup
- JoinNameModal pre-fills from localStorage 'pp:lastName'
- RoomView shows raw participant list and handles loading/notFound/kicked redirect
- integration test for joinRoom and unit test for useRoom derived state

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Mesa redonda + cartas + voto

**Files:**
- Modify: `src/services/firebase/rooms.ts` *(adicionar `setVote`)*
- Create: `src/components/room/PlayingCard.vue`
- Create: `src/components/room/PlayerSeat.vue`
- Create: `src/components/room/PokerTable.vue`
- Create: `src/components/room/Hand.vue`
- Modify: `src/views/RoomView.vue`
- Create: `tests/integration/rooms-vote.test.ts`

- [ ] **Step 1: Adicionar `setVote` ao service**

Adicionar em `src/services/firebase/rooms.ts`:

```ts
export async function setVote(roomId: string, uid: string, value: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(fsDoc(db, 'rooms', roomId), {
    [`participants.${uid}.vote`]: value,
    [`participants.${uid}.lastSeenAt`]: fsServerTimestamp(),
    ...activityPatch(),
  })
}
```

- [ ] **Step 2: Teste integração de voto (red)**

Criar `tests/integration/rooms-vote.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { doc, getDoc } from 'firebase/firestore'
import { makeTestEnv } from './_setup'

describe('setVote', () => {
  it('atualiza apenas o nó do próprio uid', async () => {
    const mod = await makeTestEnv('vote-mod')
    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: mod.app, auth: mod.auth, db: mod.db }),
    }))
    const { createRoom, setVote } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')
    const id = await createRoom({
      name: 'r', deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'M', moderatorUid: mod.uid,
    })

    await setVote(id, mod.uid, '5')
    const snap = await getDoc(doc(mod.db, 'rooms', id))
    expect(snap.data()!.participants[mod.uid].vote).toBe('5')

    vi.doUnmock('@/services/firebase/index')
    await mod.cleanup()
  })
})
```

Rodar: `bun run test:integration` → PASS após service estar pronto.

- [ ] **Step 3: `PlayingCard.vue`**

Criar `src/components/room/PlayingCard.vue`:

```vue
<script setup lang="ts">
const props = defineProps<{
  value?: string | null
  state: 'idle' | 'selected' | 'back' | 'revealed'
  size?: 'sm' | 'md' | 'lg'
}>()

const sizeClass: Record<NonNullable<typeof props.size> | 'md', string> = {
  sm: 'w-9 h-12 text-sm',
  md: 'w-14 h-20 text-base',
  lg: 'w-20 h-28 text-2xl',
}

const dim = sizeClass[props.size ?? 'md']
</script>

<template>
  <div
    class="rounded-xl flex items-center justify-center font-extrabold transition-transform select-none"
    :class="[
      dim,
      state === 'selected' ? '-translate-y-3 ring-2 ring-offset-2' : '',
      state === 'idle' ? 'bg-white text-[var(--color-ink)] border border-[color-mix(in_srgb,var(--color-ink)_15%,transparent)] shadow-md' : '',
      state === 'selected' ? 'shadow-xl' : '',
    ]"
    :style="state === 'selected'
      ? 'background: linear-gradient(135deg,var(--color-warm),var(--color-cool)); color: var(--color-ink); --tw-ring-color: var(--color-brand);'
      : state === 'back'
      ? 'background: linear-gradient(135deg,var(--color-warm),var(--color-cool));'
      : state === 'revealed'
      ? 'background: var(--color-surface); color: var(--color-ink); border: 1px solid color-mix(in srgb, var(--color-ink) 15%, transparent); box-shadow: 0 4px 14px rgba(91,58,138,.18);'
      : ''"
    :aria-label="state === 'back' ? 'carta virada' : value ?? 'carta vazia'"
  >
    <span v-if="state === 'revealed' || state === 'idle' || state === 'selected'">{{ value }}</span>
  </div>
</template>
```

- [ ] **Step 4: `PlayerSeat.vue`**

Criar `src/components/room/PlayerSeat.vue`:

```vue
<script setup lang="ts">
import PlayingCard from './PlayingCard.vue'
import type { PresenceState } from '@/types/room'

defineProps<{
  name: string
  vote: string | null
  presence: PresenceState
  isModerator?: boolean
  isSelf?: boolean
  revealed: boolean
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-1 w-20"
       :style="presence === 'absent' ? 'opacity: 0.5;' : ''">
    <PlayingCard
      v-if="vote === null"
      state="idle"
      size="sm"
      :value="''"
      class="border-dashed animate-pulse"
      style="opacity: 0.5;"
    />
    <PlayingCard
      v-else-if="!revealed"
      state="back"
      size="sm"
    />
    <PlayingCard
      v-else
      state="revealed"
      size="sm"
      :value="vote"
    />

    <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
         style="background: linear-gradient(135deg,var(--color-warm),var(--color-cool)); color: var(--color-ink);">
      {{ name.slice(0, 1).toUpperCase() }}
    </div>
    <span class="text-xs truncate max-w-full" style="color: var(--color-ink);">
      {{ name }}<span v-if="isModerator"> 👑</span>
    </span>
  </div>
</template>
```

- [ ] **Step 5: `PokerTable.vue`**

Criar `src/components/room/PokerTable.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import PlayerSeat from './PlayerSeat.vue'
import type { PresenceState } from '@/types/room'

interface Seat {
  uid: string
  name: string
  vote: string | null
  presence: PresenceState
  isModerator: boolean
  isSelf: boolean
}

const props = defineProps<{ seats: Seat[]; revealed: boolean }>()

const positions = computed(() => {
  const n = props.seats.length || 1
  const stepDeg = 360 / n
  return props.seats.map((s, i) => {
    const angle = -90 + i * stepDeg
    return { ...s, angle }
  })
})
</script>

<template>
  <div class="relative w-full mx-auto" style="aspect-ratio: 16 / 9; max-width: 720px;">
    <!-- mesa central só em desktop -->
    <div
      class="hidden md:block absolute"
      style="top: 50%; left: 50%; transform: translate(-50%,-50%); width: 50%; height: 50%; background: color-mix(in srgb, var(--color-brand) 8%, transparent); border-radius: 50%; border: 1px dashed color-mix(in srgb, var(--color-ink) 18%, transparent);"
    />

    <!-- desktop: assentos posicionados radialmente -->
    <div class="hidden md:block">
      <div
        v-for="seat in positions"
        :key="seat.uid"
        class="absolute"
        :style="{
          top: `calc(50% + sin(${seat.angle}deg) * 38%)`,
          left: `calc(50% + cos(${seat.angle}deg) * 42%)`,
          transform: 'translate(-50%, -50%)',
        }"
      >
        <PlayerSeat
          :name="seat.name"
          :vote="seat.vote"
          :presence="seat.presence"
          :is-moderator="seat.isModerator"
          :is-self="seat.isSelf"
          :revealed="revealed"
        />
      </div>
      <slot name="center" />
    </div>

    <!-- mobile: lista vertical -->
    <div class="md:hidden flex flex-wrap justify-center gap-4 pt-4">
      <PlayerSeat
        v-for="seat in seats"
        :key="seat.uid"
        :name="seat.name"
        :vote="seat.vote"
        :presence="seat.presence"
        :is-moderator="seat.isModerator"
        :is-self="seat.isSelf"
        :revealed="revealed"
      />
      <div class="w-full flex justify-center mt-4">
        <slot name="center" />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 6: `Hand.vue`**

Criar `src/components/room/Hand.vue`:

```vue
<script setup lang="ts">
import PlayingCard from './PlayingCard.vue'

const props = defineProps<{ values: string[]; selected: string | null; disabled?: boolean }>()
const emit = defineEmits<{ select: [value: string] }>()
</script>

<template>
  <div class="w-full flex justify-center px-2 overflow-x-auto">
    <div class="flex gap-2 py-3">
      <button
        v-for="v in values"
        :key="v"
        type="button"
        :disabled="disabled"
        @click="emit('select', v)"
        class="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        :aria-pressed="selected === v"
      >
        <PlayingCard
          :value="v"
          size="lg"
          :state="selected === v ? 'selected' : 'idle'"
        />
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 7: Plug em `RoomView.vue` — substituir lista pelos componentes**

Substituir o bloco `<div v-else-if="room.room.value">` por:

```vue
<div v-else-if="room.room.value" class="flex flex-col gap-6">
  <header>
    <h1 class="text-2xl font-bold mb-1">{{ room.room.value.name }}</h1>
    <p style="color: var(--color-muted);" class="text-sm">
      {{ room.totalActive.value }} online · {{ room.votedCount.value }}/{{ room.totalActive.value }} votaram
    </p>
  </header>

  <PokerTable :seats="room.seats.value" :revealed="room.room.value.round.revealed">
    <template #center>
      <p style="color: var(--color-muted);" class="text-sm text-center">
        {{ room.room.value.round.revealed ? 'Revelado' : 'Aguardando votos…' }}
      </p>
    </template>
  </PokerTable>

  <Hand
    :values="room.room.value.deck.values"
    :selected="room.me.value?.vote ?? null"
    :disabled="room.room.value.round.revealed"
    @select="onPick"
  />
</div>
```

E adicionar no `<script setup>`:

```ts
import PokerTable from '@/components/room/PokerTable.vue'
import Hand from '@/components/room/Hand.vue'
import { setVote } from '@/services/firebase/rooms'

async function onPick(v: string) {
  if (!uid.value) return
  try { await setVote(props.id, uid.value, v) }
  catch (err) { toasts.push((err as Error).message, 'error') }
}
```

- [ ] **Step 8: Validar 2 navegadores**

```bash
bun run emu &
bun run dev
```

- Cria sala, abre em 2ª aba, entra com nome.
- Cada um clica numa carta. Esperado: na visão do outro, o assento mostra carta-back (verso).
- Não tem botão "Revelar" ainda — vem na Task 9.

- [ ] **Step 9: Suíte completa**

```bash
bun run test
bun run test:integration
```

Esperado: tudo verde.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(room): poker table, cards and voting

- PlayingCard with idle/selected/back/revealed states and 3 sizes
- PlayerSeat (avatar + card stack + name + crown for mod, dimmed when absent)
- PokerTable: radial layout (md+) using sin/cos via CSS calc + responsive
  vertical fallback (<md) sharing the same seat component
- Hand: scrollable strip of cards with aria-pressed; respects revealed=true (disabled)
- RoomView wires seats + hand and calls setVote
- integration test covering setVote happy path

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Revelar, resetar e estatísticas

**Files:**
- Modify: `src/services/firebase/rooms.ts` *(adicionar `revealRound`, `startNewRound`)*
- Create: `src/components/room/TableCenter.vue`
- Create: `src/components/room/ResultsPanel.vue`
- Modify: `src/views/RoomView.vue` *(usar TableCenter + ResultsPanel; atalho `r`)*
- Create: `tests/integration/rooms-reveal-reset.test.ts`
- Create: `tests/unit/components/ResultsPanel.test.ts`

- [ ] **Step 1: Estender service**

Adicionar em `src/services/firebase/rooms.ts`:

```ts
export async function revealRound(roomId: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(fsDoc(db, 'rooms', roomId), {
    'round.revealed': true,
    ...activityPatch(),
  })
}

export async function startNewRound(roomId: string, currentParticipantUids: string[], newTitle?: string): Promise<void> {
  const { db } = getFirebase()
  const patch: Record<string, unknown> = {
    'round.revealed': false,
    'round.startedAt': fsServerTimestamp(),
    ...activityPatch(),
  }
  for (const uid of currentParticipantUids) {
    patch[`participants.${uid}.vote`] = null
  }
  if (newTitle !== undefined) patch['round.taskTitle'] = newTitle
  await updateDoc(fsDoc(db, 'rooms', roomId), patch)
}
```

- [ ] **Step 2: Teste de integração reveal+reset (red)**

Criar `tests/integration/rooms-reveal-reset.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { doc, getDoc } from 'firebase/firestore'
import { makeTestEnv } from './_setup'

describe('reveal + new round', () => {
  it('reveal flipa flag; nova rodada zera votos', async () => {
    const mod = await makeTestEnv('rr-mod')
    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: mod.app, auth: mod.auth, db: mod.db }),
    }))
    const { createRoom, setVote, revealRound, startNewRound } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')

    const id = await createRoom({
      name: 'r', deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'M', moderatorUid: mod.uid,
    })
    await setVote(id, mod.uid, '8')
    await revealRound(id)

    let snap = await getDoc(doc(mod.db, 'rooms', id))
    expect(snap.data()!.round.revealed).toBe(true)
    expect(snap.data()!.participants[mod.uid].vote).toBe('8')

    await startNewRound(id, [mod.uid], 'OAuth')
    snap = await getDoc(doc(mod.db, 'rooms', id))
    expect(snap.data()!.round.revealed).toBe(false)
    expect(snap.data()!.round.taskTitle).toBe('OAuth')
    expect(snap.data()!.participants[mod.uid].vote).toBeNull()

    vi.doUnmock('@/services/firebase/index')
    await mod.cleanup()
  })
})
```

- [ ] **Step 3: `ResultsPanel`**

Criar `src/components/room/ResultsPanel.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { computeStats } from '@/lib/stats'

interface SeatVote { uid: string; name: string; vote: string | null }
const props = defineProps<{ seats: SeatVote[] }>()

const votes = computed(() => props.seats.map(s => s.vote).filter((v): v is string => v !== null))
const stats = computed(() => computeStats(votes.value))
</script>

<template>
  <section
    class="rounded-3xl p-5 flex flex-col gap-4"
    style="background: var(--color-surface); box-shadow: 0 8px 28px rgba(91,58,138,.14);"
    aria-live="polite"
  >
    <div class="flex flex-wrap gap-2">
      <span class="px-3 py-1 rounded-full text-sm" style="background: color-mix(in srgb, var(--color-brand) 14%, transparent); color: var(--color-ink);">
        Média: <strong>{{ stats.average ?? '—' }}</strong>
      </span>
      <span class="px-3 py-1 rounded-full text-sm" style="background: color-mix(in srgb, var(--color-accent) 18%, transparent); color: var(--color-ink);">
        Moda: <strong>{{ stats.mode ?? '—' }}</strong>
      </span>
      <span class="px-3 py-1 rounded-full text-sm" style="background: color-mix(in srgb, var(--color-cool) 60%, transparent); color: var(--color-ink);">
        Mín: <strong>{{ stats.min ?? '—' }}</strong>
      </span>
      <span class="px-3 py-1 rounded-full text-sm" style="background: color-mix(in srgb, var(--color-warm) 60%, transparent); color: var(--color-ink);">
        Máx: <strong>{{ stats.max ?? '—' }}</strong>
      </span>
      <span v-if="stats.divergent" class="px-3 py-1 rounded-full text-sm" style="background: var(--color-sand); color: var(--color-ink);">
        ⚠️ vale conversar
      </span>
    </div>
    <ul class="text-sm flex flex-col gap-1">
      <li v-for="s in seats" :key="s.uid" class="flex items-center justify-between">
        <span style="color: var(--color-ink);">{{ s.name }}</span>
        <span style="color: var(--color-muted);">{{ s.vote ?? '—' }}</span>
      </li>
    </ul>
  </section>
</template>
```

- [ ] **Step 4: Teste smoke `ResultsPanel`**

Criar `tests/unit/components/ResultsPanel.test.ts`:

```ts
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

  it('mostra divergência quando max-min>=5', () => {
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
```

- [ ] **Step 5: `TableCenter`**

Criar `src/components/room/TableCenter.vue`:

```vue
<script setup lang="ts">
import PrimaryButton from '@/components/ui/PrimaryButton.vue'
import GhostButton from '@/components/ui/GhostButton.vue'

defineProps<{
  isModerator: boolean
  revealed: boolean
  votedCount: number
  totalActive: number
}>()
const emit = defineEmits<{ reveal: []; reset: [] }>()
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <p class="text-sm text-center" style="color: var(--color-muted);">
      <template v-if="revealed">Resultado revelado</template>
      <template v-else>{{ votedCount }} de {{ totalActive }} votaram</template>
    </p>

    <PrimaryButton v-if="isModerator && !revealed" @click="emit('reveal')">
      Revelar votos
    </PrimaryButton>
    <GhostButton v-else-if="isModerator && revealed" @click="emit('reset')">
      Nova rodada
    </GhostButton>
  </div>
</template>
```

- [ ] **Step 6: `RoomView` — wire reveal/reset + atalho**

No `<script setup>` de `src/views/RoomView.vue` adicionar:

```ts
import TableCenter from '@/components/room/TableCenter.vue'
import ResultsPanel from '@/components/room/ResultsPanel.vue'
import { revealRound, startNewRound } from '@/services/firebase/rooms'
import { onMounted, onBeforeUnmount as obu2 } from 'vue'

async function onReveal() {
  try { await revealRound(props.id) }
  catch (e) { toasts.push((e as Error).message, 'error') }
}

async function onReset() {
  if (!room.room.value) return
  const uids = Object.keys(room.room.value.participants)
  try { await startNewRound(props.id, uids) }
  catch (e) { toasts.push((e as Error).message, 'error') }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'r' && room.isModerator.value && room.room.value && !room.room.value.round.revealed) {
    void onReveal()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
obu2(() => window.removeEventListener('keydown', onKey))
```

E no template, substituir o `<template #center>` da `PokerTable` por:

```vue
<template #center>
  <TableCenter
    :is-moderator="room.isModerator.value"
    :revealed="room.room.value.round.revealed"
    :voted-count="room.votedCount.value"
    :total-active="room.totalActive.value"
    @reveal="onReveal"
    @reset="onReset"
  />
</template>
```

E após o `Hand`, adicionar:

```vue
<ResultsPanel
  v-if="room.room.value.round.revealed"
  :seats="room.seats.value.map(s => ({ uid: s.uid, name: s.name, vote: s.vote }))"
/>
```

- [ ] **Step 7: Validar manual**

Em 2 abas: vota em ambas → moderador clica "Revelar" → vê painel com média/moda/min/max → clica "Nova rodada" → tudo zera.

Testar atalho `r`.

- [ ] **Step 8: Suíte**

```bash
bun run test
bun run test:integration
```

Tudo verde.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(room): reveal, reset and live results panel

- services/firebase/rooms.ts: revealRound (sets round.revealed) and
  startNewRound (clears all votes + optional new title)
- TableCenter shows progress text and moderator-only reveal/reset buttons
- ResultsPanel computes stats client-side (computeStats) and renders
  average/mode/min/max chips plus divergence hint and vote list
- RoomView wires reveal/reset + 'r' shortcut for moderators
- integration test for reveal+reset and unit smoke for ResultsPanel

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Editar tarefa, expulsar e share-link

**Files:**
- Modify: `src/services/firebase/rooms.ts` *(`renameTask`, `kickParticipant`)*
- Modify: `src/components/room/RoomHeader.vue` *(novo)* — extrair header de RoomView
- Modify: `src/components/room/PlayerSeat.vue` *(menu de remover)*
- Modify: `src/views/RoomView.vue`
- Create: `tests/integration/rooms-rename-kick.test.ts`

- [ ] **Step 1: Service `renameTask` + `kickParticipant`**

Adicionar em `src/services/firebase/rooms.ts`:

```ts
import { deleteField } from 'firebase/firestore'

export async function renameTask(roomId: string, title: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(fsDoc(db, 'rooms', roomId), {
    'round.taskTitle': title,
    ...activityPatch(),
  })
}

export async function kickParticipant(roomId: string, uid: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(fsDoc(db, 'rooms', roomId), {
    [`participants.${uid}`]: deleteField(),
    ...activityPatch(),
  })
}
```

- [ ] **Step 2: Teste integração rename+kick**

Criar `tests/integration/rooms-rename-kick.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { doc, getDoc } from 'firebase/firestore'
import { makeTestEnv } from './_setup'

describe('renameTask + kickParticipant', () => {
  it('moderador renomeia e expulsa convidado', async () => {
    const mod = await makeTestEnv('rk-mod')
    const guest = await makeTestEnv('rk-guest')

    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: mod.app, auth: mod.auth, db: mod.db }),
    }))
    const { createRoom, renameTask, kickParticipant } = await import('@/services/firebase/rooms')
    const { buildDeck } = await import('@/lib/decks')

    const id = await createRoom({
      name: 'r', deck: buildDeck({ type: 'fibonacci' }),
      moderatorName: 'M', moderatorUid: mod.uid,
    })
    vi.doUnmock('@/services/firebase/index')

    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: guest.app, auth: guest.auth, db: guest.db }),
    }))
    const { joinRoom } = await import('@/services/firebase/rooms')
    await joinRoom(id, guest.uid, 'Convidado')
    vi.doUnmock('@/services/firebase/index')

    vi.doMock('@/services/firebase/index', () => ({
      getFirebase: () => ({ app: mod.app, auth: mod.auth, db: mod.db }),
    }))
    const rooms = await import('@/services/firebase/rooms')
    await rooms.renameTask(id, 'Login API')
    await rooms.kickParticipant(id, guest.uid)
    vi.doUnmock('@/services/firebase/index')

    const snap = await getDoc(doc(mod.db, 'rooms', id))
    expect(snap.data()!.round.taskTitle).toBe('Login API')
    expect(snap.data()!.participants[guest.uid]).toBeUndefined()

    await mod.cleanup()
    await guest.cleanup()
  })
})
```

- [ ] **Step 3: `RoomHeader.vue` (novo componente)**

Criar `src/components/room/RoomHeader.vue`:

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import GhostButton from '@/components/ui/GhostButton.vue'
import { useToasts } from '@/composables/useToasts'

const props = defineProps<{
  roomName: string
  taskTitle: string
  isModerator: boolean
  totalActive: number
  votedCount: number
  revealed: boolean
}>()
const emit = defineEmits<{ rename: [title: string] }>()

const editing = ref(false)
const draft = ref(props.taskTitle)
watch(() => props.taskTitle, v => { if (!editing.value) draft.value = v })

function commit() {
  editing.value = false
  if (draft.value.trim() !== props.taskTitle) emit('rename', draft.value.trim())
}

const toasts = useToasts()
async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    toasts.push('Link copiado', 'success')
  } catch {
    toasts.push('Não consegui copiar — copie da barra de endereço', 'error')
  }
}
</script>

<template>
  <header class="flex flex-col gap-1">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-2xl font-bold truncate">{{ roomName }}</h1>
      <GhostButton @click="copyLink">Copiar link</GhostButton>
    </div>

    <div class="flex items-center gap-2 text-sm" style="color: var(--color-muted);">
      <button
        v-if="isModerator && !editing"
        type="button"
        @click="editing = true"
        class="underline-offset-2 hover:underline text-left"
      >📝 {{ taskTitle || 'Defina o que estamos estimando' }}</button>
      <span v-else-if="!editing">📝 {{ taskTitle || '—' }}</span>
      <input
        v-else
        v-model="draft"
        @keydown.enter="commit"
        @blur="commit"
        autofocus
        class="px-2 py-1 rounded outline-none"
        style="background: var(--color-surface); border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent); color: var(--color-ink);"
        maxlength="80"
      />
      <span class="ml-auto">{{ totalActive }} online · {{ votedCount }}/{{ totalActive }} votaram</span>
    </div>
  </header>
</template>
```

- [ ] **Step 4: Atualizar `PlayerSeat` com menu de kick**

Substituir `src/components/room/PlayerSeat.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import PlayingCard from './PlayingCard.vue'
import type { PresenceState } from '@/types/room'

const props = defineProps<{
  uid: string
  name: string
  vote: string | null
  presence: PresenceState
  isModerator?: boolean
  isSelf?: boolean
  revealed: boolean
  canKick?: boolean
}>()
const emit = defineEmits<{ kick: [uid: string] }>()

const showMenu = ref(false)
function confirmKick() {
  if (confirm(`Remover ${props.name} da sala?`)) emit('kick', props.uid)
  showMenu.value = false
}
</script>

<template>
  <div class="flex flex-col items-center gap-1 w-20 relative"
       :style="presence === 'absent' ? 'opacity: 0.5;' : ''">
    <PlayingCard
      v-if="vote === null"
      state="idle"
      size="sm"
      :value="''"
      class="border-dashed animate-pulse"
      style="opacity: 0.5;"
    />
    <PlayingCard v-else-if="!revealed" state="back" size="sm" />
    <PlayingCard v-else state="revealed" size="sm" :value="vote" />

    <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
         style="background: linear-gradient(135deg,var(--color-warm),var(--color-cool)); color: var(--color-ink);">
      {{ name.slice(0, 1).toUpperCase() }}
    </div>
    <span class="text-xs truncate max-w-full" style="color: var(--color-ink);">
      {{ name }}<span v-if="isModerator"> 👑</span>
    </span>

    <button
      v-if="canKick && !isSelf"
      type="button"
      @click="showMenu = !showMenu"
      class="absolute top-0 right-0 text-xs px-1 rounded"
      style="color: var(--color-muted);"
      aria-label="Opções"
    >⋯</button>
    <div
      v-if="showMenu"
      class="absolute top-5 right-0 z-10 rounded-lg p-1 text-sm"
      style="background: var(--color-surface); box-shadow: 0 6px 18px rgba(91,58,138,.18);"
    >
      <button type="button" @click="confirmKick" class="px-3 py-1 rounded hover:bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] cursor-pointer" style="color: var(--color-ink);">
        Remover
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 5: Atualizar `PokerTable.vue` para repassar `uid` + `canKick` + emit `kick`**

Editar a interface `Seat` em `PokerTable.vue` para incluir `uid: string` (já existia). Editar os dois usos de `<PlayerSeat>` para repassar:

```vue
<PlayerSeat
  :uid="seat.uid"
  :name="seat.name"
  :vote="seat.vote"
  :presence="seat.presence"
  :is-moderator="seat.isModerator"
  :is-self="seat.isSelf"
  :revealed="revealed"
  :can-kick="canKick"
  @kick="(uid: string) => emit('kick', uid)"
/>
```

E acrescentar no `<script setup>`:

```ts
const props = defineProps<{ seats: Seat[]; revealed: boolean; canKick?: boolean }>()
const emit = defineEmits<{ kick: [uid: string] }>()
```

- [ ] **Step 6: Plug em `RoomView`**

Substituir o cabeçalho atual por `<RoomHeader>` e passar `canKick` + handler `kick` para a `PokerTable`:

```vue
<RoomHeader
  :room-name="room.room.value.name"
  :task-title="room.room.value.round.taskTitle"
  :is-moderator="room.isModerator.value"
  :total-active="room.totalActive.value"
  :voted-count="room.votedCount.value"
  :revealed="room.room.value.round.revealed"
  @rename="onRename"
/>

<PokerTable
  :seats="room.seats.value"
  :revealed="room.room.value.round.revealed"
  :can-kick="room.isModerator.value"
  @kick="onKick"
>
  <template #center> ... (já tem) </template>
</PokerTable>
```

E no `<script setup>`:

```ts
import RoomHeader from '@/components/room/RoomHeader.vue'
import { renameTask, kickParticipant } from '@/services/firebase/rooms'

async function onRename(t: string) {
  try { await renameTask(props.id, t) }
  catch (e) { toasts.push((e as Error).message, 'error') }
}
async function onKick(targetUid: string) {
  try { await kickParticipant(props.id, targetUid) }
  catch (e) { toasts.push((e as Error).message, 'error') }
}
```

- [ ] **Step 7: Validar manual + testes**

```bash
bun run test
bun run test:integration
bun run dev
```

Em 2 abas: moderador edita título → outra aba vê o novo título; moderador remove o convidado → convidado é redirecionado pra home com toast "Você foi removido da sala".

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(room): edit task title, kick participant, share link

- services/firebase/rooms.ts: renameTask, kickParticipant (FieldValue.delete)
- RoomHeader: click-to-edit title for moderator and copy-link button
- PlayerSeat: menu with Remove option (moderator only, not self) + emit kick
- PokerTable forwards canKick and bubbles kick event up to RoomView
- integration test covering rename + kick

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Polimento mobile e visual

**Files:**
- Modify: `src/components/room/PokerTable.vue` *(ajuste mobile final)*
- Modify: `src/components/room/Hand.vue` *(scroll mobile)*
- Modify: `src/views/CreateSessionView.vue`, `src/views/HomeView.vue`, `src/views/RoomView.vue` *(spacing)*
- Modify: `src/style.css` *(ajustes finais)*

- [ ] **Step 1: Revisão visual de cada rota em viewports**

```bash
bun run dev
```

Abrir DevTools → emular **iPhone 14** (390×844) e **iPad** (820×1180) para cada rota: `/`, `/session`, `/session/<id>` (sala vazia, sala com 5 pessoas, sala revelada).

Anotar problemas (overflow, fonte muito pequena, espaçamento, estados absent indistintos).

- [ ] **Step 2: Aplicar correções iterativamente**

Ajustes esperados:

- `RoomHeader`: em mobile, o "Copiar link" pode descer pra linha de baixo. Garantir `flex-wrap` ok.
- `Hand`: em mobile, garantir `overflow-x-auto` + `scroll-snap-type: x mandatory` + `scroll-snap-align: center` em cada carta para UX mais agradável de "passar o dedo".
- `PokerTable`: confirmar que avatares não se sobrepõem com 2-3 participantes em desktop (mexer no raio se necessário).
- `ResultsPanel`: em mobile, chips podem quebrar em duas linhas — está ok visualmente.

Edits específicas (exemplo do `Hand`):

```vue
<div class="w-full flex justify-start sm:justify-center px-2 overflow-x-auto" style="scroll-snap-type: x mandatory;">
  <div class="flex gap-2 py-3">
    <button
      v-for="v in values"
      :key="v"
      type="button"
      :disabled="disabled"
      @click="emit('select', v)"
      class="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      style="scroll-snap-align: center;"
      :aria-pressed="selected === v"
    >
      <PlayingCard :value="v" size="lg" :state="selected === v ? 'selected' : 'idle'" />
    </button>
  </div>
</div>
```

- [ ] **Step 3: Tipografia e respiro**

Em `src/style.css`, reforçar tipografia:

```css
@layer base {
  h1 { font-weight: 800; letter-spacing: -0.02em; }
  h2, h3 { font-weight: 700; letter-spacing: -0.01em; }
}
```

- [ ] **Step 4: Testar build**

```bash
bun run build
bun run preview
```

Esperado: build sem erro de TS. Preview server roda em <http://localhost:4173>. Voltar ao emulator e testar uma sessão completa contra build de produção.

- [ ] **Step 5: Suíte total**

```bash
bun run test
bun run test:integration
bun run lint:types
```

Tudo verde.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): mobile polish (scroll-snap hand, header wrap, typography)

- Hand uses scroll-snap on mobile for nicer card-flick UX
- typography: h1 800/-0.02em, h2/h3 700/-0.01em
- minor spacing review across all viewports

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Substituir README**

Substituir `README.md`:

```markdown
# Planning Poker

Realtime Planning Poker para times distribuídos. Vue 3 + Vite + Firebase, sem cadastro.

## Rodando localmente

### Pré-requisitos

- [Bun](https://bun.sh) ≥ 1.1
- [Firebase CLI](https://firebase.google.com/docs/cli) (`bun add -g firebase-tools`)
- Conta Firebase com:
  - Projeto criado
  - Auth Anônimo habilitado
  - Firestore criado
  - TTL configurado em `rooms.expiresAt`
  - Web App registrado (config copiada para `.env.local`)

### Setup

```bash
bun install
cp .env.example .env.local
# Edite .env.local com as credenciais do seu Firebase Web App.
firebase login
```

### Dev

Em um terminal, suba o emulator:

```bash
bun run emu
```

Em outro:

```bash
bun run dev
```

Aplicação em <http://localhost:5173>. UI do emulator em <http://localhost:4000>.

### Testes

```bash
bun run test                 # unit
bun run test:integration     # sobe emulator, roda tests, derruba
bun run lint:types
```

### Build + preview

```bash
bun run build
bun run preview
```

### Deploy (Firebase Hosting)

```bash
firebase init hosting        # uma única vez (public dir = dist; SPA rewrite to /index.html)
bun run build
firebase deploy --only hosting,firestore:rules
```

## Arquitetura

Resumo no spec: `docs/superpowers/specs/2026-05-10-planning-poker-core-design.md`.

- `src/services/firebase/` — wrappers de Firestore/Auth (sem Vue, testáveis)
- `src/composables/` — orquestração reativa (`useRoom`, `usePresence`, `useDarkMode`)
- `src/stores/` — Pinia (`authStore`, `roomStore`)
- `src/views/` + `src/components/` — UI

## Troubleshooting

- **`EADDRINUSE` na porta 8080/9099 ao rodar `test:integration`**: tem emulator pendurado. `lsof -ti:8080,9099 | xargs kill`.
- **App não conecta**: confirme `VITE_USE_EMULATOR=true` em `.env.local` durante o dev. Em produção, deixe `false` (ou remova).
- **"Permission denied" no Firestore**: confira se o usuário está autenticado (deveria ser anônimo automático) e se as regras estão deployadas (`firebase deploy --only firestore:rules`).
```

- [ ] **Step 2: Commit final**

```bash
git add README.md
git commit -m "docs: README with dev setup, test commands and deploy notes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Verificação final manual

Antes de declarar core completo, executar **uma vez**:

1. Abrir `Chrome` (sessão normal) e `Chrome` (anônima). Acessar <http://localhost:5173>.
2. Aba 1: criar sala "Sprint demo" + Fibonacci.
3. Copiar link → colar na Aba 2 → entrar como "Convidado".
4. Aba 1 vota `5`, Aba 2 vota `8`. Cada aba vê apenas a carta-back do outro.
5. Aba 1 (mod) clica "Revelar". Ambas vêem cartas + ResultsPanel com Média 6.5, divergência presente (max-min=3 → não dispara, ok).
6. Aba 1 clica "Nova rodada". Tudo zera.
7. Aba 1 edita o título da tarefa. Aba 2 vê em tempo real.
8. Aba 1 remove "Convidado". Aba 2 redireciona para home com toast.
9. Recarregar Aba 1 → continua como mod. Console sem erros.

Se passar nesses 9 passos sem warnings de console, **core do Planning Poker está pronto**.

---

## Resumo do que foi entregue

- Auth Anônimo, criar/entrar em sala, voto secreto, reveal manual, reset, presença, expulsar, share link, edit título, dark/light, mobile responsivo.
- Estatísticas client-side (média/moda/min/max + indicador de divergência).
- Regras Firestore validadas por testes (positivos e negativos).
- TTL 24h via Firestore native (sem Cloud Function).
- 5 suites de testes (unit `lib/`, unit composables, smoke component, integration services, integration rules) — todas verdes em `bun run test && bun run test:integration`.
- README com setup completo (incluindo deploy).

**Fora deste plano (fase 2):** histórico de rodadas, spectator, login social, QR code, timer, chat, integrações Jira/Trello, promoção automática de moderador, voto cifrado.
