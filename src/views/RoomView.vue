<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRoom } from '@/composables/useRoom'
import { useAuth } from '@/composables/useAuth'
import { usePresence } from '@/composables/usePresence'
import { useToasts } from '@/composables/useToasts'
import { joinRoom } from '@/services/firebase/rooms'
import JoinNameModal from '@/components/room/JoinNameModal.vue'

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

    <div v-else-if="room.room.value">
      <h1 class="text-2xl font-bold mb-1">{{ room.room.value.name }}</h1>
      <p style="color: var(--color-muted);" class="mb-6">{{ room.totalActive.value }} online</p>

      <ul class="flex flex-col gap-2">
        <li v-for="seat in room.seats.value" :key="seat.uid"
            class="flex items-center justify-between p-3 rounded-2xl"
            style="background: var(--color-surface);">
          <span>
            <span class="font-bold">{{ seat.name }}</span>
            <span v-if="seat.isModerator" class="ml-2" title="Moderador">👑</span>
            <span v-if="seat.isSelf" class="ml-2 text-xs" style="color: var(--color-muted);">(você)</span>
          </span>
          <span class="text-xs" style="color: var(--color-muted);">{{ seat.presence }}{{ seat.vote !== null ? ' · votou' : '' }}</span>
        </li>
      </ul>
    </div>

    <JoinNameModal :open="showJoin" @submit="onJoin" />
  </main>
</template>
