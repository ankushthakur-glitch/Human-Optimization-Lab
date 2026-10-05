import * as React from "react"

import { cn } from "@/lib/utils"
import { DIVIDER, type IconDef, KitIcon } from "@/components/dashboard-kit-v2/icon"

/* A Tier 1 row: a 3px accent bar (red for clinical, amber for an approval
   or a process state), a tinted icon square, the title with optional chips,
   one muted subline, and one action on the right. Never two sublines. */

const TONE = {
  clinical: { bar: "bg-destructive", box: "bg-destructive-1 text-destructive" },
  process: { bar: "bg-warning", box: "bg-warning-surface text-warning" },
} as const

export function NeedsYouRow({
  tone,
  icon,
  title,
  chips,
  subline,
  action,
  className,
}: {
  tone: keyof typeof TONE
  icon: IconDef
  title: React.ReactNode
  /** Badges after the title. */
  chips?: React.ReactNode
  subline: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  const t = TONE[tone]
  return (
    <li className={cn("flex items-center gap-3 border-b py-2.5 pr-4 pl-3 last:border-0", DIVIDER, className)}>
      <span aria-hidden className={cn("h-10 w-[3px] shrink-0 rounded-full", t.bar)} />
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-[5.76px]", t.box)}>
        <KitIcon icon={icon} size={16} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
          {title}
          {chips}
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">{subline}</p>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </li>
  )
}
