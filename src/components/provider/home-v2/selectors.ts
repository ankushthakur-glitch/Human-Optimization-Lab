import type { Patient } from "@/components/practice/practice-data"
import { LAST_VISIT, NOW, dateFromNow, daysSince } from "@/components/provider/home-v2/clock"
import { INBOX_ACTIVITY, OPEN_SNAPSHOTS, URGENT_SNAPSHOT } from "@/components/provider/home-v2/mock"
import type {
  ActionKind,
  CareGap,
  CloseReason,
  FlowDay,
  ItemType,
  OverdueOrder,
  Priority,
  QueueItem,
  WorkItem,
} from "@/components/provider/home-v2/types"

/* Every number on the provider home comes through these pure functions.
   They take the stores' arrays and the mock clock and return what a card
   shows; nothing here reads React or the DOM. */

export type Scope = "mine" | "all"

export const ITEM_TYPES: ItemType[] = [
  "abnormal_result",
  "medication_change",
  "overdue_order",
  "outside_care",
  "care_gap",
  "review_due",
]

/** The types with their own metric card and Worklist tab. Outside care
    has neither: its items still list By patient, and under Urgent when
    urgent. */
export const CARD_TYPES: ItemType[] = ITEM_TYPES.filter((t) => t !== "outside_care")

export const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, moderate: 1, routine: 2 }

/* ------------------------------------------------------------- rules -- */

/** Three levels.
    Urgent: an abnormal result from outside the practice EHR, any Critical
    flag, any red flag, or an intake whose PHQ-9 item 9 is positive.
    Moderate: other abnormal results, a stopped drug, a dose or list change
    or one the patient is not taking, an order waiting 60 days or more, an
    ED visit, admission, discharge or urgent care, clinical care gaps, plan
    approvals.
    Routine: the rest. */
export function priorityOf(item: WorkItem): Priority {
  switch (item.type) {
    case "abnormal_result": {
      const r = item.payload
      return item.isOutsideSource || r.flag === "Critical" || r.redFlag ? "urgent" : "moderate"
    }
    case "medication_change": {
      const m = item.payload
      return m.change !== "patient_report" || m.patientSays === "Not taking" ? "moderate" : "routine"
    }
    case "overdue_order":
      return orderDays(item.payload) >= 60 ? "moderate" : "routine"
    case "outside_care":
      return item.payload.event === "Specialist visit" ? "routine" : "moderate"
    case "review_due": {
      const r = item.payload
      if (r.review === "Intake summary" && r.phq9Item9Positive) return "urgent"
      return r.review === "Optimization plan approval" ? "moderate" : "routine"
    }
    case "care_gap":
      return item.payload.gapType === "Clinical" ? "moderate" : "routine"
  }
}

export const isNew = (item: WorkItem) => item.createdAt > LAST_VISIT

/** Days an order has waited: since it was placed when nothing is booked,
    since the booked date when the visit was missed. */
export function orderDays(o: OverdueOrder) {
  return daysSince(o.stage === "not_scheduled" ? o.orderedAt : (o.scheduledAt ?? o.orderedAt))
}

/** An order is in the queue only once escalated: three reminders sent and
    past day 42 (not scheduled) or day 28 after the booked date. */
export function isEscalated(o: OverdueOrder) {
  return o.remindersSent >= o.remindersMax && orderDays(o) >= (o.stage === "not_scheduled" ? 42 : 28)
}

export const gapDaysLate = (g: CareGap) => daysSince(g.due)

export function isOpen(item: WorkItem) {
  if (item.status !== "open") return false
  if (item.postponedTo && item.postponedTo > NOW.slice(0, 10)) return false
  if (item.type === "overdue_order") return isEscalated(item.payload)
  return true
}

export const toQueue = (item: WorkItem): QueueItem => ({ ...item, priority: priorityOf(item), isNew: isNew(item) })

/** Most pressing level first; newest first within each. */
export function byPriority(a: QueueItem, b: QueueItem) {
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.createdAt.localeCompare(a.createdAt)
}

/* ---------------------------------------------------------- patients -- */

/** The patients whose Health Gorilla record the dashboard tracks. */
export const panelPatients = (all: Patient[]) => all.filter((p) => p.recordState)

export function patientsInScope(all: Patient[], scope: Scope, providerId: string) {
  const panel = panelPatients(all)
  return scope === "mine" ? panel.filter((p) => p.providerId === providerId) : panel
}

/** The oldest successful pull among active records in scope. */
export function oldestSync(patients: Patient[]) {
  return patients
    .filter((p) => p.recordState === "active" && p.lastSyncAt)
    .map((p) => p.lastSyncAt!)
    .sort()[0]
}

export const RECORD_STATES = [
  { state: "active", label: "Active" },
  { state: "building", label: "Building" },
  { state: "waiting_for_consent", label: "Waiting for consent" },
  { state: "invited_not_joined", label: "Invited, not joined" },
  { state: "sync_failed", label: "Sync failed" },
] as const

export type RecordState = (typeof RECORD_STATES)[number]["state"]

export function recordStateCounts(patients: Patient[]) {
  return RECORD_STATES.map((s) => ({ ...s, count: patients.filter((p) => p.recordState === s.state).length }))
}

/* ------------------------------------------------------------- queue -- */

