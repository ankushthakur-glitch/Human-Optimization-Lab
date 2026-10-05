"use client"

import * as React from "react"
import {
  ArrowDownRight01Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import {
  Card,
  CardHeader,
  DIVIDER,
  FOCUS,
  TrendText,
} from "@/components/dashboard-kit-v2"
import { ms } from "@/components/provider/mock-clock"
import { MarkerLineChart } from "@/components/patient-dashboard/charts"
import type { DashboardModel } from "@/components/patient-dashboard/model"
import {
  type KeyTrend,
  type ProblemRow,
  monthsBetween,
  sourceName,
} from "@/components/patient-dashboard/rules"
import type { ControlMarker } from "@/components/patient-dashboard/types"
import { Clip, sectionDomId } from "@/components/patient-dashboard/ui"

/* Context: the problem list and the control markers as one master-detail
   card. Every active condition on the left with the marker that shows how
   well it is controlled; on the right the full history of the selected
   problem's marker on a line chart against its limit. Worsening conditions
   lead and the first controlled one is selected. One marker, one unit. */

/** The series behind each control marker. */
const SERIES: Partial<Record<ControlMarker, string>> = {
  hba1c: "4548-4",
  ldl: "13457-7",
  bp: "bp",
  egfr: "33914-3",
  tsh: "3016-3",
}

/** "2026-01" as 01/2026. */
const monthYear = (ym: string) => `${ym.slice(5, 7)}/${ym.slice(0, 4)}`

const keyOf = (r: ProblemRow) => r.condition.icd10 + r.condition.name

export function ProblemsAndControl({ model }: { model: DashboardModel }) {
  const rows = model.problems
  const seriesOf = React.useCallback(
    (r: ProblemRow): KeyTrend | undefined => {
      const id = r.condition.controlMarker && SERIES[r.condition.controlMarker]
      return id ? model.trends.find((t) => t.id === id) : undefined
    },
    [model.trends]
  )
  const controlled = rows.filter((r) => seriesOf(r))
  const [pickedKey, setPicked] = React.useState<string | null>(null)
  const selected =
    controlled.find((r) => keyOf(r) === pickedKey) ?? controlled[0]
  const active = selected ? seriesOf(selected) : undefined
  const cutoff = model.review?.at
  const domId = sectionDomId("problems")

  return (
    <Card
      id={domId}
      tabIndex={-1}
      aria-labelledby={`${domId}-title`}
      className="@container/card scroll-mt-3 outline-none"
    >
      <div
        className={cn(
          "grid",
          active && "@3xl/card:grid-cols-[340px_minmax(0,1fr)]"
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-col",
            active && "@3xl/card:border-r",
            DIVIDER
          )}
        >
          <CardHeader
            title="Problems and control"
            titleId={`${domId}-title`}
            description={`${rows.length} active`}
            className="min-h-0 items-start px-5 pt-4 pb-3"
          />
          <ul aria-label="Problem list" className="flex flex-col">
            {rows.map((r) => {
              const on = selected ? keyOf(r) === keyOf(selected) : false
              const isNew = Boolean(
                cutoff && ms(r.condition.addedAt) > ms(cutoff)
              )
              return (
                <li
                  key={keyOf(r)}
                  className={cn("border-b last:border-0", DIVIDER)}
                >
                  <ProblemLine
                    row={r}
                    selected={on}
                    isNew={isNew}
                    onPick={seriesOf(r) ? () => setPicked(keyOf(r)) : undefined}
                  />
                </li>
              )
            })}
          </ul>
        </div>
        {active && <ControlChart key={active.id} trend={active} />}
      </div>
    </Card>
  )
}

function ProblemLine({
  row,
  selected,
  isNew,
  onPick,
}: {
  row: ProblemRow
  selected: boolean
  isNew: boolean
  onPick?: () => void
}) {
  const { condition: c, line } = row
  const body = (
    <>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <Clip className="text-sm font-medium">{c.name}</Clip>
          <span className="shrink-0 text-xs text-muted-foreground">
            {c.icd10}
          </span>
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          Since {monthYear(c.since)}
          {isNew && " · new"}
        </span>
      </div>
      {line?.kind === "value" ? (
        <span className="shrink-0 text-sm font-medium whitespace-nowrap tabular-nums">
          {line.label} {line.value}
        </span>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">
          {line?.kind === "stale" ? "No recent result" : "No marker"}
        </span>
      )}
    </>
  )
  const base = "flex w-full min-w-0 items-center gap-3 px-5 py-3 text-left"
  if (!onPick) return <div className={base}>{body}</div>
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onPick}
      className={cn(
        base,
        "transition-colors hover:bg-surface-row-hover",
        selected && "bg-primary-1 shadow-[inset_3px_0_0_var(--primary)]",
        FOCUS,
        "focus-visible:ring-inset"
      )}
    >
      {body}
    </button>
  )
}

/** "0.5%" or "12 mg/dL". */
const withUnit = (v: number, unit: string) => {
  const n = String(Number(v.toFixed(2)))
  return unit === "%" ? `${n}%` : `${n} ${unit}`
}

function ControlChart({ trend }: { trend: KeyTrend }) {
  const first = trend.points[0]
  const last = trend.points[trend.points.length - 1]
  const rising = last.value > first.value
  const delta = Math.abs(last.value - first.value)
  const sources = [
    ...new Set(trend.points.map((p) => sourceName(p.source))),
  ].join(" · ")
  const span = monthsBetween(first.date, last.date)
  const limit =
    trend.betterDirection === "higher" ? trend.refLow : trend.refHigh
  return (
    <div className="flex min-w-0 flex-col">
      <CardHeader
        title={trend.label}
        description={`${sources} · ${trend.points.length} ${trend.points.length === 1 ? "result" : "results"} over ${span} ${span === 1 ? "month" : "months"}`}
        className="min-h-0 items-start px-5 pt-4 pb-1.5"
        actions={
          trend.points.length > 1 ? (
            <TrendText
              icon={rising ? ArrowUpRight01Icon : ArrowDownRight01Icon}
            >
              {`${delta === 0 ? "No change" : `${rising ? "Up" : "Down"} ${withUnit(delta, trend.unit)}`} since ${monthYear(first.date.slice(0, 7))}`}
            </TrendText>
          ) : undefined
        }
      />
      <div className="px-5 pt-1 pb-4">
        <MarkerLineChart
          points={trend.points}
          limit={limit}
          limitLabel={
            trend.betterDirection === "higher" ? "Lower limit" : "Upper limit"
          }
          unit={trend.unit}
          height={190}
          label={`${trend.label}: ${trend.points.map((p) => `${p.date} ${p.value} ${trend.unit}`).join(", ")}`}
        />
      </div>
    </div>
  )
}
