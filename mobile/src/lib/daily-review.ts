import type { useOnboarding } from "@/lib/onboarding"
import {
  addDays,
  daysBetween,
  localDay,
  mealsOn,
  restingEnergy,
  weekdayOf,
  totalsOf,
  weightOn,
  type MemberFocus,
} from "@/lib/member"
import { formatNumber } from "@/lib/trends"

/* The paid patient's Daily review (Journey 10.6 screen 13, "Yesterday: how
   did I do?", rebuilt 12 Oct 2026): one score, one insight and the plan's
   daily goals for a finished day. What it holds follows the care plan
   decisions in the client's Drive (7 to 9 Oct):
   - every plan carries the energy balance (resting burn plus active burn,
     minus food), then the nutrients its goals need (protein, calcium), then
     exercise minutes;
   - the score is the share of each goal reached, capped at 100% a goal, and
     only a fully logged day gets one;
   - the week's average is the view that matters, because a short day is
     made up the next (Ed, 7 Oct), and calcium balances over a week.
   The previous member home (lib/member.ts, components/home-member.tsx) is
   kept as it was; this is its own model so the two can be compared. */

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]

export type ReviewGoalId = "energy" | "protein" | "calcium" | "exercise" | "water"

export type ReviewGoal = {
  id: ReviewGoalId
  name: string
  unit: "kcal" | "g" | "mg" | "min" | "ml"
  target: number
  /** The words on the card under the number: "Goal 500 kcal deficit". */
  targetWords: string
  /** Food first ideas for the insight's one fix, with what each adds. */
  fixes?: { what: string; adds: number }[]
}

const GOALS: Record<ReviewGoalId, ReviewGoal> = {
  // Olivia burns about 1,420 kcal at rest, so her plan aims for 300 under
  // (the deck's 500 was Ed's own example).
  energy: { id: "energy", name: "Energy balance", unit: "kcal", target: 300, targetWords: "Goal: 300 kcal deficit" },
  protein: {
    id: "protein",
    name: "Protein",
    unit: "g",
    target: 110,
    targetWords: "Goal: at least 110 g",
    fixes: [
      { what: "a cup of Greek yogurt", adds: 20 },
      { what: "two eggs", adds: 12 },
      { what: "a palm sized chicken breast", adds: 30 },
    ],
  },
  calcium: {
    id: "calcium",
    name: "Calcium",
    unit: "mg",
    target: 1000,
    targetWords: "Goal: at least 1,000 mg",
    fixes: [
      { what: "a cup of plain yogurt", adds: 400 },
      { what: "a glass of milk", adds: 300 },
      { what: "a slice of cheese", adds: 200 },
    ],
  },
  exercise: { id: "exercise", name: "Exercise", unit: "min", target: 45, targetWords: "Goal: 45 min" },
  water: {
    id: "water",
    name: "Water",
    unit: "ml",
    target: 2000,
    targetWords: "Goal: at least 2,000 ml",
    fixes: [
      { what: "a large glass of water with each meal", adds: 750 },
      { what: "a bottle of water on your walk", adds: 500 },
    ],
  },
}

/** The goals each plan scores, in the order the screen numbers them. */
const PLAN_GOALS: Record<MemberFocus, ReviewGoal[]> = {
  weight: [GOALS.energy, GOALS.protein, GOALS.calcium, GOALS.exercise, GOALS.water],
  bone: [{ ...GOALS.calcium }, { ...GOALS.protein, target: 100, targetWords: "Goal: at least 100 g" }, { ...GOALS.exercise, target: 30, targetWords: "Goal: 30 min" }, GOALS.water],
}

export type GoalState = "met" | "close" | "under" | "none"

export type GoalDay = {
  goal: ReviewGoal
  /** The day's amount; undefined when nothing was logged for it. */
  value?: number
  /** 0 to 1, capped; undefined on a day that is not scored. */
  credit?: number
  state: GoalState
  /** "8 g below goal", "80 mg over goal", "Goal reached", "Not logged" */
  gapWords: string
  /** The seven days ending on this one, oldest first, for the small bars. */
  week: { label: string; value?: number; partial: boolean; selected: boolean }[]
}

export type EnergyDay = {
  food: number
  resting: number
  active: number
  out: number
  deficit: number
  /** "Watch, synced 12:00 AM": where the active burn came from. */
  source: string
}

export type ReviewDay = {
  day: string
  date: Date
  /** "Yesterday", or "Sat" with the date beside it. */
  title: string
  /** "Oct 11, 2026" */
  dateWords: string
  status: "complete" | "partial" | "none"
  /** Only a fully logged day is scored. */
  percent?: number
  met: number
  total: number
  goals: GoalDay[]
  energy?: EnergyDay
  /** The one fact and the one fix, never a grade. */
  insight: string
  /** The scored days in the seven ending here, averaged and rounded down. */
  weekAverage?: number
  weekScored: number
  /** Bone plans only: calcium across the seven days against seven days of
      the goal ("6,840 of 7,000 mg this week"). */
  weekCalcium?: { total: number; target: number }
  /** Can step to an earlier or later finished day. */
  canBack: boolean
  canForward: boolean
}

