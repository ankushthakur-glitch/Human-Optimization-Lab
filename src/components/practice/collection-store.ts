"use client"

import * as React from "react"

/* A prototype has no backend, so each list in the practice portal lives in a
   module-level store mirrored to sessionStorage, the same arrangement as the
   admin console's practices. Storage is read after mount so the server and
   the first client render agree on the sample data, and a saved copy is
   dropped when the sample data it grew from has changed. */

export type Collection<T extends { id: string }> = {
  use: () => { items: T[]; ready: boolean }
  get: () => T[]
  add: (items: T[]) => void
  patch: (id: string, changes: Partial<T>) => void
}

export function createCollection<T extends { id: string }>(
  key: string,
  seed: T[],
  version: string
): Collection<T> {
  const stamp = `${version}:${seed.length}:${seed[0]?.id ?? ""}`
  let items = seed
  let hydrated = false
  const listeners = new Set<() => void>()

  function emit() {
    try {
      sessionStorage.setItem(key, JSON.stringify({ seed: stamp, items }))
    } catch {
      // Private windows and blocked storage: the session simply won't persist.
    }
    listeners.forEach((listener) => listener())
  }

  function hydrate() {
    if (hydrated) return
    hydrated = true
    try {
      const saved = sessionStorage.getItem(key)
      const parsed = saved
        ? (JSON.parse(saved) as { seed?: string; items?: T[] })
        : null
      if (parsed?.seed === stamp && parsed.items) items = parsed.items
    } catch {
      // Fall back to the sample data.
    }
    listeners.forEach((listener) => listener())
  }

  function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return {
    use() {
      const list = React.useSyncExternalStore(
        subscribe,
        () => items,
        () => seed
      )
      const ready = React.useSyncExternalStore(
        subscribe,
        () => hydrated,
        () => false
      )
      React.useEffect(hydrate, [])
      return { items: list, ready }
    },
    get: () => items,
    add(next) {
      items = [...next, ...items]
      emit()
    },
    patch(id, changes) {
      items = items.map((item) =>
        item.id === id ? { ...item, ...changes } : item
      )
      emit()
    },
  }
}

/** A short random id with a prefix, unique within `taken`. */
export function nextId(prefix: string, taken: { id: string }[], width = 5) {
  let id = ""
  do {
    id = `${prefix}${String(Math.floor(Math.random() * 10 ** width)).padStart(width, "0")}`
  } while (taken.some((item) => item.id === id))
  return id
}

/* The user's local date, not UTC, so an evening invite in the US is not
   stamped with tomorrow's date. */
export function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
