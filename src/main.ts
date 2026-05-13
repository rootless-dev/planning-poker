import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import { i18n } from './i18n'
import App from './App.vue'
import { useAuthStore } from './stores/authStore'
import './style.css'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia).use(router).use(i18n)

  const authStore = useAuthStore(pinia)
  await authStore.init()

  app.mount('#app')
}

void bootstrap()
