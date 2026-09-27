"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "@/design-system/ui/sonner"
import {
  IconAdd,
  IconEdit,
  IconLock,
  IconLockOpen,
  IconMail,
  IconMoreVertical,
  IconTrash,
} from "@/design-system/icons"

import {
  EMAIL,
  type Errors,
  VALIDATE,
  MultiSelectField,
  SelectField,
  TextField,
  digits,
  focusFirstError,
  formatPhone,
} from "@/components/form-kit"
import { StatusBadge } from "@/components/practice/directory"
import {
  CREDENTIALS,
  GENDERS,
  LANGUAGES,
  LICENSE_TYPES,
  PROVIDER_ROLES,
  type Provider,
  type ProviderInput,
  SPECIALTIES,
  TAXONOMY_CODES,
  TAX_ID_TYPES,
  TIME_ZONES,
  US_STATES,
  emptyProvider,
  fullName,
  inviteProviders,
  maskSsn,
  personAddress,
  providerName,
  providers,
  shortDate,
  useLocationLookup,
  usDate,
} from "@/components/practice/practice-data"
import { PracticeShell } from "@/components/practice/practice-shell"
import {
  DetailGrid,
  PhotoField,
  ProfileAvatar,
  RecordCard,
  RecordPage,
  RowRemoveButton,
  SignatureDialog,
} from "@/components/practice/record-page"
import { DeactivateDialog } from "@/components/practice/sheets"
import { Button } from "@/design-system/ui/button"
import { Checkbox } from "@/design-system/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/design-system/ui/empty"
import { Field, FieldLabel } from "@/design-system/ui/field"
import { Skeleton } from "@/design-system/ui/skeleton"
import { Textarea } from "@/design-system/ui/textarea"
import { Illustration } from "@/components/illustrations/illustration"

const USERS_HREF = "/screens/practice/users"
export const providerHref = (id: string) => `${USERS_HREF}/providers/${id}`

/* -------------------------------------------------------------------------- */
/*  Validation                                                                 */
/* -------------------------------------------------------------------------- */

/* An individual NPI is 10 digits whose last is a Luhn check digit over the
   "80840" prefix and the first nine. */
