"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/design-system/ui/sonner"
import { IconCheck } from "@/design-system/icons"

import { createCollection, today } from "@/components/practice/collection-store"
import {
  type Column,
  Directory,
  ID_CELL,
  PersonCell,
  RowMenu,
  exportRows,
} from "@/components/practice/directory"
import {
  type LabReport,
  SOURCES,
  healthRecordFor,
} from "@/components/practice/health-record"
import {
  fullName,
  patients,
  usDate,
} from "@/components/practice/practice-data"
import { ME } from "@/components/provider/chart-epic"
import { ProviderShell } from "@/components/provider/provider-shell"
import { StatusDot } from "@/components/settings/settings-kit"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import { DropdownMenuItem } from "@/design-system/ui/dropdown-menu"

/* Every patient's lab reports in one list, newest first. A report from the
   last 90 days is New until the provider marks it reviewed here or opens it
   from the chart; older ones were reviewed at the time. Checked rows export
   together, one Excel row per result. */

const NEW_WITHIN_DAYS = 90
const STATUSES = ["New", "Reviewed"] as const
const PERIODS = ["Last 30 days", "Last 90 days", "Last 12 months"] as const
const PERIOD_DAYS: Record<string, number> = {
  "Last 30 days": 30,
  "Last 90 days": 90,
  "Last 12 months": 365,
}

/* The reports marked reviewed in this session. */
const reviewed = createCollection<{ id: string; at: string; by: string }>(
  "hol-provider-labs-reviewed",
  [],
  "1"
)

type LabRow = {
  id: string
  patientId: string
  patient: string
  photo: string
  dob: string
  report: LabReport
  lab: string
  flagged: number
  age: number
  status: (typeof STATUSES)[number]
}

function daysAgo(iso: string) {
  return Math.round((Date.parse(today()) - Date.parse(iso)) / 86_400_000)
}

const sourceName = (id: string) => SOURCES.find((s) => s.id === id)?.name ?? ""

export function LabsScreen() {
  return (
    <ProviderShell active="labs">
      <LabList />
    </ProviderShell>
  )
}

