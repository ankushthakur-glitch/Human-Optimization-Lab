"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import {
  IconAlert,
  IconCheckCircle,
  IconDownload,
  IconFileText,
  IconRefresh,
  IconWarning,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { VALIDATE } from "@/components/form-kit"
import { Badge } from "@/design-system/ui/badge"
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
import { FieldError } from "@/design-system/ui/field"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/design-system/ui/item"
import { Label } from "@/design-system/ui/label"
import { Spinner } from "@/design-system/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import { TablePager, usePaged } from "@/components/table-pager"
import { Illustration } from "@/components/illustrations/illustration"
import {
  type ImportResult,
  recordImport,
} from "@/components/practice/import-history"
import { usePortal } from "@/components/practice/portal"

/* -------------------------------------------------------------------------- */
/*  Spec                                                                       */
/* -------------------------------------------------------------------------- */

export type ImportColumn = {
  header: string
  required?: boolean
  example: string
  /** The values the column accepts, listed on the template's second sheet. */
  options?: readonly string[]
  width?: number
}

export type ParsedRow<T> = {
  /** The spreadsheet row number, header included, as Excel shows it. */
  row: number
  label: string
  detail: string
  value?: T
  errors: string[]
  /** A soft issue: the row can still be imported. */
  warning?: string
  /** Rows with the same key in one file are flagged as repeats. */
  key?: string
  /** The row matched a record already on file: it isn't created as new. */
  outcome?: RowOutcome
}

/* What happens to a row that matched an existing record: skipped (already on
   file), reactivated (fresh consent), or held for review. */
export type RowOutcome = {
  kind: "skip" | "reactivate" | "review"
  badge: string
  note: string
  /** The existing record the row matched. */
  ref?: string
}

const OUTCOME_VARIANT = {
  skip: "secondary",
  reactivate: "info",
  review: "warning",
} as const

export type ImportSpec<T> = {
  one: string
  many: string
  sheetName: string
  fileName: string
  columns: ImportColumn[]
  /** Turns one row's cells (keyed by column header) into a value or errors. */
  parse: (cells: Record<string, string>, row: number) => ParsedRow<T>
  onImport: (values: T[]) => void
  /** Rows the duplicate check routed elsewhere (see RowOutcome). Setting it
      replaces the "skip possible duplicates" choice with per-row outcomes. */
  onResolve?: (rows: ParsedRow<T>[]) => void
  /** Adds the records without emailing anyone; invites go out by hand later. */
  addOnly?: boolean
}

const MAX_ROWS = 1000

/* -------------------------------------------------------------------------- */
/*  Reading                                                                    */
/* -------------------------------------------------------------------------- */

const norm = (header: string) =>
  header.replace(/\*/g, "").trim().toLowerCase().replace(/\s+/g, " ")

const pad2 = (n: number) => String(n).padStart(2, "0")

/* Excel hands dates back as Date objects at UTC midnight; anything else is
   read as the text the person typed. */
function cellText(cell: unknown): string {
  if (cell == null) return ""
  if (cell instanceof Date) {
    return `${pad2(cell.getUTCMonth() + 1)}/${pad2(cell.getUTCDate())}/${cell.getUTCFullYear()}`
  }
  if (typeof cell === "boolean") return cell ? "Yes" : "No"
  return String(cell).trim()
}

