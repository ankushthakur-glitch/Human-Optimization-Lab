import * as React from "react"

/* Result status colour, one rule for every result graph in the chart
   dashboard and the provider dashboard: green inside the reference range,
   orange at its edge (within 10% of a limit), red outside it. Direction
   counts too: a reading that moved toward the range (a waist coming down
   on a weight loss plan, a low value climbing) is good news and green even
   while it is still outside; the first reading takes the direction of the
   step after it. Each
   reading's dot, the line into it and the area under it take its colour,
   switching halfway between two readings of different status. The hexes
   are the charts' subtle set (patient-dashboard/widgets/kit.tsx SUBTLE). */

export type ResultStatus = "green" | "orange" | "red"

export const STATUS_COLOR: Record<ResultStatus, string> = {
  green: "#5FB386",
  orange: "#EB9A52",
  red: "#DE6F68",
}

/** Where a reading stands against its range. `out` forces red when the
    caller already knows (a flag against a target the limits leave out). */
export function resultStatus(
  v: number,
  low?: number,
  high?: number,
  out?: boolean
): ResultStatus {
  if (out || (high != null && v > high) || (low != null && v < low))
    return "red"
  if (high == null && low == null) return "green"
  const span =
    high != null && low != null
      ? high - low
      : Math.abs(high ?? low ?? v) || 1
  const edge = span * 0.1
  if (
    (high != null && high - v <= edge) ||
    (low != null && v - low <= edge)
  )
    return "orange"
  return "green"
}

/** How far outside the range a value sits (0 inside), or for a value
    inside, how much room it has to the nearer limit as a negative. */
function distance(v: number, low?: number, high?: number) {
  if (high != null && v > high) return v - high
  if (low != null && v < low) return low - v
  const room = Math.min(
    high != null ? high - v : Infinity,
    low != null ? v - low : Infinity
  )
  return Number.isFinite(room) ? -room : 0
}

/** Whether going from `from` to `to` moved toward the range, or deeper
    into it. */
function movedToward(
  from: number,
  to: number,
  low?: number,
  high?: number
) {
  if (low == null && high == null) return false
  return distance(to, low, high) < distance(from, low, high)
}

/** A series' status, oldest first, direction included: an orange or red
    reading that moved toward the range turns green. */
export function statusSeries(
  values: number[],
  low?: number,
  high?: number,
  outs?: (boolean | undefined)[]
): ResultStatus[] {
  return values.map((v, i) => {
    const base = resultStatus(v, low, high, outs?.[i])
    if (base === "green" || values.length < 2) return base
    const better =
      i === 0
        ? movedToward(v, values[1], low, high)
        : movedToward(values[i - 1], v, low, high)
    return better ? "green" : base
  })
}

export const statusColors = (
  values: number[],
  low?: number,
  high?: number,
  outs?: (boolean | undefined)[]
) => statusSeries(values, low, high, outs).map((k) => STATUS_COLOR[k])

/** Halfway points between readings whose status differs, where the
    colour changes and the chart draws its dashed divider. */
export function statusBreaks(xs: number[], colors: string[]) {
  const out: number[] = []
  for (let i = 0; i < xs.length - 1; i++)
    if (colors[i] !== colors[i + 1]) out.push((xs[i] + xs[i + 1]) / 2)
  return out
}

/** Gradient stops along x for readings at `xs`, as fractions of the span
    from the first reading to the last. */
function stops(xs: number[], colors: string[]) {
  const x0 = xs[0]
  const w = xs[xs.length - 1] - x0 || 1
  const f = (x: number) => Math.min(1, Math.max(0, (x - x0) / w))
  const s: { offset: number; color: string }[] = []
  xs.forEach((x, i) => {
    s.push({ offset: f(x), color: colors[i] })
    if (i < xs.length - 1 && colors[i] !== colors[i + 1]) {
      const mid = (x + xs[i + 1]) / 2
      const blend = Math.min(4, (xs[i + 1] - x) / 4)
      s.push({ offset: f(mid - blend), color: colors[i] })
      s.push({ offset: f(mid + blend), color: colors[i + 1] })
    }
  })
  return s
}

/** The defs a status trend needs: `${id}-c`, the readings' colours left
    to right (for the line, and the area at a low opacity), and `${id}-f`,
    a mask that fades the area toward the baseline. Without `space` the
    gradient spans the painted shape (recharts, readings evenly spaced);
    with it, the readings' own x in user space. */
