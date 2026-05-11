<script setup lang="ts">
import { computed } from 'vue'
import PlayerSeat from './PlayerSeat.vue'
import type { PresenceState } from '@/types/room'

interface Seat {
  uid: string
  name: string
  vote: string | null
  presence: PresenceState
  isModerator: boolean
  isSelf: boolean
}

const props = defineProps<{
  seats: Seat[]
  revealed: boolean
  canKick?: boolean
  activeBubble?: Record<string, { value: string; key: number } | undefined>
}>()
const emit = defineEmits<{
  kick: [uid: string]
  'open-emoji-panel': []
  'emoji-bubble-done': [uid: string]
}>()

const positions = computed(() => {
  const n = props.seats.length || 1
  const stepDeg = 360 / n
  return props.seats.map((s, i) => {
    const angle = -90 + i * stepDeg
    return { ...s, angle }
  })
})

const cardSize = computed<'xs' | 'sm' | 'md' | 'lg'>(() => {
  const n = props.seats.length
  if (n <= 4) return 'md'
  if (n <= 8) return 'sm'
  return 'xs'
})
</script>

<template>
  <div class="table-wrap">
    <!-- Mesa (somente desktop) -->
    <div class="table-frame felt-surface hidden md:block">
      <!-- Pista interna oval -->
      <div class="inner-rail" aria-hidden="true"></div>

      <!-- Seats em volta -->
      <div
        v-for="seat in positions"
        :key="seat.uid"
        class="seat-anchor"
        :style="{
          top:  `calc(50% + sin(${seat.angle}deg) * 32%)`,
          left: `calc(50% + cos(${seat.angle}deg) * 42%)`,
        }"
      >
        <PlayerSeat
          :uid="seat.uid"
          :name="seat.name"
          :vote="seat.vote"
          :presence="seat.presence"
          :is-moderator="seat.isModerator"
          :is-self="seat.isSelf"
          :revealed="revealed"
          :can-kick="canKick"
          :card-size="cardSize"
          :active-emoji="activeBubble?.[seat.uid] ?? null"
          @kick="(uid: string) => emit('kick', uid)"
          @open-emoji-panel="emit('open-emoji-panel')"
          @emoji-bubble-done="(uid: string) => emit('emoji-bubble-done', uid)"
        />
      </div>

      <div class="center-anchor">
        <slot name="center" />
      </div>
    </div>

    <!-- Mobile: lista compacta + center embaixo -->
    <div class="md:hidden">
      <div class="mobile-felt felt-surface">
        <div class="mobile-grid">
          <PlayerSeat
            v-for="seat in seats"
            :key="seat.uid"
            :uid="seat.uid"
            :name="seat.name"
            :vote="seat.vote"
            :presence="seat.presence"
            :is-moderator="seat.isModerator"
            :is-self="seat.isSelf"
            :revealed="revealed"
            :can-kick="canKick"
            :card-size="cardSize"
            :active-emoji="activeBubble?.[seat.uid] ?? null"
            @kick="(uid: string) => emit('kick', uid)"
            @open-emoji-panel="emit('open-emoji-panel')"
            @emoji-bubble-done="(uid: string) => emit('emoji-bubble-done', uid)"
          />
        </div>
        <div class="mobile-center">
          <slot name="center" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-wrap {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
}

.table-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 50% / 36%;
  isolation: isolate;
}

.inner-rail {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 56%;
  height: 56%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px dashed color-mix(in srgb, var(--color-gold-soft) 45%, transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-felt-deep) 50%, transparent);
  pointer-events: none;
}

.seat-anchor {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.center-anchor {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
}

/* — Mobile — */
.mobile-felt {
  position: relative;
  border-radius: 28px;
  padding: 22px 16px 18px;
  isolation: isolate;
}
.mobile-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: center;
  position: relative;
  z-index: 2;
}
.mobile-center {
  position: relative;
  z-index: 2;
  margin-top: 18px;
  display: flex;
  justify-content: center;
}
</style>
