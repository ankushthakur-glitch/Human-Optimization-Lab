"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/design-system/ui/skeleton"
import { AreaSpark } from "@/components/dashboard-kit-v2/charts"
import { FOCUS, type IconDef, KitIcon } from "@/components/dashboard-kit-v2/icon"

/* The compact metric card, about 90px tall. Left: icon and label on one
   line, the value with its badge, then the week's delta. Right: an 84×40
   sparkline of the last 14 days. Pressing it filters something; the
   selected card takes the primary border and a 3px wash ring. */

export function MetricCard({
  icon,
  label,
  value,
  badge,
  delta,
  series,
  color,
  selected,
  onPress,
}: {
  icon: IconDef
  label: string
  value: number
  badge?: React.ReactNode
  delta: string
  /** One value per day, oldest first. */
  series: number[]
  color: string
  selected?: boolean
  onPress?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={selected}
      className={cn(
        "flex min-h-[90px] min-w-0 flex-col rounded-[7.2px] border border-border bg-card px-3.5 py-3 text-left transition-[border-color,box-shadow] hover:border-foreground/20",
        selected && "border-primary ring-3 ring-primary-surface hover:border-primary",
        FOCUS
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
        <KitIcon icon={icon} />
        <span className="truncate">{label}</span>
      </span>
      <span className="flex min-w-0 items-end justify-between gap-2">
        <span className="flex shrink-0 items-center gap-2 pb-1">
          <span className={cn("text-2xl leading-8 font-semibold tabular-nums", value === 0 && "text-ring")}>
            {value.toLocaleString("en-US")}
          </span>
          {badge}
        </span>
        <AreaSpark values={series} color={color} label={`${label}, open per day for the last ${series.length} days`} />
      </span>
      <span className="-mt-1 truncate text-xs text-muted-foreground tabular-nums">{delta}</span>
    </button>
  )
}

export function MetricCardSkeleton() {
  return (
    <div className="flex min-h-[90px] flex-col rounded-[7.2px] border border-border bg-card px-3.5 py-3">
      <Skeleton className="h-3.5 w-28 rounded-sm" />
      <div className="mt-1 flex items-end gap-2">
        <Skeleton className="mb-1 h-7 w-14 rounded-sm" />
        <Skeleton className="ml-auto h-10 w-[84px] rounded-sm" />
      </div>
      <Skeleton className="mt-1 h-3 w-24 rounded-sm" />
    </div>
  )
}
