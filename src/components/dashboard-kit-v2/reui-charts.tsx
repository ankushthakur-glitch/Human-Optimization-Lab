"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import { cn } from "@/lib/utils"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/design-system/ui/chart"
import { SUBTLE } from "@/components/patient-dashboard/widgets/palette"
import { AXIS_PROPS, PALETTE, useReducedMotion } from "@/components/dashboard-kit-v2/charts"

/* ReUI's chart set (reui.io c-chart 1 to 25, MIT, Keenthemes), ported as
   data-driven plots on the build's Chart layer. Each draws only the plot:
   no card, title or badge, so a dashboard sets it in the kit's Card. What
   carries over from ReUI: the SVG fills (diagonal stripes, dots, crosshatch,
   gradients, the duotone split), glowing lines and dots, dashed secondary
   strokes, step areas, a striped forecast zone, donuts with a centre figure
   and a raised active slice, the radial score rings, the glowing radar, and
   the tooltip: a label over a hairline rule, then a 10px square, the series
   name and its value set bold on the right. Pattern ids are per instance. */

/* -------------------------------------------------------------- types -- */

/** How a bar, area or slice is painted. */
export type ReFill = "solid" | "stripe" | "dots" | "crosshatch" | "gradient" | "duotone"

export type ReSeries = {
  /** The data key; letters, digits, dash or underscore. */
  key: string
  label: string
  /** Any CSS colour; defaults walk the soft status hues. */
  color?: string
  fill?: ReFill
  /** A thin dashed stroke, as ReUI draws secondary areas. */
  dashed?: boolean
}

export type ReDatum = Record<string, string | number | null | undefined>

/** The default series colours: the soft status hues, then the chart tokens. */
export const RE_COLORS = [
  "var(--primary)",
  SUBTLE.blue,
  SUBTLE.orange,
  SUBTLE.violet,
  SUBTLE.green,
  SUBTLE.red,
  "var(--chart-3)",
  "var(--chart-4)",
]

const colorOf = (s: ReSeries, i: number) => s.color ?? RE_COLORS[i % RE_COLORS.length]!

function configOf(series: { key: string; label: string; color?: string }[]): ChartConfig {
  return Object.fromEntries(series.map((s, i) => [s.key, { label: s.label, color: s.color ?? RE_COLORS[i % RE_COLORS.length] }]))
}

/** A per instance prefix for pattern and filter ids. */
function usePrefix() {
  return `re${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`
}

/* ------------------------------------------------------------- fills -- */

/** One SVG def per series for its fill; returns nothing for "solid". */
function FillDef({ id, kind, color, area }: { id: string; kind: ReFill; color: string; area?: boolean }) {
  switch (kind) {
    case "stripe":
      /* c-chart-3: tinted ground, two weights of diagonal stripe. */
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8">
          <rect width="8" height="8" fill={color} opacity={area ? 0.06 : 0.1} />
          <path d="M0,8 L8,0 M4,12 L12,4 M-4,4 L4,-4" stroke={color} strokeWidth="1.5" opacity={area ? 0.35 : 0.6} />
          <path d="M2,10 L10,2 M6,14 L14,6 M-2,6 L6,-2" stroke={color} strokeWidth="1" opacity={area ? 0.18 : 0.3} />
        </pattern>
      )
    case "dots":
      /* c-chart-4 for bars, c-chart-15 for areas. */
      return area ? (
        <pattern id={id} patternUnits="userSpaceOnUse" width="5" height="5">
          <rect width="5" height="5" fill={color} opacity="0.08" />
          <circle cx="2.5" cy="2.5" r="1" fill={color} opacity="0.5" />
        </pattern>
      ) : (
        <pattern id={id} x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
          <rect width="5" height="5" fill={color} opacity="0.1" />
          <circle cx="5" cy="5" r="1.4" fill={color} opacity="0.6" />
        </pattern>
      )
    case "crosshatch":
      /* c-chart-18. */
      return (
        <pattern id={id} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill={color} opacity="0.05" />
          <path d="M0,8 L8,0" stroke={color} strokeWidth="0.8" opacity="0.4" />
          <path d="M0,0 L8,8" stroke={color} strokeWidth="0.8" opacity="0.2" />
        </pattern>
      )
    case "gradient":
      /* c-chart-7 bars fade 0.9 to 0.6; c-chart-13 areas 0.5 to 0.05. */
      return (
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={area ? 0.5 : 0.9} />
          <stop offset="95%" stopColor={color} stopOpacity={area ? 0.05 : 0.6} />
        </linearGradient>
      )
    case "duotone":
      /* c-chart-10: the left half light, the right half full. */
      return (
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="50%" stopColor={color} stopOpacity={0.4} />
          <stop offset="50%" stopColor={color} />
        </linearGradient>
      )
    default:
      return null
  }
}

