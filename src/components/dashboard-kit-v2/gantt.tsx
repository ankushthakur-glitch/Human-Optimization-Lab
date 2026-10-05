import * as React from "react"

import { cn } from "@/lib/utils"
import { DIVIDER, FOCUS } from "@/components/dashboard-kit-v2/icon"

/* Date-range lanes: a label column, a track with month gridlines and a
   Today line at the right edge, and an outcome column. Bars are 8px and
   fully rounded, coloured by status; the status word repeats the colour's
   meaning so nothing rests on colour alone. A lane with onOpen is a row
   the keyboard can press. */

export type GanttLane = {
  key: string
  label: string
  /** 0 to 1 along the track. */
  from: number
  to: number
  color: string
  /** The status word, in the bar's colour. */
  status: string
  outcome: string
  /** For the screen reader: "03/01/2026 to 10/03/2026". */
  range: string
}

const COLS = "grid grid-cols-[260px_minmax(240px,1fr)_340px]"

export function Gantt({
  lanes,
  months,
  todayLabel = "Today",
  label,
  onOpen,
  className,
}: {
  lanes: GanttLane[]
  /** Month labels at their true positions along the track. */
  months: { label: string; x: number }[]
  todayLabel?: string
  label: string
  onOpen?: (lane: GanttLane, from: HTMLElement) => void
  className?: string
}) {
  const grid = (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {months.map((m) => (
        <span key={m.label} className="absolute inset-y-0 border-l border-border/40" style={{ left: `${m.x * 100}%` }} />
      ))}
      <span className="absolute inset-y-0 right-0 border-l border-primary" />
    </div>
  )
  return (
    <div className={cn("overflow-x-auto", className)}>
      <div role="table" aria-label={label} className="min-w-[840px]">
        <div role="row" className={cn(COLS, "border-b text-xs font-medium text-muted-foreground", DIVIDER)}>
          <span role="columnheader" className="px-5 py-2.5">
            Intervention
          </span>
          <span role="columnheader" className="relative h-9">
            <span className="sr-only">Timeline</span>
            {months.map((m) => (
              <span key={m.label} aria-hidden className="absolute top-2.5 pl-1.5" style={{ left: `${m.x * 100}%` }}>
                {m.label}
              </span>
            ))}
            <span aria-hidden className="absolute top-2.5 right-0 pr-1.5 font-semibold text-primary-tint">
              {todayLabel}
            </span>
          </span>
          <span role="columnheader" className="px-5 py-2.5">
            Outcome
          </span>
        </div>
        {lanes.map((l) => {
          const width = Math.max(0, l.to - l.from)
          return (
            <div
              key={l.key}
              role="row"
              {...(onOpen && {
                tabIndex: 0,
                onClick: (e: React.MouseEvent<HTMLDivElement>) => onOpen(l, e.currentTarget),
                onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
                  if (e.key === "Enter" && e.target === e.currentTarget) {
                    e.preventDefault()
                    onOpen(l, e.currentTarget)
                  }
                },
              })}
              className={cn(
                COLS,
                "h-9 items-center border-b last:border-0",
                DIVIDER,
                onOpen && cn("cursor-pointer hover:bg-surface-row-hover", FOCUS, "focus-visible:ring-inset")
              )}
            >
              <span role="cell" className="truncate pr-2 pl-4 text-sm font-medium" title={l.label}>
                {l.label}
              </span>
              <span role="cell" className="relative h-full">
                {grid}
                <span
                  aria-hidden
                  className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
                  style={{ left: `${l.from * 100}%`, width: `max(8px, ${width * 100}%)`, background: l.color }}
                />
                <span className="sr-only">{l.range}</span>
              </span>
              <span role="cell" className="flex min-w-0 items-center gap-1 px-5 text-sm tabular-nums">
                <span className="shrink-0 font-medium" style={{ color: l.color }}>
                  {l.status}
                </span>
                <span className="truncate text-muted-foreground" title={l.outcome}>
                  · {l.outcome}
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