export function StatusDefs({
  id,
  xs,
  colors,
  space,
  fade = [0.24, 0.02],
}: {
  id: string
  xs: number[]
  colors: string[]
  space?: boolean
  fade?: [number, number]
}) {
  const box = space
    ? {
        gradientUnits: "userSpaceOnUse" as const,
        x1: xs[0],
        x2: xs[xs.length - 1],
        y1: 0,
        y2: 0,
      }
    : { x1: 0, x2: 1, y1: 0, y2: 0 }
  return (
    <>
      <linearGradient id={`${id}-c`} {...box}>
        {stops(xs, colors).map((s, i) => (
          <stop key={i} offset={s.offset} stopColor={s.color} />
        ))}
      </linearGradient>
      <linearGradient id={`${id}-v`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity={fade[0]} />
        <stop offset="1" stopColor="#fff" stopOpacity={fade[1]} />
      </linearGradient>
      <mask id={`${id}-f`} maskContentUnits="objectBoundingBox">
        <rect width={1} height={1} fill={`url(#${id}-v)`} />
      </mask>
    </>
  )
}

/** A whole status trend for hand drawn charts: the area to `bottom`, the
    line through `d` (straight through the points when left out), and a
    dashed divider at each change of status from `top` down. Dots stay
    with the caller, coloured with the same `colors`. */
export function StatusTrace({
  xy,
  colors,
  d,
  bottom,
  top,
  strokeWidth = 2,
  area = true,
  dividers = true,
  zones = false,
  shadow = false,
  fade,
}: {
  xy: [number, number][]
  colors: string[]
  d?: string
  bottom: number
  top?: number
  strokeWidth?: number
  area?: boolean
  dividers?: boolean
  /** A faint full height column behind each orange or red stretch, from
      divider to divider (needs `top`). */
  zones?: boolean
  /** A soft shadow under the line in its own colour. */
  shadow?: boolean
  fade?: [number, number]
}) {
  const id = `st${React.useId().replace(/:/g, "")}`
  if (xy.length < 2) return null
  const xs = xy.map((p) => p[0])
  const line =
    d ||
    xy
      .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ")
  const last = xy[xy.length - 1][0]
  const wash = `${line} L${last.toFixed(1)},${bottom} L${xs[0].toFixed(1)},${bottom} Z`
  /* One colour: a plain stroke, since a gradient over a flat line has no
     height to paint into. */
  const flat = colors.every((c) => c === colors[0])
  const paint = flat ? colors[0] : `url(#${id}-c)`
  return (
    <g>
      <defs>
        <StatusDefs id={id} xs={xs} colors={colors} space fade={fade} />
        {shadow && (
          <filter id={`${id}-s`} x="-10%" y="-40%" width="120%" height="200%">
            <feDropShadow
              dx="0"
              dy="3"
              stdDeviation="2.5"
              floodColor={colors[colors.length - 1]}
              floodOpacity="0.35"
            />
          </filter>
        )}
      </defs>
      {zones &&
        top != null &&
        (() => {
          const cuts = [xs[0], ...statusBreaks(xs, colors), xs[xs.length - 1]]
          const starts = [0, ...xs.flatMap((_, i) => (i < xs.length - 1 && colors[i] !== colors[i + 1] ? [i + 1] : []))]
          return starts.map((at, k) =>
            colors[at] === STATUS_COLOR.green ? null : (
              <rect
                key={`z${k}`}
                x={cuts[k]}
                y={top}
                width={Math.max(0, cuts[k + 1] - cuts[k])}
                height={Math.max(0, bottom - top)}
                fill={colors[at]}
                fillOpacity={0.08}
              />
            )
          )
        })()}
      {dividers &&
        top != null &&
        statusBreaks(xs, colors).map((x) => (
          <line
            key={x}
            x1={x}
            x2={x}
            y1={top}
            y2={bottom}
            stroke={colors[xs.findIndex((p) => p > x)] ?? colors[colors.length - 1]}
            strokeOpacity={0.55}
            strokeDasharray="3 3"
          />
        ))}
      {area && <path d={wash} fill={paint} mask={`url(#${id}-f)`} />}
      <path
        d={line}
        fill="none"
        stroke={paint}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={shadow ? `url(#${id}-s)` : undefined}
      />
    </g>
  )
}
