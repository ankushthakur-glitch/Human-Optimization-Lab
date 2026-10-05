import { cn } from "@/lib/utils"

/* TailAdmin's progress bar: a 8px track with a rounded fill. Teal by
   default, green when a goal is met, amber for process, and hatched amber
   once an item is past its escalation point. */

export type ProgressTone =
  | "primary"
  | "primary-light"
  | "success"
  | "warning"
  | "warning-light"
  | "escalated"

const FILL: Record<ProgressTone, string> = {
  primary: "bg-primary",
  "primary-light": "bg-primary-4",
  success: "bg-success",
  warning: "bg-warning",
  "warning-light": "bg-[color-mix(in_oklab,var(--warning)_62%,var(--card))]",
  escalated:
    "[background:repeating-linear-gradient(135deg,var(--warning)_0_6px,color-mix(in_oklab,var(--warning)_55%,var(--card))_6px_12px)]",
}

export function ProgressBar({
  value,
  tone = "primary",
  label,
  className,
}: {
  /** 0 to 100. */
  value: number
  tone?: ProgressTone
  label: string
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
    >
      <div
        className={cn("h-full rounded-full", FILL[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
