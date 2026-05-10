<script setup lang="ts">
import PlayingCard from './PlayingCard.vue'

defineProps<{ values: string[]; selected: string | null; disabled?: boolean }>()
const emit = defineEmits<{ select: [value: string] }>()
</script>

<template>
  <div class="w-full flex justify-center px-2 overflow-x-auto">
    <div class="flex gap-2 py-3">
      <button
        v-for="v in values"
        :key="v"
        type="button"
        :disabled="disabled"
        @click="emit('select', v)"
        class="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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
</template>
