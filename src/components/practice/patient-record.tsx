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
  IconUserMinus,
} from "@/design-system/icons"

import {
  EMAIL,
  type Errors,
  VALIDATE,
  DateField,
  MultiSelectField,
  SelectField,
  TextField,
  digits,
  focusFirstError,
  formatPhone,
} from "@/components/form-kit"
import { StatusBadge } from "@/components/practice/directory"
import { useEmployerLookup } from "@/components/settings/settings-data"
import { PatientChart } from "@/components/provider/patient-chart"
import {
  CONTACT_METHODS,
  type EmergencyContact,
  ETHNICITIES,
  GENDER_IDENTITIES,
  LANGUAGES,
  MARITAL_STATUSES,
  type Patient,
  type PatientInput,
  PRONOUNS,
  RACES,
  RECORD_STATUSES,
  REACTIVATABLE,
  RELATIONSHIPS,
  SEXES,
  TIME_ZONES,
  US_STATES,
  ageFrom,
  emptyEmergencyContact,
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
  RowRemoveButton,
} from "@/components/practice/record-page"
import { DeactivateDialog } from "@/components/practice/sheets"
import { checkDuplicate } from "@/components/practice/patient-duplicates"
import {
  DuplicateDialog,
  type FoundDuplicate,
  PatientPrecheck,
  precheckKey,
  clearDraft,
  peekDraft,
  ReactivateDialog,
} from "@/components/practice/duplicates"
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
import { Skeleton } from "@/design-system/ui/skeleton"
import { Illustration } from "@/components/illustrations/illustration"

/* Onboarding takes demographics and contact details only: no medical data
   before the patient has consented. Records are pulled once they accept. */

const GRID = "grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
const GRID5 =
  "grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"

/* 123-45-6789, typed or pasted. */
function formatSsn(value: string) {
  const d = digits(value).slice(0, 9)
  return [d.slice(0, 3), d.slice(3, 5), d.slice(5)].filter(Boolean).join("-")
}

