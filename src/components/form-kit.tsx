"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/design-system/ui/combobox"
import { Field, FieldError, FieldLabel } from "@/design-system/ui/field"
import { Input } from "@/design-system/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/ui/select"
import { Separator } from "@/design-system/ui/separator"

/* The form pieces the admin console and the practice portal share: light
   sections, labelled inputs with inline errors, and the select variants. */

/* Demo build: every form accepts whatever is entered, so a walkthrough never
   stops on a check. Set to true to bring all the validation back. */
export const VALIDATE = false

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const digits = (value: string) => value.replace(/\D/g, "")

export type Errors = Partial<Record<string, string>>

/* Generated values sit in a flat grey box so they read as not editable. */
export const READ_ONLY = "[&_input]:bg-muted! [&_input]:text-muted-foreground"

export function Required() {
  return (
    <span aria-hidden className="text-destructive">
      *
    </span>
  )
}

export function TextField({
  id,
  label,
  required,
  error,
  className,
  ...input
}: React.ComponentProps<typeof Input> & {
  id: string
  label: string
  required?: boolean
  error?: string
}) {
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <Required />}
      </FieldLabel>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        {...input}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

/* A light section: a small heading with a hairline running to the edge, then
   its fields. Structure without boxing every group in its own grey panel. */
export function FormSection({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <fieldset className="flex shrink-0 flex-col gap-4">
      <div className="flex items-center gap-3">
        <legend className="float-left shrink-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </legend>
        <Separator className="flex-1" />
        {action}
      </div>
      {children}
    </fieldset>
  )
}

export function SelectField({
  id,
  label,
  required,
  error,
  options,
  placeholder = "Select",
  value,
  onChange,
  className,
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  options: readonly string[]
  placeholder?: string
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const items = [
    { label: placeholder, value: null },
    ...options.map((option) => ({ label: option, value: option })),
  ]
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <Required />}
      </FieldLabel>
      <Select
        items={items}
        value={value || null}
        onValueChange={(next: string | null) => onChange(next ?? "")}
      >
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={String(item.value)} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

/** Several values from a fixed list, shown as chips (locations, mostly). */
export function MultiSelectField({
  id,
  label,
  required,
  error,
  options,
  value,
  onChange,
  placeholder = "Select",
  className,
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  options: readonly string[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
}) {
  const anchor = useComboboxAnchor()
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <Required />}
      </FieldLabel>
      <Combobox
        multiple
        autoHighlight
        items={options as string[]}
        value={value}
        onValueChange={(next: string[]) => onChange(next)}
      >
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {(values: string[]) => (
              <>
                {values.map((v) => (
                  <ComboboxChip key={v}>{v}</ComboboxChip>
                ))}
                <ComboboxChipsInput
                  id={id}
                  aria-invalid={error ? true : undefined}
                  placeholder={values.length ? "" : placeholder}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No matches</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

/** The scrolling form body of a side sheet. */
export function SheetForm({
  id,
  onSubmit,
  className,
  children,
}: {
  id: string
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <form
      id={id}
      noValidate
      onSubmit={onSubmit}
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto p-6",
        className
      )}
    >
      {children}
    </form>
  )
}

/* The phone mask the reference uses: (123)-456-7890. */
export function formatPhone(value: string) {
  const d = digits(value).slice(0, 10)
  if (d.length === 0) return ""
  if (d.length <= 3) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 3)})-${d.slice(3)}`
  return `(${d.slice(0, 3)})-${d.slice(3, 6)}-${d.slice(6)}`
}

/** Focuses the first invalid field after a failed submit. */
export function focusFirstError(errors: Errors, prefix: string) {
  const first = Object.keys(errors)[0]
  if (!first) return false
  document.getElementById(`${prefix}-${first.replace(".", "-")}`)?.focus()
  return true
}
