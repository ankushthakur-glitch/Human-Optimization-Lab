"use client"

import { createCollection } from "@/components/practice/collection-store"
import type {
  PanelRecordState,
  Patient,
} from "@/components/practice/practice-data"
import {
  LAST_VISIT,
  NOW,
  daysFromNow,
  daysSince,
  ms,
} from "@/components/provider/mock-clock"

/* The provider dashboard's work queue: every item that needs the physician,
   by kind of action, across their panel. Items carry the inputs the rules
   read (source, flag, red flag, event, reminders), never a stored priority,
   so editing the sample data changes every count, badge and row with it.
   Orders and care gaps are not in the Health Gorilla feed yet but are in
   scope (client request, 28 Sep 2026), so this is sample data. */

export type Priority = "urgent" | "high" | "routine"
export type ItemType =
  | "abnormal_result"
  | "medication_change"
  | "overdue_order"
  | "outside_care"
  | "care_gap"
  | "review_due"

export type DocKind = "C-CDA" | "PDF"

export type AbnormalResult = {
  kind: "lab" | "report"
  name: string
  value?: string
  unit?: string
  flag: "H" | "L" | "Critical" | "Abnormal"
  /** As printed, e.g. "3.5-5.1". */
  range?: string
  refLow?: number
  refHigh?: number
  previous?: string
  resultedAt: string
  history?: { date: string; value: number; source: string }[]
  redFlag?: "new_cancer" | "abnormal_ct_mri" | "abnormal_pathology"
  /** Reports: the one-line finding and the full conclusion. */
  finding?: string
  /** Reports: the one-line context under the headline in compact rows. */
  brief?: string
  conclusion?: string
  documents?: DocKind[]
}

export type MedicationChangeKind =
  | "dose"
  | "not_on_list"
  | "stopped"
  | "not_taking"
  | "taking_differently"

export type MedicationChange = {
  medication: string
  change: MedicationChangeKind
  practiceEntry?: string
  otherEntry?: string
  /** The dose part of each entry, for the diff. */
  fromDose?: string
  toDose?: string
  changedBy?: string
  patientSays?: "Taking" | "Not taking" | "Taking differently" | "No answer"
  patientNote?: string
  date: string
}

export type OverdueOrder = {
  order: string
  orderedBy: string
  orderedAt: string
  scheduledAt?: string
  stage: "not_scheduled" | "scheduled_not_completed"
  remindersSent: number
  remindersMax: 3
  reminderDates: string[]
  facility?: string
}

export type OutsideCare = {
  event: "ED visit" | "Admission" | "Discharge" | "Urgent care" | "Specialist visit"
  facility: string
  reason: string
  /** The reason in the few words a sentence uses ("pneumonia"). */
  shortReason?: string
  date: string
  clinician?: string
  admittedAt?: string
  dischargedAt?: string
  documents?: DocKind[]
}

export type CareGap = {
  gap: string
  gapType: "Preventive" | "Clinical" | "Follow-up"
  lastDone?: string
  due: string
  remindersSent: number
}

export type ReviewDue = {
  review:
    | "Initial record validation"
    | "Quarterly review"
    | "Intake summary"
  due: string
  lastReview?: string
  /** Intake summaries: PHQ-9 item 9 answered above zero. */
  phq9Item9Positive?: boolean
}

type Base = {
  id: string
  patientId: string
  /** Local ISO date-time; drives "new" and the sort. */
  createdAt: string
  source: string
  isOutsideSource: boolean
  status: "open" | "reviewed" | "dismissed" | "closed"
  closeReason?: CloseReason
  /** Postponed items leave the queue until this date. */
  snoozedUntil?: string
}

export type WorkItem = Base &
  (
    | { type: "abnormal_result"; payload: AbnormalResult }
    | { type: "medication_change"; payload: MedicationChange }
    | { type: "overdue_order"; payload: OverdueOrder }
    | { type: "outside_care"; payload: OutsideCare }
    | { type: "care_gap"; payload: CareGap }
    | { type: "review_due"; payload: ReviewDue }
  )

export type CloseReason = "Completed elsewhere" | "No longer needed" | "Patient declined"
export const CLOSE_REASONS: CloseReason[] = [
  "Completed elsewhere",
  "No longer needed",
  "Patient declined",
]

