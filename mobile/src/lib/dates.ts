/* Dates as the app shows them: "Sep 29, 2026". */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export const showDate = (d: Date = new Date()) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`

/** The key a day's log is kept under. */
export const dayKey = (d: Date = new Date()) => d.toISOString().slice(0, 10)

export const monthKey = (d: Date = new Date()) => d.toISOString().slice(0, 7)

export function addMonths(d: Date, n: number) {
  const next = new Date(d)
  next.setMonth(next.getMonth() + n)
  return next
}
