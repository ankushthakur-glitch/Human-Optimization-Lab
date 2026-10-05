"use client"

import * as React from "react"

import { createCollection } from "@/components/practice/collection-store"
import type { HealthRecord } from "@/components/practice/health-record"
import type { Patient } from "@/components/practice/practice-data"
import { NOW, daysFromNow } from "@/components/provider/mock-clock"
import {
  audit,
  workItems,
  type WorkItem,
} from "@/components/provider/work-items"
import { dashboardDataFor } from "@/components/patient-dashboard/mock-data"
import {
  type Clock,
  type MedCase,
  type Postponed,
  type SectionId,
  encounterKey,
  eventChips,
  gapClock,
  gapKey,
  inRangeCount,
  intakeKey,
  isOverdue,
  keyTrends,
  lastReview,
  medicationCases,
  orderClock,
  orderKey,
  outOfRange,
  problemRows,
  recentEncounters,
  recordSources,
  reportKey,
  reportsToReview,
  resultKey,
  sinceEvents,
  trending,
  urgentItems,
  zoneLayout,
} from "@/components/patient-dashboard/rules"
import type {
  CareGap,
  DashboardData,
  ReconciliationState,
  ReviewLog,
  TrackedOrder,
} from "@/components/patient-dashboard/types"

/* What the physician has done on a patient's dashboard, kept per patient
   for the session on top of the sample data: reviews, reconciliation
   decisions, postponed and closed orders and gaps, reminders sent, repeats
   ordered, items marked reviewed, and sent recommendations. Every action
   also writes the audit log. The record keys live in rules.ts; they are
   re-exported here for the cards and the brief. */

export { encounterKey, gapKey, intakeKey, orderKey, reportKey, resultKey }

export const ME = "Dr. Reyes"

type Tracked = {
  key: string
  status: "open" | "closed"
  closeReason?: string
  postponedUntil?: string
  /** When the physician last sent a reminder from this page. */
  remindedAt?: string
}

export type SentRecommendation = {
  at: string
  by: string
  reasons: string[]
  note: string
}

type DashState = {
  /** The patient id. */
  id: string
  reviews: ReviewLog[]
  recon: ReconciliationState[]
  tracked: Tracked[]
  /** Keys of results, reports, encounters and intakes marked reviewed. */
  reviewed: string[]
  recommendations: SentRecommendation[]
  /** Result keys a repeat was ordered for. */
  repeats?: string[]
}

export const dashboardState = createCollection<DashState>(
  "hol-patient-dashboard",
  [],
  "v1"
)

const empty = (id: string): DashState => ({
  id,
  reviews: [],
  recon: [],
  tracked: [],
  reviewed: [],
  recommendations: [],
  repeats: [],
})

function update(id: string, fn: (s: DashState) => DashState) {
  const current = dashboardState.get().find((s) => s.id === id)
  if (current) dashboardState.patch(id, fn(current))
  else dashboardState.add([fn(empty(id))])
}

/* -------------------------------------------------------------- model -- */

export type OrderRow = TrackedOrder &
  Postponed & { key: string; clock: Clock; remindedAt?: string }
export type GapRow = CareGap &
  Postponed & { key: string; clock: Clock; remindedAt?: string }

/** The sample data with the session's actions laid over it. */
function withState(data: DashboardData, s: DashState | undefined) {
  if (!s) return data
  const seen = new Set(s.reviewed)
  return {
    ...data,
    reviewLog: [...data.reviewLog, ...s.reviews],
    encounters: data.encounters.map((e) => ({
      ...e,
      reviewed: e.reviewed || seen.has(encounterKey(e)),
    })),
    reports: data.reports.map((r) => ({
      ...r,
      reviewed: r.reviewed || seen.has(reportKey(r)),
    })),
    intake: data.intake && {
      ...data.intake,
      reviewed: data.intake.reviewed || seen.has(intakeKey(data.intake)),
    },
    orders: data.orders.map((o) => {
      const t = s.tracked.find((x) => x.key === orderKey(o))
      return t
        ? {
            ...o,
            status: t.status,
            closeReason: t.closeReason,
            postponedUntil: t.postponedUntil,
          }
        : o
    }),
    gaps: data.gaps.map((g) => {
      const t = s.tracked.find((x) => x.key === gapKey(g))
      return t
        ? { ...g, status: t.status, postponedUntil: t.postponedUntil }
        : g
    }),
  }
}

