import type { GanttLane } from "@/components/dashboard-kit-v2"
import { PALETTE } from "@/components/dashboard-kit-v2/charts"
import { usDay } from "@/components/provider/mock-clock"
import type { DashboardModel } from "@/components/patient-dashboard/model"
import { type MedCase, isUrgentReport } from "@/components/patient-dashboard/rules"
import type { ClinicalReport } from "@/components/patient-dashboard/types"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import { type BandKey, categoryBand, planAxis, planLanes, scanChange } from "@/components/patient-dashboard/optimization/rules"
import type { CheckInState, InterventionStatus, SnapshotBand, SnapshotMarker } from "@/components/patient-dashboard/optimization/types"

/* The Overview's own selectors: pure functions from the models to what
   each card renders. The HOLv.9 snapshot is rendered as the sheet shows
   it; these rules only choose, group and word. */

/* ------------------------------------------------------------ tier 1 -- */

export type NeedsYouRow =
  | { kind: "report"; key: string; report: ClinicalReport; title: string; suffix?: string; subline: string }
  | { kind: "result"; key: string; title: string; subline: string }
  | { kind: "plan"; key: string; subline: string }
  | { kind: "checkin"; key: string; title: string; month: string }

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** "sleep medicine referral not scheduled (day 115)" for the order a report waits on. */
function orderClause(core: DashboardModel, report: ClinicalReport) {
  const order = report.orderRef ? core.orders.find((o) => o.order === report.orderRef) : undefined
  if (!order) return ""
  if (order.clock.kind === "future") return `${lower(order.order)} booked for ${usDay(order.clock.scheduledAt)}`
  return `${lower(order.order)} not scheduled (day ${order.clock.day})`
}

/** "1 addition · 1 change · 1 new test", over the items still waiting. */
export function draftCounts(model: OptimizationModel) {
  const n = (k: string) => model.pendingDraft.filter((i) => i.kind === k).length
  return [
    n("Add") ? `${n("Add")} ${n("Add") === 1 ? "addition" : "additions"}` : "",
    n("Change") ? `${n("Change")} ${n("Change") === 1 ? "change" : "changes"}` : "",
    n("Add test") ? `${n("Add test")} ${n("Add test") === 1 ? "new test" : "new tests"}` : "",
  ].filter(Boolean)
}

const STRUGGLING: CheckInState[] = ["Struggling", "Didn't start"]

/** Everything Tier 1 shows: urgent items, the plan approval, a bad check-in. */
export function needsYouRows(core: DashboardModel, model: OptimizationModel): NeedsYouRow[] {
  const rows: NeedsYouRow[] = []
  for (const u of core.urgent) {
    const report =
      u.target.kind === "report" ? core.reports.find((r) => `report:${r.report}:${r.date}` === u.key && isUrgentReport(r)) : undefined
    if (report) {
      rows.push({
        kind: "report",
        key: u.key,
        report,
        title: `${report.report}: ${report.short ?? lower(report.finding)}`,
        suffix: report.uploader ? `uploaded by ${report.uploader}` : undefined,
        subline: [report.values, usDay(report.date), orderClause(core, report)].filter(Boolean).join(" · "),
      })
    } else {
      rows.push({ kind: "result", key: u.key, title: u.text, subline: `${u.source} · ${usDay(u.date)}` })
    }
  }
  if (model.draft && model.pendingDraft.length > 0) {
    rows.push({ kind: "plan", key: "plan", subline: [`Drafted ${usDay(model.draft.draftedAt)}`, ...draftCounts(model)].join(" · ") })
  }
  const c = model.data.commitment
  const last = c?.checkIns[c.checkIns.length - 1]
  if (c && last && STRUGGLING.includes(last.state)) {
    const month = new Date(`${last.date.slice(0, 10)}T12:00:00`).toLocaleString("en-US", { month: "long" })
    rows.push({ kind: "checkin", key: "checkin", title: `Check-in: ${last.state} · ${month}`, month })
  }
  return rows
}

/* ----------------------------------------------------------- markers -- */

export type MarkerRow = SnapshotMarker & { category?: string }

/** Rows of a band, Tier 1 first (shown by default), the rest behind one link. */
export function markerTable(model: OptimizationModel, band: BandKey, category?: string) {
  const rows: MarkerRow[] = model.bands[band].map((r) => ({ ...r, category: model.marker(r.name)?.category }))
  const filtered = category ? rows.filter((r) => r.category?.toLowerCase() === category.toLowerCase()) : rows
  const first = filtered.filter((r) => r.tier === "Tier 1")
  const rest = filtered.filter((r) => r.tier !== "Tier 1")
  const tiers = new Set(rest.map((r) => r.tier))
  const more =
    rest.length === 0 ? "" : tiers.size === 1 && tiers.has("Tier 2") ? `Show ${rest.length} Tier 2 markers` : `Show ${rest.length} more`
  return { first: first.length > 0 ? first : rest, rest: first.length > 0 ? rest : [], more: first.length > 0 ? more : "" }
}

