/* The one clock the provider dashboard reads. Every day count and every
   "new", "since" and "overdue" check measures from NOW, so the sample queue
   reads the same on any day it is opened. */

/** Local time, no zone: the practice's wall clock. */
export const NOW = "2026-10-03T09:00:00"

/** When the signed-in provider last opened the dashboard. */
export const LAST_VISIT = "2026-10-02T18:10:00"

const DAY = 86_400_000

/** A local ISO date or date-time as epoch ms. Dates read as midnight. */
export function ms(iso: string) {
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).getTime()
}

/** Whole calendar days from `iso` to NOW. */
export function daysSince(iso: string) {
  const day = (at: string) => new Date(`${at.slice(0, 10)}T12:00:00`).getTime()
  return Math.round((day(NOW) - day(iso)) / DAY)
}

/** NOW plus `days`, as an ISO date. */
export function daysFromNow(days: number) {
  const d = new Date(ms(NOW) + days * DAY)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Age in whole years at NOW. */
export function ageAt(dob: string) {
  const [y, m, d] = dob.split("-").map(Number)
  const [ny, nm, nd] = NOW.slice(0, 10).split("-").map(Number)
  return ny - y - (nm < m || (nm === m && nd < d) ? 1 : 0)
}

/** MM/DD/YYYY. */
export function usDay(iso: string) {
  if (!iso) return ""
  const [y, m, d] = iso.slice(0, 10).split("-")
  return `${m}/${d}/${y}`
}

/** h:mm AM. */
export function clockTime(iso: string) {
  const [h, m] = iso.slice(11, 16).split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}

/** MM/DD/YYYY, h:mm AM. */
export function usDateTime(iso: string) {
  return `${usDay(iso)}, ${clockTime(iso)}`
}
