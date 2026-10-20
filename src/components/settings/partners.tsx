"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import {
  IconAdd,
  IconEdit,
  IconLock,
  IconLockOpen,
} from "@/design-system/icons"

import { REGIONS } from "@/components/admin/practices-store"
import {
  MultiSelectField,
  SelectField,
  TextField,
  formatPhone,
} from "@/components/form-kit"
import { createCollection } from "@/components/practice/collection-store"
import {
  type Column,
  Directory,
  RowMenu,
} from "@/components/practice/directory"
import {
  SettingsBack,
  SettingsHeading,
  StatusDot,
} from "@/components/settings/settings-kit"
import { Button } from "@/design-system/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import { DropdownMenuItem } from "@/design-system/ui/dropdown-menu"

/* Inlay's partners by location, for referral routing: the labs, pharmacies,
   imaging and DEXA centers a patient in a region is sent to. Sample data
   until Edward's list arrives; it changes by location. */

export const PARTNER_TYPES = [
  "Lab",
  "Pharmacy",
  "Imaging",
  "DEXA",
  "Specialist",
] as const

export type Partner = {
  id: string
  name: string
  type: string
  regions: string[]
  services: string
  phone: string
  website: string
  status: "Active" | "Inactive"
}

const ALL = [...REGIONS]

const SEED: Partner[] = [
  {
    name: "Quest Diagnostics",
    type: "Lab",
    regions: ALL,
    services: "Blood panels, ApoB, Lp(a), A1C",
    phone: "(866)-697-8378",
    website: "questdiagnostics.com",
  },
  {
    name: "Labcorp",
    type: "Lab",
    regions: ALL,
    services: "Blood panels, hormones, urine albumin",
    phone: "(800)-845-6167",
    website: "labcorp.com",
  },
  {
    name: "BodySpec",
    type: "DEXA",
    regions: [
      "Southern California",
      "Northern California",
      "Texas",
      "Arizona",
      "Pacific Northwest",
    ],
    services: "DEXA body composition, bone density",
    phone: "(415)-555-0142",
    website: "bodyspec.com",
  },
  {
    name: "RadNet Imaging",
    type: "Imaging",
    regions: ["Southern California", "New York", "Mid-Atlantic"],
    services: "Coronary calcium scan, MRI, ultrasound",
    phone: "(310)-555-0177",
    website: "radnet.com",
  },
  {
    name: "Prenuvo",
    type: "Imaging",
    regions: ["Southern California", "New York", "Florida", "Texas"],
    services: "Full-body MRI",
    phone: "(888)-555-0119",
    website: "prenuvo.com",
  },
  {
    name: "CVS Pharmacy",
    type: "Pharmacy",
    regions: ALL,
    services: "Prescriptions, vaccines",
    phone: "(800)-555-0187",
    website: "cvs.com",
  },
  {
    name: "Walgreens",
    type: "Pharmacy",
    regions: ALL,
    services: "Prescriptions, vaccines",
    phone: "(800)-555-0134",
    website: "walgreens.com",
  },
  {
    name: "Henry Ford Health Imaging",
    type: "Imaging",
    regions: ["Detroit", "Southeast Michigan"],
    services: "Coronary calcium scan, DEXA",
    phone: "(313)-555-0166",
    website: "henryford.com",
  },
  {
    name: "Meijer Pharmacy",
    type: "Pharmacy",
    regions: ["Detroit", "Southeast Michigan", "Southwest Michigan", "Midwest"],
    services: "Prescriptions",
    phone: "(616)-555-0128",
    website: "meijer.com",
  },
  {
    name: "Scripps Cardiology",
    type: "Specialist",
    regions: ["Southern California"],
    services: "Cardiology referrals",
    phone: "(858)-555-0193",
    website: "scripps.org",
  },
].map((p, i) => ({
  ...p,
  id: `PT${String(i + 1).padStart(3, "0")}`,
  status: "Active" as const,
}))

export const partners = createCollection(
  "hol-settings-partners",
  SEED,
  "partners-v1"
)

const regionsLabel = (p: Partner) =>
  p.regions.length === REGIONS.length
    ? "All regions"
    : p.regions.length > 2
      ? `${p.regions.slice(0, 2).join(", ")} +${p.regions.length - 2}`
      : p.regions.join(", ")

