import { addDays, dayFrom, localDay } from "@/lib/member"

/* Alcohol inside food intake (HOL call 23 Oct): the weekly total against a
   limit line, and every sitting counted on its own, since seven drinks on
   one Saturday, or four at one sitting, is the pattern worth naming even in
   a week that stays under the limit. */

/** A week's limit: seven standard drinks. */
export const WEEK_LIMIT = 7
/** Four or more at one sitting is a heavy sitting. */
export const HEAVY_SITTING = 4

/** One sitting: the day, how many standard drinks, when she logged it. */
export type DrinkLog = { id: string; day: string; count: number; at: string }

export type Week = { start: Date; total: number; heavy: number; now: boolean }

/** The sample weeks before she logs her own, as days back from this
    week's Monday: the Saturday with seven, the Friday with four. */
const SAMPLE: { back: number; count: number }[] = [
  { back: 2, count: 7 },
  { back: 4, count: 1 },
  { back: 9, count: 2 },
  { back: 10, count: 4 },
  { back: 16, count: 3 },
  { back: 19, count: 1 },
  { back: 24, count: 2 },
  { back: 30, count: 5 },
  { back: 31, count: 1 },
]

/** The Monday that starts the week of `date`, at local noon. */
export function weekStart(date: Date) {
  const d = dayFrom(localDay(date))
  return addDays(d, -((d.getDay() + 6) % 7))
}

/** Her sittings, newest first: what she logged, with the sample before it. */
export function sittingsOf(logged: DrinkLog[] | undefined, now = new Date()): DrinkLog[] {
  const monday = weekStart(now)
  const sample = SAMPLE.map((x, i) => {
    const day = localDay(addDays(monday, -x.back))
    return { id: `sample-${i}`, day, count: x.count, at: day }
  })
  return [...(logged ?? []), ...sample].sort((a, b) => b.day.localeCompare(a.day) || b.at.localeCompare(a.at))
}

/** The last `count` weeks, oldest first, this week last. */
export function weeksOf(sittings: DrinkLog[], count = 6, now = new Date()): Week[] {
  const monday = weekStart(now)
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(monday, -7 * (count - 1 - i))
    const end = localDay(addDays(start, 7))
    const inWeek = sittings.filter((x) => x.day >= localDay(start) && x.day < end)
    return { start, total: inWeek.reduce((n, x) => n + x.count, 0), heavy: inWeek.filter((x) => x.count >= HEAVY_SITTING).length, now: i === count - 1 }
  })
}

export const drinksWord = (n: number) => `${n} ${n === 1 ? "drink" : "drinks"}`
