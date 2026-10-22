"use client"

import * as React from "react"
import { IconAdd, IconDownload, IconPrint } from "@/design-system/icons"
import { toast } from "@/design-system/ui/sonner"

import { cn } from "@/lib/utils"
import {
  type HealthRecord,
  SOURCES,
} from "@/components/practice/health-record"
import { type Patient, usDate } from "@/components/practice/practice-data"
import {
  SearchBox,
  Section,
  SectionBar,
  SourceSelect,
  matches,
} from "@/components/provider/chart-layout"
import {
  EncounterPaper,
  LabOrderPaper,
  LabReportPaper,
} from "@/components/provider/chart-papers"
import {
  type LabOrder,
  LabOrderDialog,
  labOrders,
} from "@/components/provider/chart-lab-orders"
import {
  type Updated,
  atLabel,
  updatedOf,
} from "@/components/provider/chart-epic"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"

/* Encounters, Lab results and Documents share the Solid EHR notes and
   documents layout: the section bar, then a searchable list on the left and
   the selected item on the right as the document the source sent, with
   Print and Download under it. All three are read-only copies of what
   Health Gorilla returned (Encounter, DiagnosticReport, DocumentReference),
   apart from the Lab orders tab, where the provider orders tests. */

const source = (id: string) => SOURCES.find((s) => s.id === id)

/* -------------------------------------------------------------------------- */
/*  Shared layout                                                              */
/* -------------------------------------------------------------------------- */

function Split({
  list,
  viewer,
}: {
  list: React.ReactNode
  viewer: React.ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 max-lg:flex-col">
      <div className="flex shrink-0 flex-col gap-1 overflow-y-auto border-border p-3 pb-6 max-lg:max-h-72 max-lg:border-b lg:w-[340px] lg:border-r print:hidden">
        {list}
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{viewer}</div>
    </div>
  )
}

function ListItem({
  title,
  badge,
  meta,
  selected,
  onClick,
}: {
  title: string
  badge?: React.ReactNode
  meta: React.ReactNode
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex shrink-0 flex-col gap-1.5 rounded-md border px-2.5 py-2.5 text-left transition-colors",
        selected
          ? "border-primary/40 bg-primary-surface"
          : "border-transparent hover:bg-surface-hover"
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{title}</span>
        {badge}
      </span>
      <span className="flex min-w-0 items-center gap-x-2 text-xs whitespace-nowrap text-muted-foreground">
        {meta}
      </span>
    </button>
  )
}

function Sep() {
  return <span aria-hidden className="h-3.5 w-px shrink-0 bg-border" />
}

