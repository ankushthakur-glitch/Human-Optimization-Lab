import { dayKey } from "@/lib/dates"
import type { useOnboarding } from "@/lib/onboarding"
import { BIOMARKERS, STEADY_RECORD, withBatches, type Biomarker, type FocusArea, type Point } from "@/lib/record"
import { formatNumber, pointTime, resultsOf, valueText } from "@/lib/trends"

/* The Optimization member's day, for the sample patient Olivia: what to do
   today, how yesterday went against her goals, what is booked this week,
   and how far she has come since she started (catalog section 3).

   Olivia joined on May 3, 2026. Her one plan focuses on blood sugar, weight
   and heart; version 2 was approved by Dr. Maya Patel on Sep 12 and the
   next review is in December. Devices come later through Terra, so every
   home measurement (weight, waist, blood pressure) is entered by hand and
   meals are logged by photo, voice or typing.

   What happened on a fixed day (weigh-ins, home readings, plan versions)
   keeps its real date. What depends on today (today's plan, yesterday's
   score, the last 30 days, this week's bookings) is worked out from the
   device's date, so the demo reads right on any day. What the patient
   logs in the app lives in the onboarding store and wins over the sample.
   Invented values for the sample patient, never a real person's. */

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]

/* ---------------------------------------------------------- local days -- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const pad = (n: number) => String(n).padStart(2, "0")
const DAY_MS = 86400000

/** The key a member's day is kept under, in local time ("2026-10-01"), so
    a California evening never rolls into tomorrow: lib/dates.ts dayKey.
    Use it for every store field keyed by day (meals, exercises). */
export const localDay = dayKey

/** A day key, or an ISO date or time, back to a date at local noon. */
export function dayFrom(key: string): Date {
  const [y, m, d] = key.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d, 12)
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

/** A stored date or time as a date: a bare day key at local noon, a local
    day and time ("2026-10-21T10:30", as TodoItem dates are) as it reads,
    and an ISO time with its zone (saved in UTC) on the device's clock. */
export function dateOfAt(at: string): Date {
  const local = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(at)
  if (local) return new Date(+local[1], +local[2] - 1, +local[3], +local[4], +local[5], +(local[6] ?? 0))
  return at.length > 10 ? new Date(at) : dayFrom(at)
}

/** The local day of a stored date: a day key as it is, a time converted to
    the device's day. */
export const dayOfAt = (at: string) => (at.length > 10 ? localDay(dateOfAt(at)) : at.slice(0, 10))

/** A date, or a stored date or time read with dateOfAt. */
const asDate = (d: Date | string) => (typeof d === "string" ? dateOfAt(d) : d)

/** Whole days from a to b, by calendar day. */
export const daysBetween = (a: Date, b: Date) => Math.round((dayFrom(localDay(b)).getTime() - dayFrom(localDay(a)).getTime()) / DAY_MS)

