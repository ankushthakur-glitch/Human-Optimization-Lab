import * as React from "react"

import { markersFor, memberStage, type MemberStage } from "@/lib/member"
import { firstSession, readinessBand } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { inlayScore, type Biomarker } from "@/lib/record"
import { trendCounts } from "@/lib/trends"

/* Which app a signed-in patient gets after onboarding (FINAL-SPEC A.3): one
   selector, so no screen tests the membership tier on its own. The first
   rule that matches wins:

   member-review  a member whose first plan is with Dr. Patel
   member         a member with a live plan, a newer version possibly with
                  Dr. Patel meanwhile (the live one stays, M-55)
   paused         a member who paused: the free home, with Resume
   free           everyone else, a cancelled member included (back on the
                  free record, every plan version kept)

   No patient reaches the app without the consent, so there is no state
   for a record never connected or still arriving.

   Home draws the member home for member and member-review,
   and the free home for the rest; the Plan tab draws the member's plan for
   any member, paused included, and the showroom for the rest.

   On top of any experience sit the modifiers: sharing turned off in
   Profile (what was collected stays, nothing new arrives, one banner on
   every tab), a membership cancelled in the last 90 days, and the
   readiness band and first session, which the cap service in
   lib/offers.ts reads itself. */

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]

export type Experience = "member-review" | "member" | "paused" | "free"

/** The one experience for this state. */
export function experience(s: Snapshot): Experience {
  const stage = memberStage(s)
  if (stage === "review") return "member-review"
  if (stage === "live" || stage === "redraft") return "member"
  if (stage === "paused") return "paused"
  return "free"
}

export type ExperienceInfo = {
  experience: Experience
  /** memberStage(): review, live, redraft or paused; undefined on
      the free record. */
  stage?: MemberStage
  /** The version with the doctor while another is live (member-redraft). */
  redraft?: number
  /** Sharing turned off after the record was collected: `since` is when
      (ISO; empty when the store never kept the day), `on` the same as
      "Oct 3". */
  sharingOff?: { since: string; on?: string }
  /** The why conversation's readiness, 1 to 5, as the offers read it. */
  readiness: "low" | "mid" | "high"
  /** This launch is her first session: no offers anywhere (B-02). */
  firstSession: boolean
}

/** Everything a screen needs to tell the patients apart, from one state. */
export function experienceOf(s: Snapshot): ExperienceInfo {
  const stage = memberStage(s)
  const off = sharingOff(s)
  return {
    experience: experience(s),
    stage,
    redraft: stage === "redraft" ? s.plan?.version : undefined,
    sharingOff: off ? { since: off.at ?? "", on: off.on } : undefined,
    readiness: readinessBand(s),
    firstSession: firstSession(s),
  }
}

/** The experience of the patient on this device. */
export function useExperience(): ExperienceInfo {
  return experienceOf(useOnboarding())
}

/** The markers every screen reads: the record (or the steady set for
    /demo/free-steady), plus any new batch of results that has arrived,
    plus a member's starting tests (lib/member.ts markersFor). */
export function useMarkers(): Biomarker[] {
  const s = useOnboarding()
  const { demo, batches, membership } = s
  // Only what changes the markers rebuilds them.
  return React.useMemo(() => markersFor({ demo, batches, membership }), [demo, batches, membership])
}

/** Today's Inlay score for the patient on this device (lib/record.ts
    inlayScore): from her answers and her own record, so a steady record
    scores higher than one with results out of range. Undefined with no
    answers; a screen leaves it out while there is no record. */
export function useInlayScore(): number | undefined {
  const flourish = useOnboarding().why?.flourish
  const markers = useMarkers()
  return React.useMemo(() => inlayScore(flourish, trendCounts(markers)), [flourish, markers])
}

type Which = Experience | Pick<ExperienceInfo, "experience">
const nameOf = (e: Which) => (typeof e === "string" ? e : e.experience)

/** Which home draws an experience: a member waiting for her first plan
    or with a live plan starts on the member home; a paused
    member and everyone else on the free home. Takes the experience or
    useExperience()'s result. */
export function homeFor(e: Which): "free" | "member" {
  const name = nameOf(e)
  return name === "member" || name === "member-review" ? "member" : "free"
}

/** Which Plan tab draws an experience: any member, paused included, sees
    her own plan; everyone else the showroom. */
export function planFor(e: Which): "free" | "member" {
  return homeFor(e) === "member" || nameOf(e) === "paused" ? "member" : "free"
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAY_MS = 86400000

/** Sharing turned off after the record was collected (consent withdrawn
    on Access), with the day she did it when the store has it: "Oct 3".
    Undefined while sharing is on. */
export function sharingOff(s: Snapshot): { at?: string; on?: string } | undefined {
  if (s.consent !== "declined" || !s.consentAt) return undefined
  const at = s.sharingOffAt
  const d = at ? new Date(at) : undefined
  return { at, on: d && !Number.isNaN(d.getTime()) ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : undefined }
}

/** No offers for 90 days after a membership is cancelled, except the Plan
    tab she opens herself. */
export const CANCELLED_QUIET_DAYS = 90

/** A membership cancelled within the last 90 days, whether its paid month
    is still running or not (a member sees no offers either way). */
export function cancelledRecently(s: Snapshot, now: Date = new Date()): boolean {
  const at = s.membership?.cancelledAt
  if (!at) return false
  const age = (now.getTime() - Date.parse(at)) / DAY_MS
  return age >= 0 && age < CANCELLED_QUIET_DAYS
}

/** Whether this experience may carry a membership offer at all: only the
    free record, with sharing on and no cancellation in the last 90 days.
    The cap service (lib/offers.ts decide) applies the same rules itself;
    this is for a screen deciding whether to draw an offer's place at all. */
export function canOffer(s: Snapshot, now: Date = new Date()): boolean {
  return experience(s) === "free" && !sharingOff(s) && !cancelledRecently(s, now)
}
