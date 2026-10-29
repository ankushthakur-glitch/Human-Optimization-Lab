"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/design-system/ui/sonner"
import {
  IconAdd,
  IconEdit,
  IconEye,
  IconLock,
  IconLockOpen,
} from "@/design-system/icons"

import {
  Directory,
  ID_CELL,
  PersonCell,
  RowMenu,
  StatusBadge,
  type Column,
} from "@/components/practice/directory"
import { locationHref } from "@/components/practice/location-record"
import {
  type Location,
  PLACES_OF_SERVICE,
  SPECIALTY_TYPES,
  locations,
  personAddress,
  providers,
} from "@/components/practice/practice-data"
import { PracticeShell } from "@/components/practice/practice-shell"
import { DeactivateDialog } from "@/components/practice/sheets"
import { Badge } from "@/design-system/ui/badge"
import { DropdownMenuItem } from "@/design-system/ui/dropdown-menu"

/* The location list. Adding, viewing and editing a location happen on full
   pages (see location-record.tsx). */

export const NEW_LOCATION_HREF = "/screens/practice/locations/new"

export function LocationsScreen() {
  const router = useRouter()
  const { items } = locations.use()
  const { items: allProviders } = providers.use()
  const [deactivating, setDeactivating] = React.useState<Location | null>(null)

  const providerCount = (id: string) =>
    allProviders.filter(
      (p) => p.status !== "Inactive" && p.locationIds.includes(id)
    ).length

  const columns: Column<Location>[] = [
    {
      id: "id",
      header: "Location ID",
      className: ID_CELL,
      sortValue: (l) => l.id,
      cell: (l) => l.id,
    },
    {
      id: "name",
      header: "Location name",
      className: "max-w-[14rem]",
      sortValue: (l) => l.name,
      cell: (l) => (
        <PersonCell
          name={l.name}
          photo={l.photo}
          onOpen={() => router.push(locationHref(l.id))}
          badge={l.primary ? <Badge variant="info">Primary</Badge> : undefined}
        />
      ),
    },
    {
      id: "specialty",
      header: "Specialties",
      className: "hidden lg:table-cell",
      sortValue: (l) => l.specialtyType,
      cell: (l) => l.specialtyType,
    },
    {
      id: "address",
      header: "Address",
      className:
        "hidden max-w-[16rem] truncate text-muted-foreground xl:table-cell",
      sortValue: (l) => [l.address1, l.address2].filter(Boolean).join(", "),
      cell: (l) => [l.address1, l.address2].filter(Boolean).join(", "),
    },
    {
      id: "city",
      header: "City",
      className: "hidden md:table-cell",
      sortValue: (l) => l.city,
      cell: (l) => l.city,
    },
    {
      id: "state",
      header: "State",
      className: "hidden md:table-cell",
      sortValue: (l) => l.state,
      cell: (l) => l.state,
    },
    {
      id: "zip",
      header: "ZIP code",
      className: "hidden tabular-nums lg:table-cell",
      sortValue: (l) => l.zip,
      cell: (l) => l.zip,
    },
    {
      id: "phone",
      header: "Contact number",
      className: "hidden tabular-nums sm:table-cell",
      sortValue: (l) => l.phone,
      cell: (l) => l.phone,
    },
    {
      id: "status",
      header: "Status",
      sortValue: (l) => l.status,
      cell: (l) => <StatusBadge status={l.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      className: "w-10 text-right",
      cell: (l) => (
        <RowMenu label={`Actions for ${l.name}`}>
          <DropdownMenuItem onClick={() => router.push(locationHref(l.id))}>
            <IconEye />
            View
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`${locationHref(l.id)}/edit`)}
          >
            <IconEdit />
            Edit
          </DropdownMenuItem>
          {/* The practice's primary location can't go offline. */}
          {!l.primary && (
            <DropdownMenuItem
              onClick={() => {
                if (l.status === "Active") return setDeactivating(l)
                locations.patch(l.id, { status: "Active" })
                toast.success(`${l.name} is active again`)
              }}
            >
              {l.status === "Active" ? <IconLock /> : <IconLockOpen />}
              {l.status === "Active" ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
          )}
        </RowMenu>
      ),
    },
  ]

  return (
    <PracticeShell active="locations">
      <Directory
        title="Locations"
        noun="locations"
        rows={items}
        columns={columns}
        search={(l) => [
          l.id,
          l.name,
          l.city,
          l.state,
          l.zip,
          l.address1,
          l.phone,
          l.specialtyType,
        ]}
        filters={[
          {
            id: "specialty",
            label: "Specialty",
            all: "All specialties",
            options: SPECIALTY_TYPES,
            match: (l, v) => l.specialtyType === v,
          },
          {
            id: "pos",
            label: "Place of service",
            all: "Any place of service",
            options: PLACES_OF_SERVICE,
            match: (l, v) => l.placeOfService === v,
          },
        ]}
        statusTabs={{ options: ["Active", "Inactive"], value: (l) => l.status }}
        primaryAction={{
          label: "Add location",
          icon: <IconAdd />,
          onClick: () => router.push(NEW_LOCATION_HREF),
        }}
        hideExport
        exportName="Locations"
        exportRow={(l) => ({
          "Location ID": l.id,
          "Location name": l.name,
          Specialty: l.specialtyType,
          "Place of service": l.placeOfService,
          "Practice address": personAddress(l),
          "Contact number": l.phone,
          Email: l.email,
          "Group NPI": l.groupNpi,
          Providers: providerCount(l.id),
          Status: l.status,
        })}
        emptyIllustration="locations-empty"
      />

      <DeactivateDialog
        illustration="deactivate-location"
        target={deactivating?.name ?? null}
        message="Patients can no longer be booked here and it leaves provider and staff pickers. Its records stay."
        onCancel={() => setDeactivating(null)}
        onConfirm={() => {
          if (!deactivating) return
          locations.patch(deactivating.id, { status: "Inactive" })
          toast.success(`${deactivating.name} is deactivated`)
          setDeactivating(null)
        }}
      />
    </PracticeShell>
  )
}
