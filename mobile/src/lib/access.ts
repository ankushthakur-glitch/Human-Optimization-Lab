import type { State } from "@/lib/onboarding"
import { DEVICES } from "@/lib/program"
import { SOURCES } from "@/lib/record"

/* What the patient's record is connected to, listed on Access (5 Oct 2026
   call: the sharing and its revoke one tap deeper than Profile). Two
   kinds: her doctors' record systems, read directly (Epic MyChart, Oracle
   Health); and her devices, Apple Health first (she controls it, and it
   carries her Quest and Labcorp results), the Apple Watch writing into
   it, then any ring, scale or watch she adds. Each one can be disconnected
   on its own: nothing new arrives from it, what came stays.

   A prototype: the sample patient's connections. When the API exists the
   server lists them. */

export type ConnectionKind = "ehr" | "device"

export type Connection = {
  id: string
  kind: ConnectionKind
  name: string
  /** The line under the name: the system or what it brings. */
  via: string
  /** One she added on Access: disconnecting takes it off the list. */
  added?: boolean
}

/** Her doctors' systems: the record's sources that are not a lab (labs now
    arrive through Apple Health). */
const EHRS: Connection[] = SOURCES.filter((s) => s.kind !== "lab").map((s) => ({
  id: s.name.toLowerCase().replace(/[^a-z]+/g, "-"),
  kind: "ehr",
  name: s.name,
  via: s.system === "Epic" ? "Epic MyChart" : s.system,
}))

/** Connected from the start, through the phone. */
const PHONE: Connection[] = [
  { id: "apple-health", kind: "device", name: "Apple Health", via: "Lab results, steps and sleep" },
  { id: "apple-watch", kind: "device", name: "Apple Watch", via: "Through Apple Health" },
]

/** What she can add: every device the plan reads but Apple Health, which
    is already there. */
export const ADDABLE: Connection[] = DEVICES.filter((d) => d.id !== "apple").map((d) => ({ id: d.id, kind: "device", name: d.name, via: d.kind, added: true }))

/** Everything connected, the devices she added after the phone's own. */
export function connectionsOf(s: Pick<State, "devices">): Connection[] {
  return [...EHRS, ...PHONE, ...ADDABLE.filter((d) => s.devices?.includes(d.id))]
}

/** The words for what stops when she disconnects one. */
export function disconnectText(c: Connection): string {
  if (c.kind === "ehr") return `We'll stop collecting new records from ${c.name}. What's already in your record stays, and your care team can still see it.`
  return `We'll stop reading new data from ${c.name}. What's already in your record stays.`
}

/** How many are still connected, for Profile's Access row. */
export function connectedCount(s: Pick<State, "devices" | "disconnected">): number {
  return connectionsOf(s).filter((c) => !s.disconnected?.[c.id]).length
}