const paint = (id: string, kind: ReFill, color: string) => (kind === "solid" ? color : `url(#${id})`)

/** Line and dot glows from c-chart-16, 24 and 25. */
function GlowDefs({ prefix }: { prefix: string }) {
  return (
    <>
      <filter id={`${prefix}-dotglow`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id={`${prefix}-lineglow`} x="-10%" y="-20%" width="120%" height="140%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </>
  )
}

/* ------------------------------------------------------------ tooltip -- */

/** ReUI's tooltip body: the label over a hairline, then square, name, bold value. */
function reTooltip({
  config,
  tooltipLabel,
  valueFormat,
  hideLabel,
  keyFromPayload,
}: {
  config: ChartConfig
  tooltipLabel?: (label: string) => React.ReactNode
  valueFormat?: (value: number, key: string) => React.ReactNode
  hideLabel?: boolean
  /** Read the series key from the row's `key` (radial rows), not the data key. */
  keyFromPayload?: boolean
}) {
  return (
    <ChartTooltipContent
      indicator="dot"
      hideLabel={hideLabel}
      className="min-w-40 gap-2.5"
      labelFormatter={(value) => (
        <div className="mb-0.5 border-b border-border/50 pb-2">
          <span className="text-xs font-medium">{tooltipLabel ? tooltipLabel(String(value)) : String(value)}</span>
        </div>
      )}
      formatter={(value, name, item) => {
        const key = keyFromPayload ? String((item?.payload as { key?: string } | undefined)?.key ?? name) : String(name)
        const color =
          (config[key]?.color as string | undefined) ??
          (item?.payload as { color?: string } | undefined)?.color ??
          (item?.color as string | undefined)
        return (
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 shrink-0 rounded-xs" style={{ backgroundColor: color }} />
              <span className="text-muted-foreground">{config[key]?.label ?? key}</span>
            </div>
            <span className="font-semibold text-foreground tabular-nums">
              {valueFormat ? valueFormat(Number(value), key) : Number(value).toLocaleString("en-US")}
            </span>
          </div>
        )
      }}
    />
  )
}

/* --------------------------------------------------------------- bars -- */

/**
 * Bars in ReUI's styles (c-chart 1 to 5, 7, 9, 10, 12): each series takes
 * its own fill, so one stripe or dot series beside a solid one is c-chart 5
 * or 9. `layout="vertical"` lays the categories down the left, as c-chart 12.
 * `highlight` dims every category but one.
 */
export function ReBarChart({
  data,
  xKey,
  series,
  stacked,
  height = 240,
  layout = "horizontal",
  radius = 4,
  showYAxis,
  grid = true,
  highlight,
  xTickFormat,
  tooltipLabel,
  valueFormat,
  referenceY,
  onBarClick,
  className,
}: {
  data: ReDatum[]
  xKey: string
  series: ReSeries[]
  stacked?: boolean
  height?: number
  layout?: "horizontal" | "vertical"
  radius?: number
  showYAxis?: boolean
  grid?: boolean
  /** The index of the one category kept at full strength. */
  highlight?: number
  xTickFormat?: (value: string) => string
  tooltipLabel?: (label: string) => React.ReactNode
  valueFormat?: (value: number, key: string) => React.ReactNode
  /** A dashed target line across the plot. */
  referenceY?: { value: number; label?: string }
  onBarClick?: (datum: ReDatum, key: string, index: number) => void
  className?: string
}) {
  const prefix = usePrefix()
  const reduced = useReducedMotion()
  const config = React.useMemo(() => configOf(series), [series])
  const vertical = layout === "vertical"

  return (
    <ChartContainer config={config} className={cn("aspect-auto w-full", className)} style={{ height }}>
      <BarChart
        accessibilityLayer
        data={data}
        layout={vertical ? "vertical" : "horizontal"}
        margin={vertical ? { top: 4, right: 16, bottom: 0, left: 0 } : { top: 16, right: 8, bottom: 0, left: showYAxis ? -12 : 8 }}
        barCategoryGap={vertical ? "30%" : "24%"}
      >
        <defs>
          {series.map((s, i) => (
            <FillDef key={s.key} id={`${prefix}-${s.key}`} kind={s.fill ?? "solid"} color={colorOf(s, i)} />
          ))}
        </defs>
        {grid && <CartesianGrid vertical={vertical} horizontal={!vertical} strokeDasharray="3 3" stroke={PALETTE.grid} />}
        {vertical ? (
          <>
            <YAxis type="category" dataKey={xKey} {...AXIS_PROPS} tickMargin={10} width={96} tickFormatter={xTickFormat} />
            <XAxis type="number" hide allowDecimals={false} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} {...AXIS_PROPS} tickFormatter={xTickFormat} />
            <YAxis hide={!showYAxis} allowDecimals={false} {...AXIS_PROPS} />
          </>
        )}
        {referenceY && (
          <ReferenceLine
            y={vertical ? undefined : referenceY.value}
            x={vertical ? referenceY.value : undefined}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={
              referenceY.label
                ? { value: referenceY.label, position: vertical ? "top" : "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" }
                : undefined
            }
          />
        )}
        <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.5, radius: 6 }} content={reTooltip({ config, tooltipLabel, valueFormat })} />
        {series.map((s, i) => {
          const color = colorOf(s, i)
          const kind = s.fill ?? "solid"
          const last = i === series.length - 1
          const r = stacked
            ? last
              ? vertical
                ? [0, radius, radius, 0]
                : [radius, radius, 0, 0]
              : 0
            : radius
          return (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId={stacked ? "re" : undefined}
              fill={paint(`${prefix}-${s.key}`, kind, color)}
              stroke={kind === "solid" || kind === "duotone" ? "none" : color}
              strokeWidth={1}
              radius={r as number | [number, number, number, number]}
              isAnimationActive={!reduced}
              onClick={onBarClick ? (_, index) => onBarClick(data[index]!, s.key, index) : undefined}
              className={onBarClick ? "cursor-pointer" : undefined}
            >
              {highlight !== undefined &&
                data.map((_, j) => <Cell key={j} fillOpacity={j === highlight ? 1 : 0.35} strokeOpacity={j === highlight ? 1 : 0.35} />)}
            </Bar>
          )
        })}
      </BarChart>
    </ChartContainer>
  )
}

