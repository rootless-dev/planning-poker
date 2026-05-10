<script setup lang="ts">
import { ref } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import TextField from '@/components/ui/TextField.vue'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ submit: [name: string] }>()

const name = ref(localStorage.getItem('pp:lastName') ?? '')

function go() {
  const trimmed = name.value.trim()
  if (trimmed.length === 0) return
  localStorage.setItem('pp:lastName', trimmed)
  emit('submit', trimmed)
}
</script>

<template>
  <Modal :open="open" :closable="false" title="Como devemos te chamar?">
    <form @submit.prevent="go" class="flex flex-col gap-3">
      <TextField v-model="name" placeholder="Seu nome" :maxlength="30" />
      <PrimaryButton type="submit" :disabled="name.trim().length === 0">Entrar</PrimaryButton>
    </form>
  </Modal>
</template>
