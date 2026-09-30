"use client"

import * as React from "react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { IconCalendar } from "@/design-system/icons"
import { Calendar } from "@/design-system/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/design-system/ui/popover"

/* One day picked on the library Calendar, in a popover. Values are ISO days
   (yyyy-MM-dd) so it drops in wherever a native date input stood. The
   trigger wears the Select trigger's look so forms read as one set. */

const toDate = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime()) ? undefined : d
}
const toIso = (d: Date) => format(d, "yyyy-MM-dd")

function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = "Select date",
  disabled,
  className,
  "aria-invalid": ariaInvalid,
  "aria-required": ariaRequired,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  /** Earliest and latest pickable ISO days. */
  min?: string
  max?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  "aria-invalid"?: boolean
  "aria-required"?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const selected = toDate(value)
  const from = min ? toDate(min) : undefined
  const to = max ? toDate(max) : undefined
  const now = new Date()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-required={ariaRequired}
        data-placeholder={selected ? undefined : ""}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-lg border border-transparent bg-input/50 px-3 py-2 text-left text-sm whitespace-nowrap transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
      >
        <span className="flex-1 truncate">
          {selected ? format(selected, "MMM d, yyyy") : placeholder}
        </span>
        <IconCalendar className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          defaultMonth={selected ?? to ?? now}
          startMonth={from ?? new Date(1900, 0)}
          endMonth={to ?? new Date(now.getFullYear() + 20, 11)}
          disabled={[
            ...(from ? [{ before: from }] : []),
            ...(to ? [{ after: to }] : []),
          ]}
          onSelect={(d) => {
            onChange(d ? toIso(d) : "")
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