/** Open items for the patients given, ranked. */
export function openQueue(items: WorkItem[], patients: Patient[]): QueueItem[] {
  const ids = new Set(patients.map((p) => p.id))
  return items.filter((i) => ids.has(i.patientId) && isOpen(i)).map(toQueue).sort(byPriority)
}

export type TypeCount = { type: ItemType; open: number; urgent: number; fresh: number }

export function typeCounts(open: QueueItem[]): TypeCount[] {
  return ITEM_TYPES.map((type) => {
    const of = open.filter((i) => i.type === type)
    return {
      type,
      open: of.length,
      urgent: of.filter((i) => i.priority === "urgent").length,
      fresh: of.filter((i) => i.isNew).length,
    }
  })
}

/** The last 14 days' open count, ending on today's live count. */
export function openSeries(type: ItemType, live: number) {
  const snap = OPEN_SNAPSHOTS[type]
  return [...snap.slice(0, snap.length - 1), live]
}

/** The last 14 days' urgent count, ending on today's live count. */
export function urgentSeries(live: number) {
  return [...URGENT_SNAPSHOT.slice(0, URGENT_SNAPSHOT.length - 1), live]
}

/** Today's open count against the count seven days earlier. */
export function weekDelta(series: number[]) {
  return series[series.length - 1]! - series[series.length - 8]!
}

/** The practice's inbox activity scaled to the scope's share of the open
    queue, so My patients reads its own part of the flow. */
export function inboxFlow(scopeOpen: number, practiceOpen: number): FlowDay[] {
  const share = practiceOpen > 0 ? scopeOpen / practiceOpen : 0
  return INBOX_ACTIVITY.map((d) => ({
    date: d.date,
    received: Math.round(d.received * share),
    cleared: Math.round(d.cleared * share),
  }))
}

export const AGE_BUCKETS = [
  { key: "0-7", label: "0-7 d", max: 7 },
  { key: "8-14", label: "8-14 d", max: 14 },
  { key: "15-28", label: "15-28 d", max: 28 },
  { key: "29-42", label: "29-42 d", max: 42 },
  { key: "43+", label: "> 42 d", max: Infinity },
] as const

export type AgeBucket = (typeof AGE_BUCKETS)[number]["key"]

export function ageBucketOf(item: WorkItem): AgeBucket {
  const days = daysSince(item.createdAt)
  return AGE_BUCKETS.find((b) => days <= b.max)!.key
}

export type PatientGroup = {
  patientId: string
  items: QueueItem[]
  byType: Partial<Record<ItemType, number>>
  top: Priority
  oldest: string
}

/** One group per patient: highest priority first, then the most items. */
export function groupByPatient(open: QueueItem[]): PatientGroup[] {
  const groups = new Map<string, QueueItem[]>()
  for (const item of open) groups.set(item.patientId, [...(groups.get(item.patientId) ?? []), item])
  return [...groups.entries()]
    .map(([patientId, items]) => {
      const byType: Partial<Record<ItemType, number>> = {}
      for (const i of items) byType[i.type] = (byType[i.type] ?? 0) + 1
      const sorted = [...items].sort(byPriority)
      return {
        patientId,
        items: sorted,
        byType,
        top: sorted[0]!.priority,
        oldest: items.map((i) => i.createdAt).sort()[0]!,
      }
    })
    .sort((a, b) => PRIORITY_RANK[a.top] - PRIORITY_RANK[b.top] || b.items.length - a.items.length)
}

export type TopPatient = { patientId: string; count: number; top: Priority } & Record<Priority, number>

export function topPatients(open: QueueItem[], limit = 7): TopPatient[] {
  return groupByPatient(open)
    .map((g) => ({
      patientId: g.patientId,
      count: g.items.length,
      top: g.top,
      ...(Object.fromEntries(
        (Object.keys(PRIORITY_RANK) as Priority[]).map((p) => [p, g.items.filter((i) => i.priority === p).length])
      ) as Record<Priority, number>),
    }))
    .sort((a, b) => b.count - a.count || PRIORITY_RANK[a.top] - PRIORITY_RANK[b.top])
    .slice(0, limit)
}

/* ----------------------------------------------------------- actions -- */

export type ActionOptions = { days?: 14 | 30; reason?: CloseReason }

export const CLOSE_REASONS: CloseReason[] = ["Completed elsewhere", "No longer needed", "Patient declined"]

/** What an action changes on the item. */
export function applyAction(kind: ActionKind, opts: ActionOptions = {}): Partial<WorkItem> {
  switch (kind) {
    case "mark_reviewed":
    case "confirm_change":
      return { status: "reviewed" }
    case "not_current":
      return { status: "dismissed" }
    case "postpone":
      return { postponedTo: dateFromNow(opts.days ?? 14) }
    case "close":
      return { status: "closed", closeReason: opts.reason ?? "Completed elsewhere" }
  }
}

/** The word a worked row shows beside Undo. */
export function actionLabel(kind: ActionKind, opts: ActionOptions = {}) {
  switch (kind) {
    case "mark_reviewed":
      return "Reviewed"
    case "confirm_change":
      return "Confirmed"
    case "not_current":
      return "Not current"
    case "postpone":
      return `Postponed ${opts.days ?? 14} days`
    case "close":
      return "Closed"
  }
}