/* ------------------------------------------------------------ sample -- */

const PRACTICE_EHR = "Practice EHR"
const open = { status: "open" as const }

const SEED: WorkItem[] = [
  {
    id: "W01", type: "abnormal_result", patientId: "P10240", ...open,
    createdAt: "2026-09-27T16:20", source: "UC San Diego Health (Epic)", isOutsideSource: true,
    payload: {
      kind: "lab", name: "Potassium", value: "5.8", unit: "mmol/L", flag: "H",
      range: "3.5-5.1", refLow: 3.5, refHigh: 5.1, previous: "4.4", resultedAt: "2026-09-27",
      history: [
        { date: "2026-01-10", value: 4.3, source: "Quest Diagnostics" },
        { date: "2026-06-20", value: 4.4, source: "Quest Diagnostics" },
        { date: "2026-09-27", value: 5.8, source: "UC San Diego Health (Epic)" },
      ],
    },
  },
  {
    id: "W02", type: "abnormal_result", patientId: "P10422", ...open,
    createdAt: "2026-10-02T21:40", source: "Scripps Health (Epic)", isOutsideSource: true,
    payload: {
      kind: "report", name: "Mammogram", value: "BI-RADS 4", flag: "Abnormal", resultedAt: "2026-10-02",
      redFlag: "abnormal_ct_mri",
      finding: "BI-RADS 4: suspicious abnormality, biopsy should be considered",
      brief: "Suspicious abnormality",
      conclusion:
        "Diagnostic mammogram of the left breast. An irregular 9 mm mass with indistinct margins at 2 o'clock, 6 cm from the nipple, not seen on the prior study of 09/14/2025. BI-RADS 4: suspicious abnormality. Ultrasound-guided core biopsy is recommended.",
      documents: ["C-CDA", "PDF"],
    },
  },
  {
    id: "W03", type: "abnormal_result", patientId: "P10411", ...open,
    createdAt: "2026-10-01T11:05", source: "Quest Diagnostics", isOutsideSource: false,
    payload: {
      kind: "lab", name: "Hemoglobin A1c", value: "7.6", unit: "%", flag: "H",
      range: "4.0-5.6", refLow: 4, refHigh: 5.6, previous: "7.1", resultedAt: "2026-10-01",
      history: [
        { date: "2025-05-12", value: 6.6, source: "Quest Diagnostics" },
        { date: "2025-11-14", value: 6.9, source: "Quest Diagnostics" },
        { date: "2026-05-20", value: 7.1, source: "Quest Diagnostics" },
        { date: "2026-10-01", value: 7.6, source: "Quest Diagnostics" },
      ],
    },
  },
  {
    id: "W04", type: "abnormal_result", patientId: "P10433", ...open,
    createdAt: "2026-10-02T14:05", source: PRACTICE_EHR, isOutsideSource: false,
    payload: {
      kind: "lab", name: "eGFR", value: "41", unit: "mL/min/1.73m²", flag: "L",
      range: "≥60", refLow: 60, previous: "48", resultedAt: "2026-10-02",
      history: [
        { date: "2025-04-02", value: 56, source: PRACTICE_EHR },
        { date: "2025-10-08", value: 52, source: PRACTICE_EHR },
        { date: "2026-04-15", value: 48, source: PRACTICE_EHR },
        { date: "2026-10-02", value: 41, source: PRACTICE_EHR },
      ],
    },
  },
  {
    id: "W05", type: "abnormal_result", patientId: "P10240", ...open,
    createdAt: "2026-09-18T10:30", source: "Quest Diagnostics", isOutsideSource: false,
    payload: {
      kind: "lab", name: "Hemoglobin A1c", value: "6.1", unit: "%", flag: "H",
      range: "4.0-5.6", refLow: 4, refHigh: 5.6, previous: "5.8", resultedAt: "2026-09-18",
      history: [
        { date: "2025-03-14", value: 5.6, source: "Quest Diagnostics" },
        { date: "2025-09-18", value: 5.7, source: "Quest Diagnostics" },
        { date: "2026-03-20", value: 5.8, source: "Quest Diagnostics" },
        { date: "2026-09-18", value: 6.1, source: "Quest Diagnostics" },
      ],
    },
  },
  {
    id: "W06", type: "abnormal_result", patientId: "P10318", status: "reviewed",
    createdAt: "2026-08-05T09:15", source: PRACTICE_EHR, isOutsideSource: false,
    payload: {
      kind: "lab", name: "Lipoprotein(a)", value: "80", unit: "nmol/L", flag: "H",
      range: "<75", refHigh: 75, previous: "76", resultedAt: "2026-08-05",
      history: [
        { date: "2025-08-04", value: 76, source: PRACTICE_EHR },
        { date: "2026-08-05", value: 80, source: PRACTICE_EHR },
      ],
    },
  },
  {
    id: "W07", type: "medication_change", patientId: "P10240", ...open,
    createdAt: "2026-09-10T13:00", source: "Scripps Health (Epic)", isOutsideSource: true,
    payload: {
      medication: "Atorvastatin", change: "dose",
      practiceEntry: "Atorvastatin 10 mg daily", otherEntry: "Atorvastatin 20 mg daily",
      fromDose: "10 mg daily", toDose: "20 mg daily", changedBy: "Dr. Alan Jones",
      patientSays: "Taking", date: "2026-09-10",
    },
  },
  {
    id: "W08", type: "medication_change", patientId: "P10240", ...open,
    createdAt: "2026-09-27T17:45", source: "UC San Diego Health (Epic)", isOutsideSource: true,
    payload: {
      medication: "Metoprolol tartrate", change: "not_on_list",
      otherEntry: "Metoprolol tartrate 25 mg twice daily", changedBy: "Dr. Kevin Park",
      patientSays: "Taking", date: "2026-09-27",
    },
  },
  {
    id: "W09", type: "medication_change", patientId: "P10240", ...open,
    createdAt: "2026-09-30T08:20", source: "Patient (Inlay app)", isOutsideSource: true,
    payload: {
      medication: "Vitamin D3", change: "not_taking",
      practiceEntry: "Vitamin D3 2,000 IU daily",
      patientSays: "Not taking", date: "2026-09-30",
    },
  },
  {
    id: "W10", type: "medication_change", patientId: "P10318", ...open,
    createdAt: "2025-10-25T12:00", source: "Henry Ford Health (Epic)", isOutsideSource: true,
    payload: {
      medication: "Atorvastatin", change: "dose",
      practiceEntry: "Atorvastatin 10 mg daily", otherEntry: "Atorvastatin 15 mg daily",
      fromDose: "10 mg daily", toDose: "15 mg daily", changedBy: "Dr. Jones",
      patientSays: "No answer", date: "2025-10-25",
    },
  },
  {
    id: "W11", type: "medication_change", patientId: "P10318", ...open,
    createdAt: "2026-09-15T19:10", source: "Patient (Inlay app)", isOutsideSource: true,
    payload: {
      medication: "Tadalafil", change: "taking_differently",
      practiceEntry: "Tadalafil 5 mg as needed",
      patientSays: "Taking differently", patientNote: "Daily at midday", date: "2026-09-15",
    },
  },
  {
    id: "W12", type: "medication_change", patientId: "P10477", ...open,
    createdAt: "2026-10-02T19:30", source: "Henry Ford Health (Epic)", isOutsideSource: true,
    payload: {
      medication: "Warfarin", change: "stopped",
      practiceEntry: "Warfarin 5 mg daily", otherEntry: "Warfarin: stopped",
      changedBy: "Dr. Maria Silva", patientSays: "No answer", date: "2026-10-02",
    },
  },
  {
    id: "W13", type: "overdue_order", patientId: "P10240", ...open,
    createdAt: "2026-09-23T07:00", source: PRACTICE_EHR, isOutsideSource: false,
    payload: {
      order: "Lipid panel", orderedBy: "Elise Harrington, MD", orderedAt: "2026-08-12",
      stage: "not_scheduled", remindersSent: 3, remindersMax: 3,
      reminderDates: ["2026-08-26", "2026-09-09", "2026-09-23"],
      facility: "Quest Diagnostics",
    },
  },
  {
    id: "W14", type: "overdue_order", patientId: "P10318", ...open,
    createdAt: "2026-07-22T07:00", source: PRACTICE_EHR, isOutsideSource: false,
    payload: {
      order: "Sleep medicine referral", orderedBy: "Daniel Reyes, MD", orderedAt: "2026-06-10",
      stage: "not_scheduled", remindersSent: 3, remindersMax: 3,
      reminderDates: ["2026-06-24", "2026-07-08", "2026-07-22"],
      facility: "Corewell Health",
    },
  },
  {
    id: "W15", type: "overdue_order", patientId: "P10433", ...open,
    createdAt: "2026-09-17T07:00", source: PRACTICE_EHR, isOutsideSource: false,
    payload: {
      order: "CT chest follow-up (nodule)", orderedBy: "Daniel Reyes, MD", orderedAt: "2026-07-15",
      scheduledAt: "2026-08-20", stage: "scheduled_not_completed",
      remindersSent: 3, remindersMax: 3,
      reminderDates: ["2026-09-03", "2026-09-10", "2026-09-17"],
      facility: "Henry Ford Health",
    },
  },
  {
    id: "W16", type: "outside_care", patientId: "P10240", ...open,
    createdAt: "2026-09-27T16:00", source: "UC San Diego Health (Epic)", isOutsideSource: true,
    payload: {
      event: "ED visit", facility: "UC San Diego Health Hillcrest", reason: "Palpitations",
      shortReason: "palpitations", date: "2026-09-27", clinician: "Dr. Priya Raman", documents: ["C-CDA", "PDF"],
    },
  },
  {
    id: "W17", type: "outside_care", patientId: "P10477", ...open,
    createdAt: "2026-10-01T06:40", source: "ADT feed", isOutsideSource: true,
    payload: {
      event: "Admission", facility: "Henry Ford Hospital", reason: "Community-acquired pneumonia",
      shortReason: "pneumonia", date: "2026-10-01", admittedAt: "2026-10-01", clinician: "Dr. Maria Silva",
      documents: ["C-CDA"],
    },
  },
  {
    id: "W18", type: "outside_care", patientId: "P10444", ...open,
    createdAt: "2026-09-29T15:10", source: "Encounter", isOutsideSource: true,
    payload: {
      event: "Urgent care", facility: "MinuteClinic", reason: "Sinusitis",
      date: "2026-09-29", documents: ["PDF"],
    },
  },
  {
    id: "W19", type: "care_gap", patientId: "P10240", ...open,
    createdAt: "2025-07-15T07:00", source: "Rules", isOutsideSource: false,
    payload: { gap: "Screening mammogram", gapType: "Preventive", lastDone: "2024-07-15", due: "2025-07-15", remindersSent: 2 },
  },
  {
    id: "W20", type: "care_gap", patientId: "P10411", ...open,
    createdAt: "2026-08-20T07:00", source: "Rules", isOutsideSource: false,
    payload: { gap: "Diabetes follow-up visit", gapType: "Follow-up", lastDone: "2026-05-20", due: "2026-08-20", remindersSent: 1 },
  },
  {
    id: "W21", type: "care_gap", patientId: "P10411", ...open,
    createdAt: "2026-10-01T11:10", source: "Rules", isOutsideSource: false,
    payload: { gap: "HbA1c over 7 and no visit in 3 months", gapType: "Clinical", lastDone: "2026-05-20", due: "2026-10-01", remindersSent: 0 },
  },
  {
    id: "W22", type: "care_gap", patientId: "P10455", ...open,
    createdAt: "2026-10-01T07:00", source: "Rules", isOutsideSource: false,
    payload: { gap: "Influenza vaccine 2026-27", gapType: "Preventive", lastDone: "2025-10-12", due: "2026-10-01", remindersSent: 0 },
  },
  {
    id: "W23", type: "review_due", patientId: "P10318", ...open,
    createdAt: "2026-09-28T07:00", source: "Rules", isOutsideSource: false,
    payload: { review: "Quarterly review", due: "2026-10-12", lastReview: "2026-08-12" },
  },
  {
    id: "W25", type: "review_due", patientId: "P10455", ...open,
    createdAt: "2026-10-02T22:20", source: "AI intake", isOutsideSource: false,
    payload: { review: "Intake summary", due: "2026-10-05", phq9Item9Positive: false },
  },
  {
    id: "W26", type: "review_due", patientId: "P10411", ...open,
    createdAt: "2026-10-02T23:50", source: "Record", isOutsideSource: false,
    payload: { review: "Initial record validation", due: "2026-10-03" },
  },
  {
    id: "W27", type: "abnormal_result", patientId: "P10240", ...open,
    createdAt: "2026-09-27T16:10", source: "UC San Diego Health (Epic)", isOutsideSource: true,
    payload: {
      kind: "report", name: "ECG", flag: "Abnormal", resultedAt: "2026-09-27",
      finding: "Sinus tachycardia with frequent PVCs",
      conclusion:
        "12-lead ECG. Sinus tachycardia at 112 bpm with frequent unifocal premature ventricular complexes. Normal axis. QTc 438 ms. No acute ST changes. Compared with 03/20/2026: rate higher, PVCs new.",
      documents: ["C-CDA", "PDF"],
    },
  },
  {
    id: "W28", type: "care_gap", patientId: "P10240", ...open,
    createdAt: "2026-10-01T07:00", source: "Rules", isOutsideSource: false,
    payload: { gap: "Influenza vaccine 2026-27", gapType: "Preventive", lastDone: "2025-10-14", due: "2026-10-01", remindersSent: 0 },
  },
  {
    id: "W29", type: "abnormal_result", patientId: "P10318", ...open,
    createdAt: "2026-06-04T09:00", source: "Home sleep test (uploaded)", isOutsideSource: true,
    payload: {
      kind: "report", name: "Home sleep apnea test", flag: "Abnormal", resultedAt: "2026-06-04",
      finding: "Mild obstructive sleep apnea; AHI 5.3; O₂ nadir 85%",
      brief: "Mild OSA · AHI 5.3 · O₂ nadir 85%",
      conclusion:
        "Type III home sleep apnea test, one night, 6 h 48 min of monitoring. AHI 5.3 events per hour, mostly supine. Oxygen nadir 85%, 4 min below 88%. Findings consistent with mild obstructive sleep apnea.",
      documents: ["PDF"],
    },
  },
  {
    id: "W30", type: "care_gap", patientId: "P10318", ...open,
    createdAt: "2026-10-01T07:00", source: "Rules", isOutsideSource: false,
    payload: { gap: "Influenza vaccine 2026-27", gapType: "Preventive", lastDone: "2025-10-10", due: "2026-10-01", remindersSent: 0 },
  },
]

