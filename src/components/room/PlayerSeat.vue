<script setup lang="ts">
import PlayingCard from './PlayingCard.vue'
import type { PresenceState } from '@/types/room'

defineProps<{
  name: string
  vote: string | null
  presence: PresenceState
  isModerator?: boolean
  isSelf?: boolean
  revealed: boolean
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-1 w-20"
       :style="presence === 'absent' ? 'opacity: 0.5;' : ''">
    <PlayingCard
      v-if="vote === null"
      state="idle"
      size="sm"
      :value="''"
      class="border-dashed animate-pulse"
      style="opacity: 0.5;"
    />
    <PlayingCard
      v-else-if="!revealed"
      state="back"
      size="sm"
    />
    <PlayingCard
      v-else
      state="revealed"
      size="sm"
      :value="vote"
    />

    <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
         style="background: linear-gradient(135deg,var(--color-warm),var(--color-cool)); color: var(--color-ink);">
      {{ name.slice(0, 1).toUpperCase() }}
    </div>
    <span class="text-xs truncate max-w-full" style="color: var(--color-ink);">
      {{ name }}<span v-if="isModerator"> 👑</span>
    </span>
  </div>
</template>
