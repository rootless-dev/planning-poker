<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToasts } from '@/composables/useToasts'
import Modal from '@/components/ui/Modal.vue'
import GhostButton from '@/components/ui/GhostButton.vue'

const props = defineProps<{
  roomName: string
  taskTitle: string
  isModerator: boolean
  totalActive: number
  votedCount: number
  revealed: boolean
}>()
const emit = defineEmits<{ rename: [title: string] }>()

const { t } = useI18n()
const editing = ref(false)
const draft = ref(props.taskTitle)
watch(() => props.taskTitle, v => { if (!editing.value) draft.value = v })

function commit() {
  editing.value = false
  if (draft.value.trim() !== props.taskTitle) emit('rename', draft.value.trim())
}

const toasts = useToasts()
const route = useRoute()
const showShare = ref(false)

const sessionId = computed(() => String(route.params.id ?? ''))
const fullLink = computed(() => (typeof window !== 'undefined' ? window.location.href : ''))

async function writeToClipboard(value: string, successMsg: string) {
  try {
    await navigator.clipboard.writeText(value)
    toasts.push(successMsg, 'success')
  } catch {
    toasts.push(t('room.copyError'), 'error')
  }
}

function copyFullLink() {
  void writeToClipboard(fullLink.value, t('room.copyLinkSuccess'))
}

function copySessionId() {
  void writeToClipboard(sessionId.value, t('room.copyIdSuccess'))
}

const status = computed(() => {
  if (props.revealed) return t('room.statusRevealed')
  if (props.totalActive === 0) return t('room.statusNoPlayers')
  return t('room.statusVoting', { voted: props.votedCount, total: props.totalActive })
})
</script>

<template>
  <header class="room-header">
    <div class="row top">
      <div class="meta">
        <span class="kicker">{{ t('room.session') }} · {{ t('room.players', totalActive, { named: { n: totalActive } }) }}</span>
        <h1 class="room-name">{{ roomName }}</h1>
      </div>
      <button type="button" @click="showShare = true" class="link-btn">
        <span class="dot" aria-hidden="true">↗</span>
        <span>{{ t('room.copyLink') }}</span>
      </button>
    </div>

    <Modal :open="showShare" :kicker="t('room.share')" :title="t('room.shareTitle')" size="sm" @close="showShare = false">
      <div class="share-stack">
        <div class="share-row">
          <span class="share-label kicker">{{ t('room.fullLink') }}</span>
          <code class="share-value">{{ fullLink }}</code>
          <GhostButton @click="copyFullLink">{{ t('room.copy') }}</GhostButton>
        </div>
        <div class="share-row">
          <span class="share-label kicker">{{ t('room.sessionId') }}</span>
          <code class="share-value">{{ sessionId }}</code>
          <GhostButton @click="copySessionId">{{ t('room.copy') }}</GhostButton>
        </div>
      </div>
    </Modal>

    <div class="gold-rule"></div>

    <div class="row bottom">
      <div class="task">
        <span class="kicker">{{ t('room.estimating') }}</span>
        <button
          v-if="isModerator && !editing"
          type="button"
          @click="editing = true"
          class="task-text editable"
        >
          <span>{{ taskTitle || t('room.estimatingEmpty') }}</span>
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

.share-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.share-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px 12px;
}
.share-label {
  grid-column: 1 / -1;
}
.share-value {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-ink) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-ink) 12%, transparent);
  color: var(--color-ink);
  word-break: break-all;
  overflow-wrap: anywhere;
  min-width: 0;
}

@media (max-width: 640px) {
  .row.bottom {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
