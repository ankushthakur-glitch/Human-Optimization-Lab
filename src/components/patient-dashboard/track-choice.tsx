"use client"

import * as React from "react"

import { Button } from "@/design-system/ui/button"
import { Label } from "@/design-system/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/design-system/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/design-system/ui/radio-group"

/* The decisions an order or care gap takes: Postpone restarts its clock,
   Close takes it off with a reason, Send reminder nudges the patient. All
   three are audited; Postpone and Close can be undone in place. */

export type TrackActions = {
  postpone: (key: string, days: 14 | 30) => void
  close: (key: string, reason: string) => void
  undoTrack: (key: string) => void
  remind: (key: string) => void
}

export const CLOSE_REASONS = [
  "Completed elsewhere",
  "No longer needed",
  "Patient declined",
]

/** A popover with one choice to make, then Cancel or the action. */
export function Choice({
  trigger,
  options,
  confirm,
  onConfirm,
  outline,
}: {
  outline?: boolean
  trigger: string
  options: string[]
  confirm: string
  onConfirm: (value: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(options[0])
  const id = React.useId()
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setValue(options[0])
      }}
    >
      <PopoverTrigger
        render={<Button variant={outline ? "outline" : "ghost"} size="sm" />}
      >
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label={trigger}
        className="w-60 gap-4 rounded-xl"
      >
        <RadioGroup
          value={value}
          onValueChange={(v) => setValue(String(v))}
          aria-label={trigger}
          className="gap-2.5"
        >
          {options.map((opt, i) => (
            <div key={opt} className="flex items-center gap-2">
              <RadioGroupItem id={`${id}-${i}`} value={opt} />
              <Label htmlFor={`${id}-${i}`} className="text-sm font-normal">
                {opt}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setOpen(false)
              onConfirm(value)
            }}
          >
            {confirm}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
