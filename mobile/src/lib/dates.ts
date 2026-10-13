/* Dates as the app shows them: "Sep 29, 2026", "Sun, Oct 4", "Today".
   Day and month keys are the device's local date, so a California evening
   never rolls into tomorrow and the AI credit comes back on Monday where
   she lives, not in UTC (A-40). */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const pad = (n: number) => String(n).padStart(2, "0")

export const showDate = (d: Date = new Date()) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`

/** The key a day is kept under, in local time: "2026-10-01". */
export const dayKey = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** The Monday a local week starts on, at midnight. */
export const weekStart = (d: Date = new Date()) => {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7))
  return day
}

/** The key a week is kept under, in local time: its Monday, "2026-10-05".
    The AI credit renews weekly (user, 6 Oct 2026). */
export const weekKey = (d: Date = new Date()) => dayKey(weekStart(d))

/** A day key ("2026-10-04") at local noon; an ISO time as it is. */
const asDate = (date: Date | string) => {
  if (date instanceof Date) return date
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-").map(Number)
    return new Date(y, m - 1, d, 12)
  }
  return new Date(date)
}

/** "Today", "Yesterday" or "Tomorrow" by the calendar day; any other day
    as "Sun, Oct 4". Takes a date, a day key or an ISO time. */
export function relativeDay(date: Date | string, now: Date = new Date()): string {
  const d = asDate(date)
  const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime()) / 86400000)
  if (days === 0) return "Today"
  if (days === -1) return "Yesterday"
  if (days === 1) return "Tomorrow"
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

/** A date in a row: "Sep 18" this year, "Mar 27, 2027" in another
    (C.0.5). */
export const rowDate = (d: Date, now: Date = new Date()) =>
  d.getFullYear() === now.getFullYear() ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : showDate(d)

const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
const DAY_MS = 86_400_000

/** The month in a word ("Nov", "november", "Sept"), or -1. */
const monthOfWord = (word: string) => (word.length < 3 ? -1 : MONTH_NAMES.findIndex((m) => m.startsWith(word)))

/** A day written or typed in words, at local noon, or at its time when it
    has one: "Nov 12", "November 12th", "12 Nov", "Thu, Nov 12", "11/12",
    "11/12/26", "2026-11-12", "Fri, Oct 2, 7:30 AM". A year written is
    kept. Without one, `year` picks it: "next" (the default, for a booking
    she types), this year's day or next year's once this year's has
    passed; "nearest", the year that puts it nearest today (a date the
    record writes without its year, "Sep 15"). A day that does not exist
    (Nov 31) reads as nothing, and so, for "next", does a day before today
    or more than a year ahead. */
export function dayOfWords(text: string, now: Date = new Date(), year: "next" | "nearest" = "next"): Date | undefined {
  // Without a weekday in front, an ordinal ("12th"), a time at the end
  // (kept for later) or a full stop.
  let t = text
    .trim()
    .toLowerCase()
    .replace(/^(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?,?\s*/, "")
    .replace(/(\d)(st|nd|rd|th)\b/, "$1")
  const clock = /,?\s*(\d{1,2}):(\d{2})\s*(am|pm)$/.exec(t)
  if (clock) t = t.slice(0, clock.index)
  t = t.replace(/[.,\s]+$/, "")
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t)
  const numeric = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}|\d{2}))?$/.exec(t)
  const named = /^([a-z]+)\.?\s*(\d{1,2})(?:,?\s+(\d{4}))?$/.exec(t)
  const dayFirst = /^(\d{1,2})\s*([a-z]+)\.?(?:,?\s+(\d{4}))?$/.exec(t)
  const yearOf = (y?: string) => (!y ? undefined : y.length === 2 ? 2000 + Number(y) : Number(y))
  const [month, day, written] = iso
    ? [Number(iso[2]) - 1, Number(iso[3]), Number(iso[1])]
    : numeric
      ? [Number(numeric[1]) - 1, Number(numeric[2]), yearOf(numeric[3])]
      : named
        ? [monthOfWord(named[1]), Number(named[2]), yearOf(named[3])]
        : dayFirst
          ? [monthOfWord(dayFirst[2]), Number(dayFirst[1]), yearOf(dayFirst[3])]
          : [-1, 0, undefined]
  if (month < 0 || month > 11 || day < 1) return undefined
  const hours = clock ? (Number(clock[1]) % 12) + (clock[3] === "pm" ? 12 : 0) : 12
  const minutes = clock ? Number(clock[2]) : 0
  const at = (y: number) => new Date(y, month, day, hours, minutes)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let y = written
  if (y === undefined && year === "nearest")
    y = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].reduce((a, b) =>
      Math.abs(at(b).getTime() - now.getTime()) < Math.abs(at(a).getTime() - now.getTime()) ? b : a
    )
  if (y === undefined) y = new Date(now.getFullYear(), month, day, 12) < today ? now.getFullYear() + 1 : now.getFullYear()
  const date = at(y)
  if (date.getMonth() !== month || date.getDate() !== day) return undefined
  if (year === "next" && (date < today || date.getTime() - today.getTime() > 366 * DAY_MS)) return undefined
  return date
}
