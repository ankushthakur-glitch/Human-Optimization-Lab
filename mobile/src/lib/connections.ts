import * as React from "react"

/* What she can connect from the Connect tab (16 Oct 2026): her doctors'
   record systems and her devices and wearables, nothing connected to
   start. A prototype: nothing is sent anywhere. One list for the session,
   so a device connected on /connections shows on Home too. */

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
  // What a scan finds nearby.
  { id: "apple", kind: "device", name: "Apple Watch Series 9", via: "Watch", data: ["Steps", "Heart rate", "Sleep", "Workouts"], connected: false },
  { id: "oura", kind: "device", name: "Oura Ring Gen 3", via: "Ring", data: ["Sleep", "HRV", "Resting heart rate"], connected: false },
  { id: "withings", kind: "device", name: "Withings Body+", via: "Scale", data: ["Weight", "Body fat"], connected: false },
  { id: "omron", kind: "device", name: "Omron Evolv", via: "Blood pressure cuff", data: ["Blood pressure", "Pulse"], connected: false },
  { id: "dexcom", kind: "device", name: "Dexcom G7", via: "Glucose monitor", data: ["Glucose"], connected: false },
  { id: "garmin", kind: "device", name: "Garmin Venu 3", via: "Watch", data: ["Steps", "Heart rate", "Sleep"], connected: false },
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

export function connectSource(id: string, data: string[]) {
  list = list.map((s) => (s.id === id ? { ...s, connected: true, synced: "Just now", data } : s))
  listeners.forEach((l) => l())
}

/** Today's readings each device brings, for the home's tiles. */
export const READINGS: Record<string, { label: string; value: string; unit?: string }[]> = {
  apple: [{ label: "Steps", value: "6,482" }],
  oura: [
    { label: "Sleep", value: "7h 12m" },
    { label: "HRV", value: "48", unit: "ms" },
  ],
  withings: [{ label: "Weight", value: "148", unit: "lb" }],
  omron: [{ label: "Blood pressure", value: "124/79" }],
  dexcom: [{ label: "Glucose", value: "96", unit: "mg/dL" }],
  garmin: [{ label: "Resting heart rate", value: "61", unit: "bpm" }],
}