/** "Wed, Sep 30", from a date or a stored date. */
export const dayLabel = (date: Date | string) => {
  const d = asDate(date)
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

/** "Sep 30", from a date or a stored date. */
export const shortDay = (date: Date | string) => {
  const d = asDate(date)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

/** "Wed" */
export const weekdayOf = (date: Date | string) => WEEKDAYS[asDate(date).getDay()]

/** "7:30 AM" */
export function clock(hours: number, minutes = 0): string {
  const h = hours % 12 || 12
  return `${h}:${pad(minutes)} ${hours < 12 ? "AM" : "PM"}`
}

/** "7:30 AM" for a date or a stored time. */
export const clockOf = (date: Date | string) => {
  const d = asDate(date)
  return clock(d.getHours(), d.getMinutes())
}

/** The Monday a day's week starts on, as a day key. */
export function weekOf(d: Date): string {
  const back = (d.getDay() + 6) % 7
  return localDay(addDays(d, -back))
}

/* ---------------------------------------------------------- the member -- */

export const MEMBER = {
  /** The day the membership started and the baseline was taken. Frozen. */
  start: "2026-05-03",
  startLabel: "May 3, 2026",
  doctor: "Dr. Maya Patel",
  doctorShort: "Dr. Patel",
  /** What the one plan works on, in the order the plan lists them. */
  focus: ["blood sugar", "weight", "heart"] as FocusArea[],
  focusLine: "Blood sugar, weight and heart",
  /** For resting energy: 5 ft 2.8 in, born Mar 14, 1981. */
  heightIn: 62.8,
  born: "1981-03-14",
  goalWeight: 175,
} as const

/** Week 1 is the week the membership started. */
const weekNumber = (now: Date = new Date()) => Math.floor(daysBetween(dayFrom(MEMBER.start), now) / 7) + 1

export type PlanVersion = {
  version: number
  status: "Active" | "Superseded" | "Pending review" | "Draft" | "Paused" | "Completed"
  approved: string
  at: string
  by: string
  /** "Why did my plan change?" in plain words (M-53). */
  why: string
  /** The one line the store keeps for this version. */
  short: string
  changes: string[]
}

/** Every version is kept; the newest approved one is live (M-52). */
export const PLAN_VERSIONS: PlanVersion[] = [
  {
    version: 2,
    status: "Active",
    approved: "Sep 12, 2026",
    at: "2026-09-12",
    by: "Dr. Maya Patel",
    short: "Your home blood pressure readings",
    why: "Your home blood pressure readings were above your range in late August, so Dr. Patel added an evening blood pressure check and a sodium limit, and made the walk after dinner a daily habit.",
    changes: [
      "Check your blood pressure every evening",
      "Sodium: at most 2,300 mg a day",
      "Walk after dinner every day, up from three evenings a week",
      "Strength sessions now alternate lower and upper body",
    ],
  },
  {
    version: 1,
    status: "Superseded",
    approved: "May 18, 2026",
    at: "2026-05-18",
    by: "Dr. Maya Patel",
    short: "Your first plan",
    why: "Your first plan, built from your record, your questionnaire and your why.",
    changes: [
      "Up to 1,700 kcal a day, with at least 110 g protein and 28 g fiber",
      "Added sugar: at most 25 g a day",
      "Strength three times a week",
      "Walk after dinner three evenings a week",
      "Weigh in every Thursday morning",
    ],
  },
]

/** The next version while it is with the doctor (sample data until plans
    come from the server, C.16.1 item 2): what is changing in it. */
export const PLAN_DRAFT = {
  changes: ["Protein up to 120 g a day", "Strength sessions up to 25 minutes", "Weigh in on Mondays too"],
} as const

/** Physician reviews are quarterly (M-56). */
export const NEXT_REVIEW = { month: "December", at: "2026-12-08", words: "Next review in December" } as const

/** The plan line under the member's greeting (3.2). */
export function planLine(versions: { version: number; approved: string }[] = PLAN_VERSIONS) {
  const live = versions[0]
  if (!live) return ""
  return `Version ${live.version}, approved by ${MEMBER.doctorShort} on ${live.approved.replace(/, \d{4}$/, "")}`
}

export type MemberStage = "review" | "live" | "redraft" | "paused"

/** Whether a membership has ended: cancelled, and the paid month it ran
    to (`endsAt`) is over. Until then she is still a member. */
export function membershipEnded(m: Snapshot["membership"], now: Date = new Date()): boolean {
  if (!m?.cancelledAt) return false
  const ends = m.endsAt ? Date.parse(m.endsAt) : NaN
  return Number.isNaN(ends) || ends <= now.getTime()
}

/** A membership that is on: joined, and not cancelled past its paid month.
    Every rule that tells a member apart reads this, so a membership ends
    everywhere on the same day. */
export const membershipOn = (m: Snapshot["membership"], now: Date = new Date()) => m?.tier === "optimization" && !membershipEnded(m, now)

/** Where a member is: version 1 with the doctor (or not drafted yet), live,
    live with a new version in review, or paused. A cancelled membership
    stays a membership until its paid month runs out (`endsAt`, C.17), then
    reads as the free record. Undefined for a patient on the free record. */
export function memberStage(s: Snapshot, now: Date = new Date()): MemberStage | undefined {
  if (!s.membership || !membershipOn(s.membership, now)) return undefined
  if (s.membership.paused) return "paused"
  if (!s.plan || s.plan.status !== "live") return s.plan?.versions.length ? "redraft" : "review"
  return "live"
}

/* ------------------------------------------------------------ nutrition -- */

export type NutrientId = "calories" | "protein" | "fiber" | "addedSugar" | "sodium" | "satFat" | "calcium"

/** Known amounts only: a nutrient a food has no value for is left out, and
    a total that misses one is partial, never zero (M-17). */
export type Nutrients = Partial<Record<NutrientId, number>>

export const NUTRIENTS: Record<NutrientId, { name: string; unit: "kcal" | "g" | "mg"; plural?: boolean }> = {
  calories: { name: "Calories", unit: "kcal", plural: true },
  protein: { name: "Protein", unit: "g" },
  fiber: { name: "Fiber", unit: "g" },
  addedSugar: { name: "Added sugar", unit: "g" },
  sodium: { name: "Sodium", unit: "mg" },
  satFat: { name: "Saturated fat", unit: "g" },
  calcium: { name: "Calcium", unit: "mg" },
}

export type Goal = {
  id: NutrientId
  name: string
  unit: "kcal" | "g" | "mg"
  /** "At least" goals count up to 100%; "at most" goals lose credit past the limit. */
  kind: "atLeast" | "atMost"
  target: number
  focus: FocusArea
  /** "At least 110 g", "Up to 1,700 kcal" */
  words: string
  /** Food first ideas, never a meal plan (M-13). */
  examples: string[]
}

const goal = (id: NutrientId, kind: Goal["kind"], target: number, focus: FocusArea, examples: string[]): Goal => {
  const { name, unit } = NUTRIENTS[id]
  const amount = `${formatNumber(target)} ${unit}`
  return { id, name, unit, kind, target, focus, examples, words: kind === "atLeast" ? `At least ${amount}` : id === "calories" ? `Up to ${amount}` : `At most ${amount}` }
}

/** Olivia's merged plan: one target per nutrient, at most five, in the
    plan's order (M-06, M-25). */
export const GOALS: Goal[] = [
  goal("calories", "atMost", 1700, "weight", [
    "Half the plate vegetables, a palm of protein, a fist of whole grains",
    "Water, tea or black coffee instead of juice",
    "Cook with a teaspoon of oil rather than a pour",
  ]),
  goal("protein", "atLeast", 110, "weight", [
    "Greek yogurt, 1 cup: about 20 g",
    "Two eggs: 12 g",
    "A palm sized chicken breast: about 30 g",
    "Lentils, 1 cup cooked: 18 g",
  ]),
  goal("fiber", "atLeast", 28, "blood sugar", [
    "Raspberries, 1 cup: 8 g",
    "Black beans, half a cup: 8 g",
    "Chia seeds, 2 tablespoons: 10 g",
    "Oats, half a cup dry: 4 g",
  ]),
  goal("addedSugar", "atMost", 25, "blood sugar", [
    "Plain yogurt with fruit instead of flavored",
    "Whole fruit instead of juice",
    "Check sauces: teriyaki and ketchup add up",
  ]),
  goal("sodium", "atMost", 2300, "heart", [
    "Cook at home most nights",
    "Rinse canned beans and vegetables",
    "Fresh chicken or turkey instead of deli meat",
  ]),
]

/** The diet plan as daily targets and food ideas (M-13, Q-13 default). */
export const DIET_PLAN = {
  title: "Your daily targets",
  summary: "Up to 1,700 kcal, with at least 110 g protein and 28 g fiber",
  deficit: "Aim to eat about 300 kcal less than you burn",
  ideas: [
    { name: "Lentil and chicken soup", line: "34 g protein, 11 g fiber, 420 kcal" },
    { name: "Salmon, quinoa and greens", line: "38 g protein, 8 g fiber, 520 kcal" },
    { name: "Greek yogurt with berries and chia", line: "24 g protein, 9 g fiber, 280 kcal" },
    { name: "Black bean and veggie chili", line: "22 g protein, 15 g fiber, 390 kcal" },
  ],
  slots: [
    { slot: "breakfast", line: "Protein first: eggs or Greek yogurt, with fruit" },
    { slot: "lunch", line: "Half the plate vegetables, a palm of protein, a fist of whole grains" },
    { slot: "dinner", line: "Lean protein and two vegetables, then your walk" },
    { slot: "snack", line: "Fruit with nuts, or hummus and carrots" },
  ] as { slot: MealSlot; line: string }[],
} as const

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack"

export const MEAL_SLOTS: { id: MealSlot; name: string; main: boolean }[] = [
  { id: "breakfast", name: "Breakfast", main: true },
  { id: "lunch", name: "Lunch", main: true },
  { id: "snack", name: "Snack", main: false },
  { id: "dinner", name: "Dinner", main: true },
]

/** The slot a meal logged now most likely belongs to. */
export function slotAt(now: Date = new Date()): MealSlot {
  const h = now.getHours() + now.getMinutes() / 60
  if (h < 10.5) return "breakfast"
  if (h < 15) return "lunch"
  if (h < 17) return "snack"
  return "dinner"
}

const SLOT_ORDER = MEAL_SLOTS.map((m) => m.id)
const MAIN_SLOTS = MEAL_SLOTS.filter((m) => m.main).map((m) => m.id)

/** The meal to log next, by the hour and what is already logged today
    (C.2.3), so the Log a meal door, the focus line and Yesterday's "Log
    today's lunch" always name the same meal. `main` is the main meal the
    day needs next: this hour's while it is still to log; else the latest
    one before it ("lunch" at 4 PM, never "missed"), `late`; else the next
    one ahead; none once breakfast, lunch and dinner are in. `slot` is what
    Log a meal opens with: that meal, or a snack in its own hours when no
    earlier main meal is still to log. */
export function mealToLog(logged: ReadonlySet<MealSlot>, now: Date = new Date()): { slot: MealSlot; main?: MealSlot; late: boolean } {
  const current = slotAt(now)
  const at = SLOT_ORDER.indexOf(current)
  const open = MAIN_SLOTS.filter((id) => !logged.has(id))
  if (open.includes(current)) return { slot: current, main: current, late: false }
  const late = open.filter((id) => SLOT_ORDER.indexOf(id) < at).at(-1)
  if (late) return { slot: late, main: late, late: true }
  const main = open.find((id) => SLOT_ORDER.indexOf(id) > at)
  return { slot: current === "snack" && !logged.has("snack") ? "snack" : (main ?? "snack"), main, late: false }
}

/** The main meals not logged yet whose hour has not passed (this hour's
    included), in order. */
const mainsAhead = (logged: ReadonlySet<MealSlot>, now: Date) =>
  MAIN_SLOTS.filter((id) => !logged.has(id) && SLOT_ORDER.indexOf(id) >= SLOT_ORDER.indexOf(slotAt(now)))

export type Food = {
  name: string
  /** "About 1 cup" */
  portion: string
  /** How sure the photo or voice reading is. */
  confidence: "high" | "medium" | "low"
  nutrients: Nutrients
}

export type Meal = {
  id: string
  /** The meal in a few words: "Turkey sandwich and an apple". Without it,
      mealName() joins the foods. */
  title?: string
  slot: MealSlot
  /** "7:50 AM" */
  time: string
  how: "photo" | "voice" | "typed" | "again" | "scan"
  foods: Food[]
  /** Checked by the patient, or kept as an estimate after "Not sure"
      (shown as Estimated, M-16). */
  status: "confirmed" | "estimated"
  /** The answer to the hidden fats and portion questions. */
  note?: string
}

/** A nutrient total: partial when some food had no value for it. */
export type Amount = { value: number; partial: boolean; estimated: boolean }

/** What a set of meals adds up to, nutrient by nutrient. */
export function totalsOf(meals: Meal[]): Partial<Record<NutrientId, Amount>> {
  const out: Partial<Record<NutrientId, Amount>> = {}
  const foods = meals.flatMap((m) => m.foods.map((f) => ({ f, estimated: m.status === "estimated" })))
  if (!foods.length) return out
  for (const id of Object.keys(NUTRIENTS) as NutrientId[]) {
    const known = foods.filter(({ f }) => f.nutrients[id] !== undefined)
    if (!known.length) continue
    out[id] = {
      value: known.reduce((s, { f }) => s + (f.nutrients[id] ?? 0), 0),
      partial: known.length < foods.length,
      estimated: known.some((k) => k.estimated),
    }
  }
  return out
}

/** A meal in a few words: its title, else its foods joined ("Hummus and
    baby carrots"). */
export function mealName(meal: Meal): string {
  if (meal.title) return meal.title
  const names = meal.foods.map((f, i) => (i ? f.name.charAt(0).toLowerCase() + f.name.slice(1) : f.name))
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "")
}

/** One meal's line on her plan, the same wherever a meal is listed (the
    diet plan, a day, log again): its energy, then what the plan is built
    around, "355 kcal, 22 g protein" on the weight plan and "280 kcal, 250
    mg calcium, 20 g protein" on the bone plan. The plan is required, so no
    screen can leave its key nutrient out. A nutrient the meal has no value
    for is left out, never shown as zero (M-17). Each amount holds its unit
    and its name ("250 mg calcium"), so a wrapped line breaks only after a
    comma. */
export function mealLine(meal: Meal, plan: Pick<MemberProfile, "mealNutrients">): string {
  const t = totalsOf([meal])
  return plan.mealNutrients
    .map((id) => {
      const a = t[id]
      if (!a) return undefined
      const { name, unit } = NUTRIENTS[id]
      const amount = `${formatNumber(Math.round(a.value))} ${unit}`
      return id === "calories" ? amount : `${amount} ${name.toLowerCase()}`
    })
    .filter(Boolean)
    .join(", ")
}

/** A food in the sample meals: name, portion, how sure the reading was, and
    calories, protein, fiber, added sugar and sodium. */
const food = (name: string, portion: string, confidence: Food["confidence"], [calories, protein, fiber, addedSugar, sodium]: number[]): Food => ({
  name,
  portion,
  confidence,
  nutrients: { calories, protein, fiber, addedSugar, sodium },
})

/** The meals one sample day held, for the demo seed (FINAL-SPEC E.3):
    yesterday complete, the dinner said aloud and kept as an estimate
    (1,590 kcal, 80 g protein, 20 g fiber, 29 g added sugar, 1,990 mg
    sodium: 85%, "Fiber was 8 g short"), today with breakfast only. */
export const SAMPLE_MEALS: { yesterday: Meal[]; today: Meal[] } = {
  yesterday: [
    {
      id: "y-breakfast",
      title: "Vanilla Greek yogurt, granola and strawberries",
      slot: "breakfast",
      time: "7:50 AM",
      how: "photo",
      status: "confirmed",
      foods: [
        food("Vanilla Greek yogurt", "1 cup", "high", [190, 18, 0, 12, 75]),
        food("Granola", "A quarter cup", "medium", [140, 3, 2, 6, 40]),
        food("Strawberries", "Half a cup", "high", [25, 1, 2, 0, 1]),
      ],
    },
    {
      id: "y-lunch",
      title: "Turkey sandwich and an apple",
      slot: "lunch",
      time: "12:40 PM",
      how: "photo",
      status: "confirmed",
      foods: [food("Turkey sandwich on whole grain bread", "1 sandwich", "high", [380, 22, 4, 4, 1050]), food("Apple", "1 medium", "high", [95, 1, 4, 0, 2])],
    },
    {
      id: "y-snack",
      title: "Hummus and baby carrots",
      slot: "snack",
      time: "3:30 PM",
      how: "typed",
      status: "confirmed",
      foods: [food("Hummus", "3 tablespoons", "high", [105, 3, 3, 0, 240]), food("Baby carrots", "8 carrots", "high", [30, 1, 2, 0, 60])],
    },
    {
      id: "y-dinner",
      title: "Chicken stir fry and white rice",
      slot: "dinner",
      time: "7:10 PM",
      how: "voice",
      status: "estimated",
      note: "Sauce: not sure",
      foods: [food("Chicken stir fry with vegetables", "About 1.5 cups", "medium", [420, 27, 2, 7, 520]), food("White rice", "About 1 cup", "medium", [205, 4, 1, 0, 2])],
    },
  ],
  today: [
    {
      id: "t-breakfast",
      title: "Scrambled eggs, toast, avocado and raspberries",
      slot: "breakfast",
      time: "8:05 AM",
      how: "photo",
      status: "confirmed",
      foods: [
        food("Scrambled eggs", "2 eggs", "high", [180, 12, 0, 0, 340]),
        food("Whole grain toast", "1 slice", "high", [80, 4, 2, 1, 130]),
        food("Avocado", "A quarter", "medium", [60, 1, 3, 0, 3]),
        food("Raspberries", "Half a cup", "high", [32, 1, 4, 0, 1]),
      ],
    },
  ],
}

/** The bone profile's sample meals, with calories, protein and calcium
    (FINAL-SPEC E.3): yesterday 1,850 kcal, 80 g protein and 800 mg
    calcium, 86%, "Calcium was 200 mg short"; today a yogurt breakfast. */
const boneFood = (name: string, portion: string, [calories, protein, calcium]: number[]): Food => ({
  name,
  portion,
  confidence: "high",
  nutrients: { calories, protein, calcium },
})

export const BONE_SAMPLE_MEALS: { yesterday: Meal[]; today: Meal[] } = {
  yesterday: [
    {
      id: "y-breakfast",
      title: "Oatmeal with milk and blueberries",
      slot: "breakfast",
      time: "7:50 AM",
      how: "photo",
      status: "confirmed",
      foods: [boneFood("Oatmeal made with milk", "1 cup", [300, 12, 300]), boneFood("Blueberries", "Half a cup", [50, 1, 5])],
    },
    {
      id: "y-lunch",
      title: "Chicken salad wrap and an apple",
      slot: "lunch",
      time: "12:40 PM",
      how: "photo",
      status: "confirmed",
      foods: [boneFood("Chicken salad wrap", "1 wrap", [430, 24, 170]), boneFood("Apple", "1 medium", [90, 1, 10])],
    },
    {
      id: "y-snack",
      title: "Almonds and a clementine",
      slot: "snack",
      time: "3:30 PM",
      how: "typed",
      status: "confirmed",
      foods: [boneFood("Almonds", "A small handful", [160, 6, 75]), boneFood("Clementine", "1", [35, 1, 25])],
    },
    {
      id: "y-dinner",
      title: "Salmon, brown rice and kale",
      slot: "dinner",
      time: "7:10 PM",
      how: "photo",
      status: "confirmed",
      foods: [
        boneFood("Salmon fillet", "About 5 oz", [290, 30, 15]),
        boneFood("Brown rice", "About 1 cup", [220, 4, 20]),
        boneFood("Kale cooked in olive oil", "About 1 cup", [275, 1, 180]),
      ],
    },
  ],
  today: [
    {
      id: "t-breakfast",
      title: "Greek yogurt with almonds",
      slot: "breakfast",
      time: "8:05 AM",
      how: "photo",
      status: "confirmed",
      foods: [boneFood("Greek yogurt with almonds", "1 bowl", [280, 20, 250])],
    },
  ],
}

/* ------------------------------------------------------------ the score -- */

export type GoalResult = {
  goal: Goal
  /** What was eaten; undefined when nothing that day has a value for it. */
  amount?: Amount
  /** 0 to 1 under the score rule; undefined on a day that is not scored. */
  credit?: number
  /** Only on a complete day: a partial day is never "goal met" (M-28). */
  met: boolean
  /** "91 of 110 g", "29 of 25 g limit", "41 of 110 g so far" */
  words: string
  /** "19 g short", "4 g over"; undefined when met or not scored. */
  gap?: string
}

export type Energy = {
  /** Estimated from weight, height, age and sex (Mifflin St Jeor). */
  resting: number
  /** Everyday movement plus logged exercise, estimated until a device connects. */
  active: number
  burned: number
  intake: number
  /** (resting + active) minus intake, never active minus resting (M-27). */
  deficit: number
  estimated: true
  /** "About 280 kcal under what you burned" */
  words: string
}

export type DayScore = {
  /** Local day key. */
  day: string
  date: Date
  /** "Wed, Sep 30" */
  label: string
  /** today: still going; complete: every main meal logged; partial: some;
      none: nothing logged. Only complete days are scored. */
  status: "complete" | "partial" | "none" | "today"
  /** The daily score, rounded down; only on a complete day (M-29). */
  percent?: number
  results: GoalResult[]
  met: number
  total: number
  /** One line, a fact: "Fiber was 6 g short", "Dinner wasn't logged". */
  coaching: string
  /** The goal behind the coaching line. */
  shortfall?: GoalResult
  missing: MealSlot[]
  meals: Meal[]
  mealCount: number
  energy?: Energy
  /** "log" when the patient's own meals are in the store, else "sample". */
  source: "log" | "sample"
  /** Meals kept as estimates that day; the totals card carries one label for
      them (M-17) rather than a tag on every row. */
  estimatedMeals: number
  /** "Includes 1 estimated meal" */
  estimateNote?: string
  /** "89%", "Partial day", "Nothing logged", "So far" */
  scoreWord: string
  /** The walk after dinner was done (her log, or the sample). */
  walked: boolean
  /** The day's strength session and whether it was done; none on a rest
      day. */
  strength?: { session: Session; done: boolean }
}

/** One goal's credit under M-29. */
export function creditOf(g: Goal, value: number): number {
  if (g.kind === "atLeast") return Math.min(value / g.target, 1)
  return value <= g.target ? 1 : Math.max(0, 1 - (value - g.target) / g.target)
}

function resultOf(g: Goal, amount: Amount | undefined, scored: boolean, soFar: boolean): GoalResult {
  if (!amount) return { goal: g, met: false, words: `No ${g.name.toLowerCase()} data`, credit: undefined }
  const shown = Math.round(amount.value)
  const target = `${formatNumber(g.target)} ${g.unit}`
  const limit = g.kind === "atMost" && g.id !== "calories" ? " limit" : ""
  const words = `${formatNumber(shown)} of ${target}${limit}${soFar ? " so far" : ""}`
  if (!scored || amount.partial) return { goal: g, amount, met: false, words }
  const credit = creditOf(g, shown)
  const met = credit >= 1
  const diff = g.kind === "atLeast" ? g.target - shown : shown - g.target
  const gap = met ? undefined : `${formatNumber(diff)} ${g.unit} ${g.kind === "atLeast" ? "short" : "over"}`
  return { goal: g, amount, credit, met, words, gap }
}

/** The coaching line: the largest shortfall as a fact, never a judgement (M-30, M-63). */
function coachingOf(results: GoalResult[]): { line: string; shortfall?: GoalResult } {
  const short = results
    .filter((r) => r.credit !== undefined && !r.met && r.amount)
    .map((r) => ({ r, share: Math.abs((Math.round(r.amount!.value) - r.goal.target) / r.goal.target) }))
    .sort((a, b) => b.share - a.share)[0]
  if (!short) return { line: "You met every goal" }
  const { r } = short
  const verb = NUTRIENTS[r.goal.id].plural ? "were" : "was"
  const tail = r.goal.kind === "atLeast" ? r.gap : `${r.gap} your limit`
  return { line: `${r.goal.name} ${verb} ${tail}`, shortfall: r }
}

const SLOT_NAME: Record<MealSlot, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" }

function missingWords(missing: MealSlot[]) {
  if (!missing.length) return ""
  const names = missing.map((m, i) => (i ? SLOT_NAME[m].toLowerCase() : SLOT_NAME[m]))
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0]
  return `${list} ${names.length > 1 ? "weren't" : "wasn't"} logged`
}

