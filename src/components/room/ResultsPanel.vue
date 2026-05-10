<script setup lang="ts">
import { computed } from 'vue'
import { computeStats } from '@/lib/stats'

interface SeatVote { uid: string; name: string; vote: string | null }
const props = defineProps<{ seats: SeatVote[] }>()

const votes = computed(() => props.seats.map(s => s.vote).filter((v): v is string => v !== null))
const stats = computed(() => computeStats(votes.value))
</script>

<template>
  <section
    class="rounded-3xl p-5 flex flex-col gap-4"
    style="background: var(--color-surface); box-shadow: 0 8px 28px rgba(91,58,138,.14);"
    aria-live="polite"
  >
    <div class="flex flex-wrap gap-2">
      <span class="px-3 py-1 rounded-full text-sm" style="background: color-mix(in srgb, var(--color-brand) 14%, transparent); color: var(--color-ink);">
        Média: <strong>{{ stats.average ?? '—' }}</strong>
      </span>
      <span class="px-3 py-1 rounded-full text-sm" style="background: color-mix(in srgb, var(--color-accent) 18%, transparent); color: var(--color-ink);">
        Moda: <strong>{{ stats.mode ?? '—' }}</strong>
      </span>
      <span class="px-3 py-1 rounded-full text-sm" style="background: color-mix(in srgb, var(--color-cool) 60%, transparent); color: var(--color-ink);">
        Mín: <strong>{{ stats.min ?? '—' }}</strong>
      </span>
      <span class="px-3 py-1 rounded-full text-sm" style="background: color-mix(in srgb, var(--color-warm) 60%, transparent); color: var(--color-ink);">
        Máx: <strong>{{ stats.max ?? '—' }}</strong>
      </span>
      <span v-if="stats.divergent" class="px-3 py-1 rounded-full text-sm" style="background: var(--color-sand); color: var(--color-ink);">
        ⚠️ vale conversar
      </span>
    </div>
    <ul class="text-sm flex flex-col gap-1">
      <li v-for="s in seats" :key="s.uid" class="flex items-center justify-between">
        <span style="color: var(--color-ink);">{{ s.name }}</span>
        <span style="color: var(--color-muted);">{{ s.vote ?? '—' }}</span>
      </li>
    </ul>
  </section>
</template>
