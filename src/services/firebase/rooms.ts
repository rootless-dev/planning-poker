import {
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { getFirebase } from './index'
import { newRoomId } from '@/lib/uuid'
import type { Deck, Room } from '@/types/room'

const TTL_HOURS = 24

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
  const expiresAt = Timestamp.fromMillis(now.toMillis() + TTL_HOURS * 60 * 60 * 1000)

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
