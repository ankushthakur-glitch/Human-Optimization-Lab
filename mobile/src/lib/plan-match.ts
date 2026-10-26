import type { Hue } from "@/components/record-kit"
import type { Trend } from "@/lib/trends"

/* The upgrade page's plan match: the optimization plans the physicians
   wrote in advance, and which of them her record points to. The AI only
   selects; it never writes one. Each watched marker points to one plan,
   and two markers that point to the same plan count once. */

/** The areas the plans are grouped by when she opens the full list. */
export const PLAN_AREAS = ["Metabolic & weight", "Lipid & cardiovascular", "Triglyceride & insulin", "Blood pressure", "Bone strength", "Muscle & strength", "Sleep", "Kidney", "Liver"] as const

export type PlanArea = (typeof PLAN_AREAS)[number]

/** Every optimization plan on file, by area, nine to an area. The first
    names are the ones the record and the goals pick (/goal-plans). */
export const PLANS: Record<PlanArea, string[]> = {
  "Metabolic & weight": ["Metabolic health", "Weight loss foundations", "Body fat reduction", "GLP-1 support", "Waist circumference reset", "Metabolism after menopause", "Mediterranean eating", "Weight maintenance", "Appetite and cravings"],
  "Lipid & cardiovascular": ["Lipid control", "LDL lowering", "HDL support", "Lipoprotein(a) watch", "Heart-healthy eating", "Cardio fitness for heart health", "Statin support", "Family history heart care", "ApoB reduction"],
  "Triglyceride & insulin": ["Insulin sensitivity", "Prediabetes reversal", "A1C lowering", "Triglyceride lowering", "Steady blood sugar", "Lower carb eating", "Time-restricted eating", "After-meal glucose", "Fasting glucose reset"],
  "Blood pressure": ["Blood pressure lowering", "Salt reduction", "DASH eating", "Home blood pressure checks", "Stress and blood pressure", "Morning blood pressure", "Weight and blood pressure", "Alcohol and blood pressure", "Activity for blood pressure"],
  "Bone strength": ["Bone strength", "Osteopenia support", "Calcium and vitamin D", "Strength training for bone", "Fall prevention", "Balance training", "Posture and spine", "Bone health after menopause", "Joint mobility"],
  "Muscle & strength": ["Muscle strength", "Fitness and VO₂ max", "Protein for muscle", "Muscle loss prevention", "Resistance training basics", "Grip strength", "Endurance building", "Recovery and mobility", "Active aging"],
  Sleep: ["Better sleep", "More energy", "Insomnia support", "Sleep schedule reset", "Snoring and sleep apnea check", "Wind-down routine", "Shift work sleep", "Caffeine and sleep", "Deep sleep support"],
  Kidney: ["Kidney health", "eGFR protection", "Hydration", "Kidney-friendly eating", "Protein balance for kidneys", "Blood pressure for kidneys", "Blood sugar for kidneys", "Medicine review for kidneys", "Uric acid lowering"],
  Liver: ["Liver health", "Fatty liver reversal", "Liver enzymes", "Alcohol reduction", "Liver-friendly eating", "Weight loss for liver", "Inflammation reduction", "Gut health", "Liver and energy"],
}

/** Each area's colour, so a plan wears the same hue wherever it shows:
    the upgrade page, the set-up's plans and the list of all 81. */
export const AREA_HUE: Record<PlanArea, Hue> = {
  "Metabolic & weight": "teal",
  "Lipid & cardiovascular": "red",
  "Triglyceride & insulin": "amber",
  "Blood pressure": "red",
  "Bone strength": "violet",
  "Muscle & strength": "green",
  Sleep: "blue",
  Kidney: "blue",
  Liver: "amber",
}

/** A plan's area, by its name. */
export const areaOfPlan = (name: string) => PLAN_AREAS.find((a) => PLANS[a].includes(name))

/** A plan's colour, by its name; violet for one of her own. */
export const planHue = (name: string): Hue => {
  const area = areaOfPlan(name)
  return area ? AREA_HUE[area] : "violet"
}

/** Every optimization plan on file. */
export const PLAN_COUNT = Object.values(PLANS).reduce((n, p) => n + p.length, 0)

/** The short name each record plan goes by in the list of all plans. */
export const SHORT_NAME: Record<PlanKind, string> = {
  metabolic: "Metabolic health",
  insulin: "Insulin sensitivity",
  lipid: "Lipid control",
  bone: "Bone strength",
  other: "Personalized plan",
}

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

/** The count word in "The three your numbers add". */
export const COUNT_WORD = ["no", "one", "two", "three"] as const

/* Since 26 Oct 2026 there is no plan to pick: every optimization plan has
   the same six steps, and AI adds to them from her out of range markers.
   A record match no longer names a plan of its own; it says what it adds
   and to which step. */

export type SixStep = "Exercise" | "Eat" | "Sleep" | "Mind" | "Medication" | "Measure"

/** The six steps every plan has, in their order. */
export const SIX_STEPS: SixStep[] = ["Exercise", "Eat", "Sleep", "Mind", "Medication", "Measure"]

/** What a record match adds to her plan: the focus, the step it sits in,
    and the target it starts with. */
export const ADDS: Record<PlanKind, { focus: string; step: SixStep; target: string }> = {
  lipid: { focus: "Lipid focus", step: "Eat", target: "Saturated fat under 13 g a day" },
  insulin: { focus: "Sugar and alcohol", step: "Eat", target: "7 drinks a week at most" },
  metabolic: { focus: "Weight and waist", step: "Measure", target: "Waist every 2 weeks" },
  bone: { focus: "Bone strength", step: "Exercise", target: "Impact and balance work" },
  other: { focus: "A focus of its own", step: "Measure", target: "Tracked with your physician" },
}
