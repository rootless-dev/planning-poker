<script setup lang="ts">
import { ref, watch, computed } from 'vue'
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

const status = computed(() => {
  if (props.revealed) return 'Revelado'
  if (props.totalActive === 0) return 'Sem jogadores'
  return `${props.votedCount} de ${props.totalActive} votaram`
})
</script>

<template>
  <header class="room-header">
    <div class="row top">
      <div class="meta">
        <span class="kicker">Sessão · {{ totalActive }} {{ totalActive === 1 ? 'jogador' : 'jogadores' }}</span>
        <h1 class="room-name">{{ roomName }}</h1>
      </div>
      <button type="button" @click="copyLink" class="link-btn">
        <span class="dot" aria-hidden="true">↗</span>
        <span>Copiar link</span>
      </button>
    </div>

    <div class="gold-rule"></div>

    <div class="row bottom">
      <div class="task">
        <span class="kicker">Estimando</span>
        <button
          v-if="isModerator && !editing"
          type="button"
          @click="editing = true"
          class="task-text editable"
        >
          <span>{{ taskTitle || 'Defina o que estamos estimando' }}</span>
          <span class="pencil" aria-hidden="true">✎</span>
        </button>
        <span v-else-if="!editing" class="task-text">{{ taskTitle || '—' }}</span>
        <input
          v-else
          v-model="draft"
          @keydown.enter="commit"
          @keydown.escape="editing = false"
          @blur="commit"
          autofocus
          class="task-input"
          maxlength="80"
        />
      </div>

      <div class="status" :class="{ revealed }">
        <span class="status-dot" :class="{ live: !revealed }" aria-hidden="true"></span>
        <span class="status-text">{{ status }}</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.room-header {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}
.row.bottom { align-items: center; }

.meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }

.room-name {
  font-family: var(--font-display);
  font-variation-settings: "opsz" 144, "SOFT" 30, "wght" 500;
  font-size: clamp(1.6rem, 3.2vw, 2.4rem);
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--color-ink);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--color-ink);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--color-ink) 22%, transparent);
  cursor: pointer;
  transition: background 180ms ease, border-color 180ms ease, transform 180ms ease;
}
.link-btn:hover {
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  border-color: color-mix(in srgb, var(--color-accent) 70%, transparent);
}
.link-btn .dot {
  font-family: var(--font-body);
  font-size: 0.95rem;
  color: var(--color-accent);
}

.task {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.task-text {
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 14, "SOFT" 80, "wght" 400;
  font-size: 1.05rem;
  color: var(--color-ink);
  text-align: left;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: default;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.task-text.editable {
  cursor: text;
}
.task-text.editable:hover .pencil {
  opacity: 1;
  transform: translateX(0);
}
.pencil {
  font-size: 0.85rem;
  color: var(--color-accent);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 180ms ease, transform 180ms ease;
}

.task-input {
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 14, "SOFT" 80, "wght" 400;
  font-size: 1.05rem;
  color: var(--color-ink);
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-accent) 50%, transparent);
  border-radius: 6px;
  padding: 4px 8px;
  outline: none;
}
.task-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent);
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
  color: color-mix(in srgb, var(--color-ink) 70%, transparent);
  white-space: nowrap;
}
.status.revealed { color: var(--color-claret); }

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-ink) 35%, transparent);
}
.status-dot.live {
  background: var(--color-accent);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-accent) 70%, transparent);
  animation: pulse-dot 2s infinite;
}
.status.revealed .status-dot {
  background: var(--color-claret);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-claret) 70%, transparent);
  animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-accent) 60%, transparent); }
  70%  { box-shadow: 0 0 0 7px color-mix(in srgb, var(--color-accent) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-accent) 0%, transparent); }
}

@media (max-width: 640px) {
  .row.bottom {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
