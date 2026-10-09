"use client"

import * as React from "react"
import { IconSearch } from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { TablePager, type Paged } from "@/components/table-pager"
import { SOURCES } from "@/components/practice/health-record"
import { SUB_TAB, SUB_TABS_LIST } from "@/components/practice/directory"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/design-system/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"

/* Every chart section opens the same way, as Encounters does: a 32px bar
   with the section's heading and count on the left (or, when it has sub
   tabs, the tabs in the heading's place), its tools on the right, and a
   hairline under the bar across the whole section. The tools always run in
   the same order: Search, the source a row came from, the section's own
   filter, its add button. Then a body that scrolls inside the chart instead
   of the page. */

export function SectionBar({
  title,
  tabs,
  value,
  onTab,
  actions,
}: {
  /** The heading, for a section without sub tabs. */
  title?: string
  /** Sub tabs, shown where the heading would be. */
  tabs?: { id: string; label: string }[]
  value?: string
  onTab?: (id: string) => void
  actions?: React.ReactNode
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b p-3 print:hidden">
      {tabs ? (
        <Tabs value={value} onValueChange={(v) => onTab?.(v as string)}>
          <TabsList className={cn(SUB_TABS_LIST, "h-8!")}>
            {tabs.map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className={cn(SUB_TAB, "h-full! text-[15px]")}
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : (
        <h2 className="flex h-8 items-center text-base font-semibold">
          {title}
        </h2>
      )}
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  )
}

/** The section's scrolling body, with room under the last item, on the
    lab viewer's grey (surface-sunken) so the white cards and tables pop. */
export function SectionBody({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto bg-surface-sunken px-3 pt-3 pb-6 print:overflow-visible print:bg-white",
        className
      )}
    >
      {children}
    </div>
  )
}

export function Section({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>
}

/** A small select for a section bar: status, type or source. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
}) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(next) => onChange((next as string) ?? options[0].value)}
    >
      <SelectTrigger className="h-8! w-[170px]" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

/** A record table in a bordered frame, as in the Custom EHR lists. It fills
    the section: the rows scroll inside the frame under a sticky header, and
    the pager runs full width along the bottom. No table scrolls on without
    end. */
export function RecordTable<T>({
  paged,
  children,
}: {
  paged: Paged<T>
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md bg-card border border-border shadow-[0_1px_2px_rgba(16,24,40,.04)] print:overflow-visible">
      <div className="min-h-0 flex-1 overflow-auto print:overflow-visible [&_td]:py-2.5 [&_td]:align-top [&_th]:h-10 [&_th]:bg-[color-mix(in_oklab,var(--primary)_7%,var(--surface-sunken))] [&_th]:text-[13px] [&_th]:font-medium [&_th]:text-muted-foreground [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&>[data-slot=table-container]]:overflow-visible">
        {children}
      </div>
      <TablePager paged={paged} className="print:hidden" />
    </div>
  )
}

/** The number of the first row on the current page, for row numbering. */
export const pageOffset = <T,>(paged: Paged<T>) =>
  (paged.page - 1) * paged.pageSize

/** The bar's search, first of its tools in every section. */
export function SearchBox({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <InputGroup className="h-8 w-[248px] border-border bg-card">
      <InputGroupAddon>
        <IconSearch className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full"
        placeholder="Search..."
        aria-label={label}
      />
    </InputGroup>
  )
}

/** Which source a row came from; lists only the sources the section has. */
export function SourceSelect({
  items,
  value,
  onChange,
  noun = "sources",
}: {
  items: { sourceId: string }[]
  value: string
  onChange: (value: string) => void
  noun?: string
}) {
  const options = [
    { label: `All ${noun}`, value: "all" },
    ...[...new Set(items.map((i) => i.sourceId))].map((id) => ({
      label: SOURCES.find((s) => s.id === id)?.name ?? id,
      value: id,
    })),
  ]
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(next) => onChange((next as string) ?? "all")}
    >
      <SelectTrigger className="h-8! w-[200px]" aria-label="Filter by source">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

/** A case-insensitive match of the search against any of the fields. */
export function matches(query: string, ...fields: (string | undefined)[]) {
  const q = query.trim().toLowerCase()
  return !q || fields.some((f) => f?.toLowerCase().includes(q))
}

/** Search and source together, the state every section's bar keeps. */
export function useBarFilters() {
  const [query, setQuery] = React.useState("")
  const [from, setFrom] = React.useState("all")
  const fromOk = (item: { sourceId: string }) =>
    from === "all" || item.sourceId === from
  return { query, setQuery, from, setFrom, fromOk }
}
