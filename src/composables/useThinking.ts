import { computed, ref, onUnmounted, watchEffect, type Ref } from 'vue'
import type { Room } from '@/types/room'
import { tryLoadLottie } from '@/lib/notoEmoji'

export interface UseThinkingOptions {
  room: Ref<Room | null>
  myUid: Ref<string | null>
  roomId: Ref<string>
  suppressOwn: Ref<boolean>
}

export interface UseThinkingApi {
  thinking: Ref<Record<string, boolean>>
  thinkingLottie: Ref<object | null>
  onAreaEnter: () => void
  onAreaMove: () => void
  onAreaLeave: () => void
}

export function useThinking(opts: UseThinkingOptions): UseThinkingApi {
  const now = ref(Date.now())
  const interval = window.setInterval(() => { now.value = Date.now() }, 500)
  onUnmounted(() => clearInterval(interval))

  const thinkingLottie = ref<object | null>(null)
  watchEffect(async () => {
    if (thinkingLottie.value) return
    const data = await tryLoadLottie('🤔')
    if (data) thinkingLottie.value = data
  })

  const thinking = computed<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {}
    const r = opts.room.value
    if (!r) return out
    if (r.round.revealed) return out
    const myUid = opts.myUid.value
    const suppress = opts.suppressOwn.value
    for (const [uid, p] of Object.entries(r.participants)) {
      const until = p.thinkingUntil?.toMillis() ?? 0
      if (until <= now.value) continue
      if (suppress && uid === myUid) continue
      out[uid] = true
    }
    return out
  })

  // Placeholders preenchidos no Task 4 (emitter)
  function onAreaEnter() {}
  function onAreaMove() {}
  function onAreaLeave() {}

  return { thinking, thinkingLottie, onAreaEnter, onAreaMove, onAreaLeave }
}
