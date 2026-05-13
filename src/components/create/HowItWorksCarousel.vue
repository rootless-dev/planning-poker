<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface Scene {
  titleKey: string
  descKey: string
}

const { t } = useI18n()

const SCENES: Scene[] = [
  { titleKey: 'create.howItWorks.scenes.s1.title', descKey: 'create.howItWorks.scenes.s1.description' },
  { titleKey: 'create.howItWorks.scenes.s2.title', descKey: 'create.howItWorks.scenes.s2.description' },
  { titleKey: 'create.howItWorks.scenes.s3.title', descKey: 'create.howItWorks.scenes.s3.description' },
  { titleKey: 'create.howItWorks.scenes.s4.title', descKey: 'create.howItWorks.scenes.s4.description' },
]

const INTERVAL_MS = 5000
const activeIndex = ref(0)
const timerId = ref<ReturnType<typeof setTimeout> | null>(null)
const paused = ref(false)

const reducedMotion = ref(false)
const mediaQuery = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null
if (mediaQuery) reducedMotion.value = mediaQuery.matches

function onReducedMotionChange(e: MediaQueryListEvent) {
  reducedMotion.value = e.matches
}

function clearTimer() {
  if (timerId.value !== null) {
    clearTimeout(timerId.value)
    timerId.value = null
  }
}

function scheduleNext() {
  clearTimer()
  if (reducedMotion.value || paused.value) return
  timerId.value = setTimeout(() => {
    activeIndex.value = (activeIndex.value + 1) % SCENES.length
    scheduleNext()
  }, INTERVAL_MS)
}

function goTo(index: number) {
  activeIndex.value = index
  scheduleNext()
}

function onPointerEnter() { paused.value = true;  clearTimer() }
function onPointerLeave() { paused.value = false; scheduleNext() }
function onFocusIn()      { paused.value = true;  clearTimer() }
function onFocusOut()     { paused.value = false; scheduleNext() }

watch(reducedMotion, (rm) => { if (rm) clearTimer() })

onMounted(() => {
  mediaQuery?.addEventListener('change', onReducedMotionChange)
  scheduleNext()
})
onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', onReducedMotionChange)
  clearTimer()
})

const liveText = computed(() => `${t(SCENES[activeIndex.value].titleKey)}. ${t(SCENES[activeIndex.value].descKey)}`)
</script>

<template>
  <section
    class="carousel"
    role="region"
    aria-roledescription="carousel"
    :aria-label="t('create.howItWorks.ariaLabel')"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <div class="scenes">
      <div
        v-for="(scene, i) in SCENES"
        :key="i"
        class="scene"
        role="group"
        aria-roledescription="slide"
        :aria-label="t('create.howItWorks.slideAriaLabel', { index: i + 1, total: SCENES.length })"
        :aria-hidden="i !== activeIndex ? 'true' : 'false'"
      >
        <p class="kicker">{{ t('create.howItWorks.step', { index: i + 1, total: SCENES.length }) }}</p>
        <h2 class="scene-title">{{ t(scene.titleKey) }}</h2>
        <p class="scene-desc">{{ t(scene.descKey) }}</p>
        <div class="scene-art" aria-hidden="true">
          <div class="card t1">{{ ['3', '5', '8', '13'][i] }}</div>
          <div class="card mid">{{ ['5', '8', '13', '20'][i] }}</div>
          <div class="card t3">{{ ['8', '13', '20', '40'][i] }}</div>
        </div>
      </div>
    </div>

    <div class="sr-only" aria-live="polite" aria-atomic="true">{{ liveText }}</div>

    <div class="dots" role="tablist">
      <button
        v-for="(_, i) in SCENES"
        :key="i"
        type="button"
        class="dot"
        :class="{ active: i === activeIndex }"
        :aria-label="t('create.howItWorks.goToStep', { index: i + 1 })"
        :aria-current="i === activeIndex ? 'step' : undefined"
        @click="goTo(i)"
      />
    </div>
  </section>
</template>

<style scoped>
.carousel {
  position: relative;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--color-accent) 14%, var(--color-canvas)),
    color-mix(in srgb, var(--color-brand) 12%, var(--color-canvas)));
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--color-accent) 24%, transparent);
  padding: 32px 28px 24px;
  overflow: hidden;
  min-height: 380px;
}
.scenes {
  display: grid;
  grid-template-columns: 1fr;
  min-height: 280px;
}
.scene {
  grid-area: 1 / 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity 380ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 380ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  will-change: opacity, transform;
}
.scene[aria-hidden="false"] {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.scene-title {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 2.5vw, 2.2rem);
  line-height: 1.1;
  color: var(--color-ink);
  margin: 0;
}
.scene-desc {
  color: var(--color-muted);
  font-size: 0.95rem;
  margin: 0 0 8px;
  max-width: 44ch;
}
.scene-art {
  margin-top: 18px;
  display: flex;
  gap: 12px;
  justify-content: flex-start;
  align-items: flex-end;
}
.card {
  width: 56px; height: 80px;
  border-radius: 10px;
  background: linear-gradient(180deg, var(--color-paper-soft), var(--color-paper-deep));
  color: var(--color-felt-deep);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display); font-weight: 700; font-size: 1.2rem;
  box-shadow: 0 4px 12px rgb(var(--color-shadow) / 0.35), inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 45%, transparent);
  transform: translateY(14px) rotate(0);
  transition:
    transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 320ms ease;
  will-change: transform;
}
.scene[aria-hidden="false"] .card.t1  { transform: translateY(0) rotate(-6deg); transition-delay: 80ms; }
.scene[aria-hidden="false"] .card.mid { transform: translateY(-4px) rotate(0);   transition-delay: 160ms; }
.scene[aria-hidden="false"] .card.t3  { transform: translateY(0) rotate(6deg);  transition-delay: 240ms; }

.dots { display: flex; gap: 8px; justify-content: center; margin-top: 18px; }
.dot {
  width: 8px; height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-ink) 18%, transparent);
  border: 0;
  padding: 0;
  cursor: pointer;
  transition: background 180ms ease, width 180ms ease;
}
.dot.active { background: var(--color-accent); width: 24px; }
.dot:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; }

.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .scene,
  .card { transition: none; }
  .scene { transform: none; }
}
</style>
