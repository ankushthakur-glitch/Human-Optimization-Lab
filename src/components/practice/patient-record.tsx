"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "@/design-system/ui/sonner"
import {
  IconEdit,
  IconLock,
  IconLockOpen,
  IconMail,
  IconMoreVertical,
  IconUser,
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
  CONTACT_METHODS,
  GENDER_IDENTITIES,
  LANGUAGES,
  type Patient,
  type PatientInput,
  RELATIONSHIPS,
  SEXES,
  TIME_ZONES,
  US_STATES,
  ageFrom,
  emptyPatient,
  fullName,
  addPatients,
  patients,
  sendPatientInvites,
  personAddress,
  providerName,
  shortDate,
  useLocationLookup,
  useProviderLookup,
  usDate,
} from "@/components/practice/practice-data"
import { PatientsFrame, usePortal } from "@/components/practice/portal"
import {
  DetailGrid,
  PhotoField,
  ProfileAvatar,
  RecordCard,
  RecordPage,
} from "@/components/practice/record-page"
import { DeactivateDialog } from "@/components/practice/sheets"
import { Alert, AlertDescription, AlertTitle } from "@/design-system/ui/alert"
import { Button } from "@/design-system/ui/button"
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
import { Skeleton } from "@/design-system/ui/skeleton"

/* Onboarding takes demographics and contact details only: no medical data
   before the patient has consented. Records are pulled once they accept. */


const GRID = "grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"

/* The soft duplicate check from the onboarding spec: same name and date of
   birth, plus the same email or mobile. Flagged, never blocked. */
export function findDuplicate(v: PatientInput, list: Patient[]) {
  if (!VALIDATE) return undefined
  const same = (a: string, b: string) =>
    a.trim().toLowerCase() === b.trim().toLowerCase()
  return list.find(
    (p) =>
      same(p.firstName, v.firstName) &&
      same(p.lastName, v.lastName) &&
      p.dob === v.dob &&
      ((v.email && same(p.email, v.email)) ||
        (v.phone && digits(p.phone) === digits(v.phone)))
  )
}

function validate(v: PatientInput, others: Patient[]): Errors {
  const e: Errors = {}
  if (!VALIDATE) return e
  if (!v.firstName.trim()) e.firstName = "Enter a first name."
  if (!v.lastName.trim()) e.lastName = "Enter a last name."
  if (!v.dob) e.dob = "Enter the date of birth."
  else if (v.dob > new Date().toISOString().slice(0, 10))
    e.dob = "Date of birth can't be in the future."
  if (!v.sex) e.sex = "Select sex at birth."
  if (v.zip && !/^\d{5}$/.test(v.zip)) e.zip = "Enter a 5-digit ZIP code."
  for (const key of ["phone", "homePhone", "emergencyPhone"] as const) {
    if (v[key] && digits(v[key]).length !== 10) e[key] = "Enter 10 digits."
  }
  if (!v.email.trim()) e.email = "Enter their email."
  else if (!EMAIL.test(v.email.trim())) e.email = "Enter a valid email address."
  else if (
    others.some((p) => p.email.toLowerCase() === v.email.trim().toLowerCase())
  )
    e.email = "Another patient uses this email."
  /* SMS needs a mobile number to go to. */
  if (v.preferredContact === "Mobile (SMS)" && !v.phone)
    e.phone = "Enter a mobile number for SMS."
  if (!v.locationId) e.locationId = "Select a location."
  if (!v.providerId) e.providerId = "Select a primary provider."
  if (v.emergencyName.trim() && !v.emergencyPhone)
    e.emergencyPhone = "Enter their phone number."
  return e
}

/* -------------------------------------------------------------------------- */
/*  Onboarding form page                                                       */
/* -------------------------------------------------------------------------- */

export function PatientFormPage({ id }: { id?: string }) {
  const { items, ready } = patients.use()
  const patient = id ? items.find((p) => p.id === id) : undefined
  if (id && !patient) return <Missing ready={ready} />
  return (
    <PatientsFrame>
      <PatientForm key={patient?.id ?? "new"} patient={patient} />
    </PatientsFrame>
  )
}

