import type { Timestamp } from 'firebase/firestore'
import type { PresenceState } from '@/types/room'

const ONLINE_LIMIT_MS = 30_000
const OFFLINE_LIMIT_MS = 90_000

export function presenceFor(lastSeenAt: Timestamp | null | undefined): PresenceState {
  if (!lastSeenAt) return 'offline'
  const diffMs = Date.now() - lastSeenAt.toMillis()
  if (diffMs < ONLINE_LIMIT_MS) return 'online'
  if (diffMs < OFFLINE_LIMIT_MS) return 'absent'
  return 'offline'
}
