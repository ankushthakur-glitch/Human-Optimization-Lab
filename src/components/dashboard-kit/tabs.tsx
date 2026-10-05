"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"

/* Two tab shapes over the build's Tabs (arrow keys, Home and End come with
   it). SegmentedControl is TailAdmin's ChartTab: a grey track with a white
   active pill. UnderlineTabs is TailAdmin's tabs with badge: a 2px primary
   underline and a count after each word. */

export type TabOption<T extends string> = { value: T; label: string; count?: number }

function Count({ n, active }: { n: number; active?: boolean }) {
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
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T
  options: TabOption<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)} className={cn("gap-0", className)}>
      <TabsList
        aria-label={label}
        className="h-auto! gap-0.5 rounded-[7.2px] bg-secondary p-0.5"
      >
        {options.map((o) => (
          <TabsTrigger
            key={o.value}
            value={o.value}
            className="h-auto flex-none gap-1.5 rounded-[5.76px] px-3 py-1.5 text-[13px] font-medium text-muted-foreground data-active:bg-card data-active:text-foreground data-active:shadow-xs dark:data-active:bg-card"
          >
            {o.label}
            {o.count !== undefined && <Count n={o.count} active={o.value === value} />}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export function UnderlineTabs<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T
  options: TabOption<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)} className={cn("gap-0", className)}>
      <TabsList
        variant="line"
        aria-label={label}
        className="h-auto! w-full justify-start gap-6 rounded-none border-b border-[color-mix(in_oklab,var(--border)_65%,transparent)] p-0 px-5"
      >
        {options.map((o) => (
          <TabsTrigger
            key={o.value}
            value={o.value}
            className="h-auto flex-none gap-2 rounded-none px-0 py-3.5 text-sm font-medium text-muted-foreground not-data-active:hover:bg-transparent hover:text-foreground data-active:text-primary-tint after:bg-primary group-data-horizontal/tabs:after:bottom-[-1px] dark:not-data-active:hover:bg-transparent dark:data-active:text-primary-tint"
          >
            {o.label}
            {o.count !== undefined && <Count n={o.count} active={o.value === value} />}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
