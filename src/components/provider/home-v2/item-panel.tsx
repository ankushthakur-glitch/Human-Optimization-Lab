"use client"

import * as React from "react"
import Link from "next/link"
import { Hospital01Icon, Tick02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/design-system/ui/button"
import { RadioGroup, RadioGroupItem } from "@/design-system/ui/radio-group"
import { type Patient, fullName } from "@/components/practice/practice-data"
import {
  Avatar,
  Badge,
  KitIcon,
  SidePanel,
} from "@/components/dashboard-kit-v2"
import { fmtDate } from "@/components/provider/home-v2/clock"
import {
  DayBadge,
  FlagBadge,
  MedicationDiff,
  OutsideBadge,
  SyncFailedBadge,
  ageSex,
  chartHref,
  itemTitle,
  labValue,
  medicationBadgeText,
} from "@/components/provider/home-v2/labels"
import { AISummary, FullReport, ItemRecord } from "@/components/provider/home-v2/ai-summary"
import { insightFor, paperFor, reportFor } from "@/components/provider/home-v2/insight"
import { type ActionOptions, CLOSE_REASONS, gapDaysLate, orderDays } from "@/components/provider/home-v2/selectors"
import type {
  ActionKind,
  CloseReason,
  QueueItem,
} from "@/components/provider/home-v2/types"

/* The side panel an item opens into, headed by the patient: the item's
   report details as Label : Value pairs, the AI summary, the full report as the patient
   chart draws it, then whatever the decision still needs (a lab's trend, an
   order's postpone and close choices). Every type opens here, reviews too. */

export type Act = (kind: ActionKind, opts?: ActionOptions) => void


const CHART_SECTION = {
  lab: "labs",
  report: "documents",
  medication_change: "medications",
  overdue_order: "encounters",
  outside_care: "encounters",
  care_gap: "dashboard",
} as const

export function ItemPanel({
  item,
  patient,
  onPrevious,
  onNext,
  onClose,
  returnFocus,
  onAct,
}: {
  item: QueueItem | null
  patient: Patient | null
  onPrevious?: () => void
  onNext?: () => void
  onClose: () => void
  returnFocus: React.RefObject<HTMLElement | null>
  onAct: Act
}) {
  /* The panel keeps the last item while it slides out. */
  const [shown, setShown] = React.useState<{ item: QueueItem; patient: Patient } | null>(null)
  if (item && patient && shown?.item !== item) setShown({ item, patient })
  const open = !!item && !!patient
  const current = shown

  if (!current) return null

  const section =
    current.item.type === "abnormal_result" ? CHART_SECTION[current.item.payload.kind] : CHART_SECTION[current.item.type as keyof typeof CHART_SECTION]
  const openChart = (
    <Link href={chartHref(current.patient.id, section)} className={cn(buttonVariants({ variant: "outline" }))}>
      Open chart
    </Link>
  )

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      returnFocus={returnFocus}
      lead={<Avatar name={fullName(current.patient)} photo={current.patient.photo} size={48} />}
      title={
        <Link href={chartHref(current.patient.id)} className="hover:underline">
          {fullName(current.patient)}
        </Link>
      }
      meta={
        <>
          <span className="font-medium text-foreground/80">{itemTitle(current.item)}</span>
          <SyncFailedBadge patient={current.patient} />
          <span aria-hidden>·</span>
          <span>{current.patient.id}</span>
          <span aria-hidden>·</span>
          <span>{ageSex(current.patient)}</span>
        </>
      }
      onPrevious={onPrevious}
      onNext={onNext}
      actions={<PanelActions key={current.item.id} item={current.item} openChart={openChart} onAct={onAct} />}
      wide
    >
      <div key={current.item.id} className="flex flex-col gap-5">
        <Headline item={current.item} />
        <AISummary insight={insightFor(current.item)} />
        {/* Only results and outside visits arrive as documents; the rest show
            their record plainly. */}
        {current.item.type === "abnormal_result" || current.item.type === "outside_care" ? (
          <FullReport paper={paperFor(current.item, current.patient)} patient={current.patient} />
        ) : (
          <ItemRecord
            report={reportFor(current.item, current.patient)}
            title={
              current.item.type === "overdue_order"
                ? "Reminder log"
                : current.item.type === "medication_change"
                  ? `${current.item.payload.medication} by source`
                  : "History"
            }
          />
        )}
        <PanelBody item={current.item} />
      </div>
    </SidePanel>
  )
}