/** One day of the sample history, by days before today (-2 is the day
    before yesterday): how much was logged, the main meal missing on a
    partial day, what was eaten, and whether the walk was done. */
export type SampleDay = { day: number; status: "complete" | "partial" | "none"; missing?: MealSlot; intake?: Nutrients; walk?: boolean }

/** A day's intake before any meals exist in the store: the sample history,
    by days before today. Generated once with the score rule in mind; days
    10 and 20 have nothing logged, three days are partial. */
const SAMPLE_DAYS: SampleDay[] = [
  { day: -2, status: "complete", intake: { calories: 1590, protein: 100, fiber: 22, addedSugar: 18, sodium: 1900 } },
  { day: -3, status: "complete", intake: { calories: 1600, protein: 105, fiber: 24, addedSugar: 23, sodium: 2090 } },
  { day: -4, status: "partial", missing: "dinner", intake: { calories: 1120, protein: 66, fiber: 12, addedSugar: 15, sodium: 1450 } },
  { day: -5, status: "complete", intake: { calories: 1640, protein: 82, fiber: 18, addedSugar: 15, sodium: 1980 } },
  { day: -6, status: "complete", walk: false, intake: { calories: 1630, protein: 96, fiber: 25, addedSugar: 16, sodium: 2100 } },
  { day: -7, status: "complete", intake: { calories: 1750, protein: 83, fiber: 25, addedSugar: 30, sodium: 2640 } },
  { day: -8, status: "complete", intake: { calories: 1680, protein: 82, fiber: 19, addedSugar: 28, sodium: 2550 } },
  { day: -9, status: "complete", intake: { calories: 1630, protein: 92, fiber: 20, addedSugar: 17, sodium: 2250 } },
  { day: -10, status: "none", walk: false },
  { day: -11, status: "complete", intake: { calories: 1550, protein: 98, fiber: 24, addedSugar: 13, sodium: 2060 } },
  { day: -12, status: "complete", intake: { calories: 1700, protein: 80, fiber: 22, addedSugar: 19, sodium: 1920 } },
  { day: -13, status: "complete", walk: false, intake: { calories: 1640, protein: 96, fiber: 19, addedSugar: 22, sodium: 2160 } },
  { day: -14, status: "complete", intake: { calories: 1790, protein: 100, fiber: 21, addedSugar: 28, sodium: 2240 } },
  { day: -15, status: "partial", missing: "lunch", intake: { calories: 1200, protein: 56, fiber: 13, addedSugar: 16, sodium: 1560 } },
  { day: -16, status: "complete", intake: { calories: 1570, protein: 106, fiber: 17, addedSugar: 13, sodium: 2090 } },
  { day: -17, status: "complete", intake: { calories: 1710, protein: 101, fiber: 17, addedSugar: 9, sodium: 2110 } },
  { day: -18, status: "complete", intake: { calories: 1560, protein: 87, fiber: 26, addedSugar: 23, sodium: 2080 } },
  { day: -19, status: "complete", intake: { calories: 1630, protein: 99, fiber: 28, addedSugar: 21, sodium: 2130 } },
  { day: -20, status: "none", walk: false },
  { day: -21, status: "complete", walk: false, intake: { calories: 1760, protein: 75, fiber: 24, addedSugar: 32, sodium: 2530 } },
  { day: -22, status: "complete", intake: { calories: 1580, protein: 83, fiber: 23, addedSugar: 21, sodium: 2420 } },
  { day: -23, status: "complete", intake: { calories: 1680, protein: 86, fiber: 28, addedSugar: 21, sodium: 2030 } },
  { day: -24, status: "complete", intake: { calories: 1630, protein: 101, fiber: 23, addedSugar: 24, sodium: 1940 } },
  { day: -25, status: "complete", intake: { calories: 1580, protein: 104, fiber: 23, addedSugar: 15, sodium: 2200 } },
  { day: -26, status: "complete", intake: { calories: 1710, protein: 92, fiber: 19, addedSugar: 18, sodium: 2030 } },
  { day: -27, status: "partial", missing: "dinner", intake: { calories: 1080, protein: 73, fiber: 14, addedSugar: 16, sodium: 1260 } },
  { day: -28, status: "complete", walk: false, intake: { calories: 1660, protein: 93, fiber: 23, addedSugar: 31, sodium: 2510 } },
  { day: -29, status: "complete", intake: { calories: 1730, protein: 89, fiber: 22, addedSugar: 27, sodium: 2490 } },
  { day: -30, status: "complete", intake: { calories: 1650, protein: 96, fiber: 25, addedSugar: 21, sodium: 2370 } },
]

/** The bone profile's history: the weight profile's days, logged or not,
    with a seven day pattern of calories, calcium and protein (a partial
    day about two thirds of it). Calcium meets its goal on six of the seven
    days, so the progress card reads about 21 of 30. */
const BONE_PATTERN: [number, number, number][] = [
  [1880, 1050, 95],
  [1950, 1020, 102],
  [1700, 600, 60],
  [1820, 1080, 88],
  [1900, 1000, 99],
  [2050, 1040, 84],
  [1790, 1100, 104],
]
const BONE_SAMPLE_DAYS: SampleDay[] = SAMPLE_DAYS.map((d) => {
  if (d.status === "none") return d
  const [calories, calcium, protein] = BONE_PATTERN[(-d.day - 2) % BONE_PATTERN.length]
  const share = d.status === "partial" ? 2 / 3 : 1
  return { ...d, intake: { calories: Math.round(calories * share), calcium: Math.round((calcium * share) / 10) * 10, protein: Math.round(protein * share) } }
})

const asAmounts = (n: Nutrients): Partial<Record<NutrientId, Amount>> =>
  Object.fromEntries(Object.entries(n).map(([k, v]) => [k, { value: v as number, partial: false, estimated: false }]))

/** The meals the patient logged on a day, from the store. */
export const mealsOn = (s: Snapshot, day: string): Meal[] => s.meals?.[day] ?? []

/** How one day went against the plan's goals. Today is never scored; a
    partly logged day shows subtotals with "so far"; a day with nothing
    logged has no score and no blame (M-28, M-29, M-31). */