export const BAND_COLOR: Record<SnapshotBand, string> = {
  "Out of target": PALETTE.clinical,
  "On watch": PALETTE.process,
  "Not yet tested": PALETTE.info,
  "In range": PALETTE.primary,
  Optimal: PALETTE.success,
}

export const BAND_ORDER: SnapshotBand[] = ["Out of target", "On watch", "Not yet tested", "In range", "Optimal"]

/** The five status groups with the sheet's counts. */
export function scoreRows(model: OptimizationModel) {
  const counts = model.data.snapshot.counts
  return BAND_ORDER.map((b) => ({ key: b, label: b, count: counts[b], color: BAND_COLOR[b] }))
}

/* --------------------------------------------------------- medications -- */

export type MedicationRow = {
  medication: string
  /** "10 mg", "5 mg as needed". */
  dose: string
  /** The prescriber, when it is not the signed-in physician. */
  prescriber?: string
  case?: MedCase
}

/** One row per practice-list medication, with its open case if any. */
export function medicationRows(core: DashboardModel, me: string): MedicationRow[] {
  return core.data.medications
    .filter((m) => m.isPracticeList)
    .map((m) => ({
      medication: m.medication,
      dose: m.frequency === "as needed" ? `${m.dose} as needed` : m.dose,
      prescriber: m.prescriber && m.prescriber !== me ? m.prescriber : undefined,
      case: core.cases.find((c) => c.medication.toLowerCase() === m.medication.toLowerCase()),
    }))
}

/* --------------------------------------------------------------- body -- */

/** The headline numbers that have a goal: the stat cells of Body progress. */
export function bodyCells(model: OptimizationModel) {
  return model.data.snapshot.headline
    .map((h) => ({ headline: h, goal: model.goals.find((g) => g.seriesMarkerName.toLowerCase() === h.seriesMarkerName.toLowerCase()) }))
    .filter((x): x is { headline: (typeof x)["headline"]; goal: NonNullable<(typeof x)["goal"]> } => Boolean(x.goal))
}

/** The DEXA rows with their percent change and the shared bar scale. */
export function compositionRows(model: OptimizationModel) {
  const rows = model.data.scans.map((r) => ({ ...r, ...scanChange(r) }))
  const scale = Math.max(...rows.map((r) => Math.abs(r.pct)), 1)
  const watch = rows.filter((r) => r.status === "Watch")
  return { rows, scale, watch }
}

/* ----------------------------------------------------------- categories -- */

export function categoryCells(model: OptimizationModel) {
  const cells = model.categories.map((c) => ({
    key: c.category,
    label: c.category,
    score: c.score,
    read: (categoryBand(c.score) === "Priority area" ? "priority" : categoryBand(c.score) === "Mixed" ? "mixed" : "strong") as "priority" | "mixed" | "strong",
  }))
  const count = (read: string) => cells.filter((c) => c.read === read).length
  return { cells, legend: [{ key: "priority", label: "Priority area", n: count("priority") }, { key: "mixed", label: "Mixed", n: count("mixed") }, { key: "strong", label: "Strong", n: count("strong") }] }
}

/* --------------------------------------------------------------- plan -- */

export const STATUS_COLOR: Record<InterventionStatus, string> = {
  "High priority": PALETTE.clinical,
  Active: PALETTE.primary,
  Verify: PALETTE.processLight,
  Completed: "var(--ring)",
}

export type PlanLane = ReturnType<typeof planLanes>[number]

/** The lanes as the Gantt draws them; completed ones only when asked. */
export function planGantt(model: OptimizationModel, showCompleted: boolean) {
  const all = planLanes(model.data.interventions)
  const lanes = showCompleted ? all : all.filter((l) => l.status !== "Completed")
  const { pos, months } = planAxis(model.data.planSince)
  const toLane = (l: PlanLane): GanttLane => ({
    key: l.name,
    label: l.name,
    from: pos(l.start),
    to: pos(l.end),
    color: STATUS_COLOR[l.status],
    status: l.status,
    outcome: l.observed,
    range: `${usDay(l.start)} to ${usDay(l.end)}`,
  })
  return {
    lanes: lanes.map(toLane),
    source: lanes,
    months,
    active: all.filter((l) => l.status !== "Completed").length,
    completed: all.filter((l) => l.status === "Completed").length,
  }
}
