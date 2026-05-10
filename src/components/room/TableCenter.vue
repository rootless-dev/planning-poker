<script setup lang="ts">
import PrimaryButton from '@/components/ui/PrimaryButton.vue'
import GhostButton from '@/components/ui/GhostButton.vue'

defineProps<{
  isModerator: boolean
  revealed: boolean
  votedCount: number
  totalActive: number
}>()
const emit = defineEmits<{ reveal: []; reset: [] }>()
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <p class="text-sm text-center" style="color: var(--color-muted);">
      <template v-if="revealed">Resultado revelado</template>
      <template v-else>{{ votedCount }} de {{ totalActive }} votaram</template>
    </p>

    <PrimaryButton v-if="isModerator && !revealed" @click="emit('reveal')">
      Revelar votos
    </PrimaryButton>
    <GhostButton v-else-if="isModerator && revealed" @click="emit('reset')">
      Nova rodada
    </GhostButton>
  </div>
</template>
