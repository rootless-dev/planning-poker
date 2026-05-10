<script setup lang="ts">
import { ref, watch } from 'vue'
import GhostButton from '@/components/ui/GhostButton.vue'
import { useToasts } from '@/composables/useToasts'

const props = defineProps<{
  roomName: string
  taskTitle: string
  isModerator: boolean
  totalActive: number
  votedCount: number
  revealed: boolean
}>()
const emit = defineEmits<{ rename: [title: string] }>()

const editing = ref(false)
const draft = ref(props.taskTitle)
watch(() => props.taskTitle, v => { if (!editing.value) draft.value = v })

function commit() {
  editing.value = false
  if (draft.value.trim() !== props.taskTitle) emit('rename', draft.value.trim())
}

const toasts = useToasts()
async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    toasts.push('Link copiado', 'success')
  } catch {
    toasts.push('Não consegui copiar — copie da barra de endereço', 'error')
  }
}
</script>

<template>
  <header class="flex flex-col gap-1">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-2xl font-bold truncate">{{ roomName }}</h1>
      <GhostButton @click="copyLink">Copiar link</GhostButton>
    </div>

    <div class="flex items-center gap-2 text-sm" style="color: var(--color-muted);">
      <button
        v-if="isModerator && !editing"
        type="button"
        @click="editing = true"
        class="underline-offset-2 hover:underline text-left"
      >📝 {{ taskTitle || 'Defina o que estamos estimando' }}</button>
      <span v-else-if="!editing">📝 {{ taskTitle || '—' }}</span>
      <input
        v-else
        v-model="draft"
        @keydown.enter="commit"
        @blur="commit"
        autofocus
        class="px-2 py-1 rounded outline-none"
        style="background: var(--color-surface); border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent); color: var(--color-ink);"
        maxlength="80"
      />
      <span class="ml-auto">{{ totalActive }} online · {{ votedCount }}/{{ totalActive }} votaram</span>
    </div>
  </header>
</template>