function PatientForm({ patient }: { patient?: Patient }) {
  const router = useRouter()
  const { items } = patients.use()
  const loc = useLocationLookup()
  const prov = useProviderLookup()
  const {
    patientsHref: LIST_HREF,
    patientHref,
    selfProviderId,
  } = usePortal()
  /* In a provider's portal a new patient starts as theirs, at their first
     location. */
  const [values, setValues] = React.useState<PatientInput>(() => {
    if (patient) return structuredClone(patient)
    const self = prov.all.find((p) => p.id === selfProviderId)
    return self
      ? {
          ...emptyPatient(),
          providerId: self.id,
          locationId: self.locationIds[0] ?? "",
        }
      : emptyPatient()
  })
  const [attempted, setAttempted] = React.useState(false)
  const [confirmedDuplicate, setConfirmedDuplicate] = React.useState(false)
  const others = items.filter((p) => p.id !== patient?.id)
  const errors = attempted ? validate(values, others) : {}
  const duplicate =
    !patient && attempted ? findDuplicate(values, others) : undefined

  const set =
    <K extends keyof PatientInput>(key: K) =>
    (value: PatientInput[K]) => {
      setConfirmedDuplicate(false)
      setValues((prev) => ({ ...prev, [key]: value }))
    }
  const text =
    (key: keyof PatientInput, format?: (v: string) => string) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      set(key)(
        (format ? format(event.target.value) : event.target.value) as never
      )

  /* Only providers who work at the chosen location can be picked. */
  const providerOptions = prov.active.filter(
    (p) => !values.locationId || p.locationIds.includes(values.locationId)
  )

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttempted(true)
    const found = validate(values, others)
    if (focusFirstError(found, "patient")) {
      toast.error("Some details need attention.")
      return
    }
    if (!patient && findDuplicate(values, others) && !confirmedDuplicate) {
      setConfirmedDuplicate(true)
      toast.warning("Possible duplicate", {
        description:
          "Check the notice at the top, then save again to add anyway.",
      })
      return
    }
    const clean: PatientInput = {
      ...values,
      firstName: values.firstName.trim(),
      middleName: values.middleName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
    }
    if (patient) {
      patients.patch(patient.id, clean)
      toast.success("Patient updated", { description: fullName(clean) })
      router.push(patientHref(patient.id))
    } else {
      /* Saving never emails the patient: staff send the portal invite by
         hand from the profile or the list once the record is ready. */
      const [created] = addPatients([clean], "Manual")
      toast.success("Patient added", {
        description: `Send ${fullName(clean)} the portal invite when ready.`,
      })
      router.push(patientHref(created.id))
    }
  }

  return (
    <RecordPage
      title={patient ? `Edit ${fullName(patient)}` : "Add patient"}
      backHref={patient ? patientHref(patient.id) : LIST_HREF}
      action={
        <Button type="submit" form="patient-page-form">
          {patient ? "Save & close" : "Save"}
        </Button>
      }
    >
      {duplicate && (
        <Alert className="border-warning/40 bg-warning-surface text-warning">
          <AlertTitle>Possible duplicate</AlertTitle>
          <AlertDescription>
            {fullName(duplicate)} ({duplicate.id}), born {usDate(duplicate.dob)}
            , already exists. Save again to add this patient anyway.
          </AlertDescription>
        </Alert>
      )}
      <form
        id="patient-page-form"
        noValidate
        onSubmit={submit}
        className="flex flex-col gap-4"
      >
        <RecordCard title="Patient basic details">
          <div className={GRID}>
            <TextField
              id="patient-firstName"
              label="First name"
              required
              value={values.firstName}
              onChange={text("firstName")}
              error={errors.firstName}
            />
            <TextField
              id="patient-middleName"
              label="Middle name"
              value={values.middleName}
              onChange={text("middleName")}
            />
            <TextField
              id="patient-lastName"
              label="Last name"
              required
              value={values.lastName}
              onChange={text("lastName")}
              error={errors.lastName}
            />
            <TextField
              id="patient-preferredName"
              label="Preferred name"
              value={values.preferredName}
              onChange={text("preferredName")}
            />
            <TextField
              id="patient-dob"
              label="Date of birth"
              required
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={values.dob}
              onChange={text("dob")}
              error={errors.dob}
            />
            <SelectField
              id="patient-sex"
              label="Sex at birth"
              required
              options={SEXES}
              value={values.sex}
              onChange={set("sex")}
              error={errors.sex}
            />
            <SelectField
              id="patient-genderIdentity"
              label="Gender identity"
              options={GENDER_IDENTITIES}
              value={values.genderIdentity}
              onChange={set("genderIdentity")}
            />
            <MultiSelectField
              id="patient-languages"
              label="Languages spoken"
              options={LANGUAGES}
              value={values.languages}
              onChange={set("languages")}
              className="xl:col-span-2"
            />
            <div className="xl:col-span-2">
              <PhotoField value={values.photo} onChange={set("photo")} />
            </div>
          </div>
        </RecordCard>

        <RecordCard title="Patient contact details">
          <div className={GRID}>
            <TextField
              id="patient-address1"
              label="Address line 1"
              className="xl:col-span-2"
              autoComplete="off"
              value={values.address1}
              onChange={text("address1")}
            />
            <TextField
              id="patient-address2"
              label="Address line 2"
              className="xl:col-span-2"
              autoComplete="off"
              value={values.address2}
              onChange={text("address2")}
            />
            <TextField
              id="patient-zip"
              label="ZIP code"
              inputMode="numeric"
              maxLength={5}
              value={values.zip}
              onChange={text("zip", digits)}
              error={errors.zip}
            />
            <TextField
              id="patient-city"
              label="City"
              value={values.city}
              onChange={text("city")}
            />
            <SelectField
              id="patient-state"
              label="State"
              options={US_STATES}
              value={values.state}
              onChange={set("state")}
            />
            <TextField
              id="patient-phone"
              label="Mobile number"
              type="tel"
              value={values.phone}
              onChange={text("phone", formatPhone)}
              error={errors.phone}
            />
            <TextField
              id="patient-homePhone"
              label="Home phone"
              type="tel"
              value={values.homePhone}
              onChange={text("homePhone", formatPhone)}
              error={errors.homePhone}
            />
            <TextField
              id="patient-email"
              label="Email"
              required
              type="email"
              autoComplete="off"
              value={values.email}
              onChange={text("email")}
              error={errors.email}
              disabled={patient?.status === "Active"}
            />
            <SelectField
              id="patient-preferredContact"
              label="Preferred contact"
              options={CONTACT_METHODS}
              value={values.preferredContact}
              onChange={set("preferredContact")}
            />
            <SelectField
              id="patient-timeZone"
              label="Time zone"
              options={TIME_ZONES}
              value={values.timeZone}
              onChange={set("timeZone")}
            />
          </div>
        </RecordCard>

        <RecordCard title="Care team">
          <div className={GRID}>
            <SelectField
              id="patient-locationId"
              label="Location"
              required
              className="xl:col-span-2"
              options={loc.active.map((l) => l.name)}
              value={loc.name(values.locationId)}
              onChange={(name) => {
                const id = loc.idFor(name) ?? ""
                setValues((prev) => {
                  const keep = prov.all
                    .find((p) => p.id === prev.providerId)
                    ?.locationIds.includes(id)
                  return {
                    ...prev,
                    locationId: id,
                    providerId: keep ? prev.providerId : "",
                  }
                })
              }}
              error={errors.locationId}
            />
            <SelectField
              id="patient-providerId"
              label="Primary provider"
              required
              className="xl:col-span-2"
              options={providerOptions.map(providerName)}
              value={prov.name(values.providerId)}
              onChange={(name) =>
                set("providerId")(
                  providerOptions.find((p) => providerName(p) === name)?.id ??
                    ""
                )
              }
              error={errors.providerId}
            />
            <TextField
              id="patient-registrationDate"
              label="Registration date"
              type="date"
              className="xl:col-span-2"
              value={values.registrationDate}
              onChange={text("registrationDate")}
            />
          </div>
        </RecordCard>

        <RecordCard title="Emergency contact">
          <div className={GRID}>
            <TextField
              id="patient-emergencyName"
              label="Full name"
              className="xl:col-span-2"
              value={values.emergencyName}
              onChange={text("emergencyName")}
            />
            <SelectField
              id="patient-emergencyRelationship"
              label="Relationship"
              className="xl:col-span-2"
              options={RELATIONSHIPS}
              value={values.emergencyRelationship}
              onChange={set("emergencyRelationship")}
            />
            <TextField
              id="patient-emergencyPhone"
              label="Phone number"
              type="tel"
              className="xl:col-span-2"
              value={values.emergencyPhone}
              onChange={text("emergencyPhone", formatPhone)}
              error={errors.emergencyPhone}
            />
          </div>
        </RecordCard>
      </form>
    </RecordPage>
  )
}

