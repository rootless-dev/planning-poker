<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{ animation: object; size?: number }>()
const root = ref<HTMLDivElement | null>(null)
let anim: { destroy: () => void } | null = null
let destroyed = false

onMounted(async () => {
  if (!root.value) return
  const { default: lottie } = await import('lottie-web')
  if (destroyed || !root.value) return
  anim = lottie.loadAnimation({
    container: root.value,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData: props.animation,
  })
})

onUnmounted(() => {
  destroyed = true
  anim?.destroy()
})
</script>

<template>
  <div ref="root" class="lottie" :style="{ width: (size ?? 40) + 'px', height: (size ?? 40) + 'px' }" />
</template>

<style scoped>
.lottie { display: inline-block; }
.lottie :deep(svg) { display: block; }
</style>
