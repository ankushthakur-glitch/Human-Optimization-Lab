"use client"

import * as React from "react"
import { IconDownload, IconFilter, IconPrint } from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { exportRows, type ExportRow } from "@/components/practice/directory"
import {
  locations,
  patients,
  providerName,
  providers,
} from "@/components/practice/practice-data"
import { ProviderShell } from "@/components/provider/provider-shell"
import {
  EMPLOYER_UTILISATION,
  PATIENT_TYPES,
  PERIOD_KINDS,
  REPORTS,
  type AnyReport,
  type Counts,
  type Format,
  type ListColumn,
  type ListReport,
  type ListRow,
  type PatientType,
  type Period,
  type PeriodKind,
  type Report,
  type ReportContext,
  countsFor,
  customPeriod,
  formatCell,
  formatValue,
  isList,
  periodsFor,
  sumCounts,
} from "@/components/provider/reports/reports-data"
import { StatusDot } from "@/components/settings/settings-kit"
import { employers } from "@/components/settings/settings-data"
import { TablePager, usePaged } from "@/components/table-pager"
import { Illustration } from "@/components/illustrations/illustration"
import { Button } from "@/design-system/ui/button"
import { Card } from "@/design-system/ui/card"
import { DatePicker } from "@/design-system/ui/date-picker"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/design-system/ui/empty"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/design-system/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHeader,
  TableRow,
  TableSortHead,
  useTableSort,
} from "@/design-system/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system/ui/tooltip"

/* The Reports screen, shared by the provider, clinic manager and Super
   Admin portals, each with its own list of reports. Laid out from the
   Amazing Grace Center reports page (Figma OulMy5QOcLc2lJ6aX0GpFo,
   40019623:451842): the report list on the left, the period and filters
   over the page, then the report's totals as tiles and its table. A count
   report has a row per provider (or its own rows) and a Total row; a list
   report has a row per record, with subtotals when it groups them. */

/* The panels share the worklist's frame: a 6px card on a soft halo. */
const PANEL =
  "gap-0 rounded-md border border-border py-0 shadow-[0_0_5px_rgb(0_0_0/0.08)] ring-0"

type Option = { label: string; value: string }