export const workItems = createCollection("hol-provider-work-items", SEED, "v2")

/* ------------------------------------------------------------- audit -- */

export type AuditEntry = {
  id: string
  user: string
  action: string
  itemId: string
  /** Real time the action was taken. */
  at: string
}

export const auditLog = createCollection<AuditEntry>("hol-provider-audit", [], "v1")

export function audit(user: string, action: string, itemId: string) {
  const at = new Date().toISOString()
  auditLog.add([{ id: `A${Date.now()}${itemId}`, user, action, itemId, at }])
}

/* ------------------------------------------------------------- rules -- */

export const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, routine: 2 }

export function priorityOf(item: WorkItem): Priority {
  switch (item.type) {
    case "abnormal_result":
      return item.isOutsideSource || item.payload.flag === "Critical" || item.payload.redFlag
        ? "urgent"
        : "high"
    case "medication_change":
    case "overdue_order":
      return "high"
    case "outside_care":
      return item.payload.event === "ED visit" || item.payload.event === "Admission"
        ? "high"
        : "routine"
    case "care_gap":
      return "routine"
    case "review_due":
      return item.payload.review === "Intake summary" && item.payload.phq9Item9Positive
        ? "urgent"
        : "routine"
  }
}

export function isNew(item: WorkItem) {
  return ms(item.createdAt) > ms(LAST_VISIT)
}

