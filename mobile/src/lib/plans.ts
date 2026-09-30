import { CONDITIONS, FINDINGS } from "@/lib/record"

/* The membership catalogue, from the client's "Features for the patient"
   table: a free record for everyone, one paid Optimization membership, and
   add-ons bought separately. Every practice gets every program. */

export type ProgramId =
  | "weight"
  | "bone"
  | "heart"
  | "metabolic"
  | "pressure"
  | "kidney"
  | "strength"
  | "sleep"
  | "male-hormone"
  | "menopause"
  | "liver"

export type Sex = "female" | "male"

export const PROGRAMS: { id: ProgramId; name: string; only?: Sex }[] = [
  { id: "weight", name: "Weight management" },
  { id: "heart", name: "Heart and lipids" },
  { id: "metabolic", name: "Blood sugar and metabolic" },
  { id: "pressure", name: "Blood pressure" },
  { id: "bone", name: "Bone density" },
  { id: "strength", name: "Muscle and strength" },
  { id: "sleep", name: "Sleep" },
  { id: "kidney", name: "Kidney" },
  { id: "liver", name: "Liver" },
  { id: "menopause", name: "Menopause", only: "female" },
  { id: "male-hormone", name: "Male hormone", only: "male" },
]

export const programName = (id: ProgramId) => PROGRAMS.find((p) => p.id === id)?.name ?? id

/** Which results and problem list entries point at which program. A stand in
    for the program engine; the real rules come from HOL's clinical team. */
const RULES: { program: ProgramId; findings: string[]; conditions: string[] }[] = [
  { program: "weight", findings: ["bmi"], conditions: ["E66.811"] },
  { program: "heart", findings: ["ldl", "tg"], conditions: ["E78.5"] },
  { program: "metabolic", findings: ["a1c"], conditions: ["R73.03"] },
  { program: "pressure", findings: ["bp"], conditions: ["R03.0"] },
]

export type Recommendation = { program: ProgramId; reasons: string[] }

/** Programs the record points to, in the rules' clinical priority order. */
export function recommend(): Recommendation[] {
  return RULES.map(({ program, findings, conditions }) => ({
    program,
    reasons: [
      ...FINDINGS.filter((f) => findings.includes(f.id)).map((f) => `${f.name} ${f.value}`),
      ...CONDITIONS.filter((c) => conditions.includes(c.code)).map((c) => c.name),
    ],
  }))
    .filter((r) => r.reasons.length > 0)
}

export type Tier = "free" | "optimization"

export const TIERS: Record<Tier, { name: string; price: string; per?: string; features: string[] }> = {
  free: {
    name: "Free record",
    price: "$0",
    features: [
      "Your record from every provider: conditions, medications, labs",
      "Biomarker detail and trends",
      "Current snapshot and flagged results",
      "Documents",
      "Care task reminders and missed order alerts",
      "A few AI questions a month",
    ],
  },
  optimization: {
    name: "Optimization",
    // HOL has not set the price; the client docs put it at $100 or more.
    price: "$100",
    per: "/ month",
    features: [
      "Everything in the free record",
      "One tailored program from a detailed questionnaire",
      "Wearables through Terra",
      "Nutrition and exercise plan, with an exercise library",
      "Daily dashboard, Inlay score, check ins and logging",
      "Full AI optimization copilot",
      "Goals, progress and a 90 day forecast",
      "Medication and supplement reconciliation",
      "Baseline and repeat testing",
      "Quarterly report reviewed by your physician",
      "Mindfulness content",
    ],
  },
}

/** Bought separately, on either tier. Prices are the client's market
    benchmarks, not HOL's, so the app shows none yet. */
export const ADD_ONS = [
  { name: "Comprehensive blood panel", detail: "100+ markers, drawn at your physician's office" },
  { name: "Advanced panels", detail: "Heart, hormone, thyroid, autoimmune, allergy, brain" },
  { name: "Imaging", detail: "Whole body MRI, CAC CT, lung CT" },
  { name: "Body composition and fitness", detail: "DEXA, RMR, VO2 max" },
  { name: "AI+", detail: "More AI questions each month" },
  { name: "Human coaching", detail: "A coach alongside your plan" },
] as const
