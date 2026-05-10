<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{ open: boolean; title?: string; closable?: boolean }>()
const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open && props.closable !== false) emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style="background: color-mix(in srgb, black 50%, transparent);"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style="background: var(--color-surface); color: var(--color-ink);"
      >
        <h2 v-if="title" class="text-lg font-bold mb-4">{{ title }}</h2>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