/* ------------------------------------------------------- sample days -- */

/** One sample day: food, protein, calcium, exercise minutes and the
    watch's active burn. Weekday pattern, then a few days that differ. */
type Sample = { food: number; protein: number; calcium: number; minutes: number; active: number; water: number; status?: "partial" | "none" }

const PATTERN: Sample[] = [
  { food: 1480, protein: 102, calcium: 1080, minutes: 45, active: 390, water: 1800 },
  { food: 1520, protein: 114, calcium: 960, minutes: 50, active: 410, water: 2100 },
  { food: 1450, protein: 108, calcium: 1020, minutes: 30, active: 300, water: 2300 },
  { food: 1430, protein: 118, calcium: 1100, minutes: 45, active: 380, water: 1600 },
  { food: 1560, protein: 96, calcium: 880, minutes: 40, active: 360, water: 2000 },
  { food: 1500, protein: 112, calcium: 1040, minutes: 60, active: 470, water: 2200 },
  { food: 1490, protein: 105, calcium: 990, minutes: 45, active: 400, water: 1900 },
]

/** Days before today that differ from the pattern. */
const EXCEPTIONS: Record<number, Partial<Sample>> = {
  [-4]: { status: "partial", food: 1010, protein: 70, calcium: 640, water: 900 },
  [-10]: { status: "none" },
  [-15]: { status: "partial", food: 1040, protein: 64, calcium: 700, water: 1000 },
  [-20]: { status: "none" },
}

const HISTORY_DAYS = 30

function sampleOn(offset: number): Sample {
  const base = PATTERN[(-offset - 1) % PATTERN.length]
  return { ...base, ...EXCEPTIONS[offset] }
}

/** The day's amounts: her own logged meals when there are any, otherwise
    the sample. Exercise and the active burn come from the watch. */
function amountsOn(s: Snapshot, date: Date, now: Date): Omit<Sample, "status"> & { status: ReviewDay["status"] } {
  const offset = daysBetween(now, date)
  const sample = sampleOn(offset)
  const meals = mealsOn(s, localDay(date))
  if (!meals.length) return { ...sample, status: sample.status ?? "complete" }
  const totals = totalsOf(meals)
  const logged = new Set(meals.map((m) => m.slot))
  const complete = logged.has("breakfast") && logged.has("lunch") && logged.has("dinner")
  return {
    ...sample,
    // A nutrient her meals have no value for keeps the sample, never zero.
    food: Math.round(totals.calories?.value ?? sample.food),
    protein: Math.round(totals.protein?.value ?? sample.protein),
    calcium: Math.round(totals.calcium?.value ?? sample.calcium),
    status: complete ? ("complete" as const) : ("partial" as const),
  }
}

/* ------------------------------------------------------------- rules -- */

const creditOf = (value: number, target: number) => Math.max(0, Math.min(value / target, 1))

function stateOf(credit: number | undefined): GoalState {
  if (credit === undefined) return "none"
  return credit >= 1 ? "met" : credit >= 0.9 ? "close" : "under"
}

function gapWordsOf(goal: ReviewGoal, value: number | undefined, state: GoalState): string {
  if (value === undefined || state === "none") return "Not logged"
  const diff = value - goal.target
  if (goal.id === "exercise" && diff >= 0) return "Goal reached"
  if (diff === 0) return "Goal reached"
  const unit = goal.id === "energy" ? "kcal" : goal.unit
  return `${formatNumber(Math.abs(diff))} ${unit} ${diff > 0 ? "over" : "below"} goal`
}

function valueOf(goal: ReviewGoal, a: ReturnType<typeof amountsOn>, energy?: EnergyDay): number | undefined {
  // The watch counts exercise whether or not meals were logged.
  if (goal.id === "exercise") return a.minutes
  if (a.status === "none") return undefined
  if (goal.id === "energy") return energy?.deficit
  if (goal.id === "protein") return a.protein
  if (goal.id === "calcium") return a.calcium
  if (goal.id === "water") return a.water
  return a.minutes
}

