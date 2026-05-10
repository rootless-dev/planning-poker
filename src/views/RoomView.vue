<script setup lang="ts">
import { ref, watch, onBeforeUnmount, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRoom } from '@/composables/useRoom'
import { useAuth } from '@/composables/useAuth'
import { usePresence } from '@/composables/usePresence'
import { useToasts } from '@/composables/useToasts'
import { joinRoom, setVote, revealRound, startNewRound, renameTask, kickParticipant } from '@/services/firebase/rooms'
import RoomHeader from '@/components/room/RoomHeader.vue'
import JoinNameModal from '@/components/room/JoinNameModal.vue'
import PokerTable from '@/components/room/PokerTable.vue'
import Hand from '@/components/room/Hand.vue'
import TableCenter from '@/components/room/TableCenter.vue'
import ResultsPanel from '@/components/room/ResultsPanel.vue'
import Modal from '@/components/ui/Modal.vue'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'
import GhostButton from '@/components/ui/GhostButton.vue'

const props = defineProps<{ id: string }>()
const router = useRouter()
const room = useRoom()
const { uid } = useAuth()
const toasts = useToasts()

room.watch(props.id)
onBeforeUnmount(room.dispose)

const showJoin = computed(() => !room.loading.value && !room.notFound.value && !room.inRoom.value)
usePresence(props.id, uid, computed(() => room.inRoom.value))

const showResults = ref(false)
watch(
  () => room.room.value?.round.revealed ?? false,
  (revealed) => { showResults.value = revealed },
)

const wasInRoom = ref(false)
watch(() => room.inRoom.value, (now) => {
  if (wasInRoom.value && !now && !room.notFound.value) {
    toasts.push('Você foi removido da sala', 'error')
    router.push({ name: 'home' })
  }
  wasInRoom.value = now
})

async function onJoin(name: string) {
  if (!uid.value) return
  try {
    await joinRoom(props.id, uid.value, name)
  } catch (err) {
    toasts.push((err as Error).message, 'error')
  }
}

async function onPick(v: string) {
  if (!uid.value) return
  try { await setVote(props.id, uid.value, v) }
  catch (err) { toasts.push((err as Error).message, 'error') }
}

async function onReveal() {
  try { await revealRound(props.id) }
  catch (e) { toasts.push((e as Error).message, 'error') }
}

async function onReset() {
  if (!room.room.value) return
  const uids = Object.keys(room.room.value.participants)
  try { await startNewRound(props.id, uids) }
  catch (e) { toasts.push((e as Error).message, 'error') }
}

async function onRename(t: string) {
  try { await renameTask(props.id, t) }
  catch (e) { toasts.push((e as Error).message, 'error') }
}

async function onKick(targetUid: string) {
  try { await kickParticipant(props.id, targetUid) }
  catch (e) { toasts.push((e as Error).message, 'error') }
}

function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
  if (e.key === 'r' && room.isModerator.value && room.room.value && !room.room.value.round.revealed) {
    void onReveal()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <main class="room-main">
    <div v-if="room.loading.value" class="room-state">
      <span class="kicker">Carregando</span>
      <p class="state-line">Distribuindo o baralho…</p>
    </div>

    <div v-else-if="room.notFound.value" class="room-state">
      <span class="kicker">Sala fechada</span>
      <h1 class="state-title">Essa mesa não existe ou expirou</h1>
      <p class="state-line">Volte para a entrada e abra uma nova rodada.</p>
      <button class="state-link" @click="router.push({ name: 'home' })">Ir para a home →</button>
    </div>

    <div v-else-if="room.error.value" class="room-state">
      <span class="kicker">Erro</span>
      <h1 class="state-title">Algo deu errado</h1>
      <p class="state-line">{{ room.error.value }}</p>
    </div>

    <div v-else-if="room.room.value" class="room-stack">
      <RoomHeader
        :room-name="room.room.value.name"
        :task-title="room.room.value.round.taskTitle"
        :is-moderator="room.isModerator.value"
        :total-active="room.totalActive.value"
        :voted-count="room.votedCount.value"
        :revealed="room.room.value.round.revealed"
        @rename="onRename"
      />

      <PokerTable
        :seats="room.seats.value"
        :revealed="room.room.value.round.revealed"
        :can-kick="room.isModerator.value"
        @kick="onKick"
      >
        <template #center>
          <TableCenter
            :is-moderator="room.isModerator.value"
            :revealed="room.room.value.round.revealed"
            :voted-count="room.votedCount.value"
            :total-active="room.totalActive.value"
            :results-open="showResults"
            @reveal="onReveal"
            @reset="onReset"
            @show-results="showResults = true"
          />
        </template>
      </PokerTable>

      <Hand
        :values="room.room.value.deck.values"
        :selected="room.me.value?.vote ?? null"
        :disabled="room.room.value.round.revealed"
        @select="onPick"
      />

    </div>

    <Modal
      v-if="room.room.value"
      :open="showResults && room.room.value.round.revealed"
      kicker="Veredicto"
      title="A mesa fala"
      size="lg"
      @close="showResults = false"
    >
      <ResultsPanel
        embedded
        :seats="room.seats.value.map(s => ({ uid: s.uid, name: s.name, vote: s.vote }))"
      />
      <template #footer>
        <GhostButton @click="showResults = false">Fechar</GhostButton>
        <PrimaryButton v-if="room.isModerator.value" @click="onReset">Nova rodada</PrimaryButton>
      </template>
    </Modal>

    <JoinNameModal :open="showJoin" @submit="onJoin" />
  </main>
</template>

<style scoped>
.room-main {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.room-stack {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.room-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  padding: 80px 24px;
}
.state-title {
  font-family: var(--font-display);
  font-variation-settings: "opsz" 144, "SOFT" 30, "wght" 500;
  font-size: clamp(1.6rem, 3.2vw, 2.2rem);
  letter-spacing: -0.02em;
  margin: 0;
}
.state-line {
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 14, "SOFT" 80, "wght" 400;
  color: color-mix(in srgb, var(--color-ink) 70%, transparent);
}
.state-link {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-accent);
  border-bottom: 1px solid currentColor;
  padding-bottom: 2px;
  margin-top: 6px;
  cursor: pointer;
}
.state-link:hover {
  color: var(--color-gold-deep);
}
</style>
