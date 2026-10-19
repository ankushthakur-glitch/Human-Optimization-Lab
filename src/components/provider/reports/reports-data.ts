/* The provider portal's reports: one table per report, a row per provider,
   laid out from the Amazing Grace Center reports page (Figma
   OulMy5QOcLc2lJ6aX0GpFo, 40019623:451842). Every row holds raw counts and
   every column is worked out from them, so the Total row and the tiles use
   the same sums: a rate in the Total is the rate of the summed counts, not
   an average of the rates. Numbers are sample data, seeded by report,
   provider, period and patient type so a period always reads the same. */

import { NOW } from "@/components/provider/mock-clock"

/* -------------------------------------------------------------------------- */
/*  Periods                                                                    */
/* -------------------------------------------------------------------------- */

export const PERIOD_KINDS = ["Week", "Month", "Quarter", "Year", "Custom range"] as const
export type PeriodKind = (typeof PERIOD_KINDS)[number]

export type Period = {
  /** Stable key: seeds the numbers. */
  key: string
  label: string
  /** How many months of activity the period holds, to scale the counts. */
  months: number
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December",
]
const SHORT = MONTHS.map((m) => m.slice(0, 3))
const DAY = 86_400_000

const today = new Date(`${NOW.slice(0, 10)}T12:00:00`)

/** The periods to pick from for one kind, newest first. */
export function periodsFor(kind: Exclude<PeriodKind, "Custom range">): Period[] {
  const y = today.getFullYear()
  const m = today.getMonth()
  if (kind === "Month")
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(y, m - i, 1)
      return {
        key: `m-${d.getFullYear()}-${d.getMonth()}`,
        label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        months: 1,
      }
    })
  if (kind === "Quarter")
    return Array.from({ length: 8 }, (_, i) => {
      const q = Math.floor(m / 3) - i
      const year = y + Math.floor(q / 4)
      const n = ((q % 4) + 4) % 4
      return { key: `q-${year}-${n}`, label: `Q${n + 1} ${year}`, months: 3 }
    })
  if (kind === "Year")
    return [0, 1, 2].map((i) => ({
      key: `y-${y - i}`,
      label: String(y - i),
      months: 12,
    }))
  /* Weeks run Monday to Sunday. */
  const monday = new Date(today.getTime() - ((today.getDay() + 6) % 7) * DAY)
  return Array.from({ length: 12 }, (_, i) => {
    const start = new Date(monday.getTime() - i * 7 * DAY)
    const end = new Date(start.getTime() + 6 * DAY)
    const sameMonth = start.getMonth() === end.getMonth()
    return {
      key: `w-${start.toISOString().slice(0, 10)}`,
      label: `${SHORT[start.getMonth()]} ${start.getDate()}-${
        sameMonth ? "" : `${SHORT[end.getMonth()]} `
      }${end.getDate()}, ${end.getFullYear()}`,
      months: 7 / 30,
    }
  })
}

/** A picked range of ISO days as a period, or null until both ends are set. */
export function customPeriod(from: string, to: string): Period | null {
  if (!from || !to || to < from) return null
  const days = (Date.parse(to) - Date.parse(from)) / DAY + 1
  const day = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`)
    return `${SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  }
  return { key: `c-${from}-${to}`, label: `${day(from)} to ${day(to)}`, months: days / 30 }
}

/* -------------------------------------------------------------------------- */
/*  Reports                                                                    */
/* -------------------------------------------------------------------------- */

export const PATIENT_TYPES = ["Free", "Optimization members"] as const
export type PatientType = (typeof PATIENT_TYPES)[number]

/** One provider's raw counts for a report. */
export type Counts = Record<string, number>

export type Format = "count" | "percent" | "hours" | "days" | "currency"

export type ReportColumn = {
  id: string
  header: string
  format: Format
  value: (c: Counts) => number
}

export type Report = {
  id: string
  name: string
  columns: ReportColumn[]
  /** The tiles over the table, by column id. */
  tiles: string[]
  /** One provider's counts, from the period's draws. */
  counts: (draw: Draw) => Counts
}

const rate = (num: string, den: string) => (c: Counts) =>
  c[den] ? (c[num] / c[den]) * 100 : 0
const per = (sum: string, n: string) => (c: Counts) =>
  c[n] ? c[sum] / c[n] : 0
const raw = (key: string) => (c: Counts) => c[key]

