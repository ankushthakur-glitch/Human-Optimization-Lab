import * as React from "react"

import { cn } from "@/lib/utils"
import { DIVIDER } from "@/components/dashboard-kit-v2/icon"

/* A compact list row: a leading icon box or avatar, a title line with a
   muted subline, and trailing meta and action. */

export function ListRow({
  lead,
  title,
  subline,
  trail,
  className,
}: {
  lead?: React.ReactNode
  title: React.ReactNode
  subline?: React.ReactNode
  trail?: React.ReactNode
  className?: string
}) {
  return (
    <li className={cn("flex items-center gap-3 border-b px-4 py-2.5 last:border-0", DIVIDER, className)}>
      {lead}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">{title}</div>
        {subline && (
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground tabular-nums">
            {subline}
          </div>
        )}
      </div>
      {trail && <div className="flex shrink-0 items-center gap-3">{trail}</div>}
    </li>
  )
}
