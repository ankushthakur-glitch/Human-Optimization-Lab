import * as React from "react"

import { cn } from "@/lib/utils"

import { Alert02Icon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/dashboard-kit-v2"
import { daysSince, fmtDate, fmtInt } from "@/components/provider/home-v2/clock"
import {
  DayBadge,
  ItemVisual,
  OutsideBadge,
  PriorityBadge,
  TYPE_META,
  itemDetail,
  itemTitle,
  labValue,
  medicationBadgeText,
  outOfRange,
} from "@/components/provider/home-v2/labels"
import { gapDaysLate, orderDays } from "@/components/provider/home-v2/selectors"
import type { AbnormalResult, ItemType, QueueItem, WorkItemOf } from "@/components/provider/home-v2/types"
import type { WorklistTab } from "@/components/provider/home-v2/worklist"

/* The Worklist's columns after Patient, one set per tab, so each type
   shows the facts its decision turns on: a result's status and
   trend; a medication's two entries; an order's wait and reminders; a
   gap's due date; a review's deadline. Urgent and All mix types, so they
   keep a general Type, Item and Detail layout. */

export type Column = {
  key: string
  head: string
  /** The column's width in px: what its widest value needs plus room to
      breathe. The table grows the columns in proportion when wider. */
  width: number
  align?: "right"
  cell: (item: QueueItem) => React.ReactNode
}

/* Only the patient name is dark; every other cell is a lighter grey, with
   its second line lighter still. */
const TEXT = "text-sm text-muted-foreground tabular-nums"
const SUB = "text-xs text-muted-foreground/70 tabular-nums"

/** Two lines: a main value over a lighter one. */
function Stack({ main, sub }: { main: React.ReactNode; sub?: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className={TEXT}>{main}</span>
      {sub && <span className={SUB}>{sub}</span>}
    </div>
  )
}

const Muted = ({ children }: { children: React.ReactNode }) => (
  <span className="text-sm text-muted-foreground/70">{children}</span>
)

function Source({ item }: { item: QueueItem }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", TEXT)}>
      <span>{item.source}</span>
      {item.isOutsideSource && <OutsideBadge />}
    </span>
  )
}

/** Days until (or past) a date, as words. */
function dueIn(iso: string) {
  const d = -daysSince(iso)
  if (d === 0) return "Due today"
  return d > 0 ? `In ${fmtInt(d)} ${d === 1 ? "day" : "days"}` : `${fmtInt(-d)} ${d === -1 ? "day" : "days"} late`
}

/** A result reads Normal, Abnormal or Critical. */
function ResultStatus({ r }: { r: AbnormalResult }) {
  if (r.flag === "Critical")
    return (
      <Badge tone="error" icon={Alert02Icon}>
        Critical
      </Badge>
    )
  const v = r.history?.length ? r.history[r.history.length - 1]!.value : Number(r.value)
  if (r.kind === "lab" && !Number.isNaN(v) && !outOfRange(v, r))
    return (
      <Badge tone="success" dot>
        Normal
      </Badge>
    )
  return (
    <Badge tone="error" dot>
      Abnormal
    </Badge>
  )
}

const priority: Column = {
  key: "priority",
  head: "Priority",
  width: 130,
  cell: (i) => <PriorityBadge priority={i.priority} />,
}

/* Each typed column reads its own payload; the casts are safe because a
   type tab only lists items of that type. */
const as = <T extends ItemType>(i: QueueItem) => i as WorkItemOf<T> & QueueItem

const RESULTS: Column[] = [
  priority,
  {
    key: "test",
    head: "Test",
    width: 280,
    cell: (i) => {
      const r = as<"abnormal_result">(i).payload
      return <Stack strong main={r.name} sub={r.kind === "lab" ? "Lab" : "Report"} />
    },
  },
  {
    key: "result",
    head: "Result",
    width: 280,
    cell: (i) => {
      const r = as<"abnormal_result">(i).payload
      return (
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className={TEXT}>{r.kind === "lab" ? labValue(r) : r.value}</span>
          <ResultStatus r={r} />
        </span>
      )
    },
  },
  { key: "source", head: "Source", width: 260, cell: (i) => <Source item={i} /> },
  {
    key: "resulted",
    head: "Resulted",
    width: 130,
    cell: (i) => <span className={TEXT}>{fmtDate(as<"abnormal_result">(i).payload.resultedAt)}</span>,
  },
]

const MEDICATIONS: Column[] = [
  priority,
  {
    key: "medication",
    head: "Medication",
    width: 260,
    cell: (i) => <Stack strong main={as<"medication_change">(i).payload.medication} sub={as<"medication_change">(i).payload.changedBy ?? "Patient"} />,
  },
  {
    key: "change",
    head: "Change",
    width: 200,
    cell: (i) => (
      <Badge tone="warning" dot>
        {medicationBadgeText(as<"medication_change">(i).payload)}
      </Badge>
    ),
  },
  { key: "source", head: "Source", width: 260, cell: (i) => <Source item={i} /> },
  {
    key: "reported",
    head: "Reported",
    width: 130,
    cell: (i) => <span className={TEXT}>{fmtDate(as<"medication_change">(i).payload.date)}</span>,
  },
]

