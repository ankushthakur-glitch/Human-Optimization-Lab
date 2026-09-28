/* The sample health record the prototype "pulls" once the patient signs the
   authorization. It follows what Health Gorilla's Patient360 retrieve returns
   (the "Health Gorilla: Networks, EHRs and Data Access" sheet in the client
   Drive): the national networks it searches, the organisations it finds, and
   the FHIR resources it brings back, normalised and de-duplicated.
   Invented values for the sample patient, never a real person's. */

/** Searched in this order while the record builds. */
export const NETWORKS = [
  { name: "Carequality", reaches: "Epic, athenahealth, eClinicalWorks" },
  { name: "CommonWell", reaches: "Oracle Health, MEDITECH, Veradigm" },
  { name: "eHealth Exchange", reaches: "Regional HIEs, VA, DoD" },
  { name: "TEFCA", reaches: "Epic Nexus, Kno2, KONZA" },
  { name: "Lab network", reaches: "Quest Diagnostics, Labcorp" },
] as const

/** Where records were found: the organisation and the system it runs. */
export const SOURCES = [
  { name: "Harborview Longevity Clinic", kind: "clinic", label: "Your clinic", system: "athenahealth", network: "Carequality" },
  { name: "Scripps Memorial Hospital", kind: "hospital", label: "Hospital", system: "Epic", network: "TEFCA" },
  { name: "Quest Diagnostics", kind: "lab", label: "Lab", system: "Lab results", network: "Lab network" },
] as const

/** One row per FHIR resource the retrieve reads, with what came back. */
export const DATA_TYPES = [
  { key: "Encounter", icon: "visits", label: "Visits", count: 14 },
  { key: "Condition", icon: "conditions", label: "Conditions", count: 5 },
  { key: "MedicationStatement", icon: "medications", label: "Medications", count: 6 },
  { key: "AllergyIntolerance", icon: "allergies", label: "Allergies", count: 2 },
  { key: "Observation.lab", icon: "labs", label: "Lab results", count: 86 },
  { key: "Observation.vital", icon: "vitals", label: "Vitals", count: 32 },
  { key: "Procedure", icon: "procedures", label: "Procedures", count: 3 },
  { key: "Immunization", icon: "immunizations", label: "Immunizations", count: 9 },
  { key: "DocumentReference", icon: "documents", label: "Documents", count: 11 },
] as const

export type Flag = "high" | "low"

/** Out of range results and problem list entries: what the program engine
    reads to recommend programs. */
export type Finding = {
  id: string
  name: string
  value: string
  range: string
  flag: Flag
  /** A lab result or a vital taken at a visit. */
  kind: "lab" | "vital"
  source: string
  date: string
}

export const FINDINGS: Finding[] = [
  {
    id: "bmi",
    kind: "vital",
    name: "Body mass index",
    value: "32.4 kg/m²",
    range: "18.5 to 24.9",
    flag: "high",
    source: "Harborview",
    date: "Aug 12, 2026",
  },
  {
    id: "ldl",
    kind: "lab",
    name: "LDL cholesterol",
    value: "162 mg/dL",
    range: "Below 100",
    flag: "high",
    source: "Quest",
    date: "Aug 14, 2026",
  },
  {
    id: "a1c",
    kind: "lab",
    name: "Hemoglobin A1c",
    value: "5.9 %",
    range: "Below 5.7",
    flag: "high",
    source: "Quest",
    date: "Aug 14, 2026",
  },
  {
    id: "bp",
    kind: "vital",
    name: "Blood pressure",
    value: "134/86 mmHg",
    range: "Below 120/80",
    flag: "high",
    source: "Harborview",
    date: "Aug 12, 2026",
  },
  {
    id: "tg",
    kind: "lab",
    name: "Triglycerides",
    value: "188 mg/dL",
    range: "Below 150",
    flag: "high",
    source: "Quest",
    date: "Aug 14, 2026",
  },
  {
    id: "vitd",
    kind: "lab",
    name: "Vitamin D, 25 hydroxy",
    value: "21 ng/mL",
    range: "30 to 100",
    flag: "low",
    source: "Quest",
    date: "Aug 14, 2026",
  },
]

/** On the problem list from the EHR (ICD-10). */
export const CONDITIONS = [
  { name: "Obesity, class 1", code: "E66.811" },
  { name: "Prediabetes", code: "R73.03" },
  { name: "Hyperlipidemia", code: "E78.5" },
  { name: "Elevated blood pressure", code: "R03.0" },
  { name: "Seasonal allergic rhinitis", code: "J30.2" },
] as const

/** The latest lab panel in the record, the home screen's lead card. */
export const LATEST_LABS = { source: "Quest Diagnostics", date: "Aug 14, 2026" } as const

/** HOL's score for the record, out of 100. A stand in until HOL's clinical
    team sets the formula. */
export const HOL_SCORE = 71

/** Lab results in range: every lab the record holds less the flagged ones. */
export const LABS_IN_RANGE = {
  inRange: DATA_TYPES.find((t) => t.key === "Observation.lab")!.count - FINDINGS.filter((f) => f.kind === "lab").length,
  total: DATA_TYPES.find((t) => t.key === "Observation.lab")!.count,
}

export type BodySystem = "thyroid" | "heart" | "metabolism"

/** The body map on home: each system glows teal when its results are in
    range and amber when one of them is flagged. */
export const SYSTEMS: { id: BodySystem; name: string; findings: string[] }[] = [
  { id: "thyroid", name: "Thyroid", findings: [] },
  { id: "heart", name: "Heart", findings: ["ldl", "tg", "bp"] },
  { id: "metabolism", name: "Metabolism", findings: ["a1c", "bmi"] },
]

export const systemWatch = (id: BodySystem) =>
  FINDINGS.some((f) => SYSTEMS.find((s) => s.id === id)!.findings.includes(f.id))
