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
