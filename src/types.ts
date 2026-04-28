export type VersionCheckerState = 'idle' | 'running' | 'update_available' | 'stopped'

export type VersionCheckerEvent =
  | 'checked'
  | 'update_available'
  | 'error'
  | 'state_change'

export type BaselineStorage =
  | 'localStorage'
  | {
      get(): string | null
      set(v: string): void
    }

export type NotifyMode =
  | 'default'
  | false
  | ((ctx: UpdateAvailableContext) => void)

export type VersionCheckerOptions = {
  interval?: number
  minInterval?: number
  manifestUrl?: string | (() => string)
  headers?: Record<string, string>
  resumeOnFocus?: boolean
  resumeOnOnline?: boolean
  resumeDelayMs?: number
  baselineStorage?: BaselineStorage
  notify?: NotifyMode
  onUpdateAvailable?: (ctx: UpdateAvailableContext) => void
  onChecked?: (result: CheckResult) => void
  onError?: (err: unknown) => void
  fetcher?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export type CheckResult =
  | {
      ok: true
      kind: 'baseline_set'
      state: VersionCheckerState
      fingerprint: string
      baselineFingerprint: string
      checkedAt: number
    }
  | {
      ok: true
      kind: 'no_change'
      state: VersionCheckerState
      fingerprint: string
      baselineFingerprint: string
      checkedAt: number
    }
  | {
      ok: true
      kind: 'update_available'
      state: VersionCheckerState
      fingerprint: string
      baselineFingerprint: string
      checkedAt: number
    }
  | {
      ok: false
      kind: 'error'
      state: VersionCheckerState
      error: unknown
      checkedAt: number
    }

export type UpdateAvailableContext = {
  manifestUrl: string
  baselineFingerprint: string
  fingerprint: string
  checkedAt: number
  applyUpdate(): void
}

export type VersionChecker = {
  start(): void
  stop(): void
  checkNow(): Promise<CheckResult>
  getState(): VersionCheckerState
  applyUpdate(): void
  on(event: VersionCheckerEvent, handler: (payload: any) => void): () => void
  off(event: VersionCheckerEvent, handler: (payload: any) => void): void
}
