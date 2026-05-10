<script setup lang="ts">
import type { DeckType } from '@/types/room'
import CustomDeckEditor from './CustomDeckEditor.vue'

const props = defineProps<{
  modelValue: DeckType
  customRaw: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: DeckType]
  'update:customRaw': [value: string]
}>()

const options: { value: DeckType; label: string; preview: string }[] = [
  { value: 'fibonacci', label: 'Fibonacci', preview: '0, 1, 2, 3, 5, 8, 13, 21, ?, ☕' },
  { value: 'tshirt', label: 'T-shirt', preview: 'XS, S, M, L, XL, XXL, ?, ☕' },
  { value: 'custom', label: 'Customizado', preview: 'você define' },
]
</script>

<template>
  <div class="flex flex-col gap-3">
    <span class="text-sm font-semibold" style="color: var(--color-muted);">Baralho</span>
    <div class="flex flex-col gap-2">
      <label
        v-for="opt in options"
        :key="opt.value"
        class="flex gap-3 items-start p-3 rounded-2xl cursor-pointer"
        :style="props.modelValue === opt.value
          ? 'background: color-mix(in srgb, var(--color-brand) 14%, transparent); border: 1px solid var(--color-brand);'
          : 'border: 1px solid color-mix(in srgb, var(--color-ink) 14%, transparent);'"
      >
        <input
          type="radio"
          :checked="props.modelValue === opt.value"
          @change="emit('update:modelValue', opt.value)"
          class="mt-1"
        />
        <span class="flex-1">
          <span class="block font-bold" style="color: var(--color-ink);">{{ opt.label }}</span>
          <span class="block text-xs" style="color: var(--color-muted);">{{ opt.preview }}</span>
        </span>
      </label>
    </div>

    <CustomDeckEditor
      v-if="props.modelValue === 'custom'"
      :model-value="props.customRaw"
      @update:model-value="(v: string) => emit('update:customRaw', v)"
    />
  </div>
</template>
