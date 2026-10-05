import * as React from "react"
import Link from "next/link"
import {
  Alert02Icon,
  ArrowDown02Icon,
  ArrowUp02Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  ClipboardIcon,
  Clock01Icon,
  DiamondIcon,
  Hospital01Icon,
  InformationCircleIcon,
  PillIcon,
  TestTube01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { type Patient, fullName } from "@/components/practice/practice-data"
import { Badge, FOCUS, type IconDef, Sparkline } from "@/components/dashboard-kit-v2"
import { ageAt, fmtDate, fmtInt } from "@/components/provider/home-v2/clock"
import { gapDaysLate, orderDays } from "@/components/provider/home-v2/selectors"
import type {
  AbnormalResult,
  ItemType,
  MedicationChange,
  Priority,
  ResultFlag,
  WorkItem,
} from "@/components/provider/home-v2/types"

/* How a work item reads wherever it appears: the per-type labels, the
   badges for priority and flags, the row title and detail, and the single
   visual on the right of an item row. Red is clinical; amber is process. */

export const TYPE_META: Record<
  ItemType,
  { metric: string; slug: string; icon: IconDef; noun: [string, string]; word: string }
> = {
  abnormal_result: { metric: "Abnormal results", slug: "results", icon: TestTube01Icon, noun: ["result", "results"], word: "Result" },
  medication_change: { metric: "Medication changes", slug: "medications", icon: PillIcon, noun: ["medication", "medications"], word: "Medication" },
  overdue_order: { metric: "Overdue orders", slug: "orders", icon: ClipboardIcon, noun: ["order", "orders"], word: "Order" },
  outside_care: { metric: "Outside care", slug: "outside-care", icon: Hospital01Icon, noun: ["outside visit", "outside visits"], word: "Outside visit" },
  care_gap: { metric: "Care gaps", slug: "care-gaps", icon: Calendar03Icon, noun: ["gap", "gaps"], word: "Gap" },
  review_due: { metric: "Reviews due", slug: "reviews", icon: CheckmarkCircle02Icon, noun: ["review", "reviews"], word: "Review" },
}

export const plural = (n: number, [one, many]: [string, string]) => `${fmtInt(n)} ${n === 1 ? one : many}`

export const chartHref = (patientId: string, section?: string) =>
  `/screens/patients/${patientId}${section ? `?section=${section}` : ""}`

export const ageSex = (p: Patient) => `${ageAt(p.dob)} y · ${p.sex.charAt(0)}`

/* ------------------------------------------------------------ badges -- */

export const PRIORITIES: Priority[] = ["urgent", "moderate", "routine"]

export const PRIORITY_WORD: Record<Priority, string> = {
  urgent: "Urgent",
  moderate: "Moderate",
  routine: "Routine",
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === "urgent")
    return (
      <Badge tone="error" icon={Alert02Icon}>
        Urgent
      </Badge>
    )
  /* Moderate is orange: the theme's warning token is a dark amber
     kept for text contrast, which reads brown at badge size. */
  return priority === "moderate" ? (
    <Badge tone="warning" dot className="bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
      Moderate
    </Badge>
  ) : (
    <Badge tone="info" dot>
      Routine
    </Badge>
  )
}

const FLAGS: Record<ResultFlag, { icon: IconDef; word: string }> = {
  H: { icon: ArrowUp02Icon, word: "High" },
  L: { icon: ArrowDown02Icon, word: "Low" },
  Critical: { icon: DiamondIcon, word: "Critical" },
  Abnormal: { icon: InformationCircleIcon, word: "Abnormal" },
}

export function FlagBadge({ flag }: { flag: ResultFlag }) {
  return (
    <Badge tone="error" icon={FLAGS[flag].icon}>
      {FLAGS[flag].word}
    </Badge>
  )
}

export const OutsideBadge = () => <Badge tone="outline">Outside</Badge>

/** The build's Sync failed badge, beside the name of a patient whose last
    pull failed, wherever that name appears. */
export function SyncFailedBadge({ patient }: { patient: Patient }) {
  return patient.recordState === "sync_failed" ? <Badge tone="error">Sync failed</Badge> : null
}

export function DayBadge({ day }: { day: number }) {
  return (
    <Badge tone="warning" icon={Clock01Icon}>
      {fmtInt(day)} {day === 1 ? "day" : "days"}
    </Badge>
  )
}

export function PatientLink({ patient, className }: { patient: Patient; className?: string }) {
  const name = fullName(patient)
  return (
    <Link href={chartHref(patient.id)} title={name} className={cn("truncate rounded-sm hover:underline", FOCUS, className)}>
      {name}
    </Link>
  )
}

/* -------------------------------------------------------------- copy -- */

export const MEDICATION_CHANGE: Record<MedicationChange["change"], string> = {
  dose: "Dose changed",
  not_on_list: "Not on practice list",
  stopped: "Stopped",
  patient_report: "Patient report",
}

export function medicationBadgeText(m: MedicationChange) {
  if (m.change === "patient_report") {
    if (m.patientSays === "Not taking") return "Patient: not taking"
    if (m.patientSays === "Taking differently") return "Patient: taking differently"
    return `Patient: ${(m.patientSays ?? "No answer").toLowerCase()}`
  }
  return MEDICATION_CHANGE[m.change]
}

