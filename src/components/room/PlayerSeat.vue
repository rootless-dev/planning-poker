<script setup lang="ts">
import { ref, computed } from 'vue'
import PlayingCard from './PlayingCard.vue'
import EmojiBubble from './EmojiBubble.vue'
import LottiePlayer from './LottiePlayer.vue'
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
  cardSize?: 'xs' | 'sm' | 'md' | 'lg'
  activeEmoji?: { value: string; key: number } | null
  isThinking?: boolean
  thinkingLottie?: object | null
}>()
const emit = defineEmits<{
  kick: [uid: string]
  'open-emoji-panel': []
  'emoji-bubble-done': [uid: string]
}>()

const showMenu = ref(false)

function onTriggerClick() {
  if (props.isSelf || props.canKick) {
    showMenu.value = !showMenu.value
  }
}

function chooseReact() {
  showMenu.value = false
  emit('open-emoji-panel')
}

function confirmKick() {
  if (confirm(`Remover ${props.name} da sala?`)) emit('kick', props.uid)
  showMenu.value = false
}

const initial = computed(() => props.name.slice(0, 1).toUpperCase())
const showTrigger = computed(() => props.isSelf || (props.canKick && !props.isSelf))

const lottieSize = computed(() => {
  switch (props.cardSize ?? 'sm') {
    case 'xs': return 20
    case 'sm': return 26
    case 'md': return 32
    case 'lg': return 40
  }
})
</script>

<template>
  <div
    class="seat"
    :class="[
      `size-${cardSize ?? 'sm'}`,
      { absent: presence === 'absent', self: isSelf },
    ]"
  >
    <PlayingCard
      v-if="vote === null"
      state="idle"
      :size="cardSize ?? 'sm'"
      value=""
      class="card-empty"
    />
    <PlayingCard v-else-if="!revealed" state="back" :size="cardSize ?? 'sm'" />
    <PlayingCard v-else state="revealed" :size="cardSize ?? 'sm'" :value="vote" />

    <div class="avatar numeral">
      <span v-if="isThinking" class="thinking-emoji" aria-label="pensando">
        <LottiePlayer v-if="thinkingLottie" :animation="thinkingLottie" :size="lottieSize" />
        <span v-else>🤔</span>
      </span>
      <span v-else>{{ initial }}</span>
      <span v-if="isModerator" class="crown" aria-hidden="true">♛</span>
    </div>

    <div class="name-line">
      <span class="name">{{ name }}</span>
      <EmojiBubble
        v-if="activeEmoji"
        :key="activeEmoji.key"
        :value="activeEmoji.value"
        @done="emit('emoji-bubble-done', uid)"
      />
    </div>

    <button
      v-if="showTrigger"
      type="button"
      @click="onTriggerClick"
      class="kick-trigger"
      aria-label="Opções"
    >⋯</button>
    <div v-if="showMenu" class="kick-menu">
      <button v-if="isSelf" type="button" @click="chooseReact">Reagir</button>
      <button v-else-if="canKick" type="button" @click="confirmKick">Remover</button>
    </div>
  </div>
</template>

<style scoped>
.seat {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 78px;
  transition: opacity 220ms ease, width 220ms cubic-bezier(.2,.7,.2,1);
}
.seat.size-xs { width: 64px; gap: 4px; }
.seat.size-sm { width: 78px; gap: 6px; }
.seat.size-md { width: 96px; gap: 8px; }
.seat.size-lg { width: 120px; gap: 10px; }
.seat.absent { opacity: 0.45; }
.seat.self .avatar {
  outline: 2px solid color-mix(in srgb, var(--color-accent) 80%, transparent);
  outline-offset: 2px;
}

.card-empty {
  opacity: 0.45;
  border-style: dashed !important;
  animation: idle-pulse 2.4s ease-in-out infinite;
}

.avatar {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-variation-settings: "opsz" 144, "SOFT" 30, "wght" 500;
  font-size: 0.95rem;
  color: var(--color-paper-soft);
  transition: width 220ms cubic-bezier(.2,.7,.2,1), height 220ms cubic-bezier(.2,.7,.2,1);
  background:
    radial-gradient(circle at 30% 25%,
      color-mix(in srgb, var(--color-gold-soft) 65%, transparent) 0%,
      var(--color-gold) 55%,
      var(--color-gold-deep) 100%);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, white 40%, transparent),
    inset 0 -1px 0 color-mix(in srgb, black 25%, transparent),
    0 4px 10px -4px rgb(var(--color-shadow) / 0.55);
}
.avatar > span:first-child {
  text-shadow: 0 1px 0 color-mix(in srgb, black 25%, transparent);
}
.size-xs .avatar { width: 28px; height: 28px; font-size: 0.78rem; }
.size-sm .avatar { width: 36px; height: 36px; font-size: 0.95rem; }
.size-md .avatar { width: 44px; height: 44px; font-size: 1.15rem; }
.size-lg .avatar { width: 56px; height: 56px; font-size: 1.45rem; }
.crown {
  position: absolute;
  top: -10px;
  right: -8px;
  font-size: 0.78rem;
  color: var(--color-gold-soft);
  text-shadow: 0 1px 1px rgb(var(--color-shadow) / 0.7);
  transform: rotate(12deg);
}

.name-line {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
}
.name {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-paper-soft);
  text-shadow: 0 1px 2px rgb(var(--color-shadow) / 0.7);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.size-xs .name { font-size: 0.6rem; letter-spacing: 0.04em; }
.size-md .name { font-size: 0.74rem; }
.size-lg .name { font-size: 0.82rem; letter-spacing: 0.08em; }

/* Mobile (fora do feltro): texto fica em ink */
@media (max-width: 768px) {
  .name { color: var(--color-paper-soft); }
}

.kick-trigger {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 0.85rem;
  line-height: 1;
  background: color-mix(in srgb, var(--color-felt-deep) 80%, transparent);
  color: var(--color-paper-soft);
  border: 1px solid color-mix(in srgb, var(--color-gold) 40%, transparent);
  cursor: pointer;
  transition: transform 160ms ease, background 160ms ease;
}
.kick-trigger:hover { transform: scale(1.1); }

.kick-menu {
  position: absolute;
  top: 22px;
  right: -4px;
  z-index: 10;
  background: var(--color-surface);
  color: var(--color-ink);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent);
  box-shadow: 0 16px 32px -10px rgb(var(--color-shadow) / 0.5);
}
.kick-menu button {
  font-family: var(--font-body);
  font-size: 0.78rem;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}
.kick-menu button:hover {
  background: color-mix(in srgb, var(--color-claret) 12%, transparent);
}

@keyframes idle-pulse {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 0.6; }
}

.thinking-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05em;
  line-height: 1;
  animation: thinking-fade 150ms ease-out;
}
@keyframes thinking-fade {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}
</style>
