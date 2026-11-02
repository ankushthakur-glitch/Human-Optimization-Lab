"use client"

import * as React from "react"
import { IconAdd } from "@/design-system/icons"

import {
  type CatalogTest,
  TEST_CATEGORIES,
  type TestCategory,
  catalog,
  inlayPrice,
  money,
  vendorName,
} from "@/components/admin/billing/billing-data"
import { DateField, SelectField } from "@/components/form-kit"
import {
  createCollection,
  nextId,
  today,
} from "@/components/practice/collection-store"
import type { HealthRecord } from "@/components/practice/health-record"
import {
  PRACTICE,
  type Patient,
  fullName,
} from "@/components/practice/practice-data"
import { RowRemoveButton } from "@/components/practice/record-page"
import { ME, nowAt } from "@/components/provider/chart-epic"
import { Button } from "@/design-system/ui/button"
import { Checkbox } from "@/design-system/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import { Field, FieldLabel } from "@/design-system/ui/field"
import { Textarea } from "@/design-system/ui/textarea"

/* Lab orders are the one clinical entry the chart writes: the provider
   orders tests from the Lab results section, and the order waits there as
   Ordered until the lab sends the result back through the Epic sync.

   Since the 29 Oct 2026 billing walkthrough the tests come from Inlay's
   catalogue for the patient's state, at the Inlay price, never typed. The
   practice pays: nothing is collected when ordering, the order joins the
   practice's next invoice, and the patient is never billed for it. */

export const LAB_PRIORITIES = ["Routine", "Urgent", "STAT"] as const

/* Scans that should be read on the same machine as last time; the patient's
   previous facility can be picked for these instead of Inlay's vendor. */
const SAME_EQUIPMENT = /dexa|bone density|mammogra/i
export const PREVIOUS_FACILITY = "Patient's previous facility"

export type LabOrderItem = {
  testId: string
  name: string
  facility: string
  turnaround: string
  price: number
}

export type LabOrder = {
  id: string
  patientId: string
  tests: string[]
  items: LabOrderItem[]
  /** The facilities, joined, for the requisition. */
  lab: string
  /** Who is invoiced: always the practice. */
  payer: string
  total: number
  priority: (typeof LAB_PRIORITIES)[number]
  /** The condition the order is for, "Name (ICD-10)". */
  diagnosis: string
  /** The day the sample is to be drawn. */
  collectOn: string
  fasting: boolean
  note: string
  orderedBy: string
  /** Local "2026-10-12T15:04". */
  orderedAt: string
  status: "Ordered" | "Cancelled"
}

export const labOrders = createCollection<LabOrder>(
  "hol-chart-lab-orders",
  [],
  "v2"
)

/** The catalogue tests a practice can order for a patient in this state. */
export function orderableFor(tests: CatalogTest[], state: string) {
  return tests.filter(
    (t) =>
      t.status === "Live" &&
      t.orderedBy !== "Patients" &&
      (t.states.length === 0 || t.states.includes(state))
  )
}

/** The test types on an order: lab, imaging or both. */
export function orderTypes(order: LabOrder, tests: CatalogTest[]) {
  const types = new Set<TestCategory>(
    order.items.map(
      (i) => tests.find((t) => t.id === i.testId)?.category ?? "Lab"
    )
  )
  return types.size ? types : new Set<TestCategory>(["Lab"])
}

