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
