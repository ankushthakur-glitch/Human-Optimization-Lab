"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from "recharts"

import { cn } from "@/lib/utils"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/design-system/ui/chart"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"
import { SUB_TAB, SUB_TABS_LIST } from "@/components/practice/directory"
import { NOW, usDay } from "@/components/provider/mock-clock"

/* A list of metrics as vertical tabs beside the picked one's trend, shared
   by the optimization member's plans and the free member's problems. It
   works like the chart's Vitals trend: every reading as a dot (red outside
   target), the target band behind, a range switch, and on a switch the old
   line retracts before the new one draws in (globals.css, .vital-line and
   .vital-dot). */

export type TrendPoint = { date: string; value: number; out: boolean; source: string }

export type TrendMetric = {
  id: string
  label: string
  /** Left out for unitless values (ratios, indexes). */
  unit?: string
  /** The latest value as shown. */
  value: string
  /** Oldest first. */
  points: TrendPoint[]
  low?: number
  high?: number
  /** "70-99", for the chart's subline. */
  target?: string
  /** Under the value in the tab: goal, status. */
  meta?: React.ReactNode
  /** On the tab's right: goal progress, trend. */
  aside?: React.ReactNode
}

const RANGES = [
  { id: "90", label: "3 months" },
  { id: "180", label: "6 months" },
  { id: "all", label: "All" },
]

function isoDaysAgo(days: number) {
  return new Date(new Date(NOW).getTime() - days * 86_400_000).toISOString().slice(0, 10)
}

/* Round steps and a little room above and below (as the Vitals axis). */
function niceAxis(values: number[]) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const raw = Math.max((max - min) / 4, 0.1)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw)!
  const lo = Math.floor((min - step / 2) / step) * step
  const hi = Math.ceil((max + step / 2) / step) * step
  const ticks: number[] = []
  for (let t = lo; t <= hi + step / 1000; t += step) ticks.push(Math.round(t * 100) / 100)
  return { lo, hi, ticks }
}

type DotProps = { cx?: number; cy?: number; index?: number; payload?: { out: boolean } }

function ReadingDot({ cx, cy, index = 0, payload, count }: DotProps & { count: number }) {
  const out = payload?.out
  return (
    <circle
      className="vital-dot"
      style={{ "--f": index / Math.max(count - 1, 1) } as React.CSSProperties}
      cx={cx}
      cy={cy}
      r={3.5}
      strokeWidth={1.5}
      stroke={out ? "var(--destructive)" : "var(--color-value)"}
      fill={out ? "var(--destructive)" : "var(--card)"}
    />
  )
}

function MetricChart({ m, since }: { m: TrendMetric; since?: string }) {
  const points = m.points.filter((p) => !since || p.date >= since)
  /* Readings that cross a year show it on the axis. */
  const years = new Set(points.map((p) => p.date.slice(0, 4))).size > 1
  const data = points.map((p) => ({
    date: new Date(`${p.date.slice(0, 10)}T12:00:00`).toLocaleDateString(
      "en-US",
      years ? { month: "short", year: "numeric" } : { month: "short", day: "numeric" }
    ),
    when: `${usDay(p.date.slice(0, 10))} · ${p.source}`,
    value: p.value,
    out: p.out,
  }))
  const config = { value: { label: m.label, color: "var(--primary)" } } satisfies ChartConfig
  const bounds = [m.low, m.high].filter((n): n is number => n != null)
  const axis = niceAxis([...data.map((d) => d.value), ...bounds])
  if (data.length < 2)
    return (
      <p className="m-auto text-sm text-muted-foreground">
        {data.length ? "One reading in this range" : "No readings in this range"}
      </p>
    )
  return (
    <ChartContainer config={config} className="aspect-auto min-h-0 w-full flex-1">
      <LineChart data={data} margin={{ left: 4, right: 16, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        {bounds.length > 0 && (
          <ReferenceArea
            y1={m.low ?? axis.lo}
            y2={m.high ?? axis.hi}
            fill="var(--success)"
            fillOpacity={0.07}
            ifOverflow="hidden"
          />
        )}
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
        <YAxis width={44} tickLine={false} axisLine={false} domain={[axis.lo, axis.hi]} ticks={axis.ticks} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, items) => items?.[0]?.payload?.when} />} />
        <Line
          dataKey="value"
          type="linear"
          className="vital-line"
          isAnimationActive={false}
          stroke="var(--color-value)"
          strokeWidth={1.75}
          dot={(p: DotProps) => <ReadingDot key={p.index} {...p} count={data.length} />}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  )
}

