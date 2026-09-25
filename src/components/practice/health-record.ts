"use client"

import {
  createCollection,
  nextId,
  today,
} from "@/components/practice/collection-store"
import {
  OLIVIA_ID,
  type Patient,
  providers,
} from "@/components/practice/practice-data"

/* The longitudinal record the 24 Sep call walked through (DV's "Longitudinal
   record (free phase)" workflow). After the patient consents, records are
   pulled from the approved clinical sources through the interoperability
   vendor; every value keeps its provenance and history is never overwritten.
   Sample data only, never a real patient. */

/* -------------------------------------------------------------------------- */
/*  Dates                                                                      */
/* -------------------------------------------------------------------------- */

/* Relative to the viewer's today, so a task's due state reads the same on
   whatever day the prototype is shown. */
function isoFromToday(days: number) {
  const [y, m, d] = today().split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d) + days * 86_400_000)
  return date.toISOString().slice(0, 10)
}

/* -------------------------------------------------------------------------- */
/*  Sources                                                                    */
/* -------------------------------------------------------------------------- */

export type Source = {
  id: string
  name: string
  kind: "EHR" | "Lab" | "Imaging"
  /** How it reaches HOL. The vendor is still open (Health Gorilla first). */
  via: string
}

export const SOURCES: Source[] = [
  {
    id: "SRC-EPIC",
    name: "Scripps Health (Epic)",
    kind: "EHR",
    via: "Health Gorilla",
  },
  {
    id: "SRC-QUEST",
    name: "Quest Diagnostics",
    kind: "Lab",
    via: "Health Gorilla",
  },
  { id: "SRC-LABCORP", name: "Labcorp", kind: "Lab", via: "Health Gorilla" },
  {
    id: "SRC-IMG",
    name: "Coastal Imaging Center",
    kind: "Imaging",
    via: "Health Gorilla",
  },
]

export const sourceName = (id: string) =>
  SOURCES.find((s) => s.id === id)?.name ?? id

/* -------------------------------------------------------------------------- */
/*  Record state                                                               */
/* -------------------------------------------------------------------------- */

/* The workflow's states: ACCEPTED, RECORD_BUILDING, FREE_ACTIVE and
   DATA_EXCEPTION, plus the time before consent, when nothing is pulled. */
export type RecordState =
  "Awaiting consent" | "Building" | "Active" | "Source exception"

/* -------------------------------------------------------------------------- */
/*  Biomarkers                                                                 */
/* -------------------------------------------------------------------------- */

export type Reading = {
  date: string
  value: number
  sourceId: string
  /** The id the source gave the result. */
  sourceRef: string
  importedAt: string
  /** The value as the source sent it, before units and names were normalized. */
  original: string
}

export type Biomarker = {
  id: string
  name: string
  unit: string
  panel:
    "Metabolic" | "Lipids" | "Inflammation" | "Hormones" | "Vitamins" | "Vitals"
  low?: number
  high?: number
  /** Which way is better, to read a change as improving or declining. */
  better: "lower" | "higher" | "range"
  readings: Reading[]
}

export type Trend = "Improving" | "Stable" | "Declining"

export function latest(b: Biomarker) {
  return b.readings[b.readings.length - 1]
}

export function rangeLabel(b: Biomarker) {
  if (b.low != null && b.high != null) return `${b.low}-${b.high} ${b.unit}`
  if (b.high != null) return `Below ${b.high} ${b.unit}`
  if (b.low != null) return `Above ${b.low} ${b.unit}`
  return ""
}

export function inRange(b: Biomarker, value = latest(b).value) {
  if (b.low != null && value < b.low) return false
  if (b.high != null && value > b.high) return false
  return true
}

/** The last reading against the one before: under 3% either way is stable. */
export function trendOf(b: Biomarker): Trend {
  const n = b.readings.length
  if (n < 2) return "Stable"
  const prev = b.readings[n - 2].value
  const last = b.readings[n - 1].value
  const change = (last - prev) / Math.abs(prev || 1)
  if (Math.abs(change) < 0.03) return "Stable"
  const up = change > 0
  if (b.better === "higher") return up ? "Improving" : "Declining"
  if (b.better === "lower") return up ? "Declining" : "Improving"
  const mid = ((b.low ?? prev) + (b.high ?? prev)) / 2
  return Math.abs(last - mid) < Math.abs(prev - mid) ? "Improving" : "Declining"
}