/** `n(lo, hi)`: a whole count for a month of activity, scaled to the period
    and patient type. `part(of, lo, hi)`: a share of a count already drawn. */
type Draw = {
  n: (lo: number, hi: number) => number
  part: (of: number, lo: number, hi: number) => number
  rand: () => number
}

/** Price of the one Optimization plan, per month. */
const PLAN_PRICE = 149

export const REPORTS: Report[] = [
  {
    id: "engagement",
    name: "Patient engagement",
    tiles: ["patients", "active", "activeRate", "declined"],
    columns: [
      { id: "patients", header: "Patients", format: "count", value: raw("patients") },
      { id: "invited", header: "Invited", format: "count", value: raw("invited") },
      { id: "active", header: "Active", format: "count", value: raw("active") },
      { id: "declined", header: "Declined", format: "count", value: raw("declined") },
      { id: "inactive", header: "Inactive", format: "count", value: raw("inactive") },
      { id: "activeRate", header: "Active rate", format: "percent", value: rate("active", "patients") },
    ],
    counts: ({ n }) => {
      const invited = n(6, 22)
      const active = n(40, 110)
      const declined = n(1, 9)
      const inactive = n(0, 6)
      return { invited, active, declined, inactive, patients: invited + active + declined + inactive }
    },
  },
  {
    id: "membership",
    name: "Membership conversion",
    tiles: ["free", "newMembers", "conversion", "revenue"],
    columns: [
      { id: "free", header: "Free patients", format: "count", value: raw("free") },
      { id: "offered", header: "Upgrade viewed", format: "count", value: raw("offered") },
      { id: "newMembers", header: "New members", format: "count", value: raw("newMembers") },
      { id: "conversion", header: "Conversion", format: "percent", value: rate("newMembers", "offered") },
      { id: "revenue", header: "New revenue", format: "currency", value: (c) => c.newMembers * PLAN_PRICE },
    ],
    counts: ({ n, part }) => {
      const free = n(40, 100)
      const offered = part(free, 0.2, 0.6)
      return { free, offered, newMembers: part(offered, 0.08, 0.4) }
    },
  },
  {
    id: "care-plans",
    name: "Care plan review",
    tiles: ["received", "approved", "pending", "turnaround"],
    columns: [
      { id: "received", header: "Sent for review", format: "count", value: raw("received") },
      { id: "approved", header: "Approved", format: "count", value: raw("approved") },
      { id: "changes", header: "Changes requested", format: "count", value: raw("changes") },
      { id: "pending", header: "Waiting", format: "count", value: raw("pending") },
      { id: "turnaround", header: "Average turnaround", format: "days", value: per("days", "approved") },
    ],
    counts: ({ n, rand: r }) => {
      const approved = n(2, 14)
      const changes = n(0, 4)
      const pending = n(0, 5)
      return {
        approved, changes, pending,
        received: approved + changes + pending,
        days: approved * (0.6 + r() * 2.4),
      }
    },
  },
  {
    id: "results",
    name: "Result review turnaround",
    tiles: ["received", "abnormal", "within", "hours"],
    columns: [
      { id: "received", header: "Results received", format: "count", value: raw("received") },
      { id: "abnormal", header: "Out of range", format: "count", value: raw("abnormal") },
      { id: "reviewed", header: "Reviewed", format: "count", value: raw("reviewed") },
      { id: "within", header: "Reviewed within 48 hours", format: "percent", value: rate("fast", "reviewed") },
      { id: "hours", header: "Average time to review", format: "hours", value: per("hours", "reviewed") },
    ],
    counts: ({ n, part, rand: r }) => {
      const received = n(30, 120)
      const reviewed = part(received, 0.92, 1)
      return {
        received, reviewed,
        abnormal: part(received, 0.08, 0.3),
        fast: Math.round(reviewed * (0.55 + r() * 0.43)),
        hours: reviewed * (8 + r() * 50),
      }
    },
  },
  {
    id: "care-gaps",
    name: "Care gap closure",
    tiles: ["open", "closed", "closure", "outreach"],
    columns: [
      { id: "open", header: "Gaps found", format: "count", value: raw("open") },
      { id: "outreach", header: "Outreach sent", format: "count", value: raw("outreach") },
      { id: "closed", header: "Closed", format: "count", value: raw("closed") },
      { id: "closure", header: "Closure rate", format: "percent", value: rate("closed", "open") },
    ],
    counts: ({ n, part }) => {
      const open = n(10, 60)
      return {
        open,
        outreach: part(open, 0.5, 1),
        closed: part(open, 0.1, 0.7),
      }
    },
  },
  {
    id: "medications",
    name: "Medication reconciliation",
    tiles: ["flagged", "confirmed", "pending", "rate"],
    columns: [
      { id: "flagged", header: "Changes flagged", format: "count", value: raw("flagged") },
      { id: "confirmed", header: "Confirmed", format: "count", value: raw("confirmed") },
      { id: "pending", header: "Waiting", format: "count", value: raw("pending") },
      { id: "rate", header: "Confirmed rate", format: "percent", value: rate("confirmed", "flagged") },
    ],
    counts: ({ n }) => {
      const confirmed = n(3, 25)
      const pending = n(0, 7)
      return { confirmed, pending, flagged: confirmed + pending }
    },
  },
  {
    id: "baseline",
    name: "Baseline tests",
    tiles: ["ordered", "completed", "rate", "days"],
    columns: [
      { id: "ordered", header: "Ordered", format: "count", value: raw("ordered") },
      { id: "scheduled", header: "Scheduled", format: "count", value: raw("scheduled") },
      { id: "completed", header: "Completed", format: "count", value: raw("completed") },
      { id: "rate", header: "Completion rate", format: "percent", value: rate("completed", "ordered") },
      { id: "days", header: "Average days to complete", format: "days", value: per("days", "completed") },
    ],
    counts: ({ n, part, rand: r }) => {
      const ordered = n(2, 18)
      const scheduled = part(ordered, 0.6, 1)
      const completed = part(scheduled, 0.3, 1)
      return {
        ordered, completed, scheduled,
        days: completed * (4 + r() * 12),
      }
    },
  },
  {
    id: "tasks",
    name: "Task completion",
    tiles: ["created", "completed", "overdue", "rate"],
    columns: [
      { id: "created", header: "Created", format: "count", value: raw("created") },
      { id: "completed", header: "Completed", format: "count", value: raw("completed") },
      { id: "overdue", header: "Overdue", format: "count", value: raw("overdue") },
      { id: "rate", header: "Completion rate", format: "percent", value: rate("completed", "created") },
    ],
    counts: ({ n, part }) => {
      const created = n(15, 70)
      const completed = part(created, 0.5, 1)
      return { created, completed, overdue: part(created - completed, 0, 0.6) }
    },
  },
]