/** Matches the exit in globals.css: the line retracts, the dots follow. */
const EXIT_MS = 700

export function MetricTrends({ metrics, label = "Metrics" }: { metrics: TrendMetric[]; label?: string }) {
  const [picked, setPicked] = React.useState(metrics[0]?.id)
  const [range, setRange] = React.useState("all")
  const current = metrics.find((m) => m.id === picked) ?? metrics[0]
  /* The chart on screen lags the tabs: the old line retracts first, then
     the new chart mounts and draws in (as the Vitals trend). */
  const [shownKey, setShownKey] = React.useState({ id: current?.id, range })
  const [leaving, setLeaving] = React.useState(false)
  const timer = React.useRef<number>(undefined)
  React.useEffect(() => () => window.clearTimeout(timer.current), [])
  const view = metrics.find((m) => m.id === shownKey.id) ?? current

  function show(id: string, nextRange: string) {
    setPicked(id)
    setRange(nextRange)
    window.clearTimeout(timer.current)
    const next = { id, range: nextRange }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShownKey(next)
      return
    }
    setLeaving(true)
    timer.current = window.setTimeout(() => {
      setShownKey(next)
      setLeaving(false)
    }, EXIT_MS)
  }

  if (!current || !view) return null
  const since = shownKey.range === "all" ? undefined : isoDaysAgo(Number(shownKey.range))
  const readings = view.points.filter((p) => !since || p.date >= since).length

  return (
    <div className="grid min-h-[440px] grid-cols-1 border-t md:grid-cols-[280px_1fr]">
      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label={label}
        className="flex flex-col overflow-y-auto border-b md:max-h-[520px] md:border-r md:border-b-0"
      >
        {metrics.map((m) => {
          const on = m.id === current.id
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => m.id !== current.id && show(m.id, range)}
              className={cn(
                "relative flex flex-col border-b px-4 py-3.5 text-left transition-colors last:border-b-0",
                "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary before:opacity-0 before:transition-opacity",
                on
                  ? "bg-[color-mix(in_oklab,var(--primary)_9%,var(--card))] before:opacity-100"
                  : "bg-card hover:bg-surface-row-hover"
              )}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 flex-col gap-1">
                  <span className={cn("truncate text-xs text-muted-foreground", on && "font-medium text-foreground")}>
                    {m.label}
                  </span>
                  <span className={cn("text-lg leading-6 font-semibold tabular-nums", on && "text-primary")}>
                    {m.value}
                    {m.unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{m.unit}</span>}
                  </span>
                  {m.meta && (
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground tabular-nums">
                      {m.meta}
                    </span>
                  )}
                </span>
                {m.aside}
              </span>
            </button>
          )
        })}
      </div>
      <div className="flex min-w-0 flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-[15px] font-semibold">
              {view.label}
              {view.unit && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({view.unit})</span>}
            </h3>
            <span className="text-xs text-muted-foreground tabular-nums">
              {readings} {readings === 1 ? "reading" : "readings"}
              {view.target && `, target ${view.target}`}
            </span>
          </div>
          <Tabs value={range} onValueChange={(v) => v !== range && show(current.id, v as string)}>
            <TabsList className={SUB_TABS_LIST}>
              {RANGES.map((r) => (
                <TabsTrigger key={r.id} value={r.id} className={SUB_TAB}>
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div
          key={`${shownKey.id}-${shownKey.range}`}
          data-leaving={leaving || undefined}
          className="flex min-h-[320px] flex-1 flex-col"
        >
          <MetricChart m={view} since={since} />
        </div>
      </div>
    </div>
  )
}
