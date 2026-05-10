<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'
import GhostButton from '@/components/ui/GhostButton.vue'
import TextField from '@/components/ui/TextField.vue'
import Modal from '@/components/ui/Modal.vue'

const router = useRouter()
const showJoin = ref(false)
const joinUrl = ref('')

function goCreate() { router.push({ name: 'create-session' }) }

function tryJoin() {
  const match = joinUrl.value.match(/\/session\/([0-9a-fA-F-]{36})/)
  if (match) {
    router.push({ name: 'room', params: { id: match[1] } })
    showJoin.value = false
  } else if (/^[0-9a-fA-F-]{36}$/.test(joinUrl.value.trim())) {
    router.push({ name: 'room', params: { id: joinUrl.value.trim() } })
    showJoin.value = false
  }
}
</script>

<template>
  <section class="flex flex-col items-center justify-center px-4 py-16 text-center">
    <div class="flex gap-3 mb-8" aria-hidden="true">
      <div class="w-14 h-20 rounded-xl flex items-center justify-center text-xl font-extrabold" style="background: linear-gradient(135deg,var(--color-warm),#ffeaf2); color: var(--color-ink); transform: rotate(-6deg); box-shadow: 0 8px 24px rgba(91,58,138,.18);">3</div>
      <div class="w-14 h-20 rounded-xl flex items-center justify-center text-xl font-extrabold" style="background: var(--color-surface); color: var(--color-ink); box-shadow: 0 8px 24px rgba(91,58,138,.18); transform: translateY(-6px);">5</div>
      <div class="w-14 h-20 rounded-xl flex items-center justify-center text-xl font-extrabold" style="background: linear-gradient(135deg,var(--color-cool),#dff6ff); color: var(--color-ink); transform: rotate(6deg); box-shadow: 0 8px 24px rgba(91,58,138,.18);">8</div>
    </div>

    <h1 class="text-3xl sm:text-5xl font-extrabold mb-3" style="color: var(--color-ink);">
      Estimativas em time,<br />sem fricção.
    </h1>
    <p class="max-w-md mb-8 text-sm sm:text-base" style="color: var(--color-muted);">
      Crie uma sala em segundos, mande o link e vote junto. Sem cadastro.
    </p>

    <div class="flex flex-wrap gap-3 justify-center">
      <PrimaryButton @click="goCreate">Criar sala</PrimaryButton>
      <GhostButton @click="showJoin = true">Entrar com link</GhostButton>
    </div>

    <Modal :open="showJoin" title="Entrar em uma sala" @close="showJoin = false">
      <form @submit.prevent="tryJoin" class="flex flex-col gap-3">
        <TextField v-model="joinUrl" label="Link ou ID da sala" placeholder="https://… ou UUID" />
        <div class="flex justify-end gap-2">
          <GhostButton @click="showJoin = false">Cancelar</GhostButton>
          <PrimaryButton type="submit">Entrar</PrimaryButton>
        </div>
      </form>
    </Modal>
  </section>
</template>
