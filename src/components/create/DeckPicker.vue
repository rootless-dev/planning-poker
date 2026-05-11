<script setup lang="ts">
import { computed } from 'vue'
import type { DeckType } from '@/types/room'
import { DECK_PRESETS, pickPreview } from '@/lib/decks'
import DeckPreviewCards from './DeckPreviewCards.vue'
import CustomDeckEditor from './CustomDeckEditor.vue'

const props = defineProps<{
  modelValue: DeckType
  customRaw: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: DeckType]
  'update:customRaw': [value: string]
}>()

const activePreset = computed(() =>
  DECK_PRESETS.find(p => p.type === props.modelValue) ?? null
)
const previewValues = computed(() =>
  activePreset.value ? pickPreview(activePreset.value.values) : []
)

function onSelectChange(e: Event) {
  emit('update:modelValue', (e.target as HTMLSelectElement).value as DeckType)
}
</script>

<template>
  <div class="deck-picker">
    <label for="deck-type" class="field-label kicker">Baralho</label>
    <select
      id="deck-type"
      class="deck-select focus-gold"
      :value="modelValue"
      @change="onSelectChange"
    >
      <option v-for="p in DECK_PRESETS" :key="p.type" :value="p.type">{{ p.label }}</option>
      <option value="custom">Customizado</option>
    </select>

    <p v-if="activePreset" class="deck-description">{{ activePreset.description }}</p>

    <DeckPreviewCards v-if="modelValue !== 'custom'" :values="previewValues" />
    <CustomDeckEditor
      v-else
      :model-value="customRaw"
      @update:model-value="(v: string) => emit('update:customRaw', v)"
    />
  </div>
</template>

<style scoped>
.deck-picker { display: flex; flex-direction: column; gap: 8px; }
.field-label { display: block; }
.deck-select {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  padding: 12px 40px 12px 16px;
  border-radius: 12px;
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 14, "SOFT" 60, "wght" 400;
  font-size: 1rem;
  color: var(--color-ink);
  background-color: var(--color-surface);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='currentColor'><path d='M3 5l4 4 4-4z'/></svg>");
  background-repeat: no-repeat;
  background-position: right 14px center;
  border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent);
  outline: none;
  cursor: pointer;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.deck-select:focus-visible {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent);
}
.deck-description {
  font-size: 0.78rem;
  font-style: italic;
  color: var(--color-muted);
  margin: 2px 0 0;
}
</style>
