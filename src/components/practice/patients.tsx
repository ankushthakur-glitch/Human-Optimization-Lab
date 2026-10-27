"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/design-system/ui/sonner"
import {
  IconArrowDownDouble,
  IconArrowUpDouble,
  IconClock,
  IconEdit,
  IconEqual,
  IconEye,
  IconFileUpload,
  IconLock,
  IconLockOpen,
  IconMail,
  IconSwitch,
  IconUserAdd,
  IconUserMinus,
} from "@/design-system/icons"

import { EMAIL, VALIDATE, digits, formatPhone } from "@/components/form-kit"
import {
  BulkImportDialog,
  type ImportSpec,
  type ParsedRow,
  type RowOutcome,
  isoFromUsDate,
  pick,
} from "@/components/practice/bulk-import"
import {
  Directory,
  PersonCell,
  BulkResend,
  ID_CELL,
  RowMenu,
  StatusBadge,
  type Column,
} from "@/components/practice/directory"
import {
  type Patient,
  type PatientInput,
  SEXES,
  ageFrom,
  emptyPatient,
  fullName,
  addPatients,
  sendPatientInvites,
  patients,
  providerName,
  PATIENT_STATUSES,
  REACTIVATABLE,
  PINNED_PATIENTS,
  RISK_LEVELS,
  type RiskLevel,
  reactivatePatient,
  riskLevel,
  shortDate,
  useLocationLookup,
  useProviderLookup,
  usDate,
} from "@/components/practice/practice-data"
import { useEmployerLookup } from "@/components/settings/settings-data"
import { PatientsFrame, usePortal } from "@/components/practice/portal"
import {
  type RecordState,
  recordSyncs,
  syncStatusFor,
} from "@/components/practice/health-record"
import { DeactivateDialog } from "@/components/practice/sheets"
import {
  ReassignProviderDialog,
  canReassign,
} from "@/components/practice/reassign-provider"
import { InviteTimelineSheet } from "@/components/practice/invite-timeline"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import { SOFT_TEXT } from "@/components/patient-dashboard/widgets/charting-dashboard"
import {
  checkDuplicate,
  matchedText,
  queueForReview,
} from "@/components/practice/patient-duplicates"
import {
  DuplicateQueueBanner,
  ReactivateDialog,
  usePatientPrecheck,
  portalUser,
} from "@/components/practice/duplicates"
import { Button } from "@/design-system/ui/button"
import { DropdownMenuItem } from "@/design-system/ui/dropdown-menu"

/* The patient list, in the clinic manager's portal and a provider's (see
   portal.tsx). Onboarding a patient and their profile are full pages (see
   patient-record.tsx). */

function inviteAgain(p: Patient) {
  sendPatientInvites([p.id])
  toast.success("Invite sent", {
    description: `${fullName(p)} will get an email to join the patient portal.`,
  })
}

function resend(p: Patient) {
  sendPatientInvites([p.id])
  toast.success("Invite resent", {
    description: `A fresh link went to ${p.email}.`,
  })
}

/* Where each chart stands with the EHR: the same state and last sync the
   chart's banner shows. A synced record reads as its last sync; any other
   reads as the reason it isn't syncing. The provider and the clinic
   manager see the same list. */

const SYNC_LABEL: Record<RecordState, string> = {
  Active: "Synced",
  Building: "Record building",
  "Source exception": "Sync failed",
  "Awaiting consent": "Waiting for consent",
}

const SYNC_FILTER = [
  "Synced",
  "Record building",
  "Sync failed",
  "Waiting for consent",
  "Invited, not joined",
  "Invite declined",
  "Consent withdrawn",
  "Discharged",
  "Deactivated",
  "Transferred",
]

