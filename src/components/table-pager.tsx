"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/ui/select"

/* Every table pages the same way, like the patients worklist: rows per page
   on the left with the range, numbered pages on the right. No table scrolls
   on without end. */

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

export type Paged<T> = {
  visible: T[]
  total: number
  page: number
  pageCount: number
  pageSize: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  setPageSize: (size: number) => void
}

/** Slices `rows` into pages. A shrinking list never strands you on a page
    past its end. */
export function usePaged<T>(rows: T[], initialSize = 15): Paged<T> {
  const [page, setPage] = React.useState(1)
  const [pageSize, setSize] = React.useState(initialSize)
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pageCount)
  return {
    visible: rows.slice((current - 1) * pageSize, current * pageSize),
    total: rows.length,
    page: current,
    pageCount,
    pageSize,
    setPage,
    setPageSize: (size) => {
      setSize(size)
      setPage(1)
    },
  }
}

export function TablePager<T>({
  paged,
  className,
}: {
  paged: Paged<T>
  className?: string
}) {
  const { page, pageCount, pageSize, total, setPage } = paged
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-4 py-[11px]",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows per page:</span>
          <Select
            items={PAGE_SIZES}
            value={String(pageSize)}
            onValueChange={(value: string | null) =>
              paged.setPageSize(Number(value ?? 15))
            }
          >
            <SelectTrigger size="sm" className="h-7 w-16 rounded-md text-xs">
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
          {start}-{end} of {total}
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
          {pageSlots(page, pageCount).map((slot, i) =>
            slot === "gap" ? (
              <PaginationItem key={`gap-${i}`}>
                <PaginationEllipsis className="size-[26px]" />
              </PaginationItem>
            ) : (
              <PaginationItem key={slot}>
                <PaginationLink
                  className={PAGE_LINK}
                  isActive={slot === page}
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
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
