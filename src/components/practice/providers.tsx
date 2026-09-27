"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/design-system/ui/sonner"
import {
  IconEdit,
  IconEye,
  IconFileUpload,
  IconLock,
  IconLockOpen,
  IconMail,
  IconStethoscope,
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
  BulkResend,
  Directory,
  ID_CELL,
  PersonCell,
  RowMenu,
  StatusBadge,
  type Column,
} from "@/components/practice/directory"
import {
  CREDENTIALS,
  GENDERS,
  PROVIDER_ROLES,
  type Provider,
  type ProviderInput,
  SPECIALTIES,
  US_STATES,
  emptyProvider,
  fullName,
  inviteProviders,
  providerName,
  providers,
  shortDate,
  useLocationLookup,
} from "@/components/practice/practice-data"
import { providerHref, validNpi } from "@/components/practice/provider-record"
import { DeactivateDialog } from "@/components/practice/sheets"
import { DropdownMenuItem } from "@/design-system/ui/dropdown-menu"

/* The provider list, the first tab of Users. Adding, viewing and editing a
   provider happen on full pages (see provider-record.tsx). */

export const NEW_HREF = "/screens/practice/users/providers/new"

function resend(p: Provider) {
  toast.success("Invite resent", {
    description: `A fresh link went to ${p.email}.`,
  })
}

/* -------------------------------------------------------------------------- */
/*  Bulk import                                                                */
/* -------------------------------------------------------------------------- */

