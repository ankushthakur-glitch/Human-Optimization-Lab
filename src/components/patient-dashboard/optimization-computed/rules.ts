import type { SparkTone, Trend } from "@/components/dashboard-kit"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import {
  goalCards,
  goalProgress,
  isInside,
  latestPoint,
  markerByName,
  numericHistory,
  planLanes,
  stillUntested,
  trendOf,
} from "@/components/patient-dashboard/optimization/rules"
import type { Biomarker, Goal, Intervention, MarkerStatus } from "@/components/patient-dashboard/optimization/types"

/* Version 2 of the optimization view computes everything from the
   biomarker rows by the brief's rules, where version 1 renders the HOLv.9
   Dashboard sheet's snapshot as the client's sheet shows it. The status
   groups, the panel score, each category's score and the headline cards
   are all pure functions over the same data, so the two versions can be
   read side by side. */

/* ------------------------------------------------------------ groups -- */

export type Group = "Out of target" | "On watch" | "Not yet tested" | "In range" | "Optimal"

export const GROUPS: Group[] = ["Out of target", "On watch", "Not yet tested", "In range", "Optimal"]

/** The status group a recorded status falls in; none for Informational. */
export function groupOf(status: MarkerStatus): Group | undefined {
  if (status === "High" || status === "Low") return "Out of target"
  if (status === "Watch") return "On watch"
  if (status === "Not Yet Tested") return "Not yet tested"
  if (status === "In Range") return "In range"
  if (status === "Optimal") return "Optimal"
  return undefined
}

/** The rows that count: every marker in a group, with not-yet-tested items
    dropped once a later result exists for the same name. */
export function counted(list: Biomarker[]) {
  const tested = new Set(stillUntested(list.filter((b) => b.status === "Not Yet Tested"), list).map((b) => b.name))
  return list.filter((b) => {
    const g = groupOf(b.status)
    if (!g) return false
    return g !== "Not yet tested" || tested.has(b.name)
  })
}

export type Counts = Record<Group, number>

export function countGroups(list: Biomarker[]): Counts {
  const counts: Counts = { "Out of target": 0, "On watch": 0, "Not yet tested": 0, "In range": 0, Optimal: 0 }
  for (const b of counted(list)) counts[groupOf(b.status)!] += 1
  return counts
}

export const tracked = (c: Counts) => GROUPS.reduce((n, g) => n + c[g], 0)

/** (optimal + inRange + 0.5 × (watch + notYetTested)) / all, as a whole percent. */
export function scoreOf(c: Counts) {
  const all = tracked(c)
  if (all === 0) return 0
  return Math.round(((c.Optimal + c["In range"] + 0.5 * (c["On watch"] + c["Not yet tested"])) / all) * 100)
}

/* --------------------------------------------------------- categories -- */

export type CategoryBand = "Priority area" | "Mixed" | "Strong"

export function bandOf(score: number): CategoryBand {
  if (score < 60) return "Priority area"
  if (score < 85) return "Mixed"
  return "Strong"
}

export type CategoryRow = { category: string; label: string; counts: Counts; score: number; band: CategoryBand }

/** "Body Composition" as the tracker names it, "Body composition" on screen. */
export const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

/** One row per category with counted markers, lowest score first. */
export function categoryRows(list: Biomarker[]): CategoryRow[] {
  const rows = new Map<string, Biomarker[]>()
  for (const b of counted(list)) rows.set(b.category, [...(rows.get(b.category) ?? []), b])
  return [...rows.entries()]
    .map(([category, markers]) => {
      const counts = countGroups(markers)
      const score = scoreOf(counts)
      return { category, label: sentence(category), counts, score, band: bandOf(score) }
    })
    .sort((a, b) => a.score - b.score || a.label.localeCompare(b.label))
}

/** Categories at 100% are counted, not listed. */
export function onTarget(rows: CategoryRow[]) {
  return rows.filter((r) => r.score === 100).length
}

/* ------------------------------------------------------------ markers -- */

const TIER_RANK: Record<string, number> = { "Tier 1": 0, "Tier 2": 1, Monitor: 2, Maintain: 3 }

