"use client"

import * as React from "react"
import { Bar, BarChart, Cell, Label, LabelList, Pie, PieChart, XAxis, YAxis } from "recharts"

import { cn } from "@/lib/utils"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/design-system/ui/chart"
import {
  AXIS_PROPS,
  ChartCard,
  FOCUS,
  Grid,
  Legend,
  PALETTE,
  pressableBar,
  useReducedMotion,
} from "@/components/dashboard-kit-v2"
import { fmtInt } from "@/components/provider/home-v2/clock"
import { PRIORITIES, PRIORITY_WORD, plural } from "@/components/provider/home-v2/labels"
import {
  AGE_BUCKETS,
  type AgeBucket,
  type TopPatient,
  ageBucketOf,
} from "@/components/provider/home-v2/selectors"
import type { Priority, QueueItem } from "@/components/provider/home-v2/types"

/* The chart row: how urgent the queue is, how old it is, and who has the
   most waiting. Each is a shadcn chart on the kit's
   palette; a slice or bar pressed filters the Worklist. */

/* Colourful but soft: each level its own hue, at a pastel lightness so
   the charts stay quiet beside the table. */
const PRIORITY_COLOR: Record<Priority, string> = {
  urgent: "oklch(0.7 0.13 22)",
  moderate: "oklch(0.8 0.11 65)",
  routine: "oklch(0.76 0.09 240)",
}

/* Time open, cool to warm as items age. */
const AGE_COLOR = [
  "oklch(0.8 0.08 180)",
  "oklch(0.78 0.08 220)",
  "oklch(0.75 0.09 280)",
  "oklch(0.8 0.1 70)",
  "oklch(0.72 0.12 22)",
]

/* ----------------------------------------------------------- priority -- */

