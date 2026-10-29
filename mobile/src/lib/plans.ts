import { showDate } from "@/lib/dates"
import { MEMBER } from "@/lib/member"
import type { Plan, useOnboarding } from "@/lib/onboarding"

/* The membership catalogue: a free record for everyone and one paid
   Optimization membership. Every practice gets every program; a program
   is what a plan focuses on, never a product with a price (B-01).

   The prices live here and only here (TIERS.optimization.billing): $100
   a month, cancel anytime, or a year paid up front at 10% off, $1,080,
   with 10% off the baseline tests too (16 Oct 2026). Written one way by priceLabel(): "$100 a month". They show only on the plan
   details (the Plan tab), the checkout and the member's own
   membership page; never in an offer, the assistant, a notification or
   next to a doctor (FINAL-SPEC D.4). */

/** Her plan the moment she enrolls: live, dated today. Nothing waits on
    her physician (27 Oct 2026). */
export function firstPlan(version: number): Plan {
  return { status: "live", version, versions: [{ version, approved: showDate(), why: "Your first plan" }] }
}

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]

export type ProgramId =
  | "weight"
  | "bone"
  | "heart"
  | "metabolic"
  | "pressure"
  | "kidney"
  | "strength"
  | "sleep"
  | "male-hormone"
  | "menopause"
  | "liver"

export type Sex = "female" | "male"

export const PROGRAMS: { id: ProgramId; name: string; only?: Sex }[] = [
  { id: "weight", name: "Weight management" },
  { id: "heart", name: "Heart and lipids" },
  { id: "metabolic", name: "Blood sugar and metabolic" },
  { id: "pressure", name: "Blood pressure" },
  { id: "bone", name: "Bone density" },
  { id: "strength", name: "Muscle and strength" },
  { id: "sleep", name: "Sleep" },
  { id: "kidney", name: "Kidney" },
  { id: "liver", name: "Liver" },
  { id: "menopause", name: "Menopause", only: "female" },
  { id: "male-hormone", name: "Male hormone", only: "male" },
]

export type Tier = "free" | "optimization"

/** What the membership includes, in this order (the checkout and the
    member's billing page, S-66). */
const INCLUDED = [
  "Your plan, built from your record and updated every 3 months",
  "A meal plan with daily targets",
  "An exercise program with short videos",
  "Daily monitoring and a score for yesterday's goals",
  "Progress since you start, with a forecast",
  "Ask Inlay about your own record",
] as const

/** How a member pays: monthly, cancel anytime, or a year up front for
    less. */
export type Cadence = "monthly" | "yearly"

/** The two ways to pay, in the order the checkout lists them. Yearly is
    twelve months at 10% off: $1,200 less $120. */
const BILLING: Record<Cadence, { name: string; price: string; period: string; months: number; note: string; save?: string }> = {
  monthly: { name: "Monthly", price: "$100", period: "a month", months: 1, note: "Cancel anytime" },
  yearly: { name: "Yearly", price: "$1,080", period: "a year", months: 12, note: "Paid once a year", save: "Save 10%" },
}

export const CADENCES: Cadence[] = ["monthly", "yearly"]

/** What a yearly member takes off the baseline tests, in percent. */
export const YEARLY_TEST_DISCOUNT = 10

export const TIERS = {
  free: { name: "Free record" },
  optimization: {
    name: "Optimization membership",
    /** The only place the prices live. */
    billing: BILLING,
    /** The monthly price, for the pages that show one figure. */
    price: BILLING.monthly.price,
    period: BILLING.monthly.period,
    included: INCLUDED,
    /** Charged separately, said before she pays (S-66). */
    excluded: ["Tests and imaging, priced when you book them", "Visits and fees at your clinic", "Medicines"],
  },
} as const

/** The price as the app writes it, everywhere it appears: "$100 a
    month", or "$1,080 a year". */
export const priceLabel = (cadence: Cadence = "monthly") => `${BILLING[cadence].price} ${BILLING[cadence].period}`

/** One charge's amount for a cadence: "$100". */
export const priceOf = (cadence: Cadence = "monthly") => BILLING[cadence].price

/** What stays free, membership or not (S-03), on the same page as the
    price. */
export const FREE_STAYS = ["Every result and trend", "Reminders and care gaps", "Booking and paying for tests"]

/** The newest approved version among a plan's versions. */
function newest(versions: Plan["versions"]) {
  return versions.reduce<Plan["versions"][number] | undefined>((a, v) => (!a || v.version > a.version ? v : a), undefined)
}

/** The member's live plan version for the plan line and the Plan tab:
    "Version 2, since Sep 12". Undefined before she enrolls. */
export function livePlan(s: Snapshot) {
  const live = newest(s.plan?.versions ?? [])
  if (!live || !s.plan) return undefined
  return {
    version: live.version,
    /** "Sep 12, 2026" */
    approved: live.approved,
    /** "Sep 12" */
    on: live.approved.replace(/,\s*\d{4}$/, ""),
    why: live.why,
    by: MEMBER.doctorShort,
  }
}
