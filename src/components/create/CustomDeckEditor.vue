<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const MAX_CHIPS = 30

const chips = computed(() =>
  props.modelValue
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
)

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
    <span class="field-label kicker">Valores do baralho</span>
    <div class="chip-wrap focus-gold" @click="inputRef?.focus()">
      <span v-for="(c, i) in chips" :key="`${i}-${c}`" class="chip">
        {{ c }}
        <button
          type="button"
          class="chip-remove"
          :aria-label="`Remover ${c}`"
          @click.stop="removeAt(i)"
        >×</button>
      </span>
      <input
        ref="inputRef"
        type="text"
        class="chip-input"
        v-model="typing"
        :placeholder="chips.length === 0 ? 'digite e tecle Enter…' : ''"
        @keydown="onKeydown"
        @blur="onBlur"
        @paste="onPaste"
      />
    </div>
    <p class="chip-hint kicker">Enter adiciona · Backspace remove · mínimo 2 valores</p>
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
.chip-remove:hover, .chip-remove:focus-visible { opacity: 1; outline: none; }
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
