"use client"

import * as React from "react"
import Link from "next/link"
import { IconDownload, IconFileText } from "@/design-system/icons"

import {
  type Column,
  Directory,
  exportRows,
} from "@/components/practice/directory"
import {
  type ImportRecord,
  type ImportResult,
  RESULT_LABEL,
  RESULT_VARIANT,
  countOf,
  importHistory,
} from "@/components/practice/import-history"
import {
  DetailGrid,
  RecordCard,
  RecordPage,
} from "@/components/practice/record-page"
import {
  SettingsBack,
  SettingsHeading,
} from "@/components/settings/settings-kit"
import { TablePager, usePaged } from "@/components/table-pager"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import { Empty, EmptyHeader, EmptyTitle } from "@/design-system/ui/empty"
import { Spinner } from "@/design-system/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"

/* The bulk uploads behind Settings > Security, below the audit log: each
   sheet with who uploaded it and when, and on opening it, every row with
   what became of it on its own page. The clinic manager sees the whole practice's uploads,
   the provider their own. */

const LISTS = ["Patients", "Providers"] as const

const BASE = {
  practice: "/screens/practice/settings",
  provider: "/screens/patients/settings",
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const timeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Los_Angeles",
})

const atLabel = (iso: string) => timeFormat.format(new Date(iso))

const duplicates = (r: ImportRecord) => countOf(r, "duplicate", "on-file")

export function ImportHistoryPage({
  scope,
}: {
  scope: "practice" | "provider"
}) {
  const { items } = importHistory.use()
  const rows =
    scope === "provider" ? items.filter((r) => r.portal === "provider") : items

  const columns: Column<ImportRecord>[] = [
    {
      id: "at",
      header: "Date and time",
      className: "w-48 whitespace-nowrap tabular-nums text-foreground/80",
      cell: (r) => atLabel(r.at),
      sortValue: (r) => r.at,
    },
    {
      id: "sheet",
      header: "Sheet",
      cell: (r) => (
        <Button
          variant="link"
          className="h-auto max-w-[18rem] justify-start gap-1.5 p-0 font-medium text-foreground"
          nativeButton={false}
          render={
            <Link href={`${BASE[scope]}/security/import-history/${r.id}`} />
          }
        >
          <IconFileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{r.fileName}</span>
        </Button>
      ),
      sortValue: (r) => r.fileName,
    },
    {
      id: "list",
      header: "List",
      className: "hidden md:table-cell text-foreground/80",
      cell: (r) => capital(r.list),
      sortValue: (r) => r.list,
    },
    {
      id: "actor",
      header: "Updated by",
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium">{r.actor}</span>
          <span className="text-xs text-muted-foreground">{r.role}</span>
        </div>
      ),
      sortValue: (r) => r.actor,
    },
    {
      id: "rows",
      header: "Rows",
      className: "w-20 tabular-nums",
      cell: (r) => r.rows.length,
      sortValue: (r) => r.rows.length,
    },
    {
      id: "new",
      header: "New",
      className: "hidden lg:table-cell w-20 tabular-nums",
      cell: (r) => countOf(r, "new"),
      sortValue: (r) => countOf(r, "new"),
    },
    {
      id: "duplicates",
      header: "Duplicates",
      className: "hidden lg:table-cell w-24 tabular-nums",
      cell: (r) => duplicates(r),
      sortValue: duplicates,
    },
    {
      id: "errors",
      header: "Errors",
      className: "hidden lg:table-cell w-20 tabular-nums",
      cell: (r) => countOf(r, "error"),
      sortValue: (r) => countOf(r, "error"),
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory
        title="Import history"
        leading={<SettingsBack />}
        heading={<SettingsHeading />}
        noun="uploads"
        rows={rows}
        columns={columns}
        search={(r) => [r.fileName, r.actor, r.list]}
        statusTabs={{ options: LISTS, value: (r) => capital(r.list) }}
        filters={
          scope === "practice"
            ? [
                {
                  id: "user",
                  label: "Updated by",
                  all: "Anyone",
                  options: [...new Set(rows.map((r) => r.actor))].sort(),
                  match: (r, v) => r.actor === v,
                },
              ]
            : []
        }
        exportName="Import history"
        exportRow={(r) => ({
          "Upload ID": r.id,
          "Date and time": atLabel(r.at),
          Sheet: r.fileName,
          List: capital(r.list),
          "Updated by": r.actor,
          Role: r.role,
          Rows: r.rows.length,
          New: countOf(r, "new"),
          Duplicates: duplicates(r),
          Reactivated: countOf(r, "reactivated"),
          "Needs review": countOf(r, "review"),
          Errors: countOf(r, "error"),
        })}
        emptyIllustration="no-results"
      />
    </div>
  )
}