/** Days on an overdue order's clock: since ordered, or since the missed date. */
export function orderDay(o: OverdueOrder) {
  return daysSince(o.stage === "not_scheduled" ? o.orderedAt : (o.scheduledAt ?? o.orderedAt))
}

/** The day an order escalates to the physician. */
export function escalateAt(o: OverdueOrder) {
  return o.stage === "not_scheduled" ? 42 : 28
}

/** An order reaches the physician only once all reminders are spent. */
export function isEscalated(o: OverdueOrder) {
  return o.remindersSent >= o.remindersMax && orderDay(o) >= escalateAt(o)
}

/** Open, not postponed, and (for orders) escalated. */
export function isOpen(item: WorkItem) {
  if (item.status !== "open") return false
  if (item.snoozedUntil && ms(item.snoozedUntil) > ms(NOW)) return false
  if (item.type === "overdue_order" && !isEscalated(item.payload)) return false
  return true
}

export type Ranked = WorkItem & { priority: Priority; isNew: boolean }

export function rank(item: WorkItem): Ranked {
  return { ...item, priority: priorityOf(item), isNew: isNew(item) }
}

/** Urgent, then high, then routine; newest first within each. */
export function byPriority(a: Ranked, b: Ranked) {
  return (
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    ms(b.createdAt) - ms(a.createdAt)
  )
}

