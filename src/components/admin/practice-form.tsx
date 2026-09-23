"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

import { Button } from "@/design-system/ui/button"
import { Checkbox } from "@/design-system/ui/checkbox"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/design-system/ui/field"
import { Input } from "@/design-system/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/design-system/ui/sheet"
import {
  type Address,
  type Practice,
  type PracticeInput,
  US_STATES,
  formatPhone,
  referralUrlFor,
  tenantFromName,
} from "@/components/admin/practices-store"

/* -------------------------------------------------------------------------- */
/*  Values and validation                                                      */
/* -------------------------------------------------------------------------- */

const EMPTY_ADDRESS: Address = {
  line1: "",
  line2: "",
  country: "United States",
  state: "",
  city: "",
  zip: "",
}

const EMPTY: PracticeInput = {
  name: "",
  tenant: "",
  referralUrl: "",
  locationName: "",
  contactNumber: "",
  npi: "",
  email: "",
  fax: "",
  website: "",
  clinical: EMPTY_ADDRESS,
  billingSameAsClinical: true,
  billing: EMPTY_ADDRESS,
  defaultLocation: true,
}

function fromPractice(p: Practice): PracticeInput {
  return {
    name: p.name,
    tenant: p.tenant,
    referralUrl: p.referralUrl,
    locationName: p.locationName,
    contactNumber: p.contactNumber,
    npi: p.npi,
    email: p.email,
    fax: p.fax,
    website: p.website,
    clinical: p.clinical,
    billingSameAsClinical: p.billingSameAsClinical,
    billing: p.billing,
    defaultLocation: p.defaultLocation,
  }
}

type Errors = Partial<Record<string, string>>

const digits = (value: string) => value.replace(/\D/g, "")

function validateAddress(a: Address, prefix: string, errors: Errors) {
  if (!a.line1.trim()) errors[`${prefix}.line1`] = "Enter address line 1."
  if (!a.state) errors[`${prefix}.state`] = "Select a state."
  if (!a.city.trim()) errors[`${prefix}.city`] = "Enter a city."
  if (!a.zip.trim()) errors[`${prefix}.zip`] = "Enter a zip code."
  else if (!/^\d{5}(-\d{4})?$/.test(a.zip.trim()))
    errors[`${prefix}.zip`] = "Use 5 digits, or ZIP+4 like 80107-9120."
}

function validate(v: PracticeInput): Errors {
  const errors: Errors = {}
  if (!v.name.trim()) errors.name = "Enter the practice name."
  if (!v.locationName.trim()) errors.locationName = "Enter a location name."
  if (!v.contactNumber) errors.contactNumber = "Enter a contact number."
  else if (digits(v.contactNumber).length !== 10)
    errors.contactNumber = "Enter a 10-digit phone number."
  if (v.npi && !/^\d{10}$/.test(v.npi))
    errors.npi = "A group NPI is exactly 10 digits."
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))
    errors.email = "Enter a valid email address."
  if (v.fax && digits(v.fax).length !== 10)
    errors.fax = "Enter a 10-digit fax number."
  if (v.website && !/^https?:\/\/[^\s.]+\.[^\s]+$/.test(v.website))
    errors.website = "Start with https:// and include the domain."
  validateAddress(v.clinical, "clinical", errors)
  if (!v.billingSameAsClinical) validateAddress(v.billing, "billing", errors)
  return errors
}

/* -------------------------------------------------------------------------- */
/*  Pieces                                                                     */
/* -------------------------------------------------------------------------- */

function Required() {
  return (
    <span aria-hidden className="text-destructive">
      *
    </span>
  )
}

