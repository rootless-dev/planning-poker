<script setup lang="ts">
import { onMounted, onBeforeUnmount, useSlots } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    kicker?: string
    closable?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { closable: true },
)
const emit = defineEmits<{ close: [] }>()
const slots = useSlots()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open && props.closable !== false) emit('close')
}
function onBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('modal-backdrop') && props.closable !== false) {
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      @click="onBackdropClick"
    >
      <div class="modal-card paper-grain" :class="`size-${size ?? 'md'}`">
        <div class="modal-edge"></div>
        <button
          v-if="closable !== false"
          type="button"
          class="modal-close"
          @click="emit('close')"
          aria-label="Fechar"
        >×</button>
        <div class="modal-body">
          <div v-if="title || kicker" class="modal-head">
            <span v-if="kicker" class="kicker">{{ kicker }}</span>
            <h2 v-if="title" class="modal-title">{{ title }}</h2>
            <div class="gold-rule"></div>
          </div>
          <div class="modal-content">
            <slot />
          </div>
          <div v-if="slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background:
    radial-gradient(80% 60% at 50% 40%,
      color-mix(in srgb, black 60%, transparent),
      color-mix(in srgb, black 80%, transparent));
  backdrop-filter: blur(6px);
  animation: backdrop-in 240ms ease;
}

.modal-card {
  position: relative;
  width: 100%;
  border-radius: 18px;
  background: var(--color-surface);
  color: var(--color-ink);
  border: 1px solid color-mix(in srgb, var(--color-accent) 50%, transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 22%, transparent),
    0 40px 80px -20px rgb(var(--color-shadow) / 0.6);
  overflow: hidden;
  animation: card-in 320ms cubic-bezier(.2,.7,.2,1);
}
.modal-card.size-sm { max-width: 380px; }
.modal-card.size-md { max-width: 460px; }
.modal-card.size-lg { max-width: 640px; }

.modal-edge {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--color-accent) 18%, transparent) 0%,
      transparent 12%);
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 400;
  line-height: 1;
  color: color-mix(in srgb, var(--color-ink) 70%, transparent);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent);
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
}
.modal-close:hover {
  color: var(--color-ink);
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
}

.modal-body {
  position: relative;
  z-index: 1;
  padding: 28px 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}

.modal-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.modal-title {
  font-family: var(--font-display);
  font-variation-settings: "opsz" 144, "SOFT" 50, "wght" 400;
  font-style: italic;
  font-size: 1.6rem;
  margin: 0 0 6px;
  letter-spacing: -0.015em;
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
  padding-top: 14px;
  border-top: 1px solid color-mix(in srgb, var(--color-ink) 10%, transparent);
}

@keyframes backdrop-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes card-in {
  from { opacity: 0; transform: translateY(8px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