function useProviderImport(): ImportSpec<ProviderInput> {
  const { items } = providers.use()
  const loc = useLocationLookup()
  const activeNames = loc.active.map((l) => l.name)

  return {
    one: "provider",
    many: "providers",
    sheetName: "Providers",
    fileName: "Provider reference sheet.xlsx",
    columns: [
      { header: "First name", required: true, example: "Avery", width: 16 },
      { header: "Middle name", example: "J", width: 14 },
      { header: "Last name", required: true, example: "Sutherland", width: 16 },
      {
        header: "Credential",
        required: true,
        example: "MD",
        options: CREDENTIALS,
        width: 12,
      },
      {
        header: "NPI",
        required: true,
        example: "1234567893",
        width: 14,
      },
      {
        header: "Email",
        required: true,
        example: "avery.sutherland@practice.com",
        width: 32,
      },
      { header: "Mobile number", example: "(858)-555-0100", width: 16 },
      {
        header: "Role",
        required: true,
        example: "Provider",
        options: PROVIDER_ROLES,
        width: 20,
      },
      {
        header: "Specialty",
        example: "Internal Medicine",
        options: SPECIALTIES,
        width: 20,
      },
      {
        header: "Locations",
        required: true,
        example: activeNames.slice(0, 2).join(", "),
        options: activeNames,
        width: 26,
      },
      { header: "Date of birth", example: "04/18/1981", width: 14 },
      { header: "Gender", example: "Female", options: GENDERS, width: 14 },
      { header: "License state", example: "CA", width: 14 },
      { header: "License number", example: "A123456", width: 16 },
      { header: "License expiry", example: "06/30/2028", width: 16 },
    ],
    parse(c, row): ParsedRow<ProviderInput> {
      const errors: string[] = []
      const first = c["First name"]
      const last = c["Last name"]
      if (!first) errors.push("First name is missing.")
      if (!last) errors.push("Last name is missing.")

      const credential = pick(CREDENTIALS, c.Credential)
      if (!c.Credential) errors.push("Credential is missing.")
      else if (!credential)
        errors.push(
          `Credential "${c.Credential}" isn't one of ${CREDENTIALS.join(", ")}.`
        )

      const npi = digits(c.NPI)
      if (!npi) errors.push("NPI is missing.")
      else if (!validNpi(npi)) errors.push("NPI isn't a valid 10-digit NPI.")
      else if (items.some((p) => p.npi === npi))
        errors.push("A provider with this NPI already exists.")

      const email = c.Email.toLowerCase()
      if (!email) errors.push("Email is missing.")
      else if (!EMAIL.test(email)) errors.push("Email isn't valid.")
      else if (items.some((p) => p.email.toLowerCase() === email))
        errors.push("A provider with this email already exists.")

      const phone = c["Mobile number"]
      if (phone && digits(phone).length !== 10)
        errors.push("Mobile number needs 10 digits.")

      const role = pick(PROVIDER_ROLES, c.Role || "Provider")
      if (!role)
        errors.push(
          `Role "${c.Role}" isn't one of ${PROVIDER_ROLES.join(", ")}.`
        )

      const specialty = c.Specialty ? pick(SPECIALTIES, c.Specialty) : ""
      if (specialty === undefined)
        errors.push(`Specialty "${c.Specialty}" isn't in the list.`)

      const names = c.Locations.split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
      const locationIds: string[] = []
      if (names.length === 0) errors.push("Locations is missing.")
      names.forEach((name) => {
        const id = loc.active.find(
          (l) => l.name.toLowerCase() === name.toLowerCase()
        )?.id
        if (id) locationIds.push(id)
        else errors.push(`Location "${name}" doesn't exist.`)
      })

      const dob = c["Date of birth"] ? isoFromUsDate(c["Date of birth"]) : ""
      if (dob === null) errors.push("Date of birth isn't a date (MM/DD/YYYY).")
      const gender = c.Gender ? pick(GENDERS, c.Gender) : ""
      if (gender === undefined)
        errors.push(`Gender "${c.Gender}" isn't in the list.`)
      const licenseState = c["License state"]
        ? pick(US_STATES, c["License state"])
        : "CA"
      if (licenseState === undefined)
        errors.push("License state isn't a US state code.")
      const expiry = c["License expiry"]
        ? isoFromUsDate(c["License expiry"])
        : ""
      if (expiry === null)
        errors.push("License expiry isn't a date (MM/DD/YYYY).")

      if (!VALIDATE) errors.length = 0
      const label = [first, last].filter(Boolean).join(" ")
      return {
        row,
        label: credential && label ? `${label}, ${credential}` : label,
        detail: [email, names.join(", ")].filter(Boolean).join(" | "),
        errors,
        key: npi || email || undefined,
        value: errors.length
          ? undefined
          : {
              ...emptyProvider(),
              credential: credential ?? "",
              firstName: first,
              middleName: c["Middle name"],
              lastName: last,
              dob: dob ?? "",
              gender: gender ?? "",
              npi,
              specialty: specialty ?? "",
              role: role ?? "Provider",
              email,
              phone: phone ? formatPhone(phone) : "",
              locationIds,
              licenses: c["License number"]
                ? [
                    {
                      type: "State Medical License",
                      state: licenseState ?? "CA",
                      number: c["License number"],
                      expiry: expiry ?? "",
                    },
                  ]
                : [],
            },
      }
    },
    onImport: (values) => inviteProviders(values),
  }
}

/* -------------------------------------------------------------------------- */
/*  Screen                                                                     */
/* -------------------------------------------------------------------------- */

