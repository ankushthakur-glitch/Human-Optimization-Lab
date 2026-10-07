"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/design-system/ui/sonner"
import {
  IconEdit,
  IconEye,
  IconFileUpload,
  IconLock,
  IconLockOpen,
  IconMail,
  IconUserAdd,
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
  REACTIVATABLE,
  reactivatePatient,
  shortDate,
  useLocationLookup,
  useProviderLookup,
  usDate,
} from "@/components/practice/practice-data"
import { PatientsFrame, usePortal } from "@/components/practice/portal"
import {
  type RecordState,
  recordSyncs,
  syncStatusFor,
} from "@/components/practice/health-record"
import { DeactivateDialog } from "@/components/practice/sheets"
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
import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { Badge } from "@/design-system/ui/badge"
import { DropdownMenuItem } from "@/design-system/ui/dropdown-menu"

/* The patient list, in the clinic manager's portal and a provider's (see
   portal.tsx). Onboarding a patient and their profile are full pages (see
   patient-record.tsx). */

function sendInvite(p: Patient) {
  sendPatientInvites([p.id])
  toast.success("Invite sent", {
    description: `${fullName(p)} will get an email to join the patient portal.`,
  })
}

function resend(p: Patient) {
  toast.success("Invite resent", {
    description: `A fresh link went to ${p.email}.`,
  })
}

/* The provider sees where each chart stands with Health Gorilla: the same
   state and last sync the chart's banner shows. The clinic manager gets no
   record data, so the column is the provider's only. */

const SYNC_LABEL: Record<RecordState, string> = {
  Active: "Synced",
  Building: "Record building",
  "Source exception": "Sync failed",
  "Awaiting consent": "Waiting for consent",
}

const SYNC_VARIANT: Record<
  RecordState,
  "success" | "warning" | "destructive" | "secondary"
> = {
  Active: "success",
  Building: "warning",
  "Source exception": "destructive",
  "Awaiting consent": "secondary",
}

const SYNC_FILTER = [
  "Synced",
  "Record building",
  "Sync failed",
  "Waiting for consent",
  "Invited, not joined",
  "Consent withdrawn",
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
    /* Before consent: enrolled and not yet consented, or invited and not
       yet joined (the dashboard's record states). */
    const label =
      p.status === "Consent withdrawn"
        ? "Consent withdrawn"
        : s.state === "Awaiting consent"
          ? p.status === "Active"
            ? "Waiting for consent"
            : "Invited, not joined"
          : SYNC_LABEL[s.state]
    return { ...s, label }
  }
}

function SyncBadge({
  status,
}: {
  status: ReturnType<ReturnType<typeof useSyncLookup>>
}) {
  return <Badge variant={SYNC_VARIANT[status.state]}>{status.label}</Badge>
}

