import type { BaselineStorage } from '../types'

export const DEFAULT_BASELINE_KEY = '__vimojs_version_checker__baseline__'

export type BaselineStorageAdapter = {
  get(): string | null
  set(v: string): void
}

export function resolveBaselineStorage(storage: BaselineStorage | undefined): BaselineStorageAdapter {
  if (storage && storage !== 'localStorage') return storage

  return {
    get() {
      if (typeof localStorage === 'undefined') return null
      return localStorage.getItem(DEFAULT_BASELINE_KEY)
    },
    set(v: string) {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(DEFAULT_BASELINE_KEY, v)
    }
  }
}
