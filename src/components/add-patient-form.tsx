"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/design-system/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/design-system/ui/field"
import { Input } from "@/design-system/ui/input"
import { RadioGroup, RadioGroupItem } from "@/design-system/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/ui/select"
import { Separator } from "@/design-system/ui/separator"
import { Textarea } from "@/design-system/ui/textarea"

/* -------------------------------------------------------------------------- */
/*  Options                                                                    */
/* -------------------------------------------------------------------------- */

type Option = { label: string; value: string | null }

const SEX_AT_BIRTH: Option[] = [
  { label: "Select", value: null },
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Intersex", value: "intersex" },
  { label: "Prefer not to say", value: "undisclosed" },
]

const DEPARTMENTS: Option[] = [
  { label: "Select department", value: null },
  { label: "Primary Care", value: "primary-care" },
  { label: "Cardiology", value: "cardiology" },
  { label: "Endocrinology", value: "endocrinology" },
  { label: "Nephrology", value: "nephrology" },
  { label: "Orthopedics", value: "orthopedics" },
]

const PROVIDERS: Option[] = [
  { label: "Select provider", value: null },
  { label: "Dr. Reyes", value: "reyes" },
  { label: "Dr. Lin", value: "lin" },
  { label: "Dr. Osei", value: "osei" },
  { label: "Unassigned", value: "unassigned" },
]

const COVERAGE: Option[] = [
  { label: "Select payer", value: null },
  { label: "Aetna", value: "aetna" },
  { label: "Blue Cross Blue Shield", value: "bcbs" },
  { label: "Cigna", value: "cigna" },
  { label: "Medicare", value: "medicare" },
  { label: "Self-pay", value: "self-pay" },
]

const REFERRAL: Option[] = [
  { label: "Select source", value: null },
  { label: "Provider referral", value: "provider" },
  { label: "Transfer of care", value: "transfer" },
  { label: "Walk-in", value: "walk-in" },
  { label: "Online booking", value: "online" },
]

function FormSelect({
  id,
  items,
  className,
}: {
  id: string
  items: Option[]
  className?: string
}) {
  return (
    <Select items={items}>
      <SelectTrigger id={id} className={cn("w-full", className)}>
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
  )
}

/* -------------------------------------------------------------------------- */
/*  Form                                                                       */
/* -------------------------------------------------------------------------- */

export type AddPatientFormProps = {
  /**
   * `compact` is what the two overlays get: identity, contact and care team
   * only — the fields a front-desk user can complete without leaving the
   * worklist. `full` adds coverage, address and consent, because a whole page
   * can afford the scroll and the extra decisions.
   */
  variant?: "compact" | "full"
  /** Lets a footer outside the form (a dialog or sheet footer) submit it. */
  id?: string
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
  className?: string
}

