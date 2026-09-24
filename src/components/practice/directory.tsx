"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/design-system/ui/sonner"
import {
  IconDownload,
  IconFilter,
  IconMail,
  IconMore,
  IconSearch,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import type { PatientStatus } from "@/components/practice/practice-data"
import { Avatar, AvatarFallback, AvatarImage } from "@/design-system/ui/avatar"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import { Card } from "@/design-system/ui/card"
import { Checkbox } from "@/design-system/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/design-system/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/design-system/ui/input-group"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/design-system/ui/pagination"
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import { Separator } from "@/design-system/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system/ui/tooltip"

/* -------------------------------------------------------------------------- */
/*  Small shared pieces                                                        */
/* -------------------------------------------------------------------------- */

const STATUS_VARIANT: Record<
  PatientStatus,
  "success" | "warning" | "destructive" | "secondary" | "info" | "outline"
> = {
  "Not invited": "secondary",
  Active: "success",
  Invited: "warning",
  Inactive: "destructive",
  Discharged: "info",
  "Consent withdrawn": "outline",
}

export function StatusBadge({ status }: { status: PatientStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
}

/* As in the worklist: the ID column is the teal link, the name reads in the
   foreground and opens the record too. Pass to a `variant="link"` Button. */
export const NAME_LINK =
  "block h-auto min-w-0 truncate rounded-sm p-0 text-left text-foreground"

export const ID_CELL =
  "hidden font-medium text-primary-tint tabular-nums md:table-cell"

export function RowMenu({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={label}>
            <IconMore />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>{children}</DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The selection's bulk action: resend the invite to everyone still pending. */
export function BulkResend({
  rows,
  onDone,
}: {
  rows: { status: PatientStatus }[]
  onDone: () => void
}) {
  const pending = rows.filter((row) => row.status === "Invited").length
  if (pending === 0) return null
  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-md"
      onClick={() => {
        toast.success(
          pending === 1 ? "Invite resent" : `${pending} invites resent`
        )
        onDone()
      }}
    >
      <IconMail />
      Resend invites ({pending})
    </Button>
  )
}

/** Opens a create form when the command palette lands with ?new=1. */
export function useNewParam(open: () => void) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  React.useEffect(() => {
    if (params.get("new") !== "1") return
    open()
    const rest = new URLSearchParams(params)
    rest.delete("new")
    router.replace(rest.size ? `${pathname}?${rest}` : pathname)
  }, [params, open, router, pathname])
}

/* -------------------------------------------------------------------------- */
/*  Directory                                                                  */
/* -------------------------------------------------------------------------- */

export type Column<T> = {
  id: string
  header: string
  /** Applied to the header and every cell, for widths and breakpoints. */
  className?: string
  cell: (row: T) => React.ReactNode
}

export type FilterDef<T> = {
  id: string
  label: string
  /** The "everything" option's label, e.g. "All roles". */
  all: string
  options: readonly string[]
  match: (row: T, value: string) => boolean
}

export type ToolbarAction = {
  label: string
  icon: React.ReactNode
  onClick: () => void
}

/* The worklist's page sizes, so every list pages the same way. */
const PAGE_SIZES = [
  { label: "8", value: "8" },
  { label: "15", value: "15" },
  { label: "25", value: "25" },
]

/* The pager matches the patients worklist: 26px squares at 4px radius. */
const PAGE_LINK =
  "size-[26px] cursor-pointer rounded-[4px] text-sm font-normal text-muted-foreground " +
  "data-[active=true]:border-transparent data-[active=true]:bg-primary " +
  "data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary/90"

const PAGE_STEP =
  "size-[26px] cursor-pointer px-0! text-muted-foreground [&>span]:hidden!"

/* The worklist's segmented switch: square segments inside one 6px outline,
   a 1px rule between them, the selected one on the primary surface. */
export const SUB_TAB =
  "h-full flex-none rounded-none px-4 font-normal text-muted-foreground " +
  "not-first:shadow-[inset_1px_0_0_var(--border)] " +
  "data-active:bg-primary-surface data-active:font-medium data-active:text-primary " +
  "dark:data-active:bg-primary-surface dark:data-active:text-primary-tint"

export const SUB_TABS_LIST =
  "h-8! gap-0 overflow-hidden rounded-md border bg-card p-0"

/* At most seven slots: first, last, the current page and its neighbours. */
function pageSlots(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...pages]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b)
  const slots: (number | "gap")[] = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) slots.push("gap")
    slots.push(n)
  })
  return slots
}