const ORDERS: Column[] = [
  priority,
  {
    key: "order",
    head: "Order",
    width: 300,
    cell: (i) => <Stack strong main={as<"overdue_order">(i).payload.order} sub={`by ${as<"overdue_order">(i).payload.orderedBy}`} />,
  },
  {
    key: "ordered",
    head: "Ordered",
    width: 130,
    cell: (i) => <span className={TEXT}>{fmtDate(as<"overdue_order">(i).payload.orderedAt)}</span>,
  },
  {
    key: "status",
    head: "Status",
    width: 200,
    cell: (i) => {
      const o = as<"overdue_order">(i).payload
      return o.scheduledAt ? (
        <Stack main="Missed" sub={`Booked ${fmtDate(o.scheduledAt)}`} />
      ) : (
        <Stack main="Not scheduled" sub="Patient never booked" />
      )
    },
  },
  {
    key: "waiting",
    head: "Overdue",
    width: 130,
    cell: (i) => <DayBadge day={orderDays(as<"overdue_order">(i).payload)} />,
  },
  {
    key: "reminders",
    head: "Reminders",
    width: 170,
    cell: (i) => {
      const o = as<"overdue_order">(i).payload
      return <Stack main={`${o.remindersSent} of ${o.remindersMax} sent`} sub={`Last ${fmtDate(o.reminderDates[o.reminderDates.length - 1]!)}`} />
    },
  },
]

const CARE_GAPS: Column[] = [
  priority,
  { key: "gap", head: "Gap", width: 320, cell: (i) => <Stack strong main={as<"care_gap">(i).payload.gap} sub={as<"care_gap">(i).source} /> },
  {
    key: "type",
    head: "Type",
    width: 120,
    cell: (i) => <Badge tone="light">{as<"care_gap">(i).payload.gapType}</Badge>,
  },
  {
    key: "last",
    head: "Last done",
    width: 120,
    cell: (i) => {
      const g = as<"care_gap">(i).payload
      return g.lastDone ? <span className={TEXT}>{fmtDate(g.lastDone)}</span> : <Muted>Never</Muted>
    },
  },
  {
    key: "due",
    head: "Due",
    width: 130,
    cell: (i) => <span className={TEXT}>{fmtDate(as<"care_gap">(i).payload.due)}</span>,
  },
  {
    key: "late",
    head: "Overdue",
    width: 120,
    cell: (i) => {
      const late = gapDaysLate(as<"care_gap">(i).payload)
      return late > 0 ? <DayBadge day={late} /> : <Muted>Due today</Muted>
    },
  },
  {
    key: "reminders",
    head: "Reminders",
    width: 130,
    cell: (i) => <span className={TEXT}>{fmtInt(as<"care_gap">(i).payload.remindersSent)} sent</span>,
  },
]

const REVIEWS: Column[] = [
  priority,
  { key: "review", head: "Review", width: 280, cell: (i) => <Stack strong main={as<"review_due">(i).payload.review} /> },
  { key: "prepared", head: "Prepared by", width: 160, cell: (i) => <span className={TEXT}>{i.source}</span> },
  {
    key: "last",
    head: "Last review",
    width: 130,
    cell: (i) => {
      const r = as<"review_due">(i).payload
      return r.lastReview ? <span className={TEXT}>{fmtDate(r.lastReview)}</span> : <Muted>None</Muted>
    },
  },
  {
    key: "due",
    head: "Due",
    width: 150,
    cell: (i) => {
      const r = as<"review_due">(i).payload
      return <Stack main={fmtDate(r.due)} sub={dueIn(r.due)} />
    },
  },
  {
    key: "received",
    head: "Received",
    width: 130,
    cell: (i) => <span className={TEXT}>{fmtDate(i.createdAt)}</span>,
  },
]

const MIXED: Column[] = [
  priority,
  { key: "type", head: "Type", width: 130, cell: (i) => <span className={TEXT}>{TYPE_META[i.type].word}</span> },
  { key: "item", head: "Item", width: 300, cell: (i) => <Stack strong main={itemTitle(i)} sub={itemDetail(i)} /> },
  { key: "detail", head: "Detail", width: 280, cell: (i) => <ItemVisual item={i} /> },
  { key: "date", head: "Date", width: 130, cell: (i) => <span className={TEXT}>{fmtDate(i.createdAt)}</span> },
]

export function columnsFor(tab: WorklistTab): Column[] {
  switch (tab) {
    case "abnormal_result":
      return RESULTS
    case "medication_change":
      return MEDICATIONS
    case "overdue_order":
      return ORDERS
    case "care_gap":
      return CARE_GAPS
    case "review_due":
      return REVIEWS
    default:
      return MIXED
  }
}
