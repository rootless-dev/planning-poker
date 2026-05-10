import {
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { getFirebase } from './index'
import { newRoomId } from '@/lib/uuid'
import type { Deck, Room } from '@/types/room'

const TTL_MS = 24 * 60 * 60 * 1000

interface CreateRoomInput {
  name: string
  deck: Deck
  moderatorName: string
  moderatorUid: string
}

export async function createRoom(input: CreateRoomInput): Promise<string> {
  const { db } = getFirebase()
  const id = newRoomId()
  const now = Timestamp.now()
  const expiresAt = Timestamp.fromMillis(now.toMillis() + TTL_MS)

  const room: Omit<Room, 'createdAt' | 'lastActivityAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>
    lastActivityAt: ReturnType<typeof serverTimestamp>
  } = {
    id,
    name: input.name.trim(),
    createdAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
    expiresAt,
    moderatorUid: input.moderatorUid,
    deck: input.deck,
    round: {
      taskTitle: '',
      revealed: false,
      startedAt: now,
    },
    participants: {
      [input.moderatorUid]: {
        name: input.moderatorName.trim(),
        vote: null,
        lastSeenAt: now,
        joinedAt: now,
      },
    },
  }

  await setDoc(doc(db, 'rooms', id), room)
  return id
}

function activityPatch() {
  return {
    lastActivityAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + TTL_MS),
  }
}

export type Unsubscribe = () => void

export function subscribeToRoom(
  roomId: string,
  onChange: (room: Room | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const { db } = getFirebase()
  return onSnapshot(
    doc(db, 'rooms', roomId),
    (snap) => onChange(snap.exists() ? (snap.data() as Room) : null),
    (err) => onError?.(err),
  )
}

export async function joinRoom(roomId: string, uid: string, name: string): Promise<void> {
  const { db } = getFirebase()
  const now = Timestamp.now()
  await updateDoc(doc(db, 'rooms', roomId), {
    [`participants.${uid}`]: {
      name: name.trim(),
      vote: null,
      lastSeenAt: now,
      joinedAt: now,
    },
    ...activityPatch(),
  })
}

export async function heartbeat(roomId: string, uid: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(doc(db, 'rooms', roomId), {
    [`participants.${uid}.lastSeenAt`]: serverTimestamp(),
    ...activityPatch(),
  })
}

export async function setVote(roomId: string, uid: string, value: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(doc(db, 'rooms', roomId), {
    [`participants.${uid}.vote`]: value,
    [`participants.${uid}.lastSeenAt`]: serverTimestamp(),
    ...activityPatch(),
  })
}

export async function revealRound(roomId: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(doc(db, 'rooms', roomId), {
    'round.revealed': true,
    ...activityPatch(),
  })
}

export async function startNewRound(roomId: string, currentParticipantUids: string[], newTitle?: string): Promise<void> {
  const { db } = getFirebase()
  const patch: Record<string, unknown> = {
    'round.revealed': false,
    'round.startedAt': serverTimestamp(),
    ...activityPatch(),
  }
  for (const uid of currentParticipantUids) {
    patch[`participants.${uid}.vote`] = null
  }
  if (newTitle !== undefined) patch['round.taskTitle'] = newTitle
  await updateDoc(doc(db, 'rooms', roomId), patch)
}
