import { cn } from "@/lib/utils"

/* An inline trend with no axes: grey line and points, the latest point
   coloured by what it means (out of range or worsening, improving, or
   neutral), and an optional grey band for the reference range. */

export type SparkTone = "out" | "improving" | "neutral"

const LAST: Record<SparkTone, string> = {
  out: "fill-destructive",
  improving: "fill-success",
  neutral: "fill-muted-foreground",
}

export function Sparkline({
  values,
  low,
  high,
  tone = "neutral",
  size = "table",
  label,
  className,
}: {
  values: number[]
  /** Reference range; either end may be open. */
  low?: number
  high?: number
  tone?: SparkTone
  size?: "table" | "card"
  label: string
  className?: string
}) {
  const [w, h] = size === "table" ? [56, 22] : [72, 24]
  const pad = 3
  if (values.length === 0) return null
  const lo = Math.min(...values, ...(low !== undefined ? [low] : []))
  const hi = Math.max(...values, ...(high !== undefined ? [high] : []))
  const span = hi - lo || 1
  const x = (i: number) => (values.length === 1 ? w / 2 : pad + (i * (w - pad * 2)) / (values.length - 1))
  const y = (v: number) => h - pad - ((v - lo) / span) * (h - pad * 2)
  const band =
    low !== undefined || high !== undefined
      ? { top: y(high ?? hi), bottom: y(low ?? lo) }
      : null
  const last = values.length - 1

  return (
    <svg
      role="img"
      aria-label={label}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cn("shrink-0 overflow-visible", className)}
    >
      {band && (
        <rect
          x={0}
          width={w}
          y={band.top}
          height={Math.max(0, band.bottom - band.top)}
          className="fill-secondary"
        />
      )}
      <polyline
        points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
        fill="none"
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="stroke-ring"
      />
      {values.map((v, i) =>
        i === last ? null : <circle key={i} cx={x(i)} cy={y(v)} r={1.5} className="fill-ring" />
      )}
      <circle cx={x(last)} cy={y(values[last])} r={3} className={LAST[tone]} />
    </svg>
  )
}