/** A toolbar dropdown, sized like the worklist's controls. */
export function ToolbarSelect({
  label,
  items,
  value,
  onChange,
  className,
}: {
  label: string
  items: Option[]
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v: string | null) => onChange(v ?? "")}
    >
      <SelectTrigger
        size="sm"
        aria-label={label}
        className={cn("rounded-md border-border bg-card", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

/* -------------------------------------------------------------------------- */
/*  Screen                                                                     */
/* -------------------------------------------------------------------------- */

export function ReportsScreen() {
  const { items } = employers.use()
  /* The employer report's rows are the practice's active employers. */
  const reports = React.useMemo(
    () =>
      REPORTS.map((r) =>
        r === EMPLOYER_UTILISATION
          ? {
              ...EMPLOYER_UTILISATION,
              rows: {
                header: "Employer",
                items: items
                  .filter((e) => e.status === "Active")
                  .map((e) => ({ id: e.id, name: e.name })),
              },
            }
          : r
      ),
    [items]
  )
  return (
    <ProviderShell active="reports">
      <ReportsView reports={reports} />
    </ProviderShell>
  )
}

type Row = { id: string; name: string; counts: Counts }

export function ReportsView({
  reports,
  initialId,
  title = "Reports",
  leading,
}: {
  reports: AnyReport[]
  title?: string
  /** Replaces the title, e.g. with a module's tabs. */
  leading?: React.ReactNode
  /** The report to open on, from a dashboard link. */
  initialId?: string | null
}) {
  const { items: provs } = providers.use()
  const { items: locs } = locations.use()
  const { items: people } = patients.use()
  const { items: emps } = employers.use()

  const [reportId, setReportId] = React.useState(
    reports.some((r) => r.id === initialId) ? initialId! : reports[0].id
  )
  const [kind, setKind] = React.useState<PeriodKind>("Month")
  const [periodKey, setPeriodKey] = React.useState("")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [locationId, setLocationId] = React.useState("")
  const [providerId, setProviderId] = React.useState("")
  const [type, setType] = React.useState<PatientType | "">("")
  /* The open report's own filters, by filter id. */
  const [values, setValues] = React.useState<Record<string, string>>({})

  const report = reports.find((r) => r.id === reportId) ?? reports[0]
  const periods = kind === "Custom range" ? [] : periodsFor(kind)
  const index = Math.max(0, periods.findIndex((p) => p.key === periodKey))
  const period: Period | null =
    kind === "Custom range" ? customPeriod(from, to) : periods[index]
  const previous = kind === "Custom range" ? undefined : periods[index + 1]

  const ctx: ReportContext = { patients: people, providers: provs, employers: emps }
  const active = provs.filter((p) => p.status === "Active")

  function openReport(id: string) {
    setReportId(id)
    setValues({})
  }

  const list = isList(report)
  const own = !list && report.rows
  const typed = !list && report.typeFilter !== false

  /* Every filter's choices: fixed, from the portal's data, from the
     report's own rows, or from the values in the period's records. */
  const records = list && period ? report.records(period, ctx) : []
  const filters = (report.filters ?? []).map((f) => ({
    ...f,
    choices:
      typeof f.options === "function"
        ? f.options(ctx)
        : (f.options ??
          (f.id === "row" && own
            ? own.items.map((i) => ({ label: i.name, value: i.id }))
            : [...new Set(records.map((r) => String(r[f.id] ?? "")))]
                .filter(Boolean)
                .sort()
                .map((v) => ({ label: v, value: v })))),
  }))
  const keep = (r: ListRow) =>
    filters.every((f) => {
      const v = values[f.id]
      if (!v) return true
      return f.test ? f.test(r, v) : String(r[f.id]) === v
    })

  const filterCount =
    (list ? 0 : [!own && providerId, !own && typed && type].filter(Boolean).length) +
    filters.filter((f) => values[f.id]).length

  function clearFilters() {
    setProviderId("")
    setType("")
    setValues({})
  }

  const toolbar = (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <ToolbarSelect
        label="Period"
        className="w-32"
        items={PERIOD_KINDS.map((k) => ({ label: k, value: k }))}
        value={kind}
        onChange={(v) => {
          setKind(v as PeriodKind)
          setPeriodKey("")
        }}
      />
      {kind === "Custom range" ? (
        <div className="flex items-center gap-2">
          <DatePicker
            value={from}
            onChange={setFrom}
            max={to || undefined}
            placeholder="From"
            className="h-8 w-36 rounded-md border-border bg-card"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <DatePicker
            value={to}
            onChange={setTo}
            min={from || undefined}
            placeholder="To"
            className="h-8 w-36 rounded-md border-border bg-card"
          />
        </div>
      ) : (
        <ToolbarSelect
          key={kind}
          label={kind}
          className="w-44"
          items={periods.map((p) => ({ label: p.label, value: p.key }))}
          value={periods[index].key}
          onChange={setPeriodKey}
        />
      )}
      {!list && !own && (
        <ToolbarSelect
          label="Location"
          className="w-48"
          items={[
            { label: "All locations", value: "" },
            ...locs
              .filter((l) => l.status === "Active")
              .map((l) => ({ label: l.name, value: l.id })),
          ]}
          value={locationId}
          onChange={setLocationId}
        />
      )}

      {(filters.length > 0 || (!list && !own)) && (
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm" className="rounded-md">
                <IconFilter />
                Filters
                {filterCount > 0 && (
                  <span className="text-xs text-primary-tint tabular-nums">
                    {filterCount}
                  </span>
                )}
              </Button>
            }
          />
          <PopoverContent align="end" className="w-64">
            <div className="flex flex-col gap-3">
              {!list && !own && (
                <ToolbarSelect
                  label="Provider"
                  className="w-full"
                  items={[
                    { label: "All providers", value: "" },
                    ...active.map((p) => ({ label: providerName(p), value: p.id })),
                  ]}
                  value={providerId}
                  onChange={setProviderId}
                />
              )}
              {!list && !own && typed && (
                <ToolbarSelect
                  label="Patient type"
                  className="w-full"
                  items={[
                    { label: "All patients", value: "" },
                    ...PATIENT_TYPES.map((t) => ({ label: t, value: t })),
                  ]}
                  value={type}
                  onChange={(v) => setType(v as PatientType | "")}
                />
              )}
              {filters.map((f) => (
                <ToolbarSelect
                  key={f.id}
                  label={f.label}
                  className="w-full"
                  items={[{ label: f.all, value: "" }, ...f.choices]}
                  value={values[f.id] ?? ""}
                  onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))}
                />
              ))}
              {filterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )

  let body: React.ReactNode
  let exportReport: (() => void) | null = null

  if (list) {
    const rows = records.filter(keep)
    const before = previous ? report.records(previous, ctx).filter(keep) : null
    if (period && rows.length > 0)
      exportReport = () => {
        const line = (r: ListRow): ExportRow =>
          Object.fromEntries(report.columns.map((c) => [c.header, formatCell(r, c)]))
        void exportRows(`${report.name} ${period.label}`, rows.map(line))
      }
    body = (
      <>
        <Tiles
          tiles={report.tiles.map((t) => ({
            label: t.label,
            value: period && rows.length > 0 ? formatValue(t.value(rows, period), t.format) : "0",
            note:
              period && t.note
                ? t.note(rows, period)
                : before && previous && rows.length > 0
                  ? `${previous.label}: ${formatValue(t.value(before, previous), t.format)}`
                  : undefined,
          }))}
        />
        <ListTable report={report} period={period} rows={rows} />
      </>
    )
  } else {
    const shown = active.filter(
      (p) =>
        (!locationId || p.locationIds.includes(locationId)) &&
        (!providerId || p.id === providerId)
    )
    /* A report with its own rows (vendors, practices) skips the providers. */
    const rowsFor = (at: Period): Row[] =>
      own
        ? own.items
            .filter((item) => !values.row || item.id === values.row)
            .map((item) => ({ ...item, counts: countsFor(report, item.id, at, null, values) }))
        : shown.map((p) => ({
            id: p.id,
            name: providerName(p),
            counts: countsFor(report, p.id, at, (typed && type) || null, values),
          }))
    const rows = period ? rowsFor(period) : []
    const total = sumCounts(rows.map((r) => r.counts))
    const before = previous ? sumCounts(rowsFor(previous).map((r) => r.counts)) : null
    if (period && rows.length > 0)
      exportReport = () => {
        const line = (name: string, c: Counts): ExportRow => ({
          [own ? own.header : "Provider"]: name,
          ...Object.fromEntries(
            report.columns.map((col) => [col.header, formatValue(col.value(c), col.format)])
          ),
        })
        void exportRows(`${report.name} ${period.label}`, [
          ...rows.map((r) => line(r.name, r.counts)),
          line("Total", total),
        ])
      }
    body = (
      <>
        <Tiles
          tiles={report.tiles.map((id) => {
            const col = report.columns.find((c) => c.id === id)!
            return {
              label: col.header,
              value: period && rows.length > 0 ? formatValue(col.value(total), col.format) : "0",
              note:
                before && previous && rows.length > 0
                  ? `${previous.label}: ${formatValue(col.value(before), col.format)}`
                  : undefined,
            }
          })}
        />
        <ReportTable report={report} period={period} rows={rows} total={total} />
      </>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 bg-surface-sunken px-4 pt-3 pb-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        {leading ?? <h1 className="font-heading text-lg font-semibold">{title}</h1>}

        <div className="flex flex-wrap items-center justify-end gap-3">
          {toolbar}
          <Button
            variant="outline"
            size="sm"
            className="rounded-md"
            disabled={!exportReport}
            onClick={() => exportReport?.()}
          >
            <IconDownload />
            Export
          </Button>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="rounded-md"
                  aria-label="Print report"
                  onClick={() => window.print()}
                />
              }
            >
              <IconPrint />
            </TooltipTrigger>
            <TooltipContent>Print</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <ReportList reports={reports} value={report.id} onChange={openReport} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">{body}</div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Tiles                                                                      */
/* -------------------------------------------------------------------------- */

const TILE_COLUMNS: Record<number, string> = {
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
}

/** The report's totals over the table, each with the previous period's
    number or its own note under it. */
function Tiles({ tiles }: { tiles: { label: string; value: string; note?: string }[] }) {
  return (
    <div className={cn("grid shrink-0 grid-cols-2 gap-4", TILE_COLUMNS[tiles.length] ?? "xl:grid-cols-4")}>
      {tiles.map((t) => (
        <Card key={t.label} className={cn(PANEL, "gap-1.5 px-4 py-3")}>
          <span className="text-xs text-muted-foreground">{t.label}</span>
          <span className="font-heading text-xl font-semibold tabular-nums">{t.value}</span>
          {t.note && <span className="text-xs text-muted-foreground tabular-nums">{t.note}</span>}
        </Card>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Report list                                                                */
/* -------------------------------------------------------------------------- */

/* A card of report names on wide screens; a dropdown on narrow ones. */
function ReportList({
  reports,
  value,
  onChange,
}: {
  reports: AnyReport[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <>
      <ToolbarSelect
        label="Report"
        className="w-full lg:hidden"
        items={reports.map((r) => ({ label: r.name, value: r.id }))}
        value={value}
        onChange={onChange}
      />
      <Card className={cn(PANEL, "hidden w-60 shrink-0 p-2 lg:flex")}>
        <nav aria-label="Reports" className="flex flex-col gap-0.5 overflow-y-auto">
          {reports.map((r, i) => {
            const on = r.id === value
            /* A group's name heads its first report. */
            const first = r.group && r.group !== reports[i - 1]?.group
            return (
              <React.Fragment key={r.id}>
              {first && (
                <h2 className={cn("px-3 pb-1 text-xs font-medium text-muted-foreground", i > 0 ? "pt-4" : "pt-1")}>
                  {r.group}
                </h2>
              )}
              <button
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => onChange(r.id)}
                className={cn(
                  "rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-row-hover focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                  on && "bg-primary-surface font-medium text-primary hover:bg-primary-surface dark:text-primary-tint"
                )}
              >
                {r.name}
              </button>
              </React.Fragment>
            )
          })}
        </nav>
      </Card>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Tables                                                                     */
/* -------------------------------------------------------------------------- */

const HEAD =
  "sticky top-0 z-10 bg-surface-head [&_th]:h-9 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground"
const FOOT = "sticky bottom-0 z-10 bg-surface-head [&_td]:px-4 [&_td]:py-2.5"

/** The table's card: the report's name and period over the table, an empty
    state when nothing matches, the pager under it. */
function TableFrame<T>({
  name,
  noun,
  period,
  empty,
  paged,
  children,
}: {
  name: string
  noun: string
  period: Period | null
  empty: boolean
  paged: ReturnType<typeof usePaged<T>>
  children: React.ReactNode
}) {
  return (
    <Card className={cn(PANEL, "min-h-[480px] flex-1 lg:min-h-0")}>
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-base font-semibold">{name}</h2>
        {period && (
          <span className="text-xs text-muted-foreground">{period.label}</span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto [&>[data-slot=table-container]]:overflow-visible">
        {!period || empty ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia>
                <Illustration name="no-results" />
              </EmptyMedia>
              <EmptyTitle>
                {period ? `No ${noun.toLowerCase()}s match` : "Pick a date range"}
              </EmptyTitle>
              {period && (
                <EmptyDescription>
                  Try a different period or clear a filter.
                </EmptyDescription>
              )}
            </EmptyHeader>
          </Empty>
        ) : (
          children
        )}
      </div>

      <TablePager paged={paged} />
    </Card>
  )
}

function ReportTable({
  report,
  period,
  rows,
  total,
}: {
  report: Report
  period: Period | null
  rows: Row[]
  total: Counts
}) {
  const sorting = useTableSort(rows, {
    provider: (r) => r.name,
    ...Object.fromEntries(
      report.columns.map((c) => [c.id, (r: Row) => c.value(r.counts)])
    ),
  })
  const paged = usePaged(sorting.rows, 25)

  return (
    <TableFrame
      name={report.name}
      noun={report.rows?.header ?? "provider"}
      period={period}
      empty={rows.length === 0}
      paged={paged}
    >
      <Table>
        <TableHeader className={HEAD}>
          <TableRow>
            <TableSortHead {...sorting.headProps("provider")}>
              {report.rows?.header ?? "Provider"}
            </TableSortHead>
            {report.columns.map((c) => (
              <TableSortHead
                key={c.id}
                className="text-right [&>button]:flex-row-reverse"
                {...sorting.headProps(c.id)}
              >
                {c.header}
              </TableSortHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="[&_td]:px-4 [&_td]:py-3">
          {paged.visible.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-foreground">{r.name}</TableCell>
              {report.columns.map((c) => (
                <TableCell key={c.id} className="text-right tabular-nums">
                  {formatValue(c.value(r.counts), c.format)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className={FOOT}>
          <TableRow className="hover:bg-transparent">
            <TableCell className="font-semibold">Total</TableCell>
            {report.columns.map((c) => (
              <TableCell key={c.id} className="text-right font-semibold tabular-nums">
                {formatValue(c.value(total), c.format)}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      </Table>
    </TableFrame>
  )
}

const numeric = (c: ListColumn) => c.format !== "text" && c.format !== "date"

/** A column's figure for a set of rows: summed, or worked out. */
function columnTotal(c: ListColumn, rows: ListRow[]) {
  if (!c.total) return null
  return c.total === true
    ? rows.reduce((s, r) => s + (typeof r[c.id] === "number" ? (r[c.id] as number) : 0), 0)
    : c.total(rows)
}

/** One record per row. A grouped report keeps each group together and
    closes it with a subtotal row; any report with totals gets a Total row. */
function ListTable({
  report,
  period,
  rows,
}: {
  report: ListReport
  period: Period | null
  rows: ListRow[]
}) {
  const sorting = useTableSort(
    rows,
    Object.fromEntries(report.columns.map((c) => [c.id, (r: ListRow) => r[c.id]]))
  )
  const group = report.groupBy
  /* Sorting works inside each group; the groups stay in name order. */
  const ordered = group
    ? [...sorting.rows].sort((a, b) => String(a[group]).localeCompare(String(b[group])))
    : sorting.rows
  const paged = usePaged(ordered, 25)
  const totals = report.columns.some((c) => c.total)

  const totalRow = (label: string, of: ListRow[], className?: string) => (
    <TableRow className={cn("hover:bg-transparent", className)}>
      {report.columns.map((c, i) => {
        const v = columnTotal(c, of)
        return (
          <TableCell
            key={c.id}
            className={cn("font-semibold tabular-nums", numeric(c) && "text-right")}
          >
            {i === 0 ? label : v === null ? "" : formatValue(v, c.format as Format)}
          </TableCell>
        )
      })}
    </TableRow>
  )

  return (
    <TableFrame
      name={report.name}
      noun={report.noun}
      period={period}
      empty={rows.length === 0}
      paged={paged}
    >
      <Table>
        <TableHeader className={HEAD}>
          <TableRow>
            {report.columns.map((c) => (
              <TableSortHead
                key={c.id}
                className={cn(numeric(c) && "text-right [&>button]:flex-row-reverse")}
                {...sorting.headProps(c.id)}
              >
                {c.header}
              </TableSortHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="[&_td]:px-4 [&_td]:py-3">
          {paged.visible.map((r, i) => {
            const at = (paged.page - 1) * paged.pageSize + i
            const closes = group && ordered[at + 1]?.[group] !== r[group]
            return (
              <React.Fragment key={r.id}>
                <TableRow>
                  {report.columns.map((c, ci) => {
                    const tone = c.tone?.(r)
                    const text = formatCell(r, c)
                    return (
                      <TableCell
                        key={c.id}
                        className={cn(
                          numeric(c) && "text-right tabular-nums",
                          ci === 0 ? "font-medium text-foreground" : !r[c.id] && r[c.id] !== 0 && "text-muted-foreground"
                        )}
                      >
                        {tone ? <StatusDot tone={tone}>{text}</StatusDot> : text}
                      </TableCell>
                    )
                  })}
                </TableRow>
                {closes &&
                  totalRow(
                    `Subtotal, ${r[group]}`,
                    ordered.filter((x) => x[group] === r[group]),
                    "bg-surface-row-hover/60"
                  )}
              </React.Fragment>
            )
          })}
        </TableBody>
        {totals && <TableFooter className={FOOT}>{totalRow("Total", rows)}</TableFooter>}
      </Table>
    </TableFrame>
  )
}
