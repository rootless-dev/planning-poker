import { ref, watch } from 'vue'

const KEY = 'pp:dark'
const isDark = ref<boolean>(read())

function read(): boolean {
  if (typeof localStorage === 'undefined') return false
  const stored = localStorage.getItem(KEY)
  if (stored === '1') return true
  if (stored === '0') return false
  return typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-color-scheme: dark)').matches
}

function apply(value: boolean) {
  document.documentElement.classList.toggle('dark', value)
  localStorage.setItem(KEY, value ? '1' : '0')
}

apply(isDark.value)
watch(isDark, apply, { flush: 'sync' })

export function useDarkMode() {
  apply(isDark.value)
  return {
    isDark,
    toggle: () => { isDark.value = !isDark.value },
  }
}
