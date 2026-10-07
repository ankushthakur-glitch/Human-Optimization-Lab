"use client"

import * as React from "react"

import { usDay } from "@/components/provider/mock-clock"
import { STATUS_COLOR, StatusTrace, statusColors } from "@/components/dashboard-kit-v2/status-trend"

/* The hover cards' chart and the line helpers the trend charts share. */

const day = (iso: string) => usDay(iso.slice(0, 10))

export const monthYear = (iso: string) =>
  `${new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short" })} '${iso.slice(2, 4)}`

/** Smooth through every point without overshooting (Fritsch-Carlson), as
    the patient app's trend draws it. */
export function monotone(pts: [number, number][]) {
  const n = pts.length
  if (n < 2) return ""
  const sl: number[] = []
  for (let i = 0; i < n - 1; i++)
    sl.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0] || 1))
  const t = pts.map((_, i) =>
    i === 0
      ? sl[0]
      : i === n - 1
        ? sl[n - 2]
        : sl[i - 1] * sl[i] <= 0
          ? 0
          : (sl[i - 1] + sl[i]) / 2
  )
  for (let i = 0; i < n - 1; i++) {
    if (sl[i] === 0) {
      t[i] = t[i + 1] = 0
      continue
    }
    const a = t[i] / sl[i]
    const b = t[i + 1] / sl[i]
    const h = a * a + b * b
    if (h > 9) {
      const k = 3 / Math.sqrt(h)
      t[i] = k * a * sl[i]
      t[i + 1] = k * b * sl[i]
    }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    const dx = (x1 - x0) / 3
    d += ` C${(x0 + dx).toFixed(1)},${(y0 + t[i] * dx).toFixed(1)} ${(x1 - dx).toFixed(1)},${(y1 - t[i + 1] * dx).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`
  }
  return d
}

/** Dates to scale along the axis, at least `gap` apart so close readings
    stay apart. */
export function timeScale(
  dates: string[],
  left: number,
  right: number,
  gap: number
) {
  const ts = dates.map((d) => new Date(d.slice(0, 10)).getTime())
  const t0 = ts[0]
  const t1 = ts[ts.length - 1]
  if (ts.length === 1) return [(left + right) / 2]
  const xs = ts.map((t) => left + ((t - t0) / (t1 - t0 || 1)) * (right - left))
  for (let i = 1; i < xs.length; i++) xs[i] = Math.max(xs[i], xs[i - 1] + gap)
  for (let i = xs.length - 1; i >= 0; i--)
    xs[i] = Math.min(xs[i], right - (xs.length - 1 - i) * gap)
  return xs
}

export type PeekPoint = { date: string; value: number }

/** The hover card's chart, after the weather app's conditions card: the
    series as a smooth line over a fading area, both in each reading's
    status colour, the range limits dashed, the scale on the right, and a
    full height rule with a dot that follows the pointer from reading to
    reading. The readout above it names the reading under the rule. */
