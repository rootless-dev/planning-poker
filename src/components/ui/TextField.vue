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
  <label class="block">
    <span v-if="label" class="block text-sm font-semibold mb-1" style="color: var(--color-muted);">{{ label }}</span>
    <input
      :value="props.modelValue"
      :placeholder="placeholder"
      :required="required"
      :maxlength="maxlength"
      @input="onInput"
      class="w-full rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2"
      style="background: var(--color-surface); color: var(--color-ink); border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent);"
    />
  </label>
</template>
