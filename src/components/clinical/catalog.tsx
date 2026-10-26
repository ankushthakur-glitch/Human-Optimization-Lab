"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import {
  IconAdd,
  IconEdit,
  IconLock,
  IconLockOpen,
  IconTrash,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import {
  FormSection,
  MultiSelectDropdownField,
  SelectField,
  SheetForm,
  TextField,
} from "@/components/form-kit"
import {
  type Column,
  Directory,
  NAME_LINK,
  RowMenu,
} from "@/components/practice/directory"
import {
  FormFooter,
  SideSheet,
  SideSheetHeader,
} from "@/components/practice/sheets"
import {
  type Biomarker,
  CATALOG_TARGET,
  CATEGORIES,
  DISPLAY_RULES,
  type Range,
  SCORING_RULES,
  SEXES,
  type SexAgeRule,
  biomarkers,
  formatRange,
  sexAgeRules,
} from "@/components/clinical/clinical-data"
import { RangeCell, RangeField } from "@/components/clinical/clinical-kit"
import {
  SettingsBack,
  SettingsHeading,
  StatusDot,
} from "@/components/settings/settings-kit"
import { Button } from "@/design-system/ui/button"
import { DropdownMenuItem } from "@/design-system/ui/dropdown-menu"

/* Catalog: the biomarker definitions with their canonical units, the three
   ranges each one carries, and the sex and age rules that override them. */

const UNITS = [
  "mg/dL",
  "mmol/L",
  "g/dL",
  "g/L",
  "%",
  "ng/mL",
  "ng/dL",
  "pg/mL",
  "ug/dL",
  "uIU/mL",
  "U/L",
  "IU/mL",
  "mg/L",
  "nmol/L",
  "pmol/L",
  "umol/L",
  "mL/min/1.73m2",
  "x10^3/uL",
  "index",
] as const

