<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  required?: boolean
  maxlength?: number
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <label class="field">
    <span v-if="label" class="field-label kicker">{{ label }}</span>
    <input
      :value="props.modelValue"
      :placeholder="placeholder"
      :required="required"
      :maxlength="maxlength"
      @input="onInput"
      class="field-input"
    />
  </label>
</template>

<style scoped>
.field {
  display: block;
}
.field-label {
  display: block;
  margin-bottom: 6px;
}
.field-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 14, "SOFT" 60, "wght" 400;
  font-size: 1rem;
  color: var(--color-ink);
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent);
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.field-input::placeholder {
  color: color-mix(in srgb, var(--color-ink) 40%, transparent);
}
.field-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent);
}
</style>
