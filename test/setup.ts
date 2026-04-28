import { webcrypto } from 'node:crypto'
import { beforeEach } from 'vitest'

if (!globalThis.crypto?.subtle) {
  ;(globalThis as any).crypto = webcrypto
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
})
