import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, terminate } from 'firebase/firestore'

const PROJECT_ID = 'planning-poker-test'

export interface TestEnv {
  app: FirebaseApp
  auth: ReturnType<typeof getAuth>
  db: ReturnType<typeof getFirestore>
  uid: string
  cleanup: () => Promise<void>
}

export async function makeTestEnv(name = 'default'): Promise<TestEnv> {
  const app = initializeApp({ apiKey: 'fake-api-key', projectId: PROJECT_ID }, `${name}-${Math.random()}`)
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  const db = getFirestore(app)
  connectFirestoreEmulator(db, 'localhost', 8080)
  const cred = await signInAnonymously(auth)
  return {
    app,
    auth,
    db,
    uid: cred.user.uid,
    cleanup: async () => {
      await terminate(db)
      await deleteApp(app)
    },
  }
}
