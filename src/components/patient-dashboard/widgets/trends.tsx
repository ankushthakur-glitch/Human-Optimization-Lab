"use client"

import * as React from "react"
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts"

import { cn } from "@/lib/utils"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/design-system/ui/chart"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"
import { SUB_TAB, SUB_TABS_LIST } from "@/components/practice/directory"
import { NOW, usDay } from "@/components/provider/mock-clock"
import {
  STATUS_COLOR,
  StatusDefs,
  statusColors,
  statusSeries,
} from "@/components/dashboard-kit-v2/status-trend"

/* A list of metrics as vertical tabs beside the picked one's trend, shared
   by the optimization member's plans and the free member's problems. It
   works like the chart's Vitals trend: every reading as a dot, the line
   and a fading area in each reading's status colour (green in target,
   orange at its edge, red outside), a range switch, and on a switch the old
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
  /** A plan goal apart from the target: drawn as its own dashed line and
      named in the subline, so the tab's goal is always on the chart. */
  goal?: { value: number; label: string }
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

/** The latest reading's standing, from the same rule the chart colours
    with, so the tab and the graph never disagree: outside and moving away
    is red, outside but moving toward the range is green "Improving", near
    a limit is orange, inside is green. */
export function metricStatus(m: Pick<TrendMetric, "points" | "low" | "high">, noun = "target") {
  const last = m.points[m.points.length - 1]
  if (!last) return undefined
  const status = statusSeries(
    m.points.map((p) => p.value),
    m.low,
    m.high,
    m.points.map((p) => p.out)
  )[m.points.length - 1]
  const above = m.high != null && last.value > m.high
  const below = m.low != null && last.value < m.low
  const outside = above || below || last.out
  const word =
    status === "red"
      ? above
        ? `Above ${noun}`
        : below
          ? `Below ${noun}`
          : "Out of range"
      : status === "orange"
        ? "Near limit"
        : outside
          ? "Improving"
          : `In ${noun}`
  return { word, color: STATUS_COLOR[status] }
}

/** The status word with its dot, in the tab's grey line. */
export function MetricStatus({ m, noun }: { m: Pick<TrendMetric, "points" | "low" | "high">; noun?: string }) {
  const s = metricStatus(m, noun)
  if (!s) return null
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: s.color }} />
      {s.word}
    </span>
  )
}

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

type DotProps = { cx?: number; cy?: number; index?: number; payload?: { color: string } }

function ReadingDot({ cx, cy, index = 0, payload, count }: DotProps & { count: number }) {
  return (
    <circle
      className="vital-dot"
      style={{ "--f": index / Math.max(count - 1, 1) } as React.CSSProperties}
      cx={cx}
      cy={cy}
      r={3.5}
      strokeWidth={2}
      stroke={payload?.color}
      fill="var(--card)"
    />
  )
}

function MetricChart({ m, since }: { m: TrendMetric; since?: string }) {
  const id = `mt${React.useId().replace(/:/g, "")}`
  /* Status over the whole series, so the first reading shown keeps the
     direction it came in on. */
  const all = statusColors(
    m.points.map((p) => p.value),
    m.low,
    m.high,
    m.points.map((p) => p.out)
  )
  const tone = new Map(m.points.map((p, i) => [p, all[i]]))
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
    color: tone.get(p)!,
    /* The tooltip's swatch reads the row's fill. */
    fill: tone.get(p)!,
  }))
  const colors = data.map((d) => d.color)
  /* One colour paints plainly: a gradient over a flat line has no height. */
  const paint = colors.every((c) => c === colors[0]) ? colors[0] : `url(#${id}-c)`
  const config = { value: { label: m.label, color: "var(--primary)" } } satisfies ChartConfig
  const bounds = [m.low, m.high].filter((n): n is number => n != null)
  const axis = niceAxis([...data.map((d) => d.value), ...bounds, ...(m.goal ? [m.goal.value] : [])])
  if (data.length < 2)
    return (
      <p className="m-auto text-sm text-muted-foreground">
        {data.length ? "One reading in this range" : "No readings in this range"}
      </p>
    )
  return (
    <ChartContainer config={config} className="aspect-auto min-h-0 w-full flex-1">
      <ComposedChart data={data} margin={{ left: 4, right: 16, top: 8, bottom: 0 }}>
        <defs>
          <StatusDefs id={id} xs={data.map((_, i) => i)} colors={colors} />
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        {m.goal && (
          <ReferenceLine
            y={m.goal.value}
            stroke="var(--muted-foreground)"
            strokeDasharray="5 4"
            strokeOpacity={0.7}
            label={{
              value: `Goal ${m.goal.label}`,
              position: "insideTopRight",
              fill: "var(--muted-foreground)",
              fontSize: 11,
            }}
          />
        )}
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
        <YAxis width={44} tickLine={false} axisLine={false} domain={[axis.lo, axis.hi]} ticks={axis.ticks} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, items) => items?.[0]?.payload?.when} />} />
        <Area
          dataKey="value"
          type="linear"
          isAnimationActive={false}
          stroke="none"
          fill={paint}
          mask={`url(#${id}-f)`}
          activeDot={false}
          tooltipType="none"
        />
        <Line
          dataKey="value"
          type="linear"
          className="vital-line"
          isAnimationActive={false}
          stroke={paint}
          strokeWidth={1.75}
          dot={(p: DotProps) => <ReadingDot key={p.index} {...p} count={data.length} />}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
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
                  <span className="text-lg leading-6 font-semibold tabular-nums">
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
              {view.goal && `, goal ${view.goal.label}`}
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
