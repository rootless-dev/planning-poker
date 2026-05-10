<script setup lang="ts">
import { useDarkMode } from '@/composables/useDarkMode'
import { RouterLink } from 'vue-router'
const { isDark, toggle } = useDarkMode()
</script>

<template>
  <header class="app-header">
    <RouterLink to="/" class="brand">
      <span class="brand-mark" aria-hidden="true">♠</span>
      <span class="brand-name">
        <span class="brand-name-1">Planning</span>
        <span class="brand-name-2">Poker</span>
      </span>
    </RouterLink>
    <button
      type="button"
      @click="toggle"
      class="theme-toggle"
      :aria-pressed="isDark"
      aria-label="Alternar tema"
    >
      <span class="theme-track" :class="{ on: isDark }">
        <span class="theme-thumb"></span>
      </span>
      <span class="theme-label">{{ isDark ? 'Lounge' : 'Daybreak' }}</span>
    </button>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  backdrop-filter: blur(14px) saturate(140%);
  background: color-mix(in srgb, var(--color-canvas) 80%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--color-ink) 8%, transparent);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: var(--color-ink);
}
.brand-mark {
  font-family: var(--font-display);
  font-size: 1.5rem;
  color: var(--color-accent);
  text-shadow: 0 1px 0 color-mix(in srgb, black 25%, transparent);
  transform: translateY(-1px);
}
.brand-name {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  letter-spacing: -0.02em;
}
.brand-name-1 {
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 14, "SOFT" 80, "wght" 400;
  font-size: 1.05rem;
  color: color-mix(in srgb, var(--color-ink) 70%, transparent);
}
.brand-name-2 {
  font-family: var(--font-display);
  font-variation-settings: "opsz" 144, "SOFT" 0, "wght" 600;
  font-size: 1.15rem;
  letter-spacing: -0.01em;
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 5px 12px 5px 5px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--color-ink) 16%, transparent);
  cursor: pointer;
  transition: border-color 180ms ease, background 180ms ease;
}
.theme-toggle:hover {
  border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
}

.theme-track {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-ink) 14%, transparent);
  transition: background 220ms ease;
}
.theme-track.on {
  background: color-mix(in srgb, var(--color-accent) 70%, transparent);
}
.theme-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-paper-soft);
  box-shadow: 0 1px 3px rgb(var(--color-shadow) / 0.3);
  transition: transform 220ms cubic-bezier(.2,.7,.2,1);
}
.theme-track.on .theme-thumb {
  transform: translateX(16px);
}

.theme-label {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-ink) 70%, transparent);
}
</style>
