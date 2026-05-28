# Planning Poker

Realtime Planning Poker for distributed teams. Vue 3 + Vite + Firebase, no sign-up required.

App: <https://planning-poker-75982.web.app/>
Code: <https://github.com/rootless-dev/planning-poker>

## Features

- Create a room in seconds and share it via link.
- Fibonacci / T-shirt / custom decks.
- Secret voting until the moderator reveals; statistics (mean, mode, min/max, distribution) after the reveal.
- Emoji reactions: click the `⋯` on your own seat to open a picker (right side on desktop, bottom sheet on mobile) and send a reaction that appears as a bubble above your name on every client — animated via Noto Emoji when available, with a Unicode fallback. A 2s cooldown prevents spam.
- "Thinking" indicator: when a participant hesitates over the cards, the others see an animated 🤔 in place of their initial on the table.
- The moderator can rename the task, reset the round, copy the link, and remove participants.

## Running locally

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- [Firebase CLI](https://firebase.google.com/docs/cli) (`bun add -g firebase-tools`)
- A Firebase account with:
  - A project created
  - Anonymous Auth enabled
  - Firestore created
  - TTL configured on `rooms.expiresAt` (Google Cloud Console → Firestore → Time-to-live)
  - A Web App registered (config copied into `.env.local`)

### Setup

```bash
bun install
cp .env.example .env.local
# Edit .env.local with your Firebase Web App credentials.
firebase login
```

### Dev

In one terminal, start the emulator:

```bash
bun run emu
```

In another terminal:

```bash
bun run dev
```

App at <http://localhost:5173>. Emulator UI at <http://localhost:4000>.

### Tests

```bash
bun run test                 # unit
bun run test:integration     # starts the emulator, runs tests, tears it down
bun run lint:types
```

### Build + preview

```bash
bun run build
bun run preview
```

### Deploy (Firebase Hosting)

```bash
firebase init hosting        # one-time only (public dir = dist; SPA rewrite to /index.html)
bun run build
firebase deploy --only hosting,firestore:rules
```

## Architecture

Overview in the spec: `docs/superpowers/specs/2026-05-10-planning-poker-core-design.md`.

- `src/services/firebase/` — Firestore/Auth wrappers (no Vue, independently testable)
- `src/composables/` — reactive orchestration (`useRoom`, `usePresence`, `useAuth`, `useDarkMode`, `useToasts`)
- `src/stores/` — Pinia (`authStore`, `roomStore`)
- `src/lib/` — pure logic (`decks`, `stats`, `time`, `uuid`)
- `src/types/` — shared interfaces
- `src/views/` + `src/components/` — UI

## Troubleshooting

- **`EADDRINUSE` on port 8080/9099 when running `test:integration`**: there's a stale emulator running. `lsof -ti:8080,9099 | xargs kill`.
- **App won't connect**: make sure `VITE_USE_EMULATOR=true` is set in `.env.local` during dev. In production, leave it `false` (or remove it).
- **"Permission denied" in Firestore**: check that the user is authenticated (it should be anonymous automatically) and that the rules are deployed (`firebase deploy --only firestore:rules`).
- **TTL on creation returns `403: missing permissions`**: enable the Firestore Admin API at <https://console.cloud.google.com/apis/library/firestoreadmin.googleapis.com>, wait 1-2 min and try again. CLI alternative:
  ```bash
  gcloud firestore fields ttls update expiresAt --collection-group=rooms --enable-ttl
  ```

## License

Released under the [MIT License](LICENSE).
