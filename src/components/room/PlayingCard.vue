<script setup lang="ts">
const props = defineProps<{
  value?: string | null
  state: 'idle' | 'selected' | 'back' | 'revealed'
  size?: 'sm' | 'md' | 'lg'
}>()

const sizeClass: Record<NonNullable<typeof props.size> | 'md', string> = {
  sm: 'w-9 h-12 text-sm',
  md: 'w-14 h-20 text-base',
  lg: 'w-20 h-28 text-2xl',
}

const dim = sizeClass[props.size ?? 'md']
</script>

<template>
  <div
    class="rounded-xl flex items-center justify-center font-extrabold transition-transform select-none"
    :class="[
      dim,
      state === 'selected' ? '-translate-y-3 ring-2 ring-offset-2' : '',
      state === 'idle' ? 'bg-white text-[var(--color-ink)] border border-[color-mix(in_srgb,var(--color-ink)_15%,transparent)] shadow-md' : '',
      state === 'selected' ? 'shadow-xl' : '',
    ]"
    :style="state === 'selected'
      ? 'background: linear-gradient(135deg,var(--color-warm),var(--color-cool)); color: var(--color-ink); --tw-ring-color: var(--color-brand);'
      : state === 'back'
      ? 'background: linear-gradient(135deg,var(--color-warm),var(--color-cool));'
      : state === 'revealed'
      ? 'background: var(--color-surface); color: var(--color-ink); border: 1px solid color-mix(in srgb, var(--color-ink) 15%, transparent); box-shadow: 0 4px 14px rgba(91,58,138,.18);'
      : ''"
    :aria-label="state === 'back' ? 'carta virada' : value ?? 'carta vazia'"
  >
    <span v-if="state === 'revealed' || state === 'idle' || state === 'selected'">{{ value }}</span>
  </div>
</template>
