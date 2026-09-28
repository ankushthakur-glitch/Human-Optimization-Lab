"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "@/design-system/ui/sonner"
import {
  IconArrowLeft,
  IconCheck,
  IconRefresh,
  IconWarning,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { SelectField, TextField, formatPhone } from "@/components/form-kit"
import {
  StatusBadge,
  avatarTone,
  initials,
} from "@/components/practice/directory"
import {
  type DuplicateCheck,
  type DuplicateReview,
  type MatchField,
  checkDuplicate,
  duplicateReviews,
  matchedText,
  queueForReview,
  resolveAsMerge,
  resolveAsSeparate,
} from "@/components/practice/patient-duplicates"
import {
  type Patient,
  type PatientInput,
  PRACTICE,
  SEXES,
  emptyPatient,
  fullName,
  mergeFields,
  mergePatient,
  patients,
  personAddress,
  providerName,
  reactivatePatient,
  shortDate,
  useLocationLookup,
  useProviderLookup,
  usDate,
} from "@/components/practice/practice-data"
import {
  PatientsFrame,
  type PortalKey,
  usePortal,
} from "@/components/practice/portal"
import { RecordCard, RecordPage } from "@/components/practice/record-page"
import { Avatar, AvatarFallback, AvatarImage } from "@/design-system/ui/avatar"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/design-system/ui/empty"
import { RadioGroup, RadioGroupItem } from "@/design-system/ui/radio-group"
import { Skeleton } from "@/design-system/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import { TablePager, usePaged } from "@/components/table-pager"
import { Illustration } from "@/components/illustrations/illustration"

/* The screens of the duplicate workflow (see patient-duplicates.ts for the
   rules): the outcome dialog the add form opens, the reactivate dialog, the
   side-by-side comparison, and the clinic manager's review queue. */

export const QUEUE_HREF = "/screens/practice/patients/duplicates"

/** Who the queue records as having sent a record for review. */
export function portalUser(key: PortalKey) {
  return key === "provider" ? "Dr. Elise Harrington" : PRACTICE.manager.name
}

type Assignment = { providerId: string; locationId: string }

/* -------------------------------------------------------------------------- */
/*  Assign physician                                                           */
/* -------------------------------------------------------------------------- */

function AssignPhysician({
  id,
  value,
  onChange,
}: {
  id: string
  value: Assignment
  onChange: (next: Assignment) => void
}) {
  const loc = useLocationLookup()
  const prov = useProviderLookup()
  const options = prov.active.filter(
    (p) => !value.locationId || p.locationIds.includes(value.locationId)
  )
  return (
    <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
      <SelectField
        id={`${id}-location`}
        label="Location"
        required
        options={loc.active.map((l) => l.name)}
        value={loc.name(value.locationId)}
        onChange={(name) => {
          const locationId = loc.active.find((l) => l.name === name)?.id ?? ""
          const keep = prov.active
            .find((p) => p.id === value.providerId)
            ?.locationIds.includes(locationId)
          onChange({ locationId, providerId: keep ? value.providerId : "" })
        }}
      />
      <SelectField
        id={`${id}-provider`}
        label="Physician"
        required
        options={options.map(providerName)}
        value={prov.name(value.providerId)}
        onChange={(name) =>
          onChange({
            ...value,
            providerId: options.find((p) => providerName(p) === name)?.id ?? "",
          })
        }
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Record summary and comparison                                              */
/* -------------------------------------------------------------------------- */

function PersonAvatar({
  name,
  photo,
  className,
}: {
  name: string
  photo?: string
  className?: string
}) {
  return (
    <Avatar className={cn("size-10 shrink-0", className)}>
      {photo && <AvatarImage src={photo} alt="" />}
      <AvatarFallback className={cn("font-medium", avatarTone(name))}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

/** The existing record, as the outcome dialogs show it: Label : Value lines. */
function RecordSummary({ patient: p }: { patient: Patient }) {
  const prov = useProviderLookup()
  const lines: [string, string][] = [
    ["Patient ID", p.id],
    ["Date of birth", usDate(p.dob)],
    ["Email", p.email],
    ["Mobile number", p.phone],
    ["Primary provider", prov.name(p.providerId)],
  ]
  if (p.invitedAt && p.status !== "Not invited")
    lines.push(["Invited", shortDate(p.invitedAt)])
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-3">
        <PersonAvatar name={fullName(p)} photo={p.photo} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{fullName(p)}</p>
        </div>
        <StatusBadge status={p.status} />
      </div>
      <dl className="mt-3 grid gap-1.5 border-t pt-3 text-sm">
        {lines.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[8.5rem_minmax(0,1fr)]">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="truncate">: {value || "Not provided"}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const addressOf = (p: PatientInput) => (p.address1 ? personAddress(p) : "")
const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * The existing record and the incoming one, field by field. Fields the check
 * matched on are marked, and fields where both sides hold different values
 * are highlighted so the reviewer can see what disagrees at a glance.
 */
export function CompareRecords({
  existing,
  incoming,
  matched,
  source,
}: {
  existing: Patient
  incoming: PatientInput
  matched: MatchField[]
  source?: string
}) {
  const loc = useLocationLookup()
  const prov = useProviderLookup()
  const rows: { label: string; a: string; b: string; key?: MatchField }[] = [
    {
      label: "Name",
      a: fullName(existing),
      b: fullName(incoming),
      key: "name",
    },
    {
      label: "Date of birth",
      a: usDate(existing.dob),
      b: usDate(incoming.dob),
      key: "dob",
    },
    { label: "Sex at birth", a: existing.sex, b: incoming.sex },
    { label: "Email", a: existing.email, b: incoming.email, key: "email" },
    {
      label: "Mobile number",
      a: existing.phone,
      b: incoming.phone,
      key: "phone",
    },
    { label: "Home phone", a: existing.homePhone, b: incoming.homePhone },
    { label: "Address", a: addressOf(existing), b: addressOf(incoming) },
    {
      label: "Location",
      a: loc.name(existing.locationId),
      b: loc.name(incoming.locationId),
    },
    {
      label: "Primary provider",
      a: prov.name(existing.providerId),
      b: prov.name(incoming.providerId),
    },
  ]

  /* The first five are what every entry path collects; the rest show only
     when the incoming record carries them (the Add patient popup doesn't). */
  const results = rows
    .filter((r, i) => i < 5 || r.b)
    .map((r) => {
      const match = r.key
        ? matched.includes(r.key)
        : Boolean(r.a && r.b && same(r.a, r.b))
      const differs = !match && Boolean(r.a && r.b) && !same(r.a, r.b)
      return { ...r, match, differs }
    })
  const verdict = (r: (typeof results)[number]) =>
    r.match ? (
      <span className="inline-flex items-center gap-1 text-success">
        <IconCheck className="size-3.5" />
        Match
      </span>
    ) : r.differs ? (
      <span className="text-warning">Differs</span>
    ) : null

  return (
    <>
      {/* Phones: one block per field, existing over incoming. */}
      <div className="divide-y rounded-md border sm:hidden">
        <div className="flex flex-wrap items-center gap-2 bg-surface-head px-3 py-2.5 text-xs text-muted-foreground">
          <span>Existing</span>
          <span className="font-semibold text-primary-tint tabular-nums">
            {existing.id}
          </span>
          <StatusBadge status={existing.status} />
          <span className="ml-auto">Incoming</span>
          {source && <Badge variant="secondary">{source}</Badge>}
        </div>
        {results.map((r) => (
          <div key={r.label} className="px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-muted-foreground">
                {r.label}
              </span>
              <span className="font-medium">{verdict(r)}</span>
            </div>
            <dl className="mt-1.5 grid grid-cols-[4.75rem_minmax(0,1fr)] gap-y-1">
              <dt className="text-muted-foreground">Existing</dt>
              <dd className="break-words">: {r.a || <Blank />}</dd>
              <dt className="text-muted-foreground">Incoming</dt>
              <dd
                className={cn(
                  "rounded-sm break-words",
                  r.differs && "bg-warning-surface/60",
                  r.match && "bg-success-surface/50"
                )}
              >
                : {r.b || <Blank />}
              </dd>
            </dl>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-md border sm:block">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="bg-surface-head text-left align-bottom text-xs text-muted-foreground">
              <th className="w-32 px-3 py-2.5 font-medium">Field</th>
              <th className="border-l px-3 py-2.5 font-medium">
                <div className="flex flex-wrap items-center gap-2">
                  <span>Existing record</span>
                  <span className="font-semibold text-primary-tint tabular-nums">
                    {existing.id}
                  </span>
                  <StatusBadge status={existing.status} />
                </div>
              </th>
              <th className="border-l px-3 py-2.5 font-medium">
                <div className="flex flex-wrap items-center gap-2">
                  <span>Incoming record</span>
                  {source && <Badge variant="secondary">{source}</Badge>}
                </div>
              </th>
              <th className="w-24 border-l px-3 py-2.5 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const { match, differs } = r
              return (
                <tr key={r.label} className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">{r.label}</td>
                  <td className="border-l px-3 py-2 break-words">
                    {r.a || <Blank />}
                  </td>
                  <td
                    className={cn(
                      "border-l px-3 py-2 break-words",
                      differs && "bg-warning-surface/60",
                      match && "bg-success-surface/50"
                    )}
                  >
                    {r.b || <Blank />}
                  </td>
                  <td className="border-l px-3 py-2 text-xs font-medium">
                    {verdict(r)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Blank() {
  return <span className="text-muted-foreground/70">Not provided</span>
}

/* -------------------------------------------------------------------------- */
/*  Reactivate                                                                 */
/* -------------------------------------------------------------------------- */

/** The dialog's way out: Back to the Add patient details, else Cancel. */
function DismissButton({
  onBack,
  onCancel,
}: {
  onBack?: () => void
  onCancel: () => void
}) {
  return onBack ? (
    <Button variant="outline" onClick={onBack}>
      <IconArrowLeft />
      Back
    </Button>
  ) : (
    <Button variant="outline" onClick={onCancel}>
      Cancel
    </Button>
  )
}

function ReactivateBody({
  patient,
  initial,
  onCancel,
  onBack,
  onDone,
}: {
  patient: Patient
  initial?: Assignment
  onCancel: () => void
  onBack?: () => void
  onDone: (id: string) => void
}) {
  const [assign, setAssign] = React.useState<Assignment>(() => ({
    providerId: initial?.providerId || patient.providerId,
    locationId: initial?.locationId || patient.locationId,
  }))
  const state =
    patient.status === "Consent withdrawn"
      ? "withdrew consent"
      : patient.status === "Discharged"
        ? "was discharged"
        : "is inactive"
  return (
    <>
      <DialogHeader>
        <Illustration name="reactivate-record" className="-ml-2 size-24" />
        <DialogTitle>Reactivate {fullName(patient)}?</DialogTitle>
        <DialogDescription>
          Exact match on {matchedTextFor(patient)}. This patient {state}.
          Reactivating keeps their history and emails a fresh consent request.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-5">
        <RecordSummary patient={patient} />
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-muted-foreground">
            Assign physician
          </h3>
          <AssignPhysician
            id="reactivate"
            value={assign}
            onChange={setAssign}
          />
        </section>
      </div>
      <DialogFooter>
        <DismissButton onBack={onBack} onCancel={onCancel} />
        <Button
          disabled={!assign.providerId}
          onClick={() => {
            reactivatePatient(patient.id, assign)
            toast.success(`${fullName(patient)} is reactivated`, {
              description: `Consent request sent to ${patient.email || "the patient"}.`,
            })
            onDone(patient.id)
          }}
        >
          <IconRefresh />
          Reactivate
        </Button>
      </DialogFooter>
    </>
  )
}

/* The standalone dialog has no incoming record, so it names the status. */
function matchedTextFor(patient: Patient) {
  return `name, date of birth and ${patient.email ? "email" : "mobile number"}`
}

/** Reopens a discharged, withdrawn or inactive record from the list or profile. */
export function ReactivateDialog({
  patient,
  onClose,
}: {
  patient: Patient | null
  onClose: () => void
}) {
  return (
    <Dialog open={patient !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {patient && (
          <ReactivateBody
            patient={patient}
            onCancel={onClose}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*  The add form's outcome dialog                                              */
/* -------------------------------------------------------------------------- */

export type FoundDuplicate = Exclude<DuplicateCheck, { kind: "none" }>

/**
 * What saving a new patient found. An exact match never creates a record:
 * it is reused, kept or reactivated. A possible match is compared side by
 * side and resolved on the spot: merged, or created as a new record. The
 * clinic manager can also queue it; a provider needs no one's approval.
 */
export function DuplicateDialog({
  found,
  incoming,
  onClose,
  onBack,
  onCreate,
}: {
  found: FoundDuplicate | null
  incoming: PatientInput
  onClose: () => void
  /** Set when the dialog came from the Add patient details popup. */
  onBack?: () => void
  /** Different person: the form goes on and creates the record. */
  onCreate: () => void
}) {
  const wide = found?.kind === "possible"
  return (
    <Dialog open={found !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "max-h-[90svh]",
          /* The comparison scrolls between a pinned header and footer. */
          wide ? "flex flex-col sm:max-w-3xl" : "overflow-y-auto sm:max-w-lg"
        )}
      >
        {found?.kind === "possible" ? (
          <PossibleBody
            found={found}
            incoming={incoming}
            onClose={onClose}
            onBack={onBack}
            onCreate={onCreate}
          />
        ) : found?.action === "reactivate" ? (
          <ReactivateFromForm
            found={found}
            incoming={incoming}
            onClose={onClose}
            onBack={onBack}
          />
        ) : found ? (
          <ExistingBody found={found} onClose={onClose} onBack={onBack} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ReactivateFromForm({
  found,
  incoming,
  onClose,
  onBack,
}: {
  found: FoundDuplicate
  incoming: PatientInput
  onClose: () => void
  onBack?: () => void
}) {
  const router = useRouter()
  const { patientHref } = usePortal()
  return (
    <ReactivateBody
      patient={found.patient}
      initial={{
        providerId: incoming.providerId,
        locationId: incoming.locationId,
      }}
      onCancel={onClose}
      onBack={onBack}
      onDone={(id) => router.push(patientHref(id))}
    />
  )
}

function ExistingBody({
  found,
  onClose,
  onBack,
}: {
  found: FoundDuplicate
  onClose: () => void
  onBack?: () => void
}) {
  const router = useRouter()
  const { patientHref } = usePortal()
  const p = found.patient
  const name = fullName(p)
  const copy =
    p.status === "Active"
      ? {
          title: `${name} is already a patient`,
          text: "Their record is active. No new record is created and no second invite goes out.",
        }
      : p.status === "Invited"
        ? {
            title: `${name} is already invited`,
            text: `The invite went out on ${shortDate(p.invitedAt)}. The existing record and invite are reused, so no second invite goes out.`,
          }
        : {
            title: `${name} is already on file`,
            text: "The existing record is reused instead of creating a second one. Send the invite from it when ready.",
          }
  return (
    <>
      <DialogHeader>
        <Illustration name="already-on-file" className="-ml-2 size-24" />
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>
          Exact match on {matchedText(found.matched).toLowerCase()}. {copy.text}
        </DialogDescription>
      </DialogHeader>
      <RecordSummary patient={p} />
      <DialogFooter>
        <DismissButton onBack={onBack} onCancel={onClose} />
        <Button onClick={() => router.push(patientHref(p.id))}>
          Open existing record
        </Button>
      </DialogFooter>
    </>
  )
}

function PossibleBody({
  found,
  incoming,
  onClose,
  onBack,
  onCreate,
}: {
  found: FoundDuplicate
  incoming: PatientInput
  onClose: () => void
  onBack?: () => void
  onCreate: () => void
}) {
  const router = useRouter()
  const portal = usePortal()
  const existing = found.patient

  function queue() {
    queueForReview(
      [
        {
          incoming,
          matchId: existing.id,
          matched: found.matched,
          source: "Manual",
        },
      ],
      portalUser(portal.key)
    )
    toast.success("Sent for review", {
      description: "Find it in Possible duplicates.",
    })
    router.push(QUEUE_HREF)
  }

  function merge() {
    const filled = mergePatient(existing.id, incoming)
    toast.success(`Merged into ${fullName(existing)}`, {
      description: filled.length
        ? `Added: ${filled.join(", ")}.`
        : "The existing record already had every detail.",
    })
    router.push(portal.patientHref(existing.id))
  }

  return (
    <>
      <DialogHeader>
        <Illustration name="possible-duplicate" className="-ml-2 size-24" />
        <DialogTitle>Possible duplicate</DialogTitle>
        <DialogDescription>
          Matches {fullName(existing)} ({existing.id}) on{" "}
          {matchedText(found.matched).toLowerCase()}.
        </DialogDescription>
      </DialogHeader>
      <div className="min-h-0 overflow-y-auto">
        <CompareRecords
          existing={existing}
          incoming={incoming}
          matched={found.matched}
          source="Manual"
        />
      </div>
      <DialogFooter className="sm:justify-between">
        {onBack ? (
          <DismissButton onBack={onBack} onCancel={onClose} />
        ) : (
          <span />
        )}
        {/* Tertiary, secondary, primary, left to right. The review queue is
            the clinic manager's; a provider decides here. */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {portal.key === "practice" && (
            <Button variant="ghost" onClick={queue}>
              Review later
            </Button>
          )}
          <Button variant="outline" onClick={onCreate}>
            Create new record
          </Button>
          <Button onClick={merge}>Merge record</Button>
        </div>
      </DialogFooter>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Add patient: the duplicate check comes first                               */
/* -------------------------------------------------------------------------- */

/* Adding a patient by hand starts with the details the check needs, in a
   centred popup. A match goes down the duplicate path; a cleared patient
   carries these details into the full form. */

export type PrecheckValues = Pick<
  PatientInput,
  "firstName" | "lastName" | "dob" | "sex" | "email" | "phone"
>

let draft: PrecheckValues | null = null

/** The cleared details waiting for the full form. */
export function peekDraft() {
  return draft
}

/** Called once the form has taken the draft, so a later visit starts fresh. */
export function clearDraft() {
  draft = null
}

/** The fields the check compares, to tell whether the form changed them. */
export function precheckKey(v: PrecheckValues) {
  return [v.firstName, v.lastName, v.dob, v.email, v.phone]
    .map((x) => x.trim().toLowerCase())
    .join("|")
}

const EMPTY_PRECHECK: PrecheckValues = {
  firstName: "",
  lastName: "",
  dob: "",
  sex: "",
  email: "",
  phone: "",
}

export function PatientPrecheck({
  open,
  onCancel,
  onClear,
}: {
  open: boolean
  onCancel: () => void
  /** No match, or the user said it's a different person. */
  onClear: (values: PrecheckValues) => void
}) {
  const portal = usePortal()
  const prov = useProviderLookup()
  const [values, setValues] = React.useState<PrecheckValues>(EMPTY_PRECHECK)
  const [attempted, setAttempted] = React.useState(false)
  const [found, setFound] = React.useState<FoundDuplicate | null>(null)

  React.useEffect(() => {
    if (!open) {
      setValues(EMPTY_PRECHECK)
      setAttempted(false)
      setFound(null)
    }
  }, [open])

  /* In a provider's portal the patient starts as theirs. */
  const self = prov.all.find((p) => p.id === portal.selfProviderId)
  const incoming: PatientInput = {
    ...emptyPatient(),
    ...values,
    providerId: self?.id ?? "",
    locationId: self?.locationIds[0] ?? "",
  }

  const errors: Partial<Record<keyof PrecheckValues, string>> = {}
  if (attempted) {
    if (!values.firstName.trim()) errors.firstName = "Enter a first name."
    if (!values.lastName.trim()) errors.lastName = "Enter a last name."
    if (!values.dob) errors.dob = "Enter the date of birth."
    if (!values.sex) errors.sex = "Select sex at birth."
  }

  const set =
    (key: keyof PrecheckValues, format?: (v: string) => string) =>
    (value: string) =>
      setValues((prev) => ({ ...prev, [key]: format ? format(value) : value }))

  function check(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttempted(true)
    const { firstName, lastName, dob, sex } = values
    if (!firstName.trim() || !lastName.trim() || !dob || !sex) return
    const result = checkDuplicate(incoming)
    if (result.kind === "none") {
      toast.success("No matching patient found")
      onClear(values)
    } else setFound(result)
  }

  return (
    <>
      <Dialog
        open={open && !found}
        onOpenChange={(next) => !next && onCancel()}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add patient</DialogTitle>
            <DialogDescription className="sr-only">
              Enter the patient&apos;s details to check for an existing record
              before creating a new one.
            </DialogDescription>
          </DialogHeader>
          <form
            id="patient-precheck"
            noValidate
            onSubmit={check}
            className="grid gap-x-4 gap-y-4 sm:grid-cols-2"
          >
            <TextField
              id="precheck-firstName"
              label="First name"
              required
              autoFocus
              value={values.firstName}
              onChange={(e) => set("firstName")(e.target.value)}
              error={errors.firstName}
            />
            <TextField
              id="precheck-lastName"
              label="Last name"
              required
              value={values.lastName}
              onChange={(e) => set("lastName")(e.target.value)}
              error={errors.lastName}
            />
            <TextField
              id="precheck-dob"
              label="Date of birth"
              required
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={values.dob}
              onChange={(e) => set("dob")(e.target.value)}
              error={errors.dob}
            />
            <SelectField
              id="precheck-sex"
              label="Sex at birth"
              required
              options={SEXES}
              value={values.sex}
              onChange={set("sex")}
              error={errors.sex}
            />
            <TextField
              id="precheck-email"
              label="Email"
              type="email"
              autoComplete="off"
              value={values.email}
              onChange={(e) => set("email")(e.target.value)}
            />
            <TextField
              id="precheck-phone"
              label="Mobile number"
              type="tel"
              value={values.phone}
              onChange={(e) => set("phone", formatPhone)(e.target.value)}
            />
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" form="patient-precheck">
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DuplicateDialog
        found={open ? found : null}
        incoming={incoming}
        /* Back to the details, to correct them or cancel. */
        onClose={() => setFound(null)}
        onBack={() => setFound(null)}
        onCreate={() => onClear(values)}
      />
    </>
  )
}

/** The list's Add patient: the popup, then the full form with its details. */
export function usePatientPrecheck() {
  const router = useRouter()
  const { newPatientHref } = usePortal()
  const [open, setOpen] = React.useState(false)
  const dialog = (
    <PatientPrecheck
      open={open}
      onCancel={() => setOpen(false)}
      onClear={(values) => {
        draft = values
        router.push(newPatientHref)
      }}
    />
  )
  return { open: () => setOpen(true), dialog }
}

/* -------------------------------------------------------------------------- */
/*  Banner on the patient list                                                 */
/* -------------------------------------------------------------------------- */

export function DuplicateQueueBanner() {
  const portal = usePortal()
  const { items } = duplicateReviews.use()
  /* The queue is the clinic manager's; a provider resolves duplicates on the
     spot, so their list has nothing waiting. */
  if (portal.key === "provider" || items.length === 0) return null
  const count = items.length
  return (
    <div className="shrink-0 bg-surface-sunken px-4 pt-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning-surface px-4 py-2.5 text-sm">
        <IconWarning className="size-4 shrink-0 text-warning" />
        <span className="min-w-0 flex-1 font-medium text-warning">
          {`${count} possible ${count === 1 ? "duplicate needs" : "duplicates need"} review`}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="bg-card"
          nativeButton={false}
          render={<Link href={QUEUE_HREF} />}
        >
          Review
        </Button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Queue                                                                      */
/* -------------------------------------------------------------------------- */

export function DuplicateQueueScreen() {
  const router = useRouter()
  const { items, ready } = duplicateReviews.use()
  const { items: list } = patients.use()
  const portal = usePortal()
  const paged = usePaged(items)

  return (
    <PatientsFrame>
      <RecordPage
        title="Possible duplicates"
        backHref={portal.patientsHref}
        fill
      >
        <div className="flex min-h-80 flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-[0_0_5px_rgb(0_0_0/0.06)]">
          {!ready ? (
            <Skeleton className="m-5 h-40" />
          ) : items.length === 0 ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia>
                  <Illustration name="duplicates-clear" />
                </EmptyMedia>
                <EmptyTitle>No possible duplicates to review</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={portal.patientsHref} />}
                >
                  Back to patients
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col [&_td:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:first-child]:pl-5 [&_th:last-child]:pr-5">
              <Table containerClassName="min-h-0 flex-1 overflow-auto">
                <TableHeader className="sticky top-0 z-10 bg-surface-head [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
                  <TableRow>
                    <TableHead>Incoming patient</TableHead>
                    <TableHead>Possible match</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Matched on
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Source
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Sent by
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">Sent</TableHead>
                    <TableHead className="w-24 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.visible.map((r) => {
                    const match = list.find((p) => p.id === r.matchId)
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <PersonAvatar
                              name={fullName(r.incoming)}
                              className="size-8"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {fullName(r.incoming)}
                              </p>
                              <p className="text-xs text-muted-foreground tabular-nums">
                                {usDate(r.incoming.dob)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {match ? (
                            <div className="flex items-center gap-2">
                              <Link
                                href={portal.patientHref(match.id)}
                                className="truncate font-medium hover:underline"
                              >
                                {fullName(match)}
                              </Link>
                              <span className="text-xs text-primary-tint tabular-nums">
                                {match.id}
                              </span>
                              <StatusBadge status={match.status} />
                            </div>
                          ) : (
                            <Blank />
                          )}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {matchedText(r.matched)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="secondary">{r.source}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {r.submittedBy}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                          {shortDate(r.submittedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`${QUEUE_HREF}/${r.id}`)}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <TablePager paged={paged} />
            </div>
          )}
        </div>
      </RecordPage>
    </PatientsFrame>
  )
}

/* -------------------------------------------------------------------------- */
/*  Review one                                                                 */
/* -------------------------------------------------------------------------- */

export function DuplicateReviewScreen({ id }: { id: string }) {
  const { items, ready } = duplicateReviews.use()
  const { items: list } = patients.use()
  const review = items.find((r) => r.id === id)
  const existing = review && list.find((p) => p.id === review.matchId)

  if (!review || !existing) {
    return (
      <PatientsFrame>
        {!ready ? (
          <div className="flex flex-col gap-4 p-6">
            <Skeleton className="h-6 w-60" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : (
          <Empty className="flex-1">
            <EmptyHeader>
              <EmptyMedia>
                <Illustration name="review-resolved" />
              </EmptyMedia>
              <EmptyTitle>This review is already resolved</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={QUEUE_HREF} />}
              >
                Back to possible duplicates
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </PatientsFrame>
    )
  }
  return (
    <PatientsFrame>
      <ReviewBody review={review} existing={existing} />
    </PatientsFrame>
  )
}

function ReviewBody({
  review,
  existing,
}: {
  review: DuplicateReview
  existing: Patient
}) {
  const router = useRouter()
  const { patientHref } = usePortal()
  const [resolving, setResolving] = React.useState(false)
  const [choice, setChoice] = React.useState<"" | "merge" | "separate">("")
  const [assign, setAssign] = React.useState<Assignment>({
    providerId: review.incoming.providerId,
    locationId: review.incoming.locationId,
  })
  const incomingName = fullName(review.incoming)
  const filled = mergeFields(existing, review.incoming).map((f) => f.label)

  function resolve() {
    if (choice === "merge") {
      resolveAsMerge(review)
      toast.success(`Merged into ${fullName(existing)}`, {
        description: filled.length
          ? `Added: ${filled.join(", ")}.`
          : "The existing record already had every detail.",
      })
      router.push(patientHref(existing.id))
    } else if (choice === "separate") {
      const created = resolveAsSeparate(review, assign)
      toast.success("Patient record created", {
        description: `${incomingName} (${created.id}) is assigned to their physician.`,
      })
      router.push(patientHref(created.id))
    }
  }

  const options = [
    {
      value: "merge" as const,
      title: "Same person: merge into existing record",
      text: filled.length
        ? `${fullName(existing)} (${existing.id}) stays with its history. Adds: ${filled.join(", ")}.`
        : `${fullName(existing)} (${existing.id}) stays with its history. Nothing new to add.`,
    },
    {
      value: "separate" as const,
      title: "Different person: create a separate record",
      text: `${incomingName} gets their own record, then goes on to physician assignment.`,
    },
  ]

  return (
    <RecordPage
      title={`Review ${incomingName}`}
      backHref={QUEUE_HREF}
      action={<Button onClick={() => setResolving(true)}>Resolve</Button>}
    >
      <div className="flex flex-col gap-4">
        <RecordCard
          title="Compare records"
          action={
            <span className="text-xs text-muted-foreground">
              Sent by {review.submittedBy} on {shortDate(review.submittedAt)}
            </span>
          }
        >
          <CompareRecords
            existing={existing}
            incoming={review.incoming}
            matched={review.matched}
            source={review.source}
          />
        </RecordCard>
      </div>

      <Dialog
        open={resolving}
        onOpenChange={(open) => {
          setResolving(open)
          if (!open) setChoice("")
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve possible duplicate</DialogTitle>
            <DialogDescription className="sr-only">
              Choose whether {incomingName} is the same person as{" "}
              {fullName(existing)}.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            aria-label="Resolve"
            value={choice}
            onValueChange={(next) => setChoice(next as typeof choice)}
            className="grid gap-3"
          >
            {options.map((o) => (
              <label
                key={o.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-surface-hover",
                  choice === o.value && "border-primary bg-primary-surface/40"
                )}
              >
                <RadioGroupItem value={o.value} className="mt-0.5" />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm font-medium">{o.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {o.text}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
          {choice === "separate" && (
            <section className="flex flex-col gap-3 border-t pt-4">
              <h3 className="text-xs font-semibold text-muted-foreground">
                Assign physician
              </h3>
              <AssignPhysician
                id="review-assign"
                value={assign}
                onChange={setAssign}
              />
            </section>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolving(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !choice || (choice === "separate" && !assign.providerId)
              }
              onClick={resolve}
            >
              {choice === "separate" ? "Create record" : "Merge records"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RecordPage>
  )
}
