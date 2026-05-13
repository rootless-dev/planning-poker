class InMemoryStorage {
  private data: Record<string, string> = {}

  get length() {
    return Object.keys(this.data).length
  }

  key(index: number): string | null {
    const keys = Object.keys(this.data)
    return keys[index] ?? null
  }

  getItem(name: string): string | null {
    return this.data[name] !== undefined ? this.data[name] : null
  }

  setItem(name: string, item: string): void {
    this.data[name] = String(item)
  }

  removeItem(name: string): void {
    delete this.data[name]
  }

  clear(): void {
    for (const key of Object.keys(this.data)) {
      delete this.data[key]
    }
  }
}

const storage = new InMemoryStorage()
Object.defineProperty(globalThis, 'localStorage', {
  value: storage,
  writable: true,
  configurable: true,
})

import { config } from '@vue/test-utils'
import { i18n } from '../src/i18n'

config.global.plugins = [...(config.global.plugins ?? []), i18n]