/* -------------------------------------------------------------------------- */
/*  Numbers                                                                    */
/* -------------------------------------------------------------------------- */

/* mulberry32 seeded by a string, so the same inputs give the same numbers. */
function seeded(text: string) {
  let h = 1779033703
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353)
  let a = (h ^ (h >>> 13)) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* Optimization members are the smaller share of a panel. */
const TYPE_SHARE: Record<PatientType, number> = {
  Free: 0.7,
  "Optimization members": 0.3,
}

/** One provider's counts for a report, period and patient type. */
export function countsFor(
  report: Report,
  providerId: string,
  period: Period,
  type: PatientType | null
): Counts {
  const rand = seeded(`${report.id}|${providerId}|${period.key}`)
  /* Panel sizes don't grow with the period; activity does. */
  const flow = report.id === "engagement" ? 1 : period.months
  const scale = flow * (type ? TYPE_SHARE[type] : 1)
  return report.counts({
    n: (lo, hi) => Math.round((lo + rand() * (hi - lo)) * scale),
    part: (of, lo, hi) => Math.round(of * (lo + rand() * (hi - lo))),
    rand,
  })
}

/** Counts summed across rows, for the Total row and the tiles. */
export function sumCounts(rows: Counts[]): Counts {
  const out: Counts = {}
  for (const row of rows)
    for (const [k, v] of Object.entries(row)) out[k] = (out[k] ?? 0) + v
  return out
}

export function formatValue(value: number, format: Format) {
  switch (format) {
    case "percent":
      return `${value.toFixed(2)}%`
    case "hours":
      return `${value.toFixed(1)} hours`
    case "days":
      return `${value.toFixed(1)} days`
    case "currency":
      return `$${Math.round(value).toLocaleString("en-US")}`
    default:
      return Math.round(value).toLocaleString("en-US")
  }
}