/* ----------------------------------------------------------- actions -- */

/* Postpone and Close need a choice first; the choice lives in the body as
   a radio group, read here through a small store keyed by item. */
const choices = new Map<string, { days: 14 | 30; reason: CloseReason }>()
const choiceOf = (id: string) => choices.get(id) ?? { days: 14 as const, reason: "Completed elsewhere" as const }

function PanelActions({ item, openChart, onAct }: { item: QueueItem; openChart: React.ReactNode; onAct: Act }) {
  switch (item.type) {
    case "medication_change":
      return (
        <>
          {openChart}
          <Button variant="outline" onClick={() => onAct("not_current")}>
            Not current
          </Button>
          <Button onClick={() => onAct("confirm_change")}>
            <KitIcon icon={Tick02Icon} />
            Confirm change
          </Button>
        </>
      )
    case "overdue_order":
      return (
        <>
          {openChart}
          <Button variant="outline" onClick={() => onAct("postpone", { days: choiceOf(item.id).days })}>
            Postpone
          </Button>
          <Button onClick={() => onAct("close", { reason: choiceOf(item.id).reason })}>Close</Button>
        </>
      )
    case "care_gap":
      return (
        <>
          {openChart}
          <Button variant="outline" onClick={() => onAct("close", { reason: choiceOf(item.id).reason })}>
            Close
          </Button>
          <Button onClick={() => onAct("mark_reviewed")}>
            <KitIcon icon={Tick02Icon} />
            Mark reviewed
          </Button>
        </>
      )
    default:
      return (
        <>
          {openChart}
          <Button onClick={() => onAct("mark_reviewed")}>
            <KitIcon icon={Tick02Icon} />
            Mark reviewed
          </Button>
        </>
      )
  }
}

/* ---------------------------------------------------------- headline -- */

type Fact = [string, React.ReactNode]

/** The item's report details as Label : Value pairs in two columns; the
    first pair carries the value with its flag. */
