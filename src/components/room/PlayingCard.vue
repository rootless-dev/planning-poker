<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value?: string | null
  state: 'idle' | 'selected' | 'back' | 'revealed'
  size?: 'xs' | 'sm' | 'md' | 'lg'
}>()

const sizeMap = {
  xs: { box: 'w-9 h-12',   index: 'text-[0.5rem]',  main: 'text-sm' },
  sm: { box: 'w-12 h-16',  index: 'text-[0.6rem]',  main: 'text-lg' },
  md: { box: 'w-16 h-22',  index: 'text-[0.7rem]',  main: 'text-2xl' },
  lg: { box: 'w-22 h-32',  index: 'text-[0.78rem]', main: 'text-[2.4rem]' },
} as const

const dim = computed(() => sizeMap[props.size ?? 'md'])
const isFaceUp = computed(() => props.state === 'idle' || props.state === 'selected' || props.state === 'revealed')
const display = computed(() => props.value ?? '')
</script>

<template>
  <div
    class="card-root relative select-none"
    :class="[
      dim.box,
      state === 'selected' && 'is-selected',
      state === 'idle'     && 'is-idle',
      state === 'back'     && 'is-back',
      state === 'revealed' && 'is-revealed',
    ]"
    :aria-label="state === 'back' ? 'carta virada' : (display || 'carta vazia')"
  >
    <div v-if="isFaceUp" class="card-face">
      <span class="corner corner-tl numeral num-tabular" :class="dim.index">{{ display }}</span>
      <span class="numeral num-tabular center" :class="dim.main">{{ display }}</span>
      <span class="corner corner-br numeral num-tabular" :class="dim.index">{{ display }}</span>
    </div>
    <div v-else class="card-face card-back">
      <span class="monogram numeral">P</span>
    </div>
  </div>
</template>

<style scoped>
.card-root {
  border-radius: 10px;
  transition:
    transform 280ms cubic-bezier(.2,.7,.2,1),
    box-shadow 280ms ease;
  will-change: transform;
}
.card-face {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.is-idle .card-face {
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--color-paper-soft) 96%, white) 0%,
    var(--color-paper-soft) 100%);
  border: 1px solid color-mix(in srgb, var(--color-ink) 14%, transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 22%, transparent),
    0 8px 18px -10px rgb(var(--color-shadow) / 0.5);
  color: #14241b;
}
.is-revealed .card-face {
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--color-paper-soft) 98%, white) 0%,
    var(--color-paper-soft) 100%);
  border: 1px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 35%, transparent),
    0 16px 28px -12px rgb(var(--color-shadow) / 0.55);
  color: #14241b;
  animation: card-flip-in 380ms cubic-bezier(.2,.7,.2,1);
}
.is-selected .card-face {
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--color-paper-soft) 98%, white) 0%,
    var(--color-paper-soft) 100%);
  border: 1px solid color-mix(in srgb, var(--color-accent) 80%, transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 60%, transparent),
    0 0 0 3px color-mix(in srgb, var(--color-accent) 35%, transparent),
    0 22px 38px -14px rgb(var(--color-shadow) / 0.6);
  color: #14241b;
}
.is-selected {
  transform: translateY(-14px) rotate(-1deg);
}
.is-back .card-face {
  border: 1px solid color-mix(in srgb, var(--color-gold) 55%, transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-gold-soft) 35%, transparent),
    inset 0 0 0 3px color-mix(in srgb, var(--color-claret) 70%, transparent),
    0 12px 22px -10px rgb(var(--color-shadow) / 0.6);
}
.is-back .monogram {
  color: color-mix(in srgb, var(--color-gold-soft) 90%, transparent);
  font-style: italic;
  font-size: 1.4em;
  font-variation-settings: "opsz" 144, "SOFT" 100, "wght" 400;
  text-shadow: 0 1px 0 color-mix(in srgb, black 30%, transparent);
}

.center {
  font-variation-settings: "opsz" 144, "SOFT" 0, "wght" 500;
}
.corner {
  position: absolute;
  font-variation-settings: "opsz" 9, "SOFT" 0, "wght" 600;
  letter-spacing: 0.02em;
  color: color-mix(in srgb, #14241b 75%, transparent);
}
.corner-tl { top: 6%; left: 8%; }
.corner-br { bottom: 6%; right: 8%; transform: rotate(180deg); }

@keyframes card-flip-in {
  0%   { transform: rotateY(90deg); opacity: 0; }
  60%  { transform: rotateY(-8deg); opacity: 1; }
  100% { transform: rotateY(0deg); }
}
</style>