/** "Today, 5:00 AM" from a local "2026-09-28T05:00"; older days by date. */
function syncedAt(at: string) {
  const [date, time = "00:00"] = at.split("T")
  const [h, m] = time.split(":").map(Number)
  const day = new Date(`${date}T12:00:00`)
  const now = new Date()
  now.setHours(12, 0, 0, 0)
  const ago = Math.round((now.getTime() - day.getTime()) / 86_400_000)
  const when =
    ago === 0
      ? "Today"
      : ago === 1
        ? "Yesterday"
        : day.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${when}, ${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}

function useSyncLookup() {
  const { items } = recordSyncs.use()
  return (p: Patient) => {
    const s = syncStatusFor(
      p,
      items.find((r) => r.id === p.id)
    )
    /* A closed record stops syncing for its reason; before consent the
       patient is invited and not yet joined, declined the invite, or
       enrolled and not yet consented (the dashboard's record states). */
    const label =
      p.status === "Inactive"
        ? (p.inactiveReason ?? "Deactivated")
        : p.status === "Declined"
          ? "Invite declined"
          : s.state === "Awaiting consent"
            ? p.status === "Active"
              ? "Waiting for consent"
              : "Invited, not joined"
            : SYNC_LABEL[s.state]
    const synced = label === "Synced"
    return { ...s, label, synced, text: synced && s.at ? syncedAt(s.at) : label }
  }
}

/** The last sync's date and time, or the reason the record isn't syncing. */
function SyncCell({
  status,
}: {
  status: ReturnType<ReturnType<typeof useSyncLookup>>
}) {
  if (status.synced)
    return <span className="text-foreground tabular-nums">{status.text}</span>
  if (status.label === "Sync failed")
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: SUBTLE.red }}
        />
        {status.text}
      </span>
    )
  return <span className="text-muted-foreground">{status.text}</span>
}

/* Invited and Declined chips open the invite timeline. */
function StatusCell({
  patient: p,
  onTimeline,
}: {
  patient: Patient
  onTimeline: (p: Patient) => void
}) {
  if (p.status !== "Invited" && p.status !== "Declined")
    return <StatusBadge status={p.status} />
  return (
    <button
      type="button"
      title="View invite timeline"
      className="flex items-center gap-2 rounded-sm text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      onClick={() => onTimeline(p)}
    >
      <StatusBadge status={p.status} />
    </button>
  )
}

/* Risk reads as an arrow, not another badge: red up for High, orange equals
   for Moderate, green down for Low. */
const RISK_ICON: Record<RiskLevel, { Icon: typeof IconEqual; className: string }> = {
  High: { Icon: IconArrowUpDouble, className: "text-[#E5484D]" },
  Moderate: { Icon: IconEqual, className: "text-[#F08C2E]" },
  Low: { Icon: IconArrowDownDouble, className: "text-[#3E9B5F]" },
}

/* High sorts first, then Moderate, then Low. */
const riskRank = (p: Patient) => RISK_LEVELS.indexOf(riskLevel(p))

/* Sample AI biological age: the patient's age shifted 8 years either way,
   fixed per patient ID, until the real model exists. */
function bioAge(p: Patient) {
  const seed = [...p.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 997, 7)
  return ageFrom(p.dob) + (seed % 17) - 8
}

/* Older than their real age is red, up to 2 years younger orange, 3 or
   more years younger green. */
function BioAgeCell({ patient }: { patient: Patient }) {
  const bio = bioAge(patient)
  const gap = bio - ageFrom(patient.dob)
  const tone = gap > 0 ? "red" : gap > -3 ? "orange" : "green"
  return <span className={`font-semibold ${SOFT_TEXT[tone]}`}>{bio}</span>
}

function RiskIcon({ patient }: { patient: Patient }) {
  const r = riskLevel(patient)
  const { Icon, className } = RISK_ICON[r]
  return (
    <span title={`${r} risk`} className="flex [--icon-stroke-width:2.5]">
      <Icon className={`size-[18px] ${className}`} aria-label={`${r} risk`} />
    </span>
  )
}

/** The selection's bulk action for patients who declined the invite. */
function BulkInviteAgain({
  rows,
  onDone,
}: {
  rows: Patient[]
  onDone: () => void
}) {
  const declined = rows.filter((p) => p.status === "Declined")
  if (declined.length === 0) return null
  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-md"
      onClick={() => {
        sendPatientInvites(declined.map((p) => p.id))
        toast.success(
          declined.length === 1
            ? "Invite sent"
            : `${declined.length} invites sent`
        )
        onDone()
      }}
    >
      <IconMail />
      Invite again ({declined.length})
    </Button>
  )
}