/** Everything the page shows, derived from the data in one pass. */
export function buildModel(
  data: DashboardData,
  recon: ReconciliationState[],
  reviewed: Set<string> = new Set(),
  tracked: Tracked[] = [],
  repeats: Set<string> = new Set()
) {
  const review = lastReview(data.reviewLog)
  const out = outOfRange(data.labs)
  const trend = trending(data.labs)
  const cases = medicationCases(data, recon)
  const events = sinceEvents(data, cases, review?.at)
  const remindedAt = (key: string) =>
    tracked.find((t) => t.key === key)?.remindedAt

  const orders: OrderRow[] = data.orders
    .filter((o) => o.status === "open" && !o.completedAt)
    .map((o) => ({
      ...o,
      key: orderKey(o),
      clock: orderClock(o),
      remindedAt: remindedAt(orderKey(o)),
    }))
  const gaps: GapRow[] = data.gaps
    .filter((g) => g.status === "open")
    .map((g) => ({
      ...g,
      key: gapKey(g),
      clock: gapClock(g),
      remindedAt: remindedAt(gapKey(g)),
    }))
  const encounters = recentEncounters(data.encounters)
  const reports = reportsToReview(data.reports)
  const problems = problemRows(data)
  const trends = keyTrends(data)

  const urgent = urgentItems(data.labs, data.reports, (lab, r) =>
    reviewed.has(resultKey(lab.code, r.date))
  )

  /* The brief, Results and Medications always show; the rest only with
     something in them. The About card shows whenever an intake exists. */
  const visible = new Set<SectionId>(["brief", "results", "meds"])
  if (urgent.length) visible.add("alert")
  if (data.intake) visible.add("person")
  if (out.length || trend.length) visible.add("detail")
  if (orders.length || gaps.length) visible.add("orders")
  if (encounters.length) visible.add("outside")
  if (problems.length) visible.add("problems")

  return {
    data,
    review,
    validation: !review,
    events,
    chips: eventChips(events),
    sources: recordSources(data),
    outOfRange: out,
    trending: trend,
    inRange: inRangeCount(data.labs),
    problems,
    trends,
    cases,
    medicationCount: data.medications.filter((m) => m.isPracticeList).length,
    orders,
    gaps,
    encounters,
    reports,
    intake: data.intake,
    repeats,
    layout: zoneLayout(visible),
    urgent,
  }
}

export type DashboardModel = ReturnType<typeof buildModel>

/* ------------------------------------------------------------ actions -- */

const OPEN_ON_REVIEW: WorkItem["type"][] = [
  "abnormal_result",
  "outside_care",
  "review_due",
]

function closeWork(
  match: (w: WorkItem) => boolean,
  status: WorkItem["status"]
) {
  const hit = workItems.get().filter((w) => w.status === "open" && match(w))
  hit.forEach((w) => workItems.patch(w.id, { status }))
  return hit.map((w) => w.id)
}

function reopenWork(ids: string[]) {
  ids.forEach((id) => workItems.patch(id, { status: "open" }))
}

