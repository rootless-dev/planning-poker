<script setup lang="ts">
defineProps<{ disabled?: boolean; type?: 'button' | 'submit' }>()
</script>

<template>
  <button
    :type="type ?? 'button'"
    :disabled="disabled"
    class="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors"
    style="border: 1px solid color-mix(in srgb, var(--color-ink) 20%, transparent); color: var(--color-ink);"
    :class="disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)]'"
  >
    <slot />
  </button>
</template>
