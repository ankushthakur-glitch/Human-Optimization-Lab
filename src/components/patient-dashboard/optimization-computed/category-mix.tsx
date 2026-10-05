"use client"

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/design-system/ui/chart"
import { AXIS, ChartGrid, SquareLegend, useReducedMotion } from "@/components/dashboard-kit"
import { OptCard } from "@/components/patient-dashboard/optimization-computed/parts/ui"
import { GROUPS, type V2Model } from "@/components/patient-dashboard/optimization-computed/rules"
import { GROUP_STYLE } from "@/components/patient-dashboard/optimization-computed/summary"

/* Score by category as the markers behind it: one stacked bar per
   category, a segment per status group, the computed score at the end.
   Lowest score first, so the priority areas read at the top. */

const KEY: Record<(typeof GROUPS)[number], string> = {
  "Out of target": "out",
  "On watch": "watch",
  "Not yet tested": "untested",
  "In range": "inRange",
  Optimal: "optimal",
}

export function CategoryMix({ v2 }: { v2: V2Model }) {
  const reduced = useReducedMotion()
  const rows = v2.categories.map((c) => ({
    label: c.label,
    score: c.score,
    out: c.counts["Out of target"],
    watch: c.counts["On watch"],
    untested: c.counts["Not yet tested"],
    inRange: c.counts["In range"],
    optimal: c.counts.Optimal,
  }))
  const priority = v2.categories.filter((c) => c.band === "Priority area")
  const config = {
    ...Object.fromEntries(GROUPS.map((g) => [KEY[g], { label: g, color: GROUP_STYLE[g].color }])),
    pad: { label: "" },
  } satisfies ChartConfig
  const max = Math.max(...rows.map((r) => r.out + r.watch + r.untested + r.inRange + r.optimal))
  /* The score label rides an invisible sliver at the end of every stack, so
     a category with no markers in the last group still gets its label. */
  const data = rows.map((r) => ({ ...r, pad: max / 1000 }))
  return (
    <OptCard
      id="mix"
      title="Score by category"
      description={`${rows.length} categories · whole panel ${v2.score}% · ${v2.onTarget} on target`}
      className="h-full"
    >
      <div role="img" aria-label={v2.categories.map((c) => `${c.label} ${c.score}%`).join(", ")}>
        <ChartContainer config={config} className="aspect-auto w-full" style={{ height: rows.length * 30 + 16 }}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 44, bottom: 0, left: 0 }} barSize={18}>
            <ChartGrid />
            <XAxis type="number" domain={[0, max]} hide />
            <YAxis
              type="category"
              dataKey="label"
              {...AXIS}
              width={150}
              interval={0}
              tick={{ fontSize: 12, fill: "var(--foreground)", opacity: 0.8 }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            {GROUPS.map((g) => (
              <Bar key={g} dataKey={KEY[g]} stackId="a" fill={GROUP_STYLE[g].color} isAnimationActive={!reduced} />
            ))}
            <Bar dataKey="pad" stackId="a" fill="transparent" isAnimationActive={false} tooltipType="none">
              <LabelList dataKey="score" position="right" offset={8} fontSize={12} fill="var(--foreground)" formatter={(v: unknown) => `${v}%`} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
      <SquareLegend items={GROUPS.map((g) => ({ key: g, label: `${g} ${v2.counts[g]}`, color: GROUP_STYLE[g].color }))} />
      {priority.length > 0 && (
        <div className="flex flex-col gap-0.5 pt-4 text-[13px]">
          <p className="text-sm font-medium tabular-nums">
            {priority.length} priority {priority.length === 1 ? "area" : "areas"}
          </p>
          <p className="text-muted-foreground">{priority.map((r) => r.label).join(" · ")}</p>
        </div>
      )}
    </OptCard>
  )
}
