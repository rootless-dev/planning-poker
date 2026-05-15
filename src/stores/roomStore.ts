import { defineStore } from 'pinia'
import { computed, ref, watch as vueWatch } from 'vue'
import type { Room } from '@/types/room'
import {
  subscribeToRoom,
  subscribeToOwnVote,
  subscribeToAllVotes,
  type Unsubscribe,
} from '@/services/firebase/rooms'

export const useRoomStore = defineStore('room', () => {
  const room = ref<Room | null>(null)
  const roomHasPendingWrites = ref(false)
  const loading = ref(true)
  const notFound = ref(false)
  const error = ref<string | null>(null)
  const myVote = ref<string | null>(null)
  const allVotes = ref<Record<string, string>>({})

  let unsubRoom: Unsubscribe | null = null
  let unsubOwnVote: Unsubscribe | null = null
  let unsubAllVotes: Unsubscribe | null = null
  let watchedRoomId: string | null = null
  let watchedUid: string | null = null

  // Liga/desliga a subscrição da coleção `votes` conforme `round.revealed` muda.
  // O gate `!hasPendingWrites` na subscrição evita race do moderador: ao clicar em revelar,
  // o SDK dispara snapshot local otimista (revealed=true) antes de o write commitar; as
  // rules avaliam contra o estado servidor e rejeitariam a query até o ack. Já o desligamento
  // só responde a `revealed=false` para não flickerar quando o próprio cliente faz outros
  // writes pós-reveal (heartbeat, emoji, thinking) — que também elevam `hasPendingWrites`.
  vueWatch(
    [
      () => room.value?.round.revealed ?? false,
      () => roomHasPendingWrites.value,
    ],
    ([revealed, pending]) => {
      if (revealed && !pending && watchedRoomId && !unsubAllVotes) {
        unsubAllVotes = subscribeToAllVotes(watchedRoomId, (vs) => { allVotes.value = vs })
      } else if (!revealed && unsubAllVotes) {
        unsubAllVotes()
        unsubAllVotes = null
        allVotes.value = {}
      }
    },
  )

  function watch(roomId: string, uid: string | null) {
    dispose()
    watchedRoomId = roomId
    watchedUid = uid
    loading.value = true
    notFound.value = false
    error.value = null
    unsubRoom = subscribeToRoom(
      roomId,
      (r, hasPendingWrites) => {
        loading.value = false
        roomHasPendingWrites.value = hasPendingWrites
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
    if (uid) {
      unsubOwnVote = subscribeToOwnVote(roomId, uid, (v) => { myVote.value = v })
    }
  }

  function dispose() {
    unsubRoom?.()
    unsubOwnVote?.()
    unsubAllVotes?.()
    unsubRoom = null
    unsubOwnVote = null
    unsubAllVotes = null
    room.value = null
    roomHasPendingWrites.value = false
    myVote.value = null
    allVotes.value = {}
    watchedRoomId = null
    watchedUid = null
    loading.value = true
    notFound.value = false
    error.value = null
  }

  const participantsList = computed(() => {
    const r = room.value
    if (!r) return []
    return Object.entries(r.participants)
      .map(([uid, p]) => ({ uid, ...p }))
      .sort((a, b) => {
        const diff = a.joinedAt.toMillis() - b.joinedAt.toMillis()
        return diff !== 0 ? diff : a.uid.localeCompare(b.uid)
      })
  })

  // Votos visíveis para o cliente atual: revelados (pós-reveal) + próprio voto sempre.
  const votes = computed<Record<string, string>>(() => {
    const out: Record<string, string> = { ...allVotes.value }
    if (watchedUid && myVote.value !== null) out[watchedUid] = myVote.value
    return out
  })

  return {
    room,
    loading,
    notFound,
    error,
    myVote,
    votes,
    watch,
    dispose,
    participantsList,
  }
})