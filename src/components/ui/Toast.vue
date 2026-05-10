<script setup lang="ts">
import type { Toast } from '@/composables/useToasts'

const props = defineProps<{ toast: Toast }>()
const emit = defineEmits<{ dismiss: [id: number] }>()
</script>

<template>
  <button
    type="button"
    @click="emit('dismiss', props.toast.id)"
    class="toast"
    :class="`toast-${props.toast.variant}`"
  >
    <span class="toast-mark" aria-hidden="true">
      <template v-if="props.toast.variant === 'success'">✓</template>
      <template v-else-if="props.toast.variant === 'error'">!</template>
      <template v-else>·</template>
    </span>
    <span class="toast-msg">{{ props.toast.message }}</span>
  </button>
</template>

<style scoped>
.toast {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 0.88rem;
  font-weight: 500;
  background: var(--color-surface);
  color: var(--color-ink);
  border: 1px solid color-mix(in srgb, var(--color-ink) 14%, transparent);
  box-shadow: 0 16px 36px -14px rgb(var(--color-shadow) / 0.45);
  cursor: pointer;
  text-align: left;
  animation: toast-in 280ms cubic-bezier(.2,.7,.2,1);
}

.toast-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
}

.toast-success {
  border-color: color-mix(in srgb, var(--color-felt) 50%, transparent);
}
.toast-success .toast-mark {
  background: var(--color-felt);
  color: var(--color-paper-soft);
}

.toast-error {
  border-color: color-mix(in srgb, var(--color-claret) 60%, transparent);
}
.toast-error .toast-mark {
  background: var(--color-claret);
  color: var(--color-paper-soft);
}

.toast-info .toast-mark {
  background: color-mix(in srgb, var(--color-ink) 14%, transparent);
  color: var(--color-ink);
}

@keyframes toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
