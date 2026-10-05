"use client"

import * as React from "react"

import { Gantt, type GanttLane, SidePanel } from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import type { Intervention } from "@/components/patient-dashboard/optimization/types"
import { STATUS_COLOR, planGantt } from "@/components/patient-dashboard/optimization-v2/rules"
import { OptCard, TextLink } from "@/components/patient-dashboard/optimization-v2/ui"

/* Tier 4, context: the plan as date-range lanes from each intervention's
   start to today, coloured by status, with what it has achieved on the
   right. Completed lanes hide behind one link. A lane opens its panel. */

const LEGEND: Intervention["status"][] = ["High priority", "Active", "Verify"]

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}/.test(s)

export function Plan({
  model,
  onOpen,
}: {
  model: OptimizationModel
  onOpen: (lane: GanttLane, from: HTMLElement) => void
}) {
  const [completed, setCompleted] = React.useState(false)
  const g = planGantt(model, completed)
  if (g.lanes.length === 0 && !completed) return null
  return (
    <OptCard
      id="plan"
      title="Plan"
      description={`${g.active} active since ${usDay(model.data.planSince)}${g.completed ? ` · ${g.completed} completed` : ""}`}
      flush
      actions={
        <>
          <ul className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
            {LEGEND.map((s) => (
              <li key={s} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-[2px]" style={{ background: STATUS_COLOR[s] }} />
                {s}
              </li>
            ))}
          </ul>
          {g.completed > 0 && (
            <TextLink onClick={() => setCompleted((c) => !c)} className="text-[13px]">
              {completed ? "Hide completed" : "Show completed"}
            </TextLink>
          )}
        </>
      }
    >
      <Gantt label="Plan" lanes={g.lanes} months={g.months} onOpen={onOpen} className="pt-1" />
    </OptCard>
  )
}

/* ----------------------------------------------------------- panel -- */

export function InterventionPanel({
  model,
  names,
  index,
  onIndex,
  onClose,
  returnFocus,
}: {
  model: OptimizationModel
  /** The lanes the panel walks, by name. */
  names: string[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  returnFocus?: React.RefObject<HTMLElement | null>
}) {
  const it = names[index] ? model.data.interventions.find((i) => i.name === names[index]) : undefined
  return (
    <SidePanel
      open={Boolean(it)}
      onClose={onClose}
      returnFocus={returnFocus}
      title={it?.name}
      meta={it && <span>{it.category} · since {usDay(it.start)}</span>}
      index={names.length > 1 ? index : undefined}
      total={names.length > 1 ? names.length : undefined}
      onPrevious={index > 0 ? () => onIndex(index - 1) : undefined}
      onNext={index < names.length - 1 ? () => onIndex(index + 1) : undefined}
    >
      {it && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Status">
            <span className="font-medium" style={{ color: STATUS_COLOR[it.status] }}>
              {it.status}
            </span>
          </Field>
          <Field label="Owner">{it.owner}</Field>
          <Field label="Dose or target">{it.doseOrTarget}</Field>
          <Field label="Frequency">{it.frequency}</Field>
          <Field label="Outcome metric">{it.outcomeMetric}</Field>
          <Field label="Observed">{it.observed}</Field>
          <Field label="Next review">{isDate(it.nextReview) ? usDay(it.nextReview) : it.nextReview}</Field>
        </dl>
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
