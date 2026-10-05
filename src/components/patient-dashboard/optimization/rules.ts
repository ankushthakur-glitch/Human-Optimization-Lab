import type { Trend } from "@/components/dashboard-kit"
import { NOW } from "@/components/provider/mock-clock"
import type { DashboardModel } from "@/components/patient-dashboard/model"
import type {
  Biomarker,
  CategoryScore,
  CheckInState,
  Commitment,
  EnergyDay,
  Goal,
  HeadlineNumber,
  Intervention,
  MarkerPoint,
  OptimizationData,
  PlanDraft,
  ScanRow,
  SnapshotMarker,
  Supplement,
  TimeOfDay,
} from "@/components/patient-dashboard/optimization/types"

/* The optimization view's rules, as pure functions over its data. The HOLv.9
   snapshot renders as the sheet shows it; these rules read the biomarker
   rows behind the side panels and the data the sheet does not carry. */

const TODAY = NOW.slice(0, 10)

/* ------------------------------------------------------------ format -- */

/** "1,215", "34.25", "1.20": grouped, with the decimals asked for. */
export function fmt(v: number, decimals?: number) {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 2,
  })
}

/** "-22", "+148": a signed change, with a real minus left out for hyphen. */
export function signed(v: number, decimals = 0) {
  const s = fmt(Math.abs(v), decimals)
  return v > 0 ? `+${s}` : v < 0 ? `-${s}` : s
}

/** A value as received; numbers grouped, text ("<0.1", "None Seen") kept. */
export function shown(v: string | number) {
  if (typeof v === "number") return fmt(v)
  return /^-?\d+(\.\d+)?$/.test(v) ? fmt(Number(v), (v.split(".")[1] ?? "").length) : v
}

export const isCalc = (name: string) => /\(calculated\)/i.test(name)

/** "MM/DD" for chart ticks. */
export const monthDay = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}`

/* ----------------------------------------------------------- markers -- */

const asNumber = (v: number | string) => (typeof v === "number" ? v : /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : undefined)

/** The numeric points of a marker's history, oldest first. */
export function numericHistory(b: Biomarker) {
  return b.history
    .map((p) => ({ ...p, n: asNumber(p.value) }))
    .filter((p): p is MarkerPoint & { n: number } => p.n !== undefined)
}

export function markerByName(list: Biomarker[], name: string) {
  return list.find((b) => b.name.toLowerCase() === name.toLowerCase())
}

/** The latest point, or the tracker's latest when the series has none. */
export function latestPoint(b: Biomarker): MarkerPoint | undefined {
  return b.history[b.history.length - 1] ?? (b.latest && { date: b.latest.date, value: b.latest.value, source: "" })
}

/** The range a value is judged against: the HOL target, else the lab's. */
function bounds(b: Biomarker) {
  const hasTarget = b.targetLow != null || b.targetHigh != null
  return hasTarget ? { low: b.targetLow, high: b.targetHigh } : { low: b.labLow, high: b.labHigh }
}

export function isInside(b: Biomarker, v: number) {
  const { low, high } = bounds(b)
  if (low == null && high == null) return true
  return (low == null || v >= low) && (high == null || v <= high)
}

/** "≤ 100", "75-95", "≥ 60"; empty when the marker has no range. */
export function targetText(b: Biomarker) {
  const { low, high } = bounds(b)
  if (low != null && high != null) return `${fmt(low)}-${fmt(high)}`
  if (high != null) return `≤ ${fmt(high)}`
  if (low != null) return `≥ ${fmt(low)}`
  return ""
}

export function labRangeText(b: Biomarker) {
  if (b.labLow != null && b.labHigh != null) return `${fmt(b.labLow)}-${fmt(b.labHigh)}`
  if (b.labHigh != null) return `≤ ${fmt(b.labHigh)}`
  if (b.labLow != null) return `≥ ${fmt(b.labLow)}`
  return ""
}

/** How far inside its range a value sits; negative outside it. */
function margin(b: Biomarker, v: number) {
  const { low, high } = bounds(b)
  return Math.min(low != null ? v - low : Infinity, high != null ? high - v : Infinity)
}

/**
 * The last two comparable numeric points, judged by which way is better: a
 * move of more than 5% is Worsening or Improving, less is Stable, one point
 * is New. For Range and Maintain markers, worse is toward or past the
 * nearer edge. A series in one unit only, so points never mix units.
 */
export function trendOf(b: Biomarker): Trend {
  const h = numericHistory(b)
  if (h.length < 2) return "new"
  const prev = h[h.length - 2].n
  const last = h[h.length - 1].n
  if (Math.abs(last - prev) / Math.abs(prev || 1) <= 0.05) return "stable"
  let worse: boolean
  if (b.betterDirection === "Lower") worse = last > prev
  else if (b.betterDirection === "Higher") worse = last < prev
  else if (b.betterDirection === "Range" || b.betterDirection === "Maintain") worse = margin(b, last) < margin(b, prev)
  else return "stable"
  return worse ? "worsening" : "improving"
}

export const isRising = (b: Biomarker) => {
  const h = numericHistory(b)
  return h.length > 1 && h[h.length - 1].n > h[h.length - 2].n
}

/** Points dated after the cutoff, one per marker and day. */
export function pointsAfter(list: Biomarker[], cutoff: string) {
  const seen = new Set<string>()
  return list.flatMap((b) =>
    b.history
      .filter((p) => p.date > cutoff.slice(0, 10))
      .filter((p) => {
        const key = `${b.name}|${p.date}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((p) => ({ marker: b.name, ...p }))
  )
}

