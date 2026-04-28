export function isBrowserEnv() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

export function now() {
  return Date.now()
}