/* -------------------------------------------------------------- areas -- */

/**
 * Areas in ReUI's styles (c-chart 13 to 18): gradient, stripe, dot or
 * crosshatch fills; natural, monotone or step curves; glowing dot markers
 * (16); dashed strokes on the secondary series (14); and a striped
 * forecast zone from `forecastFrom` to the end (17).
 */
export function ReAreaChart({
  data,
  xKey,
  series,
  stacked,
  curve = "natural",
  dots = "none",
  height = 240,
  showYAxis,
  grid = true,
  forecastFrom,
  forecastLabel = "Forecast",
  referenceY,
  yDomain,
  baseValue,
  xTickFormat,
  yTickFormat,
  tooltipLabel,
  valueFormat,
  className,
}: {
  data: ReDatum[]
  xKey: string
  series: ReSeries[]
  stacked?: boolean
  curve?: "natural" | "monotone" | "step" | "linear"
  dots?: "none" | "dot" | "glow"
  height?: number
  showYAxis?: boolean
  grid?: boolean
  /** The index the striped forecast zone starts at. */
  forecastFrom?: number
  forecastLabel?: string
  referenceY?: { value: number; label?: string }
  yDomain?: [number | "auto" | "dataMin" | "dataMax", number | "auto" | "dataMin" | "dataMax"]
  /** Where the fill stops. Recharts fills to zero when the domain holds it,
      so an all negative series (a bio age gap) fills upward; "dataMin"
      fills down to the floor instead. */
  baseValue?: number | "dataMin" | "dataMax"
  xTickFormat?: (value: string) => string
  yTickFormat?: (value: number) => string
  tooltipLabel?: (label: string) => React.ReactNode
  valueFormat?: (value: number, key: string) => React.ReactNode
  className?: string
}) {
  const prefix = usePrefix()
  const reduced = useReducedMotion()
  const config = React.useMemo(() => configOf(series), [series])
  const type = curve === "step" ? "stepAfter" : curve
  const forecastStart = forecastFrom !== undefined ? data[forecastFrom]?.[xKey] : undefined
  const forecastEnd = data[data.length - 1]?.[xKey]

  return (
    <ChartContainer config={config} className={cn("aspect-auto w-full", className)} style={{ height }}>
      <AreaChart accessibilityLayer data={data} margin={{ top: 16, right: 8, bottom: 0, left: showYAxis ? -8 : 8 }}>
        <defs>
          {series.map((s, i) => (
            <FillDef key={s.key} id={`${prefix}-${s.key}`} kind={s.fill ?? "gradient"} color={colorOf(s, i)} area />
          ))}
          <FillDef id={`${prefix}-forecast`} kind="stripe" color="var(--muted-foreground)" area />
          <GlowDefs prefix={prefix} />
        </defs>
        {grid && <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={PALETTE.grid} />}
        <XAxis dataKey={xKey} {...AXIS_PROPS} tickFormatter={xTickFormat} />
        <YAxis hide={!showYAxis} domain={yDomain} {...AXIS_PROPS} tickFormatter={yTickFormat} />
        {forecastStart !== undefined && forecastStart !== null && (
          <ReferenceArea
            x1={forecastStart}
            x2={forecastEnd ?? undefined}
            fill={`url(#${prefix}-forecast)`}
            stroke="none"
            label={{ value: forecastLabel, position: "insideTop", fontSize: 11, fill: "var(--muted-foreground)" }}
          />
        )}
        {referenceY && (
          <ReferenceLine
            y={referenceY.value}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={referenceY.label ? { value: referenceY.label, position: "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" } : undefined}
          />
        )}
        <ChartTooltip cursor={false} content={reTooltip({ config, tooltipLabel, valueFormat })} />
        {series.map((s, i) => {
          const color = colorOf(s, i)
          const kind = s.fill ?? "gradient"
          const dashed = s.dashed ?? false
          const glow = dots === "glow"
          return (
            <Area
              key={s.key}
              dataKey={s.key}
              type={type}
              baseValue={baseValue}
              stackId={stacked ? "re" : undefined}
              fill={paint(`${prefix}-${s.key}`, kind, color)}
              fillOpacity={kind === "solid" ? 0.2 : 1}
              stroke={color}
              strokeWidth={dashed ? 1 : 2}
              strokeDasharray={dashed ? "3 3" : undefined}
              filter={glow ? `url(#${prefix}-lineglow)` : undefined}
              connectNulls
              isAnimationActive={!reduced}
              dot={
                dots === "none"
                  ? false
                  : {
                      r: glow ? 4 : 3,
                      fill: glow ? color : "var(--card)",
                      stroke: glow ? "var(--card)" : color,
                      strokeWidth: 2,
                      filter: glow ? `url(#${prefix}-dotglow)` : undefined,
                    }
              }
              activeDot={{ r: 6, strokeWidth: 3, stroke: "var(--card)", fill: color }}
            />
          )
        })}
      </AreaChart>
    </ChartContainer>
  )
}