/** The selection's bulk action to hand open records to another provider. */
function BulkReassign({
  rows,
  onOpen,
}: {
  rows: Patient[]
  onOpen: (rows: Patient[]) => void
}) {
  const open = rows.filter(canReassign)
  if (open.length === 0) return null
  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-md"
      onClick={() => onOpen(open)}
    >
      <IconSwitch />
      Reassign provider ({open.length})
    </Button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Bulk import                                                                */
/* -------------------------------------------------------------------------- */

/* The duplicate check's verdict on one imported row: nothing (a new record),
   or where the row goes instead. Rows earlier in the same file count too. */
function rowOutcome(
  value: PatientInput,
  existing: Patient[],
  earlier: { row: number; value: PatientInput }[],
  /** The review queue is the clinic manager's; a provider's import skips a
      possible match, to be added by hand where the records are compared. */
  canQueue: boolean
): RowOutcome | undefined {
  const check = checkDuplicate(value, existing)
  if (check.kind === "none") {
    const repeat = earlier.find(
      (e) =>
        checkDuplicate(value, [
          {
            ...e.value,
            id: "",
            status: "Invited",
            invitedAt: "",
            source: "Bulk import",
          },
        ]).kind === "exact"
    )
    return repeat
      ? {
          kind: "skip",
          badge: `Repeats row ${repeat.row}`,
          note: "Same patient as an earlier row in this file.",
        }
      : undefined
  }
  const p = check.patient
  const who = `${fullName(p)} (${p.id})`
  if (check.kind === "possible" && !canQueue)
    return {
      kind: "skip",
      badge: "Possible duplicate",
      note: `May be ${who}: ${matchedText(check.matched).toLowerCase()} match. Not imported; add by hand to compare the records.`,
      ref: p.id,
    }
  if (check.kind === "possible")
    return {
      kind: "review",
      badge: "Possible duplicate",
      note: `May be ${who}: ${matchedText(check.matched).toLowerCase()} match. Goes to the review queue.`,
      ref: p.id,
    }
  if (check.action === "reactivate")
    return {
      kind: "reactivate",
      badge: "Reactivate",
      note: `Matches ${who}, ${p.status.toLowerCase()}. Reactivated with a fresh consent request.`,
      ref: p.id,
    }
  return {
    kind: "skip",
    badge:
      check.action === "keep"
        ? "Already active"
        : p.status === "Invited"
          ? "Already invited"
          : "Already on file",
    note:
      check.action === "keep"
        ? `Matches ${who}. Record kept, no second invite.`
        : p.status === "Invited"
          ? `Matches ${who}. Existing record and invite reused.`
          : `Matches ${who}. Existing record reused.`,
    ref: p.id,
  }
}

function usePatientImport(): ImportSpec<PatientInput> {
  const { items } = patients.use()
  const portal = usePortal()
  /* Rows already read from the file being imported, for in-file repeats. */
  const batch = React.useRef<{ row: number; value: PatientInput }[]>([])
  const loc = useLocationLookup()
  const prov = useProviderLookup()
  const emp = useEmployerLookup()
  const activeLocations = loc.active.map((l) => l.name)
  const activeEmployers = emp.active.map((e) => e.name)
  const activeProviders = prov.active.map(providerName)

  return {
    one: "patient",
    many: "patients",
    sheetName: "Patients",
    fileName: "Patient reference sheet.xlsx",
    columns: [
      { header: "First name", required: true, example: "Jordan", width: 16 },
      { header: "Last name", required: true, example: "Ellery", width: 16 },
      {
        header: "Date of birth",
        required: true,
        example: "07/14/1978",
        width: 14,
      },
      {
        header: "Sex at birth",
        required: true,
        example: "Female",
        options: SEXES,
        width: 14,
      },
      {
        header: "Email",
        required: true,
        example: "jordan.ellery@example.com",
        width: 30,
      },
      { header: "Mobile number", example: "(858)-555-0100", width: 16 },
      {
        header: "Location",
        required: true,
        example: activeLocations[0] ?? "",
        options: activeLocations,
        width: 20,
      },
      {
        header: "Primary provider",
        required: true,
        example: activeProviders[0] ?? "",
        options: activeProviders,
        width: 28,
      },
      {
        header: "Employer",
        example: activeEmployers[0] ?? "",
        options: activeEmployers,
        width: 24,
      },
    ],
    parse(c, row): ParsedRow<PatientInput> {
      if (row === 2) batch.current = []
      const errors: string[] = []
      const first = c["First name"]
      const last = c["Last name"]
      if (!first) errors.push("First name is missing.")
      if (!last) errors.push("Last name is missing.")

      const dob = c["Date of birth"] ? isoFromUsDate(c["Date of birth"]) : null
      if (!c["Date of birth"]) errors.push("Date of birth is missing.")
      else if (!dob) errors.push("Date of birth isn't a date (MM/DD/YYYY).")
      else if (dob > new Date().toISOString().slice(0, 10))
        errors.push("Date of birth is in the future.")

      const sex = pick(SEXES, c["Sex at birth"])
      if (!c["Sex at birth"]) errors.push("Sex at birth is missing.")
      else if (!sex)
        errors.push(
          `Sex at birth "${c["Sex at birth"]}" isn't one of ${SEXES.join(", ")}.`
        )

      const email = c.Email.toLowerCase()
      if (!email) errors.push("Email is missing.")
      else if (!EMAIL.test(email)) errors.push("Email isn't valid.")

      const phone = c["Mobile number"]
      if (phone && digits(phone).length !== 10)
        errors.push("Mobile number needs 10 digits.")

      const locationId = loc.active.find(
        (l) => l.name.toLowerCase() === c.Location.trim().toLowerCase()
      )?.id
      if (!c.Location) errors.push("Location is missing.")
      else if (!locationId)
        errors.push(`Location "${c.Location}" doesn't exist.`)

      /* The provider can be written "Elise Harrington, MD" or "Elise Harrington". */
      const wanted = c["Primary provider"]
        .toLowerCase()
        .replace(/^dr\.?\s+/, "")
      const provider = prov.active.find(
        (p) =>
          providerName(p).toLowerCase() === wanted ||
          fullName({
            firstName: p.firstName,
            lastName: p.lastName,
          }).toLowerCase() === wanted
      )
      if (!c["Primary provider"]) errors.push("Primary provider is missing.")
      else if (!provider)
        errors.push(
          `Provider "${c["Primary provider"]}" isn't on the practice.`
        )
      else if (locationId && !provider.locationIds.includes(locationId))
        errors.push(`${providerName(provider)} doesn't work at ${c.Location}.`)

      const employerId = emp.active.find(
        (e) => e.name.toLowerCase() === c.Employer.trim().toLowerCase()
      )?.id
      if (c.Employer && !employerId)
        errors.push(`Employer "${c.Employer}" isn't an active employer.`)

      const value: PatientInput = {
        ...emptyPatient(),
        firstName: first,
        lastName: last,
        dob: dob ?? "",
        sex: sex ?? "",
        email,
        phone: phone ? formatPhone(phone) : "",
        locationId: locationId ?? "",
        providerId: provider?.id ?? "",
        employerId: employerId ?? "",
      }
      if (!VALIDATE) errors.length = 0
      const outcome =
        errors.length || !first || !dob
          ? undefined
          : rowOutcome(value, items, batch.current, portal.key === "practice")
      if (!errors.length) batch.current.push({ row, value })

      return {
        row,
        label: [first, last].filter(Boolean).join(" "),
        detail: [dob ? usDate(dob) : c["Date of birth"], email]
          .filter(Boolean)
          .join(" | "),
        errors,
        outcome,
        key: email || undefined,
        value: errors.length ? undefined : value,
      }
    },
    onImport: (values) => addPatients(values, "Bulk import"),
    onResolve(rows) {
      const review: Parameters<typeof queueForReview>[0] = []
      for (const r of rows) {
        const o = r.outcome
        if (!o?.ref || !r.value) continue
        if (o.kind === "reactivate") {
          /* The file's physician when it names one, else the record's own. */
          const current = items.find((p) => p.id === o.ref)
          const named = Boolean(r.value.providerId && r.value.locationId)
          reactivatePatient(o.ref, {
            providerId: named
              ? r.value.providerId
              : (current?.providerId ?? ""),
            locationId: named
              ? r.value.locationId
              : (current?.locationId ?? ""),
          })
        } else if (o.kind === "review") {
          const check = checkDuplicate(r.value, items)
          review.push({
            incoming: r.value,
            matchId: o.ref,
            matched: check.kind === "none" ? [] : check.matched,
            source: "Bulk import",
          })
        }
      }
      if (review.length) queueForReview(review, portalUser(portal.key))
    },
    addOnly: true,
  }
}

/* -------------------------------------------------------------------------- */
/*  Screen                                                                     */
/* -------------------------------------------------------------------------- */

export function PatientsScreen() {
  const { items } = patients.use()
  const loc = useLocationLookup()
  const prov = useProviderLookup()
  const emp = useEmployerLookup()
  const importSpec = usePatientImport()
  const router = useRouter()
  const portal = usePortal()
  const { patientHref } = portal
  const syncOf = useSyncLookup()
  /* The dashboard's record status bar links here with ?record=. */
  const recordParam = useSearchParams().get("record")
  const [importing, setImporting] = React.useState(false)
  const [deactivating, setDeactivating] = React.useState<Patient | null>(null)
  const [reactivating, setReactivating] = React.useState<Patient | null>(null)
  const [discharging, setDischarging] = React.useState<Patient | null>(null)
  const [timeline, setTimeline] = React.useState<Patient | null>(null)
  const [reassigning, setReassigning] = React.useState<Patient[] | null>(null)
  /* The clinic manager hands a patient to another provider; a provider
     doesn't. A bulk reassign clears the selection once it's done. */
  const canManage = portal.key === "practice"
  const clearAfter = React.useRef<(() => void) | null>(null)

  const precheck = usePatientPrecheck()
  const openCreate = precheck.open
  useImportParam(() => setImporting(true))

  /* Marcus Hale and Olivia Bennett first, then high risk patients, until
     another column is sorted. */
  const byRisk = React.useMemo(() => {
    const pin = (p: Patient) => {
      const i = PINNED_PATIENTS.indexOf(p.id)
      return i < 0 ? PINNED_PATIENTS.length : i
    }
    return [...items].sort(
      (a, b) => pin(a) - pin(b) || riskRank(a) - riskRank(b)
    )
  }, [items])

  const columns: Column<Patient>[] = [
    {
      id: "risk",
      header: "Risk",
      className: "w-px !pr-0",
      sticky: "left",
      sortValue: riskRank,
      cell: (p) => <RiskIcon patient={p} />,
    },
    {
      id: "id",
      header: "Patient ID",
      className: `${ID_CELL} !pl-3`,
      sticky: "left",
      sortValue: (p) => p.id,
      cell: (p) => p.id,
    },
    {
      id: "name",
      header: "Name",
      className: "max-w-[14rem]",
      sticky: "left",
      sortValue: fullName,
      cell: (p) => (
        <PersonCell
          name={fullName(p)}
          photo={p.photo}
          onOpen={() => router.push(patientHref(p.id))}
        />
      ),
    },
    {
      id: "dob",
      header: "Date of birth",
      className: "hidden tabular-nums sm:table-cell",
      sortValue: (p) => p.dob,
      cell: (p) => `${usDate(p.dob)} (${ageFrom(p.dob)})`,
    },
    /* AI biological age replaces the dropped Epic risk score (15 Oct call);
       providers only. */
    ...(portal.key === "provider"
      ? [
          {
            id: "bioAge",
            header: "Bio age",
            className: "hidden tabular-nums md:table-cell",
            sortValue: bioAge,
            cell: (p) => <BioAgeCell patient={p} />,
          } satisfies Column<Patient>,
        ]
      : []),
    {
      id: "sex",
      header: "Sex",
      className: "hidden lg:table-cell",
      sortValue: (p) => p.sex,
      cell: (p) => p.sex,
    },
    {
      id: "phone",
      header: "Mobile number",
      className: "hidden tabular-nums min-[1800px]:table-cell",
      sortValue: (p) => p.phone,
      cell: (p) => p.phone,
    },
    {
      id: "email",
      header: "Email",
      className: "hidden max-w-[16rem] truncate min-[2100px]:table-cell",
      sortValue: (p) => p.email,
      cell: (p) => p.email,
    },
    {
      id: "location",
      header: "Location",
      className: "hidden md:table-cell",
      sortValue: (p) => loc.name(p.locationId),
      cell: (p) => loc.name(p.locationId),
    },
    {
      id: "provider",
      header: "Primary provider",
      className: "hidden lg:table-cell",
      sortValue: (p) => prov.name(p.providerId),
      cell: (p) => prov.name(p.providerId),
    },
    {
      id: "employer",
      header: "Employer",
      className: "hidden lg:table-cell",
      sortValue: (p) => emp.name(p.employerId),
      cell: (p) => emp.name(p.employerId),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (p) => p.status,
      cell: (p) => <StatusCell patient={p} onTimeline={setTimeline} />,
    },
    {
      id: "engaged",
      header: "Last interacted",
      className: "hidden text-muted-foreground tabular-nums lg:table-cell",
      sortValue: (p) => p.lastEngagedAt,
      cell: (p) => shortDate(p.lastEngagedAt ?? ""),
    },
    {
      id: "record",
      header: "Last sync",
      className: "hidden md:table-cell",
      /* Synced records by time, newest last; the reasons after them. */
      sortValue: (p) => {
        const s = syncOf(p)
        return s.synced ? `0 ${s.at}` : `1 ${s.label}`
      },
      cell: (p) => <SyncCell status={syncOf(p)} />,
    },
    {
      id: "actions",
      header: "Actions",
      className: "w-10 text-right",
      sticky: "right",
      cell: (p) => (
        <RowMenu label={`Actions for ${fullName(p)}`}>
          <DropdownMenuItem onClick={() => router.push(patientHref(p.id))}>
            <IconEye />
            View
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`${patientHref(p.id)}/edit`)}
          >
            <IconEdit />
            Edit
          </DropdownMenuItem>
          {canManage && canReassign(p) && (
            <DropdownMenuItem onClick={() => setReassigning([p])}>
              <IconSwitch />
              Reassign provider
            </DropdownMenuItem>
          )}
          {(p.status === "Invited" || p.status === "Declined") && (
            <DropdownMenuItem onClick={() => setTimeline(p)}>
              <IconClock />
              Invite timeline
            </DropdownMenuItem>
          )}
          {p.status === "Declined" && (
            <DropdownMenuItem onClick={() => inviteAgain(p)}>
              <IconMail />
              Invite again
            </DropdownMenuItem>
          )}
          {p.status === "Invited" && (
            <DropdownMenuItem onClick={() => resend(p)}>
              <IconMail />
              Resend invite
            </DropdownMenuItem>
          )}
          {p.status === "Active" && (
            <DropdownMenuItem onClick={() => setDischarging(p)}>
              <IconUserMinus />
              Discharge
            </DropdownMenuItem>
          )}
          {REACTIVATABLE.includes(p.status) ? (
            <DropdownMenuItem onClick={() => setReactivating(p)}>
              <IconLockOpen />
              Reactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setDeactivating(p)}>
              <IconLock />
              Deactivate
            </DropdownMenuItem>
          )}
        </RowMenu>
      ),
    },
  ]

  return (
    <PatientsFrame>
      <DuplicateQueueBanner />
      <Directory
        title="Patients"
        noun="patients"
        rows={byRisk}
        columns={columns}
        search={(p) => [p.id, fullName(p), p.email, p.phone, usDate(p.dob)]}
        filters={[
          {
            id: "location",
            label: "Location",
            all: "All locations",
            options: loc.all.map((l) => l.name),
            match: (p, v) => loc.name(p.locationId) === v,
          },
          {
            id: "provider",
            label: "Primary provider",
            all: "All providers",
            options: prov.all.map(providerName),
            match: (p, v) => prov.name(p.providerId) === v,
          },
          {
            id: "employer",
            label: "Employer",
            all: "All employers",
            options: emp.all.map((e) => e.name),
            match: (p, v) => emp.name(p.employerId) === v,
          },
          {
            id: "risk",
            label: "Risk level",
            all: "All risk levels",
            options: [...RISK_LEVELS],
            match: (p, v) => riskLevel(p) === v,
          },
          {
            id: "record",
            label: "Last sync",
            all: "All records",
            options: SYNC_FILTER,
            match: (p, v) => syncOf(p).label === v,
          },
        ]}
        statusTabs={{
          options: PATIENT_STATUSES,
          value: (p) => p.status,
        }}
        primaryAction={{
          label: "Add patient",
          icon: <IconUserAdd />,
          onClick: openCreate,
        }}
        moreActions={[
          {
            label: "Bulk add",
            icon: <IconFileUpload />,
            onClick: () => setImporting(true),
          },
        ]}
        bulkActions={(rows, clear) => (
          <>
            <BulkInviteAgain rows={rows} onDone={clear} />
            <BulkResend rows={rows} onDone={clear} />
            {canManage && (
              <BulkReassign
                rows={rows}
                onOpen={(open) => {
                  clearAfter.current = clear
                  setReassigning(open)
                }}
              />
            )}
          </>
        )}
        exportName="Patients"
        exportRow={(p) => ({
          "Patient ID": p.id,
          Name: fullName(p),
          "Date of birth": usDate(p.dob),
          "Sex at birth": p.sex,
          "Mobile number": p.phone,
          Email: p.email,
          Location: loc.name(p.locationId),
          "Primary provider": prov.name(p.providerId),
          Employer: emp.name(p.employerId),
          Status: p.status,
          "Risk level": riskLevel(p),
          "Last interacted": shortDate(p.lastEngagedAt ?? ""),
          "Last sync": syncOf(p).text,
        })}
        emptyIllustration="patients-empty"
        initialFilters={
          recordParam && SYNC_FILTER.includes(recordParam)
            ? { record: recordParam }
            : undefined
        }
      />

      <BulkImportDialog
        open={importing}
        onOpenChange={setImporting}
        spec={importSpec}
      />

      {precheck.dialog}

      <ReactivateDialog
        patient={reactivating}
        onClose={() => setReactivating(null)}
      />

      <ReassignProviderDialog
        rows={reassigning}
        onClose={() => {
          setReassigning(null)
          clearAfter.current = null
        }}
        onDone={() => clearAfter.current?.()}
      />

      <InviteTimelineSheet
        patient={timeline}
        onClose={() => setTimeline(null)}
      />

      <DeactivateDialog
        illustration="deactivate-person"
        target={deactivating ? fullName(deactivating) : null}
        message="They can no longer sign in to the patient app. Their record stays with the practice."
        onCancel={() => setDeactivating(null)}
        onConfirm={() => {
          if (!deactivating) return
          patients.patch(deactivating.id, {
            status: "Inactive",
            inactiveReason: "Deactivated",
          })
          toast.success(`${fullName(deactivating)} is deactivated`)
          setDeactivating(null)
        }}
      />

      <DeactivateDialog
        illustration="deactivate-person"
        verb="Discharge"
        target={discharging ? fullName(discharging) : null}
        message="Their care with the practice ends and they can no longer sign in to the patient app. Their record stays with the practice."
        onCancel={() => setDischarging(null)}
        onConfirm={() => {
          if (!discharging) return
          patients.patch(discharging.id, {
            status: "Inactive",
            inactiveReason: "Discharged",
          })
          toast.success(`${fullName(discharging)} is discharged`)
          setDischarging(null)
        }}
      />
    </PatientsFrame>
  )
}

/** Opens the bulk add dialog when the command palette lands with ?import=1. */
function useImportParam(open: () => void) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  React.useEffect(() => {
    if (params.get("import") !== "1") return
    open()
    router.replace(pathname)
  }, [params, open, router, pathname])
}