export function PriorityCard({
  open,
  selected,
  onSelect,
  className,
}: {
  open: QueueItem[]
  selected: Priority | ""
  onSelect: (p: Priority) => void
  className?: string
}) {
  const reduced = useReducedMotion()
  const rows = PRIORITIES.map((priority) => ({
    priority,
    label: PRIORITY_WORD[priority],
    count: open.filter((i) => i.priority === priority).length,
    fill: PRIORITY_COLOR[priority],
  }))
  const slices = rows.filter((r) => r.count > 0)
  const config = Object.fromEntries(rows.map((r) => [r.priority, { label: r.label, color: r.fill }])) satisfies ChartConfig

  return (
    <ChartCard
      title="Open items by priority"
      titleId="priority-mix"
      className={className}
    >
      {/* The donut, then the legend: colour, name and count per priority. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-4">
        <ChartContainer config={config} className="aspect-square h-[236px] w-[236px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="priority" indicator="dot" />} />
            <Pie
              data={slices}
              dataKey="count"
              nameKey="priority"
              startAngle={90}
              endAngle={-270}
              innerRadius={78}
              outerRadius={112}
              strokeWidth={0}
              isAnimationActive={!reduced}
              onClick={(_, index) => onSelect(slices[index]!.priority)}
              className="cursor-pointer"
            >
              {slices.map((s) => (
                <Cell key={s.priority} fill={s.fill} opacity={selected && selected !== s.priority ? 0.35 : 1} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox)) return null
                  const { cx, cy } = viewBox as { cx: number; cy: number }
                  return (
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={cx} y={cy - 8} className="fill-foreground text-[32px] font-semibold tabular-nums">
                        {fmtInt(open.length)}
                      </tspan>
                      <tspan x={cx} y={cy + 18} className="fill-muted-foreground text-[13px]">
                        Open items
                      </tspan>
                    </text>
                  )
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <Legend
          items={rows.map((r) => ({
            key: r.priority,
            label: (
              <>
                {r.label} <span className="font-semibold text-foreground tabular-nums">{fmtInt(r.count)}</span>
              </>
            ),
            color: r.fill,
            onPress: () => onSelect(r.priority),
            pressed: selected === r.priority,
            dim: !!selected && selected !== r.priority,
          }))}
        />
      </div>
    </ChartCard>
  )
}

/* ---------------------------------------------------------- time open -- */


export function TimeOpenCard({
  open,
  selected,
  onSelect,
  className,
}: {
  open: QueueItem[]
  selected: AgeBucket | ""
  onSelect: (b: AgeBucket) => void
  className?: string
}) {
  const reduced = useReducedMotion()
  const data = AGE_BUCKETS.map((b, i) => ({
    key: b.key,
    label: b.label,
    count: open.filter((item) => ageBucketOf(item) === b.key).length,
    fill: AGE_COLOR[Math.min(i, AGE_COLOR.length - 1)]!,
  }))
  const config = { count: { label: "Open items", color: PALETTE.primary } } satisfies ChartConfig
  const Shape = pressableBar({
    onPress: (i) => onSelect(data[i]!.key),
    labelOf: (i) => `${data[i]!.label}: ${plural(data[i]!.count, ["item", "items"])}`,
    dimmed: (i) => !!selected && selected !== data[i]!.key,
  })

  return (
    <ChartCard title="Time open" titleId="time-open" className={className}>
      {/* A counted column chart on a light grid, with a y axis and the
          oldest bucket in amber. */}
      <ChartContainer config={config} className="aspect-auto h-[300px] w-full min-w-0 pr-4 pb-4">
        <BarChart data={data} margin={{ top: 22, right: 0, bottom: 0, left: -12 }} accessibilityLayer={false}>
          <Grid />
          <XAxis dataKey="label" {...AXIS_PROPS} interval={0} />
          <YAxis {...AXIS_PROPS} allowDecimals={false} width={40} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
          <Bar dataKey="count" radius={4} maxBarSize={44} minPointSize={2} isAnimationActive={!reduced} shape={Shape}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.fill} />
            ))}
            <LabelList dataKey="count" position="top" offset={6} className="fill-foreground text-xs tabular-nums" />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

/* ------------------------------------------------------- top patients -- */

export type TopPatientRow = TopPatient & { name: string }

/* One row per patient: the name, a bar split by priority on a shared
   scale, and the total. Pressing a row filters the Worklist to them. */
export function TopPatientsCard({
  rows,
  onSelect,
  className,
}: {
  rows: TopPatientRow[]
  onSelect: (row: TopPatientRow) => void
  className?: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <ChartCard title="Patients with the most open items" titleId="top-patients" className={className}>
      <div className="flex flex-1 flex-col gap-4 pb-4">
        <div className="grid grid-cols-[minmax(0,8rem)_1fr_2rem] items-center gap-x-3 border-b border-border pb-2 text-xs text-muted-foreground">
          <span>Patient</span>
          <span>By priority</span>
          <span className="text-right">Open</span>
        </div>
        <ul className="flex flex-1 flex-col justify-between gap-1">
          {rows.map((r) => (
            <li key={r.patientId}>
              <button
                type="button"
                onClick={() => onSelect(r)}
                aria-label={`${r.name}: ${plural(r.count, ["open item", "open items"])}, ${PRIORITIES.filter((p) => r[p] > 0).map((p) => `${r[p]} ${PRIORITY_WORD[p].toLowerCase()}`).join(", ")}`}
                className={cn(
                  "grid w-full grid-cols-[minmax(0,8rem)_1fr_2rem] items-center gap-x-3 rounded-sm py-1.5 text-left text-[13px] hover:bg-surface-row-hover",
                  FOCUS
                )}
              >
                <span className="truncate">{r.name}</span>
                <span className="flex h-5 overflow-hidden rounded-[4px] bg-secondary">
                  <span className="flex h-full gap-px" style={{ width: `${(r.count / max) * 100}%` }}>
                    {PRIORITIES.filter((p) => r[p] > 0).map((p) => (
                      <span
                        key={p}
                        className={cn("flex h-full items-center justify-center text-[11px] font-medium tabular-nums", "text-foreground/80")}
                        style={{ flexGrow: r[p], background: PRIORITY_COLOR[p] }}
                      >
                        {r[p]}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="text-right font-semibold tabular-nums">{fmtInt(r.count)}</span>
              </button>
            </li>
          ))}
        </ul>
        <Legend
          items={PRIORITIES.map((p) => ({ key: p, label: PRIORITY_WORD[p], color: PRIORITY_COLOR[p] }))}
        />
      </div>
    </ChartCard>
  )
}
