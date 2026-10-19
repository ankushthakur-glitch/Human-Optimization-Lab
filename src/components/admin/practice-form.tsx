"use client"

import * as React from "react"

import { Button } from "@/design-system/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/design-system/ui/sheet"
import {
  type Practice,
  type PracticeInput,
  type PrimaryContact,
  REGIONS,
  formatPhone,
  referralUrlFor,
  tenantFromName,
} from "@/components/admin/practices-store"
import {
  EMAIL,
  type Errors,
  VALIDATE,
  FormSection,
  SelectField,
  SheetForm,
  TextField,
  digits,
} from "@/components/form-kit"

/* -------------------------------------------------------------------------- */
/*  Values and validation                                                      */
/* -------------------------------------------------------------------------- */

const EMPTY_CONTACT: PrimaryContact = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
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
  twilioNumber: "",
  primaryContact: EMPTY_CONTACT,
  region: "",
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
    twilioNumber: p.twilioNumber ?? "",
    primaryContact: p.primaryContact,
    region: p.region,
  }
}

function validate(v: PracticeInput): Errors {
  const errors: Errors = {}
  if (!VALIDATE) return errors
  if (!v.name.trim()) errors.name = "Enter the practice name."
  if (!v.npi) errors.npi = "Enter the group NPI."
  else if (!/^\d{10}$/.test(v.npi))
    errors.npi = "A group NPI is exactly 10 digits."
  if (!v.region) errors.region = "Select a region."
  const c = v.primaryContact
  if (!c.firstName.trim())
    errors["primaryContact.firstName"] = "Enter a first name."
  if (!c.lastName.trim())
    errors["primaryContact.lastName"] = "Enter a last name."
  if (!c.email.trim()) errors["primaryContact.email"] = "Enter an email."
  else if (!EMAIL.test(c.email.trim()))
    errors["primaryContact.email"] = "Enter a valid email address."
  if (!c.phone) errors["primaryContact.phone"] = "Enter a phone number."
  else if (digits(c.phone).length !== 10)
    errors["primaryContact.phone"] = "Enter a 10-digit phone number."
  if (!v.locationName.trim()) errors.locationName = "Enter a location name."
  if (!v.contactNumber) errors.contactNumber = "Enter a contact number."
  else if (digits(v.contactNumber).length !== 10)
    errors.contactNumber = "Enter a 10-digit phone number."
  if (v.email && !EMAIL.test(v.email))
    errors.email = "Enter a valid email address."
  if (v.fax && digits(v.fax).length !== 10)
    errors.fax = "Enter a 10-digit fax number."
  if (v.twilioNumber && digits(v.twilioNumber).length !== 10)
    errors.twilioNumber = "Enter a 10-digit phone number."
  if (v.website && !/^https?:\/\/[^\s.]+\.[^\s]+$/.test(v.website))
    errors.website = "Start with https:// and include the domain."
  return errors
}

/* -------------------------------------------------------------------------- */
/*  Sheet                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Add or edit a practice. It opens from the right, as in the reference, so the
 * list stays in view behind it. Passing `practice` switches it to edit mode.
 * The tenant name and referral URL are not shown: they are derived from the
 * name on create and kept fixed on edit, since they key the practice's data
 * and the links already sent to patients.
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

  const setContact =
    (key: keyof PrimaryContact, format?: (value: string) => string) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = format ? format(event.target.value) : event.target.value
      setValues((prev) => ({
        ...prev,
        primaryContact: { ...prev.primaryContact, [key]: value },
      }))
    }

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
      primaryContact: {
        ...values.primaryContact,
        firstName: values.primaryContact.firstName.trim(),
        lastName: values.primaryContact.lastName.trim(),
        email: values.primaryContact.email.trim(),
      },
      tenant,
      referralUrl,
    })
  }

  return (
    <>
      <SheetHeader className="shrink-0 border-b">
        <SheetTitle>{editing ? "Edit practice" : "Add practice"}</SheetTitle>
        <SheetDescription className="sr-only">
          Practice details, region, primary contact, location and messaging.
        </SheetDescription>
      </SheetHeader>

      <SheetForm id="practice-form" onSubmit={handleSubmit}>
        <FormSection title="Practice">
          <div className="grid gap-4 sm:grid-cols-2">
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
            <TextField
              id="practice-npi"
              label="Group NPI number"
              required
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit NPI"
              value={values.npi}
              onChange={(event) =>
                set("npi", event.target.value.replace(/\D/g, ""))
              }
              error={errors.npi}
            />
            <SelectField
              id="practice-region"
              label="Region"
              required
              placeholder="Select region"
              options={REGIONS}
              value={values.region}
              onChange={(value) => set("region", value)}
              error={errors.region}
            />
          </div>
        </FormSection>

        <FormSection title="Primary contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="practice-primaryContact-firstName"
              label="First name"
              required
              placeholder="Enter first name"
              autoComplete="off"
              value={values.primaryContact.firstName}
              onChange={setContact("firstName")}
              error={errors["primaryContact.firstName"]}
            />
            <TextField
              id="practice-primaryContact-lastName"
              label="Last name"
              required
              placeholder="Enter last name"
              autoComplete="off"
              value={values.primaryContact.lastName}
              onChange={setContact("lastName")}
              error={errors["primaryContact.lastName"]}
            />
            <TextField
              id="practice-primaryContact-email"
              label="Email"
              required
              type="email"
              autoComplete="off"
              placeholder="name@practice.com"
              value={values.primaryContact.email}
              onChange={setContact("email")}
              error={errors["primaryContact.email"]}
            />
            <TextField
              id="practice-primaryContact-phone"
              label="Phone"
              required
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="(123)-456-7890"
              value={values.primaryContact.phone}
              onChange={setContact("phone", formatPhone)}
              error={errors["primaryContact.phone"]}
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
        </FormSection>

        <FormSection title="Messaging">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="practice-twilioNumber"
              label="Twilio number"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="(123)-456-7890"
              value={values.twilioNumber}
              onChange={(event) =>
                set("twilioNumber", formatPhone(event.target.value))
              }
              error={errors.twilioNumber}
            />
          </div>
        </FormSection>
      </SheetForm>

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
