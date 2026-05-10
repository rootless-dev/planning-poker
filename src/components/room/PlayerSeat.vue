<script setup lang="ts">
import { ref } from 'vue'
import PlayingCard from './PlayingCard.vue'
import type { PresenceState } from '@/types/room'

const props = defineProps<{
  uid: string
  name: string
  vote: string | null
  presence: PresenceState
  isModerator?: boolean
  isSelf?: boolean
  revealed: boolean
  canKick?: boolean
}>()
const emit = defineEmits<{ kick: [uid: string] }>()

const showMenu = ref(false)
function confirmKick() {
  if (confirm(`Remover ${props.name} da sala?`)) emit('kick', props.uid)
  showMenu.value = false
}
</script>

<template>
  <div class="flex flex-col items-center gap-1 w-20 relative"
       :style="presence === 'absent' ? 'opacity: 0.5;' : ''">
    <PlayingCard
      v-if="vote === null"
      state="idle"
      size="sm"
      :value="''"
      class="border-dashed animate-pulse"
      style="opacity: 0.5;"
    />
    <PlayingCard v-else-if="!revealed" state="back" size="sm" />
    <PlayingCard v-else state="revealed" size="sm" :value="vote" />

    <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
         style="background: linear-gradient(135deg,var(--color-warm),var(--color-cool)); color: var(--color-ink);">
      {{ name.slice(0, 1).toUpperCase() }}
    </div>
    <span class="text-xs truncate max-w-full" style="color: var(--color-ink);">
      {{ name }}<span v-if="isModerator"> 👑</span>
    </span>

    <button
      v-if="canKick && !isSelf"
      type="button"
      @click="showMenu = !showMenu"
      class="absolute top-0 right-0 text-xs px-1 rounded"
      style="color: var(--color-muted);"
      aria-label="Opções"
    >⋯</button>
    <div
      v-if="showMenu"
      class="absolute top-5 right-0 z-10 rounded-lg p-1 text-sm"
      style="background: var(--color-surface); box-shadow: 0 6px 18px rgba(91,58,138,.18);"
    >
      <button type="button" @click="confirmKick" class="px-3 py-1 rounded hover:bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] cursor-pointer" style="color: var(--color-ink);">
        Remover
      </button>
    </div>
  </div>
</template>