export function dayScore(s: Snapshot, date: Date, now: Date = new Date()): DayScore {
  const profile = profileOf(s)
  const day = localDay(date)
  const offset = daysBetween(now, date)
  const meals = mealsOn(s, day)
  const sample = meals.length || offset >= 0 ? undefined : profile.sampleDays.find((d) => d.day === offset)
  const source: DayScore["source"] = meals.length || !sample ? "log" : "sample"

  let status: DayScore["status"]
  let missing: MealSlot[] = []
  let totals: Partial<Record<NutrientId, Amount>>
  let mealCount: number
  if (source === "sample" && sample) {
    status = sample.status
    missing = sample.missing ? [sample.missing] : []
    totals = sample.intake ? asAmounts(sample.intake) : {}
    mealCount = sample.status === "none" ? 0 : sample.status === "partial" ? 2 : 4
  } else {
    const logged = new Set(meals.map((m) => m.slot))
    missing = MEAL_SLOTS.filter((m) => m.main && !logged.has(m.id)).map((m) => m.id)
    status = offset >= 0 ? "today" : !meals.length ? "none" : missing.length ? "partial" : "complete"
    totals = totalsOf(meals)
    mealCount = meals.length
  }

  const scored = status === "complete"
  const results = profile.goals.map((g) => resultOf(g, totals[g.id], scored, status === "partial" || status === "today"))
  const credits = results.map((r) => r.credit).filter((c): c is number => c !== undefined)
  const percent = scored && credits.length ? Math.floor((100 * credits.reduce((a, c) => a + c, 0)) / credits.length) : undefined
  const coaching =
    status === "none"
      ? "Nothing logged"
      : status === "partial"
        ? missingWords(missing)
        : status === "today"
          ? "So far today"
          : coachingOf(results).line
  const shortfall = scored ? coachingOf(results).shortfall : undefined
  const intake = totals.calories?.value
  const estimatedMeals = meals.filter((m) => m.status === "estimated").length
  const walked = source === "sample" ? sample?.walk !== false && status !== "none" : Boolean(s.exercises?.[day]?.walk)
  const planned = profile.sessionOn(date)
  const strength = source === "sample" ? Boolean(planned) && status !== "none" : Boolean(sessionDone(s, date))
  return {
    day,
    date,
    label: dayLabel(date),
    status,
    percent,
    results,
    met: results.filter((r) => r.met).length,
    total: results.length,
    coaching,
    shortfall,
    missing,
    meals,
    mealCount,
    // The energy balance belongs to a weight focus, and only a complete day (M-27, M-28).
    energy: profile.energy && scored && intake !== undefined ? energyOf(intake, weightOn(s, date), { walk: walked, strength }) : undefined,
    source,
    estimatedMeals,
    estimateNote: estimatedMeals ? `Includes ${estimatedMeals} estimated ${estimatedMeals === 1 ? "meal" : "meals"}` : undefined,
    scoreWord: percent !== undefined ? `${percent}%` : status === "partial" ? "Partial day" : status === "none" ? "Nothing logged" : "So far",
    walked,
    strength: planned ? { session: planned, done: strength } : undefined,
  }
}

/** The last `days` days before today, oldest first (7 for the week bars, 30
    for the month). */
export function scoreHistory(s: Snapshot, days = 30, now: Date = new Date()): DayScore[] {
  return Array.from({ length: days }, (_, i) => dayScore(s, addDays(now, i - days), now))
}

/** Yesterday's card, with the copy M-31 asks for when nothing was logged. */
export function yesterday(s: Snapshot, now: Date = new Date()) {
  const score = dayScore(s, addDays(now, -1), now)
  return { ...score, coaching: score.status === "none" ? "Nothing logged yesterday" : score.coaching }
}

/** Average of the scored days in a stretch, rounded down, with how many
    days it covers. */
export function averageOf(scores: DayScore[]) {
  const scored = scores.filter((d) => d.percent !== undefined)
  const average = scored.length ? Math.floor(scored.reduce((a, d) => a + d.percent!, 0) / scored.length) : undefined
  return { average, scored: scored.length, logged: scores.filter((d) => d.status !== "none").length, of: scores.length }
}

/** What to do about yesterday's largest shortfall (M-20), and the meal it
    suits best ("fiber at lunch"). `alone` is the words once no meal is
    left today ("more fiber"). */
const FOCUS_TIP: Record<NutrientId, { what: string; at?: MealSlot; alone?: string }> = {
  calories: { what: "smaller portions", at: "dinner" },
  protein: { what: "protein", at: "breakfast", alone: "more protein" },
  fiber: { what: "fiber", at: "lunch", alone: "more fiber" },
  addedSugar: { what: "fewer added sugars" },
  sodium: { what: "less salt", at: "dinner" },
  satFat: { what: "lean protein", at: "dinner" },
  calcium: { what: "calcium with every meal" },
}

/** One focus line for today (C.2.3), from yesterday, that follows the clock
    and what is already logged today. After a day with nothing logged, the
    meal to log now ("log breakfast" in the morning, "log lunch" at 4 PM:
    the meal Log a meal opens with); after a partial day, every meal; both
    move on to the walk once today's breakfast, lunch and dinner are in.
    After a complete day, its largest shortfall at the next meal still to
    come ("fiber at lunch", "fiber at dinner" once lunch is in or past), or
    on its own once the day's meals are in ("more fiber"). */
export function todayFocus(s: Snapshot, now: Date = new Date()): string {
  // After three days with nothing logged, a fresh start, never a count of
  // what was missed (M-62).
  if ([1, 2, 3].every((n) => dayScore(s, addDays(now, -n), now).status === "none")) return "Welcome back. Today's list starts fresh."
  const y = dayScore(s, addDays(now, -1), now)
  const logged = new Set(mealsOn(s, localDay(now)).map((m) => m.slot))
  const { slot, main } = mealToLog(logged, now)
  const walk = "Today's focus: keep your walk going"
  if (y.status === "none") return main ? `Today's focus: log ${slot === "snack" ? "a snack" : SLOT_NAME[slot].toLowerCase()}` : walk
  if (y.status === "partial") return main ? "Today's focus: log each meal" : walk
  if (!y.shortfall) return walk
  const tip = FOCUS_TIP[y.shortfall.goal.id]
  if (!tip.at) return `Today's focus: ${tip.what}`
  const ahead = mainsAhead(logged, now)
  const meal = ahead.includes(tip.at) ? tip.at : ahead[0]
  return meal ? `Today's focus: ${tip.what} at ${SLOT_NAME[meal].toLowerCase()}` : `Today's focus: ${tip.alone ?? tip.what}`
}

/* -------------------------------------------------------------- energy -- */

/** Resting energy by Mifflin St Jeor for a woman, in kcal a day. */
export function restingEnergy(weightLb: number, on: Date = new Date()): number {
  const born = dayFrom(MEMBER.born)
  const age = on.getFullYear() - born.getFullYear() - (on < new Date(on.getFullYear(), born.getMonth(), born.getDate()) ? 1 : 0)
  const kg = weightLb * 0.45359237
  const cm = MEMBER.heightIn * 2.54
  return Math.round((10 * kg + 6.25 * cm - 5 * age - 161) / 10) * 10
}

/** Everyday movement without a device, and what logged exercise adds. */
const ACTIVE = { everyday: 350, walk: 100, strength: 90 }

/** The day's energy balance (M-27): what she burned, resting plus active,
    minus what she ate. Estimated until Terra brings device data. */
export function energyOf(intake: number, weightLb: number, did: { walk?: boolean; strength?: boolean } = {}): Energy {
  const resting = restingEnergy(weightLb)
  const active = ACTIVE.everyday + (did.walk ? ACTIVE.walk : 0) + (did.strength ? ACTIVE.strength : 0)
  const burned = resting + active
  const deficit = burned - Math.round(intake)
  const words = deficit >= 0 ? `About ${formatNumber(deficit)} kcal under what you burned` : `About ${formatNumber(-deficit)} kcal over what you burned`
  return { resting, active, burned, intake: Math.round(intake), deficit, estimated: true, words }
}

/* ------------------------------------------------------------ movement -- */

export type Exercise = {
  id: string
  name: string
  sets: number
  reps?: number
  /** For holds: seconds per set. */
  seconds?: number
  /** Reps or seconds are per side or per leg. */
  side?: "each side" | "each leg"
  /** Rest between sets, in seconds. */
  rest: number
  /** How hard it should feel, out of 10. */
  effort: number
  equipment: string
  cues: string[]
  /** When to stop (M-14). */
  stop: string
  /** The library video's length; the video itself comes from the licensed library. */
  video: string
}

/** "3 sets of 10", "2 sets of 8 each side", "3 sets of 20 seconds each leg" */
export function prescription(e: Exercise): string {
  const each = e.reps !== undefined ? `${e.reps}` : `${e.seconds} seconds`
  return `${e.sets} sets of ${each}${e.side ? ` ${e.side}` : ""}`
}

/** From the approved exercise library (M-14): gentle on the right knee
    (arthroscopy in 2019), no deep spine bending or twisting. */
export const EXERCISES: Record<string, Exercise> = {
  "sit-to-stand": {
    id: "sit-to-stand",
    name: "Sit to stand",
    sets: 3,
    reps: 10,
    rest: 60,
    effort: 6,
    equipment: "A sturdy chair",
    cues: ["Sit tall at the front of the chair, feet hip width apart.", "Lean forward a little and stand up, pushing through your heels.", "Sit back down slowly, counting to three."],
    stop: "Stop if you feel sharp pain in your right knee or your back.",
    video: "2:07",
  },
  "forward-lunge": {
    id: "forward-lunge",
    name: "Forward lunge",
    sets: 2,
    reps: 8,
    side: "each leg",
    rest: 60,
    effort: 6,
    equipment: "A counter or sturdy chair for balance, and light weights if you like",
    cues: ["Stand tall beside the counter with one hand resting on it.", "Step forward and lower a little, keeping your front knee over your ankle.", "Push through your front heel to step back, then switch legs."],
    stop: "Stop if your right knee hurts or you feel unsteady.",
    video: "1:08",
  },
  "push-up": {
    id: "push-up",
    name: "Push up",
    sets: 3,
    reps: 8,
    rest: 60,
    effort: 6,
    equipment: "A mat, or lean on a wall or counter to make it easier",
    cues: ["Place your hands under your shoulders with your body in a straight line.", "Bend your elbows to lower your chest, keeping your hips level.", "Press back up until your arms are straight."],
    stop: "Stop if you feel pain in your shoulders or wrists.",
    video: "1:26",
  },
  "overhead-press": {
    id: "overhead-press",
    name: "Overhead press",
    sets: 2,
    reps: 10,
    rest: 60,
    effort: 6,
    equipment: "A light barbell or two light dumbbells",
    cues: ["Sit or stand tall with the weights at shoulder height.", "Press up until your arms are straight, without arching your back.", "Lower slowly."],
    stop: "Stop if you feel pain in your shoulders or lower back.",
    video: "0:30",
  },
  "push-press": {
    id: "push-press",
    name: "Standing push press",
    sets: 2,
    reps: 10,
    rest: 60,
    effort: 6,
    equipment: "Two light weights, such as kettlebells or dumbbells",
    cues: ["Stand tall with the weights at your shoulders, feet hip width apart.", "Bend your knees a little, then straighten them as you press the weights overhead.", "Lower them to your shoulders with control."],
    stop: "Stop if you feel pain in your shoulders, knees or lower back.",
    video: "0:50",
  },
  "single-leg-stand": {
    id: "single-leg-stand",
    name: "Single leg stand",
    sets: 3,
    seconds: 20,
    side: "each leg",
    rest: 30,
    effort: 4,
    equipment: "A counter for balance",
    cues: ["Stand beside the counter with one hand resting on it.", "Lift one foot a few inches off the floor and hold steady.", "Switch legs. Lift your hand off when you feel ready."],
    stop: "Stop if you feel dizzy or unsteady.",
    video: "2:07",
  },
}

export type Session = {
  /** "strength-a", "strength-b", "balance-a" */
  id: string
  title: string
  /** "Lower body and core" */
  focus: string
  minutes: number
  effort: string
  exercises: Exercise[]
}

export const SESSIONS: Record<string, Session> = {
  "strength-a": {
    id: "strength-a",
    title: "Strength A",
    focus: "Lower body and core",
    minutes: 20,
    effort: "About 6 of 10",
    exercises: ["sit-to-stand", "forward-lunge", "single-leg-stand"].map((id) => EXERCISES[id]),
  },
  "strength-b": {
    id: "strength-b",
    title: "Strength B",
    focus: "Upper body and balance",
    minutes: 20,
    effort: "About 6 of 10",
    exercises: ["push-up", "overhead-press", "push-press", "single-leg-stand"].map((id) => EXERCISES[id]),
  },
}

