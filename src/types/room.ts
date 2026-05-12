import type { Timestamp } from 'firebase/firestore'

export type DeckType =
  | 'fibonacci'
  | 'fibonacci-modified'
  | 'tshirt'
  | 'powers-of-2'
  | 'sequential'
  | 'hours'
  | 'risk'
  | 'yes-no'
  | 'custom'

export interface Deck {
  type: DeckType
  values: string[]
}

export interface EmojiEvent {
  value: string
  sentAt: Timestamp
}

export interface Participant {
  name: string
  hasVoted: boolean
  lastSeenAt: Timestamp
  joinedAt: Timestamp
  lastEmoji?: EmojiEvent
  thinkingUntil?: Timestamp
}

export interface Vote {
  value: string
  updatedAt: Timestamp
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