/* ------------------------------------------------------------- scope -- */

export type Scope = "mine" | "all"

/** The dashboard's panel: patients carrying record fields (practice-data). */
export function panelOf(patients: Patient[], scope: Scope, providerId: string) {
  return patients.filter(
    (p) => p.recordState && (scope === "all" || p.providerId === providerId)
  )
}

/** Open items for patients in scope, ranked and sorted. */
export function openItems(items: WorkItem[], panel: Patient[]) {
  const ids = new Set(panel.map((p) => p.id))
  return items
    .filter((i) => ids.has(i.patientId) && isOpen(i))
    .map(rank)
    .sort(byPriority)
}

/* ------------------------------------------------------------- tiles -- */

export const TYPES: { type: ItemType; label: string }[] = [
  { type: "abnormal_result", label: "Abnormal results" },
  { type: "medication_change", label: "Medication changes" },
  { type: "overdue_order", label: "Overdue orders" },
  { type: "outside_care", label: "Outside care" },
  { type: "care_gap", label: "Care gaps" },
  { type: "review_due", label: "Reviews due" },
]

export type TileStats = {
  type: ItemType
  label: string
  count: number
  urgent: number
  high: number
  routine: number
  fresh: number
}

export function tileStats(open: Ranked[]): TileStats[] {
  return TYPES.map(({ type, label }) => {
    const rows = open.filter((i) => i.type === type)
    const n = (p: Priority) => rows.filter((i) => i.priority === p).length
    return {
      type,
      label,
      count: rows.length,
      urgent: n("urgent"),
      high: n("high"),
      routine: n("routine"),
      fresh: rows.filter((i) => i.isNew).length,
    }
  })
}

