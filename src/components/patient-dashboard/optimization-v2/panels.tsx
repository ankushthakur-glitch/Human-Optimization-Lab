"use client"

import * as React from "react"
import { Tick02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { Textarea } from "@/design-system/ui/textarea"
import { Badge, DataTable, FlagText, Row, SidePanel, Td, Th, TrendChart, TrendWord } from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import type { OrderRow } from "@/components/patient-dashboard/model"
import { orderReminders } from "@/components/patient-dashboard/rules"
import type { ClinicalReport } from "@/components/patient-dashboard/types"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import { isCalc, isRising, labRangeText, numericHistory, shown, targetText, trendOf } from "@/components/patient-dashboard/optimization/rules"
import type { Biomarker, PlanDraft } from "@/components/patient-dashboard/optimization/types"
import { AiChip, BasedOn, DIVIDER } from "@/components/patient-dashboard/optimization-v2/ui"

/* The side panels: one marker's evidence (value, status, trend, ranges,
   the tracker's next step, its history as a chart and a table), an urgent
   report to read and mark reviewed, an order's state, and the plan draft
   the physician approves, edits or removes item by item. All trap focus,
   close on Esc and hand focus back to what opened them. */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  )
}

function MarkerStatus({ status }: { status: Biomarker["status"] }) {
  if (status === "High" || status === "Low") return <FlagText flag={status} urgent />
  if (status === "Watch") return <span className="text-xs font-medium text-warning">Watch</span>
  if (status === "Not Yet Tested") return <span className="text-xs font-medium text-muted-foreground">Not yet tested</span>
  if (status === "Informational") return <span className="text-xs font-medium text-muted-foreground">Informational</span>
  return <span className="text-xs font-medium text-success">{status === "Optimal" ? "Optimal" : "In range"}</span>
}

export function MarkerPanel({
  model,
  names,
  index,
  onIndex,
  onClose,
  onLabs,
  returnFocus,
}: {
  model: OptimizationModel
  names: string[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  onLabs: () => void
  returnFocus?: React.RefObject<HTMLElement | null>
}) {
  const b = names[index] ? model.marker(names[index]) : undefined
  const points = b ? numericHistory(b) : []
  const last = b?.history[b.history.length - 1]
  const out = b?.status === "High" || b?.status === "Low"

  return (
    <SidePanel
      open={Boolean(b)}
      onClose={onClose}
      returnFocus={returnFocus}
      title={
        <span className="flex items-center gap-2">
          {b?.name}
          {b && isCalc(b.name) && <Badge tone="light">Calc</Badge>}
        </span>
      }
      meta={b && <span>{[b.category, b.tier].filter(Boolean).join(" · ")}</span>}
      index={names.length > 1 ? index : undefined}
      total={names.length > 1 ? names.length : undefined}
      onPrevious={index > 0 ? () => onIndex(index - 1) : undefined}
      onNext={index < names.length - 1 ? () => onIndex(index + 1) : undefined}
      actions={
        <Button variant="outline" onClick={onLabs}>
          Open Lab results
        </Button>
      }
    >
      {b && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end gap-3">
            {last ? (
              <span className="text-[28px] leading-[34px] font-semibold tabular-nums">
                {shown(last.value)} <span className="text-sm font-normal text-muted-foreground">{b.unit}</span>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Not resulted</span>
            )}
            <span className="flex flex-wrap items-center gap-3 pb-1.5">
              <MarkerStatus status={b.status} />
              {points.length > 1 && <TrendWord trend={trendOf(b)} rising={isRising(b)} urgent={out} />}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Target">{targetText(b) || "None"}</Field>
            <Field label="Lab range">{labRangeText(b) || "None"}</Field>
            <Field label="Baseline">{b.baseline ? `${shown(b.baseline.value)} · ${usDay(b.baseline.date)}` : "None"}</Field>
            <Field label="Latest">{last ? `${usDay(last.date)}${last.source ? ` · ${last.source}` : ""}` : "None"}</Field>
            {b.nextStep && <Field label="Next step">{b.nextStep}</Field>}
            {b.nextTest && <Field label="Next test">{b.nextTest}</Field>}
            {b.frequency && <Field label="Frequency">{b.frequency}</Field>}
            {b.note && <Field label="Note">{b.note}</Field>}
          </dl>

          {points.length >= 2 && (
            <TrendChart
              points={points.map((p) => ({ date: p.date, value: p.n }))}
              low={b.targetLow ?? b.labLow}
              high={b.targetHigh ?? b.labHigh}
              unit={b.unit}
              latestOut={Boolean(out)}
              label={`${b.name} history`}
              height={200}
            />
          )}

          {b.history.length > 0 && (
            <div className={cn("-mx-6 border-t", DIVIDER)}>
              <DataTable aria-label={`${b.name} history`} minWidth={420}>
                <thead>
                  <tr>
                    <Th className="pl-6!">Date</Th>
                    <Th>Value</Th>
                    <Th className="pr-6!">Source</Th>
                  </tr>
                </thead>
                <tbody>
                  {[...b.history].reverse().map((p) => (
                    <Row key={`${p.date}-${p.source}`}>
                      <Td className="pl-6! whitespace-nowrap tabular-nums">{usDay(p.date)}</Td>
                      <Td className="whitespace-nowrap tabular-nums">
                        {shown(p.value)} <span className="text-xs text-muted-foreground">{b.unit}</span>
                      </Td>
                      <Td className="pr-6! text-muted-foreground">{p.source}</Td>
                    </Row>
                  ))}
                </tbody>
              </DataTable>
            </div>
          )}
        </div>
      )}
    </SidePanel>
  )
}

