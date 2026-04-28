import { describe, expect, it, vi } from 'vitest'
import { createVersionChecker } from '../src/createVersionChecker'

function makeResponse(json: any) {
  return new Response(JSON.stringify(json), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

function onceEvent<T = any>(checker: any, event: string) {
  return new Promise<T>((resolve) => {
    const off = checker.on(event, (payload: T) => {
      off()
      resolve(payload)
    })
  })
}

describe('version-checker', () => {
  it('sets baseline on first check and does not report update', async () => {
    const fetcher = vi.fn(async () =>
      makeResponse({
        'index.html': { file: 'assets/index.aaa.js', css: ['assets/index.aaa.css'] }
      })
    )

    const checker = createVersionChecker({ fetcher, notify: false })

    const r1 = await checker.checkNow()
    expect(r1.ok).toBe(true)
    expect(r1.ok && r1.kind).toBe('baseline_set')

    const r2 = await checker.checkNow()
    expect(r2.ok).toBe(true)
    expect(r2.ok && r2.kind).toBe('no_change')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('emits update_available and stops polling after update is detected', async () => {
    vi.useFakeTimers()

    const fetcher = vi.fn(async () => {
      const n = fetcher.mock.calls.length - 1
      if (n === 0) {
        return makeResponse({
          'index.html': { file: 'assets/index.aaa.js', css: ['assets/index.aaa.css'] }
        })
      }
      return makeResponse({
        'index.html': { file: 'assets/index.bbb.js', css: ['assets/index.bbb.css'] }
      })
    })

    const checker = createVersionChecker({
      fetcher,
      notify: false,
      interval: 10_000,
      minInterval: 1_000
    })

    const firstChecked = onceEvent(checker, 'checked')
    checker.start()
    await vi.runOnlyPendingTimersAsync()
    await firstChecked
    expect(fetcher).toHaveBeenCalledTimes(1)

    const secondChecked = onceEvent(checker, 'checked')
    await vi.advanceTimersByTimeAsync(10_000)
    await secondChecked
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(checker.getState()).toBe('update_available')

    await vi.advanceTimersByTimeAsync(20_000)
    expect(fetcher).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('focus/online triggers a check when running (default enabled)', async () => {
    const fetcher = vi.fn(async () =>
      makeResponse({
        'index.html': { file: 'assets/index.aaa.js' }
      })
    )

    const checker = createVersionChecker({ fetcher, notify: false, interval: 60_000 })
    const firstChecked = onceEvent(checker, 'checked')
    checker.start()
    await firstChecked
    expect(fetcher).toHaveBeenCalledTimes(1)

    const focusChecked = onceEvent(checker, 'checked')
    window.dispatchEvent(new Event('focus'))
    await focusChecked
    expect(fetcher).toHaveBeenCalledTimes(2)

    const onlineChecked = onceEvent(checker, 'checked')
    window.dispatchEvent(new Event('online'))
    await onlineChecked
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('does not run concurrent in-flight checks', async () => {
    let resolve!: (v: Response) => void
    const p = new Promise<Response>((r) => (resolve = r))
    const fetcher = vi.fn(() => p)

    const checker = createVersionChecker({ fetcher, notify: false })

    const a = checker.checkNow()
    const b = checker.checkNow()
    expect(fetcher).toHaveBeenCalledTimes(1)

    resolve(
      makeResponse({
        'index.html': { file: 'assets/index.aaa.js' }
      })
    )

    const [ra, rb] = await Promise.all([a, b])
    expect(ra.ok).toBe(true)
    expect(rb.ok).toBe(true)
  })

  it('counts errors as checked and emits error event', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('network')
    })
    const checker = createVersionChecker({ fetcher, notify: false })

    const onError = vi.fn()
    const onChecked = vi.fn()
    checker.on('error', onError)
    checker.on('checked', onChecked)

    const r = await checker.checkNow()
    expect(r.ok).toBe(false)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onChecked).toHaveBeenCalledTimes(1)
  })
})
