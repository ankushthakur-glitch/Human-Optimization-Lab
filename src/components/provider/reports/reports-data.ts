/* The reports engine every portal shares. The provider and clinic manager
   reports are the Executive Health KPIs, in kpi-reports.ts. Laid out
   from the Amazing Grace Center reports page (Figma OulMy5QOcLc2lJ6aX0GpFo,
   40019623:451842).

   Two kinds of report. A count report holds raw counts per row (a provider,
   an employer, a channel) and works every column out from them, so the
   Total row and the tiles use the same sums: a rate in the Total is the rate
   of the summed counts, not an average of the rates. A list report holds one
   record per row (a patient, an order, a vendor) with its own values.
   Numbers are sample data, seeded by report, row and period so a period
   always reads the same. */

import { NOW } from "@/components/provider/mock-clock"
import type { Patient, Provider } from "@/components/practice/practice-data"
import type { Employer } from "@/components/settings/settings-data"

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
  /** First and last ISO day of the period. */
  from: string
  to: string
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December",
]
const SHORT = MONTHS.map((m) => m.slice(0, 3))
const DAY = 86_400_000

const today = new Date(`${NOW.slice(0, 10)}T12:00:00`)

const pad = (n: number) => String(n).padStart(2, "0")
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

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
        from: isoDay(d),
        to: isoDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
      }
    })
  if (kind === "Quarter")
    return Array.from({ length: 8 }, (_, i) => {
      const q = Math.floor(m / 3) - i
      const year = y + Math.floor(q / 4)
      const n = ((q % 4) + 4) % 4
      return {
        key: `q-${year}-${n}`,
        label: `Q${n + 1} ${year}`,
        months: 3,
        from: isoDay(new Date(year, n * 3, 1)),
        to: isoDay(new Date(year, n * 3 + 3, 0)),
      }
    })
  if (kind === "Year")
    return [0, 1, 2].map((i) => ({
      key: `y-${y - i}`,
      label: String(y - i),
      months: 12,
      from: `${y - i}-01-01`,
      to: `${y - i}-12-31`,
    }))
  /* Weeks run Monday to Sunday. */
  const monday = new Date(today.getTime() - ((today.getDay() + 6) % 7) * DAY)
  return Array.from({ length: 12 }, (_, i) => {
    const start = new Date(monday.getTime() - i * 7 * DAY)
    const end = new Date(start.getTime() + 6 * DAY)
    const sameMonth = start.getMonth() === end.getMonth()
    return {
      key: `w-${isoDay(start)}`,
      label: `${SHORT[start.getMonth()]} ${start.getDate()}-${
        sameMonth ? "" : `${SHORT[end.getMonth()]} `
      }${end.getDate()}, ${end.getFullYear()}`,
      months: 7 / 30,
      from: isoDay(start),
      to: isoDay(end),
    }
  })
}

/** A picked range of ISO days as a period, or null until both ends are set. */
export function customPeriod(from: string, to: string): Period | null {
  if (!from || !to || to < from) return null
  const days = (Date.parse(to) - Date.parse(from)) / DAY + 1
  return {
    key: `c-${from}-${to}`,
    label: `${dayLabel(from)} to ${dayLabel(to)}`,
    months: days / 30,
    from,
    to,
  }
}

