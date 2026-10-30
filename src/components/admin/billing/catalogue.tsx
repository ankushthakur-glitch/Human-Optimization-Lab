"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import {
  IconAdd,
  IconEdit,
  IconLock,
  IconLockOpen,
} from "@/design-system/icons"

import {
  type CatalogTest,
  ORDERED_BY,
  type RegionalRate,
  type TestCategory,
  SAMPLE_TAX,
  STATES,
  TEST_CATEGORIES,
  TEST_STATUSES,
  VENDORS,
  catalog,
  inlayPrice,
  money,
  priceWith,
  statesLabel,
  vendorName,
} from "@/components/admin/billing/billing-data"
import {
  type Errors,
  FormSection,
  MultiSelectField,
  Required,
  SelectField,
  SheetForm,
  TextField,
} from "@/components/form-kit"
import {
  type Column,
  Directory,
  ID_CELL,
  NAME_LINK,
  RowMenu,
} from "@/components/practice/directory"
import { RowRemoveButton } from "@/components/practice/record-page"
import {
  FormFooter,
  SideSheet,
  SideSheetHeader,
} from "@/components/practice/sheets"
import { NumberInput, StatusDot } from "@/components/settings/settings-kit"
import { Button } from "@/design-system/ui/button"
import { DropdownMenuItem } from "@/design-system/ui/dropdown-menu"
import { Field, FieldError, FieldLabel } from "@/design-system/ui/field"
import { Switch } from "@/design-system/ui/switch"

/* Catalogue and pricing: contracted rate in, Inlay price out. Every test
   Inlay sells, per vendor, with the rate, the margin and the price worked
   out from them. The same test can come from two vendors at two rates and
   still sell at one price. The rate never leaves this portal. */

const STATUS_TONE = {
  Live: "success",
  Draft: "muted",
  Inactive: "muted",
} as const

