import { cn } from "@/lib/utils"

/* TailAdmin's progress bar. Primary by default; success for a goal met,
   warning for process, and hatched warning once a process is past its
   escalation point. */

export type ProgressTone = "primary" | "success" | "warning" | "hatched"

const FILL: Record<ProgressTone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  hatched:
    "bg-[repeating-linear-gradient(135deg,var(--warning)_0_6px,color-mix(in_oklab,var(--warning)_60%,var(--card))_6px_12px)]",
}

export function ProgressBar({
  value,
  tone = "primary",
  label,
  className,
}: {
  /** 0 to 1. */
  value: number
  tone?: ProgressTone
  label: string
  className?: string
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
    >
      <div className={cn("h-full rounded-full", FILL[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}