/**
 * Targets met since the cutoff: the point before was outside the marker's
 * target or lab range, and a point dated after the cutoff is inside.
 */
export function targetsMet(list: Biomarker[], cutoff: string) {
  const day = cutoff.slice(0, 10)
  return list.filter((b) => {
    if (b.status === "Informational") return false
    const h = numericHistory(b)
    return h.some((p, i) => p.date > day && i > 0 && !isInside(b, h[i - 1].n) && isInside(b, p.n))
  })
}

/** A not-yet-tested item drops once any later result for the marker exists. */
export function stillUntested<T extends { name: string }>(rows: T[], list: Biomarker[]) {
  return rows.filter((r) => {
    const b = markerByName(list, r.name)
    return !b || b.history.length === 0
  })
}

/* ----------------------------------------------------- since review -- */

export type SinceKind = "results" | "medications" | "outside" | "diagnoses" | "reports" | "targets" | "orders"

/** Counts dated after the last review; a kind with nothing new is left out. */
export function sinceCounts(core: DashboardModel, opt: OptimizationData, cutoff: string) {
  const day = cutoff.slice(0, 10)
  const counts: Record<SinceKind, number> = {
    results: pointsAfter(opt.biomarkers, cutoff).length,
    medications: core.cases.filter((c) => c.date > day).length,
    outside: core.data.encounters.filter((e) => e.date > day).length,
    diagnoses: opt.conditions.filter((c) => c.addedAt > day).length,
    reports: core.data.reports.filter((r) => r.date > day && r.flag !== "Normal").length,
    targets: targetsMet(opt.biomarkers, cutoff).length,
    orders: core.orders.length,
  }
  return (Object.keys(counts) as SinceKind[]).filter((k) => counts[k] > 0).map((k) => ({ kind: k, count: counts[k] }))
}

/* -------------------------------------------------------- headline -- */

/** Down is good when lower is better; the sign's colour follows that. */
export function headlineDelta(h: HeadlineNumber) {
  /* One decimal at most, as the sheet prints it: -3.75 reads -3.8. */
  const change = Number((h.latest - h.baseline).toFixed(1))
  const good = h.better === "Lower" ? change < 0 : change > 0
  return { change, good }
}

/* ------------------------------------------------------------- goals -- */

/** Share of the way from baseline to goal, held to 0-1. */
export function goalProgress(g: Goal) {
  const span = g.goal - g.baseline
  if (span === 0) return 1
  return Math.max(0, Math.min(1, (g.current - g.baseline) / span))
}

/** One per goal whose series has a baseline and a later point. */
export function goalCards(goals: Goal[], list: Biomarker[]) {
  return goals.filter((g) => {
    const b = markerByName(list, g.seriesMarkerName)
    return b && numericHistory(b).length >= 2
  })
}

export function goalLine(g: Goal) {
  const p = goalProgress(g)
  const moved = Math.abs(g.current - g.baseline)
  const word = g.current < g.baseline ? "Down" : "Up"
  return {
    lead: `${word} ${fmt(moved)} ${g.unit}`,
    progress: p >= 1 ? "Goal met" : `${Math.round(p * 100)}% of the way to goal`,
  }
}

/* -------------------------------------------------------- categories -- */

export type CategoryBand = "Priority area" | "Mixed" | "Strong"

export function categoryBand(score: number): CategoryBand {
  if (score < 60) return "Priority area"
  if (score < 85) return "Mixed"
  return "Strong"
}