function nameLink(label: string, onClick: () => void) {
  return (
    <Button
      variant="link"
      className={cn(NAME_LINK, "font-medium")}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Biomarker definitions                                                      */
/* -------------------------------------------------------------------------- */

export function BiomarkersPage() {
  const { items } = biomarkers.use()
  const [editing, setEditing] = React.useState<Biomarker | "new" | null>(null)
  const active = items.filter((b) => b.status === "Active").length

  const columns: Column<Biomarker>[] = [
    {
      id: "id",
      header: "ID",
      className: "hidden w-20 text-primary-tint tabular-nums md:table-cell",
      cell: (b) => b.id,
      sortValue: (b) => b.id,
    },
    {
      id: "name",
      header: "Biomarker",
      cell: (b) => nameLink(b.name, () => setEditing(b)),
      sortValue: (b) => b.name,
    },
    {
      id: "loinc",
      header: "LOINC",
      className: "hidden tabular-nums text-foreground/80 lg:table-cell",
      cell: (b) => b.loinc,
    },
    {
      id: "category",
      header: "Category",
      className: "text-foreground/80",
      cell: (b) => b.category,
      sortValue: (b) => b.category,
    },
    {
      id: "unit",
      header: "Canonical unit",
      cell: (b) => <span className="font-medium">{b.unit}</span>,
    },
    {
      id: "alt",
      header: "Also accepted",
      className: "hidden text-foreground/80 lg:table-cell",
      cell: (b) => b.altUnits.join(", "),
    },
    {
      id: "status",
      header: "Status",
      cell: (b) => (
        <StatusDot tone={b.status === "Active" ? "success" : "muted"}>
          {b.status}
        </StatusDot>
      ),
    },
    {
      id: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (b) => (
        <RowMenu label={`Actions for ${b.name}`}>
          <DropdownMenuItem onClick={() => setEditing(b)}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const status = b.status === "Active" ? "Retired" : "Active"
              biomarkers.patch(b.id, { status })
              toast.success(
                status === "Retired" ? `${b.name} retired` : `${b.name} restored`
              )
            }}
          >
            {b.status === "Active" ? <IconLock /> : <IconLockOpen />}
            {b.status === "Active" ? "Retire" : "Restore"}
          </DropdownMenuItem>
        </RowMenu>
      ),
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory
        title="Biomarker definitions"
        leading={<SettingsBack />}
        heading={
          <div className="flex items-center gap-3">
            <SettingsHeading />
            <span className="text-sm text-muted-foreground tabular-nums">
              {active} of {CATALOG_TARGET} defined
            </span>
          </div>
        }
        noun="biomarkers"
        rows={items}
        columns={columns}
        search={(b) => [b.id, b.name, b.loinc, b.unit, b.category]}
        filters={[
          {
            id: "category",
            label: "Category",
            all: "All categories",
            options: CATEGORIES,
            match: (b, v) => b.category === v,
          },
          {
            id: "status",
            label: "Status",
            all: "Any status",
            options: ["Active", "Retired"],
            match: (b, v) => b.status === v,
          },
        ]}
        primaryAction={{
          label: "Add biomarker",
          icon: <IconAdd />,
          onClick: () => setEditing("new"),
        }}
        exportName="Biomarker definitions"
        exportRow={(b) => ({
          ID: b.id,
          Biomarker: b.name,
          LOINC: b.loinc,
          Category: b.category,
          "Canonical unit": b.unit,
          "Also accepted": b.altUnits.join(", "),
          Status: b.status,
        })}
        emptyIllustration="no-results"
      />
      <SideSheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        {editing && (
          <BiomarkerForm
            biomarker={editing === "new" ? null : editing}
            count={items.length}
            onClose={() => setEditing(null)}
          />
        )}
      </SideSheet>
    </div>
  )
}

function BiomarkerForm({
  biomarker,
  count,
  onClose,
}: {
  biomarker: Biomarker | null
  count: number
  onClose: () => void
}) {
  const [draft, setDraft] = React.useState({
    name: biomarker?.name ?? "",
    loinc: biomarker?.loinc ?? "",
    category: biomarker?.category ?? "",
    unit: biomarker?.unit ?? "",
    altUnits: biomarker?.altUnits ?? [],
    lab: biomarker?.lab ?? ({} as Range),
    target: biomarker?.target ?? ({} as Range),
    optimal: biomarker?.optimal ?? ({} as Range),
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!draft.name.trim()) next.name = "Enter the biomarker's name"
    if (!draft.category) next.category = "Select a category"
    if (!draft.unit) next.unit = "Select the canonical unit"
    setErrors(next)
    if (Object.keys(next).length) return
    const values = { ...draft, name: draft.name.trim() }
    if (biomarker) {
      biomarkers.patch(biomarker.id, values)
      toast.success("Biomarker updated")
    } else {
      biomarkers.add([
        {
          ...values,
          id: `BM${String(count + 1).padStart(3, "0")}`,
          status: "Active",
        },
      ])
      toast.success("Biomarker added")
    }
    onClose()
  }

  return (
    <>
      <SideSheetHeader
        title={biomarker ? "Edit biomarker" : "Add biomarker"}
        description="The biomarker's name, code, unit and ranges."
      />
      <SheetForm id="biomarker-form" onSubmit={submit}>
        <FormSection title="Definition">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <TextField
              id="bm-name"
              label="Biomarker name"
              required
              value={draft.name}
              error={errors.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="sm:col-span-2"
            />
            <TextField
              id="bm-loinc"
              label="LOINC code"
              value={draft.loinc}
              onChange={(e) => setDraft({ ...draft, loinc: e.target.value })}
            />
            <SelectField
              id="bm-category"
              label="Category"
              required
              options={CATEGORIES}
              value={draft.category}
              error={errors.category}
              onChange={(category) => setDraft({ ...draft, category })}
            />
          </div>
        </FormSection>
        <FormSection title="Units">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <SelectField
              id="bm-unit"
              label="Canonical unit"
              required
              options={UNITS}
              value={draft.unit}
              error={errors.unit}
              onChange={(unit) => setDraft({ ...draft, unit })}
            />
            <MultiSelectDropdownField
              id="bm-alt"
              label="Also accepted"
              options={UNITS.filter((u) => u !== draft.unit)}
              value={draft.altUnits}
              placeholder="Select units"
              onChange={(altUnits) => setDraft({ ...draft, altUnits })}
            />
          </div>
        </FormSection>
        <FormSection title="Ranges">
          <RangeFields
            unit={draft.unit}
            value={draft}
            onChange={(ranges) => setDraft({ ...draft, ...ranges })}
          />
        </FormSection>
      </SheetForm>
      <FormFooter
        formId="biomarker-form"
        submitLabel={biomarker ? "Save changes" : "Add biomarker"}
        onCancel={onClose}
      />
    </>
  )
}

type Ranges = Pick<Biomarker, "lab" | "target" | "optimal">

/** The three ranges, kept apart: the lab's, the physician's target and
    Inlay's optimal. */
function RangeFields({
  unit,
  value,
  onChange,
}: {
  unit: string
  value: Ranges
  onChange: (value: Ranges) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <RangeField
        id="range-lab"
        label="Lab range"
        unit={unit}
        value={value.lab}
        onChange={(lab) => onChange({ ...value, lab })}
      />
      <RangeField
        id="range-target"
        label="Physician target"
        unit={unit}
        value={value.target}
        onChange={(target) => onChange({ ...value, target })}
      />
      <RangeField
        id="range-optimal"
        label="Inlay optimal range"
        unit={unit}
        value={value.optimal}
        onChange={(optimal) => onChange({ ...value, optimal })}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Range management                                                           */
/* -------------------------------------------------------------------------- */

export function RangesPage() {
  const { items } = biomarkers.use()
  const [editing, setEditing] = React.useState<Biomarker | null>(null)
  const rows = items.filter((b) => b.status === "Active")

  const columns: Column<Biomarker>[] = [
    {
      id: "name",
      header: "Biomarker",
      cell: (b) => nameLink(b.name, () => setEditing(b)),
      sortValue: (b) => b.name,
    },
    {
      id: "unit",
      header: "Unit",
      className: "text-foreground/80",
      cell: (b) => b.unit,
    },
    {
      id: "lab",
      header: "Lab range",
      cell: (b) => <RangeCell>{formatRange(b.lab)}</RangeCell>,
    },
    {
      id: "target",
      header: "Physician target",
      cell: (b) => <RangeCell>{formatRange(b.target)}</RangeCell>,
    },
    {
      id: "optimal",
      header: "Inlay optimal",
      cell: (b) => (
        <RangeCell className="font-medium text-foreground">
          {formatRange(b.optimal)}
        </RangeCell>
      ),
    },
    {
      id: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (b) => (
        <RowMenu label={`Actions for ${b.name}`}>
          <DropdownMenuItem onClick={() => setEditing(b)}>
            <IconEdit />
            Edit ranges
          </DropdownMenuItem>
        </RowMenu>
      ),
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory
        title="Range management"
        leading={<SettingsBack />}
        heading={<SettingsHeading />}
        noun="biomarkers"
        rows={rows}
        columns={columns}
        search={(b) => [b.id, b.name, b.category]}
        filters={[
          {
            id: "category",
            label: "Category",
            all: "All categories",
            options: CATEGORIES,
            match: (b, v) => b.category === v,
          },
        ]}
        exportName="Biomarker ranges"
        exportRow={(b) => ({
          Biomarker: b.name,
          Unit: b.unit,
          "Lab range": formatRange(b.lab),
          "Physician target": formatRange(b.target),
          "Inlay optimal": formatRange(b.optimal),
        })}
        emptyIllustration="no-results"
      />
      <SideSheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        {editing && (
          <RangesForm biomarker={editing} onClose={() => setEditing(null)} />
        )}
      </SideSheet>
    </div>
  )
}

function RangesForm({
  biomarker,
  onClose,
}: {
  biomarker: Biomarker
  onClose: () => void
}) {
  const [ranges, setRanges] = React.useState<Ranges>({
    lab: biomarker.lab,
    target: biomarker.target,
    optimal: biomarker.optimal,
  })
  return (
    <>
      <SideSheetHeader
        title={biomarker.name}
        description="The lab range, physician target and Inlay optimal range."
      />
      <SheetForm
        id="ranges-form"
        onSubmit={(e) => {
          e.preventDefault()
          biomarkers.patch(biomarker.id, ranges)
          toast.success("Ranges saved")
          onClose()
        }}
      >
        <FormSection title="Ranges">
          <RangeFields
            unit={biomarker.unit}
            value={ranges}
            onChange={setRanges}
          />
        </FormSection>
      </SheetForm>
      <FormFooter formId="ranges-form" submitLabel="Save" onCancel={onClose} />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sex and age rules                                                          */
/* -------------------------------------------------------------------------- */

export function SexAgeRulesPage() {
  const { items } = sexAgeRules.use()
  const { items: markers } = biomarkers.use()
  const [editing, setEditing] = React.useState<SexAgeRule | "new" | null>(null)
  const nameOf = (id: string) => markers.find((b) => b.id === id)?.name ?? id
  const unitOf = (id: string) => markers.find((b) => b.id === id)?.unit ?? ""

  const columns: Column<SexAgeRule>[] = [
    {
      id: "biomarker",
      header: "Biomarker",
      cell: (r) => nameLink(nameOf(r.biomarkerId), () => setEditing(r)),
      sortValue: (r) => nameOf(r.biomarkerId),
    },
    {
      id: "sex",
      header: "Sex",
      cell: (r) => r.sex,
      sortValue: (r) => r.sex,
    },
    {
      id: "age",
      header: "Age",
      className: "tabular-nums",
      cell: (r) => (r.ageTo >= 120 ? `${r.ageFrom}+` : `${r.ageFrom}-${r.ageTo}`),
      sortValue: (r) => r.ageFrom,
    },
    {
      id: "lab",
      header: "Lab range",
      cell: (r) => (
        <RangeCell>
          {formatRange(r.lab) && `${formatRange(r.lab)} ${unitOf(r.biomarkerId)}`}
        </RangeCell>
      ),
    },
    {
      id: "optimal",
      header: "Inlay optimal",
      cell: (r) => (
        <RangeCell>
          {formatRange(r.optimal) &&
            `${formatRange(r.optimal)} ${unitOf(r.biomarkerId)}`}
        </RangeCell>
      ),
    },
    {
      id: "display",
      header: "Display",
      cell: (r) => (
        <StatusDot tone={r.display === "Show" ? "success" : "muted"}>
          {r.display}
        </StatusDot>
      ),
    },
    {
      id: "scoring",
      header: "Scoring",
      cell: (r) => (
        <StatusDot tone={r.scoring === "Score" ? "success" : "muted"}>
          {r.scoring}
        </StatusDot>
      ),
    },
    {
      id: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (r) => (
        <RowMenu label={`Actions for ${nameOf(r.biomarkerId)}`}>
          <DropdownMenuItem onClick={() => setEditing(r)}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              sexAgeRules.remove(r.id)
              toast.success("Rule deleted")
            }}
          >
            <IconTrash />
            Delete
          </DropdownMenuItem>
        </RowMenu>
      ),
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory
        title="Sex and age rules"
        leading={<SettingsBack />}
        heading={<SettingsHeading />}
        noun="rules"
        rows={items}
        columns={columns}
        search={(r) => [nameOf(r.biomarkerId), r.sex]}
        filters={[
          {
            id: "sex",
            label: "Sex",
            all: "Any sex",
            options: SEXES,
            match: (r, v) => r.sex === v,
          },
          {
            id: "scoring",
            label: "Scoring",
            all: "Any scoring",
            options: SCORING_RULES,
            match: (r, v) => r.scoring === v,
          },
        ]}
        primaryAction={{
          label: "Add rule",
          icon: <IconAdd />,
          onClick: () => setEditing("new"),
        }}
        exportName="Sex and age rules"
        exportRow={(r) => ({
          Biomarker: nameOf(r.biomarkerId),
          Sex: r.sex,
          "Age from": r.ageFrom,
          "Age to": r.ageTo,
          "Lab range": formatRange(r.lab),
          "Inlay optimal": formatRange(r.optimal),
          Display: r.display,
          Scoring: r.scoring,
        })}
        emptyIllustration="no-results"
      />
      <SideSheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        {editing && (
          <SexAgeRuleForm
            rule={editing === "new" ? null : editing}
            markers={markers.filter((b) => b.status === "Active")}
            count={items.length}
            onClose={() => setEditing(null)}
          />
        )}
      </SideSheet>
    </div>
  )
}

function SexAgeRuleForm({
  rule,
  markers,
  count,
  onClose,
}: {
  rule: SexAgeRule | null
  markers: Biomarker[]
  count: number
  onClose: () => void
}) {
  const [draft, setDraft] = React.useState({
    biomarkerId: rule?.biomarkerId ?? "",
    sex: rule?.sex ?? "All",
    ageFrom: rule?.ageFrom ?? 18,
    ageTo: rule?.ageTo ?? 120,
    lab: rule?.lab ?? ({} as Range),
    optimal: rule?.optimal ?? ({} as Range),
    display: rule?.display ?? "Show",
    scoring: rule?.scoring ?? "Score",
  })
  const [error, setError] = React.useState("")
  const marker = markers.find((b) => b.id === draft.biomarkerId)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!draft.biomarkerId) {
      setError("Select a biomarker")
      return
    }
    if (rule) {
      sexAgeRules.patch(rule.id, draft)
      toast.success("Rule updated")
    } else {
      sexAgeRules.add([
        { ...draft, id: `SR${String(count + 1).padStart(3, "0")}` },
      ])
      toast.success("Rule added")
    }
    onClose()
  }

  return (
    <>
      <SideSheetHeader
        title={rule ? "Edit rule" : "Add rule"}
        description="Who the rule applies to, its ranges and how it is used."
      />
      <SheetForm id="sex-age-form" onSubmit={submit}>
        <FormSection title="Applies to">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <SelectField
              id="rule-biomarker"
              label="Biomarker"
              required
              options={markers.map((b) => b.name)}
              value={marker?.name ?? ""}
              error={error}
              onChange={(name) => {
                setDraft({
                  ...draft,
                  biomarkerId: markers.find((b) => b.name === name)?.id ?? "",
                })
                setError("")
              }}
              className="sm:col-span-2"
            />
            <SelectField
              id="rule-sex"
              label="Sex"
              options={SEXES}
              value={draft.sex}
              onChange={(sex) => setDraft({ ...draft, sex: sex || "All" })}
              className="sm:col-span-2"
            />
            <TextField
              id="rule-age-from"
              label="Age from"
              type="number"
              value={draft.ageFrom}
              onChange={(e) =>
                setDraft({ ...draft, ageFrom: Number(e.target.value) })
              }
            />
            <TextField
              id="rule-age-to"
              label="Age to"
              type="number"
              value={draft.ageTo}
              onChange={(e) =>
                setDraft({ ...draft, ageTo: Number(e.target.value) })
              }
            />
          </div>
        </FormSection>
        <FormSection title="Ranges">
          <div className="flex flex-col gap-5">
            <RangeField
              id="rule-lab"
              label="Lab range"
              unit={marker?.unit}
              value={draft.lab}
              onChange={(lab) => setDraft({ ...draft, lab })}
            />
            <RangeField
              id="rule-optimal"
              label="Inlay optimal range"
              unit={marker?.unit}
              value={draft.optimal}
              onChange={(optimal) => setDraft({ ...draft, optimal })}
            />
          </div>
        </FormSection>
        <FormSection title="Use">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <SelectField
              id="rule-display"
              label="Display to patient"
              options={DISPLAY_RULES}
              value={draft.display}
              onChange={(display) =>
                setDraft({ ...draft, display: display || "Show" })
              }
            />
            <SelectField
              id="rule-scoring"
              label="Inlay score"
              options={SCORING_RULES}
              value={draft.scoring}
              onChange={(scoring) =>
                setDraft({ ...draft, scoring: scoring || "Score" })
              }
            />
          </div>
        </FormSection>
      </SheetForm>
      <FormFooter
        formId="sex-age-form"
        submitLabel={rule ? "Save changes" : "Add rule"}
        onCancel={onClose}
      />
    </>
  )
}
