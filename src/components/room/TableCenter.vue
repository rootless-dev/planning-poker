<script setup lang="ts">
defineProps<{
  isModerator: boolean
  revealed: boolean
  votedCount: number
  totalActive: number
  resultsOpen?: boolean
}>()
const emit = defineEmits<{ reveal: []; reset: []; showResults: [] }>()

const dots = (count: number, total: number) =>
  Array.from({ length: total }, (_, i) => i < count)
</script>

<template>
  <div class="center-card">
    <p class="kicker label">
      <template v-if="revealed">Resultado revelado</template>
      <template v-else>Aguardando votos</template>
    </p>

    <div v-if="!revealed" class="tally">
      <div class="dots" aria-hidden="true">
        <span
          v-for="(filled, i) in dots(votedCount, totalActive)"
          :key="i"
          class="dot"
          :class="{ filled }"
        />
      </div>
      <p class="counter">
        <span class="numeral big num-tabular">{{ votedCount }}</span>
        <span class="slash">/</span>
        <span class="numeral mid num-tabular">{{ totalActive }}</span>
      </p>
    </div>

    <button
      v-if="isModerator && !revealed"
      type="button"
      @click="emit('reveal')"
      class="house-btn"
      :disabled="votedCount === 0"
      :aria-disabled="votedCount === 0"
    >
      <span class="house-btn-label">Revelar</span>
      <span class="house-btn-arrow" aria-hidden="true">⟶</span>
      <span class="house-btn-key" aria-hidden="true">R</span>
    </button>

    <div v-else-if="revealed" class="post-reveal">
      <button
        v-if="!resultsOpen"
        type="button"
        @click="emit('showResults')"
        class="house-btn"
      >
        <span class="house-btn-label">Ver resultado</span>
        <span class="house-btn-arrow" aria-hidden="true">↑</span>
      </button>
      <button
        v-if="isModerator"
        type="button"
        @click="emit('reset')"
        class="house-btn ghost"
      >
        <span class="house-btn-label">Nova rodada</span>
        <span class="house-btn-arrow" aria-hidden="true">↻</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.center-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-radius: 18px;
  min-width: 220px;
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--color-felt-deep) 60%, transparent),
      color-mix(in srgb, var(--color-felt-deep) 35%, transparent));
  border: 1px solid color-mix(in srgb, var(--color-gold) 45%, transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-gold-soft) 18%, transparent),
    0 14px 36px -16px rgb(var(--color-shadow) / 0.6);
  backdrop-filter: blur(2px);
}

.label {
  color: color-mix(in srgb, var(--color-gold-soft) 80%, transparent);
}

.tally {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.dots {
  display: flex;
  gap: 6px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-paper-soft) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-gold-soft) 30%, transparent);
  transition: background 280ms ease, transform 280ms cubic-bezier(.2,.7,.2,1);
}
.dot.filled {
  background: var(--color-gold);
  box-shadow: 0 0 8px color-mix(in srgb, var(--color-gold-soft) 70%, transparent);
  transform: scale(1.05);
}

.counter {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: var(--color-paper-soft);
  font-feature-settings: "tnum", "lnum";
}
.counter .big   { font-size: 1.6rem; font-variation-settings: "opsz" 144, "wght" 500; }
.counter .mid   { font-size: 1rem; opacity: 0.7; }
.counter .slash { color: color-mix(in srgb, var(--color-gold-soft) 50%, transparent); }

.house-btn {
  --bg: linear-gradient(180deg, var(--color-gold-soft) 0%, var(--color-gold) 60%, var(--color-gold-deep) 100%);
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px 10px 20px;
  border-radius: 999px;
  background: var(--bg);
  color: var(--color-felt-deep);
  font-family: var(--font-display);
  font-variation-settings: "opsz" 144, "SOFT" 30, "wght" 600;
  font-size: 1rem;
  letter-spacing: 0.01em;
  border: 1px solid color-mix(in srgb, var(--color-gold-deep) 90%, transparent);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, white 50%, transparent),
    inset 0 -1px 0 color-mix(in srgb, black 25%, transparent),
    0 14px 30px -10px rgb(var(--color-shadow) / 0.6),
    0 0 0 0 color-mix(in srgb, var(--color-gold-soft) 70%, transparent);
  cursor: pointer;
  transition:
    transform 220ms cubic-bezier(.2,.7,.2,1),
    box-shadow 220ms ease;
}
.house-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, white 60%, transparent),
    inset 0 -1px 0 color-mix(in srgb, black 25%, transparent),
    0 18px 40px -10px rgb(var(--color-shadow) / 0.7),
    0 0 0 6px color-mix(in srgb, var(--color-gold-soft) 28%, transparent);
}
.house-btn:active:not(:disabled) {
  transform: translateY(0);
}
.house-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.house-btn-arrow {
  font-family: var(--font-body);
  font-size: 1.05rem;
}
.house-btn-key {
  font-family: var(--font-mono);
  font-size: 0.66rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--color-felt-deep) 80%, transparent);
  color: var(--color-gold-soft);
  letter-spacing: 0.05em;
}

.house-btn.ghost {
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--color-paper-soft) 8%, transparent),
      color-mix(in srgb, var(--color-paper-soft) 4%, transparent));
  color: var(--color-paper-soft);
  border-color: color-mix(in srgb, var(--color-gold-soft) 50%, transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-gold-soft) 20%, transparent),
    0 10px 24px -10px rgb(var(--color-shadow) / 0.5);
}
.house-btn.ghost:hover {
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--color-paper-soft) 14%, transparent),
      color-mix(in srgb, var(--color-paper-soft) 8%, transparent));
}

.post-reveal {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.post-reveal .house-btn {
  justify-content: center;
  padding: 8px 14px;
  font-size: 0.92rem;
}
</style>
