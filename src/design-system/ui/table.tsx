"use client"

import * as React from "react"
import { cn } from "cn"
import { IconArrowDown, IconArrowUp } from "@/design-system/icons"

function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"table"> & {
  /**
   * Classes for the scroll container around the table. Long lists cap its
   * height here so the table body scrolls inside its card instead of pushing
   * the page down; see `tableScroll` in the provider data-table toolkit.
   */
  containerClassName?: string
}) {
  return (
    <div
      data-slot="table-container"
      className={cn("relative w-full overflow-x-auto", containerClassName)}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-surface-row-hover has-aria-expanded:bg-surface-row-hover data-[state=selected]:bg-surface-selected",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-12 px-3 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

type SortDirection = "asc" | "desc"

/* A sort brings other rows onto the page, and an auto-layout table would
   resize every column to fit them. Pinning each header at its current width
   first keeps the columns still; a window resize lets them fit again. */
function pinColumnWidths(from: HTMLElement) {
  const heads = Array.from(from.closest("tr")?.children ?? []) as HTMLElement[]
  const widths = heads.map((th) => th.getBoundingClientRect().width)
  heads.forEach((th, i) => {
    if (widths[i]) th.style.width = `${widths[i]}px`
  })
  window.addEventListener(
    "resize",
    () => heads.forEach((th) => (th.style.width = "")),
    { once: true }
  )
}

/**
 * A column header that sorts its table. Click cycles ascending, descending,
 * then back to the list's own order. The arrow shows on the sorted column
 * and fades in on hover elsewhere. Pair with `useTableSort`.
 */
function TableSortHead({
  sorted = false,
  onSort,
  className,
  children,
  ...props
}: React.ComponentProps<"th"> & {
  sorted?: SortDirection | false
  onSort: () => void
}) {
  const Arrow = sorted === "desc" ? IconArrowDown : IconArrowUp
  return (
    <TableHead
      aria-sort={
        sorted === "asc"
          ? "ascending"
          : sorted === "desc"
            ? "descending"
            : "none"
      }
      className={className}
      {...props}
    >
      <button
        type="button"
        onClick={(event) => {
          pinColumnWidths(event.currentTarget)
          onSort()
        }}
        className={cn(
          "group/sort -mx-1 inline-flex items-center gap-1 rounded-sm px-1 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
          sorted && "text-foreground"
        )}
      >
        {children}
        <Arrow
          aria-hidden
          className={cn(
            "size-3 shrink-0 transition-opacity",
            !sorted &&
              "opacity-0 group-hover/sort:opacity-50 group-focus-visible/sort:opacity-50"
          )}
        />
      </button>
    </TableHead>
  )
}

type SortValue = string | number | null | undefined

/* Empty values sort last either way; text compares naturally, so "P-10"
   follows "P-9" and ISO dates read in date order. */
const isEmpty = (v: SortValue) => v === null || v === undefined || v === ""

function compareSortValues(a: SortValue, b: SortValue) {
  const emptyA = isEmpty(a)
  const emptyB = isEmpty(b)
  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

/**
 * Column sorting for a list. `values` maps a column key to the value it
 * sorts by; keys without one aren't sortable. Spread `headProps(key)` onto
 * a `TableSortHead`.
 */
function useTableSort<T>(
  rows: T[],
  values: Record<string, ((row: T) => SortValue) | undefined>
) {
  const [sort, setSort] = React.useState<{
    key: string
    dir: SortDirection
  } | null>(null)

  const get = sort ? values[sort.key] : undefined
  const sortedRows =
    sort && get
      ? rows
          .map((row, index) => ({ row, index, value: get(row) }))
          .sort((a, b) => {
            const order = compareSortValues(a.value, b.value)
            /* Empties stay last when descending too. */
            const signed =
              sort.dir === "desc" && !isEmpty(a.value) && !isEmpty(b.value)
                ? -order
                : order
            return signed || a.index - b.index
          })
          .map((entry) => entry.row)
      : rows

  function toggle(key: string) {
    setSort((prev) =>
      prev?.key !== key
        ? { key, dir: "asc" }
        : prev.dir === "asc"
          ? { key, dir: "desc" }
          : null
    )
  }

  return {
    rows: sortedRows,
    sort,
    toggle,
    headProps: (key: string) => ({
      sorted: sort?.key === key ? sort.dir : (false as const),
      onSort: () => toggle(key),
    }),
  }
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableSortHead,
  TableRow,
  TableCell,
  TableCaption,
  useTableSort,
  type SortValue,
}
