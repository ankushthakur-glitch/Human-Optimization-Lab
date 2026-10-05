"use client"

import * as React from "react"
import { ArrowDownRight01Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  LabelList,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import { cn } from "@/lib/utils"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/design-system/ui/chart"
import {
  AXIS,
  Badge,
  CHART,
  ChartCard,
  ChartFooter,
  ChartGrid,
  DataTable,
  Icon,
  SquareLegend,
  StatCells,
  Td,
  Th,
  Tr,
  useReducedMotion,
} from "@/components/dashboard-kit"
import { usDay } from "@/components/provider/mock-clock"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import {
  type CategoryBand,
  energySummary,
  fmt,
  goalLine,
  markerByName,
  monthDay,
  numericHistory,
  scanChange,
  signed,
} from "@/components/patient-dashboard/optimization/rules"
import { OptCard, optDomId } from "@/components/patient-dashboard/optimization-computed/parts/ui"

/* The optimization view's charts, on the kit's shared chart settings
   (shadcn/ui Chart on Recharts): a score ring, score by category, body
   progress toward a goal, DEXA and RMR change, and energy balance. */

/* --------------------------------------------------------------- ring -- */

/** A full grey ring with the primary arc from the top; the centre is free. */
export function Ring({
  value,
  max,
  label,
  size = 96,
  children,
}: {
  value: number
  max: number
  label: string
  size?: number
  children: React.ReactNode
}) {
  const reduced = useReducedMotion()
  const config = { value: { label, color: CHART.primary } } satisfies ChartConfig
  return (
    <div role="img" aria-label={label} className="relative shrink-0" style={{ width: size, height: size }}>
      <ChartContainer config={config} className="aspect-square size-full">
        <RadialBarChart
          data={[{ value }]}
          startAngle={90}
          endAngle={-270}
          innerRadius="84%"
          outerRadius="100%"
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <PolarAngleAxis type="number" domain={[0, max]} tick={false} axisLine={false} />
          <RadialBar
            dataKey="value"
            cornerRadius={8}
            fill={CHART.primary}
            background={{ fill: "var(--viz-track)" }}
            isAnimationActive={!reduced}
          />
        </RadialBarChart>
      </ChartContainer>
      <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}

/* --------------------------------------------------------- categories -- */

const BAND_COLOR: Record<CategoryBand, string> = {
  "Priority area": CHART.clinical,
  Mixed: CHART.primary,
  Strong: CHART.primaryLight,
}

export function CategoryScores({ model }: { model: OptimizationModel }) {
  const reduced = useReducedMotion()
  const rows = model.categories
  const priority = rows.filter((r) => r.band === "Priority area")
  const count = (b: CategoryBand) => rows.filter((r) => r.band === b).length
  const config = { score: { label: "Score", color: CHART.primary } } satisfies ChartConfig
  return (
    <OptCard
      id="categories"
      title="Score by category"
      description={`${rows.length} categories · whole panel ${model.data.snapshot.score}%`}
      className="h-full"
    >
      <div role="img" aria-label={rows.map((r) => `${r.category} ${r.score}%`).join(", ")}>
        <ChartContainer config={config} className="aspect-auto w-full" style={{ height: rows.length * 30 + 16 }}>
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 44, bottom: 0, left: 0 }} barSize={18}>
            <ChartGrid />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="category"
              {...AXIS}
              width={150}
              interval={0}
              tick={{ fontSize: 12, fill: "var(--foreground)", opacity: 0.8 }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" hideLabel formatter={(v, _n, p) => `${p.payload.category} ${v}%`} />}
            />
            <Bar dataKey="score" radius={[0, 9, 9, 0]} isAnimationActive={!reduced}>
              {rows.map((r) => (
                <Cell key={r.category} fill={BAND_COLOR[r.band]} />
              ))}
              <LabelList
                dataKey="score"
                position="right"
                offset={8}
                fontSize={12}
                fill="var(--foreground)"
                formatter={(v: unknown) => `${v}%`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
      <SquareLegend
        items={(["Priority area", "Mixed", "Strong"] as CategoryBand[]).map((b) => ({
          key: b,
          label: `${b} ${count(b)}`,
          color: BAND_COLOR[b],
        }))}
      />
      {priority.length > 0 && (
        <div className="flex flex-col gap-0.5 pt-4 text-[13px]">
          <p className="text-sm font-medium tabular-nums">
            {priority.length} priority {priority.length === 1 ? "area" : "areas"}
          </p>
          <p className="text-muted-foreground">{priority.map((r) => r.category).join(" · ")}</p>
        </div>
      )}
    </OptCard>
  )
}

/* ------------------------------------------------------ body progress -- */

const at = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).getTime()
const tickDay = (t: number) => {
  const d = new Date(t)
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
}

export function BodyProgress({ model }: { model: OptimizationModel }) {
  const reduced = useReducedMotion()
  const goals = model.goals
  const [pick, setPick] = React.useState(goals[0]?.metric ?? "")
  const id = React.useId().replace(/:/g, "")
  const goal = goals.find((g) => g.metric === pick) ?? goals[0]
  if (!goal) return null
  const marker = markerByName(model.data.biomarkers, goal.seriesMarkerName)!
  const points = numericHistory(marker).filter((p) => p.date >= model.data.planSince)
  const data = points.map((p) => ({ t: at(p.date), value: p.n }))
  const values = [...data.map((d) => d.value), goal.goal]
  const step = goal.unit === "lb" ? 5 : 1
  const min = Math.floor((Math.min(...values) - step / 2) / step) * step
  const max = Math.ceil((Math.max(...values) + step / 2) / step) * step
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step)
  const line = goalLine(goal)
  const last = data.length - 1
  const config = { value: { label: `${goal.metric} (${goal.unit})`, color: CHART.primary } } satisfies ChartConfig
  const toward = goal.betterDirection === "Lower" ? goal.current < goal.baseline : goal.current > goal.baseline

  return (
    <section id={optDomId("body")} tabIndex={-1} className="h-full scroll-mt-3 outline-none">
      <ChartCard
        className="h-full"
        title="Body progress"
        titleId="opt-body-title"
        description={`Since ${usDay(model.data.planSince)} · goal ${goal.goalLabel}`}
        aside={
          goals.length > 1 ? (
            <StatCells
              label="Body progress series"
              value={goal.metric}
              onChange={setPick}
              cells={goals.map((g) => ({ key: g.metric, label: g.metric, value: g.current, unit: g.unit }))}
            />
          ) : undefined
        }
        footer={
          <ChartFooter
            className={toward ? "text-success" : "text-foreground"}
            lead={`${line.lead} · ${line.progress}`}
            icon={<Icon icon={goal.current < goal.baseline ? ArrowDownRight01Icon : ArrowUpRight01Icon} />}
            sub={`Projection ${goal.projection} by ${usDay(goal.goalDate)} · ${goal.confidence.toLowerCase()} confidence`}
          />
        }
      >
        <div
          role="img"
          aria-label={`${goal.metric} from ${fmt(goal.baseline)} to ${fmt(goal.current)} ${goal.unit}, goal ${goal.goalLabel}`}
        >
          <ChartContainer config={config} className="aspect-auto h-[360px] w-full">
            <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id={`body-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={CHART.primary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <ChartGrid />
              <XAxis
                {...AXIS}
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={tickDay}
                minTickGap={24}
              />
              <YAxis {...AXIS} domain={[min, max]} ticks={ticks} />
              <ReferenceLine
                y={goal.goal}
                stroke={CHART.success}
                strokeDasharray="4 4"
                label={{ value: `Goal ${goal.goalLabel}`, position: "insideBottomLeft", fill: CHART.success, fontSize: 12, dy: 16 }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" labelFormatter={(_, p) => usDay(new Date(Number(p?.[0]?.payload?.t)).toISOString())} />}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART.primary}
                strokeWidth={2}
                fill={`url(#body-${id})`}
                isAnimationActive={!reduced}
                dot={(p: { cx?: number; cy?: number; index?: number }) => (
                  <circle
                    key={p.index}
                    cx={p.cx}
                    cy={p.cy}
                    r={p.index === last ? 6 : 3.5}
                    fill="var(--card)"
                    stroke={CHART.primary}
                    strokeWidth={p.index === last ? 2.5 : 1.75}
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

/* ---------------------------------------------------------- DEXA, RMR -- */

export function DexaRmr({ model }: { model: OptimizationModel }) {
  const reduced = useReducedMotion()
  const { scans, snapshot } = model.data
  const rows = scans.map((s) => ({ ...s, ...scanChange(s) }))
  const weight = rows.find((r) => r.metric === "Weight")
  const config = { pct: { label: "Change (%)", color: CHART.primary } } satisfies ChartConfig
  const color = (s: string) => (s === "Watch" ? CHART.process : CHART.primary)

  /* Value labels sit past the bar's end: above a rise, below a fall. */
  const label = (p: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown }) => {
    const v = Number(p.value)
    const x = Number(p.x) + Number(p.width) / 2
    const top = Math.min(Number(p.y), Number(p.y) + Number(p.height))
    const bottom = Math.max(Number(p.y), Number(p.y) + Number(p.height))
    const y = v < 0 ? bottom + 16 : top - 8
    return (
      <text x={x} y={y} textAnchor="middle" fontSize={12} fill="var(--foreground)" opacity={0.8}>
        {`${v}%`}
      </text>
    )
  }

  return (
    <OptCard
      id="dexa"
      title="DEXA and RMR change"
      description={`${usDay(snapshot.scanDates.first)} → ${usDay(snapshot.scanDates.latest)}`}
      flush
      className="h-full"
      footer={
        weight && (
          <span>
            Scale weight {usDay(snapshot.scale.date)} = {fmt(snapshot.scale.weight)} lb · DEXA weight {usDay(snapshot.scanDates.latest)} ={" "}
            {fmt(weight.latest)} lb
          </span>
        )
      }
    >
      <div className="px-5 pt-4" role="img" aria-label={rows.map((r) => `${r.metric} ${r.pct}%`).join(", ")}>
        <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
          <BarChart data={rows} margin={{ top: 24, right: 8, bottom: 0, left: 8 }} barSize={44}>
            <ChartGrid />
            <XAxis dataKey="short" {...AXIS} interval={0} />
            <YAxis hide domain={["dataMin - 6", "dataMax + 4"]} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" hideLabel formatter={(v, _n, p) => `${p.payload.metric} ${v}%`} />} />
            <Bar dataKey="pct" radius={6} isAnimationActive={!reduced}>
              {rows.map((r) => (
                <Cell key={r.metric} fill={color(r.status)} />
              ))}
              <LabelList dataKey="pct" content={label} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
      <div className="mt-3 border-t border-[color-mix(in_oklab,var(--border)_65%,transparent)]">
        <DataTable aria-label="DEXA and RMR change" minWidth={420}>
          <thead>
            <tr>
              <Th>Metric</Th>
              <Th className="text-right">{monthDay(snapshot.scanDates.first)}</Th>
              <Th className="text-right">{monthDay(snapshot.scanDates.latest)}</Th>
              <Th className="text-right">Change</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.metric}>
                <Td>
                  {r.metric} ({r.unit})
                </Td>
                <Td className="text-right text-muted-foreground tabular-nums">{fmt(r.first)}</Td>
                <Td className="text-right font-semibold tabular-nums">{fmt(r.latest)}</Td>
                <Td className={cn("text-right font-medium tabular-nums", r.status === "Watch" ? "text-warning" : "text-success")}>
                  {signed(r.delta, 1)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    </OptCard>
  )
}

/* ------------------------------------------------------ energy balance -- */

export function EnergyBalance({ model }: { model: OptimizationModel }) {
  const reduced = useReducedMotion()
  const days = model.data.energy
  if (days.length === 0) return null
  const sum = energySummary(days)
  const data = days.map((d) => ({ day: monthDay(d.date), deficit: d.burn - d.intake, low: Boolean(d.lowConfidence) }))
  const config = { deficit: { label: "Deficit (kcal)", color: CHART.primary } } satisfies ChartConfig
  return (
    <section id={optDomId("energy")} tabIndex={-1} className="h-full scroll-mt-3 outline-none">
      <ChartCard
        className="h-full"
        title="Energy balance"
        titleId="opt-energy-title"
        description={`${days.length} days to ${usDay(sum.last!)} · daily deficit`}
        aside={
          <div className="flex items-start px-5 py-3.5">
            <Badge tone="primary">Avg {fmt(sum.deficit)} kcal</Badge>
          </div>
        }
        footer={
          <ChartFooter
            lead={`RMR ${fmt(model.data.rmr)} · intake ${fmt(sum.intake)} · burn ${fmt(sum.burn)} kcal`}
            sub={sum.lowDays.length > 0 ? `${sum.lowDays.map(monthDay).join(", ")} low-confidence ${sum.lowDays.length === 1 ? "day" : "days"} (lighter bar)` : undefined}
          />
        }
      >
        <div role="img" aria-label={data.map((d) => `${d.day} ${d.deficit} kcal`).join(", ")}>
          <ChartContainer config={config} className="aspect-auto h-[200px] w-full">
            <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: -20 }}>
              <ChartGrid />
              <XAxis dataKey="day" {...AXIS} interval={0} />
              <YAxis {...AXIS} allowDecimals={false} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="deficit" radius={6} isAnimationActive={!reduced}>
                {data.map((d) => (
                  <Cell key={d.day} fill={d.low ? CHART.primaryLight : CHART.primary} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </ChartCard>
    </section>
  )
}
