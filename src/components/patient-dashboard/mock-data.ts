import {
  type HealthRecord,
  LOINC,
  PRACTICE_SOURCE,
  sourceName,
} from "@/components/practice/health-record"
import type { Patient } from "@/components/practice/practice-data"
import type {
  ControlMarker,
  DashboardData,
  LabResult,
} from "@/components/patient-dashboard/types"
import { MARCUS_CORE } from "@/components/patient-dashboard/optimization/mock-data"

/* The dashboard's sample data. Olivia Bennett (P10240) carries the full
   free-member case the build was specified against; every other patient's
   dashboard is read off their synced chart record, with nothing yet in the
   tracks the feed does not carry (orders, care gaps, intake), and no review
   on file, so it opens in validation mode. */

const QUEST = "Quest Diagnostics"
const UCSD = "UC San Diego Health (Epic)"
const SCRIPPS = "Scripps Health (Epic)"
const PRACTICE = "Practice EHR"

/** A lab reading from Quest, the practice's lab. */
const q = (date: string, value: number, flag?: "H" | "L") => ({
  date,
  value,
  flag,
  source: QUEST,
  isOutsideSource: false,
})

export const OLIVIA: DashboardData = {
  patientId: "P10240",
  practiceSource: PRACTICE,
  labs: [
    {
      code: "4548-4", name: "Hemoglobin A1c", unit: "%", refLow: 4, refHigh: 5.6, betterDirection: "lower",
      history: [q("2025-03-14", 5.6), q("2026-01-10", 5.8, "H"), q("2026-09-18", 6.1, "H")],
    },
    {
      code: "1558-6", name: "Fasting glucose", unit: "mg/dL", refLow: 70, refHigh: 99, betterDirection: "lower",
      history: [q("2025-03-14", 96), q("2026-01-10", 101, "H"), q("2026-09-18", 104, "H")],
    },
    {
      code: "27873-9", name: "Fasting insulin", unit: "uIU/mL", refLow: 2.6, refHigh: 24.9, betterDirection: "lower",
      history: [q("2026-09-18", 11.8)],
    },
    {
      code: "13457-7", name: "LDL-C", unit: "mg/dL", refHigh: 100, refText: "< 100", betterDirection: "lower",
      history: [q("2026-01-10", 152, "H"), q("2026-04-02", 131, "H"), q("2026-06-20", 138, "H")],
    },
    {
      code: "2571-8", name: "Triglycerides", unit: "mg/dL", refHigh: 150, refText: "< 150", betterDirection: "lower",
      history: [q("2026-01-10", 210, "H"), q("2026-04-02", 176, "H"), q("2026-06-20", 182, "H")],
    },
    {
      code: "2085-9", name: "HDL-C", unit: "mg/dL", refLow: 40, refText: "≥ 40", betterDirection: "higher",
      history: [q("2026-01-10", 44), q("2026-06-20", 47)],
    },
    {
      code: "2823-3", name: "Potassium", unit: "mmol/L", refLow: 3.5, refHigh: 5.1, betterDirection: "range",
      history: [
        q("2026-01-10", 4.3),
        q("2026-06-20", 4.4),
        { date: "2026-09-27", value: 5.8, flag: "H", source: UCSD, isOutsideSource: true },
      ],
    },
    {
      code: "1989-3", name: "Vitamin D, 25-OH", unit: "ng/mL", refLow: 30, refHigh: 100, betterDirection: "higher",
      history: [q("2026-01-10", 22, "L"), q("2026-06-20", 24, "L")],
    },
    {
      code: "33914-3", name: "eGFR", unit: "mL/min/1.73m²", refLow: 60, refText: "≥ 60", betterDirection: "higher",
      history: [q("2025-03-14", 78), q("2026-01-10", 71), q("2026-06-20", 66)],
    },
    {
      code: "3016-3", name: "TSH", unit: "mIU/L", refLow: 0.45, refHigh: 4.5, betterDirection: "range",
      history: [q("2025-03-14", 2.2), q("2026-01-10", 3.4), q("2026-06-20", 4.2)],
    },
    { code: "1742-6", name: "ALT", unit: "U/L", refLow: 7, refHigh: 45, betterDirection: "lower", history: [q("2026-06-20", 28)] },
    { code: "1920-8", name: "AST", unit: "U/L", refLow: 10, refHigh: 40, betterDirection: "lower", history: [q("2026-06-20", 24)] },
    { code: "2951-2", name: "Sodium", unit: "mmol/L", refLow: 135, refHigh: 145, betterDirection: "range", history: [q("2026-06-20", 139)] },
    { code: "2160-0", name: "Creatinine", unit: "mg/dL", refLow: 0.5, refHigh: 1.1, betterDirection: "lower", history: [q("2026-06-20", 0.98)] },
    { code: "718-7", name: "Hemoglobin", unit: "g/dL", refLow: 12, refHigh: 15.5, betterDirection: "range", history: [q("2026-06-20", 13.6)] },
  ],
  bp: [
    { date: "2026-01-10", systolic: 138, diastolic: 86, source: PRACTICE },
    { date: "2026-06-20", systolic: 142, diastolic: 88, source: PRACTICE },
    { date: "2026-09-27", systolic: 158, diastolic: 94, source: UCSD },
  ],
  conditions: [
    { name: "Prediabetes", icd10: "R73.03", since: "2026-01", source: PRACTICE, addedAt: "2026-01-01", controlMarker: "hba1c" },
    { name: "Hyperlipidemia", icd10: "E78.5", since: "2024-03", source: PRACTICE, addedAt: "2024-03-01", controlMarker: "ldl" },
    { name: "Hypertension", icd10: "I10", since: "2023-05", source: PRACTICE, addedAt: "2023-05-01", controlMarker: "bp" },
    { name: "Palpitations", icd10: "R00.2", since: "2026-09", source: UCSD, addedAt: "2026-09-27" },
  ],
  allergies: [{ substance: "Penicillin" }],
  medications: [
    { medication: "Atorvastatin", dose: "10 mg", sig: "1 tablet daily", frequency: "daily", prescriber: "Elise Harrington, MD", source: PRACTICE, date: "2026-03-02", isPracticeList: true },
    { medication: "Vitamin D3", dose: "2,000 IU", sig: "1 capsule daily", frequency: "daily", prescriber: "Elise Harrington, MD", source: PRACTICE, date: "2026-01-12", isPracticeList: true },
    { medication: "Cetirizine", dose: "10 mg", sig: "1 tablet daily", frequency: "daily", prescriber: "Elise Harrington, MD", source: PRACTICE, date: "2025-04-18", isPracticeList: true },
    { medication: "Atorvastatin", dose: "20 mg", sig: "daily", frequency: "daily", prescriber: "Dr. Alan Jones", source: SCRIPPS, date: "2026-09-10", isPracticeList: false },
    { medication: "Metoprolol tartrate", dose: "25 mg", sig: "twice daily", frequency: "twice daily", prescriber: "Dr. Kevin Park", source: UCSD, date: "2026-09-27", isPracticeList: false },
  ],
  answers: [
    { medication: "Atorvastatin", answer: "Taking differently", note: "20 mg since cardiology visit", date: "2026-09-30" },
    { medication: "Vitamin D3", answer: "Not taking", date: "2026-09-30" },
    { medication: "Cetirizine", answer: "Taking", date: "2026-09-30" },
    { medication: "Metoprolol tartrate", answer: "Taking", date: "2026-09-30" },
  ],
  orders: [
    {
      order: "Lipid panel", orderedBy: "Elise Harrington, MD", orderedAt: "2026-08-12", facility: QUEST,
      reminderDates: ["2026-08-26", "2026-09-09", "2026-09-23"], status: "open",
    },
    {
      order: "Holter monitor 48-hour", orderedBy: "Elise Harrington, MD", orderedAt: "2026-09-30",
      scheduledAt: "2026-10-08", facility: "Scripps Health", reminderDates: [], status: "open",
    },
  ],
  gaps: [
    { gap: "Screening mammogram", gapType: "Preventive", lastDone: "2024-07-15", due: "2025-07-15", remindersSent: 2, status: "open" },
    { gap: "Influenza vaccine 2026-27", gapType: "Preventive", lastDone: "2025-10-14", due: "2026-10-01", remindersSent: 0, status: "open" },
  ],
  encounters: [
    {
      event: "ED visit", facility: "UC San Diego Health Hillcrest", clinician: "Dr. Kevin Park", reason: "Palpitations",
      date: "2026-09-27", documents: ["C-CDA", "PDF"], reviewed: false, source: UCSD,
    },
    {
      event: "Specialist visit", facility: "Scripps Clinic Cardiology", clinician: "Dr. Alan Jones", reason: "Hyperlipidemia follow-up",
      date: "2026-09-10", documents: ["C-CDA"], reviewed: true, source: SCRIPPS,
    },
  ],
  reports: [
    {
      report: "ECG", finding: "Sinus tachycardia with frequent PVCs", date: "2026-09-27", source: UCSD,
      isOutsideSource: true, flag: "Abnormal", reviewed: false,
    },
    {
      report: "Chest X-ray", finding: "No acute findings", date: "2026-09-27", source: UCSD,
      isOutsideSource: true, flag: "Normal", reviewed: false,
    },
  ],
  intake: {
    completedAt: "2026-08-26",
    reason: "To keep up with my daughters on our weekend hikes",
    mattersMost: "Not ending up on insulin like her mother",
    focusFirst: "Blood sugar",
    reviewed: false,
  },
  reviewLog: [{ at: "2026-07-02T16:30:00", by: "Dr. Reyes", kind: "review" }],
}