/* -------------------------------------------------------- by patient -- */

export type PatientGroup = {
  patientId: string
  items: Ranked[]
  top: Priority
  pressing: number
  since: string
  byType: Partial<Record<ItemType, number>>
}

export function groupByPatient(open: Ranked[]): PatientGroup[] {
  const map = new Map<string, Ranked[]>()
  for (const item of open) map.set(item.patientId, [...(map.get(item.patientId) ?? []), item])
  return [...map.entries()]
    .map(([patientId, items]) => {
      const byType: PatientGroup["byType"] = {}
      for (const i of items) byType[i.type] = (byType[i.type] ?? 0) + 1
      return {
        patientId,
        items,
        top: items.reduce<Priority>(
          (top, i) => (PRIORITY_RANK[i.priority] < PRIORITY_RANK[top] ? i.priority : top),
          "routine"
        ),
        pressing: items.filter((i) => i.priority !== "routine").length,
        since: items.reduce((min, i) => (i.createdAt < min ? i.createdAt : min), items[0].createdAt),
        byType,
      }
    })
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.top] - PRIORITY_RANK[b.top] ||
        b.pressing - a.pressing ||
        ms(a.since) - ms(b.since)
    )
}

/* ---------------------------------------------------------- activity -- */

/* The practice's last 14 days, ending on NOW's date: what came in and went
   out of the queue each day, and the open count per type at the end of each
   day. Sample data for the whole practice (All patients). A narrower scope
   reads the same shape scaled to its share of today's open items, so the
   last point is always the live count. */

const DAYS = 14

export const ACTIVITY = {
  received: [2, 3, 4, 1, 0, 3, 4, 5, 2, 3, 4, 3, 7, 0],
  cleared: [3, 2, 3, 2, 0, 2, 4, 3, 3, 2, 3, 4, 4, 0],
  open: {
    abnormal_result: [4, 5, 5, 6, 5, 5, 6, 6, 6, 7, 7, 8, 8, 7],
    medication_change: [3, 3, 4, 4, 4, 5, 5, 5, 4, 5, 6, 6, 6, 6],
    overdue_order: [2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    outside_care: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3],
    care_gap: [4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6],
    review_due: [2, 2, 3, 3, 3, 2, 2, 2, 3, 3, 3, 4, 4, 4],
  } satisfies Record<ItemType, number[]>,
}