/* Subtle tints for initials avatars, picked from the name so a person keeps
   the same colour everywhere they appear. */
const AVATAR_TONES = [
  "bg-category-1-surface text-category-1",
  "bg-category-2-surface text-category-2",
  "bg-category-3-surface text-category-3",
  "bg-category-4-surface text-category-4",
  "bg-category-5-surface text-category-5",
]

export function avatarTone(name: string) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

/** The worklist's name cell: avatar, then the name as the row's link. */
export function PersonCell({
  name,
  photo,
  onOpen,
  badge,
}: {
  name: string
  photo?: string
  onOpen: () => void
  badge?: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar className="size-8 shrink-0">
        {photo && <AvatarImage src={photo} alt="" />}
        <AvatarFallback className={cn("font-medium", avatarTone(name))}>
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <Button variant="link" className={NAME_LINK} onClick={onOpen}>
        {name}
      </Button>
      {badge}
    </div>
  )
}

export type ExportRow = Record<string, string | number>

async function exportRows(fileName: string, rows: ExportRow[]) {
  if (rows.length === 0) return
  const { default: writeXlsxFile } = await import("write-excel-file/browser")
  const headers = Object.keys(rows[0])
  await writeXlsxFile(
    [
      headers.map((h) => ({ value: h, fontWeight: "bold" as const })),
      ...rows.map((row) => headers.map((h) => row[h] ?? "")),
    ],
    { columns: headers.map(() => ({ width: 22 })) }
  ).toFile(`${fileName}.xlsx`)
}

/**
 * The list frame every practice portal module shares, laid out like the EHR
 * patients worklist: a 32px toolbar on the canvas (segmented switch on the
 * left; search, filters, export and the add control on the right), then one
 * card holding the table and its pager. Checking rows swaps the toolbar's
 * right side for bulk actions.
 */
