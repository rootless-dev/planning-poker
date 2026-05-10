<script setup lang="ts">
import { ref, watch, onBeforeUnmount, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRoom } from '@/composables/useRoom'
import { useAuth } from '@/composables/useAuth'
import { usePresence } from '@/composables/usePresence'
import { useToasts } from '@/composables/useToasts'
import { joinRoom, setVote, revealRound, startNewRound } from '@/services/firebase/rooms'
import JoinNameModal from '@/components/room/JoinNameModal.vue'
import PokerTable from '@/components/room/PokerTable.vue'
import Hand from '@/components/room/Hand.vue'
import TableCenter from '@/components/room/TableCenter.vue'
import ResultsPanel from '@/components/room/ResultsPanel.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const room = useRoom()
const { uid } = useAuth()
const toasts = useToasts()

room.watch(props.id)
onBeforeUnmount(room.dispose)

const showJoin = computed(() => !room.loading.value && !room.notFound.value && !room.inRoom.value)
usePresence(props.id, uid, computed(() => room.inRoom.value))

const wasInRoom = ref(false)
watch(() => room.inRoom.value, (now) => {
  if (wasInRoom.value && !now && !room.notFound.value) {
    toasts.push('Você foi removido da sala', 'error')
    router.push({ name: 'home' })
  }
  wasInRoom.value = now
})

async function onJoin(name: string) {
  if (!uid.value) return
  try {
    await joinRoom(props.id, uid.value, name)
  } catch (err) {
    toasts.push((err as Error).message, 'error')
  }
}

async function onPick(v: string) {
  if (!uid.value) return
  try { await setVote(props.id, uid.value, v) }
  catch (err) { toasts.push((err as Error).message, 'error') }
}

async function onReveal() {
  try { await revealRound(props.id) }
  catch (e) { toasts.push((e as Error).message, 'error') }
}

async function onReset() {
  if (!room.room.value) return
  const uids = Object.keys(room.room.value.participants)
  try { await startNewRound(props.id, uids) }
  catch (e) { toasts.push((e as Error).message, 'error') }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'r' && room.isModerator.value && room.room.value && !room.room.value.round.revealed) {
    void onReveal()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <main class="px-4 py-8 max-w-3xl mx-auto">
    <p v-if="room.loading.value" style="color: var(--color-muted);">Carregando…</p>

    <div v-else-if="room.notFound.value" class="text-center mt-10">
      <h1 class="text-2xl font-bold mb-2">Essa sala não existe ou expirou</h1>
      <p style="color: var(--color-muted);" class="mb-4">Voltar para a home e criar uma nova.</p>
      <button class="underline" @click="router.push({ name: 'home' })" style="color: var(--color-brand);">Ir para home</button>
    </div>

    <div v-else-if="room.error.value" class="text-center mt-10">
      <h1 class="text-2xl font-bold mb-2">Algo deu errado</h1>
      <p style="color: var(--color-muted);">{{ room.error.value }}</p>
    </div>

    <div v-else-if="room.room.value" class="flex flex-col gap-6">
      <header>
        <h1 class="text-2xl font-bold mb-1">{{ room.room.value.name }}</h1>
        <p style="color: var(--color-muted);" class="text-sm">
          {{ room.totalActive.value }} online · {{ room.votedCount.value }}/{{ room.totalActive.value }} votaram
        </p>
      </header>

      <PokerTable :seats="room.seats.value" :revealed="room.room.value.round.revealed">
        <template #center>
          <TableCenter
            :is-moderator="room.isModerator.value"
            :revealed="room.room.value.round.revealed"
            :voted-count="room.votedCount.value"
            :total-active="room.totalActive.value"
            @reveal="onReveal"
            @reset="onReset"
          />
        </template>
      </PokerTable>

      <Hand
        :values="room.room.value.deck.values"
        :selected="room.me.value?.vote ?? null"
        :disabled="room.room.value.round.revealed"
        @select="onPick"
      />

      <ResultsPanel
        v-if="room.room.value.round.revealed"
        :seats="room.seats.value.map(s => ({ uid: s.uid, name: s.name, vote: s.vote }))"
      />
    </div>

    <JoinNameModal :open="showJoin" @submit="onJoin" />
  </main>
</template>