/** Version 2's week: A on Monday, Wednesday and Friday, B on Tuesday,
    Thursday and Saturday, Sunday off. The walk is every day. */
export function sessionOn(d: Date): Session | undefined {
  const w = d.getDay()
  if (w === 0) return undefined
  return w % 2 === 1 ? SESSIONS["strength-a"] : SESSIONS["strength-b"]
}

/** The bone plan's one session (FINAL-SPEC E.3, sample data): legs,
    balance and posture, no deep spine bending or twisting. */
export const BONE_SESSIONS: Record<string, Session> = {
  "balance-a": {
    id: "balance-a",
    title: "Strength and balance",
    focus: "Legs, balance and posture",
    minutes: 25,
    effort: "About 5 of 10",
    exercises: ["sit-to-stand", "forward-lunge", "push-up", "single-leg-stand"].map((id) => EXERCISES[id]),
  },
}

/** The bone plan's week: strength and balance on Monday, Wednesday and
    Friday; a walk every day. */
export function boneSessionOn(d: Date): Session | undefined {
  const w = d.getDay()
  return w === 1 || w === 3 || w === 5 ? BONE_SESSIONS["balance-a"] : undefined
}

export const WALK = {
  id: "walk",
  title: "Walk after dinner",
  minutes: 20,
  detail: "20 minutes, brisk",
  how: ["A pace where you can talk, but not sing", "Within an hour of eating, to help your blood sugar", "If it rains: 20 minutes of stairs or a walking video"],
} as const

export const BP_CHECK = {
  id: "bp",
  title: "Check blood pressure",
  detail: "Tonight, seated, after 5 minutes of rest",
  how: ["Sit with your feet flat and your arm resting at heart height.", "Take two readings, a minute apart.", "Enter both numbers, top number first."],
} as const

/** The SMART stress and resiliency session and the evening cut off on the
    member home's goals (22 Oct 2026, sample data until they come from the
    server): the session counts once done, lights out is the bedtime goal. */
export const SMART_TODAY = { session: 8, minutes: 12, done: true } as const
export const LIGHTS_OUT = { by: "10:30 PM", hour: 22, minute: 30 } as const

/* ------------------------------------------------------------ profiles -- */

/** The plan's sample profile: Olivia's weight, blood sugar and heart plan,
    or the same Olivia with a plan for bone strength (/demo/member-bone, Ed's
    example on the 30 Sep call), so the review sees everybody's page looks
    different on the same screens. */
export type MemberFocus = "weight" | "bone"

export type MemberProfile = {
  focus: MemberFocus
  /** What the plan works on: weight: blood sugar, weight, heart; bone: bone. */
  areas: FocusArea[]
  /** The scored goals, in plan order. */
  goals: Goal[]
  /** The weight focus shows the energy balance; bone does not. */
  energy: boolean
  sessions: Record<string, Session>
  sessionOn: (d: Date) => Session | undefined
  diet: { title: string; summary: string; deficit?: string; ideas: readonly { name: string; line: string }[]; slots: readonly { slot: MealSlot; line: string }[] }
  sampleMeals: { yesterday: Meal[]; today: Meal[] }
  sampleDays: SampleDay[]
  versions: PlanVersion[]
  /** Since you started leads with body fat lost, or with chair stands. */
  headline: "fat" | "stands"
  /** What a meal's line names (mealLine), in order: the energy, then the
      plan's key nutrients, protein on the weight plan, calcium then
      protein on the bone plan. */
  mealNutrients: NutrientId[]
}

/** The bone plan's goals, in order, so the coaching line names calcium on
    a tie with protein. */
export const BONE_GOALS: Goal[] = [
  goal("calories", "atMost", 2000, "bone", ["Half the plate vegetables, a palm of protein, a fist of whole grains", "Water, tea or milk instead of juice"]),
  goal("calcium", "atLeast", 1000, "bone", [
    "Plain yogurt, 1 cup: about 400 mg",
    "Milk, 1 cup: about 300 mg",
    "Tofu made with calcium, half a cup: about 250 mg",
    "Sardines with bones, 3 oz: about 325 mg",
  ]),
  goal("protein", "atLeast", 100, "bone", ["Greek yogurt, 1 cup: about 20 g", "Two eggs: 12 g", "A palm sized salmon fillet: about 30 g", "Lentils, 1 cup cooked: 18 g"]),
]

export const BONE_DIET = {
  title: "Your daily targets",
  summary: "Up to 2,000 kcal, with at least 1,000 mg calcium and 100 g protein",
  ideas: [
    { name: "Greek yogurt parfait", line: "400 mg calcium, 20 g protein, 300 kcal" },
    { name: "Tofu stir fry with greens", line: "350 mg calcium, 22 g protein, 420 kcal" },
    { name: "Sardines on whole grain toast", line: "380 mg calcium, 25 g protein, 360 kcal" },
  ],
  slots: [
    { slot: "breakfast", line: "Calcium first: yogurt, milk or a fortified cereal" },
    { slot: "lunch", line: "Leafy greens and a palm of protein" },
    { slot: "snack", line: "Cheese, almonds or a yogurt" },
    { slot: "dinner", line: "Fish, tofu or beans, with greens" },
  ] as { slot: MealSlot; line: string }[],
} as const

export const BONE_VERSIONS: PlanVersion[] = [
  {
    version: 2,
    status: "Active",
    approved: "Sep 12, 2026",
    at: "2026-09-12",
    by: "Dr. Maya Patel",
    short: "Your calcium in August",
    why: "Your calcium was under your goal on most days in August, so Dr. Patel added a calcium rich snack and a second balance exercise.",
    changes: ["A calcium rich snack each afternoon", "Single leg stand added to every session", "Calcium: at least 1,000 mg a day"],
  },
  {
    version: 1,
    status: "Superseded",
    approved: "May 18, 2026",
    at: "2026-05-18",
    by: "Dr. Maya Patel",
    short: "Your first plan",
    why: "Your first plan, built from your record, your questionnaire and your why.",
    changes: ["Up to 2,000 kcal a day, with at least 100 g protein", "Calcium: at least 900 mg a day", "Strength and balance three times a week", "Walk after dinner every day"],
  },
]

export const PROFILES: Record<MemberFocus, MemberProfile> = {
  weight: {
    focus: "weight",
    areas: ["blood sugar", "weight", "heart"],
    goals: GOALS,
    energy: true,
    sessions: SESSIONS,
    sessionOn,
    diet: DIET_PLAN,
    sampleMeals: SAMPLE_MEALS,
    sampleDays: SAMPLE_DAYS,
    versions: PLAN_VERSIONS,
    headline: "fat",
    mealNutrients: ["calories", "protein"],
  },
  bone: {
    focus: "bone",
    areas: ["bone"],
    goals: BONE_GOALS,
    energy: false,
    sessions: BONE_SESSIONS,
    sessionOn: boneSessionOn,
    diet: BONE_DIET,
    sampleMeals: BONE_SAMPLE_MEALS,
    sampleDays: BONE_SAMPLE_DAYS,
    versions: BONE_VERSIONS,
    headline: "stands",
    mealNutrients: ["calories", "calcium", "protein"],
  },
}

/** The member's plan profile from the store (`memberFocus`), weight when
    unset. Every member function reads its goals, sessions, diet, sample
    days and versions from here. */
export const profileOf = (s: Snapshot): MemberProfile => PROFILES[s.memberFocus ?? "weight"] ?? PROFILES.weight

/** What she logged for an exercise or an activity on a day (store field
    `exercises[localDay][key]`):
    - a move, under way or done, under its id ("sit-to-stand"): `sets`
      ticked so far, `reps`, `weightLb`; done once `sets` reaches the plan's
      sets (moveDone), or with no `sets` when marked done as a whole
    - the session, finished, under its id ("strength-a", "balance-a"):
      `note` "Felt good", "Hard" or "Something hurt: Band row"
    - the session swapped for something else ("I did something else",
      M-15): `minutes` and `note` with what she did ("Swimming"); a
      finished session never has `minutes`
    - the walk, under "walk": `minutes` */
export type ActivityLog = {
  /** When it was marked done or last changed (ISO). */
  at: string
  sets?: number
  reps?: number
  weightLb?: number
  /** Each set's own reps and weight, in order; `sets` counts those filled. */
  entries?: { reps?: number; weightLb?: number }[]
  minutes?: number
  note?: string
}

/** A move is done once every planned set is ticked; a log without sets
    was marked done as a whole. */
export const moveDone = (log: ActivityLog | undefined, e: Exercise) => Boolean(log) && (log!.sets ?? e.sets) >= e.sets

/** The session done on a day: marked done as a whole, or every move done. */
function sessionDone(s: Snapshot, d: Date): Session | undefined {
  const session = profileOf(s).sessionOn(d)
  const log = s.exercises?.[localDay(d)]
  if (!session || !log) return undefined
  return log[session.id] || session.exercises.every((e) => moveDone(log[e.id], e)) ? session : undefined
}

/** Monday to Sunday of this week: each day's session, and what was done. */
export function weekPlan(s: Snapshot, now: Date = new Date()) {
  const profile = profileOf(s)
  const monday = dayFrom(weekOf(now))
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i)
    const day = localDay(date)
    const session = profile.sessionOn(date)
    const offset = daysBetween(now, date)
    const sample = offset < -1 ? profile.sampleDays.find((x) => x.day === offset) : undefined
    const walked = sample ? sample.walk !== false && sample.status !== "none" : Boolean(s.exercises?.[day]?.walk)
    return {
      day,
      date,
      weekday: weekdayOf(date),
      today: offset === 0,
      past: offset < 0,
      session,
      /** "Strength A, lower body and core", or "Rest day, an easy walk" */
      line: session ? `${session.title}, ${session.focus.toLowerCase()}` : profile.focus === "bone" ? "A walk" : "Rest day, an easy walk",
      sessionDone: sample ? Boolean(session) && sample.status !== "none" : Boolean(sessionDone(s, date)),
      walked,
    }
  })
}

/* --------------------------------------------------------------- today -- */

export type TodayAction = {
  id: "diet" | "meal" | "strength" | "walk" | "bp" | "weigh"
  title: string
  detail: string
  /** "All day", "12:30 PM" */
  time: string
  status: "done" | "open" | "progress"
  progress?: { done: number; of: number; words: string }
  /** The meal to log next, on the meal action: Log a meal opens with it. */
  slot?: MealSlot
  /** Counts toward "1 of 4 done". The diet plan is guidance, not a task. */
  counts: boolean
  how?: readonly string[]
  session?: Session
}

const SLOT_TIME: Record<MealSlot, [number, number]> = { breakfast: [8, 0], lunch: [12, 30], snack: [15, 30], dinner: [18, 30] }

/** Today's plan, at most five actions in time order (M-18), for the Today
    block and the member home's doors. */
