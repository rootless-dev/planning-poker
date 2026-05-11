<script setup lang="ts">
import { onMounted, ref } from 'vue'

defineProps<{ cooldownRemainingMs: number }>()
const emit = defineEmits<{ select: [value: string]; close: [] }>()

const ready = ref(false)

onMounted(async () => {
  try {
    await import('emoji-picker-element')
    ready.value = true
  } catch {
    ready.value = false
  }
})

function onPickerClick(e: Event) {
  const ce = e as CustomEvent<{ unicode: string }>
  if (!ce.detail?.unicode) return
  emit('select', ce.detail.unicode)
}
</script>

<template>
  <Transition name="panel" appear>
    <aside class="emoji-panel" role="dialog" aria-label="Reagir com emoji" @keydown.esc="emit('close')">
      <header class="panel-head">
        <h3>Reagir</h3>
        <button type="button" aria-label="Fechar" @click="emit('close')">×</button>
      </header>
      <div class="picker-wrap" :class="{ disabled: cooldownRemainingMs > 0 }">
        <emoji-picker v-if="ready" @emoji-click="onPickerClick" />
        <p v-else class="loading">Carregando…</p>
        <div v-if="cooldownRemainingMs > 0" class="cooldown-overlay">aguarde…</div>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.emoji-panel {
  position: fixed;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 300px;
  max-height: 360px;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  color: var(--color-ink);
  border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent);
  border-radius: 14px;
  box-shadow: 0 20px 40px -12px rgb(var(--color-shadow) / 0.55);
  z-index: 50;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-ink) 12%, transparent);
}
.panel-head h3 {
  font-family: var(--font-display);
  font-size: 0.95rem;
  margin: 0;
}
.panel-head button {
  background: none;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-ink);
}
.picker-wrap {
  position: relative;
  flex: 1;
  min-height: 280px;
}
.picker-wrap.disabled emoji-picker { opacity: 0.45; pointer-events: none; }
.cooldown-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-ink) 80%, transparent);
  background: color-mix(in srgb, var(--color-surface) 60%, transparent);
}
.loading {
  padding: 24px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-align: center;
}
emoji-picker {
  --background: var(--color-surface);
  --border-color: transparent;
  --input-border-color: color-mix(in srgb, var(--color-ink) 18%, transparent);
  --num-columns: 7;
  --emoji-size: 1.2rem;
  --emoji-padding: 0.35rem;
  width: 100%;
  height: 100%;
}

.panel-enter-active, .panel-leave-active {
  transition: transform 220ms cubic-bezier(.2,.7,.2,1), opacity 220ms ease;
}
.panel-enter-from, .panel-leave-to {
  transform: translateY(-50%) translateX(120%);
  opacity: 0;
}

@media (max-width: 767px) {
  .emoji-panel {
    right: 0;
    left: 0;
    top: auto;
    bottom: 0;
    transform: none;
    width: 100%;
    max-height: 60vh;
    border-radius: 14px 14px 0 0;
  }

  .panel-enter-from, .panel-leave-to {
    transform: translateY(100%);
    opacity: 0;
  }
}
</style>
