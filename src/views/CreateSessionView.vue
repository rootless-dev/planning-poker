<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import TextField from '@/components/ui/TextField.vue'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'
import GhostButton from '@/components/ui/GhostButton.vue'
import DeckPicker from '@/components/create/DeckPicker.vue'
import { useAuth } from '@/composables/useAuth'
import { useToasts } from '@/composables/useToasts'
import { buildDeck } from '@/lib/decks'
import { createRoom } from '@/services/firebase/rooms'
import type { DeckType } from '@/types/room'

const router = useRouter()
const { uid } = useAuth()
const toasts = useToasts()

const roomName = ref('')
const moderatorName = ref(localStorage.getItem('pp:lastName') ?? '')
const deckType = ref<DeckType>('fibonacci')
const customRaw = ref('')
const submitting = ref(false)

const canSubmit = computed(() =>
  roomName.value.trim().length > 0
  && moderatorName.value.trim().length > 0
  && uid.value !== null
  && !submitting.value,
)

async function submit() {
  if (!canSubmit.value || !uid.value) return
  submitting.value = true
  try {
    const deck = buildDeck({
      type: deckType.value,
      customValues: deckType.value === 'custom' ? customRaw.value.split(',') : undefined,
    })
    const id = await createRoom({
      name: roomName.value,
      deck,
      moderatorName: moderatorName.value,
      moderatorUid: uid.value,
    })
    localStorage.setItem('pp:lastName', moderatorName.value.trim())
    router.push({ name: 'room', params: { id } })
  } catch (err) {
    toasts.push((err as Error).message, 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="px-4 py-8 max-w-md mx-auto flex flex-col gap-5">
    <h1 class="text-2xl font-bold">Criar sala</h1>

    <TextField v-model="roomName" label="Nome da sala" placeholder="Sprint 42 — backend" :maxlength="60" />
    <TextField v-model="moderatorName" label="Seu nome" placeholder="Como você quer ser visto" :maxlength="30" />
    <DeckPicker v-model="deckType" v-model:custom-raw="customRaw" />

    <div class="flex justify-end gap-2 mt-2">
      <GhostButton @click="router.push({ name: 'home' })">Cancelar</GhostButton>
      <PrimaryButton :disabled="!canSubmit" @click="submit">
        {{ submitting ? 'Criando…' : 'Criar sala' }}
      </PrimaryButton>
    </div>
  </main>
</template>