export function today(s: Snapshot, now: Date = new Date()) {
  const day = localDay(now)
  const meals = mealsOn(s, day)
  const logged = new Set(meals.map((m) => m.slot))
  const mains = MEAL_SLOTS.filter((m) => m.main)
  const mainsDone = mains.filter((m) => logged.has(m.id)).length
  // The meal to log next, by the hour: "Lunch next", or "Add lunch" once
  // its hour has passed (never "missed").
  const next = mealToLog(logged, now)
  const nextSlot = next.slot
  const mealDetail =
    mainsDone === mains.length ? "Every meal logged" : next.late ? `Add ${SLOT_NAME[nextSlot].toLowerCase()}` : `${SLOT_NAME[nextSlot]} next`
  const profile = profileOf(s)
  const session = profile.sessionOn(now)
  const log = s.exercises?.[day] ?? {}
  const moves = session ? session.exercises.filter((e) => moveDone(log[e.id], e)).length : 0
  const strengthDone = Boolean(sessionDone(s, now))
  const bpDone = (s.entries ?? []).some((e) => e.kind === "bp" && dayOfAt(e.at) === day)
  const weighDone = (s.entries ?? []).some((e) => e.kind === "weight" && dayOfAt(e.at) === day)
  const [first, second] = profile.goals

  const actions: (TodayAction & { order: number })[] = [
    {
      id: "diet",
      title: "Diet plan",
      // "Up to 1,700 kcal, 110 g protein"
      detail: [first?.words, second && `${formatNumber(second.target)} ${second.unit} ${second.name.toLowerCase()}`].filter(Boolean).join(", "),
      time: "All day",
      status: "open",
      counts: false,
      order: 0,
    },
    // The weigh in, Thursday mornings (FINAL-SPEC E.3).
    ...(now.getDay() === 4
      ? [
          {
            id: "weigh" as const,
            title: "Weigh in",
            detail: "Before breakfast",
            time: clock(7),
            status: weighDone ? ("done" as const) : ("open" as const),
            counts: true,
            order: 7 * 60,
          },
        ]
      : []),
    {
      id: "meal",
      title: "Log a meal",
      detail: mealDetail,
      time: clock(...SLOT_TIME[nextSlot]),
      status: mainsDone === mains.length ? "done" : mainsDone ? "progress" : "open",
      progress: { done: mainsDone, of: mains.length, words: `${mainsDone} of ${mains.length} meals logged` },
      slot: nextSlot,
      counts: true,
      order: SLOT_TIME[nextSlot][0] * 60 + SLOT_TIME[nextSlot][1],
    },
    ...(session
      ? [
          {
            id: "strength" as const,
            title: session.id === "balance-a" ? session.title : `${session.title}, ${session.focus.toLowerCase()}`,
            detail: `${session.exercises.length} moves, about ${session.minutes} minutes`,
            time: clock(17, 30),
            status: strengthDone ? ("done" as const) : moves ? ("progress" as const) : ("open" as const),
            progress: { done: strengthDone ? session.exercises.length : moves, of: session.exercises.length, words: `${strengthDone ? session.exercises.length : moves} of ${session.exercises.length} moves` },
            counts: true,
            session,
            order: 17 * 60 + 30,
          },
        ]
      : []),
    {
      id: "walk",
      title: WALK.title,
      detail: WALK.detail,
      time: clock(19, 30),
      status: log.walk ? "done" : "open",
      counts: true,
      how: WALK.how,
      order: 19 * 60 + 30,
    },
    {
      id: "bp",
      title: BP_CHECK.title,
      detail: BP_CHECK.detail,
      time: clock(21),
      status: bpDone ? "done" : "open",
      counts: true,
      how: BP_CHECK.how,
      order: 21 * 60,
    },
  ]
  const sorted = actions.sort((a, b) => a.order - b.order).map(({ order: _order, ...a }) => a as TodayAction)
  const counted = sorted.filter((a) => a.counts)
  const done = counted.filter((a) => a.status === "done").length
  const share = counted.length ? counted.reduce((sum, a) => sum + (a.status === "done" ? 1 : a.progress ? a.progress.done / a.progress.of : 0), 0) / counted.length : 0
  return {
    day,
    label: dayLabel(now),
    actions: sorted,
    done,
    of: counted.length,
    /** "1 of 4 done" */
    words: `${done} of ${counted.length} done`,
    /** 0 to 1 for the progress bar, counting part done actions. */
    share,
    focus: todayFocus(s, now),
    /** "Week 22" */
    week: `Week ${weekNumber(now)}`,
    session,
    /** The fasting note on the evening before a fasting test. */
    prep: prepTonight(s, now),
  }
}

/* ---------------------------------------------------------- this week -- */

export type WeekItem = {
  id: string
  kind: "test" | "visit"
  title: string
  date: Date
  /** "Fri, Oct 2" */
  day: string
  time: string
  /** "Fri, Oct 2, 7:30 AM" */
  when: string
  where: string
  prep?: string
  status: "Booked"
  /** The orders it fulfils. */
  orders?: string[]
}

/** The next weekday after `d`, and the n-th weekday after that. */
function weekdayAfter(d: Date, n = 1): Date {
  let next = d
  let left = n
  while (left > 0) {
    next = addDays(next, 1)
    if (next.getDay() !== 0 && next.getDay() !== 6) left--
  }
  return next
}

/** Tests and appointments in the next 7 days (M-35, M-37): the repeat A1c
    and lipid panel at Quest, fasting, on the next weekday; the cardiology
    follow up two weekdays later. Both booked. In the member demo the
    cardiology visit falls this week; the free record keeps it on Oct 21. */
export function thisWeek(_s: Snapshot = {}, now: Date = new Date()): WeekItem[] {
  const labs = weekdayAfter(now, 1)
  const cardio = weekdayAfter(labs, 2)
  const item = (x: Omit<WeekItem, "day" | "when" | "status">): WeekItem => ({ ...x, day: dayLabel(x.date), when: `${dayLabel(x.date)}, ${x.time}`, status: "Booked" })
  return [
    item({
      id: "repeat-labs",
      kind: "test",
      title: "Repeat A1c and lipid panel",
      date: labs,
      time: clock(7, 30),
      where: "Quest Diagnostics, Del Mar",
      // The row's teal note, whole in its two lines on the narrowest phone:
      // the same words as the night before's line on the Today hero.
      prep: "Nothing to eat after 9:30 PM the night before. Water is fine.",
      orders: ["labs-nov"],
    }),
    item({
      id: "cardio-follow-up",
      kind: "visit",
      title: "Cardiology follow up",
      date: cardio,
      time: clock(10, 30),
      where: "Dr. Lee, Pacific Heart, La Jolla",
    }),
  ]
}

/** On the evening before the fasting labs: what to do tonight. */
export function prepTonight(s: Snapshot = {}, now: Date = new Date()): string | undefined {
  const labs = thisWeek(s, now).find((i) => i.id === "repeat-labs")
  if (!labs || daysBetween(now, labs.date) !== 1) return undefined
  return "Labs tomorrow at 7:30 AM: nothing to eat after 9:30 PM tonight. Water is fine."
}

/* -------------------------------------------------------- measurements -- */

/** A home measurement. Until devices connect, every one is entered by hand. */
export type Measure = {
  /** ISO day or time. */
  at: string
  value: number
  /** Blood pressure's bottom number. */
  value2?: number
  source: "Entered by you"
}

/** A measurement the patient adds in the app (store field `entries`). */
export type Entry = {
  id: string
  kind: "weight" | "waist" | "bp" | "stands"
  /** ISO time it was taken. */
  at: string
  value: number
  value2?: number
  /** Beats a minute, with a blood pressure reading when she adds it. */
  pulse?: number
  note?: string
}

/** What a member can enter by hand while devices are coming (M-70). */
export const MANUAL_ENTRIES = [
  { id: "weight", title: "Weight", unit: "lb", how: "In the morning, after the bathroom and before breakfast." },
  { id: "waist", title: "Waist", unit: "in", how: "Standing, at your belly button, after breathing out." },
  { id: "bp", title: "Blood pressure", unit: "mmHg", how: "Seated, after 5 minutes of rest. Top number first." },
  { id: "stands", title: "Chair stands", unit: "stands", how: "Arms crossed, stand up and sit down as many times as you can in 30 seconds." },
] as const

/** The frozen baseline from May 3 (M-43). Never overwritten. */
export const BASELINE = Object.freeze({
  at: MEMBER.start,
  label: MEMBER.startLabel,
  weight: 189,
  waist: 38.5,
  bp: Object.freeze({ value: 138, value2: 88 }),
})

/** Thursday morning weigh-ins after the May 3 baseline, in lb. */
const WEIGHTS: [string, number][] = [
  ["2026-05-03", 189.0],
  ["2026-05-07", 188.8],
  ["2026-05-14", 188.0],
  ["2026-05-21", 187.5],
  ["2026-05-28", 186.8],
  ["2026-06-04", 186.3],
  ["2026-06-11", 185.6],
  ["2026-06-18", 185.2],
  ["2026-06-25", 184.4],
  ["2026-07-02", 184.0],
  ["2026-07-09", 183.3],
  ["2026-07-16", 182.9],
  ["2026-07-23", 182.1],
  ["2026-07-30", 181.4],
  ["2026-08-06", 180.6],
  ["2026-08-13", 180.4],
  ["2026-08-20", 179.9],
  ["2026-08-27", 180.1],
  ["2026-09-03", 179.4],
  ["2026-09-10", 179.1],
  ["2026-09-17", 178.8],
  ["2026-09-24", 178.5],
  ["2026-10-01", 178.0],
]

/** Waist at the first weigh-in of each month, in inches. */
const WAISTS: [string, number][] = [
  ["2026-05-03", 38.5],
  ["2026-06-04", 38.1],
  ["2026-07-02", 37.6],
  ["2026-08-06", 37.0],
  ["2026-09-03", 36.5],
  ["2026-10-01", 36.0],
]

/** The bone plan's strength check: chair stands in 30 seconds, once a
    month (FINAL-SPEC E.3, sample data). Goal 15. */
const STANDS: [string, number][] = [
  ["2026-05-09", 9],
  ["2026-06-10", 10],
  ["2026-07-11", 11],
  ["2026-08-12", 12],
  ["2026-09-12", 12],
  ["2026-10-01", 13],
]

/** The chair stand goal for the bone plan. */
const STANDS_GOAL = 15

/** Home blood pressure: Sunday evenings under version 1, every evening
    from version 2 (Sep 12), as [day, top, bottom]. */
const PRESSURES: [string, number, number][] = [
  ["2026-05-03", 138, 88],
  ["2026-05-10", 137, 88],
  ["2026-05-17", 136, 87],
  ["2026-05-24", 137, 87],
  ["2026-05-31", 135, 86],
  ["2026-06-07", 134, 86],
  ["2026-06-14", 135, 86],
  ["2026-06-21", 133, 85],
  ["2026-06-28", 134, 85],
  ["2026-07-05", 133, 85],
  ["2026-07-12", 132, 84],
  ["2026-07-19", 134, 85],
  ["2026-07-26", 133, 84],
  ["2026-08-02", 135, 86],
  ["2026-08-09", 136, 87],
  ["2026-08-16", 137, 88],
  ["2026-08-23", 138, 88],
  ["2026-08-30", 139, 89],
  ["2026-09-06", 138, 88],
  ["2026-09-12", 137, 88],
  ["2026-09-13", 136, 87],
  ["2026-09-14", 135, 87],
  ["2026-09-15", 134, 86],
  ["2026-09-16", 134, 85],
  ["2026-09-17", 133, 85],
  ["2026-09-18", 132, 84],
  ["2026-09-19", 131, 84],
  ["2026-09-20", 131, 83],
  ["2026-09-21", 130, 83],
  ["2026-09-22", 129, 82],
  ["2026-09-23", 129, 82],
  ["2026-09-24", 128, 81],
  ["2026-09-25", 127, 81],
  ["2026-09-26", 128, 80],
  ["2026-09-27", 126, 80],
  ["2026-09-28", 126, 80],
  ["2026-09-29", 125, 79],
  ["2026-09-30", 126, 80],
]