/** The one fix for the largest miss, said as a fact about the day. */
function insightOf(goals: GoalDay[], status: ReviewDay["status"], dateWords: string, weekCalcium?: { total: number; target: number }): string {
  if (status === "none") return `Nothing was logged on ${dateWords}. Today starts fresh.`
  if (status === "partial") return "Not every meal was logged, so this day has no score. Logging breakfast, lunch and dinner gives you one."
  const misses = goals.filter((g) => g.state !== "met" && g.value !== undefined).sort((a, b) => (a.credit ?? 0) - (b.credit ?? 0))
  const met = goals.filter((g) => g.state === "met").map((g) => g.goal.name.toLowerCase())
  if (!misses.length) return `You met all ${goals.length} goals.`
  const miss = misses[0]
  const short = miss.goal.target - (miss.value ?? 0)
  const lead = met.length ? `You met your ${met[0] === "energy balance" ? "calorie" : met[0]} goal but were` : "You were"
  if (miss.goal.id === "energy") return `${lead} ${formatNumber(short)} kcal short of your deficit. A 15 minute walk after dinner would have closed most of it.`
  if (miss.goal.id === "exercise") return `${lead} ${short} minutes short on exercise. A short walk after dinner would have closed it.`
  const fix = miss.goal.fixes?.find((f) => f.adds >= short) ?? miss.goal.fixes?.[0]
  // Calcium balances over a week (Ed, 7 Oct): one low day is not a miss.
  if (miss.goal.id === "calcium" && weekCalcium)
    return `Calcium was ${formatNumber(short)} mg under your goal, and this week you're at ${formatNumber(weekCalcium.total)} of ${formatNumber(weekCalcium.target)} mg. A cup of plain yogurt today would close the week.`
  const name = miss.goal.name.toLowerCase()
  return fix ? `${lead} ${formatNumber(short)} ${miss.goal.unit} short on ${name}. Adding ${fix.what} would have kept you over your target.` : `${lead} ${formatNumber(short)} ${miss.goal.unit} short on ${name}.`
}

/* -------------------------------------------------------------- days -- */

type Basic = { status: ReviewDay["status"]; percent?: number; values: Partial<Record<ReviewGoalId, number>>; calcium?: number }

function basicDay(s: Snapshot, focus: MemberFocus, date: Date, now: Date): Basic & { goals: Omit<GoalDay, "week">[]; energy?: EnergyDay } {
  const a = amountsOn(s, date, now)
  const goals = PLAN_GOALS[focus]
  const resting = restingEnergy(weightOn(s, date), date)
  const energy: EnergyDay | undefined =
    // Only a fully logged day has a balance: half a day's food is not a deficit.
      a.status !== "complete" || !goals.some((g) => g.id === "energy")
      ? undefined
      : { food: a.food, resting, active: a.active, out: resting + a.active, deficit: resting + a.active - a.food, source: "From your watch, synced at midnight" }
  const scored = a.status === "complete"
  const rows = goals.map((goal) => {
    const value = valueOf(goal, a, energy)
    const credit = scored && value !== undefined ? creditOf(value, goal.target) : undefined
    const state = stateOf(credit)
    return { goal, value, credit, state, gapWords: scored ? gapWordsOf(goal, value, state) : value === undefined ? "Not logged" : "Day not scored" }
  })
  const credits = rows.map((r) => r.credit).filter((c): c is number => c !== undefined)
  const percent = scored && credits.length ? Math.floor((100 * credits.reduce((x, c) => x + c, 0)) / credits.length) : undefined
  const values = Object.fromEntries(rows.map((r) => [r.goal.id, r.value])) as Basic["values"]
  return { status: a.status, percent, values, calcium: a.status === "none" ? undefined : a.calcium, goals: rows, energy }
}

/** The finished day `back` days before today (1 is yesterday). */
export function reviewDay(s: Snapshot, back = 1, now: Date = new Date()): ReviewDay {
  const focus: MemberFocus = s.memberFocus ?? "weight"
  const date = addDays(now, -back)
  const day = basicDay(s, focus, date, now)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(date, i - 6)
    return { date: d, ...basicDay(s, focus, d, now) }
  })
  const goals: GoalDay[] = day.goals.map((g) => ({
    ...g,
    week: weekDays.map((w, i) => ({ label: weekdayOf(w.date), value: w.values[g.goal.id], partial: w.status === "partial" && g.goal.id !== "exercise", selected: i === 6 })),
  }))
  const scoredDays = weekDays.filter((w) => w.percent !== undefined)
  const weekAverage = scoredDays.length ? Math.floor(scoredDays.reduce((x, w) => x + w.percent!, 0) / scoredDays.length) : undefined
  const weekCalcium =
    focus === "bone" ? { total: weekDays.reduce((x, w) => x + (w.calcium ?? 0), 0), target: GOALS.calcium.target * 7 } : undefined
  const dateWords = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return {
    day: localDay(date),
    date,
    title: back === 1 ? "Yesterday" : weekdayOf(date),
    dateWords,
    status: day.status,
    percent: day.percent,
    met: goals.filter((g) => g.state === "met").length,
    total: goals.length,
    goals,
    energy: day.energy,
    insight: insightOf(goals, day.status, dateWords, weekCalcium),
    weekAverage,
    weekScored: scoredDays.length,
    weekCalcium,
    canBack: back < HISTORY_DAYS,
    canForward: back > 1,
  }
}