export function validNpi(npi: string) {
  if (!/^\d{10}$/.test(npi)) return false
  const all = `80840${npi}`.split("").map(Number)
  let sum = 0
  for (let i = 0; i < all.length; i++) {
    let d = all[all.length - 1 - i]
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

/* ###-##-#### while typing. */
function formatSsn(value: string) {
  const d = digits(value).slice(0, 9)
  if (d.length <= 3) return d
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
}

function validate(v: ProviderInput, others: Provider[]): Errors {
  const e: Errors = {}
  if (!VALIDATE) return e
  if (!v.credential) e.credential = "Select a credential."
  if (!v.firstName.trim()) e.firstName = "Enter a first name."
  if (!v.lastName.trim()) e.lastName = "Enter a last name."
  if (!v.dob) e.dob = "Enter the date of birth."
  if (!v.gender) e.gender = "Select a gender."
  if (!v.npi) e.npi = "Enter the NPI."
  else if (!validNpi(v.npi)) e.npi = "Enter a valid 10-digit NPI."
  else if (others.some((p) => p.npi === v.npi))
    e.npi = "Another provider has this NPI."
  if (v.ssn && digits(v.ssn).length !== 9) e.ssn = "Enter all 9 digits."
  if (!v.role) e.role = "Select a role."
  if (v.zip && !/^\d{5}$/.test(v.zip)) e.zip = "Enter a 5-digit ZIP code."
  for (const key of ["telephone", "phone", "fax"] as const) {
    if (v[key] && digits(v[key]).length !== 10) e[key] = "Enter 10 digits."
  }
  if (!v.email.trim()) e.email = "Enter their email."
  else if (!EMAIL.test(v.email.trim())) e.email = "Enter a valid email address."
  else if (
    others.some((p) => p.email.toLowerCase() === v.email.trim().toLowerCase())
  )
    e.email = "Another provider uses this email."
  /* A billing provider needs a tax ID on claims; a non-billing one doesn't. */
  if (!v.nonBilling && !v.federalTaxId.trim())
    e.federalTaxId = "Enter the federal tax ID."
  if (v.locationIds.length === 0)
    e.locationIds = "Select at least one location."
  v.licenses.forEach((l, i) => {
    const touched = l.type || l.number || l.expiry
    if (touched && !l.type) e[`licenses.${i}`] = "Select the license type."
    else if (touched && !l.number.trim())
      e[`licenseNumber.${i}`] = "Enter the number."
  })
  return e
}

/* -------------------------------------------------------------------------- */
/*  Form page                                                                  */
/* -------------------------------------------------------------------------- */

const GRID = "grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"

export function ProviderFormPage({ id }: { id?: string }) {
  const { items, ready } = providers.use()
  const provider = id ? items.find((p) => p.id === id) : undefined
  if (id && !provider) return <Missing ready={ready} />
  return (
    <PracticeShell active="users">
      {/* Keyed so the draft starts from the record once saved data loads. */}
      <ProviderForm key={provider?.id ?? "new"} provider={provider} />
    </PracticeShell>
  )
}

function ProviderForm({ provider }: { provider?: Provider }) {
  const router = useRouter()
  const { items } = providers.use()
  const loc = useLocationLookup()
  const [values, setValues] = React.useState<ProviderInput>(() =>
    provider ? structuredClone(provider) : emptyProvider()
  )
  const [attempted, setAttempted] = React.useState(false)
  const others = items.filter((p) => p.id !== provider?.id)
  const errors = attempted ? validate(values, others) : {}
  const backHref = provider ? providerHref(provider.id) : USERS_HREF

  const set =
    <K extends keyof ProviderInput>(key: K) =>
    (value: ProviderInput[K]) =>
      setValues((prev) => ({ ...prev, [key]: value }))
  const text =
    (key: keyof ProviderInput, format?: (v: string) => string) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      set(key)(
        (format ? format(event.target.value) : event.target.value) as never
      )

  function setLicense(
    i: number,
    changes: Partial<ProviderInput["licenses"][number]>
  ) {
    setValues((prev) => ({
      ...prev,
      licenses: prev.licenses.map((l, j) =>
        j === i ? { ...l, ...changes } : l
      ),
    }))
  }

  const locationOptions = loc.all.filter(
    (l) => l.status === "Active" || values.locationIds.includes(l.id)
  )
  const supervisors = items.filter(
    (p) =>
      p.role === "Supervising provider" &&
      p.status !== "Inactive" &&
      p.id !== provider?.id
  )

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttempted(true)
    const found = validate(values, others)
    if (focusFirstError(found, "provider")) {
      toast.error("Some details need attention.")
      return
    }
    const clean: ProviderInput = {
      ...values,
      firstName: values.firstName.trim(),
      middleName: values.middleName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      licenses: values.licenses.filter((l) => l.type || l.number),
    }
    if (provider) {
      providers.patch(provider.id, clean)
      toast.success("Provider updated", { description: fullName(clean) })
      router.push(providerHref(provider.id))
    } else {
      inviteProviders([clean])
      toast.success("Invite sent", {
        description: `${fullName(clean)} will get an email to set up their account.`,
      })
      router.push(USERS_HREF)
    }
  }

  return (
    <RecordPage
      title={provider ? `Edit ${providerName(provider)}` : "Add provider"}
      backHref={backHref}
      action={
        <Button type="submit" form="provider-page-form">
          Save &amp; close
        </Button>
      }
    >
      <form
        id="provider-page-form"
        noValidate
        onSubmit={submit}
        className="flex flex-col gap-4"
      >
        <RecordCard title="Provider basic details">
          <div className={GRID}>
            <SelectField
              id="provider-credential"
              label="Credential"
              required
              options={CREDENTIALS}
              value={values.credential}
              onChange={set("credential")}
              error={errors.credential}
            />
            <TextField
              id="provider-firstName"
              label="First name"
              required
              value={values.firstName}
              onChange={text("firstName")}
              error={errors.firstName}
            />
            <TextField
              id="provider-middleName"
              label="Middle name"
              value={values.middleName}
              onChange={text("middleName")}
            />
            <TextField
              id="provider-lastName"
              label="Last name"
              required
              value={values.lastName}
              onChange={text("lastName")}
              error={errors.lastName}
            />
            <TextField
              id="provider-dob"
              label="Date of birth"
              required
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={values.dob}
              onChange={text("dob")}
              error={errors.dob}
            />
            <SelectField
              id="provider-gender"
              label="Gender"
              required
              options={GENDERS}
              value={values.gender}
              onChange={set("gender")}
              error={errors.gender}
            />
            <TextField
              id="provider-npi"
              label="NPI"
              required
              inputMode="numeric"
              maxLength={10}
              value={values.npi}
              onChange={text("npi", digits)}
              error={errors.npi}
            />
            <SelectField
              id="provider-taxonomyCode"
              label="Taxonomy code"
              options={TAXONOMY_CODES}
              value={values.taxonomyCode}
              onChange={set("taxonomyCode")}
            />
            <MultiSelectField
              id="provider-languages"
              label="Languages spoken"
              options={LANGUAGES}
              value={values.languages}
              onChange={set("languages")}
            />
            <TextField
              id="provider-ssn"
              label="SSN"
              inputMode="numeric"
              autoComplete="off"
              placeholder="###-##-####"
              value={values.ssn}
              onChange={text("ssn", formatSsn)}
              error={errors.ssn}
            />
            <SelectField
              id="provider-role"
              label="Role"
              required
              options={PROVIDER_ROLES}
              value={values.role}
              onChange={set("role")}
              error={errors.role}
            />
            <PhotoField value={values.photo} onChange={set("photo")} />
          </div>
        </RecordCard>

        <RecordCard title="Provider contact details">
          <div className={GRID}>
            <TextField
              id="provider-address1"
              label="Address line 1"
              className="xl:col-span-2"
              autoComplete="off"
              value={values.address1}
              onChange={text("address1")}
            />
            <TextField
              id="provider-address2"
              label="Address line 2"
              className="xl:col-span-2"
              autoComplete="off"
              value={values.address2}
              onChange={text("address2")}
            />
            <TextField
              id="provider-zip"
              label="ZIP code"
              inputMode="numeric"
              maxLength={5}
              value={values.zip}
              onChange={text("zip", digits)}
              error={errors.zip}
            />
            <TextField
              id="provider-city"
              label="City"
              value={values.city}
              onChange={text("city")}
            />
            <TextField
              id="provider-telephone"
              label="Telephone number"
              type="tel"
              value={values.telephone}
              onChange={text("telephone", formatPhone)}
              error={errors.telephone}
            />
            <TextField
              id="provider-phone"
              label="Mobile number"
              type="tel"
              value={values.phone}
              onChange={text("phone", formatPhone)}
              error={errors.phone}
            />
            <TextField
              id="provider-fax"
              label="Fax number"
              type="tel"
              value={values.fax}
              onChange={text("fax", formatPhone)}
              error={errors.fax}
            />
            <TextField
              id="provider-email"
              label="Email"
              required
              type="email"
              autoComplete="off"
              value={values.email}
              onChange={text("email")}
              error={errors.email}
              disabled={provider?.status === "Active"}
            />
            <SelectField
              id="provider-timeZone"
              label="Time zone"
              options={TIME_ZONES}
              value={values.timeZone}
              onChange={set("timeZone")}
            />
            <SelectField
              id="provider-state"
              label="State"
              options={US_STATES}
              value={values.state}
              onChange={set("state")}
            />
          </div>
        </RecordCard>

        <RecordCard
          title="Other details"
          action={
            <Field orientation="horizontal" className="w-auto gap-2">
              <Checkbox
                id="provider-nonBilling"
                checked={values.nonBilling}
                onCheckedChange={(c) => set("nonBilling")(c === true)}
              />
              <FieldLabel htmlFor="provider-nonBilling" className="font-normal">
                Non billing
              </FieldLabel>
            </Field>
          }
        >
          <div className={GRID}>
            <TextField
              id="provider-federalTaxId"
              label="Federal tax ID number"
              required={!values.nonBilling}
              value={values.federalTaxId}
              onChange={text("federalTaxId")}
              error={errors.federalTaxId}
            />
            <SelectField
              id="provider-taxIdType"
              label="Tax ID type"
              options={TAX_ID_TYPES}
              value={values.taxIdType}
              onChange={set("taxIdType")}
            />
            <TextField
              id="provider-registrationDate"
              label="Registration date"
              type="date"
              value={values.registrationDate}
              onChange={text("registrationDate")}
            />
            <MultiSelectField
              id="provider-locationIds"
              label="Primary service locations"
              required
              options={locationOptions.map((l) => l.name)}
              value={values.locationIds.map(loc.name)}
              onChange={(names) =>
                set("locationIds")(
                  names.map((n) => loc.idFor(n)).filter((x): x is string => !!x)
                )
              }
              error={errors.locationIds}
            />
            <SelectField
              id="provider-specialty"
              label="Specialty"
              options={SPECIALTIES}
              value={values.specialty}
              onChange={set("specialty")}
            />
            <MultiSelectField
              id="provider-supervisorIds"
              label="Supervising providers"
              options={supervisors.map(providerName)}
              value={values.supervisorIds
                .map((sid) => items.find((p) => p.id === sid))
                .filter((p): p is Provider => !!p)
                .map(providerName)}
              onChange={(names) =>
                set("supervisorIds")(
                  names
                    .map(
                      (n) => supervisors.find((p) => providerName(p) === n)?.id
                    )
                    .filter((x): x is string => !!x)
                )
              }
            />
          </div>
        </RecordCard>

        <RecordCard title="Education and work experience">
          <Field>
            <FieldLabel htmlFor="provider-education">
              Education and work experience
            </FieldLabel>
            <Textarea
              id="provider-education"
              rows={2}
              value={values.education}
              onChange={(e) => set("education")(e.target.value)}
            />
          </Field>
        </RecordCard>

        <RecordCard
          title="Licensing and compliance"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-primary-tint"
              onClick={() =>
                set("licenses")([
                  ...values.licenses,
                  { type: "", state: "CA", number: "", expiry: "" },
                ])
              }
            >
              <IconAdd />
              Add more
            </Button>
          }
        >
          {values.licenses.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-4 text-sm text-muted-foreground">
              <Illustration name="no-licenses" className="size-28" />
              No licenses added
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {values.licenses.map((l, i) => (
                <div
                  key={i}
                  className="grid items-start gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]"
                >
                  <SelectField
                    id={`provider-licenses-${i}`}
                    label="License"
                    options={LICENSE_TYPES}
                    value={l.type}
                    onChange={(type) => setLicense(i, { type })}
                    error={errors[`licenses.${i}`]}
                  />
                  <SelectField
                    id={`provider-licenseState-${i}`}
                    label="State"
                    options={US_STATES}
                    value={l.state}
                    onChange={(state) => setLicense(i, { state })}
                  />
                  <TextField
                    id={`provider-licenseNumber-${i}`}
                    label="License number"
                    value={l.number}
                    onChange={(e) => setLicense(i, { number: e.target.value })}
                    error={errors[`licenseNumber.${i}`]}
                  />
                  <TextField
                    id={`provider-licenseExpiry-${i}`}
                    label="Expiry date"
                    type="date"
                    value={l.expiry}
                    onChange={(e) => setLicense(i, { expiry: e.target.value })}
                  />
                  <RowRemoveButton
                    label={`Remove license ${i + 1}`}
                    className="sm:col-span-2 lg:col-span-1"
                    labelClassName="max-lg:hidden"
                    onClick={() =>
                      set("licenses")(values.licenses.filter((_, j) => j !== i))
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </RecordCard>
      </form>
    </RecordPage>
  )
}

/* -------------------------------------------------------------------------- */
/*  Profile page                                                               */
/* -------------------------------------------------------------------------- */

export function ProviderProfile({ id }: { id: string }) {
  const { items, ready } = providers.use()
  const provider = items.find((p) => p.id === id)
  if (!provider) return <Missing ready={ready} />
  return (
    <PracticeShell active="users">
      <ProfileBody provider={provider} all={items} />
    </PracticeShell>
  )
}

function ProfileBody({
  provider: p,
  all,
}: {
  provider: Provider
  all: Provider[]
}) {
  const loc = useLocationLookup()
  const [signing, setSigning] = React.useState(false)
  const [deactivating, setDeactivating] = React.useState(false)
  const supervisors = p.supervisorIds
    .map((sid) => all.find((x) => x.id === sid))
    .filter((x): x is Provider => !!x)
    .map(providerName)
    .join(", ")

  return (
    <RecordPage
      title={providerName(p)}
      backHref={USERS_HREF}
      action={
        <div className="flex items-center gap-2">
          <Button
            nativeButton={false}
            render={<Link href={`${providerHref(p.id)}/edit`} />}
          >
            <IconEdit />
            Edit info
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="icon" aria-label="More actions">
                  <IconMoreVertical />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                {p.status === "Invited" && (
                  <DropdownMenuItem
                    onClick={() =>
                      toast.success("Invite resent", {
                        description: `A fresh link went to ${p.email}.`,
                      })
                    }
                  >
                    <IconMail />
                    Resend invite
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    if (p.status !== "Inactive") return setDeactivating(true)
                    providers.patch(p.id, {
                      status: p.lastLogin ? "Active" : "Invited",
                    })
                    toast.success(`${providerName(p)} is active again`)
                  }}
                >
                  {p.status === "Inactive" ? <IconLockOpen /> : <IconLock />}
                  {p.status === "Inactive" ? "Activate" : "Deactivate"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <RecordCard title="Provider basic details">
        <div className="flex flex-col gap-5 md:flex-row">
          <ProfileAvatar
            name={fullName(p)}
            photo={p.photo}
            onChange={(photo) => providers.patch(p.id, { photo })}
          />
          <div className="min-w-0 flex-1">
            <DetailGrid
              className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
              items={[
                { label: "ID", value: p.id },
                { label: "Credential", value: p.credential },
                { label: "First name", value: p.firstName },
                { label: "Middle name", value: p.middleName },
                { label: "Last name", value: p.lastName },
                { label: "Date of birth", value: usDate(p.dob) },
                { label: "Gender", value: p.gender },
                { label: "NPI", value: p.npi },
                { label: "Taxonomy code", value: p.taxonomyCode },
                { label: "SSN", value: maskSsn(p.ssn) },
                { label: "Languages spoken", value: p.languages.join(", ") },
                { label: "Status", value: <StatusBadge status={p.status} /> },
              ]}
            />
          </div>
        </div>
      </RecordCard>

      <RecordCard title="Provider contact details">
        <DetailGrid
          className="sm:grid-cols-2 lg:grid-cols-5"
          items={[
            { label: "Telephone number", value: p.telephone },
            { label: "Mobile number", value: p.phone },
            { label: "Fax number", value: p.fax },
            { label: "Email", value: p.email },
            { label: "Time zone", value: p.timeZone },
            { label: "Address", value: personAddress(p), wide: true },
          ]}
        />
      </RecordCard>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <RecordCard title="Other details">
          <DetailGrid
            className="sm:grid-cols-2 xl:grid-cols-4"
            items={[
              { label: "Federal tax ID number", value: p.federalTaxId },
              { label: "Tax ID type", value: p.taxIdType },
              { label: "Registration date", value: usDate(p.registrationDate) },
              {
                label: "Primary service locations",
                value: p.locationIds.map(loc.name).join(", "),
              },
              { label: "Specialty", value: p.specialty },
              {
                label: "Billing type",
                value: p.nonBilling ? "Non billing" : "Billing",
              },
              { label: "Supervising providers", value: supervisors },
              { label: "Role", value: p.role },
              { label: "Invited", value: shortDate(p.invitedAt) },
              { label: "Last login", value: shortDate(p.lastLogin) || "Never" },
            ]}
          />
        </RecordCard>

        <RecordCard
          title="Signature"
          action={
            p.signature ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Signature actions"
                    >
                      <IconMoreVertical />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => setSigning(true)}>
                      <IconEdit />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        providers.patch(p.id, { signature: "" })
                        toast.success("Signature removed")
                      }}
                    >
                      <IconTrash />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : undefined
          }
        >
          {p.signature ? (
            <div className="flex h-32 items-center justify-center rounded-md bg-primary-surface/40 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL */}
              <img
                src={p.signature}
                alt={`Signature of ${fullName(p)}`}
                className="max-h-full max-w-full"
              />
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setSigning(true)}
              className="h-auto w-full flex-col gap-1 rounded-md border-dashed bg-transparent py-3 font-normal text-primary-tint hover:bg-primary-surface/40 hover:text-primary-tint"
            >
              <Illustration name="signature-empty" className="size-24" />
              Add signature
            </Button>
          )}
        </RecordCard>
      </div>

      <RecordCard title="Qualifications and experience">
        <DetailGrid
          items={[
            {
              label: "Education and work experience",
              value: p.education,
              wide: true,
            },
          ]}
        />
      </RecordCard>

      <RecordCard title="Licensing and compliance">
        {p.licenses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-sm text-muted-foreground">
            <Illustration name="no-licenses" className="size-28" />
            No licenses on file
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {p.licenses.map((l, i) => (
              <DetailGrid
                key={i}
                className="sm:grid-cols-2 lg:grid-cols-4"
                items={[
                  { label: "License", value: l.type },
                  { label: "State", value: l.state },
                  { label: "License number", value: l.number },
                  { label: "Expiry date", value: usDate(l.expiry) },
                ]}
              />
            ))}
          </div>
        )}
      </RecordCard>

      <SignatureDialog
        open={signing}
        onOpenChange={setSigning}
        onSave={(signature) => {
          providers.patch(p.id, { signature })
          setSigning(false)
          toast.success("Signature saved")
        }}
      />
      <DeactivateDialog
        illustration="deactivate-provider"
        target={deactivating ? providerName(p) : null}
        message="They lose access to the portal and leave provider pickers. Their patients and history stay with the practice."
        onCancel={() => setDeactivating(false)}
        onConfirm={() => {
          providers.patch(p.id, { status: "Inactive" })
          toast.success(`${providerName(p)} is deactivated`)
          setDeactivating(false)
        }}
      />
    </RecordPage>
  )
}

/* Saved changes load after mount, so a record added this session is only
   known once they have: hold a skeleton until then, then say it's missing. */
function Missing({ ready }: { ready: boolean }) {
  return (
    <PracticeShell active="users">
      {!ready ? (
        <div className="flex flex-col gap-4 p-6">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia>
              <Illustration name="record-not-found" />
            </EmptyMedia>
            <EmptyTitle>Provider not found</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={USERS_HREF} />}
            >
              Back to users
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </PracticeShell>
  )
}
