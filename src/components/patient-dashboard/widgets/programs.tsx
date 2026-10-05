"use client"

import { cn } from "@/lib/utils"
import { FlagText } from "@/components/dashboard-kit-v2"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import { markerByName, numericHistory } from "@/components/patient-dashboard/optimization/rules"
import type { Biomarker, Goal, MarkerPoint } from "@/components/patient-dashboard/optimization/types"

/* The plans an optimization member is enrolled in (weight loss, diabetes
   control). Each reads the same HOLv.9 tracker but follows only its own
   markers: its headline metrics, the readings that came in and from
   where, its goals, priorities and the interventions in force. Add a plan
   by adding an entry to PROGRAMS. */

type ProgramId = "weight" | "diabetes"

export type Program = {
  id: ProgramId
  name: string
  since: string
  /** The four headline markers, first one drawn in the trend chart. */
  kpis: string[]
  /** Every marker the program follows. */
  markers: string[]
  /** Markers shown in the change since enrollment panel. */
  changes: string[]
  /** Plan categories that belong to the program. */
  plan: string[]
  /** Uploaded reports that belong to the program. */
  reports: string[]
}

export const PROGRAMS: Program[] = [
  {
    id: "weight",
    name: "Weight loss",
    since: "2026-03-01",
    kpis: ["Weight", "Waist", "Body Fat Total", "VAT Area"],
    markers: [
      "Weight",
      "Waist",
      "Body Fat Total",
      "Fat Mass",
      "Lean Mass",
      "VAT Area",
      "VAT Volume",
      "Total BMD",
      "Resting Metabolic Rate",
      "Hemoglobin A1c",
      "Fasting Glucose",
      "Triglycerides",
    ],
    changes: [
      "Body Fat Total",
      "Fat Mass",
      "Lean Mass",
      "VAT Area",
      "VAT Volume",
      "Resting Metabolic Rate",
    ],
    plan: ["Nutrition", "Exercise", "Activity", "Body recomposition", "Sleep"],
    reports: ["Home sleep apnea test"],
  },
  {
    id: "diabetes",
    name: "Diabetes control",
    since: "2026-03-01",
    kpis: [
      "Hemoglobin A1c",
      "Fasting Glucose",
      "Fasting Insulin",
      "HOMA-IR (calculated)",
    ],
    markers: [
      "Hemoglobin A1c",
      "Fasting Glucose",
      "Fasting Insulin",
      "HOMA-IR (calculated)",
      "Triglyceride:HDL Ratio (calculated)",
      "Triglycerides",
      "LDL Small",
      "Weight",
      "Waist",
      "VAT Area",
      "eGFR",
      "Urine Albumin/Creatinine Ratio",
    ],
    changes: [
      "Hemoglobin A1c",
      "Fasting Glucose",
      "Weight",
      "Waist",
      "VAT Area",
    ],
    plan: ["Nutrition", "Activity", "Supplement"],
    reports: [],
  },
]

/* --------------------------------------------------------------- model -- */

type Band = "out" | "watch" | "order" | "range"

const BAND: Record<Band, { label: string; dot: string }> = {
  out: { label: "Out of target", dot: "bg-destructive" },
  watch: { label: "On watch", dot: "bg-warning" },
  order: { label: "To order", dot: "bg-info" },
  range: { label: "In range", dot: "bg-success" },
}

function bandOf(b: Biomarker): Band {
  if (b.status === "High" || b.status === "Low") return "out"
  if (b.status === "Watch") return "watch"
  if (b.status === "Not Yet Tested") return "order"
  return "range"
}

type SourceKind = "EHR" | "Lab" | "Scan" | "Device" | "Upload"

/* The tracker leaves scale and tape readings without a source; the sheet
   names them as the patient's current scale weight and waist log. */
function sourceOf(marker: string, p: MarkerPoint) {
  if (p.source === "Uploaded report") {
    if (marker === "Weight") return "Smart scale"
    if (marker === "Waist") return "Patient log"
    return "Uploaded lab report"
  }
  return p.source
}

function kindOf(source: string): SourceKind {
  if (/epic|practice ehr/i.test(source)) return "EHR"
  if (/quest|labcorp/i.test(source)) return "Lab"
  if (/dexa/i.test(source)) return "Scan"
  if (/scale|log|home|device|wearable/i.test(source)) return "Device"
  return "Upload"
}

