# Thinking Indicator — Design

Status: approved
Date: 2026-05-11

## Goal

When a participant hovers (or interacts via touch) over the card area for at least 1 second, broadcast a "thinking" signal. Other participants see an animated 🤔 emoji in place of the player's initial inside their avatar, communicating that the player is deliberating.

## Product rules (decided in brainstorming)

- **Start trigger**: ≥1s of continuous hover over the hand-cards area.
- **End conditions** (union):
  - Mouse leaves area → continues showing for ~4s, then fades out.
  - User votes → ends immediately. If the user keeps hovering after voting, indicator reappears under the same start rule.
- **Emoji**: fixed `🤔` (Thinking Face), animated via Noto Emoji Lottie when available; static `🤔` glyph as fallback.
- **Mobile**: activates by interaction with the hand-rail (touchstart / scroll / focus); same display logic for receivers.
- **Visual**: replaces only the letter inside the gold circle; the avatar frame, crown, and dimensions remain identical.
- **Suppressions** (don't show on own seat):
  - Round is already revealed.
  - EmojiPanel or another blocking modal is open.
  - The user's own emoji bubble (`activeBubble[myUid]`) is currently active.
- Other participants always see the thinking of the hovering player (subject only to `revealed` filter).

## Architecture

```
Hand.vue ──area-enter / area-move / area-leave──► useThinking ──setThinking/clearThinking──► Firestore
                                                       ▲                                        │
                                                       │                                        ▼
                                                  room snapshot ◄────────────────────────── all clients
                                                       │
                                                       ▼
                                          thinking: Record<uid, boolean>
                                                       │
                                                       ▼
                                            PokerTable → PlayerSeat (isThinking)
                                                       │
                                                       ▼
                                            Lottie 🤔 inside avatar circle
```

Components involved:
- `Hand.vue` — adds hover/touch listeners on `.hand-rail` and emits high-level events.
- `RoomView.vue` — instantiates `useThinking`, passes `thinking` map to `PokerTable`, wires `Hand`'s events into the composable.
- `PokerTable.vue` — forwards `thinking[uid]` to each `PlayerSeat`.
- `PlayerSeat.vue` — renders `🤔` (Lottie or glyph) in place of the initial when `isThinking` is true.
- `useThinking.ts` (new composable) — both emitter (state machine + writes) and receiver (derives `thinking` map).
- `services/firebase/rooms.ts` — gains `setThinking(roomId, uid, until)` and `clearThinking(roomId, uid)` helpers; existing `setVote` is extended to delete `thinkingUntil` in the same write.
- `lib/notoEmoji.ts` — reused; `tryLoadLottie('🤔')` is already supported.

## Data model

New optional field on `Participant`:

```ts
export interface Participant {
  name: string
  vote: string | null
  lastSeenAt: Timestamp
  joinedAt: Timestamp
  lastEmoji?: EmojiEvent
  thinkingUntil?: Timestamp  // ← new
}
```

`thinkingUntil` is a future Firestore Timestamp written by the client. Other clients show the thinking indicator while `thinkingUntil > now()`. The field auto-expires without explicit cleanup.

### Constants (in `useThinking`)

| Constant | Value | Purpose |
| --- | --- | --- |
| `HOVER_START_MS` | 1000 | Delay before promoting `pending → active`. |
| `WINDOW_MS` | 5000 | How far ahead of `now` to set `thinkingUntil` on each write while active. |
| `HEARTBEAT_MS` | 3000 | Interval between renewing writes while active and moving. |
| `IDLE_STOP_MS` | 1500 | If no mouse movement for this long → stop heartbeat (cursor "forgotten"). |
| `LEAVE_GRACE_MS` | 4000 | When mouse leaves while active, write `thinkingUntil = now + this` once (precise 4s grace). |

The "4s post-leave grace period" required by the product is implemented with a single deterministic write at the moment of leave (`thinkingUntil = now + LEAVE_GRACE_MS`), guaranteeing exactly the requested duration regardless of when the last heartbeat fired. An "implicit fade by stopping heartbeat" was considered and rejected: worst case it would fade in ≈ `WINDOW_MS − HEARTBEAT_MS` ≈ 2s, violating the product rule.

## Emitter state machine

States (client-local, not persisted):
- `idle` — nothing happening.
- `pending` — area entered; 1s start timer running.
- `active` — confirmed thinking; heartbeat running; idle-detector running.
- `idle-active` — active but no mouse movement for ≥ `IDLE_STOP_MS`; heartbeat paused.

Transitions:

```
idle ──(area-enter)──► pending  [start 1s timer]
pending ──(area-leave)──► idle  [cancel timer]
pending ──(timer fires)──► active
        └ write thinkingUntil = now + WINDOW_MS
        └ start heartbeat (HEARTBEAT_MS)
        └ start idle-detector (IDLE_STOP_MS)

active ──(area-move)──► active  [reset idle-detector]
active ──(heartbeat tick && movement since last tick)──► write thinkingUntil = now + WINDOW_MS
active ──(idle-detector fires)──► idle-active  [pause heartbeat]
active ──(area-leave)──► idle  [write thinkingUntil = now + LEAVE_GRACE_MS]
active ──(vote dispatched)──► idle  [vote write clears thinkingUntil]
active ──(round revealed)──► idle  [force clearThinking write]

idle-active ──(area-move)──► active  [resume heartbeat]
idle-active ──(area-leave)──► idle  [write thinkingUntil = now + LEAVE_GRACE_MS]
```

Worst-case writes: ~1 write per `HEARTBEAT_MS` while actively moving the mouse → about 20 writes/minute during sustained deliberation, plus 1 write per leave. Typical case: 1–3 writes per round (start + maybe one leave + vote).

## Receiver logic

Inside `useThinking`:

```ts
const now = ref(Date.now())
const interval = setInterval(() => { now.value = Date.now() }, 500)
onUnmounted(() => clearInterval(interval))

const thinking = computed<Record<string, boolean>>(() => {
  const out: Record<string, boolean> = {}
  for (const [uid, p] of Object.entries(room.value?.participants ?? {})) {
    const until = p.thinkingUntil?.toMillis() ?? 0
    if (until > now.value) out[uid] = true
  }
  return out
})
```

Receiver-side filters:
- Hide everywhere if `room.round.revealed === true`.
- Hide on own seat (`uid === myUid`) when EmojiPanel is open or `activeBubble[myUid]` exists.
- Other users' thinking is never hidden by these filters.

## PlayerSeat rendering

`PlayerSeat.vue` gains a prop `isThinking: boolean`. Inside the existing `.avatar.numeral` element, the initial is swapped for the Lottie/emoji when `isThinking` is true:

```vue
<div class="avatar numeral">
  <span v-if="isThinking" class="thinking-emoji" aria-hidden="true">
    <LottiePlayer v-if="thinkingLottie" :animation="thinkingLottie" :size="avatarEmojiSize" />
    <span v-else>🤔</span>
  </span>
  <span v-else>{{ initial }}</span>
  <span v-if="isModerator" class="crown" aria-hidden="true">♛</span>
</div>
```

Size mapping for the inner emoji:
- `xs` → 20px, `sm` → 26px, `md` → 32px, `lg` → 40px.

The gold gradient background, crown, dimensions, and outlines remain unchanged. A ~150ms cross-fade between initial and emoji avoids a visual jump.

Lottie loading: `useThinking` exposes a `thinkingLottie: Ref<object | null>` that resolves once via `tryLoadLottie('🤔')` on mount. `RoomView` passes it down through `PokerTable` to every `PlayerSeat`. Individual seats never fetch.

## Firestore rules

The current `isSelfUpdatingOwnParticipant` rule already permits a write that changes a non-`lastEmoji` key inside `participants[myKey]`, so a vanilla `thinkingUntil` write passes without rule changes.

**Optional reinforcement** (recommended): validate that `thinkingUntil`, if present, is a future timestamp within 30s of `request.time`. Prevents a malicious client from pinning thinking forever.

Add to the predicate inside `isSelfUpdatingOwnParticipant`:

```
let thinkingOk = !('thinkingUntil' in newMine)
  || (newMine.thinkingUntil is timestamp
      && newMine.thinkingUntil > request.time
      && newMine.thinkingUntil < request.time + duration.value(30, 's'));
```

Append `&& thinkingOk` to the final return. No cooldown is enforced on the server — client-side throttling (heartbeat + idle-stop) is sufficient and lets the field be renewed freely.

## Vote integration

`setVote` is extended to clear `thinkingUntil` in the same write — zero extra cost:

```ts
export async function setVote(roomId: string, uid: string, value: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(doc(db, 'rooms', roomId), {
    [`participants.${uid}.vote`]: value,
    [`participants.${uid}.lastSeenAt`]: serverTimestamp(),
    [`participants.${uid}.thinkingUntil`]: deleteField(),
    ...activityPatch(),
  })
}
```

## Edge cases

1. **Crash / tab close**: `thinkingUntil` expires within `WINDOW_MS` automatically.
2. **Clock skew client↔server**: each client compares against its own `Date.now()`; typical skew ≤1s is irrelevant for a 5s window.
3. **Hover passing through (<1s)**: no write reaches Firestore.
4. **Cursor parked on cards**: idle-detector kills heartbeat after 1.5s → indicator fades for everyone in ≤ `WINDOW_MS`. Movement resumes it.
5. **Round revealed mid-thinking**: emitter forces a `clearThinking` write; receivers also filter by `revealed`. Defense in depth.
6. **Own emoji bubble overlap**: own seat hides thinking while `activeBubble[myUid]` is active.
7. **EmojiPanel / modal open**: emitter ignores hover while these overlays are open.
8. **Text field focused (renaming task)**: explicit guard in `Hand.vue` — hover events are gated when an input/textarea/contenteditable has focus.
9. **User already voted**: hover still triggers thinking (user reconsidering their pick). This is the explicit product behavior.

## Testing

Unit tests (`vitest` + `happy-dom`):

- **`useThinking` emitter**
  - `area-enter` for 999ms → no write.
  - `area-enter` for 1000ms → 1 write with `thinkingUntil ≈ now + WINDOW_MS`.
  - Continuous `area-move` over 9s → 1 initial write + ~3 heartbeat writes.
  - Active + 1.5s without movement → heartbeat pauses (no further writes).
  - Resume movement → heartbeat resumes, writes continue.
  - `area-leave` after active → 1 leave write with `thinkingUntil ≈ now + LEAVE_GRACE_MS`.
  - Round transitions to `revealed: true` → `clearThinking` write is issued.
  - `setVote` is called → vote write payload contains `thinkingUntil: deleteField()`.

- **`useThinking` receiver**
  - `thinkingUntil` ≈ `now + 5s` → `thinking[uid] === true`.
  - `thinkingUntil` ≈ `now - 1s` → `thinking[uid] === false`.
  - Time tick advances past `thinkingUntil` → transitions true → false.
  - `room.round.revealed === true` → all entries become false.

- **`PlayerSeat`**
  - `isThinking: true` and no vote → renders thinking emoji slot, hides initial, keeps crown.
  - `isThinking: false` → renders initial.
  - Lottie animation missing → renders `🤔` glyph fallback.

- **Firestore rules (emulator)**
  - Write `thinkingUntil` 5s in the future → allowed.
  - Write `thinkingUntil` in the past → denied (only if reinforcement is added).
  - Write `thinkingUntil` 60s in the future → denied (only with reinforcement).
  - `setVote` with `deleteField` on `thinkingUntil` → allowed.

## Non-goals

- No alternative thinking emojis or per-room configuration.
- No "intensity" or elapsed-thinking-time indicator.
- No persistence of historical thinking events.
- No "thinking" toast/sound for other players.

## Implementation notes

- The composable lives at `src/composables/useThinking.ts` and mirrors the structure of `useEmojiBroadcast.ts` for consistency.
- Hover detection uses pointer events (`pointerenter`/`pointerleave`/`pointermove`) over `.hand-rail` so touch and pen are uniformly handled.
- The hand-rail also listens for `scroll` and `focusin` to activate on mobile flows.
- All listeners are attached on mount and removed on unmount; no global window listeners are required (the area is well-defined inside `Hand.vue`).
