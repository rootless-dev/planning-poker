import type { Timestamp } from 'firebase/firestore'

export type DeckType = 'fibonacci' | 'tshirt' | 'custom'

export interface Deck {
  type: DeckType
  values: string[]
}

export interface Participant {
  name: string
  vote: string | null
  lastSeenAt: Timestamp
  joinedAt: Timestamp
}

export interface Round {
  taskTitle: string
  revealed: boolean
  startedAt: Timestamp
}

export interface Room {
  id: string
  name: string
  createdAt: Timestamp
  lastActivityAt: Timestamp
  expiresAt: Timestamp
  moderatorUid: string
  deck: Deck
  round: Round
  participants: Record<string, Participant>
}

export type PresenceState = 'online' | 'absent' | 'offline'
