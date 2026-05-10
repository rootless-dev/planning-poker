<script setup lang="ts">
import { computed } from 'vue'
import TextField from '@/components/ui/TextField.vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const preview = computed(() => props.modelValue.split(',').map(s => s.trim()).filter(Boolean))
</script>

<template>
  <div class="flex flex-col gap-2">
    <TextField
      :model-value="modelValue"
      @update:model-value="(v: string) => emit('update:modelValue', v)"
      label="Valores separados por vírgula"
      placeholder="ex: 1, 2, 3, 5, 8, ?, ☕"
    />
    <div class="flex flex-wrap gap-2 text-sm" style="color: var(--color-muted);">
      <span v-for="v in preview" :key="v" class="px-2 py-0.5 rounded-full" style="background: color-mix(in srgb, var(--color-brand) 12%, transparent);">{{ v }}</span>
    </div>
  </div>
</template>
