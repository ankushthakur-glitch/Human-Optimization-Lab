"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  YAxis,
} from "recharts"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/design-system/ui/skeleton"
import { Card } from "@/components/dashboard-kit-v2/card"
import { DIVIDER, FOCUS } from "@/components/dashboard-kit-v2/icon"

/* The kit's chart layer: shadcn/ui Chart on Recharts, the build's one chart
   stack. Colours are build tokens read as CSS variables, so charts follow
   the theme. One grid style, one axis style, a dot tooltip, HTML legends,
   and no motion when the viewer asks for none. */

export const PALETTE = {
  primary: "var(--primary)",
  primaryLight: "var(--primary-4)",
  primaryDark: "var(--primary-tint)",
  clinical: "var(--destructive)",
  process: "var(--warning)",
  /** The lighter amber for a bar that only asks to be watched. */
  processLight: "color-mix(in oklab, var(--warning) 70%, var(--card))",
  success: "var(--success)",
  info: "var(--info)",
  neutral: "var(--muted-foreground)",
  grid: "color-mix(in oklab, var(--border) 75%, transparent)",
} as const

export const AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  tick: { fontSize: 12, fill: "var(--muted-foreground)" },
} as const

export function useReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)"
  return React.useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", notify)
      return () => list.removeEventListener("change", notify)
    },
    () => window.matchMedia(query).matches,
    () => true
  )
}

export function Grid() {
  return <CartesianGrid vertical={false} stroke={PALETTE.grid} />
}

/* --------------------------------------------------------- chart card -- */

/** The shadcn chart card: title and description, an optional right slot of
    stat cells or a control, the chart filling the spare height so footers
    in a row line up, and a two-line footer. */
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
  description?: React.ReactNode
  aside?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card aria-labelledby={titleId} className={cn("h-full", className)}>
      <header
        className={cn("flex items-stretch", aside && cn("border-b", DIVIDER))}
      >
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-4 py-3">
          <h2
            id={titleId}
            className="truncate text-[15px] leading-[23px] font-semibold"
          >
            {title}
          </h2>
          {description && (
            <p className="truncate text-[13px] leading-5 text-muted-foreground tabular-nums">
              {description}
            </p>
          )}
        </div>
        {aside}
      </header>
      <div className="flex min-h-0 flex-1 flex-col justify-center px-4 pt-4">
        {children}
      </div>
      {footer && (
        <footer className="flex flex-col gap-0.5 px-4 pt-3 pb-4">
          {footer}
        </footer>
      )}
    </Card>
  )
}

/** HTML legend squares under a chart. An item with onPress is a button. */
export function Legend({
  items,
  className,
}: {
  items: {
    key: string
    label: React.ReactNode
    color: string
    onPress?: () => void
    pressed?: boolean
    dim?: boolean
  }[]
  className?: string
}) {
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3 text-[13px] text-muted-foreground",
        className
      )}
    >
      {items.map((item) => {
        const inner = (
          <>
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ background: item.color }}
            />
            {item.label}
          </>
        )
        return (
          <li
            key={item.key}
            className={cn("transition-opacity", item.dim && "opacity-50")}
          >
            {item.onPress ? (
              <button
                type="button"
                aria-pressed={item.pressed}
                onClick={item.onPress}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-sm tabular-nums hover:text-foreground",
                  FOCUS
                )}
              >
                {inner}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                {inner}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function ChartCardSkeleton({
  className,
  cells = 0,
  body = "h-[220px] w-full rounded-[5.76px]",
}: {
  className?: string
  cells?: number
  body?: string
}) {
  return (
    <Card className={cn("h-full", className)}>
      <div className="flex items-stretch">
        <div className="flex flex-1 flex-col gap-2 px-4 py-4">
          <Skeleton className="h-4 w-32 rounded-sm" />
          <Skeleton className="h-3 w-48 rounded-sm" />
        </div>
        {Array.from({ length: cells }, (_, i) => (
          <div
            key={i}
            className={cn(
              "flex w-28 flex-col gap-2 border-l px-4 py-4",
              DIVIDER
            )}
          >
            <Skeleton className="h-3 w-14 rounded-sm" />
            <Skeleton className="h-6 w-10 rounded-sm" />
          </div>
        ))}
      </div>
      <div className="flex flex-1 items-center px-4 pt-4">
        <Skeleton className={cn("mx-auto", body)} />
      </div>
      <div className="flex flex-col gap-1.5 px-4 pt-3 pb-4">
        <Skeleton className="h-4 w-48 rounded-sm" />
        <Skeleton className="h-3 w-36 rounded-sm" />
      </div>
    </Card>
  )
}

/* ------------------------------------------------------ pressable bar -- */

type BarProps = React.ComponentProps<typeof Rectangle> & { index?: number }

/** A Recharts bar shape that is also a button: click, Enter or Space
    presses it, and a dimmed bar reads as not selected. */
export function pressableBar({
  onPress,
  labelOf,
  dimmed,
}: {
  onPress: (index: number) => void
  labelOf: (index: number) => string
  dimmed?: (index: number) => boolean
}) {
  return function PressableBar(props: unknown) {
    const bar = props as BarProps
    const i = bar.index ?? 0
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
        opacity={dimmed?.(i) ? 0.35 : 1}
        className="cursor-pointer outline-none [&:focus-visible>path]:stroke-foreground [&:focus-visible>path]:stroke-2"
      >
        <Rectangle {...bar} />
      </g>
    )
  }
}

/* ---------------------------------------------------------- area spark -- */

/** The metric card's 14-day trend: an area with a gradient fill, 84×40
    when there is room and narrower when the card is tight. */
export function AreaSpark({
  values,
  color,
  label,
  domain,
  className,
}: {
  values: number[]
  color: string
  label: string
  /** The y range; defaults to the counts' range with a one-step floor. */
  domain?: [number, number]
  className?: string
}) {
  const id = React.useId().replace(/:/g, "")
  const reduced = useReducedMotion()
  const data = values.map((v, i) => ({ i, v }))
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("h-10 w-[84px] min-w-14 shrink", className)}
    >
      <ResponsiveContainer
        width="100%"
        height={40}
        initialDimension={{ width: 84, height: 40 }}
      >
        <AreaChart
          data={data}
          margin={{ top: 3, right: 1, bottom: 0, left: 1 }}
          accessibilityLayer={false}
        >
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis hide domain={domain ?? ["dataMin - 1", "dataMax + 0.5"]} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${id})`}
            dot={false}
            activeDot={false}
            isAnimationActive={!reduced}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
