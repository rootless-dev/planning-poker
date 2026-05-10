<script setup lang="ts">
defineProps<{ disabled?: boolean; type?: 'button' | 'submit' }>()
</script>

<template>
  <button
    :type="type ?? 'button'"
    :disabled="disabled"
    class="ghost-btn"
    :class="{ disabled }"
  >
    <slot />
  </button>
</template>

<style scoped>
.ghost-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 18px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-ink);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--color-ink) 22%, transparent);
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
}
.ghost-btn:hover:not(.disabled) {
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  border-color: color-mix(in srgb, var(--color-accent) 70%, transparent);
}
.ghost-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.ghost-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
