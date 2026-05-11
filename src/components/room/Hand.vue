<script setup lang="ts">
import PlayingCard from './PlayingCard.vue'

defineProps<{ values: string[]; selected: string | null; disabled?: boolean }>()
const emit = defineEmits<{
  select: [value: string]
  'area-enter': []
  'area-move': []
  'area-leave': []
}>()

function onPointerEnter() { emit('area-enter') }
function onPointerLeave() { emit('area-leave') }
function onPointerMove() { emit('area-move') }
function onScroll() { emit('area-move') }
function onFocusIn() { emit('area-enter') }
function onFocusOut(e: FocusEvent) {
  const rt = e.relatedTarget as HTMLElement | null
  const cur = e.currentTarget as HTMLElement | null
  if (cur && rt && cur.contains(rt)) return
  emit('area-leave')
}
</script>

<template>
  <div class="hand-wrap">
    <p class="kicker hand-label">Sua mão</p>
    <div
      class="hand-rail"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @pointermove="onPointerMove"
      @scroll.passive="onScroll"
      @focusin="onFocusIn"
      @focusout="onFocusOut"
    >
      <div class="hand-track">
        <button
          v-for="(v, i) in values"
          :key="v"
          type="button"
          :disabled="disabled"
          @click="emit('select', v)"
          class="hand-btn"
          :class="{ picked: selected === v, dim: !!selected && selected !== v }"
          :style="{ '--i': i }"
          :aria-pressed="selected === v"
        >
          <PlayingCard
            :value="v"
            size="lg"
            :state="selected === v ? 'selected' : 'idle'"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hand-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  padding-top: 8px;
}

.hand-label {
  align-self: center;
}

.hand-rail {
  width: 100%;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  padding: 8px 12px 24px;
}
.hand-rail::-webkit-scrollbar { display: none; }

.hand-track {
  display: flex;
  gap: 6px;
  justify-content: center;
  min-width: max-content;
  margin: 0 auto;
}

.hand-btn {
  scroll-snap-align: center;
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
  transition:
    transform 260ms cubic-bezier(.2,.7,.2,1),
    opacity 260ms ease,
    filter 260ms ease;
}
.hand-btn:hover:not(:disabled):not(.picked) {
  transform: translateY(-10px);
}
.hand-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
  border-radius: 12px;
}
.hand-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.hand-btn.dim {
  opacity: 0.45;
  filter: saturate(0.7);
}

/* No mobile o leque fica mais compacto */
@media (max-width: 768px) {
  .hand-track { gap: 4px; }
}
</style>
