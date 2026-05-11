import { computed, ref, onUnmounted, watch, watchEffect, type Ref } from 'vue'
import type { Room } from '@/types/room'
import { tryLoadLottie } from '@/lib/notoEmoji'
import { setThinking as setThinkingSvc, clearThinking as clearThinkingSvc } from '@/services/firebase/rooms'

const HOVER_START_MS = 1000
const WINDOW_MS = 5000
const HEARTBEAT_MS = 3000
const IDLE_STOP_MS = 1500
const LEAVE_GRACE_MS = 4000

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

type State = 'idle' | 'pending' | 'active' | 'idle-active'

export function useThinking(opts: UseThinkingOptions): UseThinkingApi {
  // ---------- receptor ----------
  const now = ref(Date.now())
  const tickInterval = window.setInterval(() => { now.value = Date.now() }, 500)

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

  // ---------- emissor ----------
  let state: State = 'idle'
  let startTimer: number | null = null
  let heartbeatTimer: number | null = null
  let idleTimer: number | null = null

  function clearAllTimers() {
    if (startTimer != null) { clearTimeout(startTimer); startTimer = null }
    if (heartbeatTimer != null) { clearInterval(heartbeatTimer); heartbeatTimer = null }
    if (idleTimer != null) { clearTimeout(idleTimer); idleTimer = null }
  }

  function writeUntil(deltaMs: number) {
    const myUid = opts.myUid.value
    if (!myUid) return
    void setThinkingSvc(opts.roomId.value, myUid, Date.now() + deltaMs)
  }

  function resetIdleTimer() {
    if (idleTimer != null) clearTimeout(idleTimer)
    idleTimer = window.setTimeout(() => {
      if (state === 'active') {
        if (heartbeatTimer != null) { clearInterval(heartbeatTimer); heartbeatTimer = null }
        state = 'idle-active'
      }
    }, IDLE_STOP_MS)
  }

  function enterActive() {
    state = 'active'
    writeUntil(WINDOW_MS)
    heartbeatTimer = window.setInterval(() => {
      if (state === 'active') writeUntil(WINDOW_MS)
    }, HEARTBEAT_MS)
    resetIdleTimer()
  }

  function goIdle(emitLeaveWrite: boolean) {
    const wasActive = state === 'active' || state === 'idle-active'
    clearAllTimers()
    state = 'idle'
    if (emitLeaveWrite && wasActive) writeUntil(LEAVE_GRACE_MS)
  }

  function onAreaEnter() {
    if (opts.suppressOwn.value) return
    if (state !== 'idle') return
    state = 'pending'
    startTimer = window.setTimeout(() => {
      startTimer = null
      if (state === 'pending') enterActive()
    }, HOVER_START_MS)
  }

  function onAreaMove() {
    if (state === 'active') {
      resetIdleTimer()
    } else if (state === 'idle-active') {
      enterActive()
    }
  }

  function onAreaLeave() {
    if (state === 'pending') {
      clearAllTimers()
      state = 'idle'
      return
    }
    if (state === 'active' || state === 'idle-active') {
      goIdle(true)
    }
  }

  // Reset em voto: quando o próprio uid passa de vote=null para !=null, sai do estado
  watch(
    () => {
      const uid = opts.myUid.value
      if (!uid) return null
      return opts.room.value?.participants[uid]?.vote ?? null
    },
    (newVote, oldVote) => {
      if (oldVote == null && newVote != null) {
        // O write de setVote já limpa thinkingUntil. Aqui só zeramos o state local.
        clearAllTimers()
        state = 'idle'
      }
    },
  )

  // Reset + clearThinking quando round vira revealed
  watch(
    () => opts.room.value?.round.revealed ?? false,
    (revealed, wasRevealed) => {
      if (revealed && !wasRevealed) {
        const wasThinking = state === 'active' || state === 'idle-active'
        clearAllTimers()
        state = 'idle'
        const uid = opts.myUid.value
        if (wasThinking && uid) void clearThinkingSvc(opts.roomId.value, uid)
      }
    },
  )

  onUnmounted(() => {
    clearInterval(tickInterval)
    clearAllTimers()
  })

  return { thinking, thinkingLottie, onAreaEnter, onAreaMove, onAreaLeave }
}
