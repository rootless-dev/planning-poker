<script setup lang="ts">
import { computed } from 'vue'
import { computeStats } from '@/lib/stats'

interface SeatVote { uid: string; name: string; vote: string | null }
const props = defineProps<{ seats: SeatVote[]; embedded?: boolean }>()

const votes = computed(() => props.seats.map(s => s.vote).filter((v): v is string => v !== null))
const stats = computed(() => computeStats(votes.value))

const tally = computed(() => {
  const map = new Map<string, number>()
  for (const v of votes.value) map.set(v, (map.get(v) ?? 0) + 1)
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
})

const totalVotes = computed(() => votes.value.length)
</script>

<template>
  <section class="results paper-grain" :class="{ embedded }" aria-live="polite">
    <header v-if="!embedded" class="results-head">
      <span class="kicker">Veredicto</span>
      <h2 class="results-title">A mesa fala</h2>
      <div class="gold-rule"></div>
    </header>

    <div class="stats-grid">
      <div class="stat primary">
        <span class="kicker">Média</span>
        <span class="numeral big num-tabular">{{ stats.average ?? '—' }}</span>
      </div>
      <div class="stat">
        <span class="kicker">Moda</span>
        <span class="numeral mid num-tabular">{{ stats.mode ?? '—' }}</span>
      </div>
      <div class="stat">
        <span class="kicker">Mín</span>
        <span class="numeral mid num-tabular">{{ stats.min ?? '—' }}</span>
      </div>
      <div class="stat">
        <span class="kicker">Máx</span>
        <span class="numeral mid num-tabular">{{ stats.max ?? '—' }}</span>
      </div>
    </div>

    <div v-if="stats.divergent" class="divergence">
      <span class="badge">⚠ Divergência</span>
      <span class="divergence-text">Vale uma conversa antes de fechar a estimativa.</span>
    </div>

    <div v-if="tally.length" class="tally-section">
      <span class="kicker">Distribuição</span>
      <ul class="tally-list">
        <li v-for="t in tally" :key="t.value" class="tally-row">
          <span class="numeral mid num-tabular value">{{ t.value }}</span>
          <span class="bar-track" aria-hidden="true">
            <span class="bar-fill" :style="{ width: (t.count / totalVotes * 100) + '%' }"></span>
          </span>
          <span class="count num-tabular">×{{ t.count }}</span>
        </li>
      </ul>
    </div>

    <div class="voters">
      <span class="kicker">Mesa</span>
      <ul class="voters-list">
        <li v-for="s in seats" :key="s.uid" class="voter-row">
          <span class="voter-name">{{ s.name }}</span>
          <span class="voter-dots" aria-hidden="true"></span>
          <span class="voter-vote numeral num-tabular" :class="{ 'no-vote': !s.vote }">
            {{ s.vote ?? '—' }}
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.results {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 28px 28px 24px;
  border-radius: 16px;
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-ink) 10%, transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 18%, transparent),
    0 22px 50px -20px rgb(var(--color-shadow) / 0.35);
  overflow: hidden;
}
.results.embedded {
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
}
.results.embedded::after { display: none; }

.results-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.results-title {
  font-family: var(--font-display);
  font-variation-settings: "opsz" 144, "SOFT" 50, "wght" 400;
  font-style: italic;
  font-size: clamp(1.4rem, 2.6vw, 1.9rem);
  margin: 0 0 6px;
  letter-spacing: -0.015em;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 1fr;
  gap: 14px;
  align-items: end;
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 6px;
  border-top: 1px solid color-mix(in srgb, var(--color-ink) 14%, transparent);
}
.stat.primary {
  border-top-color: color-mix(in srgb, var(--color-accent) 70%, transparent);
}
.stat .big {
  font-size: clamp(2.4rem, 6vw, 3.6rem);
  font-variation-settings: "opsz" 144, "SOFT" 0, "wght" 400;
  color: var(--color-ink);
}
.stat .mid {
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-variation-settings: "opsz" 144, "SOFT" 0, "wght" 400;
  color: color-mix(in srgb, var(--color-ink) 80%, transparent);
}

.divergence {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-claret) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-claret) 35%, transparent);
}
.badge {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--color-claret);
  color: var(--color-paper-soft);
}
.divergence-text {
  font-size: 0.92rem;
  color: color-mix(in srgb, var(--color-ink) 80%, transparent);
}

.tally-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tally-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tally-row {
  display: grid;
  grid-template-columns: 36px 1fr 40px;
  align-items: center;
  gap: 12px;
}
.tally-row .value {
  font-size: 1.05rem;
  font-variation-settings: "opsz" 144, "SOFT" 0, "wght" 500;
}
.bar-track {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-ink) 8%, transparent);
  overflow: hidden;
}
.bar-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--color-gold-soft), var(--color-gold));
  border-radius: inherit;
  transition: width 420ms cubic-bezier(.2,.7,.2,1);
}
.count {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: color-mix(in srgb, var(--color-ink) 65%, transparent);
  text-align: right;
}

.voters {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.voters-list {
  display: flex;
  flex-direction: column;
}
.voter-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: baseline;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px dotted color-mix(in srgb, var(--color-ink) 16%, transparent);
}
.voter-row:last-child { border-bottom: 0; }
.voter-name {
  font-family: var(--font-body);
  font-size: 0.92rem;
  color: var(--color-ink);
}
.voter-dots {
  height: 1px;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--color-ink) 22%, transparent) 50%,
    transparent 50%);
  background-size: 6px 1px;
  align-self: center;
}
.voter-vote {
  font-size: 1.1rem;
  font-variation-settings: "opsz" 144, "SOFT" 0, "wght" 500;
  color: var(--color-ink);
}
.voter-vote.no-vote { color: color-mix(in srgb, var(--color-ink) 35%, transparent); }

@media (max-width: 640px) {
  .results { padding: 22px 18px; }
  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }
  .stat.primary {
    grid-column: span 2;
  }
}
</style>
