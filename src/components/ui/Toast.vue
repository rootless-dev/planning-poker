<script setup lang="ts">
import type { Toast } from '@/composables/useToasts'

const props = defineProps<{ toast: Toast }>()
const emit = defineEmits<{ dismiss: [id: number] }>()

const variantStyle: Record<Toast['variant'], string> = {
  info: 'background: var(--color-surface); color: var(--color-ink); border: 1px solid color-mix(in srgb, var(--color-ink) 12%, transparent);',
  success: 'background: var(--color-cool); color: var(--color-ink);',
  error: 'background: var(--color-warm); color: var(--color-ink);',
}
</script>

<template>
  <button
    type="button"
    @click="emit('dismiss', props.toast.id)"
    class="px-4 py-2 rounded-full text-sm shadow-md cursor-pointer text-left"
    :style="variantStyle[props.toast.variant]"
  >
    {{ props.toast.message }}
  </button>
</template>
