"use client"

import * as React from "react"
import { Area, AreaChart, ReferenceLine, XAxis, YAxis } from "recharts"

import { cn } from "@/lib/utils"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/design-system/ui/chart"
import { AXIS_PROPS, ChartCard, ChartFooter, DIVIDER, DivergingBarRow, FOCUS, Grid, PALETTE, useReducedMotion } from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import { fmt, goalLine, headlineDelta, markerByName, monthDay, numericHistory, signed } from "@/components/patient-dashboard/optimization/rules"
import { bodyCells, compositionRows } from "@/components/patient-dashboard/optimization-v2/rules"
import { FooterLines, OptCard, optDomId } from "@/components/patient-dashboard/optimization-v2/ui"

/* Tier 4, progress: the body series the plan tracks (the HOLv.9 headline
   numbers as stat cells, each with its goal, projection and chart), and the
   DEXA and RMR change as diverging bars. */

const at = (iso: string) => new Date(`${iso}T12:00:00`).getTime()
const tickDay = (t: number) => monthDay(new Date(t).toISOString())

export function BodyProgress({ model }: { model: OptimizationModel }) {
  const reduced = useReducedMotion()
  const cells = bodyCells(model)
  const [pick, setPick] = React.useState(cells[0]?.headline.label ?? "")
  const id = React.useId().replace(/:/g, "")
  const cell = cells.find((c) => c.headline.label === pick) ?? cells[0]
  if (!cell) return null
  const { goal } = cell
  const marker = markerByName(model.data.biomarkers, goal.seriesMarkerName)
  const points = marker ? numericHistory(marker).filter((p) => p.date >= model.data.planSince) : []
  const data = points.map((p) => ({ t: at(p.date), value: p.n, source: p.source }))
  const values = [...data.map((d) => d.value), goal.goal]
  const step = goal.unit === "lb" ? 5 : goal.unit === "cm²" ? 20 : 1
  const min = Math.floor((Math.min(...values) - step / 2) / step) * step
  const max = Math.ceil(Math.max(...values) / step) * step
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step)
  const line = goalLine(goal)
  const last = data.length - 1
  const config = { value: { label: `${goal.metric} (${goal.unit})`, color: PALETTE.primary } } satisfies ChartConfig

  return (
    <section id={optDomId("body")} tabIndex={-1} className="h-full scroll-mt-3 outline-none">
      <ChartCard
        title="Body progress"
        titleId="opt-body-title"
        description={`Since ${usDay(model.data.planSince)} · goal ${goal.goalLabel}`}
        aside={
          <div role="group" aria-label="Body progress series" className="flex">
            {cells.map((c) => {
              const d = headlineDelta(c.headline)
              const selected = c.headline.label === pick
              return (
                <button
                  key={c.headline.label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPick(c.headline.label)}
                  className={cn(
                    "flex min-w-[88px] flex-col justify-center gap-0.5 border-l px-3.5 py-2.5 text-left",
                    DIVIDER,
                    selected ? "bg-surface-sunken shadow-[inset_0_-2px_0_var(--primary)]" : "hover:bg-surface-row-hover",
                    FOCUS,
                    "focus-visible:ring-inset"
                  )}
                >
                  <span className="text-[13px] text-muted-foreground">{c.headline.label}</span>
                  <span className="text-[20px] leading-7 font-bold tabular-nums">
                    {fmt(c.headline.latest, c.headline.decimals)} <span className="text-xs font-normal text-muted-foreground">{c.headline.unit}</span>
                  </span>
                  <span className={cn("text-xs font-medium tabular-nums", d.good ? "text-success" : "text-warning")}>{signed(d.change, d.change % 1 ? 1 : 0)}</span>
                </button>
              )
            })}
          </div>
        }
        footer={
          <ChartFooter
            className="text-foreground"
            lead={`${line.lead} · ${line.progress}`}
            sub={`Projection ${goal.projection} by ${usDay(goal.goalDate)} · ${goal.confidence.toLowerCase()} confidence`}
          />
        }
      >
        <div role="img" aria-label={`${goal.metric} from ${fmt(goal.baseline)} to ${fmt(goal.current)} ${goal.unit}, goal ${goal.goalLabel}`}>
          <ChartContainer config={config} className="aspect-auto h-[318px] w-full">
            <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id={`body-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE.primary} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={PALETTE.primary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Grid />
              <XAxis
                {...AXIS_PROPS}
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                ticks={data.map((d) => d.t)}
                tickFormatter={tickDay}
                minTickGap={12}
                interval="preserveStartEnd"
              />
              <YAxis {...AXIS_PROPS} domain={[min, max]} ticks={ticks} />
              <ReferenceLine
                y={goal.goal}
                stroke={PALETTE.success}
                strokeDasharray="4 4"
                label={{ value: `Goal ${goal.goalLabel}`, position: "insideBottomLeft", fill: PALETTE.success, fontSize: 12, dy: 16 }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(_, p) => {
                      const row = p?.[0]?.payload as { t: number; source: string } | undefined
                      return row ? `${usDay(new Date(row.t).toISOString())} · ${row.source}` : ""
                    }}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={PALETTE.primary}
                strokeWidth={2}
                fill={`url(#body-${id})`}
                isAnimationActive={!reduced}
                dot={(p: { cx?: number; cy?: number; index?: number }) => (
                  <circle
                    key={p.index}
                    cx={p.cx}
                    cy={p.cy}
                    r={p.index === last ? 5 : 3}
                    fill="var(--card)"
                    stroke={PALETTE.primary}
                    strokeWidth={p.index === last ? 2.5 : 1.5}
                  />
                )}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </ChartCard>
    </section>
  )
}

/* ------------------------------------------------------- composition -- */

export function BodyComposition({ model }: { model: OptimizationModel }) {
  const s = model.data.snapshot
  const { rows, scale, watch } = compositionRows(model)
  if (rows.length === 0) return null
  const lead = watch.map((w) => `${w.metric} down ${fmt(Math.abs(w.delta), 1)} ${w.unit} · protect it`).join(" · ")
  const sub = `Scale ${fmt(s.scale.weight)} lb on ${monthDay(s.scale.date)} vs DEXA ${fmt(rows.find((r) => /weight/i.test(r.metric))?.latest ?? 0, 1)} lb on ${monthDay(s.scanDates.latest)}`
  return (
    <OptCard
      id="composition"
      title="Body composition"
      description={`DEXA ${monthDay(s.scanDates.first)} → ${usDay(s.scanDates.latest)} · % change`}
      flush
      footer={<FooterLines lead={lead || "All DEXA metrics improved"} sub={sub} tone={watch.length ? "warning" : "success"} />}
    >
      <div className="px-4 pt-1">
        {rows.map((r) => (
          <DivergingBarRow
            key={r.metric}
            label={r.metric}
            subline={`${fmt(r.first)} → ${fmt(r.latest)}${r.unit === "%" ? "%" : ` ${r.unit.replace("/day", "")}`}`}
            value={r.pct}
            scale={scale}
            tone={r.status === "Watch" ? "warning" : "primary"}
          />
        ))}
      </div>
    </OptCard>
  )
}
