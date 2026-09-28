"use client"

import * as React from "react"
import { IconDownload, IconEdit, IconPrint } from "@/design-system/icons"

import { cn } from "@/lib/utils"
import {
  type ChartDocument,
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
  DocumentPaper,
  EncounterPaper,
  LabReportPaper,
} from "@/components/provider/chart-papers"
import { PracticeTag, useEntryDialog } from "@/components/provider/chart-forms"
import { isPractice } from "@/components/provider/chart-entries"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"

/* Encounters, Lab results and Documents share the Solid EHR notes and
   documents layout: the section bar, then a searchable list on the left and
   the selected item on the right as the document the source sent, with
   Print and Download under it. All three are read-only copies of what
   Health Gorilla returned (Encounter, DiagnosticReport, DocumentReference). */

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
  action,
  children,
  onDownload,
}: {
  title: string
  badge?: React.ReactNode
  /** Edit, for a record the practice entered. */
  action?: React.ReactNode
  children: React.ReactNode
  onDownload: () => void
}) {
  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3 print:hidden">
        <h2 className="truncate text-[15px] font-semibold">{title}</h2>
        {badge}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-sunken px-4 py-6 print:overflow-visible print:bg-white print:p-0">
        {children}
      </div>
      <div className="flex h-14 shrink-0 items-center justify-end gap-3 border-t px-3 print:hidden">
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

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <IconEdit />
      Edit
    </Button>
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

export function LabsView({
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
  const entry = useEntryDialog(record)
  const [query, setQuery] = React.useState("")
  const [from, setFrom] = React.useState("all")
  const rows = record.labReports.filter(
    (r) =>
      (from === "all" || r.sourceId === from) &&
      matches(query, r.name, r.accession, ...r.results.map((x) => x.name))
  )
  const current = rows.find((r) => r.id === selected) ?? rows[0]

  return (
    <Section>
      <SectionBar
        title="Lab reports"
        actions={
          <>
            <SearchBox
              value={query}
              onChange={setQuery}
              label="Search lab reports"
            />
            <SourceSelect
              items={record.labReports}
              value={from}
              onChange={setFrom}
              noun="labs"
            />
            {entry.addButton("lab")}
          </>
        }
      />
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
                    (isPractice(r) && <PracticeTag item={r} />)
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
              action={
                isPractice(current) && (
                  <EditButton onClick={() => entry.edit("lab", current.id)} />
                )
              }
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
      {entry.dialog}
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Documents                                                                  */
/* -------------------------------------------------------------------------- */

export function DocumentsView({
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
  const entry = useEntryDialog(record)
  const [query, setQuery] = React.useState("")
  const [from, setFrom] = React.useState("all")
  const rows = record.documents.filter(
    (d) =>
      (from === "all" || d.sourceId === from) &&
      matches(
        query,
        d.title,
        d.author,
        d.format,
        source(d.sourceId)?.name ?? ""
      )
  )
  const current = rows.find((d) => d.id === selected) ?? rows[0]

  return (
    <Section>
      <SectionBar
        title={`Documents (${record.documents.length})`}
        actions={
          <>
            <SearchBox
              value={query}
              onChange={setQuery}
              label="Search documents"
            />
            <SourceSelect
              items={record.documents}
              value={from}
              onChange={setFrom}
              noun="sources"
            />
            {entry.addButton("document")}
          </>
        }
      />
      <Split
        list={
          rows.length === 0 ? (
            <EmptyList>No documents match</EmptyList>
          ) : (
            rows.map((d) => (
              <ListItem
                key={d.id}
                title={d.title}
                selected={d.id === current?.id}
                onClick={() => onSelect(d.id)}
                badge={<FormatBadge doc={d} />}
                meta={
                  <span className="truncate">
                    Received on and by: {usDate(d.date)},{" "}
                    {source(d.sourceId)?.name}
                  </span>
                }
              />
            ))
          )
        }
        viewer={
          current ? (
            <Viewer
              title={current.title}
              action={
                isPractice(current) && (
                  <EditButton
                    onClick={() =>
                      entry.edit(
                        current.id.endsWith("-DOC") ? "imaging" : "document",
                        current.id.endsWith("-DOC")
                          ? current.id.slice(0, -4)
                          : current.id
                      )
                    }
                  />
                )
              }
              badge={<FormatBadge doc={current} />}
              onDownload={() =>
                download(`${current.title} ${current.date}`, [
                  current.title,
                  `Date: ${usDate(current.date)}`,
                  `Author: ${current.author}`,
                  ...current.sections.map((s) => `${s.heading}: ${s.text}`),
                ])
              }
            >
              <DocumentPaper patient={patient} record={record} d={current} />
            </Viewer>
          ) : (
            <EmptyList>Select a document</EmptyList>
          )
        }
      />
      {entry.dialog}
    </Section>
  )
}

function FormatBadge({ doc }: { doc: ChartDocument }) {
  return (
    <Badge
      variant={doc.format === "C-CDA" ? "info" : "warning"}
      className={PILL}
    >
      {doc.format}
    </Badge>
  )
}

/* -------------------------------------------------------------------------- */
/*  Imaging and pathology (DiagnosticReport)                                   */
/* -------------------------------------------------------------------------- */

export function StudiesView({
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
  const entry = useEntryDialog(record)
  const [query, setQuery] = React.useState("")
  const rows = record.studies
    .filter((s) => matches(query, s.name, s.performer, s.conclusion))
    .sort((a, b) => b.date.localeCompare(a.date))
  const current = rows.find((s) => s.id === selected) ?? rows[0]
  const doc = current
    ? record.documents.find((d) => d.id === current.documentId)
    : undefined

  return (
    <Section>
      <SectionBar
        title={`Imaging (${record.studies.length})`}
        actions={
          <>
            <SearchBox
              value={query}
              onChange={setQuery}
              label="Search imaging"
            />
            {entry.addButton("imaging")}
          </>
        }
      />
      <Split
        list={
          rows.length === 0 ? (
            <EmptyList>No imaging on record</EmptyList>
          ) : (
            rows.map((s) => (
              <ListItem
                key={s.id}
                title={s.name}
                selected={s.id === current?.id}
                onClick={() => onSelect(s.id)}
                badge={
                  isPractice(s) ? (
                    <PracticeTag item={s} />
                  ) : (
                    <Badge variant="success" className={PILL}>
                      {s.status}
                    </Badge>
                  )
                }
                meta={
                  <span className="truncate">
                    Resulted on and by: {usDate(s.date)},{" "}
                    {source(s.sourceId)?.name}
                  </span>
                }
              />
            ))
          )
        }
        viewer={
          current ? (
            <Viewer
              title={current.name}
              action={
                isPractice(current) && (
                  <EditButton
                    onClick={() => entry.edit("imaging", current.id)}
                  />
                )
              }
              badge={
                <Badge variant="success" className={PILL}>
                  {current.status}
                </Badge>
              }
              onDownload={() =>
                download(`${current.name} ${current.date}`, [
                  current.name,
                  `Date: ${usDate(current.date)}`,
                  `CPT: ${current.code}`,
                  `Read by: ${current.performer}`,
                  `Impression: ${current.conclusion}`,
                ])
              }
            >
              {doc ? (
                <DocumentPaper patient={patient} record={record} d={doc} />
              ) : (
                <EmptyList>The full report was not sent</EmptyList>
              )}
            </Viewer>
          ) : (
            <EmptyList>Select a study</EmptyList>
          )
        }
      />
      {entry.dialog}
    </Section>
  )
}