/* Olivia's panel: four draws over eighteen months, the A1C drifting the
   wrong way (the workflow's own example, 5.6 to 6.1). */
type Series = [
  id: string,
  name: string,
  unit: string,
  panel: Biomarker["panel"],
  better: Biomarker["better"],
  low: number | undefined,
  high: number | undefined,
  values: number[],
  sourceId: string,
]

const SERIES: Series[] = [
  [
    "a1c",
    "Hemoglobin A1C",
    "%",
    "Metabolic",
    "lower",
    4,
    5.6,
    [5.4, 5.6, 5.9, 6.1],
    "SRC-QUEST",
  ],
  [
    "glucose",
    "Fasting glucose",
    "mg/dL",
    "Metabolic",
    "lower",
    70,
    99,
    [92, 96, 99, 104],
    "SRC-QUEST",
  ],
  [
    "insulin",
    "Fasting insulin",
    "uIU/mL",
    "Metabolic",
    "lower",
    2.6,
    24.9,
    [8.2, 9.1, 10.4, 11.8],
    "SRC-QUEST",
  ],
  [
    "ldl",
    "LDL cholesterol",
    "mg/dL",
    "Lipids",
    "lower",
    undefined,
    100,
    [142, 138, 131, 124],
    "SRC-QUEST",
  ],
  [
    "hdl",
    "HDL cholesterol",
    "mg/dL",
    "Lipids",
    "higher",
    50,
    undefined,
    [52, 54, 55, 56],
    "SRC-QUEST",
  ],
  [
    "tg",
    "Triglycerides",
    "mg/dL",
    "Lipids",
    "lower",
    undefined,
    150,
    [160, 152, 149, 151],
    "SRC-QUEST",
  ],
  [
    "apob",
    "Apolipoprotein B",
    "mg/dL",
    "Lipids",
    "lower",
    undefined,
    90,
    [108, 104, 99, 94],
    "SRC-LABCORP",
  ],
  [
    "crp",
    "hs-CRP",
    "mg/L",
    "Inflammation",
    "lower",
    undefined,
    1,
    [3.4, 2.9, 2.2, 1.8],
    "SRC-QUEST",
  ],
  [
    "tsh",
    "TSH",
    "mIU/L",
    "Hormones",
    "range",
    0.4,
    4.5,
    [2.1, 2.3, 2, 2.2],
    "SRC-QUEST",
  ],
  [
    "vitd",
    "Vitamin D, 25-OH",
    "ng/mL",
    "Vitamins",
    "higher",
    30,
    100,
    [22, 28, 34, 38],
    "SRC-QUEST",
  ],
  [
    "weight",
    "Weight",
    "lb",
    "Vitals",
    "lower",
    undefined,
    undefined,
    [172, 170, 171, 169],
    "SRC-EPIC",
  ],
  [
    "sbp",
    "Systolic blood pressure",
    "mmHg",
    "Vitals",
    "lower",
    90,
    120,
    [124, 128, 131, 136],
    "SRC-EPIC",
  ],
]

/** Days before today of the four draws, oldest first. */
const DRAWS = [548, 366, 183, 44]

/* How each source labels the result before HOL normalizes it. */
const SOURCE_CODES: Record<string, string> = {
  a1c: "HGBA1C",
  glucose: "GLU-F",
  insulin: "INSULIN-F",
  ldl: "LDL-C",
  hdl: "HDL-C",
  tg: "TRIG",
  apob: "APO B",
  crp: "CRP-HS",
  tsh: "TSH",
  vitd: "VIT D 25-OH",
  weight: "Body weight",
  sbp: "BP systolic",
}

