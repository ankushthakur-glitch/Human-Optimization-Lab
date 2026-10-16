import type { Trend } from "@/lib/trends"

/* The upgrade page's plan match: the optimization plans the physicians
   wrote in advance, and which of them her record points to. The AI only
   selects; it never writes one. Each watched marker points to one plan,
   and two markers that point to the same plan count once. */

/** Every optimization plan on file. */
export const PLAN_COUNT = 81

/** The areas the plans are grouped by when she opens the full list. */
export const PLAN_AREAS = ["Metabolic & weight", "Lipid & cardiovascular", "Triglyceride & insulin", "Blood pressure", "Bone strength", "Muscle & strength", "Sleep", "Kidney", "Liver"] as const

export type PlanKind = "metabolic" | "lipid" | "insulin" | "bone" | "other"

export type PlanMatch = {
  kind: PlanKind
  /** "Metabolic & weight optimization". */
  name: string
  /** "Matched on BMI 32.4 · up 2.2 since Mar 2023". */
  matchedOn: string
  /** The marker's page, which the row opens. */
  markerId: string
}

const NAME: Record<PlanKind, string> = {
  metabolic: "Metabolic & weight optimization",
  lipid: "Lipid & cardiovascular optimization",
  insulin: "Triglyceride & insulin response",
  bone: "Bone strength optimization",
  other: "Personalized optimization",
}

/** The plan a marker points to: by what it measures, else by its focus area. */
function kindOf(t: Trend): PlanKind {
  const said = `${t.marker.short ?? ""} ${t.marker.name}`.toLowerCase()
  if (/triglycer|a1c|glucose|insulin/.test(said)) return "insulin"
  if (/ldl|hdl|cholesterol|apo|pressure|\bbp\b/.test(said)) return "lipid"
  if (/bmi|weight|waist|body fat/.test(said)) return "metabolic"
  if (t.marker.focus === "weight") return "metabolic"
  if (t.marker.focus === "heart") return "lipid"
  if (t.marker.focus === "blood sugar") return "insulin"
  if (t.marker.focus === "bone") return "bone"
  return "other"
}

/** "BMI 32.4 · up 2.2 since Mar 2023": the value, then how it has moved. */
function matchedOn(t: Trend) {
  const value = t.valueWithUnit.replace(/\s*(kg\/m²|mg\/dL|%)$/, "")
  const moved = t.change?.words
  const marker = t.marker.short ?? t.marker.name
  return `Matched on ${marker.charAt(0).toUpperCase()}${marker.slice(1)} ${value}${moved ? ` · ${moved.charAt(0).toLowerCase()}${moved.slice(1)}` : ""}`
}

/** Up to three plans her watched markers point to, most pressing first. */
export function matchPlans(watched: Trend[]): PlanMatch[] {
  const seen = new Set<PlanKind>()
  const out: PlanMatch[] = []
  for (const t of watched) {
    const kind = kindOf(t)
    if (kind !== "other" && seen.has(kind)) continue
    seen.add(kind)
    out.push({ kind, name: NAME[kind], matchedOn: matchedOn(t), markerId: t.id })
    if (out.length === 3) break
  }
  return out
}

/** The count word in "The three your numbers point to". */
export const COUNT_WORD = ["no", "one", "two", "three"] as const
