<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import TextField from '@/components/ui/TextField.vue'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'
import GhostButton from '@/components/ui/GhostButton.vue'
import DeckPicker from '@/components/create/DeckPicker.vue'
import HowItWorksCarousel from '@/components/create/HowItWorksCarousel.vue'
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

const customChipsCount = computed(() =>
  customRaw.value.split(',').map(s => s.trim()).filter(Boolean).length
)

const canSubmit = computed(() =>
  roomName.value.trim().length > 0
  && moderatorName.value.trim().length > 0
  && (deckType.value !== 'custom' || customChipsCount.value >= 2)
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
  <main class="create-page">
    <div class="create-grid">
      <aside class="create-aside">
        <HowItWorksCarousel />
      </aside>

      <section class="create-form">
        <h1 class="form-title">Criar sala</h1>

        <TextField v-model="roomName" label="Nome da sala" placeholder="Sprint 42 — backend" :maxlength="60" />
        <TextField v-model="moderatorName" label="Seu nome" placeholder="Como você quer ser visto" :maxlength="30" />
        <DeckPicker v-model="deckType" v-model:custom-raw="customRaw" />

        <div class="form-actions">
          <GhostButton @click="router.push({ name: 'home' })">Cancelar</GhostButton>
          <PrimaryButton :disabled="!canSubmit" @click="submit">
            {{ submitting ? 'Criando…' : 'Criar sala' }}
          </PrimaryButton>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.create-page {
  max-width: 72rem;
  margin: 0 auto;
  padding: 32px 16px 64px;
}
.create-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  align-items: start;
}
@media (min-width: 768px) {
  .create-grid { grid-template-columns: 7fr 3fr; gap: 40px; }
  .create-aside { position: sticky; top: 88px; align-self: start; }
}
.create-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.form-title {
  font-size: clamp(1.6rem, 3vw, 2.1rem);
  margin: 0 0 4px;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