export const labValue = (r: AbnormalResult) => [r.value, r.unit].filter(Boolean).join(" ")

/** The short name used in lists of names. */
export function itemName(item: WorkItem) {
  switch (item.type) {
    case "abnormal_result":
      return item.payload.name
    case "medication_change":
      return item.payload.medication
    case "overdue_order":
      return item.payload.order
    case "outside_care":
      return item.payload.event
    case "care_gap":
      return item.payload.gap
    case "review_due":
      return item.payload.review
  }
}

/** The row title. */
export function itemTitle(item: WorkItem) {
  switch (item.type) {
    case "abnormal_result":
      return item.payload.kind === "lab" ? `${item.payload.name} ${labValue(item.payload)}` : item.payload.name
    case "medication_change": {
      const m = item.payload
      if (m.change === "not_on_list") return [m.medication, m.otherEntry].filter(Boolean).join(" ")
      if (m.change === "patient_report") return [m.medication, m.practiceEntry].filter(Boolean).join(" ")
      return m.medication
    }
    case "overdue_order":
      return item.payload.order
    case "outside_care":
      return item.payload.reason
    case "care_gap":
      return item.payload.gap
    case "review_due":
      return item.payload.review
  }
}

/** The row's one grey line under the title. */
export function itemDetail(item: WorkItem) {
  const outside = item.isOutsideSource ? " · Outside" : ""
  switch (item.type) {
    case "abnormal_result":
      return (item.payload.kind === "lab" ? item.source : `${item.payload.value} · ${item.source}`) + outside
    case "medication_change":
      return [item.payload.changedBy, item.source].filter(Boolean).join(" · ")
    case "overdue_order": {
      const o = item.payload
      const stage = o.stage === "not_scheduled" ? "Not scheduled" : `Scheduled ${fmtDate(o.scheduledAt!)}, not completed`
      return `Ordered ${fmtDate(o.orderedAt)} by ${o.orderedBy} · ${stage}`
    }
    case "outside_care":
      return `${item.payload.facility} · ${item.source}`
    case "care_gap": {
      const g = item.payload
      return [g.gapType, g.lastDone && `Last done ${fmtDate(g.lastDone)}`].filter(Boolean).join(" · ")
    }
    case "review_due":
      return item.payload.lastReview ? `Last review ${fmtDate(item.payload.lastReview)}` : item.source
  }
}

export const typeWord = (item: WorkItem) =>
  item.type === "abnormal_result" && item.payload.kind === "report" ? "Report" : TYPE_META[item.type].word

/* ------------------------------------------------------------ visual -- */

export function outOfRange(value: number, r: Pick<AbnormalResult, "refLow" | "refHigh">) {
  return (r.refLow !== undefined && value < r.refLow) || (r.refHigh !== undefined && value > r.refHigh)
}

export function MedicationDiff({ from, to }: { from: string; to: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap tabular-nums">
      <s className="text-ring">{from}</s>
      <span aria-hidden className="text-muted-foreground">
        →
      </span>
      <span className="sr-only">to</span>
      <span className="font-semibold">{to}</span>
    </span>
  )
}

/** The one visual on the right of an item row. */
export function ItemVisual({ item }: { item: WorkItem }) {
  switch (item.type) {
    case "abnormal_result": {
      const r = item.payload
      if (r.kind === "report") return <FlagBadge flag={r.flag} />
      const last = (r.history ?? []).slice(-5)
      const values = last.map((h) => h.value)
      return (
        <span className="inline-flex items-center gap-3">
          <FlagBadge flag={r.flag} />
          {values.length > 1 && (
            <Sparkline
              values={values}
              low={r.refLow}
              high={r.refHigh}
              latest={outOfRange(values[values.length - 1]!, r) ? "out" : "neutral"}
              label={`${r.name}, last ${values.length} results: ${values.join(", ")}`}
            />
          )}
        </span>
      )
    }
    case "medication_change": {
      const m = item.payload
      if (m.change === "dose" && m.practiceEntry && m.otherEntry)
        return <MedicationDiff from={m.practiceEntry} to={m.otherEntry} />
      return (
        <Badge tone="warning" dot>
          {medicationBadgeText(m)}
        </Badge>
      )
    }
    case "overdue_order": {
      const o = item.payload
      return (
        <span className="inline-flex items-center gap-3">
          <DayBadge day={orderDays(o)} />
          <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
            {o.remindersSent} of {o.remindersMax} reminders
          </span>
        </span>
      )
    }
    case "outside_care":
      return (
        <Badge tone="light" icon={Hospital01Icon}>
          {item.payload.event}
        </Badge>
      )
    case "care_gap": {
      const late = gapDaysLate(item.payload)
      return (
        <span className="inline-flex items-center gap-3">
          <span className="text-[13px] whitespace-nowrap text-muted-foreground tabular-nums">
            Due {fmtDate(item.payload.due)}
          </span>
          {late > 30 && <DayBadge day={late} />}
        </span>
      )
    }
    case "review_due":
      return (
        <Badge tone="light" icon={Calendar03Icon}>
          Due {fmtDate(item.payload.due)}
        </Badge>
      )
  }
}
