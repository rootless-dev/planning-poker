<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRoom } from '@/composables/useRoom'
import { useAuth } from '@/composables/useAuth'
import { usePresence } from '@/composables/usePresence'
import { useToasts } from '@/composables/useToasts'
import { joinRoom, setVote } from '@/services/firebase/rooms'
import JoinNameModal from '@/components/room/JoinNameModal.vue'
import PokerTable from '@/components/room/PokerTable.vue'
import Hand from '@/components/room/Hand.vue'

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
          <p style="color: var(--color-muted);" class="text-sm text-center">
            {{ room.room.value.round.revealed ? 'Revelado' : 'Aguardando votos…' }}
          </p>
        </template>
      </PokerTable>

      <Hand
        :values="room.room.value.deck.values"
        :selected="room.me.value?.vote ?? null"
        :disabled="room.room.value.round.revealed"
        @select="onPick"
      />
    </div>

    <JoinNameModal :open="showJoin" @submit="onJoin" />
  </main>
</template>
