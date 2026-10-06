import { FREE_QUESTIONS } from "@/lib/allowance"
import { dayKey } from "@/lib/dates"
import { MEMBER, PROFILES, dayScore, type MemberFocus } from "@/lib/member"
import type { Plan, useOnboarding } from "@/lib/onboarding"
import type { FocusArea } from "@/lib/record"

/* The membership catalogue: a free record for everyone and one paid
   Optimization membership. Every practice gets every program; a program
   is what a plan focuses on, never a product with a price (B-01).

   The prices live here and only here (TIERS.optimization.billing): $100
   a month, cancel anytime, or a year paid up front at 15% off, $1,020
   (6 Oct 2026). Written one way by priceLabel(): "$100 a month". They show only on the plan
   details (the Plan tab and /plans), the checkout and the member's own
   membership page; never in an offer, the assistant, a notification or
   next to a doctor (FINAL-SPEC D.4). */

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

/** What the membership includes, in this order (the checkout and the
    member's billing page, S-66). */
const INCLUDED = [
  "Your plan, made with your doctor and reviewed every 3 months",
  "A meal plan with daily targets",
  "An exercise program with short videos",
  "Daily monitoring and a score for yesterday's goals",
  "Progress since you start, with a forecast",
  "Unlimited questions to your assistant",
] as const

/** How a member pays: monthly, cancel anytime, or a year up front for
    less. */
export type Cadence = "monthly" | "yearly"

/** The two ways to pay, in the order the checkout lists them. Yearly is
    twelve months at 15% off: $1,200 less $180. */
const BILLING: Record<Cadence, { name: string; price: string; period: string; months: number; note: string; save?: string }> = {
  monthly: { name: "Monthly", price: "$100", period: "a month", months: 1, note: "Cancel anytime" },
  yearly: { name: "Yearly", price: "$1,020", period: "a year", months: 12, note: "Paid once a year", save: "Save 15%" },
}

export const CADENCES: Cadence[] = ["monthly", "yearly"]

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
    month", or "$1,020 a year". */
export const priceLabel = (cadence: Cadence = "monthly") => `${BILLING[cadence].price} ${BILLING[cadence].period}`

/** One charge's amount for a cadence: "$100". */
export const priceOf = (cadence: Cadence = "monthly") => BILLING[cadence].price

/** What stays free, membership or not (S-03), on the same page as the
    price. */
export const FREE_STAYS = ["Every result and trend", "Reminders and care gaps", "Booking and paying for tests", `${FREE_QUESTIONS} questions a week to your assistant`]

/* The upsell's words (6 Oct 2026). Placeholder copy: Fynn's team is
   sending the final wording; swap it in here when it arrives. */

/** The upsell's lead line. */
export const UPSELL_LEAD = "A personal plan built from your own record, with your doctor."

/** What a plan can work toward: more than diet, in her own terms. */
export const GOALS: { text: string; program: ProgramId }[] = [
  { text: "Lower your A1c", program: "metabolic" },
  { text: "Protect your bones", program: "bone" },
  { text: "Reach a healthy weight", program: "weight" },
  { text: "Bring down blood pressure", program: "pressure" },
  { text: "Improve your cholesterol", program: "heart" },
  { text: "Build strength", program: "strength" },
  { text: "Sleep better", program: "sleep" },
]

/** The upsell's "What you get": a title and its line each, her doctor
    first, then the program, the daily watch and her devices. */
export const BENEFITS: { title: string; text: string; soon?: boolean }[] = [
  { title: "Your doctor, on your side", text: "Your doctor reviews and approves your plan, then checks in on it every 3 months." },
  { title: "Meals and exercise made for you", text: "A meal plan with daily targets and an exercise program with short videos." },
  { title: "Someone watching every day", text: "Daily monitoring of your numbers, with a score for how yesterday went." },
  { title: "Your wearables, connected", text: "Bring in your watch, ring or scale so your plan sees your real days.", soon: true },
]

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