export function PartnersPage() {
  const { items } = partners.use()
  const [editing, setEditing] = React.useState<Partner | "new" | null>(null)

  const columns: Column<Partner>[] = [
    {
      id: "id",
      header: "ID",
      className: "hidden w-20 text-primary-tint tabular-nums md:table-cell",
      cell: (p) => p.id,
      sortValue: (p) => p.id,
    },
    {
      id: "name",
      header: "Partner",
      cell: (p) => (
        <Button
          variant="link"
          className="h-auto p-0 font-medium text-foreground"
          onClick={() => setEditing(p)}
        >
          {p.name}
        </Button>
      ),
      sortValue: (p) => p.name,
    },
    {
      id: "type",
      header: "Type",
      className: "w-28 text-foreground/80",
      cell: (p) => p.type,
      sortValue: (p) => p.type,
    },
    {
      id: "regions",
      header: "Locations",
      className: "hidden lg:table-cell text-foreground/80",
      cell: (p) => regionsLabel(p),
    },
    {
      id: "services",
      header: "Services",
      className: "hidden max-w-72 truncate xl:table-cell text-foreground/80",
      cell: (p) => p.services,
    },
    {
      id: "phone",
      header: "Phone",
      className: "hidden tabular-nums md:table-cell",
      cell: (p) => p.phone,
    },
    {
      id: "status",
      header: "Status",
      cell: (p) => (
        <StatusDot tone={p.status === "Active" ? "success" : "muted"}>
          {p.status}
        </StatusDot>
      ),
    },
    {
      id: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (p) => (
        <RowMenu label={`Actions for ${p.name}`}>
          <DropdownMenuItem onClick={() => setEditing(p)}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const status = p.status === "Active" ? "Inactive" : "Active"
              partners.patch(p.id, { status })
              toast.success(
                status === "Active"
                  ? `${p.name} activated`
                  : `${p.name} deactivated`
              )
            }}
          >
            {p.status === "Active" ? <IconLock /> : <IconLockOpen />}
            {p.status === "Active" ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
        </RowMenu>
      ),
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory
        title="Partners"
        leading={<SettingsBack />}
        heading={<SettingsHeading />}
        noun="partners"
        rows={items}
        columns={columns}
        search={(p) => [p.id, p.name, p.type, p.services, ...p.regions]}
        filters={[
          {
            id: "region",
            label: "Location",
            all: "All locations",
            options: REGIONS,
            match: (p, v) => p.regions.includes(v),
          },
          {
            id: "type",
            label: "Type",
            all: "All types",
            options: PARTNER_TYPES,
            match: (p, v) => p.type === v,
          },
          {
            id: "status",
            label: "Status",
            all: "Any status",
            options: ["Active", "Inactive"],
            match: (p, v) => p.status === v,
          },
        ]}
        primaryAction={{
          label: "Add partner",
          icon: <IconAdd />,
          onClick: () => setEditing("new"),
        }}
        exportName="Partners"
        exportRow={(p) => ({
          ID: p.id,
          Partner: p.name,
          Type: p.type,
          Locations: p.regions.join(", "),
          Services: p.services,
          Phone: p.phone,
          Website: p.website,
          Status: p.status,
        })}
        emptyIllustration="no-results"
      />
      <Dialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent className="sm:max-w-xl">
          {editing && (
            <PartnerForm
              partner={editing === "new" ? null : editing}
              count={items.length}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PartnerForm({
  partner,
  count,
  onClose,
}: {
  partner: Partner | null
  count: number
  onClose: () => void
}) {
  const [draft, setDraft] = React.useState({
    name: partner?.name ?? "",
    type: partner?.type ?? "",
    regions: partner?.regions ?? [],
    services: partner?.services ?? "",
    phone: partner?.phone ?? "",
    website: partner?.website ?? "",
  })
  const [error, setError] = React.useState("")
  const set = (changes: Partial<typeof draft>) =>
    setDraft((d) => ({ ...d, ...changes }))

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!draft.name.trim()) {
      setError("Enter the partner's name")
      return
    }
    const values = { ...draft, name: draft.name.trim() }
    if (partner) {
      partners.patch(partner.id, values)
      toast.success("Partner updated")
    } else {
      partners.add([
        {
          ...values,
          id: `PT${String(count + 1).padStart(3, "0")}`,
          status: "Active",
        },
      ])
      toast.success("Partner added")
    }
    onClose()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{partner ? "Edit partner" : "Add partner"}</DialogTitle>
        <DialogDescription className="sr-only">
          The partner&apos;s name, type, locations and contact details.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="partner-name"
          label="Partner name"
          required
          value={draft.name}
          error={error}
          onChange={(e) => {
            set({ name: e.target.value })
            setError("")
          }}
        />
        <SelectField
          id="partner-type"
          label="Type"
          required
          options={PARTNER_TYPES}
          value={draft.type}
          onChange={(type) => set({ type })}
        />
      </div>
      <MultiSelectField
        id="partner-regions"
        label="Locations"
        required
        options={REGIONS}
        value={draft.regions}
        onChange={(regions) => set({ regions })}
        placeholder="Select locations"
      />
      <TextField
        id="partner-services"
        label="Services"
        value={draft.services}
        onChange={(e) => set({ services: e.target.value })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="partner-phone"
          label="Phone"
          type="tel"
          value={draft.phone}
          onChange={(e) => set({ phone: formatPhone(e.target.value) })}
        />
        <TextField
          id="partner-website"
          label="Website"
          value={draft.website}
          onChange={(e) => set({ website: e.target.value })}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          {partner ? "Save changes" : "Add partner"}
        </Button>
      </DialogFooter>
    </form>
  )
}