/* ------------------------------------------------------------ report -- */

export function ReportPanel({
  report,
  onClose,
  onReviewed,
  onDocuments,
  returnFocus,
}: {
  report?: ClinicalReport
  onClose: () => void
  onReviewed: (r: ClinicalReport) => void
  onDocuments: () => void
  returnFocus?: React.RefObject<HTMLElement | null>
}) {
  return (
    <SidePanel
      open={Boolean(report)}
      onClose={onClose}
      returnFocus={returnFocus}
      title={report?.report}
      meta={report && <span>{report.source} · {usDay(report.date)}</span>}
      actions={
        report && (
          <>
            <Button variant="outline" onClick={onDocuments}>
              Open Documents
            </Button>
            {!report.reviewed && (
              <Button
                onClick={() => {
                  onReviewed(report)
                  onClose()
                }}
              >
                Mark reviewed
              </Button>
            )}
          </>
        )
      }
    >
      {report && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="error">{report.flag}</Badge>
            {report.isOutsideSource && <Badge tone="outline">Outside</Badge>}
            {report.reviewed && (
              <Badge tone="success" icon={Tick02Icon}>
                Reviewed
              </Badge>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Finding">{report.finding}</Field>
            {report.values && <Field label="Key values">{report.values}</Field>}
            <Field label="Date">{usDay(report.date)}</Field>
            <Field label="Source">{report.source}</Field>
            {report.uploader && <Field label="Uploaded by">{report.uploader}</Field>}
          </dl>
        </div>
      )}
    </SidePanel>
  )
}

/* ------------------------------------------------------------- order -- */

export function OrderPanel({ order, onClose, returnFocus }: { order?: OrderRow; onClose: () => void; returnFocus?: React.RefObject<HTMLElement | null> }) {
  const clock = order?.clock
  return (
    <SidePanel
      open={Boolean(order)}
      onClose={onClose}
      returnFocus={returnFocus}
      title={order?.order}
      meta={order && <span>Ordered {usDay(order.orderedAt)} by {order.orderedBy}</span>}
    >
      {order && clock && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Facility">{order.facility ?? "Not set"}</Field>
          <Field label="State">
            {clock.kind === "future"
              ? `Booked for ${usDay(clock.scheduledAt)}`
              : `${order.scheduledAt ? "Scheduled, not done" : "Not scheduled"} · day ${clock.day}${clock.overdue ? " · escalated" : ""}`}
          </Field>
          <Field label="Reminders">
            {orderReminders(order)} sent{order.reminderDates.length ? ` · last ${usDay(order.reminderDates[order.reminderDates.length - 1])}` : ""}
          </Field>
        </dl>
      )}
    </SidePanel>
  )
}