export function Directory<T extends { id: string }>({
  title,
  heading,
  statusTabs,
  noun,
  rows,
  columns,
  search,
  filters = [],
  primaryAction,
  moreActions,
  bulkActions,
  exportName,
  exportRow,
  emptyIcon,
}: {
  /** The page's name, for screen readers: the toolbar carries no title. */
  title: string
  /** Replaces the status switch on the left, e.g. with the Users tabs. */
  heading?: React.ReactNode
  /** Status segments with counts: All (n), then one per option. */
  statusTabs?: { options: readonly string[]; value: (row: T) => string }
  /** Plural, lower case: "providers". */
  noun: string
  rows: T[]
  columns: Column<T>[]
  search: (row: T) => string[]
  filters?: FilterDef<T>[]
  primaryAction: ToolbarAction
  /** Extra ways to add, shown as outline buttons before the primary one. */
  moreActions?: ToolbarAction[]
  bulkActions?: (selected: T[], clear: () => void) => React.ReactNode
  exportName: string
  /** One row of the Excel export, keyed by column header. */
  exportRow: (row: T) => ExportRow
  emptyIcon: React.ReactNode
}) {
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [values, setValues] = React.useState<Record<string, string>>({})
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(15)
  const [selected, setSelected] = React.useState<string[]>([])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (statusTabs && status !== "all" && statusTabs.value(row) !== status)
        return false
      for (const filter of filters) {
        const value = values[filter.id]
        if (value && !filter.match(row, value)) return false
      }
      if (!q) return true
      return search(row).some((field) => field.toLowerCase().includes(q))
    })
  }, [rows, query, status, statusTabs, values, filters, search])

  const activeFilters = Object.values(values).filter(Boolean).length
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )
  const rangeStart =
    filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, filtered.length)

  const selectedRows = rows.filter((row) => selected.includes(row.id))
  const allOnPageSelected =
    visible.length > 0 && visible.every((row) => selected.includes(row.id))
  const clear = () => setSelected([])

  function toggleAll() {
    const ids = visible.map((row) => row.id)
    setSelected((prev) =>
      allOnPageSelected
        ? prev.filter((id) => !ids.includes(id))
        : [...new Set([...prev, ...ids])]
    )
  }

  function toggleOne(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  /* Extra ways to add (bulk add) sit as their own outline buttons beside
     the primary one, so they're one click away rather than in a menu. */
  const addControl = (
    <div className="flex items-center gap-3">
      {moreActions?.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          className="rounded-md"
          onClick={action.onClick}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
      <Button size="sm" onClick={primaryAction.onClick}>
        {primaryAction.icon}
        {primaryAction.label}
      </Button>
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 bg-surface-sunken px-4 pt-3 pb-4">
      <h1 className="sr-only">{title}</h1>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        {heading ??
          (statusTabs ? (
            <Tabs
              value={status}
              onValueChange={(value) => {
                setStatus(String(value))
                setPage(1)
                clear()
              }}
            >
              <TabsList className={SUB_TABS_LIST}>
                <TabsTrigger value="all" className={SUB_TAB}>
                  All ({rows.length})
                </TabsTrigger>
                {statusTabs.options.map((option) => (
                  <TabsTrigger key={option} value={option} className={SUB_TAB}>
                    {option} (
                    {
                      rows.filter((row) => statusTabs.value(row) === option)
                        .length
                    }
                    )
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : (
            <span />
          ))}

        {selected.length > 0 ? (
          <div className="flex h-8 flex-wrap items-center justify-end gap-3">
            <span className="text-xs text-muted-foreground">
              {selected.length} selected
            </span>
            {bulkActions?.(selectedRows, clear)}
            <Button
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={() =>
                exportRows(
                  `${exportName} (selected)`,
                  selectedRows.map(exportRow)
                )
              }
            >
              <IconDownload />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-md"
              onClick={clear}
            >
              Clear
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="w-full sm:w-[200px]">
              <InputGroup className="h-8 rounded-md">
                <InputGroupAddon>
                  <IconSearch className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setPage(1)
                  }}
                  className="h-full"
                  placeholder="Search..."
                  aria-label={`Search ${noun}`}
                />
              </InputGroup>
            </div>

            {filters.length > 0 && (
              <Popover>
                <PopoverTrigger
                  render={
                    <Button variant="outline" size="sm" className="rounded-md">
                      <IconFilter />
                      Filters
                      {activeFilters > 0 && (
                        <span className="text-xs text-primary-tint tabular-nums">
                          {activeFilters}
                        </span>
                      )}
                    </Button>
                  }
                />
                <PopoverContent align="end" className="w-64">
                  <div className="flex flex-col gap-3">
                    {filters.map((filter) => {
                      const items = [
                        { label: filter.all, value: "" },
                        ...filter.options.map((o) => ({ label: o, value: o })),
                      ]
                      return (
                        <Select
                          key={filter.id}
                          items={items}
                          value={values[filter.id] ?? ""}
                          onValueChange={(value: string | null) => {
                            setValues((prev) => ({
                              ...prev,
                              [filter.id]: value ?? "",
                            }))
                            setPage(1)
                          }}
                        >
                          <SelectTrigger
                            size="sm"
                            className="w-full rounded-md"
                            aria-label={filter.label}
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
                    })}
                    {activeFilters > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setValues({})
                          setPage(1)
                        }}
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="rounded-md"
                    aria-label={`Export ${noun}`}
                    onClick={() =>
                      exportRows(exportName, filtered.map(exportRow))
                    }
                  />
                }
              >
                <IconDownload />
              </TooltipTrigger>
              <TooltipContent>Export to Excel</TooltipContent>
            </Tooltip>

            {addControl}
          </div>
        )}
      </div>

      <Card className="min-h-0 flex-1 gap-0 rounded-md border border-border py-0 shadow-[0_0_5px_rgb(0_0_0/0.08)] ring-0">
        <div className="min-h-0 flex-1 overflow-auto">
          {visible.length === 0 ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {rows.length === 0 ? emptyIcon : <IconSearch />}
                </EmptyMedia>
                <EmptyTitle>
                  {rows.length === 0 ? `No ${noun} yet` : `No ${noun} match`}
                </EmptyTitle>
                {rows.length > 0 && (
                  <EmptyDescription>
                    Try a different search or clear a filter.
                  </EmptyDescription>
                )}
              </EmptyHeader>
              {rows.length === 0 && <EmptyContent>{addControl}</EmptyContent>}
            </Empty>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-surface-head [&_th]:h-9 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all on this page"
                    />
                  </TableHead>
                  {columns.map((column) => (
                    <TableHead key={column.id} className={column.className}>
                      {column.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="[&_td]:px-4 [&_td]:py-2">
                {visible.map((row) => {
                  const isSelected = selected.includes(row.id)
                  return (
                    <TableRow
                      key={row.id}
                      data-state={isSelected ? "selected" : undefined}
                      className={cn(isSelected && "bg-surface-selected")}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOne(row.id)}
                          aria-label="Select row"
                        />
                      </TableCell>
                      {columns.map((column) => (
                        <TableCell key={column.id} className={column.className}>
                          {column.cell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-4 py-[11px]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Rows per page:
              </span>
              <Select
                items={PAGE_SIZES}
                value={String(pageSize)}
                onValueChange={(value: string | null) => {
                  setPageSize(Number(value ?? 15))
                  setPage(1)
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="h-7 w-16 rounded-md text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {PAGE_SIZES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {rangeStart}-{rangeEnd} of {filtered.length}
            </span>
          </div>
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent className="gap-1.5">
              <PaginationItem>
                <PaginationPrevious
                  className={PAGE_STEP}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                />
              </PaginationItem>
              {pageSlots(currentPage, totalPages).map((slot, i) =>
                slot === "gap" ? (
                  <PaginationItem key={`gap-${i}`}>
                    <PaginationEllipsis className="size-[26px]" />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={slot}>
                    <PaginationLink
                      className={PAGE_LINK}
                      isActive={slot === currentPage}
                      onClick={() => setPage(slot)}
                    >
                      {slot}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  className={PAGE_STEP}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Details sheet body                                                         */
/* -------------------------------------------------------------------------- */

export type DetailRow = { label: string; value: React.ReactNode }

/** "Label : Value" rows under a light section heading. */
export function DetailSection({
  title,
  rows,
  className,
}: {
  title: string
  rows: DetailRow[]
  className?: string
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-3">
        <h3 className="shrink-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        <Separator className="flex-1" />
      </div>
      <dl className="grid gap-y-2.5">
        {rows.map((row) => {
          const empty = row.value === "" || row.value == null
          return (
            <div
              key={row.label}
              className="grid grid-cols-[9rem_minmax(0,1fr)] items-baseline gap-2 text-sm"
            >
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd
                className={cn(
                  "flex min-w-0 gap-1.5 break-words",
                  empty && "text-muted-foreground/70"
                )}
              >
                <span aria-hidden className="text-muted-foreground">
                  :
                </span>
                <span className="min-w-0">
                  {empty ? "Not provided" : row.value}
                </span>
              </dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
