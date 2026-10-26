/* The standard baseline the plan's set-up offers (Journey_7 screens 5 and
   8): the blood panel, DEXA and RMR, each with its cash price and a short
   "what it is, why it matters" for the Why? sheet. Every member gets the
   same three; nothing goal-based or optional at onboarding, so it never
   reads as a sale. All three start ticked and any can be skipped: the plan
   then uses standard averages for that measure. Step 4 (/baseline) ticks
   them; step 5 (/enrollment) breaks the cost down. Prices are the deck's. */

export type BaselineTestId = "panel" | "dexa" | "rmr"

export type BaselineTest = {
  id: BaselineTestId
  name: string
  /** Dollars, cash. */
  price: number
  /** The Why? sheet: what the test is, then what the plan gets from it. */
  what: string
  why: string
  /** What AI found about her insurance: likely covers it, or may with a
      referral. Unset: not covered. Her physician decides (/your-tests). */
  insurance?: Coverage
}

export type Coverage = "likely" | "maybe"

export const BASELINE_TESTS: Record<BaselineTestId, BaselineTest> = {
  panel: {
    id: "panel",
    name: "Comprehensive Blood Panel",
    price: 189,
    insurance: "likely",
    what: "One blood draw that checks blood sugar, cholesterol, kidney and liver function, blood counts, and key hormones and vitamins.",
    why: "It shows how your body is working on the inside today. These become the starting values your plan tracks, so every change can be measured against them.",
  },
  dexa: {
    id: "dexa",
    name: "DEXA Body Composition",
    price: 149,
    what: "A quick, low-dose scan that measures how much of your body is fat, muscle and bone, and where it sits.",
    why: "Your weight alone can't tell fat from muscle. With DEXA, your plan can aim at losing fat while protecting muscle and bone.",
  },
  rmr: {
    id: "rmr",
    name: "Resting Metabolic Rate (RMR)",
    price: 129,
    what: "A short breathing test, done sitting still, that measures how many calories your body burns at rest.",
    why: "Estimates from age and weight can be off by hundreds of calories a day. Your measured rate sets nutrition targets that fit your body.",
  },
}

/** The deck's bundle: DEXA, RMR and the blood panel together for $399. */
const BUNDLE: { ids: BaselineTestId[]; price: number } = {
  ids: ["dexa", "rmr", "panel"],
  price: 399,
}

const ALL = Object.values(BASELINE_TESTS) as BaselineTest[]

/** "$149", "$1,080". */
export const dollars = (n: number) => `$${n.toLocaleString("en-US")}`

/** Cents only when there are some: "$1,080", "$1,500.30". */
export const dollarsExact = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`

/** Her ticked tests in the list's order: all three until she clears one. */
export function chosenTests(ids: string[] | undefined): BaselineTest[] {
  if (!ids) return ALL
  const on = new Set(ids)
  return ALL.filter((t) => on.has(t.id))
}

export type AddOnId = "sleep" | "smart"

/** What /baseline offers beyond the three tests: the prices live here so
    every screen that totals them agrees. Not part of the yearly test discount. */
export const ADD_ONS: Record<AddOnId, { id: AddOnId; name: string; price: number; insurance?: Coverage }> = {
  sleep: { id: "sleep", name: "Home Sleep Study", price: 299, insurance: "maybe" },
  smart: { id: "smart", name: "SMART program", price: 100 },
}

/** The add-ons /baseline shows. The SMART program is held back for now, so
    it is never chosen, listed or charged on enrollment, payment or the
    receipt; adding it here brings it back on every screen at once. */
export const OFFERED_ADD_ONS: AddOnId[] = ["sleep"]

/** Her add-ons in the list's order: every offered one until she turns it off. */
export function chosenAddOns(ids: string[] | undefined) {
  const on = ids ? new Set(ids) : null
  return OFFERED_ADD_ONS.map((id) => ADD_ONS[id]).filter((a) => !on || on.has(a.id))
}

/** The ticked ids with one test flipped, to save back. */
export function toggleTest(ids: string[] | undefined, id: BaselineTestId) {
  const on = new Set(chosenTests(ids).map((t) => t.id))
  if (on.has(id)) on.delete(id)
  else on.add(id)
  return ALL.filter((t) => on.has(t.id)).map((t) => t.id)
}

/** What the ticked tests cost: each line, the bundle saving when all three
    of the bundle are ticked, and the total. */
export function testCosts(ids: string[] | undefined) {
  const tests = chosenTests(ids)
  const subtotal = tests.reduce((sum, t) => sum + t.price, 0)
  const bundled = BUNDLE.ids.every((id) => tests.some((t) => t.id === id))
  const saving = bundled
    ? BUNDLE.ids.reduce((sum, id) => sum + BASELINE_TESTS[id].price, 0) -
      BUNDLE.price
    : 0
  return { tests, subtotal, saving, total: subtotal - saving }
}

/* -------------------------------------------- insurance or Inlay -- */

/** When she pays for the tests (/enrollment): with the membership, and
    covered ones are refunded; or after her physician has sorted them,
    only for those booked through Inlay. Unset means now. */
export type TestPay = "now" | "later"

/** Her physician's sorting of the paid tests (/your-tests): the ids that go
    through her insurance, ordered by the office; every other one is booked
    in the app through Inlay. */
export type TestReview = { at: string; insurance: string[]; message: string }

/** What AI suggests to her physician: every test insurance likely covers
    goes through insurance. */
export function suggestedInsurance(ids: string[]) {
  return ids.filter((id) => (BASELINE_TESTS[id as BaselineTestId] ?? ADD_ONS[id as AddOnId])?.insurance === "likely")
}

/** A test or add-on by id, for the lists after payment. */
export function itemOf(id: string): { id: string; name: string; price: number } | undefined {
  return BASELINE_TESTS[id as BaselineTestId] ?? ADD_ONS[id as AddOnId]
}

/* ----------------------------------------------------------- scheduling -- */

/** Where each test is done and the times it opens on a weekday. The blood
    panel and RMR are early, as both are done fasting. */
export const TEST_SLOTS: Record<BaselineTestId, { where: string; times: string[] }> = {
  panel: { where: "Quest Diagnostics, Del Mar", times: ["7:00 AM", "7:30 AM", "8:00 AM", "9:00 AM"] },
  dexa: { where: "Coastal Imaging, Del Mar", times: ["9:00 AM", "10:30 AM", "1:30 PM", "3:00 PM"] },
  rmr: { where: "Harborview Longevity Clinic", times: ["7:30 AM", "8:30 AM", "10:00 AM"] },
}

/** The next weekdays a test can be booked on, from tomorrow. */
export function openDays(now: Date = new Date(), count = 5): Date[] {
  const days: Date[] = []
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  while (days.length < count) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d))
  }
  return days
}

/** A test left to schedule later is brought up again every other day,
    until it is booked. */
export const REMIND_EVERY_DAYS = 2

/** The latest reminder's day for tests left to schedule since `since`:
    the day she chose later, then every other day after it. */
export function lastReminderDay(since: Date, now: Date = new Date()): Date {
  const start = new Date(since.getFullYear(), since.getMonth(), since.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000))
  const back = days - (days % REMIND_EVERY_DAYS)
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + back)
}
