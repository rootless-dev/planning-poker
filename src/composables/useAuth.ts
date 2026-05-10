import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const store = useAuthStore()
  return {
    uid: computed(() => store.user?.uid ?? null),
    ready: computed(() => store.ready),
    init: store.init,
  }
}
