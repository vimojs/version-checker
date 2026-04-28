import type {
  CheckResult,
  UpdateAvailableContext,
  VersionChecker,
  VersionCheckerEvent,
  VersionCheckerOptions,
  VersionCheckerState
} from './types'
import { resolveBaselineStorage } from './core/baselineStorage'
import { createEmitter } from './core/emitter'
import { isBrowserEnv, now } from './core/env'
import { fetchViteFingerprint } from './strategies/viteManifest'
import { defaultNotify } from './ui/defaultNotify'

export function createVersionChecker(options: VersionCheckerOptions = {}): VersionChecker {
  const emitter = createEmitter<VersionCheckerEvent>()

  const interval = clampInterval(options.interval ?? 10_000, options.minInterval ?? 3_000)
  const resumeDelayMs = options.resumeDelayMs ?? 1_000
  const resumeOnFocus = options.resumeOnFocus ?? true
  const resumeOnOnline = options.resumeOnOnline ?? true

  const notify = options.notify ?? 'default'
  const baselineStorage = resolveBaselineStorage(options.baselineStorage)

  let state: VersionCheckerState = 'idle'
  let desiredRunning = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let inFlight: Promise<CheckResult> | null = null
  let listenersAttached = false
  let lastUpdateCtx: UpdateAvailableContext | null = null

  function getState() {
    return state
  }

  function setState(next: VersionCheckerState) {
    if (state === next) return
    state = next
    emitter.emit('state_change', next)
  }

  function clearTimer() {
    if (!timer) return
    clearTimeout(timer)
    timer = null
  }

  function scheduleNext(delayMs: number) {
    clearTimer()
    timer = setTimeout(tick, delayMs)
  }

  async function tick() {
    if (!desiredRunning) return
    if (state !== 'running') return
    if (!isBrowserEnv()) return
    if (document.hidden) return

    await checkNow()

    if (!desiredRunning) return
    if (state !== 'running') return
    if (document.hidden) return
    scheduleNext(interval)
  }

  function attachListeners() {
    if (!isBrowserEnv()) return
    if (listenersAttached) return
    listenersAttached = true

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)
  }

  function detachListeners() {
    if (!isBrowserEnv()) return
    if (!listenersAttached) return
    listenersAttached = false

    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('focus', onFocus)
    window.removeEventListener('online', onOnline)
  }

  function onVisibilityChange() {
    if (!desiredRunning) return
    if (state !== 'running') return
    if (!isBrowserEnv()) return

    if (document.hidden) {
      clearTimer()
      return
    }
    scheduleNext(resumeDelayMs)
  }

  function onFocus() {
    if (!resumeOnFocus) return
    handleResumeTrigger()
  }

  function onOnline() {
    if (!resumeOnOnline) return
    handleResumeTrigger()
  }

  function handleResumeTrigger() {
    if (!desiredRunning) return
    if (!isBrowserEnv()) return
    if (state === 'update_available') {
      triggerNotify()
      return
    }
    if (state !== 'running') return
    void checkNow()
  }

  function applyUpdate() {
    if (!isBrowserEnv()) return
    location.reload()
  }

  function triggerNotify() {
    if (notify === false) return
    if (!lastUpdateCtx) return
    if (notify === 'default') defaultNotify(lastUpdateCtx)
    else notify(lastUpdateCtx)
  }

  async function checkNow(): Promise<CheckResult> {
    if (inFlight) return inFlight

    const checkedAt = now()

    inFlight = (async () => {
      if (!isBrowserEnv()) {
        const result: CheckResult = {
          ok: false,
          kind: 'error',
          state,
          error: new Error('Not in a browser environment'),
          checkedAt
        }
        emitter.emit('error', result.error)
        emitter.emit('checked', result)
        options.onError?.(result.error)
        options.onChecked?.(result)
        return result
      }

      try {
        const { manifestUrl, fingerprint } = await fetchViteFingerprint(options)
        const baselineFingerprint = baselineStorage.get()

        if (!baselineFingerprint) {
          baselineStorage.set(fingerprint)
          const result: CheckResult = {
            ok: true,
            kind: 'baseline_set',
            state,
            fingerprint,
            baselineFingerprint: fingerprint,
            checkedAt
          }
          emitter.emit('checked', result)
          options.onChecked?.(result)
          return result
        }

        if (baselineFingerprint === fingerprint) {
          const result: CheckResult = {
            ok: true,
            kind: 'no_change',
            state,
            fingerprint,
            baselineFingerprint,
            checkedAt
          }
          emitter.emit('checked', result)
          options.onChecked?.(result)
          return result
        }

        setState('update_available')
        clearTimer()

        const ctx: UpdateAvailableContext = {
          manifestUrl,
          baselineFingerprint,
          fingerprint,
          checkedAt,
          applyUpdate
        }

        lastUpdateCtx = ctx
        emitter.emit('update_available', ctx)
        options.onUpdateAvailable?.(ctx)
        if (notify === 'default') defaultNotify(ctx)
        else if (notify) notify(ctx)

        const result: CheckResult = {
          ok: true,
          kind: 'update_available',
          state,
          fingerprint,
          baselineFingerprint,
          checkedAt
        }
        emitter.emit('checked', result)
        options.onChecked?.(result)
        return result
      } catch (error) {
        const result: CheckResult = {
          ok: false,
          kind: 'error',
          state,
          error,
          checkedAt
        }
        emitter.emit('error', error)
        emitter.emit('checked', result)
        options.onError?.(error)
        options.onChecked?.(result)
        return result
      } finally {
        inFlight = null
      }
    })()

    return inFlight
  }

  function start() {
    desiredRunning = true
    attachListeners()
    if (!isBrowserEnv()) return

    if (state === 'update_available') {
      triggerNotify()
      return
    }

    setState('running')
    if (!document.hidden) scheduleNext(0)
  }

  function stop() {
    desiredRunning = false
    clearTimer()
    detachListeners()
    setState('stopped')
  }

  function on(event: VersionCheckerEvent, handler: (payload: any) => void) {
    return emitter.on(event, handler)
  }

  function off(event: VersionCheckerEvent, handler: (payload: any) => void) {
    emitter.off(event, handler)
  }

  return { start, stop, checkNow, getState, applyUpdate, on, off }
}

function clampInterval(interval: number, minInterval: number) {
  if (!Number.isFinite(interval) || interval < 0) return minInterval
  if (!Number.isFinite(minInterval) || minInterval < 0) return interval
  return Math.max(interval, minInterval)
}
