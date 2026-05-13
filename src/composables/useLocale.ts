import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES, LOCALE_STORAGE_KEY, type Locale } from '@/i18n'

export function useLocale() {
  const { locale } = useI18n()
  const current = computed(() => locale.value as Locale)

  function setLocale(next: Locale) {
    locale.value = next
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      // best-effort; troca em runtime continua válida
    }
    document.documentElement.lang = next
  }

  return { current, setLocale, supported: SUPPORTED_LOCALES }
}
