import { cn } from "@/lib/utils"
import { PALETTE } from "@/components/dashboard-kit-v2/charts"
import { DIVIDER } from "@/components/dashboard-kit-v2/icon"

/* A change as a bar from a centre line: left for a decrease, right for an
   increase, scaled to the largest absolute value in the list. Primary for
   an improvement, amber for the metric to watch. No axis. */

export function DivergingBarRow({
  label,
  subline,
  value,
  scale,
  tone = "primary",
  decimals = 1,
  className,
}: {
  label: string
  /** "177.6 → 163.3 lb". */
  subline: string
  /** Signed percent. */
  value: number
  /** The largest absolute value among the rows, so bars share one scale. */
  scale: number
  tone?: "primary" | "warning"
  decimals?: number
  className?: string
}) {
  const share = scale ? Math.min(1, Math.abs(value) / scale) : 0
  const width = `${share * 50}%`
  const text = `${value > 0 ? "+" : value < 0 ? "-" : ""}${Math.abs(value).toFixed(decimals)}%`
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_110px_64px] items-center gap-3 border-b py-2.5 last:border-0", DIVIDER, className)}>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{label}</span>
        <span className="truncate text-xs text-muted-foreground tabular-nums">{subline}</span>
      </div>
      <div
        role="img"
        aria-label={`${label} ${text}`}
        className="relative h-4 w-[110px]"
      >
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-border" />
        <span
          aria-hidden
          className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full"
          style={{
            ...(value < 0 ? { right: "50%", width } : { left: "50%", width }),
            background: tone === "warning" ? PALETTE.processLight : PALETTE.primary,
          }}
        />
      </div>
      <span className={cn("text-right text-sm font-semibold tabular-nums", tone === "warning" ? "text-warning" : "text-foreground")}>
        {text}
      </span>
    </div>
  )
}
