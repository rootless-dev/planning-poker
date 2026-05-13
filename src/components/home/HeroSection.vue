<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'
import GhostButton from '@/components/ui/GhostButton.vue'
import TextField from '@/components/ui/TextField.vue'
import Modal from '@/components/ui/Modal.vue'

const router = useRouter()
const { t } = useI18n()
const showJoin = ref(false)
const sessionId = ref('')
const joinError = ref('')

const UUID_RE = /^[0-9a-fA-F-]{36}$/

function goCreate() { router.push({ name: 'create-session' }) }

watch(sessionId, () => { joinError.value = '' })
watch(showJoin, (open) => {
  if (open) {
    sessionId.value = ''
    joinError.value = ''
  }
})

function tryJoin() {
  const raw = sessionId.value.trim()
  if (!raw) {
    joinError.value = t('home.join.errorEmpty')
    return
  }
  if (raw.includes('/') || raw.startsWith('http')) {
    joinError.value = t('home.join.errorLink')
    return
  }
  if (!UUID_RE.test(raw)) {
    joinError.value = t('home.join.errorInvalid')
    return
  }
  router.push({ name: 'room', params: { id: raw } })
  showJoin.value = false
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
      {{ t('home.heroTitle') }}<br />{{ t('home.heroTitleBreak') }}
    </h1>
    <p class="max-w-md mb-8 text-sm sm:text-base" style="color: var(--color-muted);">
      {{ t('home.heroSubtitle') }}
    </p>

    <div class="flex flex-wrap gap-3 justify-center">
      <PrimaryButton @click="goCreate">{{ t('home.createRoom') }}</PrimaryButton>
      <GhostButton @click="showJoin = true">{{ t('home.joinByLink') }}</GhostButton>
    </div>

    <Modal :open="showJoin" :title="t('home.join.modalTitle')" @close="showJoin = false">
      <form @submit.prevent="tryJoin" class="flex flex-col gap-3">
        <TextField
          v-model="sessionId"
          :label="t('home.join.idLabel')"
          :placeholder="t('home.join.idPlaceholder')"
          :maxlength="36"
        />
        <p v-if="joinError" class="form-error">{{ joinError }}</p>
        <div class="flex justify-end gap-2">
          <GhostButton @click="showJoin = false">{{ t('common.cancel') }}</GhostButton>
          <PrimaryButton type="submit">{{ t('home.join.submit') }}</PrimaryButton>
        </div>
      </form>
    </Modal>
  </section>
</template>

<style scoped>
.form-error {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  color: var(--color-claret);
  margin: 0;
}
</style>