/* -------------------------------------------------------- plan review -- */

type DraftItem = PlanDraft["items"][number]

export function PlanReviewPanel({
  model,
  open,
  onClose,
  returnFocus,
  onDecide,
  onApproveAll,
  onOpenMarker,
  onOpenReport,
}: {
  model: OptimizationModel
  open: boolean
  onClose: () => void
  returnFocus?: React.RefObject<HTMLElement | null>
  onDecide: (id: string, status: "approved" | "removed", text?: string) => void
  onApproveAll: (ids: string[]) => void
  onOpenMarker: (name: string, from: HTMLElement) => void
  onOpenReport: (name: string, from: HTMLElement) => void
}) {
  const draft = model.draft
  if (!draft) return null
  const pending = model.pendingDraft
  return (
    <SidePanel
      open={open}
      onClose={onClose}
      returnFocus={returnFocus}
      title="Plan update waiting for your approval"
      meta={<span>Drafted {usDay(draft.draftedAt)}{model.draftLine && ` · ${model.draftLine}`}</span>}
      actions={
        <Button
          disabled={pending.length === 0}
          onClick={() => {
            onApproveAll(pending.map((i) => i.id))
            onClose()
          }}
        >
          Approve plan
        </Button>
      }
    >
      <ul className="flex flex-col gap-3">
        {draft.items.map((item) => (
          <DraftRow key={item.id} item={item} model={model} onDecide={onDecide} onOpenMarker={onOpenMarker} onOpenReport={onOpenReport} />
        ))}
      </ul>
    </SidePanel>
  )
}

function DraftRow({
  item,
  model,
  onDecide,
  onOpenMarker,
  onOpenReport,
}: {
  item: DraftItem
  model: OptimizationModel
  onDecide: (id: string, status: "approved" | "removed", text?: string) => void
  onOpenMarker: (name: string, from: HTMLElement) => void
  onOpenReport: (name: string, from: HTMLElement) => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [text, setText] = React.useState(item.text)
  const evidence = item.basedOn.map(model.marker).filter((b): b is Biomarker => Boolean(b))
  const done = item.status !== "pending"
  return (
    <li className={cn("flex flex-col gap-2.5 rounded-[7.2px] border p-3.5", done && "bg-surface-sunken")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="outline">{item.kind}</Badge>
        {item.status === "pending" && <AiChip />}
        {item.status === "approved" && (
          <Badge tone="success" icon={Tick02Icon}>
            Approved
          </Badge>
        )}
        {item.status === "removed" && <Badge tone="light">Removed</Badge>}
      </div>
      {editing ? (
        <Textarea aria-label="Plan item" value={text} onChange={(e) => setText(e.target.value)} className="min-h-16" />
      ) : (
        <p className={cn("text-sm", item.status === "removed" && "text-muted-foreground line-through")}>{item.text}</p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <BasedOn markers={evidence} onOpen={onOpenMarker} label={Boolean(evidence.length || item.basedOnReport)} />
        {item.basedOnReport && (
          <button type="button" onClick={(e) => onOpenReport(item.basedOnReport!, e.currentTarget)} className="rounded-[4.32px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Badge tone="outline" className="cursor-pointer hover:bg-surface-row-hover">
              {item.basedOnReport}
            </Badge>
          </button>
        )}
      </div>
      {!done && (
        <div className="flex flex-wrap gap-1.5">
          {editing ? (
            <>
              <Button
                size="sm"
                disabled={!text.trim()}
                onClick={() => {
                  onDecide(item.id, "approved", text.trim() === item.text ? undefined : text.trim())
                  setEditing(false)
                }}
              >
                Save and approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setText(item.text)
                  setEditing(false)
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => onDecide(item.id, "approved")}>
                Approve
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDecide(item.id, "removed")}>
                Remove
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  )
}
