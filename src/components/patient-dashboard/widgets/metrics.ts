import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import {
  fmt,
  markerByName,
  numericHistory,
  targetText,
} from "@/components/patient-dashboard/optimization/rules"
import type {
  Biomarker,
  Intervention,
  SnapshotMarker,
  VisitPriority,
} from "@/components/patient-dashboard/optimization/types"
import {
  contextOf,
  planFor,
  relatedOf,
} from "@/components/patient-dashboard/widgets/context"

/* Version 4's data layer. Every marker the dashboard shows becomes one
   HealthMetric, read from the HOLv.9 tracker: the Dashboard sheet's
   snapshot decides the band and the value the sheet prints, the biomarker
   rows give the history, target and next step. Nothing is recomputed to
   look better; a newer reading than the snapshot's shows as a repeat. The
   components only read these objects. */

export type StatusKey = "out" | "watch" | "untested" | "optimal"

export const STATUS_ORDER: StatusKey[] = ["out", "watch", "untested", "optimal"]

export type Direction = "improving" | "worsening" | "stable" | "new"

export type Point = { date: string; value: number; source: string }

export type HealthMetric = {
  id: string
  name: string
  /** The short name a card uses: "Body fat", "RMR". */
  label: string
  category: string
  unit: string
  /** As the snapshot prints it, else the tracker's latest. */
  value?: string
  valueDate?: string
  source?: string
  target: string
  targetLow?: number
  targetHigh?: number
  status: StatusKey
  flag?: "High" | "Low" | "Watch"
  tier?: string
  /** The plan-start reading the change is measured from. */
  previous?: Point
  latest?: Point
  change?: number
  percentageChange?: number
  decimals: number
  trend: Direction
  /** Which way the latest move went, for the arrow. */
  rising?: boolean
  history: Point[]
  /** A reading newer than the snapshot's value. */
  repeat?: Point
  action?: string
  nextStep?: string
  nextTest?: string
  frequency?: string
  explanation: string
  why: string
  relatedMarkers: string[]
  plan: Intervention[]
  priorities: VisitPriority[]
  /** For a not yet tested row: the test to order, and whether it is. */
  test?: { name: string; ordered: boolean; orderable: boolean }
}

/** "Body Fat Total" reads "Body fat" on a card. */
const LABEL: Record<string, string> = {
  "Body Fat Total": "Body fat",
  "VAT Area": "VAT area",
  "VAT Volume": "VAT volume",
  "Fat Mass": "Fat mass",
  "Lean Mass": "Lean mass",
  "Resting Metabolic Rate": "RMR",
  "Hemoglobin A1c": "HbA1c",
  "Urine Albumin/Creatinine Ratio": "Urine ACR",
}
export const labelOf = (name: string) => LABEL[name] ?? name

/** A unit worth printing after a value; ratios and indexes read bare. */
export const unitText = (unit: string) => (unit && !/^(ratio|index|qualitative|genotype)$/.test(unit) ? unit : "")

const decimalsOf = (...values: (number | string | undefined)[]) =>
  Math.min(2, Math.max(0, ...values.map((v) => (v === undefined ? 0 : (String(v).split(".")[1] ?? "").length))))

/** The range a value is judged against: the HOL target, else the lab's. */
function bounds(b: Biomarker) {
  const hasTarget = b.targetLow != null || b.targetHigh != null
  return hasTarget ? { low: b.targetLow, high: b.targetHigh } : { low: b.labLow, high: b.labHigh }
}

function outside(low: number | undefined, high: number | undefined, v: number) {
  if (low != null && v < low) return low - v
  if (high != null && v > high) return v - high
  return 0
}

/** From the plan-start reading to the latest, judged by which way is
    better. A one-sided Maintain or Range target reads like Higher or
    Lower; a two-sided one by distance outside the range. */
function directionOf(b: Biomarker, from: number, to: number): Direction {
  if (Math.abs(to - from) <= Math.abs(from) * 0.01) return "stable"
  const { low, high } = bounds(b)
  let better = b.betterDirection
  if (better === "Maintain" || better === "Range") {
    if (low != null && high == null) better = "Higher"
    else if (high != null && low == null) better = "Lower"
  }
  if (better === "Lower") return to < from ? "improving" : "worsening"
  if (better === "Higher") return to > from ? "improving" : "worsening"
  const d0 = outside(low, high, from)
  const d1 = outside(low, high, to)
  if (d0 === d1) return "stable"
  return d1 < d0 ? "improving" : "worsening"
}

function statusOfMarker(b: Biomarker): StatusKey {
  if (b.status === "High" || b.status === "Low") return "out"
  if (b.status === "Watch") return "watch"
  if (b.status === "Not Yet Tested") return "untested"
  return "optimal"
}

type BuildInput = {
  opt: OptimizationModel
  marker?: Biomarker
  row?: SnapshotMarker
  status: StatusKey
}