function TextField({
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

const COUNTRY_ITEMS = [{ label: "United States", value: "United States" }]
const STATE_ITEMS = [
  { label: "Select state", value: null },
  ...US_STATES.map((state) => ({ label: state, value: state })),
]

function AddressFields({
  prefix,
  value,
  onChange,
  errors,
  disabled,
}: {
  prefix: string
  value: Address
  onChange: (next: Address) => void
  errors: Errors
  disabled?: boolean
}) {
  const id = (name: string) => `practice-${prefix}-${name}`
  const set =
    (key: keyof Address) => (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [key]: event.target.value })

  return (
    <FieldGroup className="gap-4">
      <TextField
        id={id("line1")}
        label="Address line 1"
        required
        placeholder="Street address"
        autoComplete="address-line1"
        value={value.line1}
        onChange={set("line1")}
        error={errors[`${prefix}.line1`]}
        disabled={disabled}
      />
      <TextField
        id={id("line2")}
        label="Address line 2"
        placeholder="Suite, unit, floor (optional)"
        autoComplete="address-line2"
        value={value.line2}
        onChange={set("line2")}
        disabled={disabled}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={id("country")}>
            Country
            <Required />
          </FieldLabel>
          <Select
            items={COUNTRY_ITEMS}
            value={value.country}
            disabled={disabled}
          >
            <SelectTrigger id={id("country")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {COUNTRY_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field data-invalid={errors[`${prefix}.state`] ? true : undefined}>
          <FieldLabel htmlFor={id("state")}>
            State
            <Required />
          </FieldLabel>
          <Select
            items={STATE_ITEMS}
            value={value.state || null}
            onValueChange={(state: string | null) =>
              onChange({ ...value, state: state ?? "" })
            }
            disabled={disabled}
          >
            <SelectTrigger
              id={id("state")}
              className="w-full"
              aria-invalid={errors[`${prefix}.state`] ? true : undefined}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectGroup>
                {STATE_ITEMS.map((item) => (
                  <SelectItem key={String(item.value)} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {errors[`${prefix}.state`] && (
            <FieldError>{errors[`${prefix}.state`]}</FieldError>
          )}
        </Field>
        <TextField
          id={id("city")}
          label="City"
          required
          placeholder="Elizabeth"
          autoComplete="address-level2"
          value={value.city}
          onChange={set("city")}
          error={errors[`${prefix}.city`]}
          disabled={disabled}
        />
        <TextField
          id={id("zip")}
          label="Zip code"
          required
          placeholder="80107-9120"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={10}
          value={value.zip}
          onChange={set("zip")}
          error={errors[`${prefix}.zip`]}
          disabled={disabled}
        />
      </div>
    </FieldGroup>
  )
}

/* Generated values sit in a flat grey box so they read as not editable. */
const READ_ONLY = "[&_input]:bg-muted! [&_input]:text-muted-foreground"

/* A light section: a small heading with a hairline running to the edge, then
   its fields. Structure without boxing every group in its own grey panel. */
function FormSection({
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
        <span aria-hidden className="h-px flex-1 bg-border" />
        {action}
      </div>
      {children}
    </fieldset>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sheet                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Add or edit a practice. It opens from the right, as in the reference, so the
 * list stays in view behind it. Passing `practice` switches it to edit mode,
 * where the tenant name and referral URL are fixed: they key the practice's
 * data and the links already sent to patients.
 */
export function PracticeFormSheet({
  open,
  onOpenChange,
  practice,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  practice?: Practice
  onSubmit: (input: PracticeInput) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 data-[side=right]:sm:max-w-xl"
      >
        {/* The body mounts with the sheet, so each open starts from a clean
            draft and a cancelled one never leaks into the next practice. */}
        <PracticeFormBody
          practice={practice}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  )
}

function PracticeFormBody({
  practice,
  onSubmit,
  onCancel,
}: {
  practice?: Practice
  onSubmit: (input: PracticeInput) => void
  onCancel: () => void
}) {
  const editing = Boolean(practice)
  const [values, setValues] = React.useState<PracticeInput>(() =>
    practice ? fromPractice(practice) : EMPTY
  )
  const [attempted, setAttempted] = React.useState(false)

  const tenant = editing ? values.tenant : tenantFromName(values.name)
  const referralUrl = editing ? values.referralUrl : referralUrlFor(tenant)
  const errors = attempted ? validate(values) : {}

  function set<K extends keyof PracticeInput>(key: K, value: PracticeInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const billing = values.billingSameAsClinical
    ? values.clinical
    : values.billing

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttempted(true)
    const found = validate(values)
    const first = Object.keys(found)[0]
    if (first) {
      document.getElementById(`practice-${first.replace(".", "-")}`)?.focus()
      return
    }
    onSubmit({
      ...values,
      name: values.name.trim(),
      tenant,
      referralUrl,
      billing: values.billingSameAsClinical ? values.clinical : values.billing,
    })
  }

  return (
    <>
      <SheetHeader className="shrink-0 border-b">
        <SheetTitle>{editing ? "Edit practice" : "Add practice"}</SheetTitle>
        <SheetDescription className="sr-only">
          Practice details, location and addresses.
        </SheetDescription>
      </SheetHeader>

      <form
        id="practice-form"
        noValidate
        onSubmit={handleSubmit}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto p-6",
          /* White fields with a hairline border, as in the reference form,
             instead of the filled grey default. */
          "[&_[data-slot=input]]:border-input [&_[data-slot=input]]:bg-background",
          "[&_[data-slot=select-trigger]]:border-input [&_[data-slot=select-trigger]]:bg-background"
        )}
      >
        <FormSection title="Practice">
          <TextField
            id="practice-name"
            label="Practice name"
            required
            placeholder="Enter practice name"
            autoComplete="organization"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            error={errors.name}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="practice-tenant"
              label="Tenant name"
              required
              readOnly
              tabIndex={-1}
              placeholder="tenant_name"
              value={tenant}
              className={READ_ONLY}
            />
            <TextField
              id="practice-referral"
              label="Referral URL"
              required
              readOnly
              tabIndex={-1}
              value={referralUrl}
              className={READ_ONLY}
            />
          </div>
        </FormSection>

        <FormSection title="Location">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="practice-locationName"
              label="Location name"
              required
              placeholder="Enter location name"
              value={values.locationName}
              onChange={(event) => set("locationName", event.target.value)}
              error={errors.locationName}
            />
            <TextField
              id="practice-contactNumber"
              label="Contact number"
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(123)-456-7890"
              value={values.contactNumber}
              onChange={(event) =>
                set("contactNumber", formatPhone(event.target.value))
              }
              error={errors.contactNumber}
            />
            <TextField
              id="practice-npi"
              label="Group NPI number"
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit NPI"
              value={values.npi}
              onChange={(event) =>
                set("npi", event.target.value.replace(/\D/g, ""))
              }
              error={errors.npi}
            />
            <TextField
              id="practice-email"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="frontdesk@practice.com"
              value={values.email}
              onChange={(event) => set("email", event.target.value)}
              error={errors.email}
            />
            <TextField
              id="practice-fax"
              label="Fax"
              type="tel"
              inputMode="tel"
              placeholder="(123)-456-7890"
              value={values.fax}
              onChange={(event) => set("fax", formatPhone(event.target.value))}
              error={errors.fax}
            />
            <TextField
              id="practice-website"
              label="Website"
              type="url"
              autoComplete="url"
              placeholder="https://www.example.com"
              value={values.website}
              onChange={(event) => set("website", event.target.value)}
              error={errors.website}
            />
          </div>
          <FieldLabel
            htmlFor="practice-default"
            className="items-center font-normal"
          >
            <Checkbox
              id="practice-default"
              checked={values.defaultLocation}
              onCheckedChange={(checked) => set("defaultLocation", checked)}
            />
            Set as the practice&apos;s default location
          </FieldLabel>
        </FormSection>

        <FormSection title="Clinical address">
          <AddressFields
            prefix="clinical"
            value={values.clinical}
            onChange={(next) => set("clinical", next)}
            errors={errors}
          />
        </FormSection>

        <FormSection
          title="Billing address"
          action={
            <FieldLabel
              htmlFor="practice-billing-same"
              className="items-center text-sm font-normal"
            >
              <Checkbox
                id="practice-billing-same"
                checked={values.billingSameAsClinical}
                onCheckedChange={(checked) =>
                  setValues((prev) => ({
                    ...prev,
                    billingSameAsClinical: checked,
                    /* Unticking starts from a copy of the clinical address,
                       since most billing addresses differ by a line or two. */
                    billing: checked ? prev.billing : prev.clinical,
                  }))
                }
              />
              Same as clinical address
            </FieldLabel>
          }
        >
          <AddressFields
            prefix="billing"
            value={billing}
            onChange={(next) => set("billing", next)}
            errors={errors}
            disabled={values.billingSameAsClinical}
          />
        </FormSection>
      </form>

      <SheetFooter className="mt-0 shrink-0 flex-row items-center justify-end gap-2 border-t p-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" form="practice-form">
          {editing ? "Save changes" : "Create practice"}
        </Button>
      </SheetFooter>
    </>
  )
}