const LAST_WEIGHT = WEIGHTS[WEIGHTS.length - 1]
const LAST_PRESSURE = PRESSURES[PRESSURES.length - 1]
const SETTLED: [number, number][] = [[126, 80], [125, 79], [127, 81], [126, 80], [124, 79], [126, 81], [125, 80]]

/** The sample's measurements up to today. Past the last fixed day the
    sample carries on at the recent pace (weight about 0.3 lb a week down,
    blood pressure settled near 126/80), so the demo stays current. */
function sampleWeights(now: Date): Measure[] {
  const today = localDay(now)
  const out: Measure[] = WEIGHTS.map(([at, value]) => ({ at, value, source: "Entered by you" }))
  const wiggle = [0.1, -0.1, 0.2, 0, -0.2, 0.1]
  for (let k = 1, d = addDays(dayFrom(LAST_WEIGHT[0]), 7); localDay(d) <= today; k++, d = addDays(d, 7)) {
    out.push({ at: localDay(d), value: Math.round((LAST_WEIGHT[1] - 0.32 * k + wiggle[k % wiggle.length]) * 10) / 10, source: "Entered by you" })
  }
  return out.filter((m) => m.at <= today)
}

function samplePressures(now: Date): Measure[] {
  const out: Measure[] = PRESSURES.map(([at, value, value2]) => ({ at, value, value2, source: "Entered by you" }))
  const yesterday = localDay(addDays(now, -1))
  for (let k = 0, d = addDays(dayFrom(LAST_PRESSURE[0]), 1); localDay(d) <= yesterday; k++, d = addDays(d, 1)) {
    const [value, value2] = SETTLED[k % SETTLED.length]
    out.push({ at: localDay(d), value, value2, source: "Entered by you" })
  }
  return out.filter((m) => daysBetween(dateOfAt(m.at), now) >= 1)
}

/** The sample merged with what the patient entered: her own entry on a day
    replaces the sample's, oldest first. */
function merged(sample: Measure[], s: Snapshot, kind: Entry["kind"]): Measure[] {
  const own = (s.entries ?? []).filter((e) => e.kind === kind)
  const ownDays = new Set(own.map((e) => dayOfAt(e.at)))
  const mine: Measure[] = own.map((e) => ({ at: e.at, value: e.value, value2: e.value2, source: "Entered by you" }))
  return [...sample.filter((m) => !ownDays.has(dayOfAt(m.at))), ...mine].sort((a, b) => dateOfAt(a.at).getTime() - dateOfAt(b.at).getTime())
}

export const weighIns = (s: Snapshot, now: Date = new Date()) => merged(sampleWeights(now), s, "weight")
export const waists = (s: Snapshot, now: Date = new Date()) =>
  merged(WAISTS.map(([at, value]) => ({ at, value, source: "Entered by you" as const })).filter((m) => m.at <= localDay(now)), s, "waist")
export const pressures = (s: Snapshot, now: Date = new Date()) => merged(samplePressures(now), s, "bp")
/** Chair stands in 30 seconds, monthly: the bone plan's strength check. */
export const stands = (s: Snapshot, now: Date = new Date()) =>
  merged(STANDS.map(([at, value]) => ({ at, value, source: "Entered by you" as const })).filter((m) => m.at <= localDay(now)), s, "stands")

/** The weight on a day: the latest weigh-in on or before it. */
export function weightOn(s: Snapshot, d: Date): number {
  const list = weighIns(s, d)
  return list.length ? list[list.length - 1].value : BASELINE.weight
}

/* ---------------------------------------------------------------- DEXA -- */

/** A body composition scan. */
export type DexaScan = { at: string; where: string; weightLb: number; fatLb: number; fatPct: number; leanLb: number }

/** Her two DEXA scans: at the start and in September (sample data). */
export const DEXA_SCANS: DexaScan[] = [
  { at: "2026-05-05", where: "Coastal Imaging, Del Mar", weightLb: 189.0, fatLb: 80.2, fatPct: 42.4, leanLb: 103.0 },
  { at: "2026-09-22", where: "Coastal Imaging, Del Mar", weightLb: 178.6, fatLb: 69.2, fatPct: 38.7, leanLb: 103.6 },
]

/** Ed's sentence for Since you started (M-40): "11 lb" + "of body fat lost
    since May", meta "DEXA scans, May 5 and Sep 22", and the lean mass in
    words ("Held steady"). Undefined before a second scan, when the card
    falls back to the scale ("11 lb", "down since May 3"). */
export function fatLost(now: Date = new Date()): { lb: number; words: string; meta: string; leanWords: string } | undefined {
  const scans = DEXA_SCANS.filter((d) => d.at <= localDay(now))
  if (scans.length < 2) return undefined
  const first = scans[0]
  const last = scans[scans.length - 1]
  const lb = Math.round(first.fatLb - last.fatLb)
  const lean = Math.round((last.leanLb - first.leanLb) * 10) / 10
  const from = dayFrom(first.at)
  return {
    lb,
    words: `of body fat lost since ${MONTHS[from.getMonth()]}`,
    meta: `DEXA scans, ${shortDay(from)} and ${shortDay(dayFrom(last.at))}`,
    leanWords: Math.abs(lean) < 1 ? "Held steady" : `${lean > 0 ? "Up" : "Down"} ${formatNumber(Math.abs(lean), 1)} lb`,
  }
}

/** Body composition goals for Progress's journeys (sample values until the
    physician sets them, H.1): body fat 30 to 35%, lean mass 100 lb or
    more, waist below 35 in. */
export const BODY_GOALS = {
  fatPct: { low: 30, high: 35, words: "30 to 35%" },
  leanLb: { low: 100, words: "100 lb or more" },
  waistIn: { high: 35, words: "Below 35 in" },
} as const

/** The bone plan's next DEXA scan, a year after the first. */
export const NEXT_BONE_SCAN = { at: "2027-05-05", month: "May 2027", words: "Next DEXA scan in May 2027" } as const

/* ------------------------------------------------------------ progress -- */

export type Forecast = {
  goal: number
  date: Date
  /** "early December" */
  when: string
  /** lb a week, over the last 8 weeks. */
  perWeek: number
  /** "If current habits continue, you may reach 175 lb by early December" */
  label: string
  /** The label, then "A forecast, not a promise." */
  caption: string
  /** Weekly from the latest weigh-in to the goal date, with a widening cone. */
  points: { at: string; value: number; low: number; high: number }[]
}

const part = (d: Date) => (d.getDate() <= 10 ? "early" : d.getDate() <= 20 ? "mid" : "late")

/** A weight forecast, only with at least 21 days and six weigh-ins, and only
    while the last 8 weeks point toward the goal (M-42, M-44). Never for a
    lab value. */
export function forecastWeight(series: Measure[], goal: number = MEMBER.goalWeight): { forecast?: Forecast; note?: string } {
  if (series.length < 6 || daysBetween(dateOfAt(series[0].at), dateOfAt(series[series.length - 1].at)) < 21)
    return { note: "Your forecast starts after 3 weeks of weigh ins." }
  const last = series[series.length - 1]
  const lastDay = dayFrom(dayOfAt(last.at))
  if (last.value <= goal) return { note: "Goal reached" }
  const window = series.filter((m) => daysBetween(dateOfAt(m.at), lastDay) <= 56)
  const xs = window.map((m) => daysBetween(lastDay, dateOfAt(m.at)))
  const ys = window.map((m) => m.value)
  const mx = xs.reduce((a, x) => a + x, 0) / xs.length
  const my = ys.reduce((a, y) => a + y, 0) / ys.length
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0)
  const slope = sxx ? xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx : 0
  const perWeek = -slope * 7
  if (window.length < 3 || perWeek < 0.1) return { note: "Holding steady this month" }
  const days = Math.ceil((last.value - goal) / -slope)
  if (days > 182) return { note: "Holding steady this month" }
  const date = addDays(lastDay, days)
  const when = `${part(date)} ${MONTHS_LONG[date.getMonth()]}`
  const label = `If current habits continue, you may reach ${goal} lb by ${when}`
  const points: Forecast["points"] = []
  for (let w = 0; w * 7 < days; w++) {
    const value = Math.round((last.value + slope * w * 7) * 10) / 10
    points.push({ at: localDay(addDays(lastDay, w * 7)), value, low: Math.round((value - 0.15 * w) * 10) / 10, high: Math.round((value + 0.15 * w) * 10) / 10 })
  }
  const spread = 0.15 * (days / 7)
  points.push({ at: localDay(date), value: goal, low: Math.round((goal - spread) * 10) / 10, high: Math.round((goal + spread) * 10) / 10 })
  return { forecast: { goal, date, when, perWeek: Math.round(perWeek * 100) / 100, label, caption: `${label}. An estimate, not a guarantee.`, points } }
}

/** A smoothed line through the weigh-ins for the progress chart (a moving
    average that weighs the newest most). */
export function trendLine(series: Measure[], weight = 0.4) {
  let t: number | undefined
  return series.map((m) => {
    t = t === undefined ? m.value : t + weight * (m.value - t)
    return { at: m.at, value: Math.round(t * 10) / 10 }
  })
}

const down = (change: number, unit: string, decimals = 1) => {
  const size = formatNumber(Math.abs(change), Number.isInteger(Math.round(Math.abs(change) * 10) / 10) ? 0 : decimals)
  if (Math.abs(change) < 0.05) return "No change"
  return change < 0 ? `${size} ${unit} down` : `${size} ${unit} up`
}

/** Progress since the start, against the frozen baseline (M-40 to M-44). */
export function progress(s: Snapshot, now: Date = new Date()) {
  const weights = weighIns(s, now)
  const lastWeight = weights[weights.length - 1]
  const waistList = waists(s, now)
  const lastWaist = waistList[waistList.length - 1]
  const bp = pressures(s, now)
  const recent = bp.filter((m) => daysBetween(dateOfAt(m.at), now) <= 7)
  const avg = (xs: number[]) => Math.round(xs.reduce((a, x) => a + x, 0) / (xs.length || 1))
  const bpNow = recent.length ? { value: avg(recent.map((m) => m.value)), value2: avg(recent.map((m) => m.value2 ?? 0)) } : undefined
  const { forecast, note } = forecastWeight(weights)
  const change = lastWeight ? Math.round((lastWeight.value - BASELINE.weight) * 10) / 10 : 0
  const since = `since ${shortDay(dayFrom(BASELINE.at))}`
  return {
    start: { at: BASELINE.at, label: BASELINE.label },
    week: weekNumber(now),
    weight: {
      start: BASELINE.weight,
      now: lastWeight?.value ?? BASELINE.weight,
      latestAt: lastWeight?.at ?? BASELINE.at,
      change,
      /** "11 lb down" */
      words: down(change, "lb"),
      /** "since May 3" */
      since,
      goal: MEMBER.goalWeight,
      series: weights,
      trend: trendLine(weights),
      forecast,
      /** Why there is no forecast, when there isn't one. */
      note,
    },
    waist: {
      start: BASELINE.waist,
      now: lastWaist?.value ?? BASELINE.waist,
      change: Math.round(((lastWaist?.value ?? BASELINE.waist) - BASELINE.waist) * 10) / 10,
      /** "2.5 in down" */
      words: down((lastWaist?.value ?? BASELINE.waist) - BASELINE.waist, "in"),
      series: waistList,
    },
    /** The bone plan's headline: "13 chair stands", "in 30 seconds, up
        from 9 in May". */
    stands: (() => {
      const list = stands(s, now)
      const first = list[0]
      const last = list[list.length - 1]
      return {
        start: first?.value,
        now: last?.value,
        goal: STANDS_GOAL,
        words: last ? `${last.value} chair stands` : undefined,
        line: first && last ? `in 30 seconds, up from ${first.value} in ${MONTHS[dateOfAt(first.at).getMonth()]}` : undefined,
        series: list,
      }
    })(),
    pressure: {
      start: `${BASELINE.bp.value}/${BASELINE.bp.value2}`,
      /** The average of the last 7 evenings: "126/80". */
      now: bpNow ? `${bpNow.value}/${bpNow.value2}` : undefined,
      average: bpNow ? { ...bpNow, readings: recent.length } : undefined,
      words: bpNow ? `${bpNow.value}/${bpNow.value2}, from ${BASELINE.bp.value}/${BASELINE.bp.value2}` : undefined,
      series: bp,
    },
  }
}

