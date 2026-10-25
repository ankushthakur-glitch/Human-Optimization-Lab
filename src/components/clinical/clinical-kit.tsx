"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Required } from "@/components/form-kit"
import { type Range } from "@/components/clinical/clinical-data"
import { Field, FieldLabel } from "@/design-system/ui/field"
import { Input } from "@/design-system/ui/input"
import { Textarea } from "@/design-system/ui/textarea"

/* Form pieces the clinical content pages share on top of the form kit. */

export function TextAreaField({
  id,
  label,
  required,
  rows = 4,
  value,
  onChange,
  className,
}: {
  id: string
  label: string
  required?: boolean
  rows?: number
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <Required />}
      </FieldLabel>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

function toNumber(value: string) {
  return value.trim() === "" ? undefined : Number(value)
}

/** A range as two numbers; either end may be left open. */
export function RangeField({
  id,
  label,
  unit,
  value,
  onChange,
  className,
}: {
  id: string
  label: string
  unit?: string
  value: Range
  onChange: (value: Range) => void
  className?: string
}) {
  return (
    <Field className={className}>
      <FieldLabel htmlFor={`${id}-low`}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <Input
          id={`${id}-low`}
          type="number"
          inputMode="decimal"
          aria-label={`${label} low`}
          placeholder="Low"
          value={value.low ?? ""}
          onChange={(e) => onChange({ ...value, low: toNumber(e.target.value) })}
          className="tabular-nums"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="number"
          inputMode="decimal"
          aria-label={`${label} high`}
          placeholder="High"
          value={value.high ?? ""}
          onChange={(e) =>
            onChange({ ...value, high: toNumber(e.target.value) })
          }
          className="tabular-nums"
        />
        {unit && (
          <span className="shrink-0 text-sm text-muted-foreground">{unit}</span>
        )}
      </div>
    </Field>
  )
}

/** A range in a table cell, muted when not set. */
export function RangeCell({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "tabular-nums",
        children ? "text-foreground/85" : "text-muted-foreground/60",
        className
      )}
    >
      {children || "Not set"}
    </span>
  )
}