/* ------------------------------------------------------------- donuts -- */

export type ReSlice = {
  key: string
  label: string
  value: number
  color?: string
  /** A pattern instead of the gentle gradient (c-chart 21). */
  fill?: "stripe" | "dots" | "solid"
}

/**
 * ReUI's donut (c-chart 19 to 22): rounded slices with gaps, a figure and a
 * word in the centre, an optional raised active slice that `onSelect` moves,
 * per slice stripe or dot fills, and an optional drop shadow (19).
 */
export function ReDonut({
  data,
  centerValue,
  centerLabel,
  active,
  onSelect,
  height = 220,
  thickness = 26,
  shadow,
  valueFormat,
  className,
}: {
  data: ReSlice[]
  centerValue?: React.ReactNode
  centerLabel?: string
  /** The key of the slice drawn raised. */
  active?: string
  onSelect?: (key: string) => void
  height?: number
  /** Ring width in px. */
  thickness?: number
  shadow?: boolean
  valueFormat?: (value: number, key: string) => React.ReactNode
  className?: string
}) {
  const prefix = usePrefix()
  const reduced = useReducedMotion()
  const config = React.useMemo(() => configOf(data), [data])
  const outer = Math.round(height / 2 - 12)
  const inner = Math.max(10, outer - thickness)
  const color = (s: ReSlice, i: number) => s.color ?? RE_COLORS[i % RE_COLORS.length]!
  const fillOf = (s: ReSlice) => `url(#${prefix}-${s.key})`

  return (
    <ChartContainer config={config} className={cn("mx-auto aspect-auto w-full", className)} style={{ height }}>
      <PieChart accessibilityLayer>
        <defs>
          {data.map((s, i) =>
            s.fill === "stripe" || s.fill === "dots" ? (
              <FillDef key={s.key} id={`${prefix}-${s.key}`} kind={s.fill} color={color(s, i)} />
            ) : (
              <linearGradient key={s.key} id={`${prefix}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color(s, i)} stopOpacity={1} />
                <stop offset="100%" stopColor={color(s, i)} stopOpacity={s.fill === "solid" ? 1 : 0.8} />
              </linearGradient>
            )
          )}
          <filter id={`${prefix}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="5" floodOpacity="0.18" />
          </filter>
        </defs>
        <ChartTooltip content={reTooltip({ config, valueFormat, hideLabel: true })} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="key"
          innerRadius={inner}
          outerRadius={outer}
          cornerRadius={5}
          paddingAngle={3}
          stroke="var(--card)"
          strokeWidth={3}
          isAnimationActive={!reduced}
          filter={shadow ? `url(#${prefix}-shadow)` : undefined}
          onClick={onSelect ? (_, index) => onSelect(data[index]!.key) : undefined}
          className={onSelect ? "cursor-pointer" : undefined}
        >
          {data.map((s, i) => (
            <Cell
              key={s.key}
              fill={fillOf(s)}
              stroke={s.fill === "stripe" || s.fill === "dots" ? color(s, i) : "var(--card)"}
              strokeWidth={s.fill === "stripe" || s.fill === "dots" ? 1 : 3}
              fillOpacity={active && active !== s.key ? 0.55 : 1}
            />
          ))}
          {(centerValue !== undefined || centerLabel) && (
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null
                const cx = viewBox.cx ?? 0
                const cy = viewBox.cy ?? 0
                return (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={cx} y={centerLabel ? cy - 6 : cy} className="fill-foreground text-2xl font-bold tabular-nums">
                      {centerValue as React.ReactNode}
                    </tspan>
                    {centerLabel && (
                      <tspan x={cx} y={cy + 16} className="fill-muted-foreground text-xs">
                        {centerLabel}
                      </tspan>
                    )}
                  </text>
                )
              }}
            />
          )}
        </Pie>
        {/* c-chart 22's raised slice: the same ring again, only the active
            slice painted, 8px further out. */}
        {active && (
          <Pie
            data={data}
            dataKey="value"
            nameKey="key"
            innerRadius={inner}
            outerRadius={outer + 8}
            cornerRadius={5}
            paddingAngle={3}
            stroke="none"
            isAnimationActive={false}
            tooltipType="none"
            onClick={onSelect ? (_, index) => onSelect(data[index]!.key) : undefined}
          >
            {data.map((s) => (
              <Cell key={s.key} fill={s.key === active ? fillOf(s) : "transparent"} pointerEvents={s.key === active ? "auto" : "none"} />
            ))}
          </Pie>
        )}
      </PieChart>
    </ChartContainer>
  )
}

/** The donut's legend as ReUI sets it beside the ring: dot, name, value, share. */
export function ReDonutLegend({
  data,
  active,
  onSelect,
  valueFormat,
  className,
}: {
  data: ReSlice[]
  active?: string
  onSelect?: (key: string) => void
  valueFormat?: (value: number) => React.ReactNode
  className?: string
}) {
  const total = data.reduce((s, x) => s + x.value, 0)
  return (
    <ul className={cn("flex flex-col divide-y divide-border", className)}>
      {data.map((s, i) => {
        const body = (
          <>
            <span aria-hidden className="size-2.5 shrink-0 rounded-xs" style={{ backgroundColor: s.color ?? RE_COLORS[i % RE_COLORS.length] }} />
            <span className={cn("min-w-0 flex-1 truncate text-left", active && active !== s.key && "text-muted-foreground")}>{s.label}</span>
            <span className="font-semibold tabular-nums">{valueFormat ? valueFormat(s.value) : s.value.toLocaleString("en-US")}</span>
            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
              {total ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </>
        )
        return (
          <li key={s.key}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(s.key)}
                aria-pressed={active === s.key}
                className="flex w-full items-center gap-2 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {body}
              </button>
            ) : (
              <div className="flex items-center gap-2 py-2 text-sm">{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/* ------------------------------------------------------------- radial -- */

export type ReRing = { key: string; label: string; value: number; /** Defaults to 100. */ max?: number; color?: string }

/**
 * ReUI's radial scores (c-chart 25): one glowing, rounded ring per score
 * over a muted track, the score written at the ring's start.
 */
export function ReRadial({
  data,
  height = 240,
  barSize = 18,
  showLabels = true,
  valueFormat,
  className,
}: {
  data: ReRing[]
  height?: number
  barSize?: number
  showLabels?: boolean
  valueFormat?: (value: number, key: string) => React.ReactNode
  className?: string
}) {
  const prefix = usePrefix()
  const reduced = useReducedMotion()
  const config = React.useMemo(() => configOf(data), [data])
  const rows = data.map((d, i) => ({
    ...d,
    pct: Math.round((d.value / (d.max ?? 100)) * 100),
    fill: `url(#${prefix}-${d.key})`,
    color: d.color ?? RE_COLORS[i % RE_COLORS.length],
  }))
  const outer = Math.round(height / 2 - 8)

  return (
    <ChartContainer config={config} className={cn("mx-auto aspect-auto w-full", className)} style={{ height }}>
      <RadialBarChart data={rows} startAngle={90} endAngle={-270} innerRadius={Math.max(20, outer - rows.length * (barSize + 6))} outerRadius={outer} barSize={barSize}>
        <defs>
          {rows.map((r) => (
            <linearGradient key={r.key} id={`${prefix}-${r.key}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={r.color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={r.color} stopOpacity={1} />
            </linearGradient>
          ))}
          <filter id={`${prefix}-glow`} x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <ChartTooltip
          content={reTooltip({
            config,
            hideLabel: true,
            keyFromPayload: true,
            valueFormat: (_, key) => {
              const r = rows.find((x) => x.key === key)
              if (!r) return null
              return valueFormat ? valueFormat(r.value, key) : `${r.value}/${r.max ?? 100}`
            },
          })}
        />
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar
          dataKey="pct"
          background
          cornerRadius={10}
          filter={`url(#${prefix}-glow)`}
          isAnimationActive={!reduced}
          label={showLabels ? { position: "insideStart", fill: "#fff", fontSize: 11, fontWeight: 600 } : undefined}
        />
      </RadialBarChart>
    </ChartContainer>
  )
}

/* -------------------------------------------------------------- radar -- */

/**
 * ReUI's glowing radar (c-chart 23 and 24): a gradient fill, a glowing
 * stroke and ringed dots on a dashed polar grid. One polygon per series.
 */
export function ReRadar({
  data,
  axisKey,
  series,
  max = 100,
  height = 260,
  valueFormat,
  className,
}: {
  data: ReDatum[]
  axisKey: string
  series: ReSeries[]
  max?: number
  height?: number
  valueFormat?: (value: number, key: string) => React.ReactNode
  className?: string
}) {
  const prefix = usePrefix()
  const reduced = useReducedMotion()
  const config = React.useMemo(() => configOf(series), [series])

  return (
    <ChartContainer config={config} className={cn("mx-auto aspect-auto w-full", className)} style={{ height }}>
      <RadarChart accessibilityLayer data={data}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`${prefix}-${s.key}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={colorOf(s, i)} stopOpacity={0.45} />
              <stop offset="100%" stopColor={colorOf(s, i)} stopOpacity={0.1} />
            </linearGradient>
          ))}
          <filter id={`${prefix}-glow`} x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <ChartTooltip content={reTooltip({ config, valueFormat })} />
        <PolarAngleAxis dataKey={axisKey} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <PolarGrid strokeDasharray="3 3" />
        <PolarRadiusAxis angle={90} domain={[0, max]} tick={false} axisLine={false} />
        {series.map((s, i) => (
          <Radar
            key={s.key}
            dataKey={s.key}
            fill={`url(#${prefix}-${s.key})`}
            stroke={colorOf(s, i)}
            strokeWidth={2.5}
            filter={`url(#${prefix}-glow)`}
            isAnimationActive={!reduced}
            dot={{ r: 4, fill: "var(--card)", strokeWidth: 2.5, stroke: colorOf(s, i) }}
          />
        ))}
      </RadarChart>
    </ChartContainer>
  )
}

/* ------------------------------------------------------------- legend -- */

/** ReUI's inline legend: a 10px rounded square and the series name. */
export function ReLegend({ series, className }: { series: { key: string; label: string; color?: string }[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
      {series.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className="size-2.5 rounded-xs" style={{ backgroundColor: s.color ?? RE_COLORS[i % RE_COLORS.length] }} />
          {s.label}
        </li>
      ))}
    </ul>
  )
}
