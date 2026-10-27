import { addDays, dayFrom, localDay } from "@/lib/member"

/* Alcohol inside food intake (HOL calls 23 and 26 Oct): Dr. Blanchard's two
   limits, no more than three drinks at one time and no more than two
   drinking days a week, each graphed on Eat history like calories, by
   week over the last month or by month over six. The sample shows the
   heavier months before the plan easing since. */

/** No more than three drinks at one time. */
export const SITTING_LIMIT = 3
/** No more than two drinking days a week. */
export const DAYS_LIMIT = 2

/** One sitting: the day, how many standard drinks, when she logged it. */
export type DrinkLog = { id: string; day: string; count: number; at: string }

/** A week or a month: its drinking days (for a month, the average a week,
    to one decimal) and the most drinks at one time. */
export type Span = { start: Date; days: number; most: number; now: boolean }

/** The sample six months before she logs her own, one row a week back from
    this week's Monday: drinks on the Saturday, Friday, Wednesday and
    Sunday of that week, 0 for none. */
const SAMPLE_WEEKS: [number, number, number, number][] = [
  // September and October: mostly within both limits, one slip.
  [3, 0, 0, 0],
  [2, 1, 0, 0],
  [2, 0, 0, 0],
  [4, 2, 0, 0],
  [2, 0, 0, 0],
  [3, 1, 0, 0],
  [1, 0, 0, 0],
  [2, 2, 0, 0],
  // July and August.
  [3, 2, 1, 0],
  [2, 0, 0, 0],
  [4, 2, 0, 0],
  [3, 1, 0, 0],
  [2, 0, 1, 0],
  [5, 2, 0, 0],
  [3, 0, 0, 0],
  [2, 1, 0, 0],
  // May and June, before the plan.
  [6, 2, 1, 0],
  [4, 3, 0, 1],
  [5, 2, 1, 0],
  [3, 2, 0, 0],
  [6, 2, 1, 1],
  [4, 0, 1, 0],
  [5, 3, 0, 0],
  [3, 2, 1, 0],
  [6, 2, 0, 1],
  [4, 2, 1, 0],
]
/** Days back from that week's Monday to its Saturday, Friday, Wednesday, Sunday. */
const OFFSETS = [2, 3, 5, 1]

/** The Monday that starts the week of `date`, at local noon. */
export function weekStart(date: Date) {
  const d = dayFrom(localDay(date))
  return addDays(d, -((d.getDay() + 6) % 7))
}

/** Her sittings, newest first: what she logged, with the sample before it. */
export function sittingsOf(logged: DrinkLog[] | undefined, now = new Date()): DrinkLog[] {
  const monday = weekStart(now)
  const sample = SAMPLE_WEEKS.flatMap((counts, w) =>
    counts.flatMap((count, i) => {
      if (!count) return []
      const day = localDay(addDays(monday, -(7 * w + OFFSETS[i])))
      return [{ id: `sample-${w}-${i}`, day, count, at: day }]
    })
  )
  return [...(logged ?? []), ...sample].sort((a, b) => b.day.localeCompare(a.day) || b.at.localeCompare(a.at))
}

function spanOf(sittings: DrinkLog[], from: Date, to: Date) {
  const inside = sittings.filter((x) => x.day >= localDay(from) && x.day < localDay(to))
  return { days: new Set(inside.map((x) => x.day)).size, most: Math.max(0, ...inside.map((x) => x.count)) }
}

/** The last `count` weeks, oldest first, this week last. */
export function weeksOf(sittings: DrinkLog[], count = 5, now = new Date()): Span[] {
  const monday = weekStart(now)
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(monday, -7 * (count - 1 - i))
    return { start, ...spanOf(sittings, start, addDays(start, 7)), now: i === count - 1 }
  })
}

/** The last `count` months, oldest first, this month last; each week
    belongs to the month its Monday falls in, and this week counts only
    once it is over. */
export function monthsOf(sittings: DrinkLog[], count = 6, now = new Date()): Span[] {
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1, 12)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1, 12)
    let monday = weekStart(start)
    if (monday < start) monday = addDays(monday, 7)
    const weeks: number[] = []
    for (; monday < end && addDays(monday, 7) <= now; monday = addDays(monday, 7)) weeks.push(spanOf(sittings, monday, addDays(monday, 7)).days)
    const days = weeks.length ? Math.round((weeks.reduce((n, d) => n + d, 0) / weeks.length) * 10) / 10 : 0
    return { start, days, most: spanOf(sittings, start, end).most, now: i === count - 1 }
  })
}

/** Drinking days this week so far. */
export function daysThisWeek(sittings: DrinkLog[], now = new Date()) {
  const monday = weekStart(now)
  return spanOf(sittings, monday, addDays(monday, 7)).days
}

export const drinksWord = (n: number) => `${n} ${n === 1 ? "drink" : "drinks"}`
