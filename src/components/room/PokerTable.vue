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

const props = defineProps<{ seats: Seat[]; revealed: boolean; canKick?: boolean }>()
const emit = defineEmits<{ kick: [uid: string] }>()

const positions = computed(() => {
  const n = props.seats.length || 1
  const stepDeg = 360 / n
  return props.seats.map((s, i) => {
    const angle = -90 + i * stepDeg
    return { ...s, angle }
  })
})
</script>

<template>
  <div class="relative w-full mx-auto" style="aspect-ratio: 16 / 9; max-width: 720px;">
    <div
      class="hidden md:block absolute"
      style="top: 50%; left: 50%; transform: translate(-50%,-50%); width: 50%; height: 50%; background: color-mix(in srgb, var(--color-brand) 8%, transparent); border-radius: 50%; border: 1px dashed color-mix(in srgb, var(--color-ink) 18%, transparent);"
    />

    <div class="hidden md:block">
      <div
        v-for="seat in positions"
        :key="seat.uid"
        class="absolute"
        :style="{
          top: `calc(50% + sin(${seat.angle}deg) * 38%)`,
          left: `calc(50% + cos(${seat.angle}deg) * 42%)`,
          transform: 'translate(-50%, -50%)',
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
          @kick="(uid: string) => emit('kick', uid)"
        />
      </div>
      <slot name="center" />
    </div>

    <div class="md:hidden flex flex-wrap justify-center gap-4 pt-4">
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
        @kick="(uid: string) => emit('kick', uid)"
      />
      <div class="w-full flex justify-center mt-4">
        <slot name="center" />
      </div>
    </div>
  </div>
</template>
