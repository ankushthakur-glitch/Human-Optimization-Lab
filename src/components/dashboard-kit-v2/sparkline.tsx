import { cn } from "@/lib/utils"
import {
  StatusTrace,
  statusColors,
} from "@/components/dashboard-kit-v2/status-trend"

/* An inline sparkline in status colour: each point, the line into it and
   a faint area under it green inside the reference range, orange at its
   edge and red outside (status-trend.tsx), the latest point larger. No
   axes. `latest="out"` forces the latest point red. */

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
  const last = values.length - 1
  const xy = values.map((v, i): [number, number] => [x(i), y(v)])
  const colors = statusColors(
    values,
    low,
    high,
    values.map((_, i) => i === last && latest === "out")
  )

  return (
    <svg
      role="img"
      aria-label={label}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0 overflow-visible", className)}
    >
      <StatusTrace
        xy={xy}
        colors={colors}
        bottom={height}
        strokeWidth={1.5}
        dividers={false}
        fade={[0.22, 0.02]}
      />
      {values.map((v, i) =>
        i === last ? null : (
          <circle key={i} cx={x(i)} cy={y(v)} r={1.75} fill={colors[i]} />
        )
      )}
      <circle cx={x(last)} cy={y(values[last]!)} r={3} fill={colors[last]} />
    </svg>
  )
}
