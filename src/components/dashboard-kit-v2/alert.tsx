import * as React from "react"

import { cn } from "@/lib/utils"
import { type IconDef, KitIcon } from "@/components/dashboard-kit-v2/icon"

/* TailAdmin's alert: a tinted panel with a 20px icon, a bold title, a
   13px body and right-aligned actions. Error for clinical, warning for
   process. */

const TONE = {
  error: "border-destructive-3 bg-destructive-1 [&_[data-slot=alert-icon]]:text-destructive",
  warning: "border-warning-3 bg-warning-1 [&_[data-slot=alert-icon]]:text-warning",
} as const

export function Alert({
  tone,
  icon,
  title,
  actions,
  className,
  children,
}: {
  tone: keyof typeof TONE
  icon: IconDef
  title: string
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div role="status" className={cn("flex gap-3 rounded-[7.2px] border px-4 py-3.5", TONE[tone], className)}>
      <span data-slot="alert-icon" className="mt-0.5">
        <KitIcon icon={icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-semibold">{title}</p>
        {children && <div className="text-[13px] text-muted-foreground">{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 self-center">{actions}</div>}
    </div>
  )
}
