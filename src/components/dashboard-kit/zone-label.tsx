import { Tick02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Card } from "@/components/dashboard-kit/card"
import { Icon } from "@/components/dashboard-kit/icon"

/* The dashboards' tier headings: a small semibold label, an optional count
   pill (error tint in the Needs you now tier when it is above zero) and a
   rule to the right edge. Zone labels replace section cards and coloured
   headers; the cards under them stay quiet. */

export function ZoneLabel({
  label,
  count,
  tone = "neutral",
  id,
  className,
}: {
  label: string
  count?: number
  /** "error" tints a non-zero count red (Tier 1 only). */
  tone?: "neutral" | "error"
  id?: string
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <h2 id={id} className="text-xs leading-4 font-semibold tracking-[0.02em] text-muted-foreground">
        {label}
      </h2>
      {count !== undefined && (
        <span
          className={cn(
            "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4.32px] px-1.5 text-xs font-semibold tabular-nums",
            tone === "error" && count > 0 ? "bg-destructive-1 text-destructive" : "bg-secondary text-muted-foreground"
          )}
        >
          {count.toLocaleString("en-US")}
        </span>
      )}
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  )
}

/** A tier's done state: one quiet line with a check, never a blank area. */
export function DoneRow({
  title,
  detail,
  className,
}: {
  title: string
  detail?: string
  className?: string
}) {
  return (
    <Card className={cn("flex items-center gap-3 px-5 py-3", className)} role="status">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success-1 text-success">
        <Icon icon={Tick02Icon} className="size-4" />
      </span>
      <span className="text-sm font-medium">{title}</span>
      {detail && <span className="text-[13px] text-muted-foreground tabular-nums">{detail}</span>}
    </Card>
  )
}
