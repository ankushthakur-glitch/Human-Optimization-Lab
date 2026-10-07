import type { State } from "@/lib/onboarding"
import { DEVICES } from "@/lib/program"
import { SOURCES } from "@/lib/record"

/* What the patient's record is connected to, listed on Access (5 Oct 2026
   call: the sharing and its revoke one tap deeper than Profile). Two
   kinds: her doctors' record systems, read directly (Epic MyChart, Oracle
   Health); and her devices, Apple Health first (she controls it, and it
   carries her Quest and Labcorp results), the Apple Watch writing into
   it, then any ring, scale or watch she adds. Devices come with the paid
   plan, so a free patient's list is her doctors' systems only. Nothing is
   disconnected from here (user, 6 Oct 2026); stopping the sharing is the
   one switch.

   A prototype: the sample patient's connections. When the API exists the
   server lists them. */

export type ConnectionKind = "ehr" | "device"

export type Connection = {
  id: string
  kind: ConnectionKind
  name: string
  /** The line under the name: the system or what it brings. */
  via: string
  /** One she added on Access, after the phone's own. */
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

/** Everything connected: her doctors' systems, and for a member the
    phone's devices then the ones she added. */
export function connectionsOf(s: Pick<State, "devices">, paid: boolean): Connection[] {
  if (!paid) return EHRS
  return [...EHRS, ...PHONE, ...ADDABLE.filter((d) => s.devices?.includes(d.id))]
}

/** How many are connected, for Profile's Access row. */
export function connectedCount(s: Pick<State, "devices">, paid: boolean): number {
  return connectionsOf(s, paid).length
}
