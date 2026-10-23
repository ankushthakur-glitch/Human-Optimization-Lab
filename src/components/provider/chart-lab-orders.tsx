"use client"

import * as React from "react"

import {
  DateField,
  MultiSelectField,
  SelectField,
} from "@/components/form-kit"
import {
  createCollection,
  nextId,
  today,
} from "@/components/practice/collection-store"
import type { HealthRecord } from "@/components/practice/health-record"
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
   Ordered until the lab sends the result back through the Epic sync. */

export const LAB_TESTS = [
  "Comprehensive metabolic panel",
  "Complete blood count (CBC)",
  "Lipid panel",
  "Apolipoprotein B",
  "Hemoglobin A1c",
  "Fasting insulin",
  "Thyroid panel",
  "Vitamin D, 25-OH",
  "Vitamin B12",
  "Ferritin",
  "Inflammation panel",
  "Testosterone, total",
  "Estradiol",
  "Urinalysis",
]

export const LABS = [
  "Quest Diagnostics",
  "Labcorp",
  "In-office lab",
  "Hospital lab",
]

export const LAB_PRIORITIES = ["Routine", "Urgent", "STAT"] as const

export type LabOrder = {
  id: string
  patientId: string
  tests: string[]
  lab: string
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
  "v1"
)

type Draft = Omit<
  LabOrder,
  "id" | "patientId" | "orderedBy" | "orderedAt" | "status" | "priority"
> & { priority: string }

const emptyDraft = (): Draft => ({
  tests: [],
  lab: "",
  priority: "Routine",
  diagnosis: "",
  collectOn: today(),
  fasting: false,
  note: "",
})

export function LabOrderDialog({
  open,
  patientId,
  record,
  onClose,
  onCreated,
}: {
  open: boolean
  patientId: string
  record: HealthRecord
  onClose: () => void
  onCreated: (order: LabOrder) => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 rounded-xl p-0 sm:max-w-2xl">
        {open && (
          <LabOrderForm
            patientId={patientId}
            record={record}
            onClose={onClose}
            onCreated={onCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function LabOrderForm({
  patientId,
  record,
  onClose,
  onCreated,
}: {
  patientId: string
  record: HealthRecord
  onClose: () => void
  onCreated: (order: LabOrder) => void
}) {
  const [d, setD] = React.useState<Draft>(emptyDraft)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setD((prev) => ({ ...prev, [key]: value }))

  const diagnoses = record.conditions
    .filter((c) => c.status === "Active")
    .map((c) => `${c.name} (${c.code})`)

  const ready = d.tests.length > 0 && d.lab && d.priority && d.collectOn

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!ready) return
    const order: LabOrder = {
      ...d,
      id: nextId("LO", labOrders.get()),
      patientId,
      priority: d.priority as LabOrder["priority"],
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
          Add lab order
        </DialogTitle>
        <DialogDescription className="sr-only">
          Order lab tests for this patient.
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
        <MultiSelectField
          id="lab-order-tests"
          label="Tests"
          required
          className="sm:col-span-2"
          placeholder="Search tests"
          options={LAB_TESTS}
          value={d.tests}
          onChange={(v) => set("tests", v)}
        />
        <SelectField
          id="lab-order-lab"
          label="Lab"
          required
          options={LABS}
          value={d.lab}
          onChange={(v) => set("lab", v)}
        />
        <SelectField
          id="lab-order-priority"
          label="Priority"
          required
          options={LAB_PRIORITIES}
          value={d.priority}
          onChange={(v) => set("priority", v)}
        />
        <SelectField
          id="lab-order-diagnosis"
          label="Diagnosis"
          options={diagnoses}
          value={d.diagnosis}
          onChange={(v) => set("diagnosis", v)}
        />
        <DateField
          id="lab-order-collect"
          label="Collection date"
          required
          min={today()}
          value={d.collectOn}
          onChange={(v) => set("collectOn", v)}
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
            rows={3}
            placeholder="Type here..."
            value={d.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </Field>
      </div>

      <DialogFooter className="mt-0 shrink-0 flex-row items-center justify-end gap-2 border-t px-6 py-4">
        <span className="mr-auto text-xs text-muted-foreground">
          Ordering provider : <span className="text-foreground">{ME}</span>
        </span>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!ready}>
          Place order
        </Button>
      </DialogFooter>
    </form>
  )
}
