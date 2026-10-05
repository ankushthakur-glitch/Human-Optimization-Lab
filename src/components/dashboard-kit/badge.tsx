import * as React from "react"

import { cn } from "@/lib/utils"
import { Badge as DsBadge } from "@/design-system/ui/badge"
import { Icon, type KitIcon } from "@/components/dashboard-kit/icon"

/* TailAdmin's light badge on the build's tokens: square-ish (4.32px), 22px
   tall, an optional 12px icon or dot before the word. Red is for clinical
   items only and amber for process; every status pairs its colour with an
   icon or a dot and a word, so it reads without colour. */

export type BadgeTone =
  | "error"
  | "warning"
  | "success"
  | "info"
  | "primary"
  | "light"
  | "outline"

const TONE: Record<BadgeTone, string> = {
  error: "bg-destructive-1 text-destructive",
  warning: "bg-warning-1 text-warning-7",
  success: "bg-success-1 text-success-7",
  info: "bg-info-surface text-info",
  primary: "bg-primary-surface text-primary-tint",
  light: "bg-secondary text-foreground/80",
  outline: "border-foreground/15 bg-card text-foreground/70",
}

export function Badge({
  tone = "light",
  icon,
  dot,
  className,
  children,
  ...props
}: {
  tone?: BadgeTone
  icon?: KitIcon
  /** A 6px dot before the word, in this colour class (e.g. "bg-foreground/70"). */
  dot?: string
  className?: string
  children: React.ReactNode
} & Omit<React.ComponentProps<"span">, "children">) {
  return (
    <DsBadge
      variant="outline"
      className={cn(
        "h-[22px] gap-1 rounded-[4.32px] px-2 text-xs font-medium tabular-nums",
        tone !== "outline" && "border-transparent",
        TONE[tone],
        className
      )}
      {...props}
    >
      {icon && <Icon icon={icon} className="size-3" />}
      {dot && <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot)} />}
      {children}
    </DsBadge>
  )
}