/** The 14 ISO dates the activity covers, oldest first. */
export function activityDays() {
  return Array.from({ length: DAYS }, (_, i) => daysFromNow(i - (DAYS - 1)))
}

const scaled = (series: number[], share: number) => series.map((v) => Math.round(v * share))

/** Open count per day for one type, ending on today's live count. */
export function openSeries(type: ItemType, live: number) {
  const practice = ACTIVITY.open[type]
  const last = practice[practice.length - 1]
  const series = last ? scaled(practice, live / last) : practice.map(() => 0)
  series[series.length - 1] = live
  return series
}

/** Today's open count minus the count 7 days earlier. */
export const weekDelta = (series: number[]) =>
  series[series.length - 1] - series[series.length - 8]

export type FlowDay = { date: string; received: number; cleared: number }

/** Items received and cleared per day, for the scope's share of the queue. */
export function inboxFlow(openInScope: number, openInPractice: number): FlowDay[] {
  const share = openInPractice ? openInScope / openInPractice : 0
  const received = scaled(ACTIVITY.received, share)
  const cleared = scaled(ACTIVITY.cleared, share)
  return activityDays().map((date, i) => ({ date, received: received[i], cleared: cleared[i] }))
}

/* ------------------------------------------------------------ charts -- */

export type AgeBucket = "0-7" | "8-14" | "15-28" | "29-42" | "43+"

/** Days since received, bucketed. The last bucket is past escalation. */
export const AGE_BUCKETS: { key: AgeBucket; label: string; max: number }[] = [
  { key: "0-7", label: "0-7 d", max: 7 },
  { key: "8-14", label: "8-14 d", max: 14 },
  { key: "15-28", label: "15-28 d", max: 28 },
  { key: "29-42", label: "29-42 d", max: 42 },
  { key: "43+", label: "> 42 d", max: Infinity },
]

export function ageBucketOf(item: WorkItem): AgeBucket {
  const days = daysSince(item.createdAt)
  return AGE_BUCKETS.find((b) => days <= b.max)!.key
}

export function ageCounts(open: Ranked[]) {
  return AGE_BUCKETS.map((b) => ({
    ...b,
    count: open.filter((i) => ageBucketOf(i) === b.key).length,
  }))
}

export function priorityCounts(open: Ranked[]) {
  return (["urgent", "high", "routine"] as Priority[]).map((priority) => ({
    priority,
    count: open.filter((i) => i.priority === priority).length,
  }))
}

