"use client"

import * as React from "react"

import { Button } from "@/design-system/ui/button"
import {
  Badge,
  DataTable,
  FlagBadge,
  ResultTrendChart,
  SidePanel,
  Td,
  Th,
  Tr,
  TrendBadge,
} from "@/components/dashboard-kit"
import { usDay } from "@/components/provider/mock-clock"
import type { ClinicalReport } from "@/components/patient-dashboard/types"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import {
  isCalc,
  isRising,
  labRangeText,
  numericHistory,
  shown,
  targetText,
  trendOf,
} from "@/components/patient-dashboard/optimization/rules"
import { StatusBadge } from "@/components/patient-dashboard/optimization-computed/parts/markers"

/* The side panels: one marker's evidence (value, status, trend, ranges, the
   tracker's next step, its history as a chart and a table), and an urgent
   report to read and mark reviewed. Both trap focus, close on Esc and hand
   focus back to what opened them. */

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
  /** The list the panel walks with Previous and Next. */
  names: string[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  onLabs: () => void
  returnFocus?: React.RefObject<HTMLElement | null>
}) {
  const b = names[index] ? model.marker(names[index]) : undefined
  const open = Boolean(b)
  const points = b ? numericHistory(b) : []
  const last = b?.history[b.history.length - 1]
  const out = b?.status === "High" || b?.status === "Low"

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      returnFocus={returnFocus}
      title={
        <span className="flex items-center gap-2">
          {b?.name}
          {b && isCalc(b.name) && <Badge tone="light">Calc</Badge>}
        </span>
      }
      meta={b && <span>{[b.category, b.tier].filter(Boolean).join(" · ")}</span>}
      position={names.length > 1 ? [index, names.length] : undefined}
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
            <span className="flex flex-wrap gap-1.5 pb-1">
              <StatusBadge status={b.status} />
              {points.length > 0 && <TrendBadge trend={trendOf(b)} rising={isRising(b)} />}
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
            <ResultTrendChart
              points={points.map((p) => ({ date: p.date, value: p.n }))}
              low={b.targetLow ?? b.labLow}
              high={b.targetHigh ?? b.labHigh}
              unit={b.unit}
              latestOut={out}
              label={`${b.name} history`}
              height={200}
            />
          )}

          {b.history.length > 0 && (
            <div className="-mx-6 border-t border-[color-mix(in_oklab,var(--border)_65%,transparent)]">
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
                    <Tr key={`${p.date}-${p.source}`}>
                      <Td className="pl-6! whitespace-nowrap tabular-nums">{usDay(p.date)}</Td>
                      <Td className="whitespace-nowrap tabular-nums">
                        {shown(p.value)} <span className="text-xs text-muted-foreground">{b.unit}</span>
                      </Td>
                      <Td className="pr-6! text-muted-foreground">{p.source}</Td>
                    </Tr>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  )
}

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
            <Button
              onClick={() => {
                onReviewed(report)
                onClose()
              }}
            >
              Mark reviewed
            </Button>
          </>
        )
      }
    >
      {report && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            <FlagBadge flag={report.flag === "Critical" ? "Critical" : "Abnormal"} />
            {report.isOutsideSource && <Badge tone="outline">Outside</Badge>}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Finding">{report.finding}</Field>
            <Field label="Date">{usDay(report.date)}</Field>
            <Field label="Source">{report.source}</Field>
          </dl>
        </div>
      )}
    </SidePanel>
  )
}