/* -------------------------------------------------------------------------- */
/*  Profile page                                                               */
/* -------------------------------------------------------------------------- */

export function PatientProfile({ id }: { id: string }) {
  const { items, ready } = patients.use()
  const patient = items.find((p) => p.id === id)
  if (!patient) return <Missing ready={ready} />
  return (
    <PatientsFrame>
      <ProfileBody patient={patient} />
    </PatientsFrame>
  )
}

function ProfileBody({ patient: p }: { patient: Patient }) {
  const { patientsHref: LIST_HREF, patientHref } = usePortal()
  const loc = useLocationLookup()
  const prov = useProviderLookup()
  const [deactivating, setDeactivating] = React.useState(false)

  return (
    <RecordPage
      title={fullName(p)}
      backHref={LIST_HREF}
      action={
        <div className="flex items-center gap-2">
          {p.status === "Not invited" && (
            <Button
              variant="outline"
              onClick={() => {
                sendPatientInvites([p.id])
                toast.success("Invite sent", {
                  description: `${fullName(p)} will get an email to join the patient portal.`,
                })
              }}
            >
              <IconMail />
              Send invite
            </Button>
          )}
          <Button
            nativeButton={false}
            render={<Link href={`${patientHref(p.id)}/edit`} />}
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
                    patients.patch(p.id, { status: "Active" })
                    toast.success(`${fullName(p)} is active again`)
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
      <RecordCard title="Patient basic details">
        <div className="flex flex-col gap-5 md:flex-row">
          <ProfileAvatar
            name={fullName(p)}
            photo={p.photo}
            onChange={(photo) => patients.patch(p.id, { photo })}
          />
          <div className="min-w-0 flex-1">
            <DetailGrid
              className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
              items={[
                { label: "ID", value: p.id },
                { label: "First name", value: p.firstName },
                { label: "Middle name", value: p.middleName },
                { label: "Last name", value: p.lastName },
                { label: "Preferred name", value: p.preferredName },
                {
                  label: "Date of birth",
                  value: p.dob && `${usDate(p.dob)} (${ageFrom(p.dob)} yrs)`,
                },
                { label: "Sex at birth", value: p.sex },
                { label: "Gender identity", value: p.genderIdentity },
                { label: "Languages spoken", value: p.languages.join(", ") },
                { label: "Status", value: <StatusBadge status={p.status} /> },
              ]}
            />
          </div>
        </div>
      </RecordCard>

      <RecordCard title="Patient contact details">
        <DetailGrid
          className="sm:grid-cols-2 lg:grid-cols-5"
          items={[
            { label: "Mobile number", value: p.phone },
            { label: "Home phone", value: p.homePhone },
            { label: "Email", value: p.email },
            { label: "Preferred contact", value: p.preferredContact },
            { label: "Time zone", value: p.timeZone },
            { label: "Address", value: personAddress(p), wide: true },
          ]}
        />
      </RecordCard>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <RecordCard title="Care team">
          <DetailGrid
            className="sm:grid-cols-3"
            items={[
              { label: "Location", value: loc.name(p.locationId) },
              { label: "Primary provider", value: prov.name(p.providerId) },
              { label: "Registration date", value: usDate(p.registrationDate) },
            ]}
          />
        </RecordCard>

        {/* Where the provider page keeps a signature, the patient page keeps
            the invitation: whether they have joined yet is what staff ask. */}
        <RecordCard title="Enrollment">
          <DetailGrid
            className="grid-cols-2"
            items={[
              {
                label: "Invite",
                value:
                  p.status === "Not invited"
                    ? "Not sent"
                    : p.status === "Invited"
                      ? "Pending"
                      : p.status === "Active"
                        ? "Accepted"
                        : "Inactive",
              },
              { label: "Invited", value: shortDate(p.invitedAt) },
              { label: "Added by", value: p.source },
            ]}
          />
        </RecordCard>
      </div>

      <RecordCard title="Emergency contact">
        <DetailGrid
          className="sm:grid-cols-3"
          items={[
            { label: "Full name", value: p.emergencyName },
            { label: "Relationship", value: p.emergencyRelationship },
            { label: "Phone number", value: p.emergencyPhone },
          ]}
        />
      </RecordCard>

      <DeactivateDialog
        target={deactivating ? fullName(p) : null}
        message="They can no longer sign in to the patient app. Their record stays with the practice."
        onCancel={() => setDeactivating(false)}
        onConfirm={() => {
          patients.patch(p.id, { status: "Inactive" })
          toast.success(`${fullName(p)} is deactivated`)
          setDeactivating(false)
        }}
      />
    </RecordPage>
  )
}

function Missing({ ready }: { ready: boolean }) {
  const { patientsHref: LIST_HREF } = usePortal()
  return (
    <PatientsFrame>
      {!ready ? (
        <div className="flex flex-col gap-4 p-6">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconUser />
            </EmptyMedia>
            <EmptyTitle>Patient not found</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={LIST_HREF} />}
            >
              Back to patients
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </PatientsFrame>
  )
}
