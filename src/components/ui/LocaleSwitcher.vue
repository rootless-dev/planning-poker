<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useLocale } from '@/composables/useLocale'
import type { Locale } from '@/i18n'

const { current, setLocale, supported } = useLocale()
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)

const SHORT: Record<Locale, string> = { 'pt-BR': 'PT', en: 'EN', es: 'ES' }
const NATIVE: Record<Locale, string> = { 'pt-BR': 'Português', en: 'English', es: 'Español' }

const currentShort = computed(() => SHORT[current.value])

function toggle() { open.value = !open.value }
function close() { open.value = false }

function choose(loc: Locale) {
  setLocale(loc)
  open.value = false
  triggerRef.value?.focus()
}

function onEsc() {
  if (!open.value) return
  open.value = false
  triggerRef.value?.focus()
}

function onDocClick(e: MouseEvent) {
  if (!rootRef.value) return
  if (!rootRef.value.contains(e.target as Node)) close()
}

onMounted(() => window.addEventListener('click', onDocClick))
onBeforeUnmount(() => window.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="rootRef" class="locale-switcher" @keydown.esc="onEsc">
    <button
      ref="triggerRef"
      type="button"
      class="locale-trigger"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="open ? 'locale-menu' : undefined"
      @click.stop="toggle"
    >
      <span class="locale-code">{{ currentShort }}</span>
      <span class="locale-chevron" aria-hidden="true">▾</span>
    </button>
    <ul
      v-if="open"
      id="locale-menu"
      class="locale-menu"
      role="listbox"
      tabindex="-1"
      @keydown.esc="onEsc"
    >
      <li
        v-for="loc in supported"
        :key="loc"
        role="option"
        :aria-selected="loc === current"
        class="locale-option"
        :class="{ active: loc === current }"
        @click="choose(loc)"
      >
        <span class="locale-native">{{ NATIVE[loc] }}</span>
        <span class="locale-code-sm">{{ SHORT[loc] }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.locale-switcher { position: relative; display: inline-flex; }
.locale-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--color-ink) 16%, transparent);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-ink) 80%, transparent);
  transition: border-color 180ms ease, background 180ms ease;
}
.locale-trigger:hover {
  border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
}
.locale-chevron { font-size: 0.6rem; opacity: 0.6; }
.locale-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 60;
  min-width: 160px;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-ink) 16%, transparent);
  border-radius: 10px;
  box-shadow: 0 16px 32px -10px rgb(var(--color-shadow) / 0.5);
}
.locale-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.86rem;
  color: var(--color-ink);
}
.locale-option:hover {
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}
.locale-option.active {
  background: color-mix(in srgb, var(--color-accent) 16%, transparent);
}
.locale-code-sm {
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  color: color-mix(in srgb, var(--color-ink) 60%, transparent);
}
</style>
