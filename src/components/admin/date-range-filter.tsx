"use client"

import * as React from "react"
import { format } from "date-fns"
import { type DateRange } from "react-day-picker"

import {
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "@/design-system/icons"
import { Button } from "@/design-system/ui/button"
import { Calendar } from "@/design-system/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/design-system/ui/popover"
import { Separator } from "@/design-system/ui/separator"
import { cn } from "@/lib/utils"

/* The dashboard's period: a quick preset, or any two days picked on the
   calendar. Periods are inclusive ISO days; null ends mean open. */

export type Period = { from: string | null; to: string | null }

const iso = (d: Date) => format(d, "yyyy-MM-dd")
const day = (s: string) => new Date(`${s}T12:00:00`)
const back = (today: Date, days: number) => {
  const d = new Date(today)
  d.setDate(d.getDate() - days)
  return d
}
const lastDays = (days: number) => (today: Date) => ({
  from: iso(back(today, days - 1)),
  to: iso(today),
})

/* Grouped as the menu shows them; a separator sits between groups. */
export const PRESETS = [
  {
    value: "today",
    label: "Today",
    group: 0,
    range: (t: Date) => ({ from: iso(t), to: iso(t) }),
  },
  {
    value: "yesterday",
    label: "Yesterday",
    group: 0,
    range: (t: Date) => ({ from: iso(back(t, 1)), to: iso(back(t, 1)) }),
  },
  { value: "7d", label: "Last 7 days", group: 1, range: lastDays(7) },
  { value: "30d", label: "Last 30 days", group: 1, range: lastDays(30) },
  { value: "90d", label: "Last 90 days", group: 1, range: lastDays(90) },
  {
    value: "month",
    label: "This month",
    group: 2,
    range: (t: Date) => ({
      from: iso(new Date(t.getFullYear(), t.getMonth(), 1)),
      to: iso(t),
    }),
  },
  {
    value: "lastMonth",
    label: "Last month",
    group: 2,
    range: (t: Date) => ({
      from: iso(new Date(t.getFullYear(), t.getMonth() - 1, 1)),
      to: iso(new Date(t.getFullYear(), t.getMonth(), 0)),
    }),
  },
  {
    value: "quarter",
    label: "This quarter",
    group: 2,
    range: (t: Date) => ({
      from: iso(new Date(t.getFullYear(), Math.floor(t.getMonth() / 3) * 3, 1)),
      to: iso(t),
    }),
  },
  {
    value: "year",
    label: "This year",
    group: 3,
    range: (t: Date) => ({ from: `${t.getFullYear()}-01-01`, to: iso(t) }),
  },
  {
    value: "lastYear",
    label: "Last year",
    group: 3,
    range: (t: Date) => ({
      from: `${t.getFullYear() - 1}-01-01`,
      to: `${t.getFullYear() - 1}-12-31`,
    }),
  },
  {
    value: "all",
    label: "All time",
    group: 4,
    range: (): Period => ({ from: null, to: null }),
  },
] as const

export type PresetValue = (typeof PRESETS)[number]["value"]

/** The value the filter holds: a preset, or a custom pair of days. */
export type RangeValue =
  { preset: PresetValue } | { preset: "custom"; from: string; to: string }

/** The days a value covers, counted back from today. */
export function periodOf(value: RangeValue, today = new Date()): Period {
  if (value.preset === "custom") return { from: value.from, to: value.to }
  return PRESETS.find((p) => p.value === value.preset)!.range(today)
}

export function labelOf(value: RangeValue) {
  if (value.preset !== "custom")
    return PRESETS.find((p) => p.value === value.preset)!.label
  const from = day(value.from)
  const to = day(value.to)
  const sameYear = from.getFullYear() === to.getFullYear()
  return `${format(from, sameYear ? "MMM d" : "MMM d, y")} - ${format(to, "MMM d, y")}`
}

export function DateRangeFilter({
  value,
  onChange,
  className,
}: {
  value: RangeValue
  onChange: (next: RangeValue) => void
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  /* The menu opens on the presets; the calendar only on Custom range. */
  const [custom, setCustom] = React.useState(false)
  const [draft, setDraft] = React.useState<DateRange | undefined>()

  /* Opening starts the calendar on the period in view. */
  function onOpenChange(next: boolean) {
    if (next) {
      const { from, to } = periodOf(value)
      setDraft(from && to ? { from: day(from), to: day(to) } : undefined)
      setCustom(false)
    }
    setOpen(next)
  }

  function pick(next: RangeValue) {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full justify-start rounded-md bg-card font-normal sm:w-auto",
              className
            )}
            aria-label="Date range"
          />
        }
      >
        <IconCalendar data-icon="inline-start" />
        <span className="truncate">{labelOf(value)}</span>
        <IconChevronDown
          data-icon="inline-end"
          className="ml-auto text-muted-foreground"
        />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className={cn(
          "max-w-[calc(100vw-2rem)] gap-0 p-0",
          custom ? "w-auto" : "w-52"
        )}
      >
        {custom ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-1 border-b px-1.5 py-1.5">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Back to presets"
                onClick={() => setCustom(false)}
              >
                <IconChevronLeft />
              </Button>
              <span className="text-[13px] font-medium">Custom range</span>
            </div>
            <Calendar
              mode="range"
              selected={draft}
              onSelect={setDraft}
              numberOfMonths={2}
              /* The right month holds the range's end, so today shows. */
              defaultMonth={(() => {
                const end = draft?.to ?? new Date()
                return new Date(end.getFullYear(), end.getMonth() - 1, 1)
              })()}
              disabled={{ after: new Date() }}
            />
            <div className="flex items-center justify-between gap-3 border-t px-3 py-2.5">
              <span className="text-xs text-muted-foreground tabular-nums">
                {draft?.from && draft.to
                  ? labelOf({
                      preset: "custom",
                      from: iso(draft.from),
                      to: iso(draft.to),
                    })
                  : "Pick two days"}
              </span>
              <Button
                size="sm"
                disabled={!draft?.from || !draft.to}
                onClick={() =>
                  draft?.from &&
                  draft.to &&
                  pick({
                    preset: "custom",
                    from: iso(draft.from),
                    to: iso(draft.to),
                  })
                }
              >
                Apply
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 p-1.5">
            {PRESETS.map((preset, i) => {
              const active = value.preset === preset.value
              return (
                <React.Fragment key={preset.value}>
                  {i > 0 && PRESETS[i - 1].group !== preset.group && (
                    <Separator className="my-1" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "justify-between font-normal",
                      active && "bg-muted"
                    )}
                    onClick={() => pick({ preset: preset.value })}
                  >
                    {preset.label}
                    {active && <IconCheck data-icon="inline-end" />}
                  </Button>
                </React.Fragment>
              )
            })}
            <Separator className="my-1" />
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "justify-between font-normal",
                value.preset === "custom" && "bg-muted"
              )}
              onClick={() => setCustom(true)}
            >
              Custom range
              <IconChevronRight
                data-icon="inline-end"
                className="text-muted-foreground"
              />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