export function PeekChart({
  points,
  low,
  high,
  unit,
  digits = 0,
  xLabel = monthYear,
}: {
  points: PeekPoint[]
  xLabel?: (iso: string) => string
  low?: number
  high?: number
  unit?: string
  digits?: number
}) {
  const latest = points.length - 1
  const [sel, setSel] = React.useState(latest)
  const W = 296
  const H = 132
  const pad = { top: 22, right: 30, bottom: 20, left: 4 }
  const values = points.map((p) => p.value)
  const limits = [low, high].filter((n): n is number => n != null)
  let lo = Math.min(...values, ...limits)
  let hi = Math.max(...values, ...limits)
  const span = hi - lo || Math.abs(hi) || 1
  lo -= span * 0.15
  hi += span * 0.15
  const bottom = H - pad.bottom
  const y = (v: number) =>
    pad.top + (1 - (v - lo) / (hi - lo)) * (bottom - pad.top)
  const xs = timeScale(
    points.map((p) => p.date),
    pad.left + 8,
    W - pad.right - 8,
    10
  )
  const xy = points.map((p, i): [number, number] => [xs[i], y(p.value)])
  const curve = monotone(xy)
  const colors = statusColors(
    points.map((p) => p.value),
    low,
    high
  )
  /* Round steps (1, 2, 2.5 or 5 times a power of ten), about four of them. */
  const raw = (hi - lo) / 4
  const pow = 10 ** Math.floor(Math.log10(raw || 1))
  const step =
    [1, 2, 2.5, 5, 10].map((k) => k * pow).find((k) => k >= raw) ?? pow
  const tickDigits = Math.max(
    0,
    -Math.floor(Math.log10(step) + 1e-9) + (step / pow === 2.5 ? 1 : 0)
  )
  const ticks: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step)
    ticks.push(Number(v.toFixed(6)))
  const i = Math.min(sel, latest)
  const r = points[i]
  const [mx, my] = xy[i]
  const fmt = (v: number) => v.toFixed(digits)
  const mid = Math.floor(latest / 2)

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * W
    let best = 0
    xs.forEach((x, k) => {
      if (Math.abs(x - px) < Math.abs(xs[best] - px)) best = k
    })
    setSel(best)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span
          className="text-2xl leading-7 font-semibold tabular-nums"
          style={{
            color:
              colors[i] === STATUS_COLOR.green
                ? "var(--foreground)"
                : colors[i],
          }}
        >
          {fmt(r.value)}
          {unit && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {unit}
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {i === latest ? "Latest, " : ""}
          {day(r.date)}
        </span>
      </div>
      <span className="-mt-1.5 text-xs text-muted-foreground tabular-nums">
        High {fmt(Math.max(...values))}, Low {fmt(Math.min(...values))}
      </span>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        aria-hidden
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setSel(latest)}
      >
        {limits.map((l) => (
          <line
            key={l}
            x1={pad.left}
            x2={W - pad.right}
            y1={y(l)}
            y2={y(l)}
            className="stroke-border"
            strokeDasharray="3 3"
          />
        ))}
        {ticks.map((t) => (
          <text
            key={t}
            x={W - 2}
            y={y(t) + 3}
            textAnchor="end"
            className="fill-muted-foreground text-[9.5px] tabular-nums"
          >
            {t.toFixed(tickDigits)}
          </text>
        ))}
        <StatusTrace
          xy={xy}
          colors={colors}
          d={curve}
          top={pad.top - 14}
          bottom={bottom}
          zones
        />
        {/* Every reading as a hollow dot in its status colour with its
            value over it where there is room, the latest in bold. */}
        {xy.map(([x, yy], k) => {
          const room =
            (k === 0 || x - xs[k - 1] >= 22) && (k === latest || xs[k + 1] - x >= 22)
          return (
            <g key={`${points[k].date}-${k}`}>
              {k !== i && (
                <circle cx={x} cy={yy} r={3.25} fill="var(--card)" stroke={colors[k]} strokeWidth={1.75} />
              )}
              {(room || k === latest) && (
                <text
                  x={x}
                  y={yy - 8}
                  textAnchor={k === 0 ? "start" : k === latest ? "end" : "middle"}
                  className={
                    k === latest
                      ? "fill-foreground text-[10px] font-semibold tabular-nums"
                      : "fill-muted-foreground text-[9.5px] tabular-nums"
                  }
                >
                  {fmt(points[k].value)}
                </text>
              )}
            </g>
          )
        })}
        <line
          x1={mx}
          x2={mx}
          y1={pad.top - 6}
          y2={bottom}
          className="stroke-foreground/35"
          strokeWidth={1.25}
          style={{ transition: "all 120ms ease-out" }}
        />
        <circle
          cx={mx}
          cy={my}
          r={5.5}
          fill="var(--card)"
          stroke={colors[i]}
          strokeWidth={2.25}
          style={{ transition: "all 120ms ease-out" }}
        />
        {[0, mid, latest]
          .filter((k, n, a) => a.indexOf(k) === n)
          .map((k, n) => (
            <text
              key={k}
              x={xs[k]}
              y={H - 5}
              textAnchor={n === 0 ? "start" : k === latest ? "end" : "middle"}
              className="fill-muted-foreground text-[9.5px] tabular-nums"
            >
              {xLabel(points[k].date)}
            </text>
          ))}
      </svg>
    </div>
  )
}
