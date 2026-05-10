import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  variant: 'info' | 'success' | 'error'
}

const toasts = ref<Toast[]>([])
let nextId = 1

export function useToasts() {
  function push(message: string, variant: Toast['variant'] = 'info', timeoutMs = 3000) {
    const id = nextId++
    toasts.value.push({ id, message, variant })
    if (timeoutMs > 0) {
      setTimeout(() => dismiss(id), timeoutMs)
    }
  }
  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }
  return { toasts, push, dismiss }
}