export function CataloguePanel({
  heading,
  leading,
}: {
  heading: React.ReactNode
  /** Sits before the heading, e.g. the settings page's back arrow. */
  leading?: React.ReactNode
}) {
  const { items } = catalog.use()
  const [editing, setEditing] = React.useState<CatalogTest | "new" | null>(null)

  const columns: Column<CatalogTest>[] = [
    {
      id: "id",
      header: "ID",
      className: ID_CELL,
      cell: (t) => t.id,
      sortValue: (t) => t.id,
    },
    {
      id: "name",
      header: "Test",
      cell: (t) => (
        <Button
          variant="link"
          className={NAME_LINK}
          onClick={() => setEditing(t)}
        >
          {t.name}
        </Button>
      ),
      sortValue: (t) => t.name,
    },
    {
      id: "vendor",
      header: "Vendor",
      className: "hidden text-foreground/80 md:table-cell",
      cell: (t) => vendorName(t.vendor),
      sortValue: (t) => vendorName(t.vendor),
    },
    {
      id: "category",
      header: "Type",
      className: "hidden w-24 text-foreground/80 lg:table-cell",
      cell: (t) => t.category,
    },
    {
      id: "rate",
      header: "Contracted",
      className: "hidden text-right tabular-nums sm:table-cell",
      cell: (t) => money(t.rate),
      sortValue: (t) => t.rate,
    },
    {
      id: "margin",
      header: "Margin",
      className: "hidden text-right tabular-nums lg:table-cell",
      cell: (t) => `${t.margin}%`,
      sortValue: (t) => t.margin,
    },
    {
      id: "price",
      header: "Inlay price",
      className: "text-right font-medium tabular-nums",
      cell: (t) => money(inlayPrice(t)),
      sortValue: (t) => inlayPrice(t),
    },
    {
      id: "states",
      header: "States",
      className: "hidden text-foreground/80 xl:table-cell",
      cell: (t) => statesLabel(t),
    },
    {
      id: "status",
      header: "Status",
      cell: (t) =>
        t.status === "Live" && t.unpriced.length > 0 ? (
          <StatusDot tone="warning">
            {t.unpriced.length} states unpriced
          </StatusDot>
        ) : (
          <StatusDot tone={STATUS_TONE[t.status]}>{t.status}</StatusDot>
        ),
      sortValue: (t) => t.status,
    },
    {
      id: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (t) => (
        <RowMenu label={`Actions for ${t.name}`}>
          <DropdownMenuItem onClick={() => setEditing(t)}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const status = t.status === "Inactive" ? "Live" : "Inactive"
              catalog.patch(t.id, { status })
              toast.success(
                status === "Live"
                  ? `${t.name} is live`
                  : `${t.name} deactivated`
              )
            }}
          >
            {t.status === "Inactive" ? <IconLockOpen /> : <IconLock />}
            {t.status === "Inactive" ? "Make live" : "Deactivate"}
          </DropdownMenuItem>
        </RowMenu>
      ),
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory
        title="Catalogue and pricing"
        leading={leading}
        heading={heading}
        noun="tests"
        rows={items}
        columns={columns}
        search={(t) => [t.id, t.name, t.code, vendorName(t.vendor)]}
        filters={[
          {
            id: "vendor",
            label: "Vendor",
            all: "All vendors",
            options: VENDORS.map((v) => v.name),
            match: (t, v) => vendorName(t.vendor) === v,
          },
          {
            id: "category",
            label: "Type",
            all: "All types",
            options: TEST_CATEGORIES,
            match: (t, v) => t.category === v,
          },
          {
            id: "state",
            label: "State",
            all: "All states",
            options: STATES,
            match: (t, v) => t.states.length === 0 || t.states.includes(v),
          },
          {
            id: "status",
            label: "Status",
            all: "Any status",
            options: TEST_STATUSES,
            match: (t, v) => t.status === v,
          },
        ]}
        primaryAction={{
          label: "Add test",
          icon: <IconAdd />,
          onClick: () => setEditing("new"),
        }}
        hideExport
        exportName="Catalogue and pricing"
        exportRow={(t) => ({ ID: t.id, Test: t.name })}
        emptyIllustration="no-results"
      />
      <SideSheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        wide
      >
        {editing && (
          <TestForm
            test={editing === "new" ? null : editing}
            count={items.length}
            onClose={() => setEditing(null)}
          />
        )}
      </SideSheet>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Add or edit a test                                                         */
/* -------------------------------------------------------------------------- */

type TestDraft = Omit<CatalogTest, "id">

const EMPTY: TestDraft = {
  name: "",
  vendor: "",
  category: "Lab",
  code: "",
  specimen: "",
  turnaround: "",
  states: [],
  unpriced: [],
  rate: 0,
  margin: 100,
  overrides: [],
  orderedBy: ORDERED_BY[0],
  taxable: false,
  status: "Live",
}

const REQUIRED: Partial<Record<keyof TestDraft, string>> = {
  vendor: "Select a vendor",
  name: "Enter the test name",
  code: "Enter the code",
  specimen: "Enter the specimen or body area",
  turnaround: "Enter the turnaround",
}

/* Only the rate and the margin are typed: the price is worked out from
   them, never entered. The preview shows what each portal will display. */
function TestForm({
  test,
  count,
  onClose,
}: {
  test: CatalogTest | null
  count: number
  onClose: () => void
}) {
  const [draft, setDraft] = React.useState<TestDraft>(test ?? EMPTY)
  const [errors, setErrors] = React.useState<Errors>({})
  const set = (changes: Partial<TestDraft>) => {
    setDraft((d) => ({ ...d, ...changes }))
    setErrors((e) => {
      const next = { ...e }
      for (const key of Object.keys(changes)) delete next[key]
      return next
    })
  }

  function setOverride(index: number, changes: Partial<RegionalRate>) {
    set({
      overrides: draft.overrides.map((o, i) =>
        i === index ? { ...o, ...changes } : o
      ),
    })
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const found: Errors = {}
    for (const [key, message] of Object.entries(REQUIRED))
      if (!String(draft[key as keyof TestDraft]).trim()) found[key] = message
    if (draft.rate <= 0) found.rate = "Enter the contracted rate"
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }
    const values = {
      ...draft,
      name: draft.name.trim(),
      code: draft.code.trim(),
      specimen: draft.specimen.trim(),
      turnaround: draft.turnaround.trim(),
      overrides: draft.overrides.filter((o) => o.state && o.rate > 0),
    }
    if (test) {
      catalog.patch(test.id, values)
      toast.success("Test updated")
    } else {
      catalog.add([
        { ...values, id: `TST${String(count + 1).padStart(3, "0")}` },
      ])
      toast.success(
        values.status === "Live" ? "Test published" : "Test saved as draft"
      )
    }
    onClose()
  }

  return (
    <>
      <SideSheetHeader
        title={test ? "Edit test" : "Add a test to the catalogue"}
        description="Pick the type, vendor and test, type the contracted rate and margin; the Inlay price is worked out."
      />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <SheetForm id="test-form" onSubmit={submit} className="lg:flex-1">
          <FormSection title="Vendor and test">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="test-type"
                label="Type"
                required
                options={TEST_CATEGORIES}
                value={draft.category}
                onChange={(category) =>
                  set({
                    category: category as TestCategory,
                    /* A vendor of the other type no longer fits. */
                    vendor: VENDORS.some(
                      (v) => v.id === draft.vendor && v.category === category
                    )
                      ? draft.vendor
                      : "",
                  })
                }
              />
              <SelectField
                id="test-vendor"
                label="Vendor"
                required
                options={VENDORS.filter(
                  (v) => v.category === draft.category
                ).map((v) => v.name)}
                value={draft.vendor ? vendorName(draft.vendor) : ""}
                error={errors.vendor}
                onChange={(name) =>
                  set({
                    vendor: VENDORS.find((v) => v.name === name)?.id ?? "",
                  })
                }
              />
              <TextField
                id="test-name"
                label="Test"
                required
                value={draft.name}
                error={errors.name}
                onChange={(e) => set({ name: e.target.value })}
              />
              <TextField
                id="test-code"
                label="Code"
                required
                value={draft.code}
                error={errors.code}
                onChange={(e) => set({ code: e.target.value })}
              />
              <TextField
                id="test-specimen"
                label={draft.category === "Imaging" ? "Body area" : "Specimen"}
                required
                value={draft.specimen}
                error={errors.specimen}
                onChange={(e) => set({ specimen: e.target.value })}
              />
              <TextField
                id="test-turnaround"
                label="Turnaround"
                required
                value={draft.turnaround}
                error={errors.turnaround}
                onChange={(e) => set({ turnaround: e.target.value })}
              />
              <SelectField
                id="test-ordered-by"
                label="Ordered by"
                required
                options={ORDERED_BY}
                value={draft.orderedBy}
                onChange={(orderedBy) => set({ orderedBy })}
              />
            </div>
          </FormSection>

          <FormSection title="Price">
            <div className="grid gap-4 sm:grid-cols-2">
              <PriceInput
                id="test-rate"
                label="Contracted rate"
                prefix="$"
                value={draft.rate}
                error={errors.rate}
                onChange={(rate) => set({ rate })}
              />
              <PriceInput
                id="test-margin"
                label="Margin"
                unit="%"
                value={draft.margin}
                onChange={(margin) => set({ margin })}
              />
            </div>
          </FormSection>

          <FormSection
            title="Rates by state"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  set({
                    overrides: [...draft.overrides, { state: "", rate: 0 }],
                  })
                }
              >
                <IconAdd />
                Add state
              </Button>
            }
          >
            {draft.overrides.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                One contracted rate in every state
              </p>
            ) : (
              draft.overrides.map((o, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_10rem_auto] items-start gap-3"
                >
                  <SelectField
                    id={`test-state-${i}`}
                    label="State"
                    options={STATES}
                    value={o.state}
                    onChange={(state) => setOverride(i, { state })}
                  />
                  <PriceInput
                    id={`test-state-rate-${i}`}
                    label="Contracted rate"
                    prefix="$"
                    value={o.rate}
                    onChange={(rate) => setOverride(i, { rate })}
                  />
                  <RowRemoveButton
                    label={`Remove ${o.state || "state"}`}
                    onClick={() =>
                      set({
                        overrides: draft.overrides.filter((_, j) => j !== i),
                      })
                    }
                  />
                </div>
              ))
            )}
          </FormSection>

          <FormSection title="Availability and tax">
            <MultiSelectField
              id="test-states"
              label="Available in"
              options={STATES}
              value={draft.states}
              onChange={(states) => set({ states })}
              placeholder="All states"
            />
            <SelectField
              id="test-status"
              label="Status"
              required
              options={TEST_STATUSES}
              value={draft.status}
              onChange={(status) =>
                set({ status: status as TestDraft["status"] })
              }
            />
            <label className="flex items-center justify-between gap-4 text-sm font-medium">
              Charge sales tax to patients
              <Switch
                checked={draft.taxable}
                onCheckedChange={(taxable) => set({ taxable })}
              />
            </label>
          </FormSection>
        </SheetForm>
        <Preview draft={draft} />
      </div>
      <FormFooter
        formId="test-form"
        submitLabel={test ? "Save changes" : "Publish"}
        onCancel={onClose}
      />
    </>
  )
}

