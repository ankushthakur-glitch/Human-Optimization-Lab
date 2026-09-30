"use client"

import { createCollection } from "@/components/practice/collection-store"
import type { ChartSection } from "@/components/provider/patient-chart"

/* The provider's work queue: what the Dashboard lists across the doctor's
   patients so they can clear it in one pass, instead of being sent push
   notifications (Dr. Blanchard, 28 Sep call). Orders and care gaps are not in
   the Health Gorilla feed yet but are in scope (client request, 28 Sep 2026),
   so this is sample data on the practice store. Every row names a sample
   patient whose chart is built, so each link lands on a real chart, and the
   biomarker values are the ones the chart Overview shows (chart-overview.tsx)
   so the two screens agree. */

/** The practice's own EHR. A result from anywhere else is the one thing the
    dashboard flags as unread. */
export const OWN_EHR = "Scripps Health (Epic)"

/* Dates are kept as days from today, so the queue stays current. */
function day(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayIso() {
  return day(0)
}

/** Whole days from one ISO date to another. */
export function daysBetween(from: string, to: string) {
  const ms =
    new Date(`${to}T12:00:00`).getTime() -
    new Date(`${from}T12:00:00`).getTime()
  return Math.round(ms / 86_400_000)
}

/** Where a row opens in the patient's chart. */
export type ChartLink = { section?: ChartSection; tab?: string }

/* ----------------------------------------------------------- results -- */

export type AbnormalResult = {
  id: string
  patientId: string
  test: string
  value: string
  unit: string
  flag: "high" | "low"
  source: string
  date: string
  /** Set on results from outside the practice's EHR until opened. */
  unread: boolean
}

const RESULTS: AbnormalResult[] = [
  { id: "AR1", patientId: "P10240", test: "Potassium", value: "5.6", unit: "mmol/L", flag: "high", source: "Quest Diagnostics", date: day(0), unread: true },
  { id: "AR2", patientId: "P10852", test: "eGFR", value: "58", unit: "mL/min", flag: "low", source: "Palomar Health", date: day(-1), unread: true },
  { id: "AR3", patientId: "P11464", test: "LDL particle number", value: "1215", unit: "nmol/L", flag: "high", source: "Function Health", date: day(-1), unread: true },
  { id: "AR4", patientId: "P10512", test: "Rheumatoid factor", value: "29", unit: "IU/mL", flag: "high", source: "Sharp HealthCare", date: day(-2), unread: true },
  { id: "AR5", patientId: "P10308", test: "hs-CRP", value: "2", unit: "mg/L", flag: "high", source: OWN_EHR, date: day(-1), unread: false },
  { id: "AR6", patientId: "P10699", test: "Omega-3 index", value: "4.6", unit: "%", flag: "low", source: OWN_EHR, date: day(-2), unread: false },
  { id: "AR7", patientId: "P10393", test: "DHEA-S", value: "17", unit: "mcg/dL", flag: "low", source: OWN_EHR, date: day(-3), unread: false },
]

export const abnormalResults = createCollection(
  "hol-provider-results",
  RESULTS,
  "v1"
)

/* ------------------------------------------------------------- queues -- */

export type QueueKey =
  | "medications"
  | "biomarkers"
  | "care-gaps"
  | "escalated"
  | "off-ranch"
  | "off-plan"

export type GapKind =
  | "Preventive"
  | "Uncontrolled condition"
  | "Missed follow-up"
  | "Order not completed"

export type QueueItem = {
  id: string
  queue: Exclude<QueueKey, "escalated">
  patientId: string
  /** What changed or is missing. */
  title: string
  /** Where it came from: a health system, the app, a lab. */
  source: string
  date: string
  kind?: GapKind
  link: ChartLink
}

const MEDS: ChartLink = { section: "medications" }
const LABS: ChartLink = { section: "labs" }
const VISITS: ChartLink = { section: "encounters" }
const VACCINES: ChartLink = { section: "vaccines" }
const OVERVIEW: ChartLink = {}

const med = (
  id: string,
  patientId: string,
  title: string,
  source: string,
  offset: number
): QueueItem => ({ id, queue: "medications", patientId, title, source, date: day(offset), link: MEDS })

const QUEUE: QueueItem[] = [
  /* Medication discrepancies: another health system's list against the doctor's. */
  med("MC01", "P10240", "Lisinopril 10 mg daily started, not on your list", "Sharp HealthCare", -1),
  med("MC02", "P10852", "Atorvastatin changed from 20 mg to 40 mg", "Scripps Clinic Cardiology", -1),
  med("MC03", "P11464", "Metformin 500 mg stopped at discharge", "Palomar Health", -2),
  med("MC04", "P10274", "Prednisone 20 mg taper added", "Sharp Rees-Stealy Urgent Care", -2),
  med("MC05", "P10325", "Amoxicillin 875 mg added for 10 days", "Sharp Rees-Stealy Urgent Care", -3),
  med("MC06", "P10359", "Sertraline 50 mg not on the outside list", "UC San Diego Health", -3),
  med("MC07", "P10376", "Apixaban 5 mg twice daily started", "Palomar Health", -3),
  med("MC08", "P10410", "Levothyroxine changed from 75 mcg to 88 mcg", "UC San Diego Health", -4),
  med("MC09", "P10427", "Albuterol inhaler added", "Sharp Rees-Stealy Urgent Care", -4),
  med("MC10", "P10461", "Omeprazole 40 mg missing from outside list", "Sharp HealthCare", -5),
  med("MC11", "P10478", "Losartan 50 mg started, lisinopril still on your list", "Scripps Clinic Cardiology", -5),
  med("MC12", "P10529", "Gabapentin 300 mg added", "Tri-City Medical Center", -6),
  med("MC13", "P10563", "Sumatriptan 50 mg added", "Kaiser Permanente San Diego", -6),
  med("MC14", "P10597", "Furosemide 20 mg started", "Palomar Health", -7),
  med("MC15", "P10614", "Tamsulosin 0.4 mg added", "UC San Diego Health", -8),

  /* Out of target biomarkers, with the chart Overview's values. */
  { id: "BM01", queue: "biomarkers", patientId: "P10240", title: "Potassium 5.6 mmol/L, target ≤5.2", source: "Quest Diagnostics", date: day(0), link: LABS },
  { id: "BM02", queue: "biomarkers", patientId: "P10852", title: "eGFR 58 mL/min, target ≥60", source: "Palomar Health", date: day(-1), link: LABS },
  { id: "BM03", queue: "biomarkers", patientId: "P11464", title: "LDL particle number 1215 nmol/L, target ≤1000", source: "Function Health", date: day(-1), link: LABS },
  { id: "BM04", queue: "biomarkers", patientId: "P10308", title: "hs-CRP 2 mg/L, target ≤1", source: OWN_EHR, date: day(-1), link: LABS },
  { id: "BM05", queue: "biomarkers", patientId: "P10699", title: "Omega-3 index 4.6%, target 8-12", source: OWN_EHR, date: day(-2), link: LABS },
  { id: "BM06", queue: "biomarkers", patientId: "P10393", title: "DHEA-S 17 mcg/dL, target ≥40", source: OWN_EHR, date: day(-3), link: LABS },
  { id: "BM07", queue: "biomarkers", patientId: "P10716", title: "Fasting glucose 103 mg/dL, target 75-95", source: "Quest Diagnostics", date: day(-4), link: LABS },
  { id: "BM08", queue: "biomarkers", patientId: "P10767", title: "Lipoprotein(a) 80 nmol/L, target <75", source: "Labcorp", date: day(-5), link: LABS },
  { id: "BM09", queue: "biomarkers", patientId: "P10512", title: "Rheumatoid factor 29 IU/mL, above range", source: "Sharp HealthCare", date: day(-2), link: LABS },

  /* Care gaps: preventive, uncontrolled, missed cadence, orders never done. */
  { id: "CG01", queue: "care-gaps", patientId: "P10648", kind: "Preventive", title: "Colonoscopy overdue since 2024", source: "Care guideline", date: day(-30), link: OVERVIEW },
  { id: "CG02", queue: "care-gaps", patientId: "P10784", kind: "Preventive", title: "Flu shot not given this season", source: "Care guideline", date: day(-14), link: VACCINES },
  { id: "CG03", queue: "care-gaps", patientId: "P11464", kind: "Uncontrolled condition", title: "LDL particle number above target on 2 panels", source: "Function Health", date: day(-1), link: LABS },
  { id: "CG04", queue: "care-gaps", patientId: "P10716", kind: "Uncontrolled condition", title: "Fasting glucose above target on 3 panels", source: "Quest Diagnostics", date: day(-4), link: LABS },
  { id: "CG05", queue: "care-gaps", patientId: "P10801", kind: "Missed follow-up", title: "Diabetes visit due every 3 months, last seen 5 months ago", source: "Care plan", date: day(-60), link: VISITS },
  { id: "CG06", queue: "care-gaps", patientId: "P10835", kind: "Missed follow-up", title: "Hypertension check due every 6 months, last seen 8 months ago", source: "Care plan", date: day(-65), link: VISITS },
  { id: "CG07", queue: "care-gaps", patientId: "P10886", kind: "Order not completed", title: "Urine albumin/creatinine ratio ordered, not collected", source: "Order", date: day(-50), link: LABS },
  { id: "CG08", queue: "care-gaps", patientId: "P10903", kind: "Order not completed", title: "DEXA scan ordered, not scheduled", source: "Order", date: day(-47), link: OVERVIEW },

  /* Off the ranch: care elsewhere the doctor was not told about. */
  { id: "OR01", queue: "off-ranch", patientId: "P10274", title: "Urgent care visit for sinusitis", source: "Sharp Rees-Stealy Urgent Care", date: day(-2), link: VISITS },
  { id: "OR02", queue: "off-ranch", patientId: "P11464", title: "Emergency visit for chest pain, discharged", source: "Palomar Health", date: day(-3), link: VISITS },
  { id: "OR03", queue: "off-ranch", patientId: "P10852", title: "Cardiology consult, statin dose raised", source: "Scripps Clinic Cardiology", date: day(-4), link: VISITS },
  { id: "OR04", queue: "off-ranch", patientId: "P10529", title: "Neurology visit for neuropathy", source: "Tri-City Medical Center", date: day(-6), link: VISITS },

  /* Off the plan: not following the shared care plan. */
  { id: "OP01", queue: "off-plan", patientId: "P10988", title: "Not taking atorvastatin, 0 of 14 check-ins", source: "Patient app", date: day(-1), link: MEDS },
  { id: "OP02", queue: "off-plan", patientId: "P11022", title: "Skipped repeat lipid panel", source: "Patient app", date: day(-3), link: LABS },
  { id: "OP03", queue: "off-plan", patientId: "P11039", title: "Stopped vitamin D, 3 of 14 check-ins", source: "Patient app", date: day(-4), link: MEDS },
  { id: "OP04", queue: "off-plan", patientId: "P10240", title: "Missed 2 of 3 strength sessions this week", source: "Patient app", date: day(-2), link: OVERVIEW },
  { id: "OP05", queue: "off-plan", patientId: "P11073", title: "Home BP readings not logged for 10 days", source: "Patient app", date: day(-10), link: { section: "vitals", tab: "trends" } },
]

export const workQueue = createCollection("hol-provider-queue", QUEUE, "v1")

/* -------------------------------------------------------- escalations -- */

/** An order's life cycle, in order. */
export const ORDER_STAGES = [
  "Ordered",
  "Patient notified",
  "Scheduled",
  "Performed",
  "Results received",
  "Reviewed",
  "Patient informed",
  "Closed",
] as const

export type OrderStage = (typeof ORDER_STAGES)[number]

/** The app reminds the patient about every 2 weeks, 3 times, then escalates. */
export const REMINDER_LIMIT = 3

export type Escalation = {
  id: string
  patientId: string
  item: string
  kind: "Order" | "Care gap"
  orderedAt: string
  /** A future order's clock starts on this date, not the order date. */
  startsAt?: string
  reminders: number
  stage: OrderStage
  link: ChartLink
}

const ESCALATIONS: Escalation[] = [
  { id: "ES1", patientId: "P10886", item: "Urine albumin/creatinine ratio", kind: "Order", orderedAt: day(-50), reminders: 3, stage: "Patient notified", link: LABS },
  { id: "ES2", patientId: "P10903", item: "DEXA scan", kind: "Order", orderedAt: day(-47), reminders: 3, stage: "Patient notified", link: OVERVIEW },
  { id: "ES3", patientId: "P10648", item: "Colonoscopy", kind: "Care gap", orderedAt: day(-62), reminders: 3, stage: "Scheduled", link: OVERVIEW },
  { id: "ES4", patientId: "P11124", item: "Repeat advanced lipid panel", kind: "Order", orderedAt: day(-90), startsAt: day(-44), reminders: 3, stage: "Ordered", link: LABS },
  { id: "ES5", patientId: "P11141", item: "Sleep medicine follow up", kind: "Order", orderedAt: day(-45), reminders: 3, stage: "Patient notified", link: VISITS },
]

export const escalations = createCollection(
  "hol-provider-escalations",
  ESCALATIONS,
  "v1"
)

/* -------------------------------------------------------- rule alerts -- */

export type RuleAlert = {
  id: string
  patientId: string
  rule: string
  reading: string
  /** When the patient was nudged in the app and took no action. */
  nudgedAt: string
  date: string
}

const ALERTS: RuleAlert[] = [
  { id: "RA1", patientId: "P11073", rule: "BP above 150/95 on 3 readings", reading: "162/98 mmHg", nudgedAt: day(-3), date: day(0) },
  { id: "RA2", patientId: "P10597", rule: "Weight up 3 lb or more in 2 days", reading: "+4.2 lb", nudgedAt: day(-2), date: day(0) },
  { id: "RA3", patientId: "P11158", rule: "Fasting glucose above 180 mg/dL on 2 readings", reading: "194 mg/dL", nudgedAt: day(-2), date: day(-1) },
  { id: "RA4", patientId: "P11175", rule: "Resting heart rate above 110 on 3 readings", reading: "116 bpm", nudgedAt: day(-4), date: day(-1) },
]

export const ruleAlerts = createCollection("hol-provider-alerts", ALERTS, "v1")

/* ------------------------------------------------------------- visits -- */

export type Visit = {
  id: string
  patientId: string
  date: string
  /** 24 hour clock, HH:MM. */
  time: string
  reason: string
}

export const VISITS_SEED: Visit[] = [
  { id: "V1", patientId: "P10240", date: day(0), time: "09:00", reason: "Quarterly optimization review" },
  { id: "V2", patientId: "P10852", date: day(0), time: "10:30", reason: "Kidney function follow up" },
  { id: "V3", patientId: "P11464", date: day(0), time: "13:15", reason: "Post emergency visit check" },
  { id: "V4", patientId: "P10801", date: day(0), time: "15:00", reason: "Diabetes follow up" },
  { id: "V5", patientId: "P10308", date: day(1), time: "08:30", reason: "Annual physical" },
  { id: "V6", patientId: "P10716", date: day(1), time: "11:00", reason: "Glucose review" },
  { id: "V7", patientId: "P10988", date: day(2), time: "14:30", reason: "Medication adherence visit" },
]

/* ------------------------------------------------------------ history -- */

/** Patients in each queue at the end of each of the last 8 weeks, oldest
    first. The dashboard swaps the last week for the live count. */
export const QUEUE_TREND: Record<QueueKey, number[]> = {
  medications: [9, 11, 10, 12, 13, 12, 11, 15],
  biomarkers: [12, 11, 11, 10, 10, 9, 10, 9],
  "care-gaps": [14, 13, 12, 12, 11, 10, 9, 8],
  escalated: [2, 3, 3, 4, 3, 4, 3, 5],
  "off-ranch": [1, 2, 1, 3, 2, 2, 2, 4],
  "off-plan": [7, 7, 6, 6, 6, 5, 6, 5],
}
