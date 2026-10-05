"use client"

import {
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/design-system/ui/chart"
import {
  AXIS_PROPS,
  Grid,
  PALETTE,
  useReducedMotion,
} from "@/components/dashboard-kit-v2"

/* The control-marker chart (shadcn "Line Chart, label"): one marker's
   history on true dates, the primary line with value labels over the
   points, and a dashed grey line at the limit it is judged against. One
   series, one unit. */

const at = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).getTime()
const pad = (n: number) => String(n).padStart(2, "0")
const usDate = (t: number) => {
  const d = new Date(t)
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`
}
/** "5.6", "6": no trailing zeros. */
const num = (v: number) => String(Number(v.toFixed(2)))
/** "5.6%" or "130 mmHg". */
const withUnit = (v: number, unit: string) =>
  unit === "%" ? `${num(v)}%` : `${num(v)} ${unit}`

/** A y axis that holds the values and the limit, on three or four steps. */
function yScale(values: number[], limit?: number) {
  const all = [...values, ...(limit != null ? [limit] : [])]
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const span = hi - lo || Math.abs(hi) || 1
  const step =
    [0.1, 0.2, 0.4, 0.5, 1, 2, 5, 10, 20, 25, 50, 100].find(
      (s) => span / s <= 3.5
    ) ?? 100
  const min = Math.max(0, Math.floor((lo - span * 0.15) / step) * step)
  const max = Math.ceil((hi + span * 0.15) / step) * step
  const ticks: number[] = []
  for (let v = min; v <= max + step / 2; v += step)
    ticks.push(Number(v.toFixed(2)))
  return { domain: [min, max] as [number, number], ticks }
}

export function MarkerLineChart({
  points,
  limit,
  limitLabel = "Upper limit",
  unit,
  label,
  height = 190,
}: {
  points: { date: string; value: number }[]
  /** The limit the marker is judged against, drawn dashed. */
  limit?: number
  limitLabel?: string
  unit: string
  label: string
  height?: number
}) {
  const reduced = useReducedMotion()
  const data = points.map((p) => ({ t: at(p.date), value: p.value }))
  const { domain, ticks } = yScale(
    data.map((d) => d.value),
    limit
  )
  const config = {
    value: { label: unit, color: PALETTE.primary },
  } satisfies ChartConfig

  return (
    <div role="img" aria-label={label}>
      <ChartContainer
        config={config}
        className="aspect-auto w-full"
        style={{ height }}
      >
        <LineChart
          data={data}
          margin={{ top: 22, right: 16, bottom: 0, left: -12 }}
        >
          <Grid />
          {limit != null && (
            <ReferenceLine
              y={limit}
              stroke="color-mix(in oklab, var(--muted-foreground) 55%, var(--card))"
              strokeDasharray="4 4"
              label={{
                value: `${limitLabel} ${withUnit(limit, unit)}`,
                position: "insideBottomRight",
                fill: "var(--muted-foreground)",
                fontSize: 12,
                offset: 6,
                dy: 18,
              }}
            />
          )}
          <XAxis
            {...AXIS_PROPS}
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            ticks={data.map((d) => d.t)}
            tickFormatter={usDate}
            padding={{ left: 16, right: 16 }}
          />
          <YAxis
            {...AXIS_PROPS}
            domain={domain}
            ticks={ticks}
            tickFormatter={num}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="dot"
                labelFormatter={(_, p) => usDate(Number(p?.[0]?.payload?.t))}
              />
            }
          />
          <Line
            dataKey="value"
            type="linear"
            stroke={PALETTE.primary}
            strokeWidth={2}
            isAnimationActive={!reduced}
            dot={{
              r: 4,
              fill: PALETTE.primary,
              stroke: "var(--card)",
              strokeWidth: 1.5,
            }}
            activeDot={{ r: 5 }}
          >
            <LabelList
              dataKey="value"
              position="top"
              offset={10}
              fontSize={12}
              fill="var(--foreground)"
              formatter={(v: unknown) => num(Number(v))}
            />
          </Line>
        </LineChart>
      </ChartContainer>
    </div>
  )
}