export type MarkerGroup = { category: CategoryRow; markers: Biomarker[] }

/** The markers of one group, by category (worst first), then tier and name. */
export function markersInGroup(list: Biomarker[], group: Group, categories: CategoryRow[]): MarkerGroup[] {
  const rank = new Map(categories.map((c, i) => [c.category, i]))
  const rows = counted(list).filter((b) => groupOf(b.status) === group)
  const byCategory = new Map<string, Biomarker[]>()
  for (const b of rows) byCategory.set(b.category, [...(byCategory.get(b.category) ?? []), b])
  return [...byCategory.entries()]
    .sort((a, b) => (rank.get(a[0]) ?? 99) - (rank.get(b[0]) ?? 99))
    .map(([category, markers]) => ({
      category: categories.find((c) => c.category === category)!,
      markers: markers.sort(
        (a, b) => (TIER_RANK[a.tier ?? ""] ?? 9) - (TIER_RANK[b.tier ?? ""] ?? 9) || a.name.localeCompare(b.name)
      ),
    }))
}

/** The range a sparkline bands: the HOL target, else the lab's. */
export function rangeOf(b: Biomarker) {
  const hasTarget = b.targetLow != null || b.targetHigh != null
  return hasTarget ? { low: b.targetLow, high: b.targetHigh } : { low: b.labLow, high: b.labHigh }
}

export function sparkTone(b: Biomarker, trend: Trend): SparkTone {
  if (b.status === "High" || b.status === "Low") return "out"
  if (trend === "improving") return "improving"
  return "neutral"
}

/** The date of the newest result across the panel. */
export function latestResultDate(list: Biomarker[]) {
  return list.reduce((d, b) => {
    const p = latestPoint(b)
    return p && p.date > d ? p.date : d
  }, "")
}

/* ----------------------------------------------------------- outcomes -- */

export type Outcome = {
  marker: Biomarker
  intervention: Intervention
  trend: Trend
  baseline?: number
  latest?: number
  /** Inside its target or lab range now. */
  inside?: boolean
}

/** One card per intervention outcome metric that is a tracked marker, in
    the plan's order; a marker shared by two interventions shows once. */
export function outcomes(interventions: Intervention[], list: Biomarker[]): Outcome[] {
  const seen = new Set<string>()
  const out: Outcome[] = []
  for (const i of planLanes(interventions)) {
    const marker = markerByName(list, i.outcomeMetric)
    if (!marker || seen.has(marker.name)) continue
    seen.add(marker.name)
    const h = numericHistory(marker)
    const latest = h[h.length - 1]?.n
    out.push({
      marker,
      intervention: i,
      trend: trendOf(marker),
      baseline: h.length > 1 ? h[0].n : undefined,
      latest,
      inside: latest === undefined ? undefined : isInside(marker, latest),
    })
  }
  return out
}

/* -------------------------------------------------------------- goals -- */

export type GoalCard = Goal & { progress: number; met: boolean; line: string }

export function goalRows(goals: Goal[], list: Biomarker[]): GoalCard[] {
  return goalCards(goals, list).map((g) => {
    const progress = goalProgress(g)
    const met = progress >= 1
    return { ...g, progress, met, line: met ? "Goal met" : `${Math.round(progress * 100)}% of the way` }
  })
}

/* -------------------------------------------------------------- model -- */

/** Everything version 2 adds over the shared model, in one pass. */
export function buildV2(model: OptimizationModel) {
  const list = model.data.biomarkers
  const counts = countGroups(list)
  const categories = categoryRows(list)
  return {
    counts,
    score: scoreOf(counts),
    tracked: tracked(counts),
    latestResult: latestResultDate(list),
    categories,
    onTarget: onTarget(categories),
    groups: Object.fromEntries(GROUPS.map((g) => [g, markersInGroup(list, g, categories)])) as Record<Group, MarkerGroup[]>,
    outcomes: outcomes(model.data.interventions, list),
    goals: goalRows(model.data.goals, list),
  }
}

export type V2Model = ReturnType<typeof buildV2>
