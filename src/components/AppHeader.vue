<script setup lang="ts">
import { useDarkMode } from '@/composables/useDarkMode'
import { RouterLink } from 'vue-router'
const { isDark, toggle } = useDarkMode()
</script>

<template>
  <header
    class="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
    style="backdrop-filter: blur(12px); background: color-mix(in srgb, var(--color-canvas) 80%, transparent);"
  >
    <RouterLink to="/" class="font-bold text-lg" style="color: var(--color-ink);">🃏 Planning Poker</RouterLink>
    <button
      type="button"
      @click="toggle"
      class="rounded-full px-3 py-1.5 text-sm font-semibold"
      style="border: 1px solid color-mix(in srgb, var(--color-ink) 20%, transparent); color: var(--color-ink);"
      :aria-pressed="isDark"
      aria-label="Alternar tema"
    >
      {{ isDark ? '☀️ Claro' : '🌙 Escuro' }}
    </button>
  </header>
</template>