function Headline({ item }: { item: QueueItem }) {
  const source = <SourceLine item={item} />
  let facts: (Fact | false | "" | undefined)[] = []
  switch (item.type) {
    case "abnormal_result": {
      const r = item.payload
      facts = [
        [
          "Result",
          <Inline key="r">
            <span className="font-semibold">{r.kind === "lab" ? labValue(r) : r.value}</span>
            <FlagBadge flag={r.flag} />
          </Inline>,
        ],
        ["Test", r.name],
        r.range && ["Reference", r.range],
        r.previous && ["Previous", `${r.previous} ${r.unit ?? ""}`.trim()],
        ["Resulted", fmtDate(r.resultedAt)],
        ["Ordered by", "Daniel Reyes, MD"],
        ["Performing site", source],
        ["Status", "Final"],
      ]
      break
    }
    case "medication_change": {
      const m = item.payload
      facts = [
        [
          "Change",
          <Inline key="c">
            {m.change === "dose" && m.practiceEntry && m.otherEntry ? (
              <MedicationDiff from={m.practiceEntry} to={m.otherEntry} />
            ) : (
              <Badge tone="warning" dot>
                {medicationBadgeText(m)}
              </Badge>
            )}
          </Inline>,
        ],
        ["Medication", m.medication],
        ["Practice list", m.practiceEntry ?? "Not on list"],
        m.change === "patient_report"
          ? ["Patient says", [m.patientSays ?? "No answer", m.patientNote?.replace(/^./, (c) => c.toLowerCase())].filter(Boolean).join(": ")]
          : ["Other source", m.change === "stopped" ? "Stopped" : (m.otherEntry ?? "")],
        m.changedBy && ["Changed by", m.changedBy],
        ["Reported", fmtDate(m.date)],
        ["Source", source],
      ]
      break
    }
    case "overdue_order": {
      const o = item.payload
      facts = [
        [
          "Overdue",
          <Inline key="w">
            <DayBadge day={orderDays(o)} />
          </Inline>,
        ],
        ["Order", o.order],
        ["Ordered", `${fmtDate(o.orderedAt)} by ${o.orderedBy}`],
        ["Status", o.scheduledAt ? `Booked ${fmtDate(o.scheduledAt)}, not completed` : "Not scheduled"],
        ["Reminders", `${o.remindersSent} of ${o.remindersMax} sent`],
        o.facility && ["Facility", o.facility],
        ["Source", source],
      ]
      break
    }
    case "outside_care": {
      const v = item.payload
      facts = [
        [
          "Event",
          <Inline key="e">
            <Badge tone="light" icon={Hospital01Icon}>
              {v.event}
            </Badge>
          </Inline>,
        ],
        ["Reason", v.reason],
        ["Facility", v.facility],
        ["Date", fmtDate(v.date)],
        v.clinician && ["Clinician", v.clinician],
        ["Source", source],
      ]
      break
    }
    case "care_gap": {
      const g = item.payload
      const late = gapDaysLate(g)
      facts = [
        [
          "Type",
          <Inline key="t">
            <Badge tone="light">{g.gapType}</Badge>
            {late > 30 && <DayBadge day={late} />}
          </Inline>,
        ],
        ["Gap", g.gap],
        g.lastDone && ["Last done", fmtDate(g.lastDone)],
        ["Due", fmtDate(g.due)],
        ["Reminders", String(g.remindersSent)],
        ["Detected by", source],
      ]
      break
    }
    case "review_due": {
      const r = item.payload
      facts = [
        ["Review", r.review],
        ["Due", fmtDate(r.due)],
        r.lastReview && ["Last review", fmtDate(r.lastReview)],
        ["Prepared by", source],
      ]
      break
    }
  }
  return (
    <dl className="grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 rounded-[10px] border border-border px-4 py-3.5 text-[13px] sm:grid-cols-[max-content_minmax(0,1fr)_max-content_minmax(0,1fr)]">
      {(facts.filter(Boolean) as Fact[]).map(([label, value]) => (
        <React.Fragment key={label}>
          <dt className="text-muted-foreground">{label}:</dt>
          <dd className="min-w-0 tabular-nums">{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  )
}

function Inline({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex flex-wrap items-center gap-1.5">{children}</span>
}

/* -------------------------------------------------------------- body -- */

/** What the decision still needs below the report. */
function PanelBody({ item }: { item: QueueItem }) {
  switch (item.type) {
    case "overdue_order":
      return <OrderChoices itemId={item.id} />
    case "care_gap":
      return <CloseReasonChoice itemId={item.id} />
    default:
      return null
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[13px] font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

function SourceLine({ item }: { item: QueueItem }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {item.source}
      {item.isOutsideSource && <OutsideBadge />}
    </span>
  )
}

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <RadioGroup aria-label={label} value={value} onValueChange={(v) => onChange(v as T)} className="flex flex-col gap-2">
      {options.map((o) => (
        <label key={o.value} className="flex items-center gap-2 text-sm">
          <RadioGroupItem value={o.value} />
          {o.label}
        </label>
      ))}
    </RadioGroup>
  )
}

function CloseReasonChoice({ itemId }: { itemId: string }) {
  const [reason, setReason] = React.useState<CloseReason>(choiceOf(itemId).reason)
  return (
    <Section title="Close">
      <ChoiceGroup
        label="Close reason"
        value={reason}
        options={CLOSE_REASONS.map((r) => ({ value: r, label: r }))}
        onChange={(r) => {
          setReason(r)
          choices.set(itemId, { ...choiceOf(itemId), reason: r })
        }}
      />
    </Section>
  )
}

function OrderChoices({ itemId }: { itemId: string }) {
  const [days, setDays] = React.useState<14 | 30>(choiceOf(itemId).days)
  return (
    <>
      <Section title="Postpone">
        <ChoiceGroup
          label="Postpone by"
          value={String(days) as "14" | "30"}
          options={[
            { value: "14", label: "14 days" },
            { value: "30", label: "30 days" },
          ]}
          onChange={(v) => {
            const next = Number(v) as 14 | 30
            setDays(next)
            choices.set(itemId, { ...choiceOf(itemId), days: next })
          }}
        />
      </Section>
      <CloseReasonChoice itemId={itemId} />
    </>
  )
}
