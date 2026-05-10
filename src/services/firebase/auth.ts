import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth'
import { getFirebase } from './index'

export async function ensureAnonymousUser(): Promise<User> {
  const { auth } = getFirebase()
  if (auth.currentUser) return auth.currentUser
  const credential = await signInAnonymously(auth)
  return credential.user
}

export function onAuth(callback: (user: User | null) => void): () => void {
  const { auth } = getFirebase()
  return onAuthStateChanged(auth, callback)
}
