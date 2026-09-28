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
  /** The exchange the vendor reached it through. */
  network: string
}

export const SOURCES: Source[] = [
  {
    id: "SRC-EPIC",
    name: "Scripps Health (Epic)",
    kind: "EHR",
    via: "Health Gorilla",
    network: "Carequality",
  },
  {
    id: "SRC-QUEST",
    name: "Quest Diagnostics",
    kind: "Lab",
    via: "Health Gorilla",
    network: "Lab network",
  },
  {
    id: "SRC-LABCORP",
    name: "Labcorp",
    kind: "Lab",
    via: "Health Gorilla",
    network: "Lab network",
  },
  {
    id: "SRC-IMG",
    name: "Coastal Imaging Center",
    kind: "Imaging",
    via: "Health Gorilla",
    network: "CommonWell",
  },
  {
    id: "SRC-PRACTICE",
    name: "Entered by practice",
    kind: "EHR",
    via: "HOL",
    network: "Harborview Longevity Clinic",
  },
]

/** Records a provider types into the chart, rather than synced. */
export const PRACTICE_SOURCE = "SRC-PRACTICE"

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
    | "Metabolic"
    | "Lipids"
    | "Inflammation"
    | "Hormones"
    | "Vitamins"
    | "Vitals"
    | "Blood count"
    | "Chemistry"
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
    "wbc",
    "White blood cells",
    "K/uL",
    "Blood count",
    "range",
    3.8,
    10.8,
    [6.2, 5.9, 6.4, 6.1],
    "SRC-QUEST",
  ],
  [
    "hgb",
    "Hemoglobin",
    "g/dL",
    "Blood count",
    "range",
    11.7,
    15.5,
    [13.1, 13.4, 13.2, 13.5],
    "SRC-QUEST",
  ],
  [
    "hct",
    "Hematocrit",
    "%",
    "Blood count",
    "range",
    35,
    45,
    [39.4, 40.1, 39.8, 40.6],
    "SRC-QUEST",
  ],
  [
    "plt",
    "Platelets",
    "K/uL",
    "Blood count",
    "range",
    140,
    400,
    [248, 262, 255, 241],
    "SRC-QUEST",
  ],
  [
    "sodium",
    "Sodium",
    "mmol/L",
    "Chemistry",
    "range",
    135,
    146,
    [139, 140, 138, 141],
    "SRC-QUEST",
  ],
  [
    "potassium",
    "Potassium",
    "mmol/L",
    "Chemistry",
    "range",
    3.5,
    5.3,
    [4.2, 4.4, 4.1, 4.3],
    "SRC-QUEST",
  ],
  [
    "creatinine",
    "Creatinine",
    "mg/dL",
    "Chemistry",
    "range",
    0.5,
    1.03,
    [0.78, 0.81, 0.84, 0.86],
    "SRC-QUEST",
  ],
  [
    "egfr",
    "eGFR",
    "mL/min/1.73m2",
    "Chemistry",
    "higher",
    60,
    undefined,
    [94, 91, 88, 86],
    "SRC-QUEST",
  ],
  [
    "alt",
    "ALT",
    "U/L",
    "Chemistry",
    "lower",
    6,
    29,
    [22, 26, 31, 34],
    "SRC-QUEST",
  ],
  [
    "ast",
    "AST",
    "U/L",
    "Chemistry",
    "lower",
    10,
    35,
    [21, 23, 26, 28],
    "SRC-QUEST",
  ],
  [
    "albumin",
    "Albumin",
    "g/dL",
    "Chemistry",
    "range",
    3.6,
    5.1,
    [4.4, 4.5, 4.3, 4.4],
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
  wbc: "WBC",
  hgb: "HGB",
  hct: "HCT",
  plt: "PLT",
  sodium: "NA",
  potassium: "K",
  creatinine: "CREAT",
  egfr: "EGFR",
  alt: "ALT",
  ast: "AST",
  albumin: "ALB",
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
/*  Chart data                                                                 */
/* -------------------------------------------------------------------------- */

/* Only what Health Gorilla returns (the "EHR data" sheet): Patient,
   Encounter, Condition, MedicationStatement, AllergyIntolerance, Observation
   (labs and vitals), Procedure, Immunization, DiagnosticReport and
   DocumentReference. Nothing here is typed in by the practice: insurance,
   appointments, family history and billing are not part of the feed, so the
   chart leaves them out. */

/** AllergyIntolerance. */
export type Allergy = {
  id: string
  category: "Drug" | "Food" | "Environmental"
  substance: string
  severity: "Mild" | "Moderate" | "Severe"
  reaction: string
  onset: string
  recorded: string
  recordedBy: string
  status: "Active" | "Inactive"
  note?: string
  sourceId: string
}

/** Condition: the problem list (active) and past medical history (resolved). */
export type Condition = {
  id: string
  name: string
  /** ICD-10-CM. */
  code: string
  snomed: string
  type: "Chronic" | "Acute"
  onset: string
  recorded: string
  status: "Active" | "Resolved"
  /** When a resolved condition ended. */
  abated?: string
  /** The short tag the chart banner shows for an active condition. */
  tag?: string
  note?: string
  sourceId: string
}

/** MedicationStatement. */
export type Medication = {
  id: string
  name: string
  rxnorm: string
  /** The directions as written, "1 tablet by mouth at bedtime". */
  sig: string
  quantity: string
  route: string
  timing: string
  frequency: string
  /** ICD-10 code of the condition it treats. */
  dx: string
  recorded: string
  started: string
  /** Empty while the patient still takes it. */
  ended: string
  prescriber: string
  note?: string
  sourceId: string
}

/** Immunization. Historical = reported, not given by the source. */
export type Immunization = {
  id: string
  status: "Administered" | "Historical" | "Refused"
  vaccine: string
  dose: string
  route: string
  site: string
  lot: string
  manufacturer: string
  /** Empty when refused. */
  date: string
  /** Who gave it, or who recorded the refusal. */
  by: string
  performer: string
  /** Why it was not given, for a refusal. */
  reason?: string
  time?: string
  orderedBy?: string
  ndc?: string
  units?: string
  expiry?: string
  reaction?: string
  /** Where a historical dose was reported from. */
  infoSource?: string
  note?: string
  sourceId: string
}

/** Procedure: the chart's procedures and past surgical history. */
export type Procedure = {
  id: string
  name: string
  /** CPT. */
  code: string
  date: string
  status: "Completed"
  note: string
  performer: string
  where: string
  sourceId: string
}

/** Observation (vital-signs category), one set per visit. */
export type VitalSet = {
  date: string
  time: string
  systolic: number
  diastolic: number
  heartRate: number
  respRate: number
  spo2: number
  tempF: number
  heightIn: number
  weightLb: number
  recordedBy: string
  pulseRate?: number
  /** How each reading was taken, "Sitting, left arm, adult cuff". */
  context?: string
  note?: string
  sourceId: string
}

/** DiagnosticReport outside the lab: imaging and pathology. */
export type StudyReport = {
  id: string
  category: "Imaging" | "Pathology"
  name: string
  /** CPT for imaging, LOINC for pathology. */
  code: string
  date: string
  status: "Final"
  performer: string
  conclusion: string
  /** The DocumentReference with the full report. */
  documentId: string
  sourceId: string
}

/** The clinical note a source sends with a visit, as a C-CDA. */
export type ClinicalNote = {
  chiefComplaint: string
  hpi: string
  assessment: string
  plan: string
}

/** Encounter. */
export type Encounter = {
  id: string
  date: string
  start: string
  end: string
  kind: "In person" | "Virtual" | "Lab" | "Imaging"
  type: string
  where: string
  clinician: string
  reason: string
  /** ICD-10 codes of the conditions addressed. */
  diagnoses: string[]
  note?: ClinicalNote
  sourceId: string
}

/** DiagnosticReport with its Observation results. */
export type LabResult = {
  name: string
  loinc: string
  /** The value from the draw before, for the cumulative column. */
  previous?: { value: number; date: string }
  /** Every value on record up to this one, oldest first. */
  history: number[]
  value: number
  unit: string
  range: string
  flag: "" | "High" | "Low"
}
export type LabReport = {
  id: string
  name: string
  date: string
  accession: string
  orderedBy: string
  status: "Final"
  sourceId: string
  results: LabResult[]
  reviewer?: string
  time?: string
  interpretation?: string
  file?: string
  mime?: string
  note?: string
}

/** DocumentReference: C-CDA summaries and PDFs. */
export type ChartDocument = {
  id: string
  title: string
  format: "C-CDA" | "PDF" | "Image"
  /** Which layout the viewer draws it in. */
  kind:
    | "ccd"
    | "visit-summary"
    | "discharge"
    | "lab"
    | "imaging"
    | "colonoscopy"
    | "upload"
  /** An uploaded file, as a data URL, with its type. */
  file?: string
  mime?: string
  /** The encounter a visit summary belongs to. */
  encounterId?: string
  /** Which study an imaging report describes. */
  study?: "mammogram" | "calcium" | "dexa" | "chest" | "ultrasound"
  date: string
  author: string
  sourceId: string
  sections: { heading: string; text: string }[]
}

export type HealthRecord = {
  patientId: string
  state: RecordState
  lastSync: string
  sourceIds: string[]
  /** Why the record could not be built, for a source exception. */
  exception?: string
  biomarkers: Biomarker[]
  allergies: Allergy[]
  conditions: Condition[]
  medications: Medication[]
  immunizations: Immunization[]
  procedures: Procedure[]
  vitals: VitalSet[]
  encounters: Encounter[]
  labReports: LabReport[]
  studies: StudyReport[]
  documents: ChartDocument[]
  /** Free tier AI questions used this month. */
  aiUsed: number
}

/** The free tier's AI allowance: 5 to 10 a month was discussed; 5 until HOL sets it. */
export const FREE_AI_LIMIT = 5

/* A failed and a building record on the list's first page, so every state
   shows without paging. */
const SAMPLE_STATES: Record<string, RecordState> = {
  P10291: "Building",
  P10342: "Source exception",
}

export function stateFor(p: Patient): RecordState {
  if (
    p.status === "Not invited" ||
    p.status === "Invited" ||
    p.status === "Declined" ||
    p.status === "Consent withdrawn"
  )
    return "Awaiting consent"
  if (p.id === OLIVIA_ID) return "Active"
  if (p.id in SAMPLE_STATES) return SAMPLE_STATES[p.id]
  const r = roll(p.id, 7)
  if (r < 8) return "Source exception"
  if (r < 14) return "Building"
  return "Active"
}

export function bmiOf(v: VitalSet) {
  return Math.round(((703 * v.weightLb) / v.heightIn ** 2) * 10) / 10
}

export function heightLabel(inches: number) {
  return `${Math.floor(inches / 12)} ft ${inches % 12} in`
}

/** Weight arrives in pounds; the chart shows kilograms. */
export function kgOf(lb: number) {
  return Math.round((lb / 2.20462) * 10) / 10
}

/** LOINC codes for the lab and vital-sign Observations. */
export const LOINC: Record<string, string> = {
  a1c: "4548-4",
  glucose: "1558-6",
  insulin: "20448-7",
  ldl: "13457-7",
  hdl: "2085-9",
  tg: "2571-8",
  apob: "1884-6",
  crp: "30522-7",
  tsh: "3016-3",
  vitd: "1989-3",
  wbc: "6690-2",
  hgb: "718-7",
  hct: "4544-3",
  plt: "777-3",
  sodium: "2951-2",
  potassium: "2823-3",
  creatinine: "2160-0",
  egfr: "98979-8",
  alt: "1742-6",
  ast: "1920-8",
  albumin: "1751-7",
  weight: "29463-7",
  sbp: "8480-6",
  bp: "85354-9",
  heartRate: "8867-4",
  respRate: "9279-1",
  spo2: "59408-5",
  temp: "8310-5",
  height: "8302-2",
  bmi: "39156-5",
}

const PANEL_REPORT: Partial<Record<Biomarker["panel"], string>> = {
  Metabolic: "Metabolic panel",
  Lipids: "Lipid panel",
  Inflammation: "Inflammation panel",
  Hormones: "Thyroid panel",
  Vitamins: "Vitamin D, 25-OH",
  "Blood count": "Complete blood count (CBC)",
  Chemistry: "Comprehensive metabolic panel",
}

/* One DiagnosticReport per draw, panel and lab, built from the same readings
   the biomarker trends use so the two views never disagree. */
function labReportsFrom(biomarkers: Biomarker[], orderedBy: string) {
  const reports = new Map<string, LabReport>()
  for (const b of biomarkers) {
    const panel = PANEL_REPORT[b.panel]
    if (!panel) continue
    for (const r of b.readings) {
      const name = b.id === "apob" ? "Apolipoprotein B" : panel
      const key = `${r.date}|${name}|${r.sourceId}`
      const report = reports.get(key) ?? {
        id: `DR-${r.date.replaceAll("-", "")}-${name.replace(/\W+/g, "").slice(0, 8).toUpperCase()}`,
        name,
        date: r.date,
        accession: `ACC-${r.date.replaceAll("-", "").slice(2)}-${reports.size + 101}`,
        orderedBy,
        status: "Final" as const,
        sourceId: r.sourceId,
        results: [],
      }
      const at = b.readings.indexOf(r)
      const before = b.readings[at - 1]
      report.results.push({
        name: b.name,
        loinc: LOINC[b.id] ?? "",
        previous: before
          ? { value: before.value, date: before.date }
          : undefined,
        history: b.readings.slice(0, at + 1).map((x) => x.value),
        value: r.value,
        unit: b.unit,
        range: rangeLabel(b).replace(` ${b.unit}`, ""),
        flag:
          b.high != null && r.value > b.high
            ? "High"
            : b.low != null && r.value < b.low
              ? "Low"
              : "",
      })
      reports.set(key, report)
    }
  }
  return [...reports.values()].sort((a, b) => b.date.localeCompare(a.date))
}

export function healthRecordFor(p: Patient): HealthRecord {
  const state = stateFor(p)
  const empty: HealthRecord = {
    patientId: p.id,
    state,
    lastSync: "",
    sourceIds: [],
    biomarkers: [],
    allergies: [],
    conditions: [],
    medications: [],
    immunizations: [],
    procedures: [],
    vitals: [],
    encounters: [],
    labReports: [],
    studies: [],
    documents: [],
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
  return fullRecord(p, empty)
}

/** The record once every source has reported: what a sync ends with. */
export function builtRecordFor(p: Patient): HealthRecord {
  const record = healthRecordFor(p)
  if (record.state === "Active" || record.state === "Awaiting consent")
    return record
  return fullRecord(p, { ...record, state: "Active", exception: undefined })
}

function fullRecord(p: Patient, base: HealthRecord): HealthRecord {
  const olivia = p.id === OLIVIA_ID
  const doc = providers.get().find((x) => x.id === p.providerId)
  const clinician = doc ? `Dr. ${doc.firstName} ${doc.lastName}` : ""
  const female = p.sex === "Female"
  /* Everyone else gets Olivia's chart, nudged per patient so no two match. */
  const scale = olivia ? 1 : 0.9 + roll(p.id, 3) / 500
  const keep = (salt: number) => olivia || roll(p.id, salt) > 25
  const d = isoFromToday

  const biomarkers: Biomarker[] = SERIES.map(
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
  )
  const series = (id: string) =>
    biomarkers.find((b) => b.id === id)!.readings.map((r) => r.value)
  const weights = series("weight")
  const systolics = series("sbp")

  const clinic = "Harborview Longevity Clinic"
  const imaging = female
    ? {
        name: "Screening mammogram",
        note: "BI-RADS 1, negative. Routine screening in 12 months.",
        report: "Mammogram report",
      }
    : {
        name: "Coronary calcium scan",
        note: "Agatston score 0. No coronary calcium seen.",
        report: "Coronary calcium scan report",
      }

  const encounters: Encounter[] = [
    {
      id: "ENC-1",
      date: d(-DRAWS[3]),
      start: "9:00 AM",
      end: "9:45 AM",
      kind: "In person",
      type: "Annual physical",
      where: clinic,
      clinician,
      reason: "Annual wellness visit and review of fasting labs",
      diagnoses: ["R73.03", "E78.5", "R03.0"],
      note: {
        chiefComplaint:
          "Here for the annual physical. Feels well overall, with some afternoon fatigue.",
        hpi: "Reports more afternoon fatigue over the last three months, eased by a short walk. Sleeps about six hours a night. Takes atorvastatin and vitamin D3 daily without side effects. No chest pain, palpitations or shortness of breath on exertion.",
        assessment: `Prediabetes with A1C rising to ${latest(biomarkers[0]).value}%. Hyperlipidemia improving on atorvastatin. Elevated blood pressure reading today, ${Math.round(systolics[3])}/84 mmHg.`,
        plan: "Continue atorvastatin 10 mg and vitamin D3. Nutrition and activity plan for blood sugar. Home blood pressure log for two weeks. Repeat fasting labs in 6 months.",
      },
      sourceId: "SRC-EPIC",
    },
    {
      id: "ENC-2",
      date: d(-DRAWS[3]),
      start: "7:40 AM",
      end: "7:50 AM",
      kind: "Lab",
      type: "Lab draw",
      where: "Quest Diagnostics, Carlsbad",
      clinician: "",
      reason: "Fasting labs ordered for the annual physical",
      diagnoses: [],
      sourceId: "SRC-QUEST",
    },
    {
      id: "ENC-3",
      date: d(-120),
      start: "2:00 PM",
      end: "2:20 PM",
      kind: "Virtual",
      type: "Telehealth follow-up",
      where: clinic,
      clinician,
      reason: "Review of home blood pressure readings",
      diagnoses: ["R03.0"],
      note: {
        chiefComplaint: "Follow-up on home blood pressure readings.",
        hpi: "Home readings average 128/82 mmHg over two weeks, taken in the morning. No headaches or dizziness.",
        assessment:
          "Elevated blood pressure without a diagnosis of hypertension.",
        plan: "Reduce sodium, keep daily walks, recheck at the annual physical.",
      },
      sourceId: "SRC-EPIC",
    },
    {
      id: "ENC-4",
      date: d(-DRAWS[2]),
      start: "10:30 AM",
      end: "11:00 AM",
      kind: "In person",
      type: "Follow-up visit",
      where: clinic,
      clinician,
      reason: "Lab follow-up, fasting glucose trending up",
      diagnoses: ["R73.03", "E78.5"],
      note: {
        chiefComplaint: "Lab follow-up.",
        hpi: `Fasting glucose ${series("glucose")[2]} mg/dL and A1C ${series("a1c")[2]}%, both higher than last year. Vitamin D back in range on supplements.`,
        assessment:
          "Prediabetes, new. Hyperlipidemia, improving. Vitamin D deficiency, resolved.",
        plan: "Start lifestyle changes for blood sugar. Continue atorvastatin and vitamin D3. Labs in 6 months.",
      },
      sourceId: "SRC-EPIC",
    },
    {
      id: "ENC-5",
      date: d(-300),
      start: "8:15 AM",
      end: "8:45 AM",
      kind: "Imaging",
      type: imaging.name,
      where: "Coastal Imaging Center",
      clinician: "Dr. Priya Raman",
      reason: "Routine screening",
      diagnoses: [],
      sourceId: "SRC-IMG",
    },
    {
      id: "ENC-6",
      date: d(-DRAWS[1]),
      start: "9:00 AM",
      end: "9:40 AM",
      kind: "In person",
      type: "Annual physical",
      where: clinic,
      clinician,
      reason: "Annual wellness visit",
      diagnoses: ["E78.5", "E55.9"],
      note: {
        chiefComplaint: "Annual physical.",
        hpi: "No new concerns. Walking three times a week. Taking vitamin D3 since last year.",
        assessment:
          "Hyperlipidemia on atorvastatin. Vitamin D deficiency, improving.",
        plan: "Continue current medications. Fasting labs in 6 months.",
      },
      sourceId: "SRC-EPIC",
    },
    {
      id: "ENC-7",
      date: d(-DRAWS[0]),
      start: "1:30 PM",
      end: "2:30 PM",
      kind: "In person",
      type: "New patient visit",
      where: clinic,
      clinician,
      reason: "Establish care",
      diagnoses: ["E78.5", "E55.9"],
      note: {
        chiefComplaint: "New patient, establishing care.",
        hpi: "Moving care from a previous primary care office. History of high cholesterol treated with atorvastatin. Low vitamin D on outside labs.",
        assessment: "Hyperlipidemia. Vitamin D deficiency.",
        plan: "Continue atorvastatin 10 mg. Start vitamin D3 2,000 IU daily. Baseline labs today.",
      },
      sourceId: "SRC-EPIC",
    },
  ]

  const vitals: VitalSet[] = DRAWS.map((days, i) => ({
    date: d(-days),
    time: ["1:42 PM", "9:08 AM", "10:36 AM", "9:06 AM"][i],
    systolic: Math.round(systolics[i]),
    diastolic: [80, 80, 82, 84][i],
    heartRate: [72, 70, 74, 76][i],
    respRate: [14, 14, 16, 15][i],
    spo2: [98, 99, 98, 98][i],
    tempF: [98.4, 98.2, 98.6, 98.4][i],
    heightIn: female ? 66 : 70,
    weightLb: Math.round(weights[i]),
    recordedBy: [
      "Maria Lopez, MA",
      "Maria Lopez, MA",
      "Kevin Tran, RN",
      "Kevin Tran, RN",
    ][i],
    sourceId: "SRC-EPIC",
  }))
  /* Check-ins every two to four days since the last visit's high blood
     pressure, so the chart's week, month and 90 day trends have points.
     Seeded noise per patient, a slow response to treatment, and the odd
     stressed reading, as real home and nurse readings look. */
  const visit = vitals[vitals.length - 1]
  let seed = roll(p.id, 21) * 7919 + 1
  const rand = () => {
    seed = (Math.imul(seed ^ (seed >>> 15), 2_246_822_507) + 0x6d2b79f5) >>> 0
    return seed / 4_294_967_296
  }
  /* Roughly bell shaped, between -1 and 1. */
  const noise = () => (rand() + rand() + rand()) / 1.5 - 1
  const times = [
    "7:52 AM",
    "8:15 AM",
    "8:34 AM",
    "9:05 AM",
    "12:40 PM",
    "5:48 PM",
    "6:22 PM",
    "8:10 PM",
  ]
  for (let days = 88; days >= 1; days -= 2 + Math.floor(rand() * 3)) {
    if (days === DRAWS[3]) continue
    const eased = (88 - days) / 88
    const stressed = rand() < 0.08
    const pulse = noise()
    vitals.push({
      ...visit,
      date: d(-days),
      time: times[Math.floor(rand() * times.length)],
      systolic: Math.round(
        visit.systolic - eased * 9 + noise() * 6 + (stressed ? 11 : 0)
      ),
      diastolic: Math.round(
        visit.diastolic - eased * 4 + noise() * 4 + (stressed ? 6 : 0)
      ),
      heartRate: Math.round(
        visit.heartRate - eased * 3 + pulse * 5 + (stressed ? 8 : 0)
      ),
      respRate: Math.round(15 + noise() * 2.4),
      spo2: Math.min(100, Math.round(97.8 + noise() * 1.6)),
      tempF: Math.round((98.3 + noise() * 0.5) * 10) / 10,
      weightLb:
        Math.round((visit.weightLb - eased * 3.5 + noise() * 1.4) * 10) / 10,
      recordedBy: rand() < 0.5 ? "Kevin Tran, RN" : "Maria Lopez, MA",
    })
  }
  vitals.sort((a, b) => b.date.localeCompare(a.date))

  const allergies: Allergy[] = [
    {
      id: "AL-1",
      category: "Drug" as const,
      substance: "Penicillin",
      severity: "Moderate" as const,
      reaction: "Hives and itching",
      onset: d(-3650),
      recorded: d(-DRAWS[0]),
      recordedBy: "Kevin Tran, RN",
      status: "Active" as const,
      sourceId: "SRC-EPIC",
    },
    {
      id: "AL-2",
      category: "Food" as const,
      substance: "Shellfish",
      severity: "Severe" as const,
      reaction: "Throat swelling, shortness of breath",
      onset: d(-6200),
      recorded: d(-DRAWS[0]),
      recordedBy: "Kevin Tran, RN",
      status: "Active" as const,
      sourceId: "SRC-EPIC",
    },
    {
      id: "AL-3",
      category: "Environmental" as const,
      substance: "Pollen",
      severity: "Mild" as const,
      reaction: "Sneezing, watery eyes, nasal congestion",
      onset: d(-4100),
      recorded: d(-DRAWS[1]),
      recordedBy: "Maria Lopez, MA",
      status: "Active" as const,
      sourceId: "SRC-EPIC",
    },
  ].filter((_, i) => i === 0 || keep(11 + i))

  const conditions: Condition[] = [
    {
      id: "CN-1",
      name: "Prediabetes",
      code: "R73.03",
      snomed: "714628002",
      type: "Chronic",
      onset: d(-DRAWS[2]),
      recorded: d(-DRAWS[2]),
      status: "Active",
      note: "A1C rising over 18 months. Lifestyle plan in place.",
      sourceId: "SRC-EPIC",
    },
    {
      id: "CN-2",
      name: "Hyperlipidemia",
      code: "E78.5",
      snomed: "55822004",
      type: "Chronic",
      onset: d(-900),
      recorded: d(-DRAWS[0]),
      status: "Active",
      note: "On atorvastatin 10 mg, LDL improving.",
      sourceId: "SRC-EPIC",
    },
    {
      id: "CN-3",
      name: "Elevated blood pressure reading",
      tag: "High BP",
      code: "R03.0",
      snomed: "371622005",
      type: "Acute",
      onset: d(-120),
      recorded: d(-120),
      status: "Active",
      note: "No diagnosis of hypertension. Home log advised.",
      sourceId: "SRC-EPIC",
    },
    {
      id: "CN-4",
      name: "Vitamin D deficiency",
      code: "E55.9",
      snomed: "34713006",
      type: "Chronic",
      onset: d(-DRAWS[0]),
      recorded: d(-DRAWS[0]),
      abated: d(-DRAWS[2]),
      status: "Resolved",
      note: `Resolved on vitamin D3 2,000 IU daily. Level ${series("vitd")[2]} ng/mL.`,
      sourceId: "SRC-EPIC",
    },
    {
      id: "CN-5",
      name: "Iron deficiency anemia",
      code: "D50.9",
      snomed: "87522002",
      type: "Acute",
      onset: d(-2900),
      recorded: d(-2900),
      abated: d(-2770),
      status: "Resolved",
      note: "Treated with oral iron for six months. Hemoglobin normal since.",
      sourceId: "SRC-EPIC",
    },
    {
      id: "CN-6",
      name: female ? "Gestational diabetes" : "Acute bronchitis",
      code: female ? "O24.419" : "J20.9",
      snomed: female ? "11687002" : "10509002",
      type: "Acute",
      onset: d(female ? -7600 : -1500),
      recorded: d(female ? -7600 : -1500),
      abated: d(female ? -7420 : -1480),
      status: "Resolved",
      note: female
        ? "Diet controlled during pregnancy. Resolved after delivery."
        : "Resolved with rest and fluids. No antibiotics needed.",
      sourceId: "SRC-EPIC",
    },
  ]

  const medications: Medication[] = [
    {
      id: "MS-1",
      name: "Atorvastatin 10 mg tablet",
      rxnorm: "617312",
      sig: "Take 1 tablet by mouth at bedtime",
      quantity: "30 tablets",
      route: "Oral",
      timing: "At bedtime",
      frequency: "Once daily",
      dx: "E78.5",
      recorded: d(-610),
      started: d(-610),
      ended: "",
      prescriber: clinician,
      sourceId: "SRC-EPIC",
    },
    {
      id: "MS-2",
      name: "Vitamin D3 2,000 IU capsule",
      rxnorm: "636671",
      sig: "Take 1 capsule by mouth daily with food",
      quantity: "90 capsules",
      route: "Oral",
      timing: "With food",
      frequency: "Once daily",
      dx: "E55.9",
      recorded: d(-DRAWS[0]),
      started: d(-DRAWS[0]),
      ended: "",
      prescriber: clinician,
      sourceId: "SRC-EPIC",
    },
    {
      id: "MS-3",
      name: "Cetirizine 10 mg tablet",
      rxnorm: "1014678",
      sig: "Take 1 tablet by mouth daily as needed for allergies",
      quantity: "30 tablets",
      route: "Oral",
      timing: "As needed",
      frequency: "Once daily",
      dx: "J30.2",
      recorded: d(-1200),
      started: d(-1200),
      ended: "",
      prescriber: clinician,
      sourceId: "SRC-EPIC",
    },
    {
      id: "MS-4",
      name: "Ferrous sulfate 325 mg tablet",
      rxnorm: "310325",
      sig: "Take 1 tablet by mouth twice daily with food",
      quantity: "60 tablets",
      route: "Oral",
      timing: "With food",
      frequency: "Twice daily",
      dx: "D50.9",
      recorded: d(-2900),
      started: d(-2900),
      ended: d(-2770),
      prescriber: "Dr. Alan Brooks",
      sourceId: "SRC-EPIC",
    },
  ]

  const immunizations: Immunization[] = [
    {
      id: "IM-1",
      status: "Administered",
      vaccine: "Influenza, quadrivalent, 2026-2027",
      dose: "0.5 ml",
      route: "Intramuscular",
      site: "Left deltoid",
      lot: "FL2026-4471",
      manufacturer: "Sanofi Pasteur",
      date: d(-12),
      by: "Kevin Tran, RN",
      performer: clinic,
      sourceId: "SRC-EPIC",
    },
    {
      id: "IM-2",
      status: "Administered",
      vaccine: "COVID-19, mRNA, 2025-2026",
      dose: "0.3 ml",
      route: "Intramuscular",
      site: "Right deltoid",
      lot: "CV25-88213",
      manufacturer: "Pfizer",
      date: d(-380),
      by: "Kevin Tran, RN",
      performer: clinic,
      sourceId: "SRC-EPIC",
    },
    {
      id: "IM-3",
      status: "Refused",
      vaccine: "Zoster recombinant (Shingrix)",
      dose: "0.5 ml",
      route: "Intramuscular",
      site: "",
      lot: "",
      manufacturer: "GSK",
      date: "",
      by: clinician,
      performer: clinic,
      reason: "Patient declined, wants to discuss at next visit",
      sourceId: "SRC-EPIC",
    },
    {
      id: "IM-4",
      status: "Historical",
      vaccine: "Tdap",
      dose: "0.5 ml",
      route: "Intramuscular",
      site: "Left deltoid",
      lot: "",
      manufacturer: "",
      date: d(-2400),
      by: "Reported by patient",
      performer: "Outside provider",
      sourceId: "SRC-EPIC",
    },
  ]

  const procedures: Procedure[] = [
    {
      id: "PR-1",
      name: imaging.name,
      code: female ? "77067" : "75571",
      date: d(-300),
      status: "Completed",
      note: imaging.note,
      performer: "Dr. Priya Raman",
      where: "Coastal Imaging Center",
      sourceId: "SRC-IMG",
    },
    {
      id: "PR-2",
      name: "Colonoscopy with snare polypectomy",
      code: "45385",
      date: d(-1100),
      status: "Completed",
      note: "Two small polyps removed, both benign. Repeat in 5 years.",
      performer: "Dr. Marcus Lee",
      where: "Scripps Memorial Hospital",
      sourceId: "SRC-EPIC",
    },
    {
      id: "PR-3",
      name: "Laparoscopic cholecystectomy",
      code: "47562",
      date: d(-3300),
      status: "Completed",
      note: "Gallbladder removed for gallstones. Recovered fully, no complications.",
      performer: "Dr. Hannah Ortiz",
      where: "Scripps Memorial Hospital",
      sourceId: "SRC-EPIC",
    },
  ]

  const labReports = labReportsFrom(biomarkers, clinician)

  const studies: StudyReport[] = [
    {
      id: "DR-IMG-1",
      category: "Imaging",
      name: female
        ? "Screening mammogram, bilateral, with tomosynthesis"
        : "CT cardiac calcium scoring",
      code: female ? "77067" : "75571",
      date: d(-300),
      status: "Final",
      performer: "Dr. Priya Raman",
      conclusion: imaging.note,
      documentId: "DOC-5",
      sourceId: "SRC-IMG",
    },
    {
      id: "DR-IMG-2",
      category: "Imaging",
      name: "DEXA bone density, spine and hip",
      code: "77080",
      date: d(-200),
      status: "Final",
      performer: "Dr. Priya Raman",
      conclusion:
        "Osteopenia of the lumbar spine (T-score -1.6). Hips normal. 10 year major osteoporotic fracture risk 6.1%.",
      documentId: "DOC-8",
      sourceId: "SRC-IMG",
    },
    {
      id: "DR-IMG-3",
      category: "Imaging",
      name: "Ultrasound abdomen, right upper quadrant",
      code: "76705",
      date: d(-366),
      status: "Final",
      performer: "Dr. Daniel Reyes",
      conclusion:
        "Mild diffuse hepatic steatosis. Status post cholecystectomy. No biliary dilation.",
      documentId: "DOC-10",
      sourceId: "SRC-IMG",
    },
    {
      id: "DR-IMG-4",
      category: "Imaging",
      name: "Chest X-ray, PA and lateral",
      code: "71046",
      date: d(-DRAWS[0]),
      status: "Final",
      performer: "Dr. Daniel Reyes",
      conclusion: "No acute cardiopulmonary abnormality.",
      documentId: "DOC-9",
      sourceId: "SRC-IMG",
    },
  ]

  const noteSections = (e: Encounter) =>
    e.note
      ? [
          { heading: "Reason for visit", text: e.reason },
          { heading: "Chief complaint", text: e.note.chiefComplaint },
          { heading: "History of present illness", text: e.note.hpi },
          { heading: "Assessment", text: e.note.assessment },
          { heading: "Plan", text: e.note.plan },
        ]
      : []

  const documents: ChartDocument[] = [
    {
      id: "DOC-1",
      kind: "ccd",
      encounterId: "ENC-1",
      title: "Continuity of care document",
      format: "C-CDA",
      date: d(-DRAWS[3]),
      author: clinician,
      sourceId: "SRC-EPIC",
      sections: noteSections(encounters[0]),
    },
    {
      id: "DOC-2",
      kind: "lab",
      title: "Lab report, fasting panel",
      format: "PDF",
      date: d(-DRAWS[3] + 1),
      author: "Quest Diagnostics",
      sourceId: "SRC-QUEST",
      sections: labReports
        .filter((r) => r.date === d(-DRAWS[3]) && r.sourceId === "SRC-QUEST")
        .map((r) => ({
          heading: r.name,
          text: r.results
            .map(
              (x) =>
                `${x.name}: ${x.value} ${x.unit}${x.flag ? ` (${x.flag})` : ""}`
            )
            .join(". "),
        })),
    },
    {
      id: "DOC-3",
      kind: "visit-summary",
      encounterId: "ENC-3",
      title: "Visit summary",
      format: "C-CDA",
      date: d(-120),
      author: clinician,
      sourceId: "SRC-EPIC",
      sections: noteSections(encounters[2]),
    },
    {
      id: "DOC-4",
      kind: "visit-summary",
      encounterId: "ENC-4",
      title: "Visit summary",
      format: "C-CDA",
      date: d(-DRAWS[2]),
      author: clinician,
      sourceId: "SRC-EPIC",
      sections: noteSections(encounters[3]),
    },
    {
      id: "DOC-5",
      kind: "imaging",
      study: female ? "mammogram" : "calcium",
      title: imaging.report,
      format: "PDF",
      date: d(-299),
      author: "Dr. Priya Raman",
      sourceId: "SRC-IMG",
      sections: [
        { heading: "Exam", text: imaging.name },
        { heading: "Indication", text: "Routine screening." },
        { heading: "Impression", text: imaging.note },
      ],
    },
    {
      id: "DOC-6",
      kind: "colonoscopy",
      title: "Colonoscopy report",
      format: "PDF",
      date: d(-1100),
      author: "Dr. Marcus Lee",
      sourceId: "SRC-EPIC",
      sections: [
        { heading: "Procedure", text: "Colonoscopy with polypectomy." },
        {
          heading: "Findings",
          text: "Two 4 mm polyps in the sigmoid colon, removed.",
        },
        { heading: "Pathology", text: "Tubular adenomas, benign." },
        { heading: "Recommendation", text: "Repeat colonoscopy in 5 years." },
      ],
    },
    {
      id: "DOC-7",
      kind: "discharge",
      title: "Discharge summary",
      format: "C-CDA",
      date: d(-3299),
      author: "Dr. Hannah Ortiz",
      sourceId: "SRC-EPIC",
      sections: [
        { heading: "Admission reason", text: "Symptomatic gallstones." },
        { heading: "Procedure", text: "Laparoscopic cholecystectomy." },
        {
          heading: "Hospital course",
          text: "Uncomplicated. Discharged the next morning.",
        },
        {
          heading: "Discharge instructions",
          text: "No heavy lifting for two weeks. Follow up with surgery in 10 days.",
        },
      ],
    },
    {
      id: "DOC-8",
      kind: "imaging",
      study: "dexa",
      title: "DEXA bone density report",
      format: "PDF",
      date: d(-199),
      author: "Dr. Priya Raman",
      sourceId: "SRC-IMG",
      sections: [
        {
          heading: "Impression",
          text: "Osteopenia of the lumbar spine (T-score -1.6). Hips normal. 10 year major osteoporotic fracture risk 6.1%.",
        },
      ],
    },
    {
      id: "DOC-9",
      kind: "imaging",
      study: "chest",
      title: "Chest X-ray report",
      format: "PDF",
      date: d(-DRAWS[0] + 1),
      author: "Dr. Daniel Reyes",
      sourceId: "SRC-IMG",
      sections: [
        {
          heading: "Impression",
          text: "No acute cardiopulmonary abnormality.",
        },
      ],
    },
    {
      id: "DOC-10",
      kind: "imaging",
      study: "ultrasound",
      title: "Abdominal ultrasound report",
      format: "PDF",
      date: d(-365),
      author: "Dr. Daniel Reyes",
      sourceId: "SRC-IMG",
      sections: [
        {
          heading: "Impression",
          text: "Mild diffuse hepatic steatosis. Status post cholecystectomy. No biliary dilation.",
        },
      ],
    },
  ]

  return {
    ...base,
    lastSync: isoFromToday(0),
    sourceIds: ["SRC-EPIC", "SRC-QUEST", "SRC-LABCORP", "SRC-IMG"],
    biomarkers,
    allergies,
    conditions,
    medications,
    immunizations,
    procedures,
    vitals,
    encounters,
    labReports,
    studies,
    documents,
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

/* -------------------------------------------------------------------------- */
/*  Sync                                                                       */
/* -------------------------------------------------------------------------- */

/* Health Gorilla refreshes every record overnight; a provider can also ask
   for a sync from the chart. The last run is kept per patient for the
   session, with the state the record was left in. */

export type RecordSync = {
  /** The patient id. */
  id: string
  /** Local date and time, "2026-09-28T15:04". */
  at: string
  state: RecordState
}

export const recordSyncs = createCollection<RecordSync>(
  "hol-record-syncs",
  [],
  "v1"
)

/** The nightly run that stamps a record before anyone syncs it by hand. */
export const NIGHTLY_SYNC = "05:00"

/**
 * Where a patient's record stands without building it: the state the chart
 * opens in (after any sync by hand this session) and when it last synced.
 */
export function syncStatusFor(p: Patient, saved?: RecordSync) {
  const state = stateFor(p)
  if (state === "Awaiting consent") return { state, at: "" }
  const nightly = `${isoFromToday(state === "Source exception" ? -1 : 0)}T${NIGHTLY_SYNC}`
  return { state: saved?.state ?? state, at: saved?.at ?? nightly }
}
