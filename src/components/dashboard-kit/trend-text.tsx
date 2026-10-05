import { ArrowDown02Icon, ArrowDownRight01Icon, ArrowRight02Icon, ArrowUp02Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Icon } from "@/components/dashboard-kit/icon"

/* A trend as text with an arrow, in place of a filled pill: the arrow
   follows the value's direction and the word says what it means. Grey by
   default; red only on an urgent row; green for an improvement. */

export type TrendDirection = "up" | "down" | "flat"
export type TrendTone = "neutral" | "worse" | "better"

const ARROW: Record<TrendDirection, { diagonal: typeof ArrowUpRight01Icon; straight: typeof ArrowUp02Icon }> = {
  up: { diagonal: ArrowUpRight01Icon, straight: ArrowUp02Icon },
  down: { diagonal: ArrowDownRight01Icon, straight: ArrowDown02Icon },
  flat: { diagonal: ArrowRight02Icon, straight: ArrowRight02Icon },
}

const TONE: Record<TrendTone, string> = {
  neutral: "text-muted-foreground",
  worse: "text-destructive",
  better: "text-success-7",
}

export function TrendText({
  direction,
  tone = "neutral",
  arrow = "diagonal",
  children,
  className,
}: {
  direction: TrendDirection
  tone?: TrendTone
  /** Diagonal arrows for trends (↗ Worse); straight ones for flags (↑ High). */
  arrow?: "diagonal" | "straight"
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs leading-4 font-medium whitespace-nowrap tabular-nums",
        TONE[tone],
        className
      )}
    >
      <Icon icon={ARROW[direction][arrow]} className="size-3.5" />
      {children}
    </span>
  )
}