function buildMetric({ opt, marker: b, row, status }: BuildInput): HealthMetric {
  const name = b?.name ?? row!.name
  const category = b?.category ?? "Tests to order"
  const history: Point[] = b ? numericHistory(b).map((p) => ({ date: p.date, value: p.n, source: p.source })) : []
  const last = history[history.length - 1]
  /* Plan start: the tracker's baseline when it has one, else the first reading. */
  const base = b?.baseline && Number.isFinite(Number(b.baseline.value))
    ? (history.find((p) => p.date === b.baseline!.date) ?? { date: b.baseline.date, value: Number(b.baseline.value), source: "" })
    : history[0]
  const previous = base && last && base.date !== last.date ? base : undefined
  const change = previous && last ? last.value - previous.value : undefined
  const decimals = decimalsOf(previous?.value, last?.value)
  const value = row?.latest || (b?.latest?.value ?? (last ? fmt(last.value) : undefined))
  const snapshotN = row?.latest ? Number(row.latest) : undefined
  /* The reading the snapshot printed, and any newer one after it. */
  const snapPoint = snapshotN !== undefined ? [...history].reverse().find((p) => p.value === snapshotN) : undefined
  const repeat = snapPoint && last && last.date > snapPoint.date ? last : undefined
  const ctx = contextOf(name, category)
  const lower = name.toLowerCase()
  const tests = opt.data.tests.find((t) => t.test.toLowerCase() === lower)
  const valuePoint = repeat ? snapPoint : last
  const prior = history[history.length - 2]

  return {
    id: name,
    name,
    label: labelOf(name),
    category,
    unit: b?.unit ?? row?.unit ?? "",
    value: value ?? undefined,
    valueDate: valuePoint?.date ?? b?.latest?.date,
    source: valuePoint?.source || undefined,
    target: row?.target ?? (b ? targetText(b) : ""),
    targetLow: b?.targetLow,
    targetHigh: b?.targetHigh,
    status,
    flag: row ? (row.status === "High" || row.status === "Low" || row.status === "Watch" ? row.status : undefined) : b?.status === "High" || b?.status === "Low" ? b.status : undefined,
    tier: row?.tier ?? b?.tier,
    previous,
    latest: last,
    change,
    percentageChange: change !== undefined && previous && previous.value !== 0 ? (change / previous.value) * 100 : undefined,
    decimals,
    trend: b && previous && last ? directionOf(b, previous.value, last.value) : "new",
    rising: prior && last ? last.value > prior.value : undefined,
    history,
    repeat,
    action: row?.whatToDo ?? b?.nextStep,
    nextStep: b?.nextStep,
    nextTest: b?.nextTest,
    frequency: b?.frequency,
    explanation: ctx.means,
    why: ctx.why,
    relatedMarkers: relatedOf(name).filter((n) => markerByName(opt.data.biomarkers, n)),
    plan: planFor(name)
      .map((n) => opt.data.interventions.find((i) => i.name === n))
      .filter((i): i is Intervention => Boolean(i)),
    priorities: opt.priorities.filter((p) => p.basedOn.some((n) => n.toLowerCase() === lower)),
    test:
      status === "untested"
        ? {
            name: tests?.test ?? b?.nextTest ?? name,
            ordered: tests?.status === "Ordered",
            orderable: Boolean(tests && opt.toOrder.some((t) => t.test === tests.test)),
          }
        : undefined,
  }
}

/* The cards' marker lists. */
const SIGNALS = ["Weight", "Body Fat Total", "VAT Area", "Resting Metabolic Rate", "Fat Mass", "Lean Mass"]

const SNAPSHOT_BAND = {
  out: "Out of target",
  watch: "On watch",
  untested: "Not yet tested",
} as const

export function buildAnalytics(opt: OptimizationModel) {
  const s = opt.data.snapshot
  const list = opt.data.biomarkers
  const banded = new Map<string, StatusKey>()
  const byBand = {} as Record<StatusKey, HealthMetric[]>

  for (const key of ["out", "watch", "untested"] as const) {
    byBand[key] = s.bands[SNAPSHOT_BAND[key]].map((row) => {
      const marker = markerByName(list, row.name)
      banded.set(row.name.toLowerCase(), key)
      return buildMetric({ opt, marker, row, status: key })
    })
  }
  /* Optimal or in range: the tracker's rows the snapshot does not band. */
  byBand.optimal = list
    .filter((b) => !banded.has(b.name.toLowerCase()) && statusOfMarker(b) === "optimal" && b.status !== "Informational")
    .map((marker) => buildMetric({ opt, marker, status: "optimal" }))
    .sort((a, b) => tierRank(a.tier) - tierRank(b.tier))

  const all = new Map<string, HealthMetric>()
  for (const key of STATUS_ORDER) for (const m of byBand[key]) all.set(m.name.toLowerCase(), m)

  /** Any tracker marker, banded or not, for the drawer's related list. */
  function metric(name: string) {
    const hit = all.get(name.toLowerCase())
    if (hit) return hit
    const marker = markerByName(list, name)
    if (!marker) return undefined
    const m = buildMetric({ opt, marker, status: statusOfMarker(marker) })
    all.set(name.toLowerCase(), m)
    return m
  }

  return {
    updatedAt: s.updatedAt,
    total: s.markersTracked,
    counts: {
      out: s.counts["Out of target"],
      watch: s.counts["On watch"],
      untested: s.counts["Not yet tested"],
      optimal: s.counts["In range"] + s.counts.Optimal,
    } satisfies Record<StatusKey, number>,
    byBand,
    signals: SIGNALS.map(metric).filter((m): m is HealthMetric => Boolean(m)),
    scanDate: s.scanDates.first,
    metric,
  }
}

export type Analytics = ReturnType<typeof buildAnalytics>

function tierRank(tier?: string) {
  return tier === "Tier 1" ? 0 : tier === "Tier 2" ? 1 : 2
}

/** Tier 1 first, then the snapshot's own order. */
export function byPriority(list: HealthMetric[]) {
  return list
    .map((m, i) => ({ m, i }))
    .sort((a, b) => tierRank(a.m.tier) - tierRank(b.m.tier) || a.i - b.i)
    .map((x) => x.m)
}
