import {
  ArrowDown02Icon,
  ArrowUp02Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { type IconDef, KitIcon } from "@/components/dashboard-kit-v2/icon"

/* Trends and flags as text with an arrow, not filled pills: "↗ Worse",
   "→ Stable", "↘ Better", "↑ High", "↓ Low". Grey by default; red only on
   an urgent row; green for better. The arrow follows the value's own
   direction, so a falling value that is getting worse points down. */

export type TrendTone = "neutral" | "urgent" | "better"

const TONE: Record<TrendTone, string> = {
  neutral: "text-muted-foreground",
  urgent: "text-destructive",
  better: "text-success",
}

function TrendText({
  icon,
  tone = "neutral",
  children,
  className,
}: {
  icon: IconDef
  tone?: TrendTone
  children: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap",
        TONE[tone],
        className
      )}
    >
      <KitIcon icon={icon} size={14} />
      {children}
    </span>
  )
}

/** "↑ High" or "↓ Low" beside a value; red only when the row is urgent. */
export function FlagText({
  flag,
  urgent,
  className,
}: {
  flag: "High" | "Low"
  urgent?: boolean
  className?: string
}) {
  return (
    <TrendText
      icon={flag === "High" ? ArrowUp02Icon : ArrowDown02Icon}
      tone={urgent ? "urgent" : "neutral"}
      className={className}
    >
      {flag}
    </TrendText>
  )
}