export function useDashboard(patient: Patient, record: HealthRecord) {
  const { items, ready } = dashboardState.use()
  const work = workItems.use()
  const state = items.find((s) => s.id === patient.id)
  const base = React.useMemo(
    () => dashboardDataFor(patient, record),
    [patient, record]
  )
  const model = React.useMemo(() => {
    const data = withState(base, state)
    return buildModel(
      data,
      state?.recon ?? [],
      new Set(state?.reviewed ?? []),
      state?.tracked ?? [],
      new Set(state?.repeats ?? [])
    )
  }, [base, state])
  const id = patient.id

  /* Work items closed by a reconciliation decision, so Undo reopens them. */
  const closedBy = React.useRef(new Map<string, string[]>())

  /* An order or gap's state before Postpone or Close, so Undo restores it. */
  const before = React.useRef(new Map<string, Tracked | undefined>())
  const remember = (key: string) =>
    before.current.set(
      key,
      state?.tracked.find((t) => t.key === key)
    )

  const actions = React.useMemo(
    () => ({
      /** Mark reviewed, or Validate record when nothing was reviewed before. */
      review() {
        const d = model.data
        const kind: ReviewLog["kind"] = model.validation
          ? "validation"
          : "review"
        const keys = [
          ...d.labs.flatMap((l) =>
            l.history.map((h) => resultKey(l.code, h.date))
          ),
          ...d.reports.map(reportKey),
          ...d.encounters.map(encounterKey),
          ...(d.intake ? [intakeKey(d.intake)] : []),
        ]
        update(id, (s) => ({
          ...s,
          reviews: [...s.reviews, { at: NOW, by: ME, kind }],
          reviewed: [...new Set([...s.reviewed, ...keys])],
        }))
        closeWork(
          (w) => w.patientId === id && OPEN_ON_REVIEW.includes(w.type),
          "reviewed"
        )
        audit(
          ME,
          kind === "validation" ? "Validate record" : "Mark reviewed",
          id
        )
      },

      /** Mark one encounter, report or intake reviewed. */
      reviewOne(key: string, match: (w: WorkItem) => boolean) {
        update(id, (s) => ({
          ...s,
          reviewed: [...new Set([...s.reviewed, key])],
        }))
        closeWork((w) => w.patientId === id && match(w), "reviewed")
        audit(ME, "Mark reviewed", key)
      },

      /** Confirm change (the practice updates its own EHR) or Not current. */
      reconcile(c: MedCase, decision: "acknowledged" | "dismissed") {
        const entry: ReconciliationState = {
          key: c.key,
          status: decision,
          dismissedValue:
            decision === "dismissed" && c.other
              ? `${c.other.dose} ${c.other.frequency}`
              : undefined,
          at: NOW,
          by: ME,
        }
        update(id, (s) => ({
          ...s,
          recon: [...s.recon.filter((r) => r.key !== c.key), entry],
        }))
        closedBy.current.set(
          c.key,
          closeWork(
            (w) =>
              w.patientId === id &&
              w.type === "medication_change" &&
              w.payload.medication === c.medication,
            decision === "dismissed" ? "dismissed" : "reviewed"
          )
        )
        audit(
          ME,
          decision === "acknowledged" ? "Confirm change" : "Not current",
          c.key
        )
      },

      undoReconcile(key: string) {
        update(id, (s) => ({
          ...s,
          recon: s.recon.filter((r) => r.key !== key),
        }))
        reopenWork(closedBy.current.get(key) ?? [])
        closedBy.current.delete(key)
        audit(ME, "Undo", key)
      },

      /** The clock restarts when the postponement ends, and reminders resume. */
      postpone(key: string, days: 14 | 30) {
        const until = daysFromNow(days)
        remember(key)
        update(id, (s) => ({
          ...s,
          tracked: [
            ...s.tracked.filter((t) => t.key !== key),
            { key, status: "open", postponedUntil: until },
          ],
        }))
        audit(ME, `Postpone ${days} days`, key)
      },

      close(key: string, reason: string) {
        remember(key)
        update(id, (s) => ({
          ...s,
          tracked: [
            ...s.tracked.filter((t) => t.key !== key),
            { key, status: "closed", closeReason: reason },
          ],
        }))
        audit(ME, `Close: ${reason}`, key)
      },

      /** Puts a postponed or closed order or gap back as it was. */
      undoTrack(key: string) {
        const prev = before.current.get(key)
        update(id, (s) => ({
          ...s,
          tracked: [
            ...s.tracked.filter((t) => t.key !== key),
            ...(prev ? [prev] : []),
          ],
        }))
        before.current.delete(key)
        audit(ME, "Undo", key)
      },

      /** Sends the patient one more reminder about an order or gap. */
      remind(key: string) {
        update(id, (s) => {
          const current = s.tracked.find((t) => t.key === key) ?? {
            key,
            status: "open" as const,
          }
          return {
            ...s,
            tracked: [
              ...s.tracked.filter((t) => t.key !== key),
              { ...current, remindedAt: NOW },
            ],
          }
        })
        audit(ME, "Send reminder", key)
      },

      /** Orders a repeat of a result; the lab order itself is placed in the EHR. */
      orderRepeat(code: string, date: string) {
        const key = resultKey(code, date)
        update(id, (s) => ({
          ...s,
          repeats: [...new Set([...(s.repeats ?? []), key])],
        }))
        audit(ME, "Order repeat", key)
      },

      recommend(reasons: string[], note: string) {
        update(id, (s) => ({
          ...s,
          recommendations: [
            ...s.recommendations,
            { at: NOW, by: ME, reasons, note },
          ],
        }))
        audit(ME, "Recommend optimization", id)
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, model, state]
  )

  return {
    ready: ready && work.ready,
    model,
    actions,
    free: patient.membership !== "optimization",
  }
}

export const isOverdueRow = (r: { clock: Clock }) => isOverdue(r.clock)