/** The selection's bulk action for patients added without the portal invite. */
function BulkSendInvite({
  rows,
  onDone,
}: {
  rows: Patient[]
  onDone: () => void
}) {
  const pending = rows.filter((p) => p.status === "Not invited")
  if (pending.length === 0) return null
  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-md"
      onClick={() => {
        sendPatientInvites(pending.map((p) => p.id))
        toast.success(
          pending.length === 1
            ? "Invite sent"
            : `${pending.length} invites sent`
        )
        onDone()
      }}
    >
      <IconMail />
      Send invites ({pending.length})
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
            status: "Not invited",
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
  const activeLocations = loc.active.map((l) => l.name)
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
  const importSpec = usePatientImport()
  const router = useRouter()
  const portal = usePortal()
  const { patientHref } = portal
  const isProvider = portal.key === "provider"
  const syncOf = useSyncLookup()
  /* The dashboard's record status bar links here with ?record=. */
  const recordParam = useSearchParams().get("record")
  const [importing, setImporting] = React.useState(false)
  const [deactivating, setDeactivating] = React.useState<Patient | null>(null)
  const [reactivating, setReactivating] = React.useState<Patient | null>(null)

  const precheck = usePatientPrecheck()
  const openCreate = precheck.open
  useImportParam(() => setImporting(true))

  const columns: Column<Patient>[] = [
    {
      id: "id",
      header: "Patient ID",
      className: ID_CELL,
      sortValue: (p) => p.id,
      cell: (p) => p.id,
    },
    {
      id: "name",
      header: "Name",
      className: "max-w-[14rem]",
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
      className: cn(
        "hidden tabular-nums",
        isProvider ? "min-[1800px]:table-cell" : "xl:table-cell"
      ),
      sortValue: (p) => p.phone,
      cell: (p) => p.phone,
    },
    {
      id: "email",
      header: "Email",
      className: cn(
        "hidden max-w-[16rem] truncate",
        isProvider ? "min-[2100px]:table-cell" : "2xl:table-cell"
      ),
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
    ...(isProvider
      ? []
      : [
          {
            id: "invited",
            header: "Invited",
            className:
              "hidden text-muted-foreground tabular-nums xl:table-cell",
            sortValue: (p: Patient) => p.invitedAt,
            cell: (p: Patient) => shortDate(p.invitedAt),
          },
        ]),
    {
      id: "status",
      header: "Status",
      sortValue: (p) => p.status,
      cell: (p) => <StatusBadge status={p.status} />,
    },
    ...(isProvider
      ? [
          {
            id: "record",
            header: "Health record",
            className: "hidden md:table-cell",
            sortValue: (p: Patient) => syncOf(p).label,
            cell: (p: Patient) => <SyncBadge status={syncOf(p)} />,
          },
          {
            id: "synced",
            header: "Last sync",
            className:
              "hidden text-muted-foreground tabular-nums xl:table-cell",
            sortValue: (p: Patient) => syncOf(p).at,
            cell: (p: Patient) => {
              const { at } = syncOf(p)
              return at ? syncedAt(at) : ""
            },
          },
        ]
      : []),
    {
      id: "actions",
      header: "Actions",
      className: "w-10 text-right",
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
          {(p.status === "Not invited" || p.status === "Declined") && (
            <DropdownMenuItem onClick={() => sendInvite(p)}>
              <IconMail />
              Send invite
            </DropdownMenuItem>
          )}
          {p.status === "Invited" && (
            <DropdownMenuItem onClick={() => resend(p)}>
              <IconMail />
              Resend invite
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
        rows={items}
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
          ...(isProvider
            ? [
                {
                  id: "record",
                  label: "Health record",
                  all: "All records",
                  options: SYNC_FILTER,
                  match: (p: Patient, v: string) => syncOf(p).label === v,
                },
              ]
            : []),
        ]}
        statusTabs={{
          options: ["Active", "Inactive"],
          /* Only Active patients count as active; every other status sits
             under Inactive, told apart by its badge. */
          value: (p) => (p.status === "Active" ? "Active" : "Inactive"),
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
            <BulkSendInvite rows={rows} onDone={clear} />
            <BulkResend rows={rows} onDone={clear} />
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
          Invited: shortDate(p.invitedAt),
          Status: p.status,
          ...(isProvider && {
            "Health record": syncOf(p).label,
            "Last sync": syncOf(p).at ? syncedAt(syncOf(p).at) : "",
          }),
        })}
        emptyIllustration="patients-empty"
        initialFilters={
          isProvider && recordParam && SYNC_FILTER.includes(recordParam)
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

      <DeactivateDialog
        illustration="deactivate-person"
        target={deactivating ? fullName(deactivating) : null}
        message="They can no longer sign in to the patient app. Their record stays with the practice."
        onCancel={() => setDeactivating(null)}
        onConfirm={() => {
          if (!deactivating) return
          patients.patch(deactivating.id, { status: "Inactive" })
          toast.success(`${fullName(deactivating)} is deactivated`)
          setDeactivating(null)
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
