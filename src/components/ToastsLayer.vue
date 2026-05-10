<script setup lang="ts">
import { useToasts } from '@/composables/useToasts'
import Toast from './ui/Toast.vue'
const { toasts, dismiss } = useToasts()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end" aria-live="polite">
      <Toast v-for="t in toasts" :key="t.id" :toast="t" @dismiss="dismiss" />
    </div>
  </Teleport>
</template>