/** One upload as its own page: the upload's details, then
    every row of the sheet as uploaded with what became of it. */
export function ImportSheetPage({
  scope,
  id,
}: {
  scope: "practice" | "provider"
  id: string
}) {
  const { items, ready } = importHistory.use()
  const record = items.find(
    (r) => r.id === id && (scope === "practice" || r.portal === "provider")
  )
  const back = `${BASE[scope]}/security/import-history`

  if (!record)
    return (
      <RecordPage title="Import history" backHref={back}>
        {ready ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyTitle>This upload isn&apos;t in the history</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex justify-center py-16">
            <Spinner className="size-6 text-primary-tint" />
          </div>
        )}
      </RecordPage>
    )
  return <SheetView record={record} back={back} />
}

function SheetView({
  record: r,
  back,
}: {
  record: ImportRecord
  back: string
}) {
  const paged = usePaged(r.rows)
  const one = r.list === "patients" ? "patient" : "provider"
  const label = (k: ImportResult) =>
    k === "new" ? `New ${one}` : RESULT_LABEL[k]

  return (
    <RecordPage
      title={r.fileName}
      backHref={back}
      action={
        <Button
          variant="outline"
          onClick={() =>
            exportRows(
              r.fileName.replace(/\.(csv|xlsx)$/i, "") + " results",
              r.rows.map((row) => ({
                Row: row.row,
                ...row.cells,
                Result: label(row.result),
                Note: row.note,
              }))
            )
          }
        >
          <IconDownload />
          Download
        </Button>
      }
    >
      <RecordCard title="Upload">
        <DetailGrid
          className="sm:grid-cols-2 lg:grid-cols-5"
          items={[
            { label: "Date and time", value: atLabel(r.at) },
            { label: "Updated by", value: r.actor },
            { label: "Role", value: r.role },
            { label: "List", value: capital(r.list) },
            { label: "Rows", value: r.rows.length },
          ]}
        />
      </RecordCard>

      <RecordCard title="Sheet">
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader className="bg-surface-head [&_th]:h-8 [&_th]:px-3 [&_th]:text-xs [&_th]:font-medium [&_th]:whitespace-nowrap [&_th]:text-muted-foreground">
                <TableRow>
                  <TableHead className="w-14">Row</TableHead>
                  <TableHead className="min-w-[16rem]">Result</TableHead>
                  {r.columns.map((c) => (
                    <TableHead key={c}>{c}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="[&_td]:px-3 [&_td]:py-2 [&_td]:align-top">
                {paged.visible.map((row) => (
                  <TableRow key={row.row}>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {row.row}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={RESULT_VARIANT[row.result]}>
                          {label(row.result)}
                        </Badge>
                        <span
                          className={
                            row.result === "error"
                              ? "text-xs text-destructive"
                              : "text-xs text-muted-foreground"
                          }
                        >
                          {row.note}
                        </span>
                      </div>
                    </TableCell>
                    {r.columns.map((c) => (
                      <TableCell
                        key={c}
                        className={
                          row.cells[c]
                            ? "whitespace-nowrap"
                            : "whitespace-nowrap text-muted-foreground/70"
                        }
                      >
                        {row.cells[c] || "Blank"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {paged.visible.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={r.columns.length + 2}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No rows match.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePager paged={paged} className="px-3 py-2" />
          </div>
        </div>
      </RecordCard>
    </RecordPage>
  )
}
