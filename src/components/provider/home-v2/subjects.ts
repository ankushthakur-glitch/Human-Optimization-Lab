import { type Patient, fullName } from "@/components/practice/practice-data"
import type { Marker, Point } from "@/components/patient-dashboard/widgets/changes-dashboard"
import type { Group, Kind, Row, Subject } from "@/components/patient-dashboard/widgets/decision-dashboard"
import { day } from "@/components/patient-dashboard/widgets/decision-dashboard"
import type { MedCase } from "@/components/patient-dashboard/rules"
import { insightFor } from "@/components/provider/home-v2/insight"
import { MEDICATION_CHANGE, medicationBadgeText, outOfRange } from "@/components/provider/home-v2/labels"
import { type ActionOptions, gapDaysLate, orderDays } from "@/components/provider/home-v2/selectors"
import type { AbnormalResult, ActionKind, Priority, QueueItem } from "@/components/provider/home-v2/types"

/* The provider's work items in the patient chart dashboard's shape. Each
   QueueItem becomes a Subject, so Version 2 draws the provider's own data
   with the patient dashboard's components: the row (title, line, alert),
   the hover peek, the decision band, and the panel's figure, stats,
   note, trend, readings, Label / Value facts, From → To change and the
   medication records table. Nothing new is invented: every value comes
   from the work item, its patient, or the AI summary Version 1 shows. */

export type Ctx = {
  patient?: Patient
  act: (item: QueueItem, kind: ActionKind, opts?: ActionOptions) => void
  openChart: (patientId: string, section?: string) => void
}

const GROUP: Record<Priority, Group | undefined> = { urgent: "action", moderate: "review", routine: undefined }

export const CATEGORY: Record<QueueItem["type"], string> = {
  abnormal_result: "Abnormal result",
  medication_change: "Medication change",
  overdue_order: "Overdue order",
  outside_care: "Outside care",
  care_gap: "Care gap",
  review_due: "Review due",
}

