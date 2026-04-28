export type Unsubscribe = () => void

export type Emitter<EventName extends string> = {
  on(event: EventName, handler: (payload: any) => void): Unsubscribe
  off(event: EventName, handler: (payload: any) => void): void
  emit(event: EventName, payload: any): void
}

export function createEmitter<EventName extends string>(): Emitter<EventName> {
  const map = new Map<EventName, Set<(payload: any) => void>>()

  function on(event: EventName, handler: (payload: any) => void): Unsubscribe {
    let set = map.get(event)
    if (!set) {
      set = new Set()
      map.set(event, set)
    }
    set.add(handler)
    return () => off(event, handler)
  }

  function off(event: EventName, handler: (payload: any) => void) {
    map.get(event)?.delete(handler)
  }

  function emit(event: EventName, payload: any) {
    const set = map.get(event)
    if (!set || set.size === 0) return
    for (const handler of [...set]) handler(payload)
  }

  return { on, off, emit }
}
