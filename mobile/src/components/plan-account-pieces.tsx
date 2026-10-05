import { StyleSheet, Text } from "react-native"

import { dayKey } from "@/lib/dates"
import { membershipEnded } from "@/lib/member"
import type { Membership } from "@/lib/onboarding"
import { font, ink } from "@/lib/theme"

/* Pieces the member's account screens share (Membership, Profile and the
   paid setup, FINAL-SPEC C.17, C.18, C.27): the billing calendar worked
   out from the membership, and a setup step's count. No price is written
   here; the price shows only on the member's own billing page. A row's
   date is lib/dates.ts rowDate. */

/* ------------------------------------------------------------- billing -- */

export type Billing = {
  /** waiting: joined, no charge until her first plan is approved (S-66).
      active: charged monthly. paused: billing stopped. ending: cancelled,
      still hers until the paid month runs out at `ends`, and she can
      resume until then. ended: back on the free record. */
  state: "none" | "waiting" | "active" | "paused" | "ending" | "ended"
  /** Ending while paused: the plan stays paused until `ends`. */
  paused?: boolean
  /** The day she joined. */
  started?: Date
  /** Every charge so far, newest first. */
  charges: Date[]
  /** The next charge while the membership runs: the day her first plan
      was approved, each month. */
  next?: Date
  /** The day a cancelled membership ends. */
  ends?: Date
  /** The yearly renewal of the membership (S-70). */
  renews?: Date
}

const valid = (iso?: string) => {
  if (!iso) return undefined
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? undefined : d
}

/** Her billing day in a month, at local noon: the day her plan was
    approved, or the month's last day when it is shorter (31 in September
    is the 30th). */
function chargeIn(year: number, month: number, day: number) {
  const last = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, last), 12)
}

/** The membership's billing calendar on a day: what was charged, what is
    next, and when a cancelled membership ends. Charges start the day her
    first plan is approved (C.15) and come each month on that day until she
    pauses or cancels. */
export function billingOf(m: Membership | undefined, now: Date = new Date()): Billing {
  const started = valid(m?.startedAt)
  const approved = valid(m?.approvedAt)
  const cancelled = valid(m?.cancelledAt)
  const ends = valid(m?.endsAt)
  const renews = started ? new Date(started.getFullYear() + 1, started.getMonth(), started.getDate(), 12) : undefined
  if (!m || (m.tier !== "optimization" && !cancelled)) return { state: "none", charges: [] }

  // Every billing day from the approval to today (or to the cancellation).
  const charges: Date[] = []
  let next: Date | undefined
  if (approved) {
    const until = dayKey(cancelled && cancelled < now ? cancelled : now)
    for (let i = 0; ; i++) {
      const d = chargeIn(approved.getFullYear(), approved.getMonth() + i, approved.getDate())
      if (dayKey(d) > until) {
        next = d
        break
      }
      charges.unshift(d)
    }
  }

  if (m.tier !== "optimization" || membershipEnded(m, now)) return { state: "ended", started, charges, ends, renews }
  if (cancelled) return { state: "ending", paused: m.paused === true, started, charges, ends: ends ?? next, renews }
  if (m.paused) return { state: "paused", started, charges, next, renews }
  if (!approved) return { state: "waiting", started, charges, renews }
  return { state: "active", started, charges, next, renews }
}

/** "Step 2 of 5" on the right of a setup step's header bar (C.27), where
    the Figma "Hol" page puts its text action, in the label grey. */
export function SetupStepLabel({ children }: { children: string }) {
  return <Text style={styles.step}>{children}</Text>
}

const styles = StyleSheet.create({
  step: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink.secondary },
})
