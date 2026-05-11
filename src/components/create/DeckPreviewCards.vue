<script setup lang="ts">
defineProps<{ values: string[] }>()
</script>

<template>
  <div class="preview-row" aria-hidden="true">
    <div
      v-for="(v, i) in values"
      :key="`${i}-${v}`"
      class="preview-card"
      :class="{
        'tilt-left':  i === 0 && values.length === 4,
        'tilt-right': i === 3 && values.length === 4,
        'lift':       (i === 1 || i === 2) && values.length === 4,
      }"
      :style="{ fontSize: v.length > 4 ? 'clamp(0.7rem, 2.2vw, 0.95rem)' : (v.length > 2 ? '1.15rem' : '1.6rem') }"
    >
      {{ v }}
    </div>
  </div>
</template>

<style scoped>
.preview-row {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: flex-end;
  padding: 16px 8px 20px;
}
.preview-card {
  width: 72px;
  height: 104px;
  border-radius: 10px;
  background: linear-gradient(180deg,
    var(--color-paper-soft) 0%,
    var(--color-paper) 55%,
    var(--color-paper-deep) 100%);
  color: var(--color-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.6rem;
  font-feature-settings: "lnum", "tnum";
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 50%, transparent),
    0 6px 16px -4px rgb(var(--color-shadow) / 0.35);
  transition: transform 180ms cubic-bezier(.2,.7,.2,1);
}
.preview-card.tilt-left  { transform: rotate(-3deg); }
.preview-card.tilt-right { transform: rotate(3deg);  }
.preview-card.lift       { transform: translateY(-4px); }

@media (max-width: 767px) {
  .preview-card { width: 56px; height: 84px; font-size: 1.25rem; border-radius: 8px; }
}
</style>