export function LabOrderDialog({
  open,
  type = "Lab",
  patient,
  record,
  onClose,
  onCreated,
}: {
  open: boolean
  /** The type each new row starts on: the section it was opened from. */
  type?: TestCategory
  patient: Patient
  record: HealthRecord
  onClose: () => void
  onCreated: (order: LabOrder) => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 rounded-xl p-0 sm:max-w-5xl">
        {open && (
          <LabOrderForm
            type={type}
            patient={patient}
            record={record}
            onClose={onClose}
            onCreated={onCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type Row = { type: TestCategory; name: string; testId: string }
const EMPTY_ROW: Row = { type: "Lab", name: "", testId: "" }

type Draft = {
  /** One row per test: lab or imaging, the test's name, then the
      catalogue entry (the vendor) chosen for it. */
  rows: Row[]
  /** Per test: Inlay's vendor (the default) or the previous facility. */
  facility: Record<string, string>
  priority: string
  diagnosis: string
  collectOn: string
  fasting: boolean
  note: string
}

function LabOrderForm({
  type,
  patient,
  record,
  onClose,
  onCreated,
}: {
  type: TestCategory
  patient: Patient
  record: HealthRecord
  onClose: () => void
  onCreated: (order: LabOrder) => void
}) {
  const { items: tests } = catalog.use()
  const [d, setD] = React.useState<Draft>({
    rows: [{ ...EMPTY_ROW, type }],
    facility: {},
    priority: "Routine",
    diagnosis: "",
    collectOn: today(),
    fasting: false,
    note: "",
  })
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setD((prev) => ({ ...prev, [key]: value }))

  const offered = orderableFor(tests, patient.state)
  /* The test is picked first, then one of the vendors that carry it,
     cheapest first. */
  const byTest = new Map<string, CatalogTest[]>()
  for (const t of offered)
    byTest.set(t.name, [...(byTest.get(t.name) ?? []), t])
  for (const list of byTest.values())
    list.sort((a, b) => inlayPrice(a) - inlayPrice(b))
  const vendorLabel = (t: CatalogTest) =>
    `${vendorName(t.vendor)}, ${money(inlayPrice(t))}`
  const items: LabOrderItem[] = d.rows.flatMap((row) => {
    const t = offered.find((x) => x.id === row.testId)
    if (!t) return []
    return [
      {
        testId: t.id,
        name: t.name,
        facility: d.facility[t.id] ?? vendorName(t.vendor),
        turnaround: t.turnaround,
        price: inlayPrice(t),
      },
    ]
  })
  const total = items.reduce((s, i) => s + i.price, 0)

  const diagnoses = record.conditions
    .filter((c) => c.status === "Active")
    .map((c) => `${c.name} (${c.code})`)

  const ready = items.length > 0 && d.priority && d.collectOn

  function setRow(index: number, row: Row) {
    set(
      "rows",
      d.rows.map((r, i) => (i === index ? row : r))
    )
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!ready) return
    const order: LabOrder = {
      id: nextId("LO", labOrders.get()),
      patientId: patient.id,
      tests: items.map((i) => i.name),
      items,
      lab: [...new Set(items.map((i) => i.facility))].join(", "),
      payer: PRACTICE.name,
      total,
      priority: d.priority as LabOrder["priority"],
      diagnosis: d.diagnosis,
      collectOn: d.collectOn,
      fasting: d.fasting,
      note: d.note.trim(),
      orderedBy: ME,
      orderedAt: nowAt(),
      status: "Ordered",
    }
    labOrders.add([order])
    onCreated(order)
  }

  return (
    <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="shrink-0 border-b px-6 py-4">
        <DialogTitle className="text-base font-semibold">
          Order a test
        </DialogTitle>
        <DialogDescription className="sr-only">
          Pick tests from the Inlay catalogue for this patient&apos;s state. The
          practice is invoiced; the patient is never billed.
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 max-lg:flex-col max-lg:overflow-y-auto">
        <div className="flex min-h-0 flex-1 flex-col gap-5 px-6 py-5 lg:overflow-y-auto">
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold">Tests</h3>
              <span className="text-xs text-muted-foreground">
                Catalogue for {patient.state}
              </span>
            </div>
            {d.rows.map((row, i) => {
              const taken = d.rows.filter((_, j) => j !== i).map((r) => r.name)
              const vendors = byTest.get(row.name) ?? []
              const current = vendors.find((t) => t.id === row.testId)
              return (
                <div
                  key={i}
                  className="grid grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-3"
                >
                  <SelectField
                    id={`lab-order-type-${i}`}
                    label="Type"
                    required
                    options={TEST_CATEGORIES}
                    value={row.type}
                    onChange={(type) =>
                      type !== row.type &&
                      setRow(i, { ...EMPTY_ROW, type: type as TestCategory })
                    }
                  />
                  <SelectField
                    id={`lab-order-test-${i}`}
                    label="Test"
                    required
                    placeholder="Select test"
                    options={[...byTest.keys()].filter(
                      (name) =>
                        !taken.includes(name) &&
                        byTest.get(name)?.[0]?.category === row.type
                    )}
                    value={row.name}
                    onChange={(name) =>
                      setRow(i, {
                        ...row,
                        name,
                        /* The cheapest vendor until another is picked. */
                        testId: byTest.get(name)?.[0]?.id ?? "",
                      })
                    }
                  />
                  <SelectField
                    id={`lab-order-vendor-${i}`}
                    label="Vendor"
                    required
                    placeholder={
                      row.name ? "Select vendor" : "Select a test first"
                    }
                    options={vendors.map(vendorLabel)}
                    value={current ? vendorLabel(current) : ""}
                    onChange={(label) =>
                      setRow(i, {
                        ...row,
                        testId:
                          vendors.find((t) => vendorLabel(t) === label)?.id ??
                          "",
                      })
                    }
                  />
                  <RowRemoveButton
                    label="Remove test"
                    onClick={() =>
                      set(
                        "rows",
                        d.rows.length > 1
                          ? d.rows.filter((_, j) => j !== i)
                          : [{ ...EMPTY_ROW, type }]
                      )
                    }
                  />
                </div>
              )
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              disabled={d.rows.some((r) => !r.testId)}
              onClick={() => set("rows", [...d.rows, { ...EMPTY_ROW, type }])}
            >
              <IconAdd />
              Add test
            </Button>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="lab-order-priority"
              label="Priority"
              required
              options={LAB_PRIORITIES}
              value={d.priority}
              onChange={(v) => set("priority", v)}
            />
            <DateField
              id="lab-order-collect"
              label="Collection date"
              required
              min={today()}
              value={d.collectOn}
              onChange={(v) => set("collectOn", v)}
            />
            <SelectField
              id="lab-order-diagnosis"
              label="Diagnosis"
              className="sm:col-span-2"
              options={diagnoses}
              value={d.diagnosis}
              onChange={(v) => set("diagnosis", v)}
            />
            <Field orientation="horizontal" className="sm:col-span-2">
              <Checkbox
                id="lab-order-fasting"
                checked={d.fasting}
                onCheckedChange={(v) => set("fasting", v === true)}
              />
              <FieldLabel htmlFor="lab-order-fasting" className="font-normal">
                Fasting required
              </FieldLabel>
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="lab-order-note">Note to lab</FieldLabel>
              <Textarea
                id="lab-order-note"
                rows={2}
                placeholder="Type here..."
                value={d.note}
                onChange={(e) => set("note", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <aside className="flex shrink-0 flex-col gap-4 border-t bg-surface-sunken px-6 py-5 lg:w-[22rem] lg:overflow-y-auto lg:border-t-0 lg:border-l">
          <h3 className="text-sm font-semibold">Order summary</h3>
          <dl className="grid gap-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Patient</dt>
              <dd className="truncate">{fullName(patient)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">State</dt>
              <dd>{patient.state}</dd>
            </div>
          </dl>

          {items.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              No tests picked yet
            </p>
          ) : (
            <ul className="flex flex-col divide-y rounded-md border bg-card">
              {items.map((i) => {
                const t = offered.find((x) => x.id === i.testId)!
                return (
                  <li
                    key={i.testId}
                    className="flex flex-col gap-1.5 px-3 py-2.5"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">{i.name}</span>
                      <span className="text-sm tabular-nums">
                        {money(i.price)}
                      </span>
                    </div>
                    {SAME_EQUIPMENT.test(i.name) ? (
                      <SelectField
                        id={`lab-order-facility-${i.testId}`}
                        label="Facility"
                        options={[vendorName(t.vendor), PREVIOUS_FACILITY]}
                        value={i.facility}
                        onChange={(v) =>
                          set("facility", { ...d.facility, [i.testId]: v })
                        }
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {i.facility}, {i.turnaround}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <dl className="grid gap-1.5 border-t pt-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-semibold">Total</dt>
              <dd className="font-heading text-xl font-semibold tabular-nums">
                {money(total)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Payer</dt>
              <dd className="text-right">{PRACTICE.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Charged</dt>
              <dd className="text-right">On the next invoice</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Patient pays</dt>
              <dd className="text-right">{money(0)}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <DialogFooter className="mt-0 shrink-0 flex-row items-center justify-end gap-2 border-t px-6 py-4">
        <span className="mr-auto text-xs text-muted-foreground">
          Ordering provider : <span className="text-foreground">{ME}</span>
        </span>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!ready}>
          Place order{items.length > 0 && `, ${money(total)}`}
        </Button>
      </DialogFooter>
    </form>
  )
}
