import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { Timestamp } from 'firebase/firestore'
import { nextTick } from 'vue'
import { useRoomStore } from '@/stores/roomStore'
import type { Room } from '@/types/room'

const subscribeToRoom = vi.fn()
const subscribeToOwnVote = vi.fn()
const subscribeToAllVotes = vi.fn()

vi.mock('@/services/firebase/rooms', () => ({
  subscribeToRoom: (...args: unknown[]) => subscribeToRoom(...args),
  subscribeToOwnVote: (...args: unknown[]) => subscribeToOwnVote(...args),
  subscribeToAllVotes: (...args: unknown[]) => subscribeToAllVotes(...args),
}))

function ts(secAgo = 0) {
  return Timestamp.fromMillis(Date.now() - secAgo * 1000)
}

function makeRoom(revealed: boolean): Room {
  return {
    id: 'r', name: 'Sala', createdAt: ts(), lastActivityAt: ts(), expiresAt: ts(-3600),
    moderatorUid: 'mod',
    deck: { type: 'fibonacci', values: ['1', '2', '3'] },
    round: { taskTitle: '', revealed, startedAt: ts() },
    participants: {
      mod: { name: 'M', hasVoted: false, lastSeenAt: ts(), joinedAt: ts(30) },
      alice: { name: 'A', hasVoted: true, lastSeenAt: ts(), joinedAt: ts(20) },
    },
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  subscribeToRoom.mockReset()
  subscribeToOwnVote.mockReset()
  subscribeToAllVotes.mockReset()
  subscribeToOwnVote.mockReturnValue(() => {})
  subscribeToAllVotes.mockReturnValue(() => {})
})

describe('roomStore — reveal sem race do moderador', () => {
  it('NÃO subscreve votos enquanto o snapshot do reveal tem hasPendingWrites=true (corrida do moderador)', async () => {
    let roomCb: ((room: Room | null, hasPendingWrites: boolean) => void) | null = null
    subscribeToRoom.mockImplementation((_id, cb) => {
      roomCb = cb
      return () => {}
    })

    const store = useRoomStore()
    store.watch('r', 'mod')

    // Snapshot inicial confirmado pelo servidor: revealed=false
    roomCb!(makeRoom(false), false)
    await nextTick()
    expect(subscribeToAllVotes).not.toHaveBeenCalled()

    // Moderador clica em Revelar — snapshot local otimista com write ainda não confirmado
    roomCb!(makeRoom(true), true)
    await nextTick()
    expect(subscribeToAllVotes).not.toHaveBeenCalled()

    // Servidor confirma o write — agora a regra do Firestore vai aceitar a query da subcoleção
    roomCb!(makeRoom(true), false)
    await nextTick()
    expect(subscribeToAllVotes).toHaveBeenCalledTimes(1)
  })

  it('subscreve votos imediatamente quando revealed=true chega já confirmado (participante)', async () => {
    let roomCb: ((room: Room | null, hasPendingWrites: boolean) => void) | null = null
    subscribeToRoom.mockImplementation((_id, cb) => {
      roomCb = cb
      return () => {}
    })

    const store = useRoomStore()
    store.watch('r', 'alice')

    // Participante recebe snapshot do servidor: revealed=false
    roomCb!(makeRoom(false), false)
    await nextTick()
    expect(subscribeToAllVotes).not.toHaveBeenCalled()

    // Participante recebe snapshot do servidor: revealed=true (escrita do moderador já commitada)
    roomCb!(makeRoom(true), false)
    await nextTick()
    expect(subscribeToAllVotes).toHaveBeenCalledTimes(1)
  })

  it('não derruba a subscrição de votos quando outro write próprio (ex.: heartbeat) entra com pending=true após reveal', async () => {
    let roomCb: ((room: Room | null, hasPendingWrites: boolean) => void) | null = null
    const unsubAll = vi.fn()
    subscribeToRoom.mockImplementation((_id, cb) => {
      roomCb = cb
      return () => {}
    })
    subscribeToAllVotes.mockReturnValue(unsubAll)

    const store = useRoomStore()
    store.watch('r', 'mod')

    roomCb!(makeRoom(false), false)
    await nextTick()
    roomCb!(makeRoom(true), false) // reveal confirmado → subscreve
    await nextTick()
    expect(subscribeToAllVotes).toHaveBeenCalledTimes(1)
    expect(unsubAll).not.toHaveBeenCalled()

    // Moderador continua mandando heartbeat / emoji / thinking pós-reveal — gera snapshot
    // local otimista com hp=true enquanto o write não confirma. Não deve flickerar a subscrição.
    roomCb!(makeRoom(true), true)
    await nextTick()
    expect(unsubAll).not.toHaveBeenCalled()
    expect(subscribeToAllVotes).toHaveBeenCalledTimes(1)

    // Ack do heartbeat — também não deve resubscrever.
    roomCb!(makeRoom(true), false)
    await nextTick()
    expect(subscribeToAllVotes).toHaveBeenCalledTimes(1)
  })

  it('desliga a subscrição de votos quando revealed volta para false (nova rodada)', async () => {
    let roomCb: ((room: Room | null, hasPendingWrites: boolean) => void) | null = null
    const unsubAll = vi.fn()
    subscribeToRoom.mockImplementation((_id, cb) => {
      roomCb = cb
      return () => {}
    })
    subscribeToAllVotes.mockReturnValue(unsubAll)

    const store = useRoomStore()
    store.watch('r', 'mod')

    roomCb!(makeRoom(true), false)
    await nextTick()
    expect(subscribeToAllVotes).toHaveBeenCalledTimes(1)

    // Moderador inicia nova rodada — snapshot otimista revealed=false, pending=true
    roomCb!(makeRoom(false), true)
    await nextTick()
    expect(unsubAll).toHaveBeenCalledTimes(1)
  })
})