/** Exactly what the provider portal and the patient app will show. */
function Preview({ draft }: { draft: TestDraft }) {
  const price = priceWith(draft.rate, draft.margin)
  const withTax = Math.round(price * (1 + SAMPLE_TAX.rate / 100) * 100) / 100
  const practices = draft.orderedBy !== "Patients"
  const patients = draft.orderedBy !== "Practices"
  const rows = [
    practices && { label: "Provider portal", value: money(price) },
    patients && { label: "Patient app", value: money(price) },
    patients &&
      draft.taxable && {
        label: `Patient app, ${SAMPLE_TAX.state} tax`,
        value: money(withTax),
      },
    { label: "Vendor paid", value: money(draft.rate) },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <aside className="flex shrink-0 flex-col gap-4 border-t bg-surface-sunken p-6 lg:w-72 lg:border-t-0 lg:border-l">
      <h3 className="text-sm font-semibold">Preview</h3>
      <dl className="flex flex-col gap-2.5 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-baseline justify-between gap-3 border-t pt-3">
        <span className="text-sm font-semibold">Margin per order</span>
        <span className="font-heading text-lg font-semibold tabular-nums">
          {money(price - draft.rate)}
        </span>
      </div>
    </aside>
  )
}

/** A number field labelled like the form's other fields. */
function PriceInput({
  id,
  label,
  error,
  className,
  ...input
}: {
  id: string
  label: string
  error?: string
  prefix?: string
  unit?: string
  value: number
  onChange: (value: number) => void
  className?: string
}) {
  return (
    <Field
      id={id}
      data-invalid={error ? true : undefined}
      className={className}
    >
      <FieldLabel>
        {label}
        <Required />
      </FieldLabel>
      <NumberInput label={label} className="w-full" {...input} />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}
