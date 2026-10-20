import * as React from "react"

/* What she can connect from the Connect tab (16 Oct 2026): her doctors'
   record systems, nothing connected to start; devices left on 19 Oct
   2026. A prototype: nothing is sent anywhere. One list for the session,
   so a system connected on /connections shows on Home too. */

export type SourceKind = "ehr" | "device"

export type Source = {
  id: string
  kind: SourceKind
  name: string
  /** The line under the name: the system or the kind of device. */
  via: string
  /** What it shares with Inlay. */
  data: string[]
  connected: boolean
  /** "2 hours ago", while connected. */
  synced?: string
}

const START: Source[] = [
  // The two record systems HOL reads directly (5 Oct 2026 call).
  { id: "epic", kind: "ehr", name: "Epic MyChart", via: "Hospitals and clinics on Epic", data: ["Lab results", "Medicines", "Conditions", "Visits", "Immunizations"], connected: false },
  { id: "oracle", kind: "ehr", name: "Oracle Health", via: "Hospitals and clinics on Cerner", data: ["Lab results", "Medicines", "Visits", "Imaging"], connected: false },
]

let list = START
const listeners = new Set<() => void>()

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useSources() {
  return React.useSyncExternalStore(subscribe, () => list, () => START)
}

export function connectSource(id: string) {
  list = list.map((s) => (s.id === id ? { ...s, connected: true, synced: "Just now" } : s))
  listeners.forEach((l) => l())
}
