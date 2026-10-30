"use client"

import * as React from "react"
import { Bar, BarChart, Rectangle, XAxis, YAxis } from "recharts"

import { AXIS_PROPS, Card, CardHeader, Grid, useReducedMotion } from "@/components/dashboard-kit-v2"
import { CardLink } from "@/components/provider/home-v2/overview"
import { type Counts, type Period, type Report } from "@/components/provider/reports/reports-data"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/design-system/ui/chart"

const reportHref = (r: Report) => `/screens/practice/reports?report=${r.id}`

/* -------------------------------------------------------------------------- */
/*  Trend card                                                                 */
/* -------------------------------------------------------------------------- */

/** Three numbers for the current period over bars for the last few
    periods, one bar group per period. */
export function TrendCard({
  title,
  report,
  stats,
  config,
  stacked,
  rows,
}: {
  title: string
  /** The report the card opens; none when no report covers it. */
  report?: Report
  stats: { label: string; value: string }[]
  config: ChartConfig
  stacked?: boolean
  rows: { period: Period; counts: Counts }[]
}) {
  const reduced = useReducedMotion()
  const keys = Object.keys(config)
  const data = rows.map((r) => ({
    /* Six months read as "Oct"; quarters and years keep their full label. */
    label: rows.length > 4 ? r.period.label.slice(0, 3) : r.period.label,
    period: r.period.label,
    ...Object.fromEntries(keys.map((k) => [k, r.counts[k]])),
  }))
  return (
    <Card>
      <CardHeader
        title={title}
        actions={report && <CardLink href={reportHref(report)}>Report</CardLink>}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <dl className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="flex min-w-0 flex-col">
              <dt className="truncate text-xs text-muted-foreground">{s.label}</dt>
              <dd className="text-xl font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(config).map(([k, c]) => (
            <li key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label}
            </li>
          ))}
        </ul>
        <ChartContainer config={config} className="aspect-auto h-[196px] w-full">
          <BarChart
            data={data}
            margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
            barCategoryGap={stacked ? "28%" : "20%"}
          >
            <Grid />
            <XAxis dataKey="label" {...AXIS_PROPS} />
            <YAxis allowDecimals={false} {...AXIS_PROPS} />
            <ChartTooltip
              cursor={{ fill: "var(--secondary)", radius: 6 }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(_, p) => (p?.[0]?.payload as { period?: string })?.period ?? ""}
                />
              }
            />
            {keys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                stackId={stacked ? "period" : undefined}
                fill={`var(--color-${k})`}
                stroke="var(--card)"
                strokeWidth={stacked ? 2 : 0}
                isAnimationActive={!reduced}
                shape={(props: React.ComponentProps<typeof Rectangle>) => (
                  <Rectangle
                    {...props}
                    radius={!stacked || i === keys.length - 1 ? [4, 4, 0, 0] : 0}
                  />
                )}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </div>
    </Card>
  )
}
