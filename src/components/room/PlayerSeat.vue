<script setup lang="ts">
import { ref, computed } from 'vue'
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

const initial = computed(() => props.name.slice(0, 1).toUpperCase())
</script>

<template>
  <div class="seat" :class="{ absent: presence === 'absent', self: isSelf }">
    <PlayingCard
      v-if="vote === null"
      state="idle"
      size="sm"
      value=""
      class="card-empty"
    />
    <PlayingCard v-else-if="!revealed" state="back" size="sm" />
    <PlayingCard v-else state="revealed" size="sm" :value="vote" />

    <div class="avatar numeral">
      <span>{{ initial }}</span>
      <span v-if="isModerator" class="crown" aria-hidden="true">♛</span>
    </div>

    <div class="name-line">
      <span class="name">{{ name }}</span>
    </div>

    <button
      v-if="canKick && !isSelf"
      type="button"
      @click="showMenu = !showMenu"
      class="kick-trigger"
      aria-label="Opções"
    >⋯</button>
    <div v-if="showMenu" class="kick-menu">
      <button type="button" @click="confirmKick">Remover</button>
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
  transition: opacity 220ms ease;
}
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
  max-width: 78px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

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
</style>