const SAMPLES: Record<string, DashboardData> = { [OLIVIA.patientId]: OLIVIA, [MARCUS_CORE.patientId]: MARCUS_CORE }

/* ------------------------------------------------- derived from chart -- */

/** ICD-10 prefix to the marker that shows the condition's control. */
const MARKER_BY_CODE: [prefix: string, marker: ControlMarker][] = [
  ["R73", "hba1c"],
  ["E11", "hba1c"],
  ["E78", "ldl"],
  ["I10", "bp"],
  ["N18", "egfr"],
  ["E03", "tsh"],
  ["E05", "tsh"],
  ["E66", "weight"],
]

/** A patient's dashboard data read off their synced chart record. */
function fromRecord(patient: Patient, record: HealthRecord): DashboardData {
  const outside = (id: string) => id !== PRACTICE_SOURCE
  const source = (id: string) => (outside(id) ? sourceName(id) : PRACTICE)
  const labs: LabResult[] = record.biomarkers
    .filter((b) => b.panel !== "Vitals" && b.readings.length > 0)
    .map((b) => ({
      code: LOINC[b.id] ?? b.id,
      name: b.name,
      unit: b.unit,
      refLow: b.low,
      refHigh: b.high,
      betterDirection: b.better,
      history: b.readings.map((r) => ({
        date: r.date,
        value: r.value,
        source: source(r.sourceId),
        isOutsideSource: r.sourceId === "SRC-EPIC",
      })),
    }))
  return {
    patientId: patient.id,
    practiceSource: PRACTICE,
    labs,
    bp: record.vitals.map((v) => ({
      date: v.date,
      systolic: v.systolic,
      diastolic: v.diastolic,
      source: source(v.sourceId),
    })),
    conditions: record.conditions
      .filter((c) => c.status === "Active")
      .map((c) => ({
        name: c.name,
        icd10: c.code,
        since: c.onset.slice(0, 7),
        source: source(c.sourceId),
        addedAt: c.recorded,
        controlMarker: MARKER_BY_CODE.find(([p]) => c.code.startsWith(p))?.[1],
      })),
    allergies: record.allergies.filter((a) => a.status === "Active").map((a) => ({ substance: a.substance })),
    /* The synced medication list is the practice's own; with one list there
       is nothing to reconcile yet. */
    medications: record.medications
      .filter((m) => !m.ended)
      .map((m) => ({
        medication: m.name,
        dose: "",
        sig: m.sig,
        frequency: m.frequency,
        prescriber: m.prescriber,
        source: PRACTICE,
        date: m.started,
        isPracticeList: true,
      })),
    answers: [],
    orders: [],
    gaps: [],
    encounters: [],
    reports: [],
    reviewLog: patient.lastReviewAt ? [{ at: patient.lastReviewAt, by: "Dr. Reyes", kind: "review" }] : [],
  }
}

/** The dashboard's data for a patient. */
export function dashboardDataFor(patient: Patient, record: HealthRecord): DashboardData {
  return SAMPLES[patient.id] ?? fromRecord(patient, record)
}
