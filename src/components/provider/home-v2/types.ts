/* The provider home's work item: one thing waiting for the physician,
   typed by what it is. Priority is not stored; the rules in selectors.ts
   derive it from the inputs kept here. */

export type Priority = "urgent" | "moderate" | "routine"

export type ItemType =
  | "abnormal_result"
  | "medication_change"
  | "overdue_order"
  | "outside_care"
  | "care_gap"
  | "review_due"

export type ItemStatus = "open" | "reviewed" | "dismissed" | "closed"

export type CloseReason = "Completed elsewhere" | "No longer needed" | "Patient declined"

export type ResultFlag = "H" | "L" | "Critical" | "Abnormal"

export type ResultPoint = { date: string; value: number; source: string }

export interface AbnormalResult {
  kind: "lab" | "report"
  name: string
  /** A lab's value, or a report's one-line finding. */
  value?: string
  unit?: string
  flag: ResultFlag
  /** The printed reference range, and its numeric bounds for charts. */
  range?: string
  refLow?: number
  refHigh?: number
  previous?: string
  resultedAt: string
  history?: ResultPoint[]
  redFlag?: "new_cancer" | "abnormal_ct_mri" | "abnormal_pathology"
}

export type MedicationChangeKind = "dose" | "not_on_list" | "stopped" | "patient_report"

export interface MedicationChange {
  medication: string
  change: MedicationChangeKind
  practiceEntry?: string
  otherEntry?: string
  changedBy?: string
  patientSays?: "Taking" | "Not taking" | "Taking differently" | "No answer"
  patientNote?: string
  date: string
}

export interface OverdueOrder {
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

export interface OutsideCare {
  event: "ED visit" | "Admission" | "Discharge" | "Urgent care" | "Specialist visit"
  facility: string
  reason: string
  date: string
  clinician?: string
}

export interface CareGap {
  gap: string
  gapType: "Preventive" | "Clinical" | "Follow-up"
  lastDone?: string
  due: string
  remindersSent: number
}

export interface ReviewDue {
  review: "Initial record validation" | "Quarterly review" | "Intake summary" | "Care plan review"
  due: string
  lastReview?: string
  /** An intake whose PHQ-9 item 9 came back positive is urgent. */
  phq9Item9Positive?: boolean
}

export type Payload = {
  abnormal_result: AbnormalResult
  medication_change: MedicationChange
  overdue_order: OverdueOrder
  outside_care: OutsideCare
  care_gap: CareGap
  review_due: ReviewDue
}

type ItemBase = {
  id: string
  patientId: string
  /** ISO date-time; drives "new" and the sort. */
  createdAt: string
  source: string
  /** True when the source is not the practice's own EHR. */
  isOutsideSource: boolean
  status: ItemStatus
  closeReason?: CloseReason
  /** Set by Postpone: the item leaves the queue until this date. */
  postponedTo?: string
}

export type WorkItemOf<T extends ItemType> = ItemBase & { type: T; payload: Payload[T] }

export type WorkItem = { [T in ItemType]: WorkItemOf<T> }[ItemType]

/** A work item with its derived priority and newness attached. */
export type QueueItem = WorkItem & { priority: Priority; isNew: boolean }

export type ActionKind = "mark_reviewed" | "confirm_change" | "not_current" | "postpone" | "close"

export type AuditEntry = {
  id: string
  at: string
  actor: string
  action: string
  itemId: string
}

export type FlowDay = { date: string; received: number; cleared: number }
