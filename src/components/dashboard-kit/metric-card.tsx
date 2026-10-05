import * as React from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/design-system/ui/skeleton"
import { AreaSpark } from "@/components/dashboard-kit/charts"
import { FOCUS_RING, Icon, type KitIcon } from "@/components/dashboard-kit/icon"

/* The compact metric card (about 90px): icon and label on one line, the
   value with its badge beside a 14-day area sparkline, then the week's
   delta across the card's width. Pressable when it filters something;
   the selected card takes a primary border and a 3px wash ring. */

export function MetricCard({
  icon,
  label,
  value,
  badge,
  delta,
  series,
  color,
  selected,
  onClick,
  className,
}: {
  icon: KitIcon
  label: string
  value: number
  badge?: React.ReactNode
  /** e.g. "+1 vs last week". */
  delta: string
  /** One value per day, oldest first. */
  series: number[]
  /** The sparkline colour (a CHART token). */
  color: string
  selected?: boolean
  onClick?: () => void
  className?: string
}) {
  const Tag = onClick ? "button" : "div"
  return (
    <Tag
      {...(onClick && { type: "button" as const, onClick, "aria-pressed": !!selected })}
      className={cn(
        "flex min-h-[90px] min-w-0 flex-col rounded-[7.2px] border border-border bg-card px-3.5 py-3 text-left transition-[border-color,box-shadow]",
        onClick && "cursor-pointer hover:border-foreground/20",
        selected && "border-primary ring-3 ring-primary-surface hover:border-primary",
        FOCUS_RING,
        className
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
        <Icon icon={icon} />
        <span className="truncate">{label}</span>
      </span>
      <span className="mt-1 flex min-w-0 items-end gap-2">
        <span className="flex min-w-0 flex-1 items-center gap-2 pb-1">
          <span
            className={cn(
              "text-2xl leading-8 font-semibold tabular-nums",
              value === 0 ? "text-ring" : "text-foreground"
            )}
          >
            {value.toLocaleString("en-US")}
          </span>
          {badge}
        </span>
        <AreaSpark values={series} color={color} label={`${label}, open per day for the last ${series.length} days`} />
      </span>
      <span className="-mt-1 truncate text-xs text-muted-foreground tabular-nums">{delta}</span>
    </Tag>
  )
}

export function MetricCardSkeleton() {
  return (
    <div className="flex min-h-[90px] flex-col rounded-[7.2px] border border-border bg-card px-3.5 py-3">
      <Skeleton className="h-4 w-32 rounded-sm" />
      <div className="mt-1 flex items-end gap-2">
        <Skeleton className="mb-1 h-7 w-16 flex-1 rounded-sm" />
        <Skeleton className="h-10 w-[84px] rounded-sm" />
      </div>
      <Skeleton className="mt-1 h-3 w-24 rounded-sm" />
    </div>
  )
}