function EmptyList({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}

const PILL = "h-5 shrink-0 rounded-full px-2 text-[13px] font-normal"

/* Plain-text copy of what is on the page, for Download. The original C-CDA
   or PDF comes from Health Gorilla once the integration is live. */
function download(name: string, lines: string[]) {
  const blob = new Blob([lines.join("\n")], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${name.replace(/[^\w ,.-]+/g, "").trim()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

/** The selected item: its title bar, the paper on a grey canvas, and the
    Print and Download bar under it. */
function Viewer({
  title,
  badge,
  updated,
  children,
  onDownload,
  action,
}: {
  title: string
  badge?: React.ReactNode
  /** Who last changed it in Epic, and when. */
  updated: Updated
  children: React.ReactNode
  onDownload: () => void
  /** One more footer button, on the left. */
  action?: React.ReactNode
}) {
  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3 print:hidden">
        <h2 className="truncate text-[15px] font-semibold">{title}</h2>
        {badge}
        <div className="ml-auto flex shrink-0 gap-x-4 text-xs text-muted-foreground tabular-nums max-sm:hidden">
          <span>
            Updated by : <span className="text-foreground">{updated.by}</span>
          </span>
          <span>
            Updated on :{" "}
            <span className="text-foreground">{atLabel(updated.at)}</span>
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-sunken px-4 py-6 print:overflow-visible print:bg-white print:p-0">
        {children}
      </div>
      <div className="flex h-14 shrink-0 items-center justify-end gap-3 border-t px-3 print:hidden">
        {action && <div className="mr-auto">{action}</div>}
        <Button variant="outline" onClick={() => window.print()}>
          <IconPrint />
          Print
        </Button>
        <Button variant="outline" onClick={onDownload}>
          <IconDownload />
          Download
        </Button>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Encounters                                                                 */
/* -------------------------------------------------------------------------- */

export function EncountersView({
  patient,
  record,
  selected,
  onSelect,
}: {
  patient: Patient
  record: HealthRecord
  selected: string
  onSelect: (id: string) => void
}) {
  const [from, setFrom] = React.useState("all")
  const [query, setQuery] = React.useState("")
  const rows = record.encounters.filter(
    (e) =>
      (from === "all" || e.sourceId === from) &&
      matches(query, e.type, e.clinician, e.where, e.reason)
  )
  const current = rows.find((e) => e.id === selected) ?? rows[0]

  return (
    <Section>
      <SectionBar
        title={`Encounters (${record.encounters.length})`}
        actions={
          <>
            <SearchBox
              value={query}
              onChange={setQuery}
              label="Search encounters"
            />
            <SourceSelect
              items={record.encounters}
              value={from}
              onChange={setFrom}
              noun="sources"
            />
          </>
        }
      />
      <Split
        list={
          rows.length === 0 ? (
            <EmptyList>No encounters match</EmptyList>
          ) : (
            rows.map((e) => (
              <ListItem
                key={e.id}
                title={e.type}
                selected={e.id === current?.id}
                onClick={() => onSelect(e.id)}
                badge={
                  <Badge variant="secondary" className={PILL}>
                    {e.kind}
                  </Badge>
                }
                meta={
                  <>
                    <span className="shrink-0">Date: {usDate(e.date)}</span>
                    <Sep />
                    <span className="truncate">
                      {e.clinician
                        ? `Provider: ${e.clinician}`
                        : `Where: ${e.where}`}
                    </span>
                  </>
                }
              />
            ))
          )
        }
        viewer={
          current ? (
            <Viewer
              title={current.note ? `${current.type} note` : current.type}
              updated={updatedOf(current.id, current.date, current.clinician)}
              badge={
                <Badge variant="success" className={PILL}>
                  Completed
                </Badge>
              }
              onDownload={() =>
                download(`${current.type} ${current.date}`, [
                  `${current.type}, ${usDate(current.date)} ${current.start} to ${current.end}`,
                  `Location: ${current.where}`,
                  `Provider: ${current.clinician || "Not recorded"}`,
                  `Reason for visit: ${current.reason}`,
                  ...(current.note
                    ? [
                        `Chief complaint: ${current.note.chiefComplaint}`,
                        `History of present illness: ${current.note.hpi}`,
                        `Assessment: ${current.note.assessment}`,
                        `Plan: ${current.note.plan}`,
                      ]
                    : []),
                ])
              }
            >
              <EncounterPaper patient={patient} record={record} e={current} />
            </Viewer>
          ) : (
            <EmptyList>Select an encounter</EmptyList>
          )
        }
      />
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Lab results                                                                */
/* -------------------------------------------------------------------------- */

const ORDER_BADGE: Record<LabOrder["status"], "info" | "secondary"> = {
  Ordered: "info",
  Cancelled: "secondary",
}

export function LabsView({
  patient,
  record,
  tab,
  onTab,
  selected,
  onSelect,
}: {
  patient: Patient
  record: HealthRecord
  tab: "reports" | "orders"
  onTab: (tab: "reports" | "orders", item?: string) => void
  selected: string
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = React.useState("")
  const [from, setFrom] = React.useState("all")
  const [ordering, setOrdering] = React.useState(false)
  const { items: allOrders } = labOrders.use()
  const orders = allOrders.filter((o) => o.patientId === patient.id)

  const addOrder = (
    <Button size="sm" onClick={() => setOrdering(true)}>
      <IconAdd />
      Add lab order
    </Button>
  )

  return (
    <Section>
      <SectionBar
        tabs={[
          { id: "reports", label: `Lab reports (${record.labReports.length})` },
          { id: "orders", label: `Lab orders (${orders.length})` },
        ]}
        value={tab}
        onTab={(t) => onTab(t as "reports" | "orders")}
        actions={
          <>
            <SearchBox
              value={query}
              onChange={setQuery}
              label={tab === "orders" ? "Search lab orders" : "Search lab reports"}
            />
            {tab === "reports" && (
              <SourceSelect
                items={record.labReports}
                value={from}
                onChange={setFrom}
                noun="labs"
              />
            )}
            {addOrder}
          </>
        }
      />
      {tab === "orders" ? (
        <LabOrders
          patient={patient}
          orders={orders.filter((o) =>
            matches(query, o.id, o.lab, o.diagnosis, ...o.tests)
          )}
          selected={selected}
          onSelect={onSelect}
          onAdd={() => setOrdering(true)}
        />
      ) : (
        <LabReports
          patient={patient}
          rows={record.labReports.filter(
            (r) =>
              (from === "all" || r.sourceId === from) &&
              matches(
                query,
                r.name,
                r.accession,
                ...r.results.map((x) => x.name)
              )
          )}
          selected={selected}
          onSelect={onSelect}
        />
      )}
      <LabOrderDialog
        open={ordering}
        patientId={patient.id}
        record={record}
        onClose={() => setOrdering(false)}
        onCreated={(order) => {
          setOrdering(false)
          onTab("orders", order.id)
          toast.success(`Lab order ${order.id} placed`)
        }}
      />
    </Section>
  )
}

function LabReports({
  patient,
  rows,
  selected,
  onSelect,
}: {
  patient: Patient
  rows: HealthRecord["labReports"]
  selected: string
  onSelect: (id: string) => void
}) {
  const current = rows.find((r) => r.id === selected) ?? rows[0]
  return (
    <Split
      list={
        rows.length === 0 ? (
          <EmptyList>No lab reports match</EmptyList>
        ) : (
          rows.map((r) => {
            const flagged = r.results.filter((x) => x.flag).length
            return (
              <ListItem
                key={r.id}
                title={r.name}
                selected={r.id === current?.id}
                onClick={() => onSelect(r.id)}
                badge={
                  (flagged > 0 && (
                    <Badge variant="destructive" className={PILL}>
                      {flagged} flagged
                    </Badge>
                  )) ||
                  undefined
                }
                meta={
                  <span className="truncate">
                    Resulted on and by: {usDate(r.date)},{" "}
                    {source(r.sourceId)?.name}
                  </span>
                }
              />
            )
          })
        )
      }
      viewer={
        current ? (
          <Viewer
            title={current.name}
            updated={updatedOf(current.id, current.date, current.reviewer)}
            badge={
              <Badge variant="success" className={PILL}>
                {current.status}
              </Badge>
            }
            onDownload={() =>
              download(`${current.name} ${current.date}`, [
                `${current.name}, resulted ${usDate(current.date)}`,
                `Accession: ${current.accession}`,
                `Ordered by: ${current.orderedBy || "Not recorded"}`,
                ...current.results.map(
                  (x) =>
                    `${x.name}: ${x.value} ${x.unit} (range ${x.range || "none"})${x.flag ? ` ${x.flag}` : ""}`
                ),
              ])
            }
          >
            <LabReportPaper patient={patient} reports={[current]} />
          </Viewer>
        ) : (
          <EmptyList>Select a lab report</EmptyList>
        )
      }
    />
  )
}

function LabOrders({
  patient,
  orders,
  selected,
  onSelect,
  onAdd,
}: {
  patient: Patient
  orders: LabOrder[]
  selected: string
  onSelect: (id: string) => void
  onAdd: () => void
}) {
  const current = orders.find((o) => o.id === selected) ?? orders[0]
  return (
    <Split
      list={
        orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-2 py-6">
            <p className="text-sm text-muted-foreground">No lab orders yet</p>
            <Button size="sm" variant="outline" onClick={onAdd}>
              <IconAdd />
              Add lab order
            </Button>
          </div>
        ) : (
          orders.map((o) => (
            <ListItem
              key={o.id}
              title={
                o.tests.length > 1
                  ? `${o.tests[0]} +${o.tests.length - 1}`
                  : o.tests[0]
              }
              selected={o.id === current?.id}
              onClick={() => onSelect(o.id)}
              badge={
                <Badge variant={ORDER_BADGE[o.status]} className={PILL}>
                  {o.status}
                </Badge>
              }
              meta={
                <>
                  <span className="shrink-0">
                    Collect on: {usDate(o.collectOn)}
                  </span>
                  <Sep />
                  <span className="truncate">{o.lab}</span>
                </>
              }
            />
          ))
        )
      }
      viewer={
        current ? (
          <Viewer
            title={`Lab order ${current.id}`}
            updated={{ by: current.orderedBy, at: current.orderedAt }}
            badge={
              <Badge variant={ORDER_BADGE[current.status]} className={PILL}>
                {current.status}
              </Badge>
            }
            action={
              current.status === "Ordered" && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    labOrders.patch(current.id, { status: "Cancelled" })
                    toast.success(`Lab order ${current.id} cancelled`)
                  }}
                >
                  Cancel order
                </Button>
              )
            }
            onDownload={() =>
              download(`Lab order ${current.id}`, [
                `Lab order ${current.id}, ${current.status}`,
                `Ordered by: ${current.orderedBy}, ${atLabel(current.orderedAt)}`,
                `Lab: ${current.lab}`,
                `Priority: ${current.priority}`,
                `Collect on: ${usDate(current.collectOn)}`,
                `Fasting: ${current.fasting ? "Yes" : "No"}`,
                `Diagnosis: ${current.diagnosis || "Not given"}`,
                ...current.tests.map((t) => `Test: ${t}`),
                ...(current.note ? [`Note: ${current.note}`] : []),
              ])
            }
          >
            <LabOrderPaper
              patient={patient}
              order={current}
              orderedOn={atLabel(current.orderedAt)}
            />
          </Viewer>
        ) : (
          <EmptyList>Select a lab order</EmptyList>
        )
      }
    />
  )
}