/** "Body Fat Total" reads "Body fat" in the program's own words. */
const LABEL: Record<string, string> = {
  "Body Fat Total": "Body fat",
  "VAT Area": "VAT area",
  "VAT Volume": "VAT volume",
  "Fat Mass": "Fat mass",
  "Lean Mass": "Lean mass",
  "Total BMD": "Total BMD",
  "Resting Metabolic Rate": "RMR",
  "Hemoglobin A1c": "HbA1c",
  "Fasting Glucose": "Fasting glucose",
  "Fasting Insulin": "Fasting insulin",
  "HOMA-IR (calculated)": "HOMA-IR",
  "Triglyceride:HDL Ratio (calculated)": "TG:HDL ratio",
  "Urine Albumin/Creatinine Ratio": "Urine ACR",
}
export const label = (name: string) => LABEL[name] ?? name

type Reading = {
  key: string
  marker: Biomarker
  date: string
  value: number | string
  previous?: number
  source: string
  kind: SourceKind
}

export function buildProgram(p: Program, opt: OptimizationModel) {
  const list = opt.data.biomarkers
  const markers = p.markers
    .map((n) => markerByName(list, n))
    .filter((b): b is Biomarker => Boolean(b))
  const kpis = p.kpis
    .map((n) => markerByName(list, n))
    .filter((b): b is Biomarker => Boolean(b))

  /* Every reading the program has received, newest first. */
  const readings: Reading[] = markers
    .flatMap((b) =>
      b.history.map((pt, i) => {
        const prev = b.history[i - 1]?.value
        const source = sourceOf(b.name, pt)
        return {
          key: `${b.name}-${pt.date}`,
          marker: b,
          date: pt.date,
          value: pt.value,
          previous: typeof prev === "number" ? prev : undefined,
          source,
          kind: kindOf(source),
        }
      })
    )
    .sort((a, b) => b.date.localeCompare(a.date))

  const sources = new Map<
    string,
    { source: string; kind: SourceKind; count: number; last: string }
  >()
  for (const r of readings) {
    const s = sources.get(r.source)
    if (s) s.count += 1
    else
      sources.set(r.source, {
        source: r.source,
        kind: r.kind,
        count: 1,
        last: r.date,
      })
  }
  const goals = new Map<string, Goal>(
    opt.data.goals.map((g) => [g.seriesMarkerName.toLowerCase(), g])
  )
  const names = new Set(p.markers.map((n) => n.toLowerCase()))
  const priorities = opt.priorities.filter(
    (x) =>
      x.basedOn.some((n) => names.has(n.toLowerCase())) ||
      (x.basedOnReport && p.reports.includes(x.basedOnReport))
  )
  const plan = opt.data.interventions.filter((i) => p.plan.includes(i.category))
  const counts: Record<Band, number> = { out: 0, watch: 0, order: 0, range: 0 }
  for (const b of markers) counts[bandOf(b)] += 1

  return {
    markers,
    kpis,
    readings,
    sources: [...sources.values()].sort((a, b) => b.last.localeCompare(a.last)),
    goal: (b: Biomarker) => goals.get(b.name.toLowerCase()),
    priorities,
    plan,
    counts,
    changes: p.changes
      .map((n) => markerByName(list, n))
      .filter((b): b is Biomarker =>
        Boolean(b && numericHistory(b).length > 1)
      ),
  }
}

export type ProgramView = ReturnType<typeof buildProgram>

/* ------------------------------------------------------------- helpers -- */

export function goalProgress(g: Goal) {
  const span = g.goal - g.baseline
  if (span === 0) return 100
  return Math.max(0, Math.min(100, ((g.current - g.baseline) / span) * 100))
}

export function StatusText({ b }: { b: Biomarker }) {
  const band = bandOf(b)
  if (b.status === "High" || b.status === "Low")
    return <FlagText flag={b.status} urgent />
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", BAND[band].dot)}
      />
      {band === "range"
        ? b.status === "Optimal"
          ? "Optimal"
          : "In range"
        : BAND[band].label}
    </span>
  )
}

export function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
    </div>
  )
}
