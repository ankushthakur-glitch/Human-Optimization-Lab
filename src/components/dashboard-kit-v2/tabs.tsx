"use client"

import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"

/* Two tab shapes on the build's Tabs, which already handle arrow keys,
   Home and End. SegmentedControl is TailAdmin's ChartTab: a grey track with
   a white active segment. UnderlineTabs is TailAdmin's tabs with badge: a
   2px primary underline under the active word and a count after it. */

export type TabItem<T extends string> = { value: T; label: string; count?: number }

function CountPill({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[4.32px] px-1.5 text-xs font-medium tabular-nums",
        active ? "bg-primary-surface text-primary-tint" : "bg-secondary text-muted-foreground"
      )}
    >
      {n.toLocaleString("en-US")}
    </span>
  )
}

export function SegmentedControl<T extends string>({
  label,
  value,
  items,
  onChange,
  className,
}: {
  label: string
  value: T
  items: TabItem<T>[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)} className={cn("gap-0", className)}>
      <TabsList aria-label={label} className="h-auto! gap-0.5 rounded-[7.2px] bg-secondary p-0.5">
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className="h-auto flex-none gap-1.5 rounded-[5.76px] px-3 py-1.5 text-[13px] font-medium text-muted-foreground data-active:bg-card data-active:text-foreground data-active:shadow-xs dark:data-active:bg-card"
          >
            {item.label}
            {item.count !== undefined && <CountPill n={item.count} active={item.value === value} />}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
