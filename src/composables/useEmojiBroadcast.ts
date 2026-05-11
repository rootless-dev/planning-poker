import { computed, ref, watch, onUnmounted, type Ref } from 'vue'
import { Timestamp } from 'firebase/firestore'
import type { Room } from '@/types/room'
import { sendEmoji as sendEmojiSvc } from '@/services/firebase/rooms'

const COOLDOWN_MS = 2000
const EMOJI_RE = /^\p{Extended_Pictographic}️?(\p{Emoji_Modifier}️?|‍\p{Extended_Pictographic}️?)*$/u

interface BubbleState { value: string; key: number }

export function useEmojiBroadcast(opts: {
  room: Ref<Room | null>
  myUid: Ref<string | null>
  roomId: Ref<string>
}) {
  const clientMountMs = Date.now()
  const lastSeenEmojiAt = new Map<string, number>()
  const activeBubble = ref<Record<string, BubbleState | undefined>>({})

  watch(
    () => opts.room.value?.participants,
    (parts) => {
      if (!parts) return
      const next: Record<string, BubbleState | undefined> = { ...activeBubble.value }
      let changed = false
      for (const [uid, p] of Object.entries(parts)) {
        const evt = p.lastEmoji
        if (!evt?.sentAt) continue
        const sentMs = evt.sentAt instanceof Timestamp
          ? evt.sentAt.toMillis()
          : new Timestamp((evt.sentAt as { seconds: number }).seconds, 0).toMillis()
        if (sentMs <= clientMountMs) continue
        if (sentMs <= (lastSeenEmojiAt.get(uid) ?? 0)) continue
        lastSeenEmojiAt.set(uid, sentMs)
        next[uid] = { value: evt.value, key: sentMs }
        changed = true
      }
      if (changed) activeBubble.value = next
    },
    { deep: true, immediate: true },
  )

  function clearBubble(uid: string) {
    if (!activeBubble.value[uid]) return
    const next = { ...activeBubble.value }
    delete next[uid]
    activeBubble.value = next
  }

  const now = ref(Date.now())
  const interval = window.setInterval(() => { now.value = Date.now() }, 250)
  onUnmounted(() => clearInterval(interval))

  const lastSelfSentAt = ref(0)
  const cooldownRemainingMs = computed(() =>
    Math.max(0, COOLDOWN_MS - (now.value - lastSelfSentAt.value)),
  )

  async function sendEmoji(value: string) {
    if (!opts.myUid.value) return
    if (cooldownRemainingMs.value > 0) return
    if (value.length > 16) return
    if (!EMOJI_RE.test(value)) return
    lastSelfSentAt.value = Date.now()
    now.value = Date.now() // sincroniza imediatamente para teste de cooldown
    await sendEmojiSvc(opts.roomId.value, opts.myUid.value, value)
  }

  return { activeBubble, clearBubble, sendEmoji, cooldownRemainingMs }
}
