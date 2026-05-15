import {
  doc,
  collection,
  setDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  Timestamp,
  deleteField,
  writeBatch,
} from 'firebase/firestore'
import { getFirebase } from './index'
import { newRoomId } from '@/lib/uuid'
import type { Deck, Room, Vote } from '@/types/room'

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
        hasVoted: false,
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
  onChange: (room: Room | null, hasPendingWrites: boolean) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const { db } = getFirebase()
  return onSnapshot(
    doc(db, 'rooms', roomId),
    { includeMetadataChanges: true },
    (snap) => onChange(
      snap.exists() ? (snap.data() as Room) : null,
      snap.metadata.hasPendingWrites,
    ),
    (err) => onError?.(err),
  )
}

export function subscribeToOwnVote(
  roomId: string,
  uid: string,
  onChange: (value: string | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const { db } = getFirebase()
  return onSnapshot(
    doc(db, 'rooms', roomId, 'votes', uid),
    (snap) => onChange(snap.exists() ? ((snap.data() as Vote).value) : null),
    (err) => onError?.(err),
  )
}

export function subscribeToAllVotes(
  roomId: string,
  onChange: (votes: Record<string, string>) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const { db } = getFirebase()
  return onSnapshot(
    collection(db, 'rooms', roomId, 'votes'),
    (qsnap) => {
      const out: Record<string, string> = {}
      qsnap.forEach((d) => { out[d.id] = (d.data() as Vote).value })
      onChange(out)
    },
    (err) => onError?.(err),
  )
}

export async function joinRoom(roomId: string, uid: string, name: string): Promise<void> {
  const { db } = getFirebase()
  const now = Timestamp.now()
  await updateDoc(doc(db, 'rooms', roomId), {
    [`participants.${uid}`]: {
      name: name.trim(),
      hasVoted: false,
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
  const batch = writeBatch(db)
  batch.set(doc(db, 'rooms', roomId, 'votes', uid), {
    value,
    updatedAt: serverTimestamp(),
  })
  batch.update(doc(db, 'rooms', roomId), {
    [`participants.${uid}.hasVoted`]: true,
    [`participants.${uid}.lastSeenAt`]: serverTimestamp(),
    [`participants.${uid}.thinkingUntil`]: deleteField(),
    ...activityPatch(),
  })
  await batch.commit()
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
  const batch = writeBatch(db)
  const patch: Record<string, unknown> = {
    'round.revealed': false,
    'round.startedAt': serverTimestamp(),
    ...activityPatch(),
  }
  for (const uid of currentParticipantUids) {
    patch[`participants.${uid}.hasVoted`] = false
    batch.delete(doc(db, 'rooms', roomId, 'votes', uid))
  }
  if (newTitle !== undefined) patch['round.taskTitle'] = newTitle
  batch.update(doc(db, 'rooms', roomId), patch)
  await batch.commit()
}

export async function renameTask(roomId: string, title: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(doc(db, 'rooms', roomId), {
    'round.taskTitle': title,
    ...activityPatch(),
  })
}

export async function kickParticipant(roomId: string, uid: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(doc(db, 'rooms', roomId), {
    [`participants.${uid}`]: deleteField(),
    ...activityPatch(),
  })
}

export async function sendEmoji(roomId: string, uid: string, value: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(doc(db, 'rooms', roomId), {
    [`participants.${uid}.lastEmoji`]: { value, sentAt: serverTimestamp() },
    ...activityPatch(),
  })
}

export async function setThinking(roomId: string, uid: string, untilMs: number): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(doc(db, 'rooms', roomId), {
    [`participants.${uid}.thinkingUntil`]: Timestamp.fromMillis(untilMs),
    ...activityPatch(),
  })
}

export async function clearThinking(roomId: string, uid: string): Promise<void> {
  const { db } = getFirebase()
  await updateDoc(doc(db, 'rooms', roomId), {
    [`participants.${uid}.thinkingUntil`]: deleteField(),
    ...activityPatch(),
  })
}