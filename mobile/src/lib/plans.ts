import { FREE_QUESTIONS } from "@/lib/allowance"
import { dayKey } from "@/lib/dates"
import { MEMBER, PROFILES, dayScore, type MemberFocus } from "@/lib/member"
import type { Plan, useOnboarding } from "@/lib/onboarding"
import type { FocusArea } from "@/lib/record"

/* The membership catalogue: a free record for everyone and one paid
   Optimization membership. Every practice gets every program; a program
   is what a plan focuses on, never a product with a price (B-01).

   The price lives here and only here (TIERS.optimization.price, a
   placeholder until Inlay sets it; the 21 Sep deck says "$100+ per
   month"), written one way by priceLabel(): "$100 a month". It shows only
   on the plan details (the Plan tab and /plans), the checkout and the
   member's own membership page; never in an offer, the assistant, a
   notification or next to a doctor (FINAL-SPEC D.4). */

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

export const programName = (id: ProgramId) => PROGRAMS.find((p) => p.id === id)?.name ?? id

export type Tier = "free" | "optimization"

/** What the membership includes, in this order (the showroom, the checkout
    and the member's billing page, S-66). */
const INCLUDED = [
  "A daily diet plan with targets",
  "Meals logged with a photo",
  "An exercise program with short videos",
  "A daily score for yesterday's goals",
  "Progress since you start, with a forecast",
  "Your plan reviewed by a physician every 3 months",
  "Unlimited questions to your assistant",
] as const

export const TIERS = {
  free: { name: "Free record" },
  optimization: {
    name: "Optimization membership",
    /** The client has not set the price (the 21 Sep deck says "$100+ per
        month"). The only place it lives. */
    price: "$100",
    period: "a month",
    included: INCLUDED,
    /** Charged separately, said before she pays (S-66). */
    excluded: ["Tests and imaging, priced when you book them", "Visits and fees at your clinic", "Medicines"],
  },
} as const

/** The price as the app writes it, everywhere it appears: "$100 a month". */
export const priceLabel = () => `${TIERS.optimization.price} ${TIERS.optimization.period}`

/** What stays free, membership or not (S-03), on the same page as the
    price. */
export const FREE_STAYS = ["Every result and trend", "Reminders and care gaps", "Booking and paying for tests", `${FREE_QUESTIONS} questions a month to your assistant`]

/** The showroom's "What you get": what the membership includes, then watch
    and scale sync, coming soon. */
export const BENEFITS: { text: string; soon?: boolean }[] = [...INCLUDED.map((text) => ({ text })), { text: "Watch and scale sync", soon: true }]

/** A day on the plan, for the showroom's example (C.14.3 b): the diet
    plan's targets, the first strength session and logging, with the score
    the sample day earns (85%, or 86% on a bone plan). Values from the
    sample profile that fits the focus. */
export function planPreview(areas: FocusArea[]): { rows: { title: string; meta: string }[]; score: number } {
  const focus: MemberFocus = areas.length > 0 && areas.every((a) => a === "bone") ? "bone" : "weight"
  const profile = PROFILES[focus]
  const [first, second] = profile.goals
  const session = Object.values(profile.sessions)[0]
  const now = new Date()
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12)
  const sample = dayScore({ memberFocus: focus, meals: { [dayKey(yesterday)]: profile.sampleMeals.yesterday } }, yesterday, now)
  return {
    rows: [
      // "Up to 1,700 kcal, at least 110 g protein": the second goal names
      // its nutrient, as the first's unit already does.
      { title: "Diet plan", meta: `${first.words}, ${second.words.charAt(0).toLowerCase()}${second.words.slice(1)} ${second.name.toLowerCase()}` },
      { title: session.title, meta: `${session.exercises.length} moves, about ${session.minutes} minutes, with short videos` },
      { title: "Log a meal", meta: "Take a photo and we count it for you" },
    ],
    score: sample.percent ?? 0,
  }
}

/** The newest approved version among a plan's versions. */
function newest(versions: Plan["versions"]) {
  return versions.reduce<Plan["versions"][number] | undefined>((a, v) => (!a || v.version > a.version ? v : a), undefined)
}

/** The member's live plan version for the plan line and the Plan tab:
    "Version 2, approved by Dr. Patel on Sep 12", and while a newer
    version is with the doctor its number (M-55: the live one stays).
    Undefined before any version is approved. */
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
    /** The version with the doctor, while one is. */
    reviewing: s.plan.status === "review" && s.plan.version > live.version ? s.plan.version : undefined,
  }
}