function LabList() {
  const router = useRouter()
  const { items } = patients.use()
  const marks = reviewed.use().items

  const reports = React.useMemo(
    () =>
      items.flatMap((p) =>
        healthRecordFor(p)
          .labReports.filter((r) => daysAgo(r.date) <= 365)
          .map((report) => ({ p, report }))
      ),
    [items]
  )

  const rows: LabRow[] = React.useMemo(() => {
    const done = new Set(marks.map((m) => m.id))
    return reports
      .map(({ p, report }) => {
        const id = `${p.id}-${report.id}`
        const age = daysAgo(report.date)
        return {
          id,
          patientId: p.id,
          patient: fullName(p),
          photo: p.photo,
          dob: p.dob,
          report,
          lab: sourceName(report.sourceId),
          flagged: report.results.filter((x) => x.flag).length,
          age,
          status:
            age <= NEW_WITHIN_DAYS && !done.has(id)
              ? ("New" as const)
              : ("Reviewed" as const),
        }
      })
      .sort((a, b) => a.age - b.age || a.patient.localeCompare(b.patient))
  }, [reports, marks])

  function markReviewed(list: LabRow[]) {
    const fresh = list.filter((r) => r.status === "New")
    if (fresh.length === 0) return
    reviewed.add(fresh.map((r) => ({ id: r.id, at: today(), by: ME })))
    toast.success(
      fresh.length === 1
        ? "Lab report marked reviewed"
        : `${fresh.length} lab reports marked reviewed`
    )
  }

  const openChart = (r: LabRow) =>
    router.push(
      `/screens/patients/${r.patientId}?section=labs&item=${r.report.id}`
    )

  const lines = (r: LabRow) =>
    r.report.results.map((x) => ({
      "Patient ID": r.patientId,
      Patient: r.patient,
      "Date of birth": usDate(r.dob),
      "Lab report": r.report.name,
      Resulted: usDate(r.report.date),
      Accession: r.report.accession,
      Lab: r.lab,
      "Ordered by": r.report.orderedBy,
      Test: x.name,
      LOINC: x.loinc,
      Value: x.value,
      Unit: x.unit,
      "Reference range": x.range,
      Flag: x.flag,
      Status: r.status,
    }))

  const columns: Column<LabRow>[] = [
    {
      id: "id",
      header: "Patient ID",
      className: ID_CELL,
      cell: (r) => r.patientId,
      sortValue: (r) => r.patientId,
    },
    {
      id: "patient",
      header: "Patient",
      cell: (r) => (
        <PersonCell name={r.patient} photo={r.photo} onOpen={() => openChart(r)} />
      ),
      sortValue: (r) => r.patient,
    },
    {
      id: "report",
      header: "Lab report",
      cell: (r) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{r.report.name}</span>
          {r.flagged > 0 && (
            <Badge
              variant="destructive"
              className="h-5 shrink-0 rounded-full px-2 text-[13px] font-normal"
            >
              {r.flagged} flagged
            </Badge>
          )}
        </span>
      ),
      sortValue: (r) => r.report.name,
    },
    {
      id: "tests",
      header: "Tests",
      className: "hidden w-20 tabular-nums text-foreground/80 lg:table-cell",
      cell: (r) => r.report.results.length,
      sortValue: (r) => r.report.results.length,
    },
    {
      id: "resulted",
      header: "Resulted",
      className: "w-32 tabular-nums text-foreground/80",
      cell: (r) => usDate(r.report.date),
      sortValue: (r) => -r.age,
    },
    {
      id: "lab",
      header: "Lab",
      className: "hidden text-foreground/80 xl:table-cell",
      cell: (r) => r.lab,
      sortValue: (r) => r.lab,
    },
    {
      id: "status",
      header: "Status",
      className: "w-28",
      cell: (r) => (
        <StatusDot tone={r.status === "New" ? "warning" : "muted"}>
          {r.status}
        </StatusDot>
      ),
      sortValue: (r) => r.status,
    },
    {
      id: "menu",
      header: "",
      className: "w-12 text-right",
      cell: (r) => (
        <RowMenu label={`Actions for ${r.report.name}`}>
          <DropdownMenuItem onClick={() => openChart(r)}>
            Open in chart
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={r.status !== "New"}
            onClick={() => markReviewed([r])}
          >
            Mark reviewed
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => exportRows(`${r.patient} ${r.report.name}`, lines(r))}
          >
            Export
          </DropdownMenuItem>
        </RowMenu>
      ),
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory<LabRow>
        title="Labs"
        noun="lab reports"
        rows={rows}
        columns={columns}
        search={(r) => [r.patient, r.patientId, r.report.name, r.lab, r.report.accession]}
        statusTabs={{ options: STATUSES, value: (r) => r.status }}
        filters={[
          {
            id: "period",
            label: "Resulted",
            all: "Any time",
            options: PERIODS,
            match: (r, v) => r.age <= PERIOD_DAYS[v],
          },
          {
            id: "report",
            label: "Lab report",
            all: "All lab reports",
            options: [...new Set(rows.map((r) => r.report.name))].sort(),
            match: (r, v) => r.report.name === v,
          },
          {
            id: "flag",
            label: "Results",
            all: "All results",
            options: ["Flagged", "In range"],
            match: (r, v) => (v === "Flagged" ? r.flagged > 0 : r.flagged === 0),
          },
        ]}
        bulkActions={(selected, clear) => (
          <Button
            variant="outline"
            size="sm"
            className="rounded-md"
            disabled={!selected.some((r) => r.status === "New")}
            onClick={() => {
              markReviewed(selected)
              clear()
            }}
          >
            <IconCheck />
            Mark reviewed
          </Button>
        )}
        exportName="Lab results"
        exportRow={(r) => lines(r)[0] ?? {}}
        exportLines={lines}
        emptyIllustration="no-results"
      />
    </div>
  )
}
