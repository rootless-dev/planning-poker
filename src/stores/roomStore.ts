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
