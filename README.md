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
  - TTL configurado em `rooms.expiresAt` (Google Cloud Console → Firestore → Time-to-live)
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

Em outro terminal:

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

- `src/services/firebase/` — wrappers de Firestore/Auth (sem Vue, testáveis isoladamente)
- `src/composables/` — orquestração reativa (`useRoom`, `usePresence`, `useAuth`, `useDarkMode`, `useToasts`)
- `src/stores/` — Pinia (`authStore`, `roomStore`)
- `src/lib/` — lógica pura (`decks`, `stats`, `time`, `uuid`)
- `src/types/` — interfaces compartilhadas
- `src/views/` + `src/components/` — UI

## Troubleshooting

- **`EADDRINUSE` na porta 8080/9099 ao rodar `test:integration`**: tem emulator pendurado. `lsof -ti:8080,9099 | xargs kill`.
- **App não conecta**: confirme `VITE_USE_EMULATOR=true` em `.env.local` durante o dev. Em produção, deixe `false` (ou remova).
- **"Permission denied" no Firestore**: confira se o usuário está autenticado (deveria ser anônimo automático) e se as regras estão deployadas (`firebase deploy --only firestore:rules`).
- **TTL na criação dá `403: permissões ausentes`**: habilite a Firestore Admin API em <https://console.cloud.google.com/apis/library/firestoreadmin.googleapis.com>, aguarde 1-2 min e tente novamente. Alternativa via CLI:
  ```bash
  gcloud firestore fields ttls update expiresAt --collection-group=rooms --enable-ttl
  ```
