"use client"

import * as React from "react"
import { CheckmarkCircle02Icon, ClipboardIcon, Flag01Icon, Target02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import { Badge, KitIcon, ProgressBar, RadialScore } from "@/components/dashboard-kit-v2"
import { daysSince, usDay } from "@/components/provider/mock-clock"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import { isInside, numericHistory, shown, targetText } from "@/components/patient-dashboard/optimization/rules"
import {
  Fact,
  PROGRAMS,
  type Program,
  type ProgramView,
  StatusText,
  goalProgress,
  label,
} from "@/components/patient-dashboard/widgets/programs"
import { Widget, WidgetTabs } from "@/components/patient-dashboard/widgets/kit"
import { MetricTrends, type TrendMetric } from "@/components/patient-dashboard/widgets/trends"

/* The plans the member is enrolled in, one tab each (Weight loss, Diabetes
   control). Under the plan's facts and goal, its metrics run down the left
   as vertical tabs (value, status, goal progress) beside the picked one's
   trend (widgets/trends.tsx). The plan's goals and priorities follow in
   their own widgets. */

const UNITLESS = /^(ratio|index|qualitative|genotype)$/

/** Only the plan's own metrics: its KPIs, then (for weight loss) the body
    composition changes it tracks. Shared lab markers stay out. */
function metricsOf(view: ProgramView, program: Program): TrendMetric[] {
  const seen = new Set<string>()
  const list = program.id === "weight" ? [...view.kpis, ...view.changes] : view.kpis
  return list
    .filter((b) => {
      const key = b.name.toLowerCase()
      if (seen.has(key) || numericHistory(b).length === 0) return false
      seen.add(key)
      return true
    })
    .map((b) => {
      const h = numericHistory(b)
      const last = h[h.length - 1]
      const goal = view.goal(b)
      const progress = goal ? Math.round(goalProgress(goal)) : undefined
      return {
        id: b.name,
        label: label(b.name),
        unit: b.unit && !UNITLESS.test(b.unit) ? b.unit : undefined,
        value: last ? shown(last.value) : "None",
        points: h.map((p) => ({ date: p.date, value: p.n, out: !isInside(b, p.n), source: p.source })),
        low: b.targetLow ?? undefined,
        high: b.targetHigh ?? undefined,
        target: targetText(b) || undefined,
        meta: (
          <>
            {goal && <span>Goal {goal.goalLabel}</span>}
            <StatusText b={b} />
          </>
        ),
        aside: progress !== undefined && (
          <RadialScore value={Math.min(progress, 100)} max={100} label={`${label(b.name)} goal progress`} size={48} tone={progressTone(progress)}>
            <span className="text-[11px] font-semibold tabular-nums">{progress}%</span>
          </RadialScore>
        ),
      }
    })
}

/* Goal progress colour: red under 40%, orange to 74%, green from 75%. */
function progressTone(progress: number) {
  return progress >= 75 ? "success" : progress >= 40 ? "process" : "clinical"
}

export function ProgramPanel({
  opt,
  program,
  view,
  onProgram,
}: {
  opt: OptimizationModel
  program: Program
  view: ProgramView
  onProgram: (id: Program["id"]) => void
}) {
  const metrics = React.useMemo(() => metricsOf(view, program), [view, program])
  const week = Math.floor(daysSince(program.since) / 7) + 1
  const lead = view.kpis[0]
  const goal = lead && view.goal(lead)
  const last = view.readings[0]

  return (
    <Widget
      icon={Flag01Icon}
      title="Enrolled plans"
      flush
      tabs={
        <WidgetTabs
          label="Enrolled plans"
          tabs={PROGRAMS.map((p) => ({ id: p.id, label: p.name }))}
          value={program.id}
          onTab={onProgram}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 px-4 py-3.5">
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <Fact label="Enrolled" value={usDay(program.since)} />
          <Fact label="Program week" value={`Week ${week}`} />
          <Fact label="Last review" value={opt.cutoff ? usDay(opt.cutoff.slice(0, 10)) : "None"} />
          {last && <Fact label="Latest data" value={usDay(last.date)} />}
          {opt.data.commitment && <Fact label="Next check-in" value={usDay(opt.data.commitment.nextCheckIn)} />}
        </dl>
        {goal && lead && (
          <div className="ml-auto flex w-full min-w-56 flex-col gap-1.5 sm:w-72">
            <span className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold">
                {label(lead.name)} goal {goal.goalLabel}
              </span>
              <span className="font-semibold text-primary tabular-nums">{Math.round(goalProgress(goal))}%</span>
            </span>
            <ProgressBar
              value={goalProgress(goal)}
              tone={goalProgress(goal) >= 100 ? "success" : "primary"}
              label={`${label(lead.name)} goal progress`}
            />
            <span className="text-xs text-muted-foreground tabular-nums">
              Projected {goal.projection} by {usDay(goal.goalDate)}
            </span>
          </div>
        )}
      </div>
      <MetricTrends key={program.id} metrics={metrics} label="Plan metrics" />
    </Widget>
  )
}

const PLAN_TONE = {
  Active: "success",
  Completed: "light",
  Verify: "warning",
  "High priority": "error",
} as const

/** The plan's interventions with their target and progress. */
export function ProgramGoals({ view }: { view: ProgramView }) {
  return (
    <Widget icon={ClipboardIcon} title="Program goals" count={view.plan.length} flush>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Intervention</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="pr-4">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.plan.map((i) => {
            const progress = i.progress ?? (i.status === "Completed" ? 100 : 0)
            return (
              <TableRow key={i.name}>
                <TableCell className="pl-4 text-sm font-medium whitespace-normal">{i.name}</TableCell>
                <TableCell className="text-[13px] whitespace-normal text-muted-foreground">{i.doseOrTarget}</TableCell>
                <TableCell className="w-48">
                  <span className="flex items-center gap-2.5">
                    <ProgressBar value={progress} tone={progress >= 100 ? "success" : "primary"} label={`${i.name} progress`} />
                    <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{progress}%</span>
                  </span>
                </TableCell>
                <TableCell className="pr-4">
                  <Badge tone={PLAN_TONE[i.status]} dot>
                    {i.status}
                  </Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Widget>
  )
}

export function ProgramPriorities({ view }: { view: ProgramView }) {
  return (
    <Widget icon={Target02Icon} title="Top priorities" count={view.priorities.length}>
      {view.priorities.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Nothing open for this program</p>
      ) : (
        <ol className="flex flex-col divide-y">
          {view.priorities.map((p, i) => (
            <li key={p.text} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
              {p.met ? (
                <span className="flex size-6 shrink-0 items-center justify-center text-success">
                  <KitIcon icon={CheckmarkCircle02Icon} size={18} />
                </span>
              ) : (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold tabular-nums">
                  {i + 1}
                </span>
              )}
              <span className="flex min-w-0 flex-col">
                <span className={cn("text-sm font-medium", p.met && "text-muted-foreground")}>{p.text}</span>
                <span className="text-[13px] text-muted-foreground tabular-nums">{p.milestone}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Widget>
  )
}