/** Patients by open items, most first; ties by priority, then name. */
export function topPatients(open: Ranked[], nameOf: (id: string) => string, limit = 7) {
  return groupByPatient(open)
    .map((g) => ({ patientId: g.patientId, name: nameOf(g.patientId), count: g.items.length, top: g.top }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        PRIORITY_RANK[a.top] - PRIORITY_RANK[b.top] ||
        a.name.localeCompare(b.name)
    )
    .slice(0, limit)
}

/* ------------------------------------------------------ record state -- */

export const RECORD_STATES: { state: PanelRecordState; label: string }[] = [
  { state: "active", label: "Active" },
  { state: "building", label: "Building" },
  { state: "waiting_for_consent", label: "Waiting for consent" },
  { state: "invited_not_joined", label: "Invited, not joined" },
  { state: "sync_failed", label: "Sync failed" },
]

export function recordStateCounts(panel: Patient[]) {
  return RECORD_STATES.map((s) => ({
    ...s,
    count: panel.filter((p) => p.recordState === s.state).length,
  })).filter((s) => s.count > 0)
}

/** The oldest last sync among active records in scope. */
export function oldestSync(panel: Patient[]) {
  const times = panel
    .filter((p) => p.recordState === "active" && p.lastSyncAt)
    .map((p) => p.lastSyncAt as string)
    .sort()
  return times[0]
}

/* ----------------------------------------------------------- actions -- */

export type ActionKind = "reviewed" | "not_current" | "closed" | "postponed"

/** The item after an action, as a patch. Pure: the caller writes it. */
export function applyAction(
  item: WorkItem,
  action: ActionKind,
  opts: { days?: 14 | 30; reason?: CloseReason } = {}
): Partial<WorkItem> {
  switch (action) {
    case "reviewed":
      return { status: "reviewed" }
    case "not_current":
      return { status: "dismissed" }
    case "closed":
      return { status: "closed", closeReason: opts.reason }
    case "postponed": {
      const until = daysFromNow(opts.days ?? 14)
      /* The clock restarts today and reminders resume from the first. */
      if (item.type === "overdue_order")
        return {
          snoozedUntil: until,
          payload: {
            ...item.payload,
            ...(item.payload.stage === "not_scheduled"
              ? { orderedAt: daysFromNow(0) }
              : { scheduledAt: daysFromNow(0) }),
            remindersSent: 0,
            reminderDates: [],
          },
        } as Partial<WorkItem>
      return { snoozedUntil: until }
    }
  }
}

/* ------------------------------------------------------------ home v5 -- */

/* Selectors the prioritized provider home reads (Needs you now, Today,
   Work). Like the rest of this file they are pure: arrays in, values out. */

/** Tier 1: urgent results, newest first; a lab sorts before a report that
    resulted the same day. */
export function urgentResults(open: Ranked[]) {
  return open
    .filter((i): i is Ranked & { type: "abnormal_result" } => i.type === "abnormal_result" && i.priority === "urgent")
    .sort(
      (a, b) =>
        b.payload.resultedAt.localeCompare(a.payload.resultedAt) ||
        (a.payload.kind === "lab" ? 0 : 1) - (b.payload.kind === "lab" ? 0 : 1) ||
        ms(b.createdAt) - ms(a.createdAt)
    )
}

/** The Open items card's change line: received and cleared over the last
    14 days (the scope's share of the practice activity) and their difference. */
export function queueFlow(openInScope: number, openInPractice: number) {
  const days = inboxFlow(openInScope, openInPractice)
  const received = days.reduce((s, d) => s + d.received, 0)
  const cleared = days.reduce((s, d) => s + d.cleared, 0)
  return { received, cleared, delta: received - cleared, days: days.length }
}

/** The oldest age bucket; items here have waited past escalation. */
export const OLDEST_BUCKET: AgeBucket = "43+"

/** Items open for more than 42 days (time open = NOW minus createdAt), and
    the two process counts the brief names: orders that have spent every
    reminder on their own clock, and care gaps in that oldest bucket. */
export function longOpen(open: Ranked[]) {
  const items = open.filter((i) => ageBucketOf(i) === OLDEST_BUCKET)
  const orders = open.filter(
    (i) =>
      i.type === "overdue_order" &&
      i.payload.remindersSent >= i.payload.remindersMax &&
      orderDay(i.payload) > 42
  )
  const gaps = items.filter((i) => i.type === "care_gap")
  return { items, orders, gaps }
}

/** The patient with the most open items: most first, then highest
    priority, then the longest-waiting. */
export function heaviestPatient(open: Ranked[]): PatientGroup | undefined {
  return [...groupByPatient(open)].sort(
    (a, b) =>
      b.items.length - a.items.length ||
      PRIORITY_RANK[a.top] - PRIORITY_RANK[b.top] ||
      ms(a.since) - ms(b.since)
  )[0]
}

/** An item's source as a row prints it: the system without its vendor,
    "(ED)" when the patient's ED visit produced it the same day, and
    "Uploaded by patient" for the patient's own uploads. */
export function displaySource(item: WorkItem, all: WorkItem[]) {
  if (/\(uploaded\)/i.test(item.source) || /^Patient\b/.test(item.source)) return "Uploaded by patient"
  const system = item.source.replace(/\s*\((Epic|Cerner|athena)\)\s*$/i, "")
  const day = item.createdAt.slice(0, 10)
  const fromEd = all.some(
    (o) =>
      o.type === "outside_care" &&
      o.patientId === item.patientId &&
      o.payload.event === "ED visit" &&
      o.payload.date === day &&
      o.source.replace(/\s*\(.*\)\s*$/, "") === system
  )
  return fromEd ? `${system} (ED)` : system
}