function readingsFor(
  values: number[],
  sourceId: string,
  key: string,
  unit: string,
  scale = 1
) {
  return values.map((raw, i) => {
    const value = Math.round(raw * scale * 10) / 10
    const date = isoFromToday(-DRAWS[i])
    return {
      date,
      value,
      sourceId,
      sourceRef: `${sourceId === "SRC-EPIC" ? "ENC" : "ACC"}-${date.replaceAll("-", "").slice(2)}-${key.toUpperCase()}`,
      importedAt: isoFromToday(-DRAWS[i] + 2),
      original: `${SOURCE_CODES[key] ?? key} ${value} ${unit}`,
    }
  })
}

/* A stable 0 to 99 roll per patient. */
function roll(id: string, salt = 0) {
  let hash = salt
  for (const ch of id) hash = (Math.imul(hash, 31) + ch.charCodeAt(0)) >>> 0
  return (Math.imul(hash + 1, 2_654_435_761) >>> 0) % 100
}

/* -------------------------------------------------------------------------- */
/*  Conditions, medications, encounters                                        */
/* -------------------------------------------------------------------------- */

export type Condition = {
  name: string
  code: string
  onset: string
  status: "Active" | "Resolved"
  sourceId: string
}
export type Medication = {
  name: string
  dose: string
  started: string
  prescriber: string
  sourceId: string
}
export type Encounter = {
  date: string
  type: string
  where: string
  clinician: string
  sourceId: string
}

export type HealthRecord = {
  patientId: string
  state: RecordState
  lastSync: string
  sourceIds: string[]
  /** Why the record could not be built, for a source exception. */
  exception?: string
  biomarkers: Biomarker[]
  conditions: Condition[]
  medications: Medication[]
  encounters: Encounter[]
  /** Free tier AI questions used this month. */
  aiUsed: number
}

/** The free tier's AI allowance: 5 to 10 a month was discussed; 5 until HOL sets it. */
export const FREE_AI_LIMIT = 5

function stateFor(p: Patient): RecordState {
  if (
    p.status === "Not invited" ||
    p.status === "Invited" ||
    p.status === "Consent withdrawn"
  )
    return "Awaiting consent"
  if (p.id === OLIVIA_ID) return "Active"
  const r = roll(p.id, 7)
  if (r < 8) return "Source exception"
  if (r < 14) return "Building"
  return "Active"
}

export function healthRecordFor(p: Patient): HealthRecord {
  const state = stateFor(p)
  const empty: HealthRecord = {
    patientId: p.id,
    state,
    lastSync: "",
    sourceIds: [],
    biomarkers: [],
    conditions: [],
    medications: [],
    encounters: [],
    aiUsed: 0,
  }
  if (state === "Awaiting consent") return empty
  if (state === "Source exception")
    return {
      ...empty,
      lastSync: isoFromToday(-1),
      sourceIds: ["SRC-EPIC"],
      exception:
        "Scripps Health (Epic) returned no documents for this patient. The name or date of birth may not match the hospital's record.",
    }
  if (state === "Building")
    return {
      ...empty,
      lastSync: isoFromToday(0),
      sourceIds: ["SRC-EPIC", "SRC-QUEST"],
    }

  const olivia = p.id === OLIVIA_ID
  const doc = providers.get().find((x) => x.id === p.providerId)
  const clinician = doc ? `Dr. ${doc.firstName} ${doc.lastName}` : ""
  /* Everyone else gets Olivia's panel, nudged per patient so no two match. */
  const scale = olivia ? 1 : 0.9 + roll(p.id, 3) / 500
  return {
    ...empty,
    lastSync: isoFromToday(0),
    sourceIds: ["SRC-EPIC", "SRC-QUEST", "SRC-LABCORP", "SRC-IMG"],
    biomarkers: SERIES.map(
      ([id, name, unit, panel, better, low, high, values, sourceId]) => ({
        id,
        name,
        unit,
        panel,
        better,
        low,
        high,
        readings: readingsFor(values, sourceId, id, unit, scale),
      })
    ),
    conditions: [
      {
        name: "Prediabetes",
        code: "R73.03",
        onset: isoFromToday(-183),
        status: "Active",
        sourceId: "SRC-EPIC",
      },
      {
        name: "Hyperlipidemia",
        code: "E78.5",
        onset: isoFromToday(-900),
        status: "Active",
        sourceId: "SRC-EPIC",
      },
      {
        name: "Vitamin D deficiency",
        code: "E55.9",
        onset: isoFromToday(-560),
        status: "Resolved",
        sourceId: "SRC-EPIC",
      },
    ],
    medications: [
      {
        name: "Atorvastatin",
        dose: "10 mg, once daily",
        started: isoFromToday(-610),
        prescriber: clinician,
        sourceId: "SRC-EPIC",
      },
      {
        name: "Vitamin D3",
        dose: "2,000 IU, once daily",
        started: isoFromToday(-540),
        prescriber: clinician,
        sourceId: "SRC-EPIC",
      },
    ],
    encounters: [
      {
        date: isoFromToday(-44),
        type: "Annual physical",
        where: "Harborview Longevity Clinic",
        clinician,
        sourceId: "SRC-EPIC",
      },
      {
        date: isoFromToday(-46),
        type: "Lab draw",
        where: "Quest Diagnostics, Carlsbad",
        clinician: "",
        sourceId: "SRC-QUEST",
      },
      {
        date: isoFromToday(-183),
        type: "Follow-up visit",
        where: "Harborview Longevity Clinic",
        clinician,
        sourceId: "SRC-EPIC",
      },
      {
        date: isoFromToday(-300),
        type: "Mammogram",
        where: "Coastal Imaging Center",
        clinician: "",
        sourceId: "SRC-IMG",
      },
    ],
    aiUsed: olivia ? 3 : roll(p.id, 9) % (FREE_AI_LIMIT + 1),
  }
}

