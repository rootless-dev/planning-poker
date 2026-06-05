<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatMinutes, isValidMinutes } from '@/lib/duration'

const props = defineProps<{ modelValue: string; hoursMode?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()

const MAX_CHIPS = 30

const chips = computed(() =>
  props.modelValue
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
)

const displayChips = computed(() =>
  chips.value.map((raw) => {
    if (!props.hoursMode) return { raw, display: raw, invalid: false }
    const valid = isValidMinutes(raw)
    return { raw, display: valid ? formatMinutes(Number(raw)) : raw, invalid: !valid }
  })
)

const hasInvalid = computed(() => displayChips.value.some(c => c.invalid))

const typing = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function emitChips(next: string[]) {
  emit('update:modelValue', next.join(', '))
}

function addFromInput() {
  const raw = typing.value.trim()
  typing.value = ''
  if (!raw) return
  addValues([raw])
}

function addValues(values: string[]) {
  const current = chips.value
  const next = [...current]
  for (const v of values) {
    const trimmed = v.trim()
    if (!trimmed) continue
    if (next.includes(trimmed)) continue
    if (next.length >= MAX_CHIPS) break
    next.push(trimmed)
  }
  if (next.length !== current.length) {
    emitChips(next)
  }
}

function removeAt(index: number) {
  const next = chips.value.slice()
  next.splice(index, 1)
  emitChips(next)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    addFromInput()
  } else if (e.key === ',') {
    e.preventDefault()
    addFromInput()
  } else if (e.key === 'Backspace' && typing.value === '' && chips.value.length > 0) {
    e.preventDefault()
    removeAt(chips.value.length - 1)
  }
}

function onBlur() {
  if (typing.value.trim()) addFromInput()
}

function onPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text/plain') ?? ''
  if (!text.includes(',') && !text.includes('\n')) return
  e.preventDefault()
  const parts = text.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
  addValues(parts)
  typing.value = ''
}

defineExpose({
  focus: () => nextTick(() => inputRef.value?.focus()),
})
</script>

<template>
  <div class="chip-field">
    <span class="field-label kicker">{{ t('decks.customEditor.label') }}</span>
    <div class="chip-wrap" @click="inputRef?.focus()">
      <span
        v-for="(c, i) in displayChips"
        :key="`${i}-${c.raw}`"
        class="chip"
        :class="{ invalid: c.invalid }"
      >
        {{ c.display }}
        <button
          type="button"
          class="chip-remove"
          :aria-label="t('decks.customEditor.removeChip', { value: c.raw })"
          @click.stop="removeAt(i)"
        >×</button>
      </span>
      <input
        ref="inputRef"
        type="text"
        class="chip-input"
        v-model="typing"
        :placeholder="chips.length === 0 ? t('decks.customEditor.placeholder') : ''"
        @keydown="onKeydown"
        @blur="onBlur"
        @paste="onPaste"
      />
    </div>
    <p v-if="hoursMode && hasInvalid" class="chip-error">{{ t('decks.customEditor.invalidValues') }}</p>
    <p class="chip-hint kicker">{{ hoursMode ? t('decks.customEditor.hoursHint') : t('decks.customEditor.hint') }}</p>
  </div>
</template>

<style scoped>
.chip-field { display: flex; flex-direction: column; gap: 6px; }
.field-label { display: block; }
.chip-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent);
  min-height: 56px;
  cursor: text;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.chip-wrap:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px 5px 12px;
  border-radius: 999px;
  background: var(--color-brand);
  color: var(--color-paper-soft);
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 500;
}
.chip.invalid {
  background: var(--color-claret);
}
.chip-error {
  margin: 0;
  font-size: 0.7rem;
  color: var(--color-claret);
}
.chip-remove {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  border-radius: 999px;
  font-size: 0.95rem;
  line-height: 1;
}
.chip-remove:hover { opacity: 1; }
.chip-remove:focus-visible {
  opacity: 1;
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.chip-input {
  flex: 1;
  min-width: 90px;
  background: transparent;
  border: 0;
  outline: 0;
  padding: 4px 6px;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 14, "SOFT" 60, "wght" 400;
  font-size: 1rem;
}
.chip-input::placeholder {
  color: color-mix(in srgb, var(--color-ink) 40%, transparent);
}
.chip-hint { font-size: 0.65rem; margin: 0; }
</style>