/* A small CSV reader: quoted fields, doubled quotes and CRLF line ends. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else field += c
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

async function readRows(file: File): Promise<unknown[][]> {
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text())
  const { readSheet } = await import("read-excel-file/browser")
  return (await readSheet(file)) as unknown[][]
}

type ReadResult<T> =
  { ok: true; rows: ParsedRow<T>[] } | { ok: false; message: string }

async function readFile<T>(
  file: File,
  spec: ImportSpec<T>
): Promise<ReadResult<T>> {
  let raw: unknown[][]
  try {
    raw = await readRows(file)
  } catch {
    return {
      ok: false,
      message:
        "This file couldn't be read. Save it as .xlsx or .csv and try again.",
    }
  }

  const grid = raw
    .map((cells) => cells.map(cellText))
    .filter((cells) => cells.some(Boolean))
  if (grid.length === 0) return { ok: false, message: "The file is empty." }

  const header = grid[0].map(norm)
  const index = new Map<string, number>()
  spec.columns.forEach((column) => {
    const at = header.indexOf(norm(column.header))
    if (at >= 0) index.set(column.header, at)
  })
  const missing = spec.columns
    .filter((c) => c.required && !index.has(c.header))
    .map((c) => c.header)
  if (VALIDATE && missing.length) {
    return {
      ok: false,
      message: `Missing columns: ${missing.join(", ")}. Use the template's header row.`,
    }
  }

  const body = grid.slice(1)
  if (body.length === 0) {
    return { ok: false, message: `No ${spec.many} found under the header row.` }
  }
  if (body.length > MAX_ROWS) {
    return {
      ok: false,
      message: `Up to ${MAX_ROWS} ${spec.many} per file. Split the sheet and import each part.`,
    }
  }

  const seen = new Map<string, number>()
  const rows = body.map((cells, i) => {
    const record: Record<string, string> = {}
    spec.columns.forEach((column) => {
      const at = index.get(column.header)
      record[column.header] = at === undefined ? "" : (cells[at] ?? "")
    })
    const rowNumber = i + 2
    const parsed = spec.parse(record, rowNumber)
    if (VALIDATE && parsed.key) {
      const first = seen.get(parsed.key)
      if (first) parsed.errors.push(`Repeats row ${first}.`)
      else seen.set(parsed.key, rowNumber)
    }
    return parsed
  })
  return { ok: true, rows }
}

/* -------------------------------------------------------------------------- */
/*  Writing                                                                    */
/* -------------------------------------------------------------------------- */

const HEAD_CELL = {
  fontWeight: "bold" as const,
  backgroundColor: "#EAFCFA",
}