/** "Oct 3, 2026" for an ISO day. */
export function dayLabel(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  return `${SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/** The ISO day `days` after `iso` (before, when negative). */
export function addDays(iso: string, days: number) {
  return isoDay(new Date(new Date(`${iso.slice(0, 10)}T12:00:00`).getTime() + days * DAY))
}

/** Whole days from `a` to `b`. */
export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / DAY)
}

/** A seeded day inside the period. */
export function dayIn(period: Period, rand: () => number) {
  return addDays(period.from, Math.floor(rand() * (daysBetween(period.from, period.to) + 1)))
}

/* -------------------------------------------------------------------------- */
/*  Filters                                                                    */
/* -------------------------------------------------------------------------- */

export type FilterOption = { label: string; value: string }

/** A report's own filter, in the Filters popover. A list report keeps a row
    when its value under `id` equals the choice, or when `test` says so. A
    count report hands the choice to its counts; `id: "row"` instead picks
    one of the report's own rows. */
export type ReportFilter = {
  id: string
  label: string
  /** The "no filter" choice, e.g. "All employers". */
  all: string
  /** Fixed choices, or choices from the portal's data; left out, the
      choices are the values in the rows. */
  options?: FilterOption[] | ((ctx: ReportContext) => FilterOption[])
  test?: (row: ListRow, value: string) => boolean
}

/** The data a report reads from the portal it opens in. */
export type ReportContext = {
  patients: Patient[]
  providers: Provider[]
  employers: Employer[]
}

/* -------------------------------------------------------------------------- */
/*  Count reports                                                              */
/* -------------------------------------------------------------------------- */

export const PATIENT_TYPES = ["Free", "Optimization members"] as const
export type PatientType = (typeof PATIENT_TYPES)[number]

/** One provider's raw counts for a report. */
export type Counts = Record<string, number>

export type Format =
  | "count"
  | "decimal"
  | "percent"
  | "hours"
  | "days"
  | "years"
  | "currency"
  /** Dollars and cents, for a price. */
  | "price"

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
  /** False when the report only reads one kind of patient, so the patient
      type filter doesn't apply. */
  typeFilter?: false
  /** One provider's counts, from the period's draws. */
  counts: (draw: Draw) => Counts
  /** Rows other than the practice's providers, e.g. a report per vendor:
      the first column's header and the rows. The location, provider and
      patient type filters don't apply to these. */
  rows?: { header: string; items: { id: string; name: string }[] }
  /** Heads the report in the list, e.g. "Billing". */
  group?: string
  filters?: ReportFilter[]
}

export const rate = (num: string, den: string) => (c: Counts) =>
  c[den] ? (c[num] / c[den]) * 100 : 0
export const per = (sum: string, n: string) => (c: Counts) =>
  c[n] ? c[sum] / c[n] : 0
export const raw = (key: string) => (c: Counts) => c[key]

/** `n(lo, hi)`: a whole count for a month of activity, scaled to the period
    and patient type. `size(lo, hi)`: a panel size, which doesn't grow with
    the period. `part(of, lo, hi)`: a share of a count already drawn.
    `months`: how many months the period holds. `filters`: the report's own
    filter choices, by filter id. */
export type Draw = {
  /** The row being drawn: a provider, or one of the report's own rows. */
  id: string
  n: (lo: number, hi: number) => number
  size: (lo: number, hi: number) => number
  part: (of: number, lo: number, hi: number) => number
  rand: () => number
  months: number
  period: Period
  filters: Record<string, string>
}

/** The share of a row's counts one filter choice keeps, seeded so the same
    choice always keeps the same share. */
export function shareOf(id: string, choice: string, lo: number, hi: number) {
  if (!choice) return 1
  return lo + seeded(`${id}|${choice}`)() * (hi - lo)
}

/** Counts scaled down to a share, whole counts staying whole. */
export function scaled(c: Counts, share: number, keep: string[] = []): Counts {
  if (share === 1) return c
  return Object.fromEntries(
    Object.entries(c).map(([k, v]) => [
      k,
      keep.includes(k) ? v : Number.isInteger(v) ? Math.round(v * share) : v * share,
    ])
  )
}

/* -------------------------------------------------------------------------- */
/*  List reports                                                               */
/* -------------------------------------------------------------------------- */

export type ListValue = string | number
/** One record: its values by column id, plus any it is only filtered by. */
export type ListRow = { id: string } & Record<string, ListValue>

export type Tone = "success" | "warning" | "danger" | "muted"

export type ListColumn = {
  id: string
  header: string
  /** "text" shows the value as it is; "date" reads an ISO day. */
  format: Format | "text" | "date"
  /** What an empty value reads as. */
  empty?: string
  /** A status dot before the value. */
  tone?: (row: ListRow) => Tone | undefined
  /** In the Total row: summed, or worked out from all the rows. */
  total?: true | ((rows: ListRow[]) => number)
}

export type ListTile = {
  label: string
  format: Format
  value: (rows: ListRow[], period: Period) => number
  /** A line under the value in place of the previous period's. */
  note?: (rows: ListRow[], period: Period) => string
}

export type ListReport = {
  id: string
  name: string
  group?: string
  /** One row's noun, for the empty state, e.g. "patient". */
  noun: string
  columns: ListColumn[]
  tiles: ListTile[]
  filters: ReportFilter[]
  records: (period: Period, ctx: ReportContext) => ListRow[]
  /** A subtotal row closes each run of rows with the same value here. */
  groupBy?: string
}

export type AnyReport = Report | ListReport

export const isList = (r: AnyReport): r is ListReport => "records" in r

/** One seeded pick. */
export const pickOf = <T,>(items: readonly T[], rand: () => number) =>
  items[Math.floor(rand() * items.length)]


/* -------------------------------------------------------------------------- */
/*  Numbers                                                                    */
/* -------------------------------------------------------------------------- */

/* mulberry32 seeded by a string, so the same inputs give the same numbers. */
export function seeded(text: string) {
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
  type: PatientType | null,
  filters: Record<string, string> = {}
): Counts {
  const rand = seeded(`${report.id}|${providerId}|${period.key}`)
  const share = type && report.typeFilter !== false ? TYPE_SHARE[type] : 1
  /* Panel sizes don't grow with the period; activity does. */
  const draw = (scale: number) => (lo: number, hi: number) =>
    Math.round((lo + rand() * (hi - lo)) * scale)
  return report.counts({
    id: providerId,
    n: draw(period.months * share),
    size: draw(share),
    part: (of, lo, hi) => Math.round(of * (lo + rand() * (hi - lo))),
    rand,
    months: period.months,
    period,
    filters,
  })
}

/** One report's counts for a period, summed over the given providers. */
export function totalFor(
  report: Report,
  providerIds: string[],
  period: Period,
  type: PatientType | null = null
): Counts {
  return sumCounts(providerIds.map((id) => countsFor(report, id, period, type)))
}

/** Counts summed across rows, for the Total row and the tiles. */
export function sumCounts(rows: Counts[]): Counts {
  const out: Counts = {}
  for (const row of rows)
    for (const [k, v] of Object.entries(row)) out[k] = (out[k] ?? 0) + v
  return out
}

/** NaN reads "None": a rate or average with nobody to measure. */
export function formatValue(value: number, format: Format) {
  if (Number.isNaN(value)) return "None"
  switch (format) {
    case "decimal":
      return value.toFixed(1)
    case "percent":
      return `${value.toFixed(2)}%`
    case "hours":
      return `${value.toFixed(1)} hours`
    case "days":
      return `${value.toFixed(1)} days`
    case "years":
      return `${value.toFixed(1)} years`
    case "currency":
      return `$${Math.round(value).toLocaleString("en-US")}`
    case "price":
      return `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    default:
      return Math.round(value).toLocaleString("en-US")
  }
}

/** One list cell as text. */
export function formatCell(row: ListRow, col: ListColumn) {
  const v = row[col.id]
  if (v === "" || v === undefined) return col.empty ?? ""
  if (col.format === "text") return String(v)
  if (col.format === "date") return dayLabel(String(v))
  return formatValue(Number(v), col.format)
}