/** Sorted ascending, as the sheet's chart reads. */
export function categoryRows(list: CategoryScore[]) {
  return [...list].sort((a, b) => a.score - b.score).map((c) => ({ ...c, band: categoryBand(c.score) }))
}

/* --------------------------------------------------------------- scan -- */

export function scanChange(r: ScanRow) {
  return {
    delta: r.latest - r.first,
    pct: Number((((r.latest - r.first) / r.first) * 100).toFixed(1)),
  }
}

/* ------------------------------------------------------------- energy -- */

export function energySummary(days: EnergyDay[]) {
  const n = days.length || 1
  const avg = (f: (d: EnergyDay) => number) => Math.round(days.reduce((s, d) => s + f(d), 0) / n)
  return {
    deficit: avg((d) => d.burn - d.intake),
    intake: avg((d) => d.intake),
    burn: avg((d) => d.burn),
    last: days[days.length - 1]?.date,
    lowDays: days.filter((d) => d.lowConfidence).map((d) => d.date),
  }
}

/* --------------------------------------------------------------- plan -- */

const at = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).getTime()

/**
 * A lane runs from its start to today; a Completed lane ends at its review
 * date. High priority lanes come first, then by start date.
 */
export function planLanes(list: Intervention[]) {
  const rank = (i: Intervention) => (i.status === "High priority" ? 0 : 1)
  return [...list]
    .sort((a, b) => rank(a) - rank(b) || a.start.localeCompare(b.start))
    .map((i) => ({ ...i, end: i.status === "Completed" ? i.nextReview : TODAY }))
}

/** The axis from the plan's first month to today, with month starts placed. */
export function planAxis(since: string) {
  const from = `${since.slice(0, 7)}-01`
  const start = at(from)
  const span = at(TODAY) - start
  const pos = (iso: string) => Math.max(0, Math.min(1, (at(iso) - start) / span))
  const months: { label: string; x: number }[] = []
  const d = new Date(`${from}T12:00:00`)
  while (d.getTime() <= at(TODAY)) {
    const x = (d.getTime() - start) / span
    if (x <= 0.97) months.push({ label: d.toLocaleString("en-US", { month: "short" }), x })
    d.setMonth(d.getMonth() + 1)
  }
  return { pos, months }
}

/* ---------------------------------------------------------- drafts -- */

/** "1 add · 1 change · 1 test", over the items still waiting. */
export function draftSummary(draft: PlanDraft) {
  const pending = draft.items.filter((i) => i.status === "pending")
  const n = (k: string) => pending.filter((i) => i.kind === k).length
  return [
    n("Add") && `${n("Add")} add`,
    n("Change") && `${n("Change")} change`,
    n("Add test") && `${n("Add test")} test`,
  ]
    .filter(Boolean)
    .join(" · ")
}

/* -------------------------------------------------------- check-ins -- */

export type CheckInSlot = { month: string; state?: CheckInState }

/** One slot per month from the first check-in to the next one due. */
export function checkInSlots(c: Commitment): CheckInSlot[] {
  const first = c.checkIns[0]?.date ?? c.nextCheckIn
  const d = new Date(`${first.slice(0, 7)}-01T12:00:00`)
  const end = c.nextCheckIn.slice(0, 7)
  const slots: CheckInSlot[] = []
  while (d.toISOString().slice(0, 7) <= end) {
    const ym = d.toISOString().slice(0, 7)
    slots.push({
      month: d.toLocaleString("en-US", { month: "short" }),
      state: c.checkIns.find((x) => x.date.startsWith(ym))?.state,
    })
    d.setMonth(d.getMonth() + 1)
  }
  return slots
}

/* -------------------------------------------------------- supplements -- */

export const TIMES: TimeOfDay[] = ["Morning", "Midday", "Afternoon", "Evening", "Night"]

export function supplementsByTime(list: Supplement[]) {
  return TIMES.map((t) => ({ time: t, items: list.filter((s) => s.timing === t && s.status === "Active") })).filter(
    (g) => g.items.length > 0
  )
}

/* ------------------------------------------------------------- bands -- */

export type BandKey = "Out of target" | "On watch" | "Not yet tested"

export const BANDS: BandKey[] = ["Out of target", "On watch", "Not yet tested"]

export function bandRows(snapshot: OptimizationData["snapshot"], list: Biomarker[]): Record<BandKey, SnapshotMarker[]> {
  return {
    "Out of target": snapshot.bands["Out of target"],
    "On watch": snapshot.bands["On watch"],
    "Not yet tested": stillUntested(snapshot.bands["Not yet tested"], list),
  }
}
