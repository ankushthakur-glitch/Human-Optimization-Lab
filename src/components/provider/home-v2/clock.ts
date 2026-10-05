/* The one clock the provider home reads. Day counts, "new", "since" and
   "overdue" all measure from NOW, so the sample queue reads the same on any
   day it is opened. Dates are local wall-clock, no zone. */

export const NOW = "2026-10-03T09:00:00"

/** The signed-in provider's last visit: anything created after it is new. */
export const LAST_VISIT = "2026-10-02T18:10:00"

const DAY_MS = 86_400_000

/** Calendar day number, DST-proof: the date part as a UTC day count. */
function dayNumber(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return Math.floor(Date.UTC(y!, m! - 1, d!) / DAY_MS)
}

/** Whole calendar days from `iso` to NOW (negative when `iso` is ahead). */
export function daysSince(iso: string) {
  return dayNumber(NOW) - dayNumber(iso)
}

/** The ISO date `days` after NOW. */
export function dateFromNow(days: number) {
  const d = new Date((dayNumber(NOW) + days) * DAY_MS)
  return d.toISOString().slice(0, 10)
}

/** Age in whole years at NOW. */
export function ageAt(dob: string) {
  const [y, m, d] = dob.slice(0, 10).split("-").map(Number)
  const [ny, nm, nd] = NOW.slice(0, 10).split("-").map(Number)
  return ny! - y! - (nm! < m! || (nm === m && nd! < d!) ? 1 : 0)
}

/** MM/DD/YYYY. */
export function fmtDate(iso: string) {
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`
}

/** h:mm AM. */
export function fmtTime(iso: string) {
  const [h, m] = iso.slice(11, 16).split(":").map(Number)
  return `${h! % 12 || 12}:${String(m).padStart(2, "0")} ${h! < 12 ? "AM" : "PM"}`
}

/** MM/DD/YYYY, h:mm AM. */
export function fmtDateTime(iso: string) {
  return `${fmtDate(iso)}, ${fmtTime(iso)}`
}

/** A count with thousands separators. */
export function fmtInt(n: number) {
  return n.toLocaleString("en-US")
}
