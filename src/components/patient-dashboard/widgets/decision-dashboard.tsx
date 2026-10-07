"use client"

import * as React from "react"
import {
  ArrowRight01Icon,
  Calendar03Icon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  Notification03Icon,
  Target02Icon,
  TestTube01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/design-system/ui/hover-card"
import { toast } from "@/design-system/ui/sonner"
import { FOCUS, KitIcon, SidePanel, TrendChart } from "@/components/dashboard-kit-v2"
import { NOW, daysSince, usDay } from "@/components/provider/mock-clock"
import type { DashboardModel, GapRow, OrderRow } from "@/components/patient-dashboard/model"
import type { Dashboard } from "@/components/patient-dashboard/patient-dashboard"
import type { Optimization } from "@/components/patient-dashboard/optimization/model"
import { markerByName } from "@/components/patient-dashboard/optimization/rules"
import type { Biomarker } from "@/components/patient-dashboard/optimization/types"
import {
  type MedCase,
  doseText,
  encounterKey,
  isOverdue,
  reportKey,
  resultKey,
  shortSource,
  statusOf,
} from "@/components/patient-dashboard/rules"
import type { ClinicalReport, OutsideEncounter } from "@/components/patient-dashboard/types"
import { CardSkeleton, type OpenSection, Quiet } from "@/components/patient-dashboard/ui"
import {
  DotTrend,
  type Marker,
  ReviewButton,
  TrendWindow,
  byChange,
  caseTag,
  fromBiomarker,
  fromLab,
  isAcute,
  lowerFirst,
  orderState,
} from "@/components/patient-dashboard/widgets/changes-dashboard"
import { TYPE_SCALE, Widget } from "@/components/patient-dashboard/widgets/kit"
import { TONE, type ToneKey } from "@/components/patient-dashboard/widgets/palette"
import { ProgramPanel } from "@/components/patient-dashboard/widgets/program-panel"
import { PROGRAMS, buildProgram, goalProgress } from "@/components/patient-dashboard/widgets/programs"
import { Pill } from "@/components/patient-dashboard/widgets/status"

/* Dashboard version 4: the client's CareMap reference (6 Oct) on our
   version 2. From the reference: one decision band at the top that states
   the related events as one clinical story with its actions; important
   updates triaged into Action needed (red) and For review (amber); Out of
   range beside Watchlist and trends; Future care and follow up beside
   Optimization programs; and every row opening its own panel with a big
   figure, a clinical note, Label : Value facts and its actions. A decline
   reads as a warning, never a success; anything never tested is an amber
   gap. From version 2: inline reading dots with values, the hover trend
   window, the doctor's list / other record / patient confirmed boxes, and
   widgets that show only with something in them. Notes are written by
   rules from the record, not by a model. */

/* ------------------------------------------------------------ subject -- */

type Kind = "visit" | "report" | "result" | "watch" | "med" | "order" | "care" | "program"
type Group = "action" | "review"
type Row = { label: string; value: string; tone?: ToneKey }
type Action = { label: string; primary?: boolean; run: () => void; keepOpen?: boolean }

/** One thing the doctor can open: a list row and its panel. */
type Subject = {
  id: string
  kind: Kind
  group?: Group
  date?: string
  /** "Order outstanding · Lipid panel". */
  title: string
  line: string
  /** The part of the line that needs the doctor, in the group's colour. */
  alert?: string
  /** A few words for the decision band. */
  fact: string
  /** For the band's primary button: "Review ED visit". */
  short: string
  /** The panel title, when it differs from the title's subject. */
  heading?: string
  /** Where it came from, to tie same-source items together in the band. */
  source?: string
  /** An order name an item belongs to, to tie a report to its order. */
  ref?: string
  category: string
  sub: string
  figure: { label: string; value: string; unit?: string; sub?: string; tone?: ToneKey }
  stats?: Row[]
  note?: { tone: ToneKey; title: string; text: string }
  marker?: Marker
  med?: MedCase
  sections: { title: string; rows: Row[] }[]
  actions: Action[]
}

const GROUP_TONE: Record<Group, ToneKey> = { action: "red", review: "orange" }
const GROUP_LABEL: Record<Group, string> = { action: "Action needed", review: "For review" }

const ORDINAL = ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth"]
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const unitText = (m: Marker) => (m.unit ? ` ${m.unit}` : "")
const day = (iso: string) => usDay(iso.slice(0, 10))

/** How many readings in a row moved the wrong way, counting back from the latest. */
function streak(m: Marker) {
  const p = m.points
  const last = p[p.length - 1]?.value
  /* Away from range: up when above it, down when below it. */
  const up = m.high != null && last > m.high ? true : m.low != null && last < m.low ? false : m.rising
  let n = 0
  for (let i = p.length - 1; i > 0; i--) {
    if (up ? p[i].value > p[i - 1].value : p[i].value < p[i - 1].value) n++
    else break
  }
  return n
}

/** Change across the readings shown, as a percent of the first. */
function pctChange(m: Marker) {
  const first = m.points[0]?.value
  const last = m.points[m.points.length - 1]?.value
  if (first == null || last == null || first === 0) return 0
  return Math.round(((last - first) / Math.abs(first)) * 100)
}

/* ----------------------------------------------------------- builders -- */

type Ctx = {
  dash: Dashboard
  model: DashboardModel
  opt: Optimization
  optimized: boolean
  onOpen: OpenSection
  close: () => void
  showPlan: () => void
}

function confirm(ctx: Ctx, c: MedCase, decision: "acknowledged" | "dismissed") {
  ctx.dash.actions.reconcile(c, decision)
  toast.success(decision === "acknowledged" ? `${c.medication}: change confirmed` : `${c.medication}: marked not current`, {
    action: { label: "Undo", onClick: () => ctx.dash.actions.undoReconcile(c.key) },
  })
}

function visitSubject(ctx: Ctx, e: OutsideEncounter): Subject {
  const { model } = ctx
  /* What arrived from the same visit: same source within a day. */
  const near = (d: string) => Math.abs(daysSince(d) - daysSince(e.date)) <= 1
  const came = [
    ...model.data.labs.flatMap((l) =>
      l.history
        .filter((r) => r.source === e.source && near(r.date))
        .map((r) => `${l.name} ${r.value} ${l.unit}`)
    ),
    ...model.data.reports.filter((r) => r.source === e.source && near(r.date)).map((r) => `${r.report}: ${lowerFirst(r.finding)}`),
    ...model.data.medications
      .filter((m) => m.source === e.source && near(m.date))
      .map((m) => `${m.medication} ${doseText(m)} started`),
  ]
  const acute = isAcute(e)
  return {
    id: encounterKey(e),
    kind: "visit",
    group: acute ? "action" : "review",
    date: e.date,
    title: `${e.event} · ${e.facility}`,
    line: `${e.reason}${e.clinician ? `, ${e.clinician}` : ""}.`,
    alert: "Not reviewed.",
    fact: `${e.event} ${day(e.date)}`,
    short: e.event,
    heading: e.event,
    source: shortSource(e.source),
    category: acute ? "Action needed" : "For review",
    sub: `${e.facility}, ${day(e.date)}`,
    figure: { label: "Reason", value: e.reason, sub: `${plural(daysSince(e.date), "day", "days")} ago`, tone: acute ? "red" : "orange" },
    note: came.length
      ? { tone: acute ? "red" : "orange", title: "Came in with this visit", text: `${came.join(". ")}.` }
      : undefined,
    sections: [
      {
        title: "Visit",
        rows: [
          { label: "Date", value: day(e.date) },
          { label: "Facility", value: e.facility },
          ...(e.clinician ? [{ label: "Clinician", value: e.clinician }] : []),
          { label: "Documents", value: e.documents.join(", ") },
          { label: "Source", value: shortSource(e.source) },
        ],
      },
    ],
    actions: [
      {
        label: "Mark reviewed",
        primary: true,
        run: () => {
          ctx.dash.actions.reviewOne(encounterKey(e), (w) => w.type === "outside_care")
          toast.success(`${e.event} marked reviewed`)
        },
      },
      { label: "Open encounters", run: () => ctx.onOpen("encounters") },
      { label: "Open documents", run: () => ctx.onOpen("documents") },
    ],
  }
}

function reportSubject(ctx: Ctx, r: ClinicalReport): Subject {
  const order = ctx.model.orders.find((o) => o.order === r.orderRef)
  return {
    id: reportKey(r),
    kind: "report",
    group: r.redFlag ? "action" : "review",
    date: r.date,
    title: `${r.flag} report · ${r.report}`,
    line: `${r.finding}. ${shortSource(r.source)}.`,
    alert: r.values,
    fact: `${r.report}: ${r.short ?? lowerFirst(r.finding)}`,
    short: r.report,
    source: shortSource(r.source),
    ref: r.orderRef,
    category: r.redFlag ? "Action needed" : "For review",
    sub: `${shortSource(r.source)}, ${day(r.date)}`,
    figure: { label: "Finding", value: r.short ? r.short[0].toUpperCase() + r.short.slice(1) : r.finding, sub: r.values, tone: "red" },
    note: order
      ? {
          tone: "orange",
          title: "An order waits on this",
          text: `${order.order} was ordered ${day(order.orderedAt)} and has no appointment yet.`,
        }
      : undefined,
    sections: [
      {
        title: "Report",
        rows: [
          { label: "Date", value: day(r.date) },
          { label: "Source", value: shortSource(r.source) },
          { label: "Finding", value: r.finding },
          ...(r.values ? [{ label: "Values", value: r.values }] : []),
          ...(r.uploader ? [{ label: "Uploaded by", value: r.uploader }] : []),
        ],
      },
    ],
    actions: [
      {
        label: "Mark reviewed",
        primary: true,
        run: () => {
          ctx.dash.actions.reviewOne(reportKey(r), (w) => w.type === "abnormal_result")
          toast.success(`${r.report} marked reviewed`)
        },
      },
      { label: "Open documents", run: () => ctx.onOpen("documents") },
    ],
  }
}

function markerSubject(ctx: Ctx, m: Marker, watch: boolean, urgent: boolean): Subject {
  const p = m.points
  const last = p[p.length - 1]
  const prev = p[p.length - 2]
  const first = p[0]
  const pct = pctChange(m)
  const rising = m.rising
  const worse = m.trend === "worsening"
  const n = streak(m)
  const above = m.high != null && last.value > m.high
  const word = rising ? "rising" : "declining"
  const note = watch
    ? {
        tone: m.trend === "improving" ? ("green" as const) : ("orange" as const),
        title: worse ? (rising ? "Rising" : "Declining") : m.trend === "improving" ? "Improving" : "Near the edge of range",
        text: `${pct > 0 ? "Up" : "Down"} ${Math.abs(pct)}% across ${plural(p.length, "reading", "readings")}, now ${last.value}${unitText(m)} against a range of ${m.range}.${
          p.length > 2 &&
          Math.abs(last.value - prev.value) > Math.abs(prev.value - p[p.length - 3].value)
            ? " The last step is steeper than the one before."
            : ""
        }`,
      }
    : n >= 2
      ? {
          tone: "orange" as const,
          title: `${ORDINAL[n + 1] ?? `${n + 1}th`} reading in a row moving away from range`,
          text: `Now ${last.value}${unitText(m)}, ${above ? "above" : "below"} the range of ${m.range}, and further out at each reading rather than fluctuating.`,
        }
      : m.trend === "improving"
        ? {
            tone: "orange" as const,
            title: "Moving back toward range",
            text: `Still ${above ? "above" : "below"} the range of ${m.range}; ${prev ? `${prev.value} before this reading.` : ""}`,
          }
        : last.source !== p[0].source
          ? {
              tone: "orange" as const,
              title: "From outside the practice",
              text: `This reading came from ${last.source} and has not been repeated here.`,
            }
          : undefined
  return {
    id: `marker:${m.id}`,
    kind: watch ? "watch" : "result",
    group: watch ? undefined : urgent ? "action" : m.isNew ? "review" : undefined,
    date: last.date,
    title: `Result out of range · ${m.name}`,
    line: `${last.value}${unitText(m)}, range ${m.range}.`,
    alert: prev ? `${rising ? "Up" : "Down"} from ${prev.value}.` : "First reading.",
    fact: prev ? `${m.name} ${prev.value} → ${last.value}` : `${m.name} ${last.value}`,
    short: m.name,
    source: last.source,
    category: watch ? "Watchlist" : "Out of range",
    sub: watch ? (worse ? `On watch and ${word}` : m.trend === "improving" ? "On watch and improving" : "On watch") : `Latest result ${above ? "above" : "below"} range`,
    figure: {
      label: watch ? "Current" : "Latest",
      value: String(last.value),
      unit: m.unit,
      sub: m.range ? `Range ${m.range}` : undefined,
      tone: watch ? "orange" : "red",
    },
    stats: [
      ...(prev ? [{ label: "Previous", value: String(prev.value) }] : []),
      ...(p.length > 2 ? [{ label: `First, ${day(first.date)}`, value: String(first.value) }] : []),
      ...(p.length > 1 ? [{ label: "Change", value: `${pct > 0 ? "+" : ""}${pct}%`, tone: worse ? ("red" as const) : undefined }] : []),
    ],
    note,
    marker: m,
    sections: [
      {
        title: "History",
        rows: [...p]
          .reverse()
          .slice(0, 5)
          .map((r) => ({ label: day(r.date), value: `${r.value}${unitText(m)} · ${r.source}`, tone: r.out ? ("red" as const) : undefined })),
      },
    ],
    actions: [
      { label: "View full trend", primary: true, run: () => ctx.onOpen("labs") },
      {
        label: "Order repeat",
        run: () => {
          ctx.dash.actions.orderRepeat(m.id, last.date)
          toast.success(`Repeat ${m.name} ordered`)
        },
      },
      {
        label: "Mark reviewed",
        run: () => {
          ctx.dash.actions.reviewOne(resultKey(m.id, last.date), (w) => w.type === "abnormal_result")
          toast.success(`${m.name} marked reviewed`)
        },
      },
    ],
  }
}

function medSubject(ctx: Ctx, c: MedCase): Subject {
  const tag = caseTag(c)
  const urgent = Boolean(c.other || c.allergy)
  const title = c.allergy
    ? `Allergy match · ${c.medication}`
    : c.other && c.practice
      ? `Medication change · ${c.medication} ${c.practice.dose} → ${c.other.dose}`
      : c.other
        ? `New medication · ${c.medication} ${c.other.dose}`
        : `Patient report · ${c.medication}`
  const by = c.other ? `${c.other.prescriber}, ${shortSource(c.other.source)}` : "the patient, in the app"
  return {
    id: `med:${c.key}`,
    kind: "med",
    group: urgent ? "action" : "review",
    date: c.date,
    title,
    line: c.other ? `By ${by}.` : `${c.answer?.answer}${c.answer?.note ? `: ${c.answer.note}` : ""}.`,
    alert: c.other ? "Not confirmed here." : "Your list may be out of date.",
    fact: c.other && c.practice ? `${c.medication} ${c.practice.dose} → ${c.other.dose}` : `${c.medication}: ${tag.label.toLowerCase()}`,
    short: c.medication,
    heading: c.medication,
    source: c.other ? shortSource(c.other.source) : undefined,
    category: urgent ? "Action needed" : "For review",
    sub: c.other ? `${tag.label} by ${shortSource(c.other.source)}` : tag.label,
    figure: c.other
      ? {
          label: c.practice ? "New dose" : "Dose",
          value: c.other.dose,
          sub: c.practice ? `${doseText(c.practice)} on your list, changed ${day(c.other.date)}` : `${c.other.frequency}, started ${day(c.other.date)}`,
          tone: "orange",
        }
      : { label: "Patient says", value: c.answer?.answer ?? "Not asked", sub: c.answer ? `In the app, ${day(c.answer.date)}` : undefined, tone: "violet" },
    note: c.allergy
      ? { tone: "red", title: "Matches a recorded allergy", text: `${c.medication} is listed by another source and matches the ${c.allergy} allergy on file.` }
      : c.other
        ? {
            tone: "orange",
            title: "Not yet confirmed here",
            text: `${shortSource(c.other.source)} lists ${doseText(c.other)}${c.practice ? `; your list still says ${doseText(c.practice)}` : " and it is not on your list"}.${
              c.answer ? ` The patient confirmed in the app: ${c.answer.answer.toLowerCase()}${c.answer.note ? `, ${c.answer.note}` : ""}.` : " The patient has not confirmed it yet."
            }`,
          }
        : undefined,
    med: c,
    sections: c.other
      ? [
          {
            title: "Change",
            rows: [
              { label: "From", value: c.practice ? doseText(c.practice) : "Not on your list" },
              { label: "To", value: doseText(c.other) },
              { label: "Changed by", value: c.other.prescriber },
              { label: "Source", value: shortSource(c.other.source) },
              { label: "Date", value: day(c.other.date) },
            ],
          },
        ]
      : [],
    actions: [
      ...(c.other
        ? [
            { label: "Confirm change", primary: true, run: () => confirm(ctx, c, "acknowledged") },
            { label: "Not current", run: () => confirm(ctx, c, "dismissed") },
          ]
        : [{ label: "Mark reviewed", primary: true, run: () => confirm(ctx, c, "acknowledged") }]),
      { label: "Open medications", run: () => ctx.onOpen("medications") },
    ],
  }
}

function orderSubject(ctx: Ctx, o: OrderRow): Subject {
  const s = orderState(o)
  const overdue = isOverdue(o.clock)
  const waits = ctx.model.data.reports.find((r) => r.orderRef === o.order)
  const reminders = o.reminderDates.length + (o.remindedAt ? 1 : 0)
  return {
    id: o.key,
    kind: "order",
    group: overdue ? "action" : "review",
    date: o.orderedAt,
    title: `Order outstanding · ${o.order}`,
    line: `Ordered ${day(o.orderedAt)}.`,
    alert: `${plural(s.days ?? 0, "day", "days")} open${overdue ? ", overdue" : ""}.`,
    fact: `${o.order} ${plural(s.days ?? 0, "day", "days")} open`,
    short: o.order,
    ref: o.order,
    category: overdue ? "Action needed" : "For review",
    sub: s.label,
    figure: { label: "Days open", value: String(s.days ?? 0), sub: `Ordered ${day(o.orderedAt)}, no result received`, tone: overdue ? "red" : "orange" },
    note: {
      tone: overdue ? "red" : "orange",
      title: overdue ? "Chase this first" : "Not scheduled yet",
      text: `${plural(reminders, "reminder", "reminders")} sent and ${o.scheduledAt ? "the booked date has passed" : "no appointment booked"}.${
        waits ? ` It follows the ${waits.report.toLowerCase()} (${waits.short ?? lowerFirst(waits.finding)}).` : ""
      }`,
    },
    sections: [
      {
        title: "Order",
        rows: [
          { label: "Placed", value: day(o.orderedAt) },
          { label: "Placed by", value: o.orderedBy },
          ...(o.facility ? [{ label: "Facility", value: o.facility }] : []),
          { label: "Appointment", value: o.scheduledAt ? day(o.scheduledAt) : "None booked", tone: o.scheduledAt ? undefined : ("orange" as const) },
          { label: "Reminders", value: String(reminders) },
        ],
      },
    ],
    actions: [
      {
        label: o.remindedAt ? "Reminder sent today" : "Send reminder",
        primary: true,
        run: () => {
          if (o.remindedAt) return
          ctx.dash.actions.remind(o.key)
          toast.success(`Reminder sent for ${o.order}`)
        },
        keepOpen: true,
      },
      {
        label: "Postpone 14 days",
        run: () => {
          ctx.dash.actions.postpone(o.key, 14)
          toast.success(`${o.order} postponed 14 days`, { action: { label: "Undo", onClick: () => ctx.dash.actions.undoTrack(o.key) } })
        },
      },
      {
        label: "Completed elsewhere",
        run: () => {
          ctx.dash.actions.close(o.key, "Completed elsewhere")
          toast.success(`${o.order} closed`, { action: { label: "Undo", onClick: () => ctx.dash.actions.undoTrack(o.key) } })
        },
      },
    ],
  }
}

/** A future order, a care gap, or a marker never tested. */
function careSubjects(ctx: Ctx): Subject[] {
  const { model, opt, optimized } = ctx
  const future = model.orders
    .filter((o) => o.clock.kind === "future")
    .map(
      (o): Subject => ({
        id: o.key,
        kind: "care",
        date: o.scheduledAt,
        title: o.order,
        line: o.facility ?? "",
        alert: day(o.scheduledAt!),
        fact: `${o.order} booked ${day(o.scheduledAt!)}`,
        short: o.order,
        category: "Future care",
        sub: `Booked for ${day(o.scheduledAt!)}`,
        figure: { label: "Status", value: "Booked", sub: `${day(o.scheduledAt!)}${o.facility ? `, ${o.facility}` : ""}` },
        sections: [
          {
            title: "Order",
            rows: [
              { label: "Placed", value: day(o.orderedAt) },
              { label: "Placed by", value: o.orderedBy },
              { label: "Appointment", value: day(o.scheduledAt!) },
            ],
          },
        ],
        actions: [{ label: "Close", primary: true, run: () => {} }],
      })
    )
  const gaps = model.gaps.map((g: GapRow): Subject => {
    const overdue = isOverdue(g.clock)
    return {
      id: g.key,
      kind: "care",
      date: g.due,
      title: g.gap,
      line: g.gapType,
      alert: overdue ? "Overdue" : `Due ${day(g.due)}`,
      fact: `${g.gap} ${overdue ? "overdue" : "due"}`,
      short: g.gap,
      category: "Future care",
      sub: `${g.gapType} care gap`,
      figure: { label: "Status", value: overdue ? "Overdue" : "Due", sub: `Due ${day(g.due)}`, tone: "orange" },
      note: {
        tone: "orange",
        title: overdue ? "Past due" : "Coming due",
        text: `${g.lastDone ? `Last done ${day(g.lastDone)}` : "Never done"}; ${plural(g.remindersSent, "reminder", "reminders")} sent.`,
      },
      sections: [
        {
          title: "Detail",
          rows: [
            { label: "Type", value: g.gapType },
            { label: "Last done", value: g.lastDone ? day(g.lastDone) : "Never", tone: g.lastDone ? undefined : "orange" },
            { label: "Due", value: day(g.due) },
          ],
        },
      ],
      actions: [
        {
          label: "Send reminder",
          primary: true,
          keepOpen: true,
          run: () => {
            ctx.dash.actions.remind(g.key)
            toast.success(`Reminder sent for ${g.gap}`)
          },
        },
        { label: "Postpone 30 days", run: () => ctx.dash.actions.postpone(g.key, 30) },
        { label: "Completed elsewhere", run: () => ctx.dash.actions.close(g.key, "Completed elsewhere") },
      ],
    }
  })
  /* An optimization member's markers never tested: a gap, not a neutral value. */
  const untested =
    optimized && opt.model
      ? opt.model.data.snapshot.bands["Not yet tested"].map(
          (r): Subject => ({
            id: `untested:${r.name}`,
            kind: "care",
            title: r.name,
            line: r.whatToDo,
            alert: "Never tested",
            fact: `${r.name} never tested`,
            short: r.name,
            category: "Future care",
            sub: "Not yet tested",
            figure: { label: "Status", value: "Never tested", tone: "orange" },
            note: { tone: "orange", title: "A missing piece", text: r.whatToDo || `${r.name} has no result on record.` },
            sections: [{ title: "Detail", rows: [{ label: "Target", value: r.target || "None" }] }],
            actions: [
              {
                label: "Order test",
                primary: true,
                run: () => {
                  opt.actions.orderTest(r.name)
                  toast.success(`${r.name} added to the next order`)
                },
              },
            ],
          })
        )
      : []
  return [...gaps.filter((g) => g.alert === "Overdue"), ...untested, ...gaps.filter((g) => g.alert !== "Overdue"), ...future]
}

type ProgramRow = Subject & { status: "Active" | "Eligible" | "Consider" }

function programSubjects(ctx: Ctx, patientName: string): ProgramRow[] {
  const { model, opt, optimized } = ctx
  if (optimized && opt.model) {
    const o = opt.model
    return PROGRAMS.map((p) => {
      const view = buildProgram(p, o)
      const lead = view.kpis[0] as Biomarker | undefined
      const goal = lead && view.goal(lead)
      const done = goal ? Math.round(goalProgress(goal)) : undefined
      const week = Math.floor(daysSince(p.since) / 7) + 1
      return {
        id: `program:${p.id}`,
        kind: "program",
        status: "Active",
        title: p.name,
        line: `Week ${week}`,
        fact: p.name,
        short: p.name,
        category: "Program",
        sub: `Enrolled ${day(p.since)}`,
        figure: { label: "Status", value: "Active", sub: `Week ${week}`, tone: "green" },
        stats: goal
          ? [
              { label: "Lead goal", value: goal.goalLabel },
              { label: "Now", value: `${goal.current} ${goal.unit}` },
              { label: "Progress", value: `${done}%` },
            ]
          : undefined,
        note: goal ? { tone: "green", title: goal.status, text: goal.projection } : undefined,
        sections: [
          {
            title: "Program",
            rows: [
              { label: "Enrolled", value: day(p.since) },
              { label: "Markers followed", value: String(view.markers.length) },
              { label: "Priorities", value: String(view.priorities.length) },
            ],
          },
        ],
        actions: [{ label: "Show plan", primary: true, run: ctx.showPlan }],
      }
    })
  }
  /* A free member: programs their problems make them a fit for. */
  const problems = model.data.conditions
  const a1c = problems.find((c) => c.controlMarker === "hba1c")
  const lipids = problems.find((c) => c.controlMarker === "ldl")
  const rows: ProgramRow[] = []
  const recommend = (name: string, why: string) => () => {
    ctx.dash.actions.recommend([name], why)
    toast.success(`${name} recommended to ${patientName}`)
  }
  for (const [p, cond, status] of [
    [PROGRAMS.find((x) => x.id === "diabetes"), a1c, "Eligible"],
    [PROGRAMS.find((x) => x.id === "weight"), a1c ?? lipids, "Consider"],
  ] as const) {
    if (!p || !cond) continue
    const lab = model.data.labs.find((l) => l.code === (cond.controlMarker === "hba1c" ? "4548-4" : "13457-7"))
    const m = lab && fromLab(lab, false)
    const why = m ? `${cond.name}, ${m.name} ${m.points.map((x) => x.value).join(" → ")}` : cond.name
    rows.push({
      id: `program:${p.id}`,
      kind: "program",
      status,
      title: p.name,
      line: cond.name,
      fact: p.name,
      short: p.name,
      category: "Program",
      sub: status === "Eligible" ? `Fits ${cond.name.toLowerCase()}` : "Worth considering",
      figure: { label: "Status", value: status, sub: "Free member", tone: status === "Eligible" ? "blue" : "orange" },
      note: { tone: status === "Eligible" ? "blue" : "orange", title: "Why it fits", text: `${why}.` },
      sections: [
        {
          title: "Eligibility",
          rows: [
            { label: "Problem", value: `${cond.name} (${cond.icd10})` },
            ...(m ? [{ label: m.name, value: `${m.points[m.points.length - 1].value}${unitText(m)}`, tone: statusOf(lab!) === "In range" ? undefined : ("red" as const) }] : []),
            { label: "Membership", value: "Free" },
          ],
        },
      ],
      actions: [
        { label: "Recommend optimization", primary: true, run: recommend(p.name, why) },
        { label: "Not now", run: () => {} },
      ],
    })
  }
  return rows
}

/* ------------------------------------------------------------- pieces -- */

/** A list row that opens its subject: title, line with its alert, date, chevron. */
function SubjectRow({
  s,
  tone,
  right,
  onOpen,
}: {
  s: Subject
  tone?: ToneKey
  right?: React.ReactNode
  onOpen: (s: Subject, from: HTMLElement) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={(e) => onOpen(s, e.currentTarget)}
        className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-row-hover", FOCUS)}
      >
        {tone && <span aria-hidden className={cn("size-2 shrink-0 rounded-full", TONE[tone].solid)} />}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{s.title}</span>
          {(s.line || s.alert) && (
            <span className="text-[13px] text-muted-foreground">
              {s.line}
              {s.alert && tone && <span className={cn("ml-1 font-medium", TONE[tone].text)}>{s.alert}</span>}
            </span>
          )}
        </span>
        {right ?? (s.date && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{day(s.date)}</span>)}
        <KitIcon icon={ArrowRight01Icon} size={14} className="shrink-0 text-muted-foreground" />
      </button>
    </li>
  )
}

function DecisionBand({
  lead,
  related,
  reviewAt,
  onOpen,
  onReviewAll,
}: {
  lead: Subject
  related: Subject[]
  reviewAt?: string
  onOpen: (s: Subject, from: HTMLElement) => void
  onReviewAll: () => void
}) {
  const since = reviewAt ? `since your review on ${day(reviewAt)}` : "since the record arrived"
  const tail = related.length ? `, and ${plural(related.length, "related change has", "related changes have")} landed ${since}` : ""
  const headline =
    lead.kind === "visit"
      ? `${lead.short} for ${lowerFirst(lead.figure.value)} on ${day(lead.date!)}${tail}.`
      : lead.kind === "order"
        ? `${lead.short} has gone ${lead.figure.value} days without a result${tail}.`
        : lead.kind === "result"
          ? `${lead.short} is out of range at ${lead.figure.value}${lead.figure.unit ? ` ${lead.figure.unit}` : ""}${tail}.`
          : lead.kind === "med" && lead.med?.other
            ? `${lead.short}: ${lead.med.practice ? `${doseText(lead.med.practice)} on your list, ${doseText(lead.med.other)}` : `${doseText(lead.med.other)} started`} at ${shortSource(lead.med.other.source)}${tail}.`
            : `${lead.title}${tail}.`
  return (
    <section
      aria-label="Decide today"
      className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-5 pl-6 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-destructive md:flex-row md:items-center"
    >
      <Pill tone="red" className="self-start">
        Decide today
      </Pill>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="text-[15px] leading-6 font-semibold">{headline}</h3>
        <p className="text-[13px] text-muted-foreground">{[lead, ...related].map((s) => s.fact).join(" · ")}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button onClick={(e) => onOpen(lead, e.currentTarget)}>Review {lowerFirst(lead.short)}</Button>
        <Button variant="outline" onClick={onReviewAll}>
          Mark all reviewed
        </Button>
      </div>
    </section>
  )
}

function SubjectPanel({ s }: { s: Subject }) {
  const f = s.figure
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{f.label}</span>
        <span className={cn("text-4xl leading-tight font-semibold tabular-nums", f.tone && TONE[f.tone].text)}>
          {f.value}
          {f.unit && <span className="ml-1.5 text-sm font-normal text-muted-foreground">{f.unit}</span>}
        </span>
        {f.sub && <span className="text-[13px] text-muted-foreground">{f.sub}</span>}
      </div>
      {s.stats && s.stats.length > 0 && (
        <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t pt-4">
          {s.stats.map((r) => (
            <div key={r.label} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{r.label}</dt>
              <dd className={cn("text-base font-semibold tabular-nums", r.tone && TONE[r.tone].text)}>{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {s.note && (
        <div className={cn("flex flex-col gap-1 rounded-xl px-4 py-3", TONE[s.note.tone].soft)}>
          <span className={cn("text-sm font-semibold", TONE[s.note.tone].text)}>{s.note.title}</span>
          <p className="text-[13px] leading-5 text-foreground/80">{s.note.text}</p>
        </div>
      )}
      {s.marker && s.marker.points.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">
            {s.marker.name} trend
            {s.marker.unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{s.marker.unit}</span>}
          </span>
          <TrendChart
            points={s.marker.points.map((p) => ({ date: p.date.slice(0, 10), value: p.value }))}
            low={s.marker.low}
            high={s.marker.high}
            unit={s.marker.unit}
            latestOut={s.marker.points[s.marker.points.length - 1].out}
            label={`${s.marker.name} over time, range band shaded`}
            height={200}
          />
        </div>
      )}
      {s.med && (
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            {
              label: "Your list",
              value: s.med.practice ? doseText(s.med.practice) : "Not on your list",
              meta: s.med.practice ? `${s.med.practice.prescriber}, ${day(s.med.practice.date)}` : undefined,
            },
            {
              label: "Other record",
              value: s.med.other ? doseText(s.med.other) : "No other source",
              meta: s.med.other ? `${s.med.other.prescriber}, ${shortSource(s.med.other.source)}` : undefined,
              tone: s.med.other ? ("orange" as const) : undefined,
            },
            {
              label: "Patient confirmed",
              value: s.med.answer ? s.med.answer.answer : "Not asked yet",
              meta: s.med.answer ? `${s.med.answer.note ? `${s.med.answer.note}, ` : ""}${day(s.med.answer.date)}` : undefined,
              tone: s.med.answer && s.med.answer.answer !== "Taking" ? ("violet" as const) : undefined,
            },
          ].map((b) => (
            <div key={b.label} className="flex flex-col gap-0.5 rounded-xl bg-surface-head px-3 py-2.5">
              <span className="text-xs text-muted-foreground">{b.label}</span>
              <span className={cn("text-sm font-medium", b.tone && TONE[b.tone].text)}>{b.value}</span>
              {b.meta && <span className="text-xs text-muted-foreground">{b.meta}</span>}
            </div>
          ))}
        </div>
      )}
      {s.sections.map((sec) => (
        <section key={sec.title} className="flex flex-col gap-2 border-t pt-4">
          <h4 className="text-xs font-medium text-muted-foreground">{sec.title}</h4>
          <dl className="flex flex-col gap-1.5">
            {sec.rows.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-4 text-[13px]">
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd className={cn("text-right font-medium tabular-nums", r.tone && TONE[r.tone].text)}>{r.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------- dashboard -- */

const PLAN_ID = "dashboard-v4-plan"

export function DecisionDashboard({
  dash,
  opt,
  optimized,
  patientName,
  onOpen,
}: {
  dash: Dashboard
  opt: Optimization
  optimized: boolean
  patientName: string
  onOpen: OpenSection
}) {
  const { ready, model } = dash
  const [open, setOpen] = React.useState<{ id: string; list: string[] } | null>(null)
  const [from, setFrom] = React.useState<HTMLElement | null>(null)
  const [planId, setPlanId] = React.useState(PROGRAMS[0].id)
  const program = PROGRAMS.find((p) => p.id === planId) ?? PROGRAMS[0]
  const programView = React.useMemo(
    () => (optimized && opt.model ? buildProgram(program, opt.model) : null),
    [optimized, opt.model, program]
  )

  const view = React.useMemo(() => {
    if (!ready) return null
    const ctx: Ctx = {
      dash,
      model,
      opt,
      optimized,
      onOpen,
      close: () => setOpen(null),
      showPlan: () => {
        setOpen(null)
        document.getElementById(PLAN_ID)?.scrollIntoView({ behavior: "smooth", block: "start" })
      },
    }
    const reviewAt = model.review?.at
    const cutoff = reviewAt ?? new Date(new Date(NOW).getTime() - 90 * 86_400_000).toISOString().slice(0, 10)
    const tracker = optimized ? (opt.model?.data.biomarkers ?? []) : []
    const band = (key: "Out of target" | "On watch") =>
      (opt.model?.data.snapshot.bands[key] ?? [])
        .map((r) => markerByName(tracker, r.name))
        .filter((b): b is Biomarker => Boolean(b))
        .map((b) => fromBiomarker(b, cutoff, key === "On watch"))
    const out = (optimized ? band("Out of target") : model.outOfRange.map((l) => fromLab(l, false, cutoff)))
      .filter((m): m is Marker => Boolean(m))
      .sort(byChange)
    const watch = (
      optimized
        ? band("On watch")
        : model.trending.filter((l) => statusOf(l) === "In range").map((l) => fromLab(l, true, cutoff))
    )
      .filter((m): m is Marker => Boolean(m))
      .sort(byChange)
    const urgentCodes = new Set(model.urgent.filter((u) => u.target.kind === "result").map((u) => (u.target as { code: string }).code))

    const visits = model.encounters.filter((e) => !e.reviewed).map((e) => visitSubject(ctx, e))
    const reports = model.reports.map((r) => reportSubject(ctx, r))
    const results = out.map((m) => markerSubject(ctx, m, false, urgentCodes.has(m.id) || m.flag === "Critical"))
    const watches = watch.map((m) => markerSubject(ctx, m, true, false))
    const meds = model.cases.map((c) => medSubject(ctx, c))
    const orders = model.orders.filter((o) => o.clock.kind === "running").map((o) => orderSubject(ctx, o))
    const care = careSubjects(ctx)
    const programs = programSubjects(ctx, patientName)

    /* Triage: red before amber; inside a group, what is most pressing first. */
    const weight = (s: Subject) =>
      s.kind === "visit"
        ? 0
        : s.kind === "med" && s.med?.allergy
          ? 0.5
          : s.kind === "result"
            ? 1
            : s.kind === "report"
              ? 2
              : s.kind === "order"
                ? 2.5
                : 3
    const updates = [...visits, ...results, ...reports, ...meds, ...orders]
      .filter((s) => s.group)
      .sort((a, b) => Number(a.group === "review") - Number(b.group === "review") || weight(a) - weight(b))

    /* The band: the most pressing action, and what landed within a week of it. */
    const lead = updates.find((s) => s.group === "action")
    /* Related: other actions within a week of it, anything from the same
       source, and a report that the lead order waits on (or the reverse). */
    const related = lead
      ? updates.filter(
          (s) =>
            s !== lead &&
            ((s.group === "action" && s.date && lead.date && Math.abs(daysSince(s.date) - daysSince(lead.date)) <= 7) ||
              (s.source && s.source === lead.source) ||
              (s.ref && s.ref === lead.ref))
        )
      : []

    const all = [...updates, ...results.filter((s) => !s.group), ...watches, ...care, ...programs]
    const byId = new Map(all.map((s) => [s.id, s]))
    return { updates, lead, related, results, watches, care, programs, byId, reviewAt, cutoff }
  }, [ready, model, opt, optimized, onOpen, dash, patientName])

  if (!ready || !view)
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <CardSkeleton rows={2} />
        <CardSkeleton rows={6} />
      </div>
    )

  const openSubject = (list: Subject[]) => (s: Subject, el: HTMLElement) => {
    setFrom(el)
    setOpen({ id: s.id, list: list.map((x) => x.id) })
  }
  const current = open ? view.byId.get(open.id) : undefined
  const index = open && current ? open.list.indexOf(current.id) : -1
  const step = (d: number) => open && setOpen({ ...open, id: open.list[index + d] })

  const action = view.updates.filter((s) => s.group === "action")
  const review = view.updates.filter((s) => s.group === "review")
  const reviewAll = () => {
    dash.actions.review()
    toast.success(model.validation ? "Record validated" : "Everything marked reviewed")
  }

  const pair = (a: React.ReactNode | null, b: React.ReactNode | null) =>
    a || b ? (
      <div className={cn("grid grid-cols-1 gap-4", a && b && "xl:grid-cols-2")}>
        {a}
        {b}
      </div>
    ) : null

  return (
    <div className={cn("flex flex-col gap-4", TYPE_SCALE)}>
      {view.lead ? (
        <DecisionBand
          lead={view.lead}
          related={view.related}
          reviewAt={view.reviewAt}
          onOpen={openSubject([view.lead, ...view.related])}
          onReviewAll={reviewAll}
        />
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-5 py-4">
          <KitIcon icon={CheckmarkCircle02Icon} size={18} className={TONE.green.text} />
          <span className="flex-1 text-sm font-medium">Nothing needs a decision today</span>
          <ReviewButton dash={dash} />
        </div>
      )}

      {view.updates.length > 0 && (
        <Widget
          icon={Notification03Icon}
          title="Important updates"
          count={view.updates.length}
          action={
            <span className="text-xs font-normal text-muted-foreground tabular-nums">
              {view.reviewAt ? `New since ${day(view.reviewAt)}` : "Last 90 days"}
            </span>
          }
          flush
        >
          {[
            ["action", action],
            ["review", review],
          ].map(([g, list]) =>
            (list as Subject[]).length ? (
              <div key={g as string} className="flex flex-col">
                <h4 className={cn("px-4 pt-3 pb-1 text-xs font-semibold", TONE[GROUP_TONE[g as Group]].text)}>
                  {GROUP_LABEL[g as Group]}
                </h4>
                <ul className="divide-y">
                  {(list as Subject[]).map((s) => (
                    <SubjectRow key={s.id} s={s} tone={GROUP_TONE[g as Group]} onOpen={openSubject(view.updates)} />
                  ))}
                </ul>
              </div>
            ) : null
          )}
        </Widget>
      )}

      {pair(
        view.results.length > 0 ? (
          <Widget icon={TestTube01Icon} title="Out of range" count={view.results.length} flush>
            <ul className="divide-y">
              {view.results.map((s) => {
                const m = s.marker!
                const last = m.points[m.points.length - 1]
                const prev = m.points[m.points.length - 2]
                return (
                  <SubjectRow
                    key={s.id}
                    s={{ ...s, title: m.name, line: "", alert: undefined }}
                    onOpen={openSubject(view.results)}
                    right={
                      <HoverCard>
                        <HoverCardTrigger delay={150} render={<span className="flex items-baseline gap-1.5" />}>
                          <span className={cn("text-lg font-semibold tabular-nums", TONE.red.text)}>{last.value}</span>
                          {m.unit && <span className="text-xs text-muted-foreground">{m.unit}</span>}
                          <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                            {prev ? `${last.value > prev.value ? "up" : "down"} from ${prev.value}` : "first reading"}
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent side="left" align="start" className="w-80 rounded-2xl">
                          <TrendWindow m={m} onOpen={() => onOpen("labs")} />
                        </HoverCardContent>
                      </HoverCard>
                    }
                  />
                )
              })}
            </ul>
          </Widget>
        ) : null,
        view.watches.length > 0 ? (
          <Widget icon={ChartLineData01Icon} title="Watchlist and trends" count={view.watches.length} flush>
            <ul className="divide-y">
              {view.watches.map((s) => {
                const m = s.marker!
                return (
                  <SubjectRow
                    key={s.id}
                    s={{ ...s, title: m.name, line: m.range ? `Range ${m.range}${unitText(m)}` : "", alert: undefined }}
                    onOpen={openSubject(view.watches)}
                    right={
                      <span className="flex items-center gap-3">
                        <DotTrend points={m.points} low={m.low} high={m.high} label={`${m.name}, last readings`} />
                        <span
                          className={cn(
                            "w-16 text-xs font-semibold",
                            m.trend === "worsening" ? TONE.orange.text : m.trend === "improving" ? TONE.green.text : "text-muted-foreground"
                          )}
                        >
                          {m.trend === "worsening" ? (m.rising ? "rising" : "declining") : m.trend === "improving" ? "improving" : "stable"}
                        </span>
                      </span>
                    }
                  />
                )
              })}
            </ul>
          </Widget>
        ) : null
      )}

      {pair(
        view.care.length > 0 ? (
          <Widget icon={Calendar03Icon} title="Future care and follow up" count={view.care.length} flush>
            <ul className="divide-y">
              {view.care.map((s) => (
                <SubjectRow
                  key={s.id}
                  s={{ ...s, alert: undefined }}
                  onOpen={openSubject(view.care)}
                  right={
                    <span
                      className={cn(
                        "shrink-0 text-xs tabular-nums",
                        s.alert === "Overdue" || s.alert === "Never tested" ? cn("font-semibold", TONE.orange.text) : "text-muted-foreground"
                      )}
                    >
                      {s.alert}
                    </span>
                  }
                />
              ))}
            </ul>
          </Widget>
        ) : null,
        view.programs.length > 0 ? (
          <Widget icon={Target02Icon} title="Optimization programs" count={view.programs.length} flush>
            <ul className="divide-y">
              {view.programs.map((s) => (
                <SubjectRow
                  key={s.id}
                  s={s}
                  onOpen={openSubject(view.programs)}
                  right={
                    <Pill tone={s.status === "Active" ? "green" : s.status === "Eligible" ? "blue" : "orange"}>{s.status}</Pill>
                  }
                />
              ))}
            </ul>
          </Widget>
        ) : null
      )}

      {programView && opt.model && (
        <div id={PLAN_ID} className="scroll-mt-3">
          <ProgramPanel opt={opt.model} program={program} view={programView} onProgram={setPlanId} />
        </div>
      )}

      {view.updates.length === 0 && view.results.length === 0 && view.watches.length === 0 && (
        <Quiet>No results out of range, discrepancies, open orders or outside care.</Quiet>
      )}

      {current && (
        <SidePanel
          open
          onClose={() => setOpen(null)}
          returnFocus={{ current: from }}
          title={current.heading ?? (current.title.includes(" · ") ? current.title.split(" · ").slice(1).join(" · ") : current.title)}
          meta={
            <>
              <Pill tone={current.group ? GROUP_TONE[current.group] : current.kind === "watch" ? "orange" : "blue"}>
                {current.category}
              </Pill>
              <span>{current.sub}</span>
            </>
          }
          index={index}
          total={open!.list.length}
          onPrevious={index > 0 ? () => step(-1) : undefined}
          onNext={index < open!.list.length - 1 ? () => step(1) : undefined}
          actions={current.actions.map((a) => (
            <Button
              key={a.label}
              variant={a.primary ? "default" : "outline"}
              onClick={() => {
                a.run()
                if (!a.keepOpen) setOpen(null)
              }}
            >
              {a.label}
            </Button>
          ))}
        >
          <SubjectPanel s={current} />
        </SidePanel>
      )}
    </div>
  )
}