export function AddPatientForm({
  variant = "compact",
  id,
  onSubmit,
  className,
}: AddPatientFormProps) {
  const full = variant === "full"
  const p = (name: string) => `${id ?? "add-patient"}-${name}`

  return (
    <form
      id={id}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.(event)
      }}
      className={cn("@container/patient-form flex flex-col gap-6", className)}
    >
      <FieldSet>
        <FieldLegend>Patient identity</FieldLegend>
        <FieldGroup>
          <div className={cn("grid gap-4", full ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
            <Field>
              <FieldLabel htmlFor={p("first")}>Legal first name</FieldLabel>
              <Input id={p("first")} name="firstName" placeholder="Amara" required />
            </Field>
            {full && (
              <Field>
                <FieldLabel htmlFor={p("middle")}>Middle name</FieldLabel>
                <Input id={p("middle")} name="middleName" placeholder="Optional" />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor={p("last")}>Legal last name</FieldLabel>
              <Input id={p("last")} name="lastName" placeholder="Okafor" required />
            </Field>
          </div>

          <div className="grid gap-4 @lg/patient-form:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={p("dob")}>Date of birth</FieldLabel>
              <Input id={p("dob")} name="dob" type="date" required />
            </Field>
            <Field>
              <FieldLabel htmlFor={p("sex")}>Sex assigned at birth</FieldLabel>
              <FormSelect id={p("sex")} items={SEX_AT_BIRTH} />
            </Field>
          </div>

          {full && (
            <div className="grid gap-4 @lg/patient-form:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={p("preferred")}>Preferred name</FieldLabel>
                <Input id={p("preferred")} name="preferredName" placeholder="What they go by" />
              </Field>
              <Field>
                <FieldLabel htmlFor={p("ssn")}>SSN (last 4)</FieldLabel>
                <Input id={p("ssn")} name="ssnLast4" inputMode="numeric" maxLength={4} placeholder="••••" />
                <FieldDescription>Only the last four digits are stored.</FieldDescription>
              </Field>
            </div>
          )}
        </FieldGroup>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Contact</FieldLegend>
        <FieldGroup>
          <div className="grid gap-4 @lg/patient-form:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={p("phone")}>Mobile phone</FieldLabel>
              <Input id={p("phone")} name="phone" type="tel" placeholder="(555) 018-2245" required />
            </Field>
            <Field>
              <FieldLabel htmlFor={p("email")}>Email</FieldLabel>
              <Input id={p("email")} name="email" type="email" placeholder="name@example.com" />
            </Field>
          </div>

          {full && (
            <>
              <Field>
                <FieldLabel htmlFor={p("address")}>Street address</FieldLabel>
                <Input id={p("address")} name="address" placeholder="118 Warren Street" />
              </Field>
              <div className="grid gap-4 @2xl/patient-form:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor={p("city")}>City</FieldLabel>
                  <Input id={p("city")} name="city" placeholder="Boston" />
                </Field>
                <Field>
                  <FieldLabel htmlFor={p("state")}>State</FieldLabel>
                  <Input id={p("state")} name="state" placeholder="MA" />
                </Field>
                <Field>
                  <FieldLabel htmlFor={p("zip")}>ZIP</FieldLabel>
                  <Input id={p("zip")} name="zip" inputMode="numeric" placeholder="02119" />
                </Field>
              </div>
            </>
          )}

          <FieldSet>
            <FieldLegend className="text-sm">Preferred contact method</FieldLegend>
            <RadioGroup
              name="contactMethod"
              defaultValue="phone"
              className="grid-cols-1 @lg/patient-form:grid-cols-3"
            >
              {[
                { value: "phone", label: "Phone call" },
                { value: "sms", label: "Text message" },
                { value: "email", label: "Email" },
              ].map((option) => (
                <FieldLabel
                  key={option.value}
                  htmlFor={p(`contact-${option.value}`)}
                  className="items-center"
                >
                  <RadioGroupItem id={p(`contact-${option.value}`)} value={option.value} />
                  {option.label}
                </FieldLabel>
              ))}
            </RadioGroup>
          </FieldSet>
        </FieldGroup>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Care team</FieldLegend>
        <FieldGroup>
          <div className="grid gap-4 @lg/patient-form:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={p("provider")}>Primary provider</FieldLabel>
              <FormSelect id={p("provider")} items={PROVIDERS} />
            </Field>
            <Field>
              <FieldLabel htmlFor={p("department")}>Department</FieldLabel>
              <FormSelect id={p("department")} items={DEPARTMENTS} />
            </Field>
          </div>
          {full && (
            <Field>
              <FieldLabel htmlFor={p("referral")}>Referral source</FieldLabel>
              <FormSelect id={p("referral")} items={REFERRAL} />
            </Field>
          )}
        </FieldGroup>
      </FieldSet>

      {full && (
        <>
          <Separator />

          <FieldSet>
            <FieldLegend>Coverage</FieldLegend>
            <FieldGroup>
              <div className="grid gap-4 @lg/patient-form:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={p("payer")}>Payer</FieldLabel>
                  <FormSelect id={p("payer")} items={COVERAGE} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={p("member")}>Member ID</FieldLabel>
                  <Input id={p("member")} name="memberId" placeholder="XJ-449-20817" />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor={p("notes")}>Intake notes</FieldLabel>
                <Textarea
                  id={p("notes")}
                  name="notes"
                  rows={4}
                  placeholder="Reason for visit, transfer context, anything the care team should see first."
                />
              </Field>
              <FieldLabel htmlFor={p("consent")} className="items-start">
                <Checkbox id={p("consent")} name="consent" defaultChecked />
                <span className="flex flex-col gap-1">
                  <span>Consent on file</span>
                  <FieldDescription>
                    Treatment consent and privacy notice were signed at registration.
                  </FieldDescription>
                </span>
              </FieldLabel>
            </FieldGroup>
          </FieldSet>
        </>
      )}
    </form>
  )
}
