<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { tryLoadLottie } from '@/lib/notoEmoji'
import LottiePlayer from './LottiePlayer.vue'

const props = defineProps<{ value: string }>()
const emit = defineEmits<{ done: [] }>()

const phase = ref<'in' | 'hold' | 'out'>('in')
const lottieData = ref<object | null>(null)
const timers: number[] = []

onMounted(() => {
  tryLoadLottie(props.value).then((data) => { if (data) lottieData.value = data })
  timers.push(window.setTimeout(() => (phase.value = 'hold'), 350))
  timers.push(window.setTimeout(() => (phase.value = 'out'), 350 + 1600))
  timers.push(window.setTimeout(() => emit('done'), 350 + 1600 + 280))
})

onUnmounted(() => { for (const t of timers) clearTimeout(t) })
</script>

<template>
  <div class="bubble" :class="phase" role="status" aria-live="polite">
    <LottiePlayer v-if="lottieData" :animation="lottieData" :size="32" />
    <span v-else class="content">{{ value }}</span>
    <span class="tail" aria-hidden="true" />
  </div>
</template>

<style scoped>
.bubble {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform-origin: 50% 100%;
  padding: 6px 10px;
  border-radius: 14px;
  background: var(--color-surface);
  color: var(--color-ink);
  border: 1px solid color-mix(in srgb, var(--color-ink) 18%, transparent);
  box-shadow: 0 12px 22px -8px rgb(var(--color-shadow) / 0.55);
  font-size: 1.4rem;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
  z-index: 4;
}
.bubble.in     { animation: bubble-in 350ms cubic-bezier(.2,.7,.2,1) forwards; }
.bubble.hold   { transform: translate(-50%, 0) scale(1); opacity: 1; }
.bubble.out    { animation: bubble-out 280ms ease-in forwards; }
.content { display: inline-block; }
.tail {
  position: absolute;
  top: 100%;
  left: 50%;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid var(--color-surface);
  transform: translateX(-50%);
}
@keyframes bubble-in {
  0%   { transform: translate(-50%, 4px) scale(0); opacity: 0; }
  60%  { transform: translate(-50%, 0) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
}
@keyframes bubble-out {
  0%   { transform: translate(-50%, 0) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -8px) scale(0.9); opacity: 0; }
}
</style>
