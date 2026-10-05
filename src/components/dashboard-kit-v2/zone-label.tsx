import * as React from "react"
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Card } from "@/components/dashboard-kit-v2/card"
import { KitIcon } from "@/components/dashboard-kit-v2/icon"

/* The tier labels that replace section cards and coloured headers: a small
   uppercase word, an optional count, and a rule to the right edge. The
   count takes the error tint only in Needs you now, the one tier that may
   carry red. DoneRow is that tier's quiet state. */

export function ZoneLabel({
  children,
  count,
  tone = "neutral",
  id,
  className,
}: {
  children: string
  count?: number
  tone?: "neutral" | "error"
  id?: string
  className?: string
}) {
  return (
    <div id={id} className={cn("flex items-center gap-2.5", className)}>
      <h3 className="shrink-0 text-xs leading-4 font-semibold tracking-[0.06em] text-muted-foreground uppercase">
        {children}
      </h3>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-[4.32px] px-1.5 text-xs font-medium tabular-nums",
            tone === "error"
              ? "bg-destructive-1 text-destructive"
              : "bg-secondary text-muted-foreground"
          )}
        >
          {count.toLocaleString("en-US")}
        </span>
      )}
      <span aria-hidden className="h-px min-w-0 flex-1 bg-border" />
    </div>
  )
}

/** A tier with nothing in it: one line with a check, never a blank. */
export function DoneRow({
  title,
  meta,
  children,
  id,
  className,
}: {
  title: string
  meta?: string
  children?: React.ReactNode
  id?: string
  className?: string
}) {
  return (
    <Card
      id={id}
      role="status"
      className={cn("flex-row items-center gap-3 px-5 py-3.5", className)}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success-surface text-success">
        <KitIcon icon={CheckmarkCircle02Icon} size={16} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-medium">{title}</span>
        {(meta ?? children) && (
          <span className="truncate text-xs text-muted-foreground tabular-nums">
            {meta ?? children}
          </span>
        )}
      </span>
    </Card>
  )
}
