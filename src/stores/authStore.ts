import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from 'firebase/auth'
import { ensureAnonymousUser, onAuth } from '@/services/firebase/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const ready = ref(false)
  let unsubscribe: (() => void) | null = null

  async function init() {
    if (ready.value) return
    return new Promise<void>((resolve) => {
      unsubscribe = onAuth(async (u) => {
        if (u) {
          user.value = u
        } else {
          user.value = await ensureAnonymousUser()
        }
        ready.value = true
        resolve()
      })
    })
  }

  function dispose() {
    unsubscribe?.()
    unsubscribe = null
  }

  return { user, ready, init, dispose }
})
