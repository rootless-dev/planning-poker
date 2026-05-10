<script setup lang="ts">
defineProps<{ disabled?: boolean; type?: 'button' | 'submit' }>()
</script>

<template>
  <button
    :type="type ?? 'button'"
    :disabled="disabled"
    class="primary-btn"
    :class="{ disabled }"
  >
    <slot />
  </button>
</template>

<style scoped>
.primary-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 999px;
  font-family: var(--font-display);
  font-variation-settings: "opsz" 144, "SOFT" 30, "wght" 600;
  font-size: 0.98rem;
  letter-spacing: 0.005em;
  color: var(--color-felt-deep);
  background: linear-gradient(180deg,
    var(--color-gold-soft) 0%,
    var(--color-gold) 60%,
    var(--color-gold-deep) 100%);
  border: 1px solid color-mix(in srgb, var(--color-gold-deep) 90%, transparent);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, white 50%, transparent),
    inset 0 -1px 0 color-mix(in srgb, black 25%, transparent),
    0 10px 22px -10px rgb(var(--color-shadow) / 0.45);
  cursor: pointer;
  transition: transform 180ms cubic-bezier(.2,.7,.2,1), box-shadow 180ms ease;
}
.primary-btn:hover:not(.disabled) {
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, white 60%, transparent),
    inset 0 -1px 0 color-mix(in srgb, black 25%, transparent),
    0 16px 30px -10px rgb(var(--color-shadow) / 0.55);
}
.primary-btn:active:not(.disabled) {
  transform: translateY(0);
}
.primary-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}
.primary-btn.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
