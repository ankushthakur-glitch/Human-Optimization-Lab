"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Rectangle,
  ReferenceArea,
  XAxis,
  YAxis,
} from "recharts"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/design-system/ui/skeleton"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/design-system/ui/chart"
import { Card } from "@/components/dashboard-kit/card"
import { FOCUS_RING } from "@/components/dashboard-kit/icon"

/* The kit's charts: shadcn/ui Chart on Recharts, the build's one chart
   stack. Colours are the build's tokens as CSS variables, so every chart
   follows the theme. Shared settings: a horizontal grid only, bare axes with
   12px muted ticks, a dot tooltip, HTML square legends, motion off when the
   viewer asks. */

/** The chart palette, mapped to build tokens. */
export const CHART = {
  primary: "var(--primary)",
  primaryLight: "var(--primary-4)",
  primaryDark: "var(--primary-tint)",
  clinical: "var(--destructive)",
  process: "var(--warning)",
  success: "var(--success)",
  info: "var(--info)",
  neutral: "var(--muted-foreground)",
  grid: "color-mix(in oklab, var(--border) 75%, transparent)",
} as const

export const AXIS = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  tick: { fontSize: 12, fill: "var(--muted-foreground)" },
} as const

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

export function useReducedMotion() {
  return React.useSyncExternalStore(
    (on) => {
      const q = window.matchMedia(REDUCED_MOTION)
      q.addEventListener("change", on)
      return () => q.removeEventListener("change", on)
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true
  )
}

export function ChartGrid() {
  return <CartesianGrid vertical={false} stroke={CHART.grid} />
}

/* --------------------------------------------------------------- card -- */

/** shadcn's chart card: title and one-line description, an optional right
    slot (stat cells or a control), the chart taking the spare height, and a
    footer of one bold line over one muted line. */
export function ChartCard({
  title,
  titleId,
  description,
  aside,
  footer,
  className,
  children,
}: {
  title: string
  titleId: string
  description: React.ReactNode
  aside?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card aria-labelledby={titleId} className={cn("flex flex-col", className)}>
      <header className={cn("flex items-stretch", aside && "border-b border-[color-mix(in_oklab,var(--border)_65%,transparent)]")}>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-5 py-3.5">
          <h2 id={titleId} className="truncate text-[15px] leading-[23px] font-semibold">
            {title}
          </h2>
          <p className="truncate text-[13px] text-muted-foreground tabular-nums">{description}</p>
        </div>
        {aside}
      </header>
      <div className="flex min-h-0 flex-1 flex-col justify-center px-5 pt-4">{children}</div>
      {footer && <footer className="flex flex-col gap-0.5 px-5 pt-3 pb-4 text-[13px]">{footer}</footer>}
    </Card>
  )
}

/** The footer's two lines. */
export function ChartFooter({
  lead,
  icon,
  sub,
  className,
}: {
  lead: React.ReactNode
  icon?: React.ReactNode
  sub?: React.ReactNode
  className?: string
}) {
  return (
    <>
      <p className={cn("flex items-center gap-1.5 text-sm font-medium", className)}>
        {lead}
        {icon}
      </p>
      {sub && <p className="truncate text-muted-foreground tabular-nums">{sub}</p>}
    </>
  )
}

/** shadcn's interactive header cells: a label over a bold value. Pressing a
    cell selects its series. */
export function StatCells<T extends string>({
  cells,
  value,
  onChange,
  label,
}: {
  cells: { key: T; label: string; value: number; unit?: string }[]
  value: T
  onChange: (key: T) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="flex">
      {cells.map((c) => (
        <button
          key={c.key}
          type="button"
          aria-pressed={c.key === value}
          onClick={() => onChange(c.key)}
          className={cn(
            "flex min-w-24 flex-col justify-center gap-1 border-l border-[color-mix(in_oklab,var(--border)_65%,transparent)] px-5 py-3 text-left transition-colors sm:min-w-28",
            c.key === value ? "bg-surface-sunken" : "hover:bg-surface-row-hover",
            FOCUS_RING,
            "focus-visible:ring-inset"
          )}
        >
          <span className="text-xs text-muted-foreground">{c.label}</span>
          <span className="text-[22px] leading-7 font-semibold tabular-nums">
            {c.value.toLocaleString("en-US")}
            {c.unit && <span className="ml-1 text-[13px] font-normal text-muted-foreground">{c.unit}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}

/** HTML legend squares under a chart. Items with onPress are buttons. */
export function SquareLegend({
  items,
  className,
}: {
  items: { key: string; label: React.ReactNode; color: string; onPress?: () => void; pressed?: boolean; dim?: boolean }[]
  className?: string
}) {
  return (
    <ul className={cn("flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3 text-[13px] text-muted-foreground", className)}>
      {items.map((it) => {
        const body = (
          <>
            <span aria-hidden className="size-2.5 shrink-0 rounded-[2px]" style={{ background: it.color }} />
            {it.label}
          </>
        )
        return (
          <li key={it.key} className={cn("transition-opacity", it.dim && "opacity-50")}>
            {it.onPress ? (
              <button
                type="button"
                aria-pressed={it.pressed}
                onClick={it.onPress}
                className={cn("inline-flex items-center gap-1.5 rounded-sm tabular-nums hover:text-foreground", FOCUS_RING)}
              >
                {body}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 tabular-nums">{body}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** A chart card's loading state, in its final shape. */
export function ChartCardSkeleton({ className, cells = 0, bodyClassName }: { className?: string; cells?: number; bodyClassName?: string }) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="flex items-stretch">
        <div className="flex flex-1 flex-col gap-2 px-5 py-4">
          <Skeleton className="h-4 w-32 rounded-sm" />
          <Skeleton className="h-3 w-48 rounded-sm" />
        </div>
        {Array.from({ length: cells }, (_, i) => (
          <div key={i} className="flex w-28 flex-col gap-2 border-l px-5 py-4">
            <Skeleton className="h-3 w-14 rounded-sm" />
            <Skeleton className="h-6 w-10 rounded-sm" />
          </div>
        ))}
      </div>
      <div className="flex-1 px-5 pt-4">
        <Skeleton className={cn("h-[220px] w-full rounded-[5.76px]", bodyClassName)} />
      </div>
      <div className="flex flex-col gap-1.5 px-5 pt-3 pb-4">
        <Skeleton className="h-4 w-48 rounded-sm" />
        <Skeleton className="h-3 w-36 rounded-sm" />
      </div>
    </Card>
  )
}

/* --------------------------------------------------------------- bars -- */

type BarShapeProps = React.ComponentProps<typeof Rectangle> & { index?: number }

/** A bar that is also a button: click, Enter or Space presses it. Pass to a
    Recharts Bar as its shape. */
export function pressableBar({
  onPress,
  labelOf,
  isDim,
}: {
  onPress: (index: number) => void
  labelOf: (index: number) => string
  isDim?: (index: number) => boolean
}) {
  return function PressableBar(props: unknown) {
    const p = props as BarShapeProps
    const i = p.index ?? 0
    return (
      <g
        role="button"
        tabIndex={0}
        aria-label={labelOf(i)}
        onClick={() => onPress(i)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onPress(i)
          }
        }}
        className="cursor-pointer outline-none [&:focus-visible>path]:stroke-foreground [&:focus-visible>path]:stroke-2"
        opacity={isDim?.(i) ? 0.35 : 1}
      >
        <Rectangle {...p} />
      </g>
    )
  }
}

/* ---------------------------------------------------------- sparkline -- */

/** The metric card's trend: an axis-free area, 84×40, gradient fill. */
export function AreaSpark({
  values,
  color,
  label,
  className,
}: {
  values: number[]
  color: string
  label: string
  className?: string
}) {
  const id = React.useId().replace(/:/g, "")
  const reduced = useReducedMotion()
  const data = values.map((v, i) => ({ i, v }))
  return (
    <div role="img" aria-label={label} className={cn("h-10 w-[84px] shrink-0", className)}>
      <AreaChart width={84} height={40} data={data} margin={{ top: 3, right: 1, bottom: 0, left: 1 }} accessibilityLayer={false}>
        <defs>
          <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin - 1", "dataMax + 0.5"]} />
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${id})`}
          isAnimationActive={!reduced}
          dot={false}
          activeDot={false}
        />
      </AreaChart>
    </div>
  )
}

/* ------------------------------------------------------- result trend -- */

const shortDay = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-")
  return `${m}/${d}/${y.slice(2)}`
}

/** A result over time: a grey area with dots, the reference range as a
    green band, and the latest point red when it is out of range. */
export function ResultTrendChart({
  points,
  low,
  high,
  unit,
  latestOut,
  label,
  height = 240,
}: {
  points: { date: string; value: number }[]
  low?: number
  high?: number
  /** Kept for callers; the band carries the range. */
  rangeLabel?: string
  unit?: string
  latestOut: boolean
  label: string
  height?: number
}) {
  const id = React.useId().replace(/:/g, "")
  const reduced = useReducedMotion()
  const data = points.map((p) => ({ day: shortDay(p.date), value: p.value }))
  const values = points.map((p) => p.value)
  const lo = Math.min(...values, ...(low !== undefined ? [low] : []))
  const hi = Math.max(...values, ...(high !== undefined ? [high] : []))
  /* Ends on a tidy step, so ticks land on readable values. */
  const span = hi - lo || 1
  const step = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100].find((s) => span / s <= 5) ?? 100
  const yMin = Math.max(0, Math.floor((lo - span * 0.1) / step) * step)
  const yMax = Math.ceil((hi + span * 0.1) / step) * step
  const ticks = Array.from({ length: Math.round((yMax - yMin) / step) + 1 }, (_, i) => +(yMin + i * step).toFixed(2))
  const last = data.length - 1
  const config = { value: { label: unit ? `Value (${unit})` : "Value", color: CHART.neutral } } satisfies ChartConfig

  return (
    <div role="img" aria-label={label}>
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id={`trend-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.neutral} stopOpacity={0.16} />
              <stop offset="100%" stopColor={CHART.neutral} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <ChartGrid />
          {(low !== undefined || high !== undefined) && (
            <ReferenceArea
              y1={low ?? yMin}
              y2={high ?? yMax}
              fill={CHART.success}
              fillOpacity={0.07}
              ifOverflow="hidden"
            />
          )}
          <XAxis dataKey="day" {...AXIS} interval="preserveStartEnd" />
          <YAxis {...AXIS} domain={[yMin, yMax]} ticks={ticks} tickFormatter={(v: number) => v.toFixed(step < 1 ? 1 : 0)} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={CHART.neutral}
            strokeWidth={2}
            fill={`url(#trend-${id})`}
            isAnimationActive={!reduced}
            dot={(p: { cx?: number; cy?: number; index?: number }) =>
              p.index === last && latestOut ? (
                <circle key={p.index} cx={p.cx} cy={p.cy} r={5} fill={CHART.clinical} />
              ) : (
                <circle key={p.index} cx={p.cx} cy={p.cy} r={3.5} fill="var(--card)" stroke={CHART.neutral} strokeWidth={1.5} />
              )
            }
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