/** The blank template: the header row alone, required columns marked *. */
function downloadCsvTemplate<T>(spec: ImportSpec<T>) {
  const quote = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
  const header = spec.columns
    .map((c) => quote(c.required ? `${c.header}*` : c.header))
    .join(",")
  const url = URL.createObjectURL(
    new Blob([`${header}\r\n`], { type: "text/csv;charset=utf-8" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = spec.fileName.replace(/\.xlsx$/i, "") + ".csv"
  link.click()
  URL.revokeObjectURL(url)
}

/** Spreadsheet column letters: A to Z, then AA, AB and on. */
function columnLetter(index: number): string {
  let n = index + 1
  let out = ""
  while (n > 0) {
    const r = (n - 1) % 26
    out = String.fromCharCode(65 + r) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

/* The xlsx reference sheet (template, example and allowed values), kept for
   when the import screen offers it again. */
export async function downloadTemplate<T>(spec: ImportSpec<T>) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser")
  const headers = spec.columns.map((c) => ({
    value: c.required ? `${c.header}*` : c.header,
    ...HEAD_CELL,
  }))
  const widths = spec.columns.map((c) => ({ width: c.width ?? 20 }))
  const lists = spec.columns.filter((c) => c.options?.length)
  const longest = Math.max(0, ...lists.map((c) => c.options!.length))

  await writeXlsxFile([
    {
      sheet: spec.sheetName,
      data: [headers],
      columns: widths,
      stickyRowsCount: 1,
    },
    {
      sheet: "Example",
      data: [headers, spec.columns.map((c) => c.example)],
      columns: widths,
      stickyRowsCount: 1,
    },
    {
      sheet: "Allowed values",
      data: [
        lists.map((c) => ({ value: c.header, ...HEAD_CELL })),
        ...Array.from({ length: longest }, (_, i) =>
          lists.map((c) => c.options![i] ?? "")
        ),
      ],
      columns: lists.map(() => ({ width: 24 })),
      stickyRowsCount: 1,
    },
  ]).toFile(spec.fileName)
}

async function downloadIssues<T>(spec: ImportSpec<T>, rows: ParsedRow<T>[]) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser")
  await writeXlsxFile(
    [
      [
        { value: "Row", ...HEAD_CELL },
        { value: "Name", ...HEAD_CELL },
        { value: "Issue", ...HEAD_CELL },
      ],
      ...rows.map((r) => [
        r.row,
        r.label,
        [...r.errors, r.warning].filter(Boolean).join(" "),
      ]),
    ],
    { columns: [{ width: 8 }, { width: 28 }, { width: 70 }] }
  ).toFile(`${spec.many} import issues.xlsx`)
}

/* -------------------------------------------------------------------------- */
/*  Dialog                                                                     */
/* -------------------------------------------------------------------------- */

export function BulkImportDialog<T>({
  open,
  onOpenChange,
  spec,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  spec: ImportSpec<T>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        {/* Mounted per open, so each import starts from an empty drop zone. */}
        {open && <ImportBody spec={spec} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ImportBody<T>({
  spec,
  onDone,
}: {
  spec: ImportSpec<T>
  onDone: () => void
}) {
  const portal = usePortal()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [file, setFile] = React.useState<File | null>(null)
  const [reading, setReading] = React.useState(false)
  const [fileError, setFileError] = React.useState("")
  const [rows, setRows] = React.useState<ParsedRow<T>[] | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const [skipDuplicates, setSkipDuplicates] = React.useState(true)

  async function take(next: File | undefined) {
    if (!next) return
    if (!/\.(xlsx|csv)$/i.test(next.name)) {
      setFileError("Choose an .xlsx or .csv file.")
      return
    }
    setFile(next)
    setFileError("")
    setReading(true)
    const result = await readFile(next, spec)
    setReading(false)
    if (result.ok) setRows(result.rows)
    else setFileError(result.message)
  }

  function reset() {
    setFile(null)
    setRows(null)
    setFileError("")
    if (inputRef.current) inputRef.current.value = ""
  }

  const invalid = rows?.filter((r) => r.errors.length) ?? []
  const routed = rows?.filter((r) => !r.errors.length && r.outcome) ?? []
  const flagged =
    rows?.filter((r) => !r.errors.length && !r.outcome && r.warning) ?? []
  const ready =
    rows?.filter(
      (r) =>
        !r.errors.length &&
        r.value &&
        !r.outcome &&
        !(skipDuplicates && r.warning)
    ) ?? []
  const count = (kind: RowOutcome["kind"]) =>
    routed.filter((r) => r.outcome?.kind === kind).length
  const actionable = count("reactivate") + count("review")

  function runImport() {
    if (ready.length) spec.onImport(ready.map((r) => r.value as T))
    if (routed.length) spec.onResolve?.(routed)
    if (rows) {
      recordImport({
        portal: portal.key,
        list: spec.many,
        fileName: file?.name ?? `${spec.many} import.csv`,
        rows: rows.map((r) => {
          const { result, note } = rowResult(r, skipDuplicates, spec.addOnly)
          return {
            row: r.row,
            name: r.label || "Unnamed",
            detail: r.detail,
            result,
            note,
          }
        }),
      })
    }
    onDone()
    const n = ready.length
    const noun = n === 1 ? spec.one : spec.many
    const skipped =
      invalid.length + count("skip") + (skipDuplicates ? flagged.length : 0)
    const notes = [
      count("reactivate") && `${count("reactivate")} reactivated`,
      count("review") && `${count("review")} sent to review`,
      skipped && `${skipped} ${skipped === 1 ? "row" : "rows"} skipped`,
    ].filter(Boolean)
    toast.success(`${n} ${noun} ${spec.addOnly ? "added" : "invited"}`, {
      description: notes.length ? `${notes.join(", ")}.` : undefined,
    })
  }

  return (
    <>
      <DialogHeader className="border-b p-6">
        <DialogTitle>Bulk add {spec.many}</DialogTitle>
        <DialogDescription className="sr-only">
          Upload a spreadsheet of {spec.many} to{" "}
          {spec.addOnly ? "add" : "invite"} them in one step.
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-6">
        {/* Step 1: the blank template, so the upload comes back in the
            columns the importer reads. */}
        <Step n={1} title="Download CSV File">
          <Button
            variant="outline"
            size="lg"
            className="w-fit border-primary/40 bg-primary-surface/60 text-primary-tint hover:bg-primary-surface"
            onClick={() => downloadCsvTemplate(spec)}
          >
            <IconDownload />
            Download Blank CSV Template
          </Button>
        </Step>

        {/* Step 2: what goes in it, laid out like the spreadsheet itself. */}
        <Step n={2} title={`Add or edit ${spec.one} info in the CSV template`}>
          <TemplatePreview columns={spec.columns} />
        </Step>

        {/* Step 3: the file. */}
        <Step n={3} title="Upload CSV File">
          {!rows ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  inputRef.current?.click()
                }
              }}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                take(event.dataTransfer.files[0])
              }}
              className={cn(
                "flex w-full max-w-md cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors outline-none",
                "hover:border-primary/60 hover:bg-primary-surface/40 focus-visible:ring-3 focus-visible:ring-ring/40",
                dragging && "border-primary bg-primary-surface/60",
                fileError && "border-destructive/60"
              )}
            >
              {reading ? (
                <>
                  <Spinner className="size-6 text-primary-tint" />
                  <p className="text-sm">Reading {file?.name}</p>
                </>
              ) : (
                <>
                  <Illustration name="csv-upload" className="size-24" />
                  <p className="text-sm font-medium">Attach CSV File</p>
                  {fileError && (
                    <FieldError className="flex items-center gap-1.5">
                      <IconAlert className="size-4" />
                      {fileError}
                    </FieldError>
                  )}
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => take(event.target.files?.[0])}
              />
            </div>
          ) : (
            <Review
              spec={spec}
              file={file}
              rows={rows}
              invalid={invalid}
              flagged={flagged}
              routed={routed}
              ready={ready.length}
              skipDuplicates={skipDuplicates}
              onSkipDuplicates={setSkipDuplicates}
              onReset={reset}
            />
          )}
        </Step>
      </div>

      <DialogFooter className="mt-0 shrink-0 flex-row items-center justify-end gap-2 border-t p-4">
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          disabled={!rows || ready.length + actionable === 0}
          onClick={runImport}
        >
          {rows && spec.onResolve && ready.length + actionable > 0
            ? `Import ${ready.length + actionable} ${ready.length + actionable === 1 ? "row" : "rows"}`
            : rows && ready.length > 0
              ? `${spec.addOnly ? "Add" : "Invite"} ${ready.length} ${ready.length === 1 ? spec.one : spec.many}`
              : `${spec.addOnly ? "Add" : "Invite"} ${spec.many}`}
        </Button>
      </DialogFooter>
    </>
  )
}

/* What became of one row, for the import history. Errors that only say the
   person is already on file, or repeat an earlier row, count as duplicates. */
function rowResult<T>(
  r: ParsedRow<T>,
  skipDuplicates: boolean,
  addOnly?: boolean
): { result: ImportResult; note: string } {
  if (r.errors.length) {
    const note = r.errors.join(" ")
    const repeat = r.errors.every((e) =>
      /already exists|^Repeats row/.test(e)
    )
    return { result: repeat ? "duplicate" : "error", note }
  }
  if (r.outcome) {
    const result = (
      { skip: "on-file", reactivate: "reactivated", review: "review" } as const
    )[r.outcome.kind]
    return { result, note: r.outcome.note }
  }
  if (r.warning && skipDuplicates)
    return { result: "duplicate", note: `${r.warning} Skipped.` }
  return {
    result: "new",
    note: r.warning ?? (addOnly ? "Added" : "Invited"),
  }
}

function Review<T>({
  spec,
  file,
  rows,
  invalid,
  flagged,
  routed,
  ready,
  skipDuplicates,
  onSkipDuplicates,
  onReset,
}: {
  spec: ImportSpec<T>
  file: File | null
  rows: ParsedRow<T>[]
  invalid: ParsedRow<T>[]
  flagged: ParsedRow<T>[]
  routed: ParsedRow<T>[]
  ready: number
  skipDuplicates: boolean
  onSkipDuplicates: (skip: boolean) => void
  onReset: () => void
}) {
  /* Problems first, so nobody has to scroll to find what needs fixing. */
  const ordered = [...rows].sort(
    (a, b) =>
      Number(b.errors.length > 0) - Number(a.errors.length > 0) ||
      Number(Boolean(b.outcome)) - Number(Boolean(a.outcome)) ||
      Number(Boolean(b.warning)) - Number(Boolean(a.warning)) ||
      a.row - b.row
  )
  const paged = usePaged(ordered, 8)
  const issues = [...invalid, ...flagged]
  const routedCount = (kind: RowOutcome["kind"]) =>
    routed.filter((r) => r.outcome?.kind === kind).length

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <IconFileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{file?.name}</span>
          <span className="shrink-0 text-muted-foreground tabular-nums">
            {rows.length} {rows.length === 1 ? "row" : "rows"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {issues.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadIssues(spec, issues)}
            >
              <IconDownload />
              Issues
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onReset}>
            <IconRefresh />
            Choose another file
          </Button>
        </div>
      </div>

      {spec.onResolve ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat
            icon={<IconCheckCircle className="size-4" />}
            tone="success"
            label="New records"
            value={rows.length - invalid.length - routed.length}
          />
          <Stat
            icon={<IconFileText className="size-4" />}
            tone="neutral"
            label="Already on file"
            value={routedCount("skip")}
          />
          <Stat
            icon={<IconRefresh className="size-4" />}
            tone="info"
            label="To reactivate"
            value={routedCount("reactivate")}
          />
          <Stat
            icon={<IconWarning className="size-4" />}
            tone="warning"
            label="Needs review"
            value={routedCount("review")}
          />
          <Stat
            icon={<IconAlert className="size-4" />}
            tone="destructive"
            label="Errors"
            value={invalid.length}
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            icon={<IconCheckCircle className="size-4" />}
            tone="success"
            label="Ready"
            value={rows.length - invalid.length - flagged.length}
          />
          <Stat
            icon={<IconWarning className="size-4" />}
            tone="warning"
            label="Possible duplicates"
            value={flagged.length}
          />
          <Stat
            icon={<IconAlert className="size-4" />}
            tone="destructive"
            label="Errors"
            value={invalid.length}
          />
        </div>
      )}

      {flagged.length > 0 && !spec.onResolve && (
        <Label className="flex items-center gap-2 text-sm font-normal">
          <Checkbox
            checked={skipDuplicates}
            onCheckedChange={(checked) => onSkipDuplicates(checked === true)}
          />
          Skip possible duplicates
        </Label>
      )}

      <div className="overflow-hidden rounded-md border">
        <Table containerClassName="max-h-[40svh] overflow-auto">
          <TableHeader className="sticky top-0 z-10 bg-surface-head [&_th]:h-8 [&_th]:px-3 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
            <TableRow>
              <TableHead className="w-14">Row</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Details</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_td]:px-3 [&_td]:py-2 [&_td]:align-top">
            {paged.visible.map((r) => (
              <TableRow key={r.row}>
                <TableCell className="text-muted-foreground tabular-nums">
                  {r.row}
                </TableCell>
                <TableCell className="max-w-[12rem] truncate font-medium">
                  {r.label || "Unnamed"}
                </TableCell>
                <TableCell className="hidden max-w-[14rem] truncate text-muted-foreground sm:table-cell">
                  {r.detail}
                </TableCell>
                <TableCell className="min-w-[14rem] whitespace-normal">
                  {r.errors.length ? (
                    <div className="flex flex-col gap-1">
                      <Badge variant="destructive">Error</Badge>
                      <span className="text-xs text-destructive">
                        {r.errors.join(" ")}
                      </span>
                    </div>
                  ) : r.outcome ? (
                    <div className="flex flex-col gap-1">
                      <Badge variant={OUTCOME_VARIANT[r.outcome.kind]}>
                        {r.outcome.badge}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {r.outcome.note}
                      </span>
                    </div>
                  ) : r.warning ? (
                    <div className="flex flex-col gap-1">
                      <Badge variant="warning">
                        {skipDuplicates ? "Skipped" : "Possible duplicate"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {r.warning}
                      </span>
                    </div>
                  ) : (
                    <Badge variant="success">
                      {spec.onResolve ? "New record" : "Ready"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePager paged={paged} className="px-3 py-2" />
      </div>

      {ready === 0 && routed.length === 0 && (
        <div className="flex items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <Illustration name="import-errors" className="size-24 shrink-0" />
          <p className="text-sm text-destructive">
            No rows can be imported yet. Fix the errors in the file, then choose
            it again.
          </p>
        </div>
      )}
    </div>
  )
}

export function Stat({
  icon,
  tone,
  label,
  value,
}: {
  icon: React.ReactNode
  tone: "success" | "warning" | "destructive" | "info" | "neutral"
  label: string
  value: number
}) {
  const toneClass = {
    success: "bg-success-surface text-success",
    info: "bg-info-surface text-info",
    neutral: "bg-muted text-muted-foreground",
    warning: "bg-warning-surface text-warning",
    destructive: "bg-destructive/10 text-destructive",
  }[tone]
  return (
    <Item variant="outline" size="xs" className="gap-3 rounded-lg py-2.5">
      <ItemMedia className={cn("size-8 rounded-md", toneClass)}>
        {icon}
      </ItemMedia>
      <ItemContent className="gap-1">
        <ItemTitle className="text-lg leading-none font-semibold tabular-nums">
          {value}
        </ItemTitle>
        <ItemDescription className="text-xs">{label}</ItemDescription>
      </ItemContent>
    </Item>
  )
}

/** A numbered step: the number in a filled circle, the title beside it and
    the step's content under the title. */
function Step({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 gap-y-2.5">
      <span className="row-span-2 flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular-nums">
        {n}
      </span>
      <h3 className="self-center text-sm font-medium">{title}</h3>
      <div className="col-start-2 min-w-0">{children}</div>
    </section>
  )
}

/** The template as a spreadsheet: column letters, the header row, then the
    example row, so it's clear what each column takes. */
function TemplatePreview({ columns }: { columns: ImportColumn[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-max border-collapse text-center text-sm">
        <thead>
          <tr className="bg-muted text-muted-foreground">
            {columns.map((c, i) => (
              <th
                key={c.header}
                className="h-8 min-w-32 border-r px-3 font-medium last:border-r-0"
              >
                {columnLetter(i)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t">
            {columns.map((c) => (
              <td
                key={c.header}
                className="h-10 border-r px-3 font-medium whitespace-nowrap last:border-r-0"
              >
                {c.header}
                {c.required && <span className="text-destructive">*</span>}
              </td>
            ))}
          </tr>
          <tr className="border-t">
            {columns.map((c) => (
              <td
                key={c.header}
                className="h-10 border-r px-3 whitespace-nowrap text-muted-foreground last:border-r-0"
              >
                {c.example}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Parsing helpers the specs share                                            */
/* -------------------------------------------------------------------------- */

/** MM/DD/YYYY or YYYY-MM-DD to ISO, or null when it isn't a real date. */
export function isoFromUsDate(text: string): string | null {
  const s = text.trim()
  let y: number, m: number, d: number
  let match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (match) {
    m = Number(match[1])
    d = Number(match[2])
    y = Number(match[3])
  } else {
    match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
    if (!match) return null
    y = Number(match[1])
    m = Number(match[2])
    d = Number(match[3])
  }
  const date = new Date(Date.UTC(y, m - 1, d))
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  )
    return null
  return `${y}-${pad2(m)}-${pad2(d)}`
}

/** Case-insensitive match against a fixed list, returning the list's spelling. */
export function pick(options: readonly string[], text: string) {
  const t = text.trim().toLowerCase()
  return options.find((o) => o.toLowerCase() === t)
}
