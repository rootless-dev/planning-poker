<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import TextField from '@/components/ui/TextField.vue'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ submit: [name: string] }>()

const { t } = useI18n()
const name = ref(localStorage.getItem('pp:lastName') ?? '')

function go() {
  const trimmed = name.value.trim()
  if (trimmed.length === 0) return
  localStorage.setItem('pp:lastName', trimmed)
  emit('submit', trimmed)
}
</script>

<template>
  <Modal :open="open" :closable="false" :kicker="t('room.join.kicker')" :title="t('room.join.title')">
    <form @submit.prevent="go" class="flex flex-col gap-3">
      <TextField v-model="name" :placeholder="t('room.join.placeholder')" :maxlength="30" />
      <PrimaryButton type="submit" :disabled="name.trim().length === 0">{{ t('room.join.submit') }}</PrimaryButton>
    </form>
  </Modal>
</template>