/* ----------------------------------------------------------- chart kit -- */

/** Measurements as the chart kit's dated values, each on its local day (a
    stored time is UTC, which the kit would read as the UTC date). */
export const datedOf = (list: readonly { at: string; value: number }[]) => list.map((m) => ({ date: dayOfAt(m.at), value: m.value }))

/** A day's goals as the chart kit's GoalRows rows: what was eaten (left out
    when unknown, never zero), the goal and its kind, the partial flag and
    the words for the gap. An estimated meal is labelled once for the day
    (`estimateNote`), not on every row. */
export function goalRowsOf(day: DayScore) {
  return day.results.map((r) => ({
    id: r.goal.id,
    name: r.goal.name,
    unit: r.goal.unit,
    actual: r.amount ? Math.round(r.amount.value) : undefined,
    goal: r.goal.target,
    kind: r.goal.kind,
    partial: day.status !== "complete" || r.amount?.partial || undefined,
    note: r.gap,
  }))
}

/** Daily scores as the chart kit's week bars: no bar on a day with nothing
    logged, and none on a partial day either, which is never scored (M-28):
    its baseline dot reads "Partial day" (WeekBars `partialWord`). */
export const weekBarsOf = (scores: DayScore[]) =>
  scores.map((d) => ({ label: weekdayOf(d.date), value: d.percent, partial: d.status === "partial" || undefined }))

/** Home blood pressure readings (`pressures()`) as the chart kit's
    PressureChart readings, each on its local day. */
export const pressureReadingsOf = (list: readonly Measure[]) =>
  list
    .filter((m) => m.value2 !== undefined)
    .map((m) => ({ date: dayOfAt(m.at), systolic: m.value, diastolic: m.value2!, source: m.source }))

/** The progress chart's inputs from `progress()`: weigh-ins, the frozen
    start, the goal and the forecast (left out when the rule fails). The
    trend line is left to the chart kit, which fits one through the
    weigh-ins; `p.weight.trend`, a moving average, runs above a falling
    weight, so it is not passed. */
export function progressChartOf(p: ReturnType<typeof progress>) {
  return {
    readings: datedOf(p.weight.series),
    start: { date: BASELINE.at, value: BASELINE.weight },
    goal: p.weight.goal,
    forecast: p.weight.forecast ? p.weight.forecast.points.map((x) => ({ date: x.at, value: x.value })) : undefined,
    today: p.weight.latestAt,
    unit: "lb",
    name: "weight",
    readingsLabel: "Weigh ins",
  }
}

/* ---------------------------------------------------------- milestones -- */

export type Milestone = {
  id: string
  title: string
  at: string
  /** "Sep 22" */
  label: string
  kind: "weight" | "waist" | "habit" | "strength"
  /** Where it was measured, when that matters: "DEXA scan". */
  meta?: string
}

/** Counts and firsts, never a streak that resets to nothing (M-62). A bone
    plan counts its chair stands; a weight plan its body fat, weight and
    waist. Both count the habits. */
export function milestones(s: Snapshot, now: Date = new Date()): Milestone[] {
  if (profileOf(s).headline === "stands") return boneMilestones(s, now)
  const first = (list: Measure[], test: (m: Measure) => boolean) => list.find(test)
  const weights = weighIns(s, now)
  const fat = fatLost(now)
  const scan = DEXA_SCANS.filter((d) => d.at <= localDay(now)).at(-1)
  const found: (Milestone | undefined)[] = [
    fat && scan ? { id: `fat-${fat.lb}`, title: `${fat.lb} lb of body fat lost`, at: scan.at, label: shortDay(dayFrom(scan.at)), kind: "weight", meta: "DEXA scan" } : undefined,
    (() => {
      const m = first(weights, (w) => w.value <= BASELINE.weight - 5)
      return m && { id: "lb-5", title: "First 5 lb down", at: dayOfAt(m.at), label: shortDay(dateOfAt(m.at)), kind: "weight" as const }
    })(),
    (() => {
      const m = first(weights, (w) => w.value <= BASELINE.weight - 10)
      return m && { id: "lb-10", title: "10 lb down since you started", at: dayOfAt(m.at), label: shortDay(dateOfAt(m.at)), kind: "weight" as const }
    })(),
    (() => {
      const m = first(waists(s, now), (w) => w.value <= BASELINE.waist - 2)
      return m && { id: "waist-2", title: "Waist 2 in smaller", at: dayOfAt(m.at), label: shortDay(dateOfAt(m.at)), kind: "waist" as const }
    })(),
    { id: "walks-4w", title: "4 weeks of evening walks", at: "2026-06-15", label: "Jun 15", kind: "habit" },
    { id: "meals-100", title: "100 meals logged", at: "2026-08-20", label: "Aug 20", kind: "habit" },
  ]
  return found
    .filter((m): m is Milestone => Boolean(m) && m!.at <= localDay(now))
    .sort((a, b) => b.at.localeCompare(a.at))
}

function boneMilestones(s: Snapshot, now: Date): Milestone[] {
  const list = stands(s, now)
  const firstAt = (n: number) => list.find((m) => m.value >= n)
  const found: (Milestone | undefined)[] = [12, 10].map((n) => {
    const m = firstAt(n)
    return m && { id: `stands-${n}`, title: `First ${n} chair stands`, at: dayOfAt(m.at), label: shortDay(dateOfAt(m.at)), kind: "strength" as const, meta: "In 30 seconds" }
  })
  found.push({ id: "walks-4w", title: "4 weeks of evening walks", at: "2026-06-15", label: "Jun 15", kind: "habit" }, { id: "meals-100", title: "100 meals logged", at: "2026-08-20", label: "Aug 20", kind: "habit" })
  return found.filter((m): m is Milestone => Boolean(m) && m!.at <= localDay(now)).sort((a, b) => b.at.localeCompare(a.at))
}

/** The last `days` days for Progress (FINAL-SPEC C.25): days with something
    logged, the average score of the scored days (rounded down), and the
    strength sessions and walks done of those planned. Counts only, never a
    run that can break. */
export function adherence(s: Snapshot, days = 30, now: Date = new Date()) {
  const profile = profileOf(s)
  const scores = scoreHistory(s, days, now)
  const { average } = averageOf(scores)
  const strength = { done: 0, planned: 0 }
  const walks = { done: 0, planned: 0 }
  for (const d of scores) {
    const offset = daysBetween(now, d.date)
    const sample = d.source === "sample" ? profile.sampleDays.find((x) => x.day === offset) : undefined
    const session = profile.sessionOn(d.date)
    if (session) {
      strength.planned++
      if (sample ? sample.status !== "none" : sessionDone(s, d.date)) strength.done++
    }
    walks.planned++
    if (sample ? sample.walk !== false && sample.status !== "none" : s.exercises?.[d.day]?.walk) walks.done++
  }
  return {
    /** "28 of 30" days with something logged */
    logged: scores.filter((d) => d.status !== "none").length,
    of: scores.length,
    average,
    /** "24 of 26" */
    strength,
    walks,
  }
}

/** The member's Inlay score check ins before today (FINAL-SPEC E.3): May 3,
    66; Aug 3, 69. Today's score is worked out from her answers. */
export const MEMBER_SCORES: { at: string; value: number }[] = [
  { at: "2026-05-03", value: 66 },
  { at: "2026-08-03", value: 69 },
]

/* ---------------------------------------------------- saved questions -- */

/** A question the patient saved for Dr. Patel, from a marker page, an
    answer or a care task (store field `questions`); it shows on the visit
    it is for (S-39). */
export type SavedQuestion = { id: string; text: string; about?: string; for?: string; at: string }

/** The list with one more question, unless the same words are already saved. */
export function withQuestion(list: SavedQuestion[] | undefined, text: string, about?: string, forVisit?: string, now: Date = new Date()): SavedQuestion[] {
  const all = list ?? []
  if (all.some((q) => q.text.trim().toLowerCase() === text.trim().toLowerCase())) return all
  return [...all, { id: `q${now.getTime().toString(36)}`, text: text.trim(), about, for: forVisit, at: now.toISOString() }]
}

/** Questions saved for a visit, and the ones not tied to any visit (they go
    to the next one). */
export const questionsFor = (list: SavedQuestion[] | undefined, visit: string) => (list ?? []).filter((q) => !q.for || q.for === visit)

/* --------------------------------------------------- the member's record -- */

/** The plan's starting tests at Quest on May 5, 2026, added to the member's
    record so "since you started" has a baseline. The free record never had
    this draw. */
export const PLAN_START_RESULTS: Record<string, Point> = {
  a1c: { date: "May 2026", at: "2026-05-05", value: 6.0, shown: "6.0", origin: "lab" },
  ldl: { date: "May 2026", at: "2026-05-05", value: 171, origin: "lab" },
  tg: { date: "May 2026", at: "2026-05-05", value: 201, origin: "lab" },
  // Her BMI at the start: 189.0 lb at 62.8 in, the clinic's baseline on
  // May 3 (the day Home counts "11 lb down" from).
  bmi: { date: "May 2026", at: "2026-05-03", value: 33.7, origin: "doctor" },
}

/** The record as a member sees it: every marker, with the starting tests in
    place. The points stay oldest first, as in BIOMARKERS, so anything that
    reads the last point as the latest (record.ts `comparable`, older
    screens) still gets the Aug 2026 draw, not May's starting test. Free
    patients read BIOMARKERS. */
export function memberMarkers(markers: Biomarker[] = BIOMARKERS): Biomarker[] {
  return markers.map((b) =>
    PLAN_START_RESULTS[b.id] ? { ...b, points: [...b.points, PLAN_START_RESULTS[b.id]].sort((x, y) => pointTime(x) - pointTime(y)) } : b
  )
}

/** The record each patient reads (useMarkers() in lib/experience.ts): the
    record, or the steady set on /demo/free-steady; with any new batch of
    results that has arrived; and with the plan's starting tests while a
    membership is on. */
export function markersFor(s: Pick<Snapshot, "demo" | "batches" | "membership">): Biomarker[] {
  const base = withBatches(s.demo?.steady ? STEADY_RECORD : BIOMARKERS, s.batches ?? [])
  return membershipOn(s.membership) ? memberMarkers(base) : base
}

/** "Down 0.1 since you started in May" for a marker with a starting test,
    with the starting value, or undefined. */
export function sinceStart(b: Biomarker) {
  const start = PLAN_START_RESULTS[b.id]
  if (!start) return undefined
  const marker = b.points.includes(start) ? b : { ...b, points: [...b.points, start] }
  const latest = resultsOf(marker).series.at(-1)
  if (!latest || latest.at === start.at) return undefined
  const delta = latest.value - start.value
  const amount = formatNumber(Math.abs(delta), 1).replace(/\.0$/, "")
  const short = Math.abs(delta) < 0.05 ? "Same as when you started" : `${delta < 0 ? "Down" : "Up"} ${amount} since you started`
  return { from: valueText(b, start), words: `${short} in May`, short }
}