const KIND: Record<QueueItem["type"], Kind> = {
  abnormal_result: "result",
  medication_change: "med",
  overdue_order: "order",
  outside_care: "visit",
  care_gap: "care",
  review_due: "care",
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** A lab's readings as a marker: the dot trend, the range chart, the readings table. */
export function markerOf(item: QueueItem): Marker | undefined {
  if (item.type !== "abnormal_result" || item.payload.kind !== "lab") return undefined
  const r = item.payload
  const history = r.history?.length
    ? r.history
    : r.value && !Number.isNaN(Number(r.value))
      ? [{ date: r.resultedAt, value: Number(r.value), source: item.source }]
      : []
  if (!history.length) return undefined
  const points: Point[] = history.map((h) => ({ ...h, out: outOfRange(h.value, r) }))
  const last = points[points.length - 1]!
  const prev = points[points.length - 2]
  const gap = (v: number) => (r.refHigh != null && v > r.refHigh ? v - r.refHigh : r.refLow != null && v < r.refLow ? r.refLow - v : 0)
  return {
    id: item.id,
    name: r.name,
    unit: r.unit ?? "",
    points,
    low: r.refLow,
    high: r.refHigh,
    range: r.range ?? "",
    flag: r.flag === "H" ? "High" : r.flag === "L" ? "Low" : r.flag === "Critical" ? "Critical" : "Watch",
    isNew: item.isNew,
    trend: !prev ? "new" : gap(last.value) > gap(prev.value) ? "worsening" : gap(last.value) < gap(prev.value) ? "improving" : "stable",
    rising: !!prev && last.value > prev.value,
  }
}

/** The AI summary Version 1 shows, as the panel's note and a Recommended section. */
function ai(item: QueueItem, tone: Subject["figure"]["tone"]) {
  const i = insightFor(item)
  const text = i.situation.map((s) => s.text.replace(/\.?$/, ".")).join(" ")
  return {
    note: text ? { tone: tone ?? "blue", title: "AI summary", text } : undefined,
    recommended: i.recommendations.length
      ? [{ title: "Recommended", rows: i.recommendations.map((r): Row => ({ label: r.label, value: r.value })) }]
      : [],
  }
}

const sourceText = (item: QueueItem) => `${item.source}${item.isOutsideSource ? ", outside" : ""}`

export function toSubject(item: QueueItem, ctx: Ctx): Subject {
  const group = GROUP[item.priority]
  const tone = item.priority === "urgent" ? "red" : item.priority === "moderate" ? "orange" : "blue"
  const who = ctx.patient ? fullName(ctx.patient) : item.patientId
  const markReviewed = { label: "Mark reviewed", primary: true, run: () => ctx.act(item, "mark_reviewed") }
  const chart = (section?: string) => ({
    label: "Open chart",
    keepOpen: true,
    run: () => ctx.openChart(item.patientId, section),
  })
  const base = {
    id: item.id,
    kind: KIND[item.type],
    group,
    date: item.createdAt,
    source: item.source,
    category: CATEGORY[item.type],
    sub: who,
  }

  switch (item.type) {
    case "abnormal_result": {
      const r: AbnormalResult = item.payload
      const m = markerOf(item)
      const { note, recommended } = ai(item, "red")
      const facts: Row[] = [
        { label: "Resulted", value: day(r.resultedAt) },
        { label: "Source", value: sourceText(item) },
        ...(r.range ? [{ label: "Range", value: `${r.range}${r.unit ? ` ${r.unit}` : ""}` }] : []),
        { label: "Ordered by", value: "Daniel Reyes, MD" },
        { label: "Status", value: "Final" },
      ]
      if (m) {
        const p = m.points
        const last = p[p.length - 1]!
        const prev = p[p.length - 2]
        const pct = prev && prev.value ? Math.round(((last.value - prev.value) / Math.abs(prev.value)) * 100) : undefined
        return {
          ...base,
          kind: "result",
          title: r.name,
          line: `${r.value}${r.unit ? ` ${r.unit}` : ""}, range ${r.range}.`,
          alert: prev ? `${last.value > prev.value ? "Up" : "Down"} from ${prev.value}.` : "First reading.",
          fact: prev ? `${r.name} ${prev.value} → ${last.value}` : `${r.name} ${last.value}`,
          short: r.name,
          heading: r.name,
          figure: { label: "Latest", value: String(last.value), unit: m.unit, sub: r.range ? `Range ${r.range}` : undefined, tone: "red" },
          stats: [
            ...(prev ? [{ label: "Previous", value: String(prev.value) }] : []),
            ...(pct != null ? [{ label: "Change", value: `${pct > 0 ? "+" : ""}${pct}%`, tone: m.trend === "worsening" ? ("red" as const) : undefined }] : []),
          ],
          note,
          marker: m,
          sections: [{ title: "Result", rows: facts }, ...recommended],
          actions: [markReviewed, chart("labs")],
        }
      }
      return {
        ...base,
        kind: "report",
        title: r.name,
        line: `${r.value ?? r.flag}. ${item.source}.`,
        alert: item.isOutsideSource ? "Outside your EHR." : undefined,
        fact: `${r.name}: ${r.value ?? r.flag}`,
        short: r.name,
        heading: r.name,
        figure: { label: "Finding", value: r.value ?? r.flag, tone: "red" },
        note,
        sections: [{ title: "Report", rows: facts }, ...recommended],
        actions: [markReviewed, chart("documents")],
      }
    }

    case "medication_change": {
      const m = item.payload
      const { note, recommended } = ai(item, "orange")
      const entry = (dose: string, prescriber: string, source: string, date: string, isPracticeList: boolean) => ({
        medication: m.medication,
        dose,
        sig: dose,
        frequency: "",
        prescriber,
        source,
        date,
        isPracticeList,
      })
      const med: MedCase = {
        key: item.id,
        medication: m.medication,
        practice: m.practiceEntry ? entry(m.practiceEntry, "Daniel Reyes, MD", "Practice EHR", m.date, true) : undefined,
        other:
          m.change === "patient_report"
            ? undefined
            : entry(m.change === "stopped" ? "Stopped" : (m.otherEntry ?? ""), m.changedBy ?? "", item.source, m.date, false),
        answer:
          m.patientSays && m.patientSays !== "No answer"
            ? { medication: m.medication, answer: m.patientSays, note: m.patientNote, date: m.date }
            : undefined,
        date: m.date,
      }
      const dose = m.change === "dose" && m.practiceEntry && m.otherEntry
      const word = medicationBadgeText(m)
      return {
        ...base,
        title: m.medication,
        line: dose ? `${m.practiceEntry} → ${m.otherEntry}.` : `${m.practiceEntry ?? m.otherEntry ?? MEDICATION_CHANGE[m.change]}.`,
        alert: dose ? undefined : `${word}.`,
        fact: `${m.medication}: ${word.toLowerCase()}`,
        short: m.medication,
        heading: m.medication,
        figure: dose
          ? { label: "Now", value: m.otherEntry!, sub: `Was ${m.practiceEntry}`, tone: "orange" }
          : { label: "Change", value: word, tone: "orange" },
        note,
        med,
        sections: [
          dose
            ? {
                title: "Change",
                rows: [
                  { label: "From", value: m.practiceEntry! },
                  { label: "To", value: m.otherEntry! },
                  ...(m.changedBy ? [{ label: "Changed by", value: m.changedBy }] : []),
                  { label: "Source", value: item.source },
                  { label: "Date", value: day(m.date) },
                ],
              }
            : {
                title: "Medication",
                rows: [
                  { label: "Practice list", value: m.practiceEntry ?? "Not on list" },
                  ...(m.otherEntry ? [{ label: "Other source", value: m.otherEntry }] : []),
                  ...(m.patientSays ? [{ label: "Patient says", value: [m.patientSays, m.patientNote].filter(Boolean).join(", "), tone: m.patientSays === "Not taking" ? ("violet" as const) : undefined }] : []),
                  ...(m.changedBy ? [{ label: "Changed by", value: m.changedBy }] : []),
                  { label: "Source", value: item.source },
                  { label: "Reported", value: day(m.date) },
                ],
              },
          ...recommended,
        ],
        actions: [
          { label: "Confirm change", primary: true, run: () => ctx.act(item, "confirm_change") },
          { label: "Not current", run: () => ctx.act(item, "not_current") },
          chart("medications"),
        ],
      }
    }

    case "overdue_order": {
      const o = item.payload
      const days = orderDays(o)
      const { note, recommended } = ai(item, "orange")
      return {
        ...base,
        title: o.order,
        line: o.stage === "not_scheduled" ? `Ordered ${day(o.orderedAt)}, not scheduled.` : `Booked ${day(o.scheduledAt!)}, not done.`,
        alert: `${days} days`,
        fact: `${o.order} ${days} days without a result`,
        short: o.order,
        heading: o.order,
        figure: { label: "Waiting", value: String(days), unit: "days", sub: o.stage === "not_scheduled" ? "Not scheduled" : "Booked, not completed", tone: "orange" },
        stats: [{ label: "Reminders", value: `${o.remindersSent} of ${o.remindersMax}`, tone: o.remindersSent >= o.remindersMax ? "orange" : undefined }],
        note,
        sections: [
          {
            title: "Order",
            rows: [
              { label: "Ordered", value: `${day(o.orderedAt)} by ${o.orderedBy}` },
              { label: "Status", value: o.scheduledAt ? `Booked ${day(o.scheduledAt)}, not completed` : "Not scheduled" },
              ...(o.facility ? [{ label: "Facility", value: o.facility }] : []),
              ...(o.reminderDates.length ? [{ label: "Reminders sent", value: o.reminderDates.map(day).join(", ") }] : []),
              { label: "Source", value: item.source },
            ],
          },
          ...recommended,
        ],
        actions: [
          { label: "Close", primary: true, run: () => ctx.act(item, "close", { reason: "Completed elsewhere" }) },
          { label: "Postpone 14 days", run: () => ctx.act(item, "postpone", { days: 14 }) },
          chart("encounters"),
        ],
      }
    }

    case "outside_care": {
      const v = item.payload
      const { note, recommended } = ai(item, tone)
      return {
        ...base,
        title: v.event,
        line: `${v.reason}, ${v.facility}.`,
        alert: "Not reviewed.",
        fact: `${v.event} ${day(v.date)}`,
        short: v.event,
        heading: v.event,
        figure: { label: "Reason", value: v.reason, sub: v.facility, tone },
        note,
        sections: [
          {
            title: "Visit",
            rows: [
              { label: "Date", value: day(v.date) },
              { label: "Facility", value: v.facility },
              ...(v.clinician ? [{ label: "Clinician", value: v.clinician }] : []),
              { label: "Source", value: item.source },
            ],
          },
          ...recommended,
        ],
        actions: [markReviewed, chart("encounters")],
      }
    }

    case "care_gap": {
      const g = item.payload
      const late = gapDaysLate(g)
      const { note, recommended } = ai(item, late > 30 ? "orange" : "blue")
      return {
        ...base,
        title: g.gap,
        line: `${g.gapType}${g.lastDone ? `, last done ${day(g.lastDone)}` : ""}.`,
        alert: late > 0 ? "Overdue" : `Due ${day(g.due)}`,
        fact: `${g.gap} ${late > 0 ? "overdue" : `due ${day(g.due)}`}`,
        short: g.gap,
        heading: g.gap,
        figure:
          late > 0
            ? { label: "Overdue", value: String(late), unit: "days", sub: `Due ${day(g.due)}`, tone: "orange" }
            : { label: "Due", value: day(g.due) },
        note,
        sections: [
          {
            title: "Gap",
            rows: [
              { label: "Type", value: g.gapType },
              ...(g.lastDone ? [{ label: "Last done", value: day(g.lastDone) }] : []),
              { label: "Due", value: day(g.due) },
              { label: "Reminders", value: plural(g.remindersSent, "sent", "sent") },
              { label: "Detected by", value: item.source },
            ],
          },
          ...recommended,
        ],
        actions: [
          markReviewed,
          { label: "Close", run: () => ctx.act(item, "close", { reason: "Completed elsewhere" }) },
          chart("dashboard"),
        ],
      }
    }

    case "review_due": {
      const r = item.payload
      const { note, recommended } = ai(item, tone)
      return {
        ...base,
        title: r.review,
        line: r.lastReview ? `Last review ${day(r.lastReview)}.` : "First review.",
        alert: `Due ${day(r.due)}`,
        fact: `${r.review} due ${day(r.due)}`,
        short: r.review,
        heading: r.review,
        figure: { label: "Due", value: day(r.due) },
        note,
        sections: [
          {
            title: "Review",
            rows: [
              { label: "Review", value: r.review },
              { label: "Due", value: day(r.due) },
              ...(r.lastReview ? [{ label: "Last review", value: day(r.lastReview) }] : []),
              { label: "Prepared by", value: item.source },
            ],
          },
          ...recommended,
        ],
        actions: [markReviewed, chart()],
      }
    }
  }
}
