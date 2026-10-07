/* The patient dashboard's data: what the physician's one-page view of a
   patient reads. Dates are local ISO ("2026-09-27", or "2026-09-27T16:20");
   every day count and every "new" or "overdue" check measures from the mock
   clock (provider/mock-clock.ts). Statuses are never stored: the rules in
   rules.ts derive them, so editing a value here changes the page with it. */

export type LabFlag = "H" | "L" | "Critical"

export type LabReading = {
  date: string
  value: number
  flag?: LabFlag
  source: string
  isOutsideSource: boolean
  note?: string
  /** Set when the reading came in a different unit than the result's; such
      readings are not comparable and never share a line. */
  unit?: string
}

export type LabResult = {
  /** LOINC. */
  code: string
  name: string
  unit: string
  refLow?: number
  refHigh?: number
  /** The range as the lab printed it, "< 100". */
  refText?: string
  betterDirection: "lower" | "higher" | "range"
  /** Oldest first. */
  history: LabReading[]
}

export type ControlMarker = "hba1c" | "ldl" | "bp" | "egfr" | "tsh" | "weight"

export type DashCondition = {
  name: string
  icd10: string
  /** "2026-01": the month the condition dates from. */
  since: string
  source: string
  /** When the condition reached the record. */
  addedAt: string
  controlMarker?: ControlMarker
}

export type MedEntry = {
  medication: string
  dose: string
  /** The directions as written, "1 tablet daily". */
  sig: string
  /** How often, for the short form "10 mg daily". */
  frequency: string
  prescriber: string
  source: string
  date: string
  isPracticeList: boolean
}

export type MedAnswer = "Taking" | "Not taking" | "Taking differently"

export type PatientMedAnswer = {
  medication: string
  answer: MedAnswer
  note?: string
  date: string
}

export type ReconciliationState = {
  key: string
  status: "open" | "acknowledged" | "dismissed"
  dismissedValue?: string
  at?: string
  by?: string
}

export type TrackedOrder = {
  order: string
  orderedBy: string
  orderedAt: string
  dueAt?: string
  scheduledAt?: string
  completedAt?: string
  facility?: string
  reminderDates: string[]
  status: "open" | "closed"
  closeReason?: string
}

export type CareGap = {
  gap: string
  gapType: "Preventive" | "Clinical" | "Follow-up"
  lastDone?: string
  due: string
  remindersSent: number
  status: "open" | "closed"
}

export type DocumentKind = "C-CDA" | "PDF"

export type OutsideEncounter = {
  event: "ED visit" | "Admission" | "Discharge" | "Urgent care" | "Specialist visit"
  facility: string
  clinician?: string
  reason: string
  date: string
  documents: DocumentKind[]
  reviewed: boolean
  /** The system the encounter arrived from, for Record sources. */
  source: string
}

export type ClinicalReport = {
  report: string
  finding: string
  date: string
  source: string
  isOutsideSource: boolean
  flag: "Normal" | "Abnormal" | "Critical"
  redFlag?: "new_cancer" | "abnormal_ct_mri" | "abnormal_pathology"
  reviewed: boolean
  /** The finding in two or three words, for a Tier 1 row title ("mild OSA"). */
  short?: string
  /** The key values, "AHI 5.3 · O₂ nadir 85%", for a Tier 1 subline. */
  values?: string
  /** The key values as one clause for the brief, "AHI 5.3 with an O₂ nadir of 85%". */
  summary?: string
  /** How the brief names the report, "the home test"; defaults to its name. */
  inBrief?: string
  /** The source document's chip label, "Sleep study PDF". */
  documentLabel?: string
  /** Who uploaded it, when it did not arrive from a system. */
  uploader?: string
  /** The order that waits on this report, by its name. */
  orderRef?: string
}

/** The patient's own words from intake. Screening scores are not part of
    this product and are never carried here. */
export type Intake = {
  completedAt: string
  reason: string
  mattersMost: string
  focusFirst: string
  reviewed: boolean
}

export type VitalsBP = {
  date: string
  systolic: number
  diastolic: number
  source: string
}

export type ReviewLog = {
  at: string
  by: string
  kind: "validation" | "review"
}

/** Everything the dashboard reads for one patient. */
export type DashboardData = {
  patientId: string
  /** The practice's own EHR: the one source that is not "Outside". */
  practiceSource: string
  labs: LabResult[]
  bp: VitalsBP[]
  conditions: DashCondition[]
  allergies: { substance: string }[]
  medications: MedEntry[]
  answers: PatientMedAnswer[]
  orders: TrackedOrder[]
  gaps: CareGap[]
  encounters: OutsideEncounter[]
  reports: ClinicalReport[]
  intake?: Intake
  reviewLog: ReviewLog[]
  /** Local "2026-07-02T09:15" of the last visit at the practice, if any. */
  lastVisit?: string
  /** Local "2026-11-12T09:30" of the next booked visit, if any. */
  nextVisit?: string
}
