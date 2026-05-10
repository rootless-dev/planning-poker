import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore'

let _app: FirebaseApp | null = null
let _auth: Auth | null = null
let _db: Firestore | null = null

function readConfig() {
  return {
    apiKey: import.meta.env.VITE_FB_API_KEY,
    authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FB_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
    appId: import.meta.env.VITE_FB_APP_ID,
  }
}

export function getFirebase() {
  if (_app) return { app: _app, auth: _auth!, db: _db! }
  _app = initializeApp(readConfig())
  _auth = getAuth(_app)
  _db = getFirestore(_app)

  if (import.meta.env.VITE_USE_EMULATOR === 'true') {
    connectAuthEmulator(_auth, 'http://localhost:9099', { disableWarnings: true })
    connectFirestoreEmulator(_db, 'localhost', 8080)
  }
  return { app: _app, auth: _auth, db: _db }
}
