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
  IconUser,
  IconUserAdd,
} from "@/design-system/icons"

import { EMAIL, VALIDATE, digits, formatPhone } from "@/components/form-kit"
import {
  BulkImportDialog,
  type ImportSpec,
  type ParsedRow,
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
  shortDate,
  useLocationLookup,
  useProviderLookup,
  usDate,
} from "@/components/practice/practice-data"
import { PatientsFrame, usePortal } from "@/components/practice/portal"
import { DeactivateDialog } from "@/components/practice/sheets"
import { findDuplicate } from "@/components/practice/patient-record"
import { Button } from "@/design-system/ui/button"
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
          pending.length === 1 ? "Invite sent" : `${pending.length} invites sent`
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

function usePatientImport(): ImportSpec<PatientInput> {
  const { items } = patients.use()
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
      if (!errors.length && items.some((p) => p.email.toLowerCase() === email))
        errors.push("A patient with this email already exists.")
      if (!VALIDATE) errors.length = 0
      const duplicate = errors.length ? undefined : findDuplicate(value, items)

      return {
        row,
        label: [first, last].filter(Boolean).join(" "),
        detail: [dob ? usDate(dob) : c["Date of birth"], email]
          .filter(Boolean)
          .join(" | "),
        errors,
        warning: duplicate
          ? `Matches ${fullName(duplicate)} (${duplicate.id}) on name, date of birth and contact.`
          : undefined,
        key: email || undefined,
        value: errors.length ? undefined : value,
      }
    },
    onImport: (values) => addPatients(values, "Bulk import"),
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
  const [importing, setImporting] = React.useState(false)
  const [deactivating, setDeactivating] = React.useState<Patient | null>(null)

  const openCreate = () => router.push(portal.newPatientHref)
  useImportParam(() => setImporting(true))

  const columns: Column<Patient>[] = [
    {
      id: "id",
      header: "Patient ID",
      className: ID_CELL,
      cell: (p) => p.id,
    },
    {
      id: "name",
      header: "Name",
      className: "max-w-[14rem]",
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
      cell: (p) => `${usDate(p.dob)} (${ageFrom(p.dob)})`,
    },
    {
      id: "sex",
      header: "Sex",
      className: "hidden lg:table-cell",
      cell: (p) => p.sex,
    },
    {
      id: "phone",
      header: "Mobile number",
      className: "hidden tabular-nums xl:table-cell",
      cell: (p) => p.phone,
    },
    {
      id: "email",
      header: "Email",
      className: "hidden max-w-[16rem] truncate 2xl:table-cell",
      cell: (p) => p.email,
    },
    {
      id: "location",
      header: "Location",
      className: "hidden md:table-cell",
      cell: (p) => loc.name(p.locationId),
    },
    {
      id: "provider",
      header: "Primary provider",
      className: "hidden lg:table-cell",
      cell: (p) => prov.name(p.providerId),
    },
    {
      id: "invited",
      header: "Invited",
      className: "hidden text-muted-foreground tabular-nums xl:table-cell",
      cell: (p) => shortDate(p.invitedAt),
    },
    {
      id: "status",
      header: "Status",
      cell: (p) => <StatusBadge status={p.status} />,
    },
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
          {p.status === "Not invited" && (
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
          <DropdownMenuItem
            onClick={() => {
              if (p.status !== "Inactive") return setDeactivating(p)
              patients.patch(p.id, { status: "Active" })
              toast.success(`${fullName(p)} is active again`)
            }}
          >
            {p.status === "Inactive" ? <IconLockOpen /> : <IconLock />}
            {p.status === "Inactive" ? "Activate" : "Deactivate"}
          </DropdownMenuItem>
        </RowMenu>
      ),
    },
  ]

  return (
    <PatientsFrame>
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
        ]}
        statusTabs={{
          options: ["Active", "Invited", "Not invited", "Inactive"],
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
        })}
        emptyIcon={<IconUser />}
      />

      <BulkImportDialog
        open={importing}
        onOpenChange={setImporting}
        spec={importSpec}
      />

      <DeactivateDialog
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
