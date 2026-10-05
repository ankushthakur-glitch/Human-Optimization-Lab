import { cn } from "@/lib/utils"

/* An inline sparkline: a grey line through grey points, the latest point
   3px in red when it sits outside the range, green when it is improving, or
   grey. A faint band marks the reference range. No axes. */

export function Sparkline({
  values,
  low,
  high,
  latest = "neutral",
  width = 56,
  height = 22,
  label,
  className,
}: {
  values: number[]
  low?: number
  high?: number
  latest?: "out" | "better" | "neutral"
  width?: 56 | 72
  height?: 22 | 24
  label: string
  className?: string
}) {
  if (values.length === 0) return null
  const pad = 3
  const all = [
    ...values,
    ...(low !== undefined ? [low] : []),
    ...(high !== undefined ? [high] : []),
  ]
  const min = Math.min(...all)
  const max = Math.max(...all)
  const span = max - min || 1
  const x = (i: number) =>
    values.length === 1
      ? width / 2
      : pad + (i * (width - pad * 2)) / (values.length - 1)
  const y = (v: number) =>
    height - pad - ((v - min) / span) * (height - pad * 2)
  const path = values
    .map(
      (v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`
    )
    .join(" ")
  const last = values.length - 1
  const line = "color-mix(in oklab, var(--muted-foreground) 55%, var(--card))"
  const dot =
    latest === "out"
      ? "var(--destructive)"
      : latest === "better"
        ? "var(--success)"
        : "var(--muted-foreground)"

  return (
    <svg
      role="img"
      aria-label={label}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0 overflow-visible", className)}
    >
      {low !== undefined && high !== undefined && (
        <rect
          x={0}
          y={y(high)}
          width={width}
          height={Math.max(1, y(low) - y(high))}
          fill="var(--secondary)"
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={line}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {values.map((v, i) =>
        i === last ? null : (
          <circle key={i} cx={x(i)} cy={y(v)} r={1.5} fill={line} />
        )
      )}
      <circle cx={x(last)} cy={y(values[last]!)} r={3} fill={dot} />
    </svg>
  )
}