/* -------------------------------------------------------------------------- */
/*  Plan recommendations                                                       */
/* -------------------------------------------------------------------------- */

/* Agreed on the call: the provider (or the AI) can recommend a specific
   optimization plan with the reason, rather than leaving the patient to find
   one. The patient decides in the app. */

export const PLANS = [
  {
    id: "metabolic",
    name: "Metabolic Health",
    focus: "Blood sugar, insulin and energy",
  },
  {
    id: "weight",
    name: "Weight Loss",
    focus: "Body composition and a sustainable deficit",
  },
  {
    id: "bone",
    name: "Bone Density",
    focus: "DEXA, strength training and supplements",
  },
  {
    id: "cardio",
    name: "Cardiovascular and Lipids",
    focus: "Lipids, blood pressure and inflammation",
  },
  {
    id: "longevity",
    name: "Healthy Longevity",
    focus: "A full panel reviewed each quarter",
  },
] as const

export type PlanId = (typeof PLANS)[number]["id"]

export const planName = (id: string) =>
  PLANS.find((p) => p.id === id)?.name ?? id

export type Recommendation = {
  id: string
  patientId: string
  planId: PlanId
  reason: string
  /** Biomarker ids the reason points to. */
  findings: string[]
  by: string
  sentAt: string
  status: "Sent" | "Viewed" | "Subscribed" | "Declined"
}

const RECOMMENDATION_SEED: Recommendation[] = []

export const recommendations = createCollection(
  "hol-plan-recommendations",
  RECOMMENDATION_SEED,
  "v1"
)

export function recommendPlan(
  input: Omit<Recommendation, "id" | "sentAt" | "status">
) {
  const rec: Recommendation = {
    ...input,
    id: nextId("R", recommendations.get()),
    sentAt: today(),
    status: "Sent",
  }
  recommendations.add([rec])
  return rec
}

/** The reason a provider starts from: the flagged, declining markers. */
export function suggestedReason(record: HealthRecord) {
  const flagged = record.biomarkers.filter(
    (b) => trendOf(b) === "Declining" && (!inRange(b) || b.id === "glucose")
  )
  return {
    findings: flagged.map((b) => b.id),
    text: flagged.length
      ? `${flagged
          .map(
            (b) =>
              `${b.name} has moved from ${b.readings[0].value} to ${latest(b).value} ${b.unit}`
          )
          .join(
            "; "
          )} over the last 18 months. A structured plan with regular testing can help turn this around.`
      : "",
  }
}