const maskSsn = (ssn: string) => (ssn ? `***-**-${ssn.slice(-4)}` : "")

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
  for (const key of ["phone", "homePhone"] as const) {
    if (v[key] && digits(v[key]).length !== 10) e[key] = "Enter 10 digits."
  }
  if (v.noEmail) {
    /* No email to check. */
  } else if (!v.email.trim()) e.email = "Enter their email."
  else if (!EMAIL.test(v.email.trim())) e.email = "Enter a valid email address."
  else if (
    others.some((p) => p.email.toLowerCase() === v.email.trim().toLowerCase())
  )
    e.email = "Another patient uses this email."
  /* Texts need a mobile number to go to. */
  if (v.preferredContacts.includes("Mobile") && !v.phone)
    e.phone = "Enter a mobile number for texts."
  if (v.ssn && digits(v.ssn).length !== 9) e.ssn = "Enter 9 digits."
  if (!v.locationId) e.locationId = "Select a location."
  if (!v.providerId) e.providerId = "Select a primary provider."
  v.emergencyContacts.forEach((c, i) => {
    if (c.name.trim() && !c.phone)
      e[`emergency-${i}-phone`] = "Enter their phone number."
  })
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
  const emp = useEmployerLookup()
  const { patientsHref: LIST_HREF, patientHref, selfProviderId } = usePortal()
  /* In a provider's portal a new patient starts as theirs, at their first
     location. */
  /* A new patient arrives with the details the Add patient popup already
     checked; opened directly (a quick action), the popup shows first. */
  const [cleared, setCleared] = React.useState(() =>
    patient ? null : peekDraft()
  )
  React.useEffect(clearDraft, [])
  const [values, setValues] = React.useState<PatientInput>(() => {
    if (patient) return structuredClone(patient)
    const self = prov.all.find((p) => p.id === selfProviderId)
    const base = self
      ? {
          ...emptyPatient(),
          providerId: self.id,
          locationId: self.locationIds[0] ?? "",
        }
      : emptyPatient()
    return cleared ? { ...base, ...cleared } : base
  })
  const [recordStatus, setRecordStatus] = React.useState(
    patient?.status === "Inactive" ? "Inactive" : "Active"
  )
  const [attempted, setAttempted] = React.useState(false)
  /* What the duplicate check found for a new patient; its dialog decides
     whether a record gets created at all. */
  const [found, setFound] = React.useState<FoundDuplicate | null>(null)
  const others = items.filter((p) => p.id !== patient?.id)
  const errors = attempted ? validate(values, others) : {}

  const set =
    <K extends keyof PatientInput>(key: K) =>
    (value: PatientInput[K]) => {
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
    if (focusFirstError(validate(values, others), "patient")) {
      toast.error("Some details need attention.")
      return
    }
    /* Every new record is checked against the practice's patients before
       it is created or invited; again here only if the checked details
       were changed in the form. */
    if (
      !patient &&
      values.firstName.trim() &&
      values.dob &&
      (!cleared || precheckKey(cleared) !== precheckKey(values))
    ) {
      const check = checkDuplicate(values, others)
      if (check.kind !== "none") {
        setFound(check)
        return
      }
    }
    save()
  }

  function save() {
    setFound(null)
    const clean: PatientInput = {
      ...values,
      firstName: values.firstName.trim(),
      middleName: values.middleName.trim(),
      lastName: values.lastName.trim(),
      email: values.noEmail ? "" : values.email.trim(),
      portalAccess: !values.noEmail,
      /* Rows left blank are dropped rather than saved empty. */
      emergencyContacts: values.emergencyContacts.filter(
        (c) => c.name.trim() || c.phone || c.email.trim() || c.relationship
      ),
    }
    if (patient) {
      const status: Patient["status"] =
        recordStatus === "Inactive"
          ? "Inactive"
          : patient.status === "Inactive"
            ? "Active"
            : patient.status
      patients.patch(patient.id, {
        ...clean,
        status,
        ...(status === "Inactive" &&
          patient.status !== "Inactive" && { inactiveReason: "Deactivated" }),
      })
      toast.success("Patient updated", { description: fullName(clean) })
      router.push(patientHref(patient.id))
    } else {
      /* Adding a patient invites them at once (addPatients). */
      const [created] = addPatients([clean], "Manual")
      if (recordStatus === "Inactive")
        patients.patch(created.id, {
          status: "Inactive",
          inactiveReason: "Deactivated",
        })
      toast.success("Patient added", {
        description:
          clean.portalAccess && recordStatus === "Active"
            ? `${fullName(clean)} will get an email to join the patient portal.`
            : fullName(clean),
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
      {!patient && (
        <PatientPrecheck
          open={!cleared}
          onCancel={() => router.push(LIST_HREF)}
          onClear={(next) => {
            setCleared(next)
            setValues((prev) => ({ ...prev, ...next }))
          }}
        />
      )}
      <DuplicateDialog
        found={found}
        incoming={values}
        onClose={() => setFound(null)}
        onCreate={save}
      />
      <form
        id="patient-page-form"
        noValidate
        onSubmit={submit}
        className="flex flex-col gap-4"
      >
        <RecordCard title="Patient basic details">
          <div className="flex flex-col gap-5">
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
              <DateField
                id="patient-dob"
                label="Date of birth"
                required
                max={new Date().toISOString().slice(0, 10)}
                value={values.dob}
                onChange={set("dob")}
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
            </div>
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[3fr_3fr_2fr_2fr_2fr]">
              <TextField
                id="patient-address1"
                label="Address line 1"
                autoComplete="off"
                value={values.address1}
                onChange={text("address1")}
              />
              <TextField
                id="patient-address2"
                label="Address line 2"
                autoComplete="off"
                value={values.address2}
                onChange={text("address2")}
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
                id="patient-zip"
                label="ZIP code"
                inputMode="numeric"
                maxLength={5}
                value={values.zip}
                onChange={text("zip", digits)}
                error={errors.zip}
              />
            </div>
            <div className={GRID5}>
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
                label="Home phone number"
                type="tel"
                value={values.homePhone}
                onChange={text("homePhone", formatPhone)}
                error={errors.homePhone}
              />
              <div className="flex flex-col gap-2">
                <TextField
                  id="patient-email"
                  label="Email"
                  required={!values.noEmail}
                  type="email"
                  autoComplete="off"
                  value={values.email}
                  onChange={text("email")}
                  error={errors.email}
                  disabled={values.noEmail || patient?.status === "Active"}
                />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={values.noEmail}
                    disabled={patient?.status === "Active"}
                    onCheckedChange={(checked) =>
                      setValues((prev) => ({
                        ...prev,
                        noEmail: checked,
                        email: checked ? "" : prev.email,
                        preferredContacts: checked
                          ? prev.preferredContacts.filter((c) => c !== "Email")
                          : prev.preferredContacts,
                      }))
                    }
                  />
                  Patient doesn&apos;t have an email
                </label>
              </div>
              <SelectField
                id="patient-timeZone"
                label="Time zone"
                options={TIME_ZONES}
                value={values.timeZone}
                onChange={set("timeZone")}
              />
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">
                  Preferred communication
                </legend>
                <div className="flex h-9 flex-wrap items-center gap-x-4 gap-y-2">
                  {CONTACT_METHODS.map((method) => (
                    <label
                      key={method}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={values.preferredContacts.includes(method)}
                        disabled={method === "Email" && values.noEmail}
                        onCheckedChange={(checked) =>
                          set("preferredContacts")(
                            checked
                              ? [...values.preferredContacts, method]
                              : values.preferredContacts.filter(
                                  (c) => c !== method
                                )
                          )
                        }
                      />
                      {method}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        </RecordCard>

        <RecordCard title="Additional details">
          <div className={GRID5}>
            <MultiSelectField
              id="patient-languages"
              label="Language"
              options={LANGUAGES}
              value={values.languages}
              onChange={set("languages")}
            />
            <SelectField
              id="patient-race"
              label="Race"
              options={RACES}
              value={values.race}
              onChange={set("race")}
            />
            <SelectField
              id="patient-ethnicity"
              label="Ethnicity"
              options={ETHNICITIES}
              value={values.ethnicity}
              onChange={set("ethnicity")}
            />
            <SelectField
              id="patient-genderIdentity"
              label="Gender"
              options={GENDER_IDENTITIES}
              value={values.genderIdentity}
              onChange={set("genderIdentity")}
            />
            <SelectField
              id="patient-pronoun"
              label="Pronoun"
              options={PRONOUNS}
              value={values.pronoun}
              onChange={set("pronoun")}
            />
            <SelectField
              id="patient-status"
              label="Status"
              required
              options={RECORD_STATUSES}
              value={recordStatus}
              onChange={(next) => setRecordStatus(next || "Active")}
            />
            <SelectField
              id="patient-maritalStatus"
              label="Marital status"
              options={MARITAL_STATUSES}
              value={values.maritalStatus}
              onChange={set("maritalStatus")}
            />
            <TextField
              id="patient-ssn"
              label="SSN"
              inputMode="numeric"
              autoComplete="off"
              value={values.ssn}
              onChange={text("ssn", formatSsn)}
              error={errors.ssn}
            />
            <PhotoField value={values.photo} onChange={set("photo")} />
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
            <SelectField
              id="patient-employerId"
              label="Employer"
              className="xl:col-span-2"
              placeholder="None"
              options={emp.active.map((e) => e.name)}
              value={emp.name(values.employerId)}
              onChange={(name) => set("employerId")(emp.idFor(name) ?? "")}
            />
          </div>
        </RecordCard>

        <RecordCard
          title="Emergency contact details"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set("emergencyContacts")([
                  ...values.emergencyContacts,
                  emptyEmergencyContact(),
                ])
              }
            >
              <IconAdd />
              {values.emergencyContacts.length ? "Add more" : "Add"}
            </Button>
          }
        >
          {values.emergencyContacts.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-4 text-sm text-muted-foreground">
              <Illustration name="no-emergency-contact" className="size-28" />
              No emergency contact added
            </div>
          )}
          {values.emergencyContacts.length > 0 && (
            <div className="flex flex-col gap-5">
              {values.emergencyContacts.map((contact, i) => {
                const change = (patch: Partial<EmergencyContact>) =>
                  set("emergencyContacts")(
                    values.emergencyContacts.map((c, j) =>
                      j === i ? { ...c, ...patch } : c
                    )
                  )
                return (
                  <div
                    key={i}
                    className="grid items-start gap-x-4 gap-y-5 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
                  >
                    <SelectField
                      id={`patient-emergency-${i}-relationship`}
                      label="Relationship with patient"
                      options={RELATIONSHIPS}
                      value={contact.relationship}
                      onChange={(relationship) => change({ relationship })}
                    />
                    <TextField
                      id={`patient-emergency-${i}-name`}
                      label="Emergency contact name"
                      value={contact.name}
                      onChange={(e) => change({ name: e.target.value })}
                    />
                    <TextField
                      id={`patient-emergency-${i}-phone`}
                      label="Phone number"
                      type="tel"
                      value={contact.phone}
                      onChange={(e) =>
                        change({ phone: formatPhone(e.target.value) })
                      }
                      error={errors[`emergency-${i}-phone`]}
                    />
                    <TextField
                      id={`patient-emergency-${i}-email`}
                      label="Email"
                      type="email"
                      autoComplete="off"
                      value={contact.email}
                      onChange={(e) => change({ email: e.target.value })}
                    />
                    <RowRemoveButton
                      label="Remove emergency contact"
                      className="sm:col-span-2 xl:col-span-1"
                      labelClassName="max-xl:hidden"
                      onClick={() =>
                        set("emergencyContacts")(
                          values.emergencyContacts.filter((_, j) => j !== i)
                        )
                      }
                    />
                  </div>
                )
              })}
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

/* The clinic manager and other non-clinical users get the profile only:
   patient details, never medical details (24 Sep call). A provider gets the
   patient chart, with this profile as one of its sections. */
function ProfileBody({ patient: p }: { patient: Patient }) {
  const { patientsHref: LIST_HREF, key } = usePortal()
  if (key === "provider") return <PatientChart patient={p} />
  return (
    <RecordPage
      title={fullName(p)}
      backHref={LIST_HREF}
      action={<PatientActions patient={p} />}
    >
      <PatientDetails patient={p} />
    </RecordPage>
  )
}

/** Send invite, Edit info and the overflow menu, with their dialogs. */
export function PatientActions({ patient: p }: { patient: Patient }) {
  const { patientHref } = usePortal()
  const [deactivating, setDeactivating] = React.useState(false)
  const [reactivating, setReactivating] = React.useState(false)
  const [discharging, setDischarging] = React.useState(false)
  const closed = REACTIVATABLE.includes(p.status)

  return (
    <div className="flex items-center gap-2">
      {p.status === "Declined" && (
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
          Invite again
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
            {p.status === "Active" && (
              <DropdownMenuItem onClick={() => setDischarging(true)}>
                <IconUserMinus />
                Discharge
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() =>
                closed ? setReactivating(true) : setDeactivating(true)
              }
            >
              {closed ? <IconLockOpen /> : <IconLock />}
              {closed ? "Reactivate" : "Deactivate"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeactivateDialog
        illustration="deactivate-person"
        target={deactivating ? fullName(p) : null}
        message="They can no longer sign in to the patient app. Their record stays with the practice."
        onCancel={() => setDeactivating(false)}
        onConfirm={() => {
          patients.patch(p.id, {
            status: "Inactive",
            inactiveReason: "Deactivated",
          })
          toast.success(`${fullName(p)} is deactivated`)
          setDeactivating(false)
        }}
      />
      <DeactivateDialog
        illustration="deactivate-person"
        verb="Discharge"
        target={discharging ? fullName(p) : null}
        message="Their care with the practice ends and they can no longer sign in to the patient app. Their record stays with the practice."
        onCancel={() => setDischarging(false)}
        onConfirm={() => {
          patients.patch(p.id, {
            status: "Inactive",
            inactiveReason: "Discharged",
          })
          toast.success(`${fullName(p)} is discharged`)
          setDischarging(false)
        }}
      />
      <ReactivateDialog
        patient={reactivating ? p : null}
        onClose={() => setReactivating(false)}
      />
    </div>
  )
}

/** The profile's cards: demographics, contact, care team and enrollment. */
export function PatientDetails({ patient: p }: { patient: Patient }) {
  const loc = useLocationLookup()
  const emp = useEmployerLookup()
  const prov = useProviderLookup()
  return (
    <>
      {(p.reactivatedAt || p.mergedAt) && (
        <div className="flex flex-col gap-1 rounded-lg border border-info/30 bg-info-surface px-4 py-2.5 text-sm text-info">
          {p.reactivatedAt && (
            <p>
              Reactivated on {shortDate(p.reactivatedAt)}. Fresh consent
              requested.
            </p>
          )}
          {p.mergedAt && (
            <p>
              A duplicate record was merged into this one on{" "}
              {shortDate(p.mergedAt)}.
            </p>
          )}
        </div>
      )}
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
                  value:
                    p.dob && `${usDate(p.dob)} (${ageFrom(p.dob)} yrs)`,
                },
                { label: "Sex at birth", value: p.sex },
                {
                  label: "Status",
                  value: <StatusBadge status={p.status} />,
                },
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
            { label: "Home phone number", value: p.homePhone },
            { label: "Email", value: p.noEmail ? "No email" : p.email },
            {
              label: "Preferred communication",
              value: p.preferredContacts.join(", "),
            },
            { label: "Time zone", value: p.timeZone },
            { label: "Address", value: personAddress(p), wide: true },
          ]}
        />
      </RecordCard>

      <RecordCard title="Additional details">
        <DetailGrid
          className="sm:grid-cols-2 lg:grid-cols-4"
          items={[
            { label: "Language", value: p.languages.join(", ") },
            { label: "Race", value: p.race },
            { label: "Ethnicity", value: p.ethnicity },
            { label: "Gender", value: p.genderIdentity },
            { label: "Pronoun", value: p.pronoun },
            { label: "Marital status", value: p.maritalStatus },
            { label: "SSN", value: maskSsn(p.ssn) },
          ]}
        />
      </RecordCard>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <RecordCard title="Care team">
          <DetailGrid
            className="sm:grid-cols-2"
            items={[
              { label: "Location", value: loc.name(p.locationId) },
              { label: "Primary provider", value: prov.name(p.providerId) },
              { label: "Employer", value: emp.name(p.employerId ?? "") },
              {
                label: "Registration date",
                value: usDate(p.registrationDate),
              },
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
                  p.status === "Invited"
                      ? "Pending"
                      : p.status === "Declined"
                        ? "Declined"
                        : p.status === "Active"
                          ? "Accepted"
                          : (p.inactiveReason ?? "Inactive"),
              },
              { label: "Invited", value: shortDate(p.invitedAt) },
              ...(p.status === "Declined" && p.respondedAt
                ? [{ label: "Declined", value: shortDate(p.respondedAt) }]
                : []),
            ]}
          />
        </RecordCard>
      </div>

      <RecordCard title="Emergency contact details">
        {p.emergencyContacts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-sm text-muted-foreground">
            <Illustration name="no-emergency-contact" className="size-28" />
            No emergency contact on file
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {p.emergencyContacts.map((c, i) => (
              <DetailGrid
                key={i}
                className="sm:grid-cols-2 lg:grid-cols-4"
                items={[
                  {
                    label: "Relationship with patient",
                    value: c.relationship,
                  },
                  { label: "Name", value: c.name },
                  { label: "Phone number", value: c.phone },
                  { label: "Email", value: c.email },
                ]}
              />
            ))}
          </div>
        )}
      </RecordCard>
    </>
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
            <EmptyMedia>
              <Illustration name="record-not-found" />
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