export function ProvidersPanel({ heading }: { heading: React.ReactNode }) {
  const { items } = providers.use()
  const loc = useLocationLookup()
  const importSpec = useProviderImport()
  const router = useRouter()
  const [importing, setImporting] = React.useState(false)
  const [deactivating, setDeactivating] = React.useState<Provider | null>(null)

  const openCreate = () => router.push(NEW_HREF)

  const locationNames = (p: Provider) =>
    p.locationIds.map(loc.name).filter(Boolean).join(", ")

  const columns: Column<Provider>[] = [
    {
      id: "id",
      header: "Provider ID",
      className: ID_CELL,
      cell: (p) => p.id,
    },
    {
      id: "name",
      header: "Name",
      className: "max-w-[14rem]",
      cell: (p) => (
        <PersonCell
          name={providerName(p)}
          photo={p.photo}
          onOpen={() => router.push(providerHref(p.id))}
        />
      ),
    },
    {
      id: "role",
      header: "Role type",
      className: "hidden lg:table-cell",
      cell: (p) => p.role,
    },
    {
      id: "npi",
      header: "NPI number",
      className: "hidden tabular-nums md:table-cell",
      cell: (p) => p.npi,
    },
    {
      id: "phone",
      header: "Phone number",
      className: "hidden tabular-nums xl:table-cell",
      cell: (p) => p.phone,
    },
    {
      id: "email",
      header: "Email",
      className: "hidden max-w-[16rem] truncate lg:table-cell",
      cell: (p) => p.email,
    },
    {
      id: "login",
      header: "Last login",
      className: "hidden text-muted-foreground tabular-nums sm:table-cell",
      cell: (p) => shortDate(p.lastLogin) || "Never",
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
        <RowMenu label={`Actions for ${providerName(p)}`}>
          <DropdownMenuItem onClick={() => router.push(providerHref(p.id))}>
            <IconEye />
            View
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`${providerHref(p.id)}/edit`)}
          >
            <IconEdit />
            Edit
          </DropdownMenuItem>
          {p.status === "Invited" && (
            <DropdownMenuItem onClick={() => resend(p)}>
              <IconMail />
              Resend invite
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => {
              if (p.status !== "Inactive") return setDeactivating(p)
              providers.patch(p.id, {
                status: p.lastLogin ? "Active" : "Invited",
              })
              toast.success(`${providerName(p)} is active again`)
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
    <>
      <Directory
        title="Providers"
        heading={heading}
        noun="providers"
        rows={items}
        columns={columns}
        search={(p) => [
          p.id,
          fullName(p),
          p.npi,
          p.email,
          p.specialty,
          locationNames(p),
        ]}
        filters={[
          {
            id: "status",
            label: "Status",
            all: "All statuses",
            options: ["Active", "Invited", "Inactive"],
            match: (p, v) => p.status === v,
          },
          {
            id: "role",
            label: "Role",
            all: "All roles",
            options: PROVIDER_ROLES,
            match: (p, v) => p.role === v,
          },
          {
            id: "location",
            label: "Location",
            all: "All locations",
            options: loc.all.map((l) => l.name),
            match: (p, v) => p.locationIds.some((id) => loc.name(id) === v),
          },
        ]}
        primaryAction={{
          label: "Add provider",
          icon: <IconStethoscope />,
          onClick: openCreate,
        }}
        moreActions={[
          {
            label: "Bulk add",
            icon: <IconFileUpload />,
            onClick: () => setImporting(true),
          },
        ]}
        bulkActions={(rows, clear) => <BulkResend rows={rows} onDone={clear} />}
        exportName="Providers"
        exportRow={(p) => ({
          "Provider ID": p.id,
          Name: fullName(p),
          Credential: p.credential,
          Role: p.role,
          Specialty: p.specialty,
          NPI: p.npi,
          Locations: locationNames(p),
          "Mobile number": p.phone,
          Email: p.email,
          "Last login": shortDate(p.lastLogin),
          Status: p.status,
        })}
        emptyIllustration="providers-empty"
      />

      <BulkImportDialog
        open={importing}
        onOpenChange={setImporting}
        spec={importSpec}
      />

      <DeactivateDialog
        illustration="deactivate-provider"
        target={deactivating ? providerName(deactivating) : null}
        message="They lose access to the portal and leave provider pickers. Their patients and history stay with the practice."
        onCancel={() => setDeactivating(null)}
        onConfirm={() => {
          if (!deactivating) return
          providers.patch(deactivating.id, { status: "Inactive" })
          toast.success(`${providerName(deactivating)} is deactivated`)
          setDeactivating(null)
        }}
      />
    </>
  )
}
