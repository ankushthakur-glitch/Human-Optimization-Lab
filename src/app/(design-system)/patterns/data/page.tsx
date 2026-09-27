"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconBuilding,
  IconClose,
  IconDownload,
  IconExpandVertical,
  IconEye,
  IconFilter,
  IconHospital,
  IconGrid,
  IconMore,
  IconPrint,
  IconPulse,
  IconRefresh,
  IconSearch,
  IconTable,
  IconUser,
} from "@/design-system/icons"

import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/design-system/ui/chart"
import { Checkbox } from "@/design-system/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/design-system/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/design-system/ui/resizable"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/ui/select"
import { Separator } from "@/design-system/ui/separator"
import { Skeleton } from "@/design-system/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/design-system/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/design-system/ui/toggle-group"
import { Illustration } from "@/components/illustrations/illustration"

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

type EncounterStatus = "Active" | "Pending" | "Discharged"

type Encounter = {
  id: string
  mrn: string
  patient: string
  demographic: string
  type: string
  department: string
  provider: string
  status: EncounterStatus
  admitted: string
  acuity: number
}

const ENCOUNTERS: Encounter[] = [
  {
    id: "ENC-40192",
    mrn: "MRN-884213",
    patient: "Alvarez, Marisol",
    demographic: "54 F",
    type: "Inpatient",
    department: "Cardiology",
    provider: "Dr. A. Reyes",
    status: "Active",
    admitted: "2026-09-12 07:42",
    acuity: 2,
  },
  {
    id: "ENC-40193",
    mrn: "MRN-773051",
    patient: "Boone, Terrence",
    demographic: "68 M",
    type: "Emergency",
    department: "Emergency",
    provider: "Dr. M. Okafor",
    status: "Active",
    admitted: "2026-09-15 02:11",
    acuity: 1,
  },
  {
    id: "ENC-40194",
    mrn: "MRN-129884",
    patient: "Chowdhury, Nila",
    demographic: "31 F",
    type: "Observation",
    department: "Internal Medicine",
    provider: "Dr. L. Chen",
    status: "Pending",
    admitted: "2026-09-14 16:05",
    acuity: 3,
  },
  {
    id: "ENC-40195",
    mrn: "MRN-556120",
    patient: "Delgado, Rafael",
    demographic: "47 M",
    type: "Surgical",
    department: "Orthopedics",
    provider: "Dr. S. Patel",
    status: "Active",
    admitted: "2026-09-13 09:30",
    acuity: 2,
  },
  {
    id: "ENC-40196",
    mrn: "MRN-901774",
    patient: "Egwu, Amara",
    demographic: "72 F",
    type: "Inpatient",
    department: "Oncology",
    provider: "Dr. J. Whitfield",
    status: "Active",
    admitted: "2026-09-10 11:58",
    acuity: 1,
  },
  {
    id: "ENC-40197",
    mrn: "MRN-338402",
    patient: "Fitzgerald, Owen",
    demographic: "26 M",
    type: "Emergency",
    department: "Emergency",
    provider: "Dr. M. Okafor",
    status: "Discharged",
    admitted: "2026-09-09 21:14",
    acuity: 4,
  },
  {
    id: "ENC-40198",
    mrn: "MRN-664219",
    patient: "Gallagher, Wren",
    demographic: "59 F",
    type: "Observation",
    department: "Cardiology",
    provider: "Dr. A. Reyes",
    status: "Pending",
    admitted: "2026-09-14 08:26",
    acuity: 3,
  },
  {
    id: "ENC-40199",
    mrn: "MRN-220914",
    patient: "Halvorsen, Bjorn",
    demographic: "63 M",
    type: "Inpatient",
    department: "Internal Medicine",
    provider: "Dr. L. Chen",
    status: "Active",
    admitted: "2026-09-11 13:47",
    acuity: 2,
  },
  {
    id: "ENC-40200",
    mrn: "MRN-448127",
    patient: "Iqbal, Sana",
    demographic: "38 F",
    type: "Surgical",
    department: "Orthopedics",
    provider: "Dr. S. Patel",
    status: "Discharged",
    admitted: "2026-09-08 06:03",
    acuity: 4,
  },
  {
    id: "ENC-40201",
    mrn: "MRN-710338",
    patient: "Jimenez, Paulo",
    demographic: "44 M",
    type: "Inpatient",
    department: "Oncology",
    provider: "Dr. J. Whitfield",
    status: "Pending",
    admitted: "2026-09-15 05:52",
    acuity: 2,
  },
  {
    id: "ENC-40202",
    mrn: "MRN-190662",
    patient: "Kowalski, Dana",
    demographic: "50 F",
    type: "Emergency",
    department: "Emergency",
    provider: "Dr. M. Okafor",
    status: "Active",
    admitted: "2026-09-15 03:39",
    acuity: 1,
  },
  {
    id: "ENC-40203",
    mrn: "MRN-805471",
    patient: "Lindqvist, Nora",
    demographic: "35 F",
    type: "Observation",
    department: "Cardiology",
    provider: "Dr. A. Reyes",
    status: "Discharged",
    admitted: "2026-09-07 19:20",
    acuity: 5,
  },
]

const STATUS_BADGE: Record<
  EncounterStatus,
  "default" | "secondary" | "outline"
> = {
  Active: "default",
  Pending: "secondary",
  Discharged: "outline",
}

const DEPARTMENTS = [
  "Cardiology",
  "Emergency",
  "Internal Medicine",
  "Oncology",
  "Orthopedics",
]

const PROVIDERS = [
  "Dr. A. Reyes",
  "Dr. J. Whitfield",
  "Dr. L. Chen",
  "Dr. M. Okafor",
  "Dr. S. Patel",
]

const STATUSES: EncounterStatus[] = ["Active", "Pending", "Discharged"]

/* -------------------------------------------------------------------------- */
/*  Page scaffolding                                                          */
/* -------------------------------------------------------------------------- */

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Specimen({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border bg-card p-6 ${className ?? ""}`}>
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  1. Dense data table                                                       */
/* -------------------------------------------------------------------------- */

type SortKey = "patient" | "mrn" | "department" | "provider" | "admitted"

function compare(a: Encounter, b: Encounter, key: SortKey) {
  return a[key].localeCompare(b[key])
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string
  column: SortKey
  sortKey: SortKey
  sortDir: "asc" | "desc"
  onSort: (key: SortKey) => void
  className?: string
}) {
  const active = sortKey === column
  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="xs"
        className="-ml-2 gap-1 font-medium"
        onClick={() => onSort(column)}
        aria-sort={
          active ? (sortDir === "asc" ? "ascending" : "descending") : "none"
        }
      >
        {label}
        {!active ? (
          <IconExpandVertical className="text-muted-foreground" />
        ) : sortDir === "asc" ? (
          <IconChevronUp />
        ) : (
          <IconChevronDown />
        )}
      </Button>
    </TableHead>
  )
}

function RowActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Row actions" />
        }
      >
        <IconMore />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Encounter</DropdownMenuLabel>
        <DropdownMenuItem>Open chart</DropdownMenuItem>
        <DropdownMenuItem>Add note</DropdownMenuItem>
        <DropdownMenuItem>Place order</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Print face sheet</DropdownMenuItem>
        <DropdownMenuItem variant="destructive">
          Cancel encounter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DenseTableDemo() {
  const [sortKey, setSortKey] = React.useState<SortKey>("patient")
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc")
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  const rows = React.useMemo(() => {
    const copy = [...ENCOUNTERS]
    copy.sort((a, b) =>
      sortDir === "asc" ? compare(a, b, sortKey) : compare(b, a, sortKey)
    )
    return copy
  }, [sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const allSelected = selected.size === rows.length && rows.length > 0

  return (
    <Specimen className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div className="text-sm">
          <span className="font-medium">Encounter worklist</span>
          <span className="ml-2 text-muted-foreground">
            {selected.size > 0
              ? `${selected.size} selected`
              : `${rows.length} encounters`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={selected.size === 0}>
            <IconPrint data-icon="inline-start" />
            Print
          </Button>
          <Button variant="outline" size="sm" disabled={selected.size === 0}>
            <IconDownload data-icon="inline-start" />
            Export
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 pl-6">
              <Checkbox
                aria-label="Select all encounters"
                checked={allSelected}
                indeterminate={selected.size > 0 && !allSelected}
                onCheckedChange={(checked) =>
                  setSelected(
                    checked ? new Set(rows.map((r) => r.id)) : new Set()
                  )
                }
              />
            </TableHead>
            <SortHeader
              label="Patient"
              column="patient"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="MRN"
              column="mrn"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Department"
              column="department"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Provider"
              column="provider"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Admitted"
              column="admitted"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <TableHead>Status</TableHead>
            <TableHead className="w-10 pr-6" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={selected.has(row.id) ? "selected" : undefined}
            >
              <TableCell className="pl-6">
                <Checkbox
                  aria-label={`Select ${row.patient}`}
                  checked={selected.has(row.id)}
                  onCheckedChange={(checked) =>
                    setSelected((prev) => {
                      const next = new Set(prev)
                      if (checked) next.add(row.id)
                      else next.delete(row.id)
                      return next
                    })
                  }
                />
              </TableCell>
              <TableCell>
                <div className="font-medium">{row.patient}</div>
                <div className="text-xs text-muted-foreground">
                  {row.demographic} · {row.type}
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {row.mrn}
              </TableCell>
              <TableCell>{row.department}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.provider}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {row.admitted}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[row.status]}>{row.status}</Badge>
              </TableCell>
              <TableCell className="pr-6 text-right">
                <RowActions />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Specimen>
  )
}

/* -------------------------------------------------------------------------- */
/*  2. Density modes                                                          */
/* -------------------------------------------------------------------------- */

type Density = "comfortable" | "compact"

const DENSITY_HEAD: Record<Density, string> = {
  comfortable: "h-11 px-3 text-sm",
  compact: "h-8 px-2 text-xs",
}

const DENSITY_CELL: Record<Density, string> = {
  comfortable: "px-3 py-3 text-sm",
  compact: "px-2 py-1 text-xs",
}

function DensityDemo() {
  const [density, setDensity] = React.useState<Density>("comfortable")
  const head = DENSITY_HEAD[density]
  const cell = DENSITY_CELL[density]

  return (
    <Specimen>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          value={[density]}
          onValueChange={(value) => {
            if (value[0]) setDensity(value[0] as Density)
          }}
          variant="outline"
          size="sm"
          spacing={0}
        >
          <ToggleGroupItem value="comfortable">Comfortable</ToggleGroupItem>
          <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={head}>Patient</TableHead>
              <TableHead className={head}>MRN</TableHead>
              <TableHead className={head}>Unit</TableHead>
              <TableHead className={head}>Admitted</TableHead>
              <TableHead className={head}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ENCOUNTERS.slice(0, 8).map((row) => (
              <TableRow key={row.id}>
                <TableCell className={`${cell} font-medium`}>
                  {row.patient}
                </TableCell>
                <TableCell
                  className={`${cell} font-mono text-muted-foreground`}
                >
                  {row.mrn}
                </TableCell>
                <TableCell className={cell}>{row.department}</TableCell>
                <TableCell className={`${cell} font-mono`}>
                  {row.admitted}
                </TableCell>
                <TableCell className={cell}>
                  <Badge variant={STATUS_BADGE[row.status]}>{row.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Specimen>
  )
}

/* -------------------------------------------------------------------------- */
/*  3. Faceted filtering                                                      */
/* -------------------------------------------------------------------------- */

type FacetKey = "status" | "department" | "provider"

function FacetPopover({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string
  options: string[]
  selected: Set<string>
  onToggle: (value: string) => void
  onClear: () => void
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="border-dashed" />
        }
      >
        <IconFilter data-icon="inline-start" />
        {label}
        {selected.size > 0 ? (
          <Badge variant="secondary" className="ml-1">
            {selected.size}
          </Badge>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="flex flex-col gap-0.5">
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-hover"
            >
              <Checkbox
                checked={selected.has(option)}
                onCheckedChange={() => onToggle(option)}
              />
              {option}
            </label>
          ))}
        </div>
        {selected.size > 0 ? (
          <>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={onClear}
            >
              Clear {label.toLowerCase()}
            </Button>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function FacetedFilterDemo() {
  const [facets, setFacets] = React.useState<Record<FacetKey, Set<string>>>({
    status: new Set<string>(),
    department: new Set<string>(),
    provider: new Set<string>(),
  })

  function toggle(key: FacetKey, value: string) {
    setFacets((prev) => {
      const next = new Set(prev[key])
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return { ...prev, [key]: next }
    })
  }

  function clear(key: FacetKey) {
    setFacets((prev) => ({ ...prev, [key]: new Set<string>() }))
  }

  const rows = ENCOUNTERS.filter(
    (row) =>
      (facets.status.size === 0 || facets.status.has(row.status)) &&
      (facets.department.size === 0 || facets.department.has(row.department)) &&
      (facets.provider.size === 0 || facets.provider.has(row.provider))
  )

  const active: { key: FacetKey; value: string }[] = (
    ["status", "department", "provider"] as FacetKey[]
  ).flatMap((key) => Array.from(facets[key]).map((value) => ({ key, value })))

  return (
    <Specimen>
      <div className="flex flex-wrap items-center gap-2">
        <FacetPopover
          label="Status"
          options={STATUSES}
          selected={facets.status}
          onToggle={(v) => toggle("status", v)}
          onClear={() => clear("status")}
        />
        <FacetPopover
          label="Department"
          options={DEPARTMENTS}
          selected={facets.department}
          onToggle={(v) => toggle("department", v)}
          onClear={() => clear("department")}
        />
        <FacetPopover
          label="Provider"
          options={PROVIDERS}
          selected={facets.provider}
          onToggle={(v) => toggle("provider", v)}
          onClear={() => clear("provider")}
        />
        {active.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFacets({
                status: new Set<string>(),
                department: new Set<string>(),
                provider: new Set<string>(),
              })
            }
          >
            Reset all
          </Button>
        ) : null}
      </div>

      {active.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {active.map(({ key, value }) => (
            <Badge
              key={`${key}-${value}`}
              variant="secondary"
              className="h-6 gap-1 pr-1"
            >
              <span className="text-muted-foreground">{key}:</span>
              {value}
              <button
                type="button"
                aria-label={`Remove ${value} filter`}
                className="ml-0.5 rounded-full p-0.5 hover:bg-background"
                onClick={() => toggle(key, value)}
              >
                <IconClose className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.patient}</TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.provider}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[row.status]}>{row.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center">
                  <span className="text-sm text-muted-foreground">
                    No encounters match these filters.
                  </span>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="text-xs text-muted-foreground">
                {rows.length} of {ENCOUNTERS.length} encounters
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </Specimen>
  )
}

/* -------------------------------------------------------------------------- */
/*  4. Search + scoped search                                                 */
/* -------------------------------------------------------------------------- */

type SearchScope = "all" | "patients" | "orders" | "results"

const SCOPE_LABELS: Record<SearchScope, string> = {
  all: "All",
  patients: "Patients",
  orders: "Orders",
  results: "Results",
}

type SearchItem = {
  id: string
  label: string
  detail: string
  scope: Exclude<SearchScope, "all">
}

const SEARCH_ITEMS: SearchItem[] = [
  {
    id: "s1",
    label: "Alvarez, Marisol",
    detail: "MRN-884213 · 54 F · Cardiology",
    scope: "patients",
  },
  {
    id: "s2",
    label: "Boone, Terrence",
    detail: "MRN-773051 · 68 M · Emergency",
    scope: "patients",
  },
  {
    id: "s3",
    label: "Alvarez, Marisol · Troponin I, serial",
    detail: "Order ORD-77120 · STAT · placed 07:51",
    scope: "orders",
  },
  {
    id: "s4",
    label: "Boone, Terrence · CT head w/o contrast",
    detail: "Order ORD-77145 · Routine · placed 02:35",
    scope: "orders",
  },
  {
    id: "s5",
    label: "Alvarez, Marisol · Troponin I 0.42 ng/mL",
    detail: "Result · high · ref 0.00-0.04 ng/mL",
    scope: "results",
  },
  {
    id: "s6",
    label: "Egwu, Amara · Potassium 6.1 mmol/L",
    detail: "Result · critical · ref 3.5-5.1 mmol/L",
    scope: "results",
  },
]

function ScopedSearchDemo() {
  const [scope, setScope] = React.useState<SearchScope>("all")
  const [query, setQuery] = React.useState("al")

  const results = SEARCH_ITEMS.filter(
    (item) =>
      (scope === "all" || item.scope === scope) &&
      (query.trim() === "" ||
        item.label.toLowerCase().includes(query.trim().toLowerCase()) ||
        item.detail.toLowerCase().includes(query.trim().toLowerCase()))
  )

  return (
    <Specimen>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          value={scope}
          onValueChange={(value) => setScope(value as SearchScope)}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {(Object.keys(SCOPE_LABELS) as SearchScope[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SCOPE_LABELS[key]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <InputGroup className="flex-1">
          <InputGroupInput
            value={query}
            placeholder="Search name, MRN, order number…"
            onChange={(event) => setQuery(event.target.value)}
          />
          <InputGroupAddon>
            <IconSearch className="text-muted-foreground" />
          </InputGroupAddon>
        </InputGroup>
      </div>

      <div className="mt-4 flex flex-col gap-1">
        {results.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 hover:bg-surface-hover"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{item.label}</div>
              <div className="truncate text-xs text-muted-foreground">
                {item.detail}
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 capitalize">
              {item.scope}
            </Badge>
          </div>
        ))}
        {results.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No matches in {SCOPE_LABELS[scope].toLowerCase()} for “{query}”.
          </p>
        ) : null}
      </div>
    </Specimen>
  )
}

/* -------------------------------------------------------------------------- */
/*  5. Tab segregation                                                        */
/* -------------------------------------------------------------------------- */

function TabSegregationDemo() {
  const counts = {
    all: ENCOUNTERS.length,
    Active: ENCOUNTERS.filter((e) => e.status === "Active").length,
    Pending: ENCOUNTERS.filter((e) => e.status === "Pending").length,
    Discharged: ENCOUNTERS.filter((e) => e.status === "Discharged").length,
  }

  function rowsFor(status: EncounterStatus | "all") {
    return status === "all"
      ? ENCOUNTERS
      : ENCOUNTERS.filter((e) => e.status === status)
  }

  const panels: (EncounterStatus | "all")[] = [
    "all",
    "Active",
    "Pending",
    "Discharged",
  ]

  return (
    <Specimen>
      <Tabs defaultValue="all">
        <TabsList variant="line">
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-1.5">
              {counts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="Active">
            Active
            <Badge variant="secondary" className="ml-1.5">
              {counts.Active}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="Pending">
            Pending
            <Badge variant="secondary" className="ml-1.5">
              {counts.Pending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="Discharged">
            Discharged
            <Badge variant="secondary" className="ml-1.5">
              {counts.Discharged}
            </Badge>
          </TabsTrigger>
        </TabsList>
        {panels.map((panel) => (
          <TabsContent key={panel} value={panel}>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Admitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowsFor(panel).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.patient}
                      </TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>{row.department}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.admitted}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </Specimen>
  )
}

/* -------------------------------------------------------------------------- */
/*  6. Grouped / sectioned lists                                              */
/* -------------------------------------------------------------------------- */

function GroupedListDemo() {
  const groups = DEPARTMENTS.map((department) => ({
    department,
    rows: ENCOUNTERS.filter((e) => e.department === department),
  })).filter((group) => group.rows.length > 0)

  return (
    <Specimen className="p-0">
      <div className="divide-y">
        {groups.map((group, index) => (
          <Collapsible key={group.department} defaultOpen={index < 2}>
            <CollapsibleTrigger
              render={
                <button
                  type="button"
                  className="group flex w-full items-center gap-2 px-6 py-3 text-left transition-colors hover:bg-surface-hover"
                />
              }
            >
              <IconChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-90" />
              <span className="text-sm font-medium">{group.department}</span>
              <Badge variant="secondary" className="ml-1">
                {group.rows.length}
              </Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {group.rows.filter((r) => r.status === "Active").length} active
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="pb-2">
                {group.rows.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center gap-3 px-6 py-2 pl-12 text-sm hover:bg-surface-hover"
                  >
                    <span className="font-medium">{row.patient}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {row.mrn}
                    </span>
                    <Badge
                      variant={STATUS_BADGE[row.status]}
                      className="ml-auto"
                    >
                      {row.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </Specimen>
  )
}

/* -------------------------------------------------------------------------- */
/*  7. Master–detail split view                                               */
/* -------------------------------------------------------------------------- */

const PROBLEM_SUMMARY: Record<string, string[]> = {
  "ENC-40192": [
    "NSTEMI, initial episode",
    "Essential hypertension",
    "Type 2 diabetes mellitus",
  ],
  "ENC-40193": ["Syncope, unspecified", "Dehydration"],
  "ENC-40194": ["Acute pyelonephritis"],
  "ENC-40195": ["Closed fracture, right femoral shaft"],
  "ENC-40196": ["Malignant neoplasm of breast", "Chemotherapy-induced anemia"],
}

function MasterDetailDemo() {
  const list = ENCOUNTERS.slice(0, 5)
  const [activeId, setActiveId] = React.useState(list[0].id)
  const active = list.find((e) => e.id === activeId) ?? list[0]

  return (
    <Specimen className="p-0">
      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-[340px] rounded-xl"
      >
        <ResizablePanel defaultSize="38%" minSize="25%">
          <div className="flex h-full flex-col">
            <div className="border-b px-4 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Census · 5 patients
            </div>
            <ul className="flex-1 overflow-auto p-2">
              {list.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(row.id)}
                    aria-current={row.id === activeId ? "true" : undefined}
                    className={
                      row.id === activeId
                        ? "selected-marker flex w-full flex-col items-start gap-0.5 rounded-lg bg-surface-selected px-3 py-2 text-left text-foreground"
                        : "flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-surface-hover"
                    }
                  >
                    <span className="text-sm font-medium">{row.patient}</span>
                    <span className="font-mono text-xs opacity-70">
                      {row.mrn} · {row.demographic}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize="62%" minSize="40%">
          <div className="flex h-full flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading text-lg font-semibold tracking-tight">
                  {active.patient}
                </h3>
                <p className="font-mono text-xs text-muted-foreground">
                  {active.mrn} · {active.demographic} · {active.id}
                </p>
              </div>
              <Badge variant={STATUS_BADGE[active.status]}>
                {active.status}
              </Badge>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Encounter</dt>
                <dd>{active.type}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Department</dt>
                <dd>{active.department}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Attending provider
                </dt>
                <dd>{active.provider}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Admitted</dt>
                <dd className="font-mono text-xs">{active.admitted}</dd>
              </div>
            </dl>
            <Separator />
            <div>
              <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Active problems
              </div>
              <ul className="flex flex-col gap-1 text-sm">
                {(
                  PROBLEM_SUMMARY[active.id] ?? ["No active problems recorded"]
                ).map((problem) => (
                  <li key={problem} className="flex items-center gap-2">
                    <IconPulse className="size-3.5 text-muted-foreground" />
                    {problem}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Specimen>
  )
}

/* -------------------------------------------------------------------------- */
/*  8. Hierarchical / tree data                                               */
/* -------------------------------------------------------------------------- */

type TreeNode = {
  name: string
  meta?: string
  children?: TreeNode[]
}

const ORG_TREE: TreeNode[] = [
  {
    name: "Northgate Health Network",
    meta: "4 facilities",
    children: [
      {
        name: "Northgate Regional Hospital",
        meta: "312 beds",
        children: [
          { name: "3 West, Cardiac Telemetry", meta: "28 beds · 24 occupied" },
          { name: "4 East, Medical/Surgical", meta: "36 beds · 31 occupied" },
          { name: "ICU", meta: "18 beds · 17 occupied" },
        ],
      },
      {
        name: "Lakeside Ambulatory Center",
        meta: "Outpatient",
        children: [
          { name: "Infusion Suite", meta: "12 chairs" },
          { name: "Imaging", meta: "CT, MR, US" },
        ],
      },
      {
        name: "Riverbend Family Clinic",
        meta: "Primary care",
        children: [
          { name: "Pod A", meta: "6 exam rooms" },
          { name: "Pod B", meta: "6 exam rooms" },
        ],
      },
    ],
  },
]

function TreeBranch({ node, depth }: { node: TreeNode; depth: number }) {
  const indent = ["pl-3", "pl-8", "pl-13", "pl-18"][depth] ?? "pl-18"

  if (!node.children) {
    return (
      <div
        className={`flex items-center gap-2 py-1.5 text-sm ${indent} pr-3 hover:bg-surface-hover`}
      >
        <IconHospital className="size-3.5 shrink-0 text-muted-foreground" />
        <span>{node.name}</span>
        {node.meta ? (
          <span className="ml-auto text-xs text-muted-foreground">
            {node.meta}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <Collapsible defaultOpen={depth < 1}>
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className={`group flex w-full items-center gap-2 py-1.5 text-left text-sm ${indent} pr-3 hover:bg-surface-hover`}
          />
        }
      >
        <IconChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-90" />
        <IconBuilding className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="font-medium">{node.name}</span>
        {node.meta ? (
          <span className="ml-auto text-xs text-muted-foreground">
            {node.meta}
          </span>
        ) : null}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {node.children.map((child) => (
          <TreeBranch key={child.name} node={child} depth={depth + 1} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

function TreeDemo() {
  return (
    <Specimen className="p-2">
      {ORG_TREE.map((node) => (
        <TreeBranch key={node.name} node={node} depth={0} />
      ))}
    </Specimen>
  )
}

/* -------------------------------------------------------------------------- */
/*  9. Summary + drill-down                                                   */
/* -------------------------------------------------------------------------- */

type DrillKey = "all" | "Active" | "Pending" | "Discharged"

const DRILL_TILES: {
  key: DrillKey
  label: string
  caption: string
}[] = [
  { key: "all", label: "All encounters", caption: "Across 5 departments" },
  { key: "Active", label: "Open encounters", caption: "Currently on census" },
  { key: "Pending", label: "Awaiting triage", caption: "Not yet assigned" },
  { key: "Discharged", label: "Discharged", caption: "Last 7 days" },
]

function DrillDownDemo() {
  const [drill, setDrill] = React.useState<DrillKey>("all")

  function countFor(key: DrillKey) {
    return key === "all"
      ? ENCOUNTERS.length
      : ENCOUNTERS.filter((e) => e.status === key).length
  }

  const rows =
    drill === "all" ? ENCOUNTERS : ENCOUNTERS.filter((e) => e.status === drill)

  return (
    <Specimen>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DRILL_TILES.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => setDrill(tile.key)}
            aria-pressed={drill === tile.key}
            className={
              drill === tile.key
                ? "rounded-xl border border-primary bg-surface-selected p-4 text-left transition-colors"
                : "rounded-xl border p-4 text-left transition-colors hover:bg-surface-hover"
            }
          >
            <div className="text-xs text-muted-foreground">{tile.label}</div>
            <div className="mt-1 font-heading text-2xl font-semibold tabular-nums">
              {countFor(tile.key)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {tile.caption}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.patient}</TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.provider}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[row.status]}>{row.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Specimen>
  )
}

/* -------------------------------------------------------------------------- */
/*  10. Card grid vs table                                                    */
/* -------------------------------------------------------------------------- */

function ViewToggleDemo() {
  const [view, setView] = React.useState<"table" | "grid">("grid")
  const rows = ENCOUNTERS.slice(0, 6)

  return (
    <Specimen>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Same six encounters, two presentations.
        </p>
        <ToggleGroup
          value={[view]}
          onValueChange={(value) => {
            if (value[0]) setView(value[0] as "table" | "grid")
          }}
          variant="outline"
          size="sm"
          spacing={0}
        >
          <ToggleGroupItem value="table" aria-label="Table view">
            <IconTable />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Card view">
            <IconGrid />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {view === "table" ? (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>MRN</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.patient}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {row.mrn}
                  </TableCell>
                  <TableCell>{row.department}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.provider}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[row.status]}>
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {row.patient}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {row.mrn}
                  </div>
                </div>
                <Badge variant={STATUS_BADGE[row.status]}>{row.status}</Badge>
              </div>
              <Separator className="my-3" />
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <IconHospital className="size-3.5" />
                  {row.department} · {row.type}
                </span>
                <span className="flex items-center gap-1.5">
                  <IconUser className="size-3.5" />
                  {row.provider}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Specimen>
  )
}

/* -------------------------------------------------------------------------- */
/*  11. Pagination                                                            */
/* -------------------------------------------------------------------------- */

function PaginationDemo() {
  const pageSize = 4
  const [page, setPage] = React.useState(1)
  const totalPages = Math.ceil(ENCOUNTERS.length / pageSize)
  const rows = ENCOUNTERS.slice((page - 1) * pageSize, page * pageSize)

  return (
    <Specimen>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>MRN</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Admitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.patient}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {row.mrn}
                </TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell className="font-mono text-xs">
                  {row.admitted}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Showing {(page - 1) * pageSize + 1}-
          {Math.min(page * pageSize, ENCOUNTERS.length)} of {ENCOUNTERS.length}
        </p>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                className="cursor-pointer"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <PaginationItem key={n}>
                <PaginationLink
                  className="cursor-pointer"
                  isActive={n === page}
                  onClick={() => setPage(n)}
                >
                  {n}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                className="cursor-pointer"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </Specimen>
  )
}

/* -------------------------------------------------------------------------- */
/*  12. State coverage                                                        */
/* -------------------------------------------------------------------------- */

type ViewState = "loading" | "empty" | "error" | "ready"

function StateCoverageDemo() {
  const [state, setState] = React.useState<ViewState>("loading")

  return (
    <Specimen>
      <ToggleGroup
        value={[state]}
        onValueChange={(value) => {
          if (value[0]) setState(value[0] as ViewState)
        }}
        variant="outline"
        size="sm"
        spacing={0}
        className="mb-4"
      >
        <ToggleGroupItem value="loading">Loading</ToggleGroupItem>
        <ToggleGroupItem value="empty">Empty</ToggleGroupItem>
        <ToggleGroupItem value="error">Error</ToggleGroupItem>
        <ToggleGroupItem value="ready">Ready</ToggleGroupItem>
      </ToggleGroup>

      <div className="rounded-lg border">
        {state === "loading" ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="ml-auto h-5 w-16 rounded-3xl" />
              </div>
            ))}
          </div>
        ) : null}

        {state === "empty" ? (
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia>
                <Illustration name="no-encounters" />
              </EmptyMedia>
              <EmptyTitle>No encounters on this worklist</EmptyTitle>
              <EmptyDescription>
                Nothing matches the current filters. Widen the date range or
                clear the department facet to see more.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm">
                Clear all filters
              </Button>
            </EmptyContent>
          </Empty>
        ) : null}

        {state === "error" ? (
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia>
                <Illustration name="load-failed" />
              </EmptyMedia>
              <EmptyTitle>Could not load the census</EmptyTitle>
              <EmptyDescription>
                The ADT feed did not respond. Clinical data may be stale. Do not
                treat this view as the source of truth until it reloads.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm">
                <IconRefresh data-icon="inline-start" />
                Retry
              </Button>
            </EmptyContent>
          </Empty>
        ) : null}

        {state === "ready" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Patient</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ENCOUNTERS.slice(0, 5).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-4 font-medium">
                    {row.patient}
                  </TableCell>
                  <TableCell>{row.department}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[row.status]}>
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </div>
    </Specimen>
  )
}

/* -------------------------------------------------------------------------- */
/*  13. Lab results with reference ranges                                     */
/* -------------------------------------------------------------------------- */

type ResultFlag = "normal" | "abnormal" | "critical"

const FLAG_TEXT: Record<ResultFlag, string> = {
  normal: "text-muted-foreground",
  abnormal: "text-foreground font-medium",
  critical: "text-destructive font-semibold",
}

const FLAG_BADGE: Record<ResultFlag, "outline" | "secondary" | "destructive"> =
  {
    normal: "outline",
    abnormal: "secondary",
    critical: "destructive",
  }

const LAB_PANEL: {
  analyte: string
  value: string
  unit: string
  range: string
  flag: ResultFlag
}[] = [
  {
    analyte: "Sodium",
    value: "139",
    unit: "mmol/L",
    range: "135-145",
    flag: "normal",
  },
  {
    analyte: "Potassium",
    value: "6.1",
    unit: "mmol/L",
    range: "3.5-5.1",
    flag: "critical",
  },
  {
    analyte: "Creatinine",
    value: "1.8",
    unit: "mg/dL",
    range: "0.6-1.3",
    flag: "abnormal",
  },
  {
    analyte: "Hemoglobin",
    value: "9.4",
    unit: "g/dL",
    range: "12.0-15.5",
    flag: "abnormal",
  },
  {
    analyte: "Troponin I",
    value: "0.42",
    unit: "ng/mL",
    range: "0.00-0.04",
    flag: "critical",
  },
  {
    analyte: "Glucose",
    value: "102",
    unit: "mg/dL",
    range: "70-110",
    flag: "normal",
  },
]

function LabResultsDemo() {
  return (
    <Specimen className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Analyte</TableHead>
            <TableHead className="text-right">Result</TableHead>
            <TableHead>Units</TableHead>
            <TableHead>Reference range</TableHead>
            <TableHead className="pr-6">Flag</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {LAB_PANEL.map((lab) => (
            <TableRow key={lab.analyte}>
              <TableCell className="pl-6 font-medium">{lab.analyte}</TableCell>
              <TableCell
                className={`text-right font-mono tabular-nums ${FLAG_TEXT[lab.flag]}`}
              >
                {lab.value}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {lab.unit}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {lab.range}
              </TableCell>
              <TableCell className="pr-6">
                <Badge variant={FLAG_BADGE[lab.flag]} className="capitalize">
                  {lab.flag}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Specimen>
  )
}

/* -------------------------------------------------------------------------- */
/*  14. Charts                                                                */
/* -------------------------------------------------------------------------- */

const VOLUME_DATA = [
  { department: "Emergency", inpatient: 42, outpatient: 88 },
  { department: "Cardiology", inpatient: 31, outpatient: 54 },
  { department: "Internal Med", inpatient: 37, outpatient: 46 },
  { department: "Oncology", inpatient: 22, outpatient: 61 },
  { department: "Orthopedics", inpatient: 18, outpatient: 39 },
]

const VOLUME_CONFIG = {
  inpatient: { label: "Inpatient", color: "var(--chart-1)" },
  outpatient: { label: "Outpatient", color: "var(--chart-2)" },
} satisfies ChartConfig

const VITALS_DATA = [
  { time: "06:00", systolic: 142, diastolic: 88, heartRate: 92 },
  { time: "10:00", systolic: 138, diastolic: 84, heartRate: 88 },
  { time: "14:00", systolic: 151, diastolic: 94, heartRate: 101 },
  { time: "18:00", systolic: 134, diastolic: 82, heartRate: 84 },
  { time: "22:00", systolic: 128, diastolic: 78, heartRate: 79 },
  { time: "02:00", systolic: 124, diastolic: 76, heartRate: 72 },
]

const VITALS_CONFIG = {
  systolic: { label: "Systolic", color: "var(--chart-1)" },
  diastolic: { label: "Diastolic", color: "var(--chart-3)" },
  heartRate: { label: "Heart rate", color: "var(--chart-5)" },
} satisfies ChartConfig

function ChartsDemo() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Specimen>
        <div className="mb-4">
          <h3 className="text-sm font-medium">
            Encounter volume by department
          </h3>
          <p className="text-xs text-muted-foreground">
            Rolling 30 days · inpatient vs outpatient
          </p>
        </div>
        <ChartContainer config={VOLUME_CONFIG} className="h-[220px] w-full">
          <BarChart accessibilityLayer data={VOLUME_DATA}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="department"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="inpatient" fill="var(--color-inpatient)" radius={4} />
            <Bar
              dataKey="outpatient"
              fill="var(--color-outpatient)"
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      </Specimen>

      <Specimen>
        <div className="mb-4">
          <h3 className="text-sm font-medium">
            Vitals trend: Alvarez, Marisol
          </h3>
          <p className="text-xs text-muted-foreground">
            Last 24 hours · BP (mmHg) and heart rate (bpm)
          </p>
        </div>
        <ChartContainer config={VITALS_CONFIG} className="h-[220px] w-full">
          <LineChart
            accessibilityLayer
            data={VITALS_DATA}
            margin={{ left: 4, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={32}
              className="text-xs"
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              dataKey="systolic"
              type="monotone"
              stroke="var(--color-systolic)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="diastolic"
              type="monotone"
              stroke="var(--color-diastolic)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="heartRate"
              type="monotone"
              stroke="var(--color-heartRate)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </Specimen>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function Page() {
  return (
    <div>
      <header className="mb-10">
        <Badge variant="secondary" className="mb-3">
          Patterns
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Data patterns
        </h1>
      </header>

      <div className="flex flex-col gap-14">
        <Section title="Dense data table">
          <DenseTableDemo />
        </Section>

        <Section title="Density modes">
          <DensityDemo />
        </Section>

        <Section title="Faceted filtering">
          <FacetedFilterDemo />
        </Section>

        <Section title="Search with a scope selector">
          <ScopedSearchDemo />
        </Section>

        <Section title="Tab segregation with counts">
          <TabSegregationDemo />
        </Section>

        <Section title="Grouped and sectioned lists">
          <GroupedListDemo />
        </Section>

        <Section title="Master-detail split view">
          <MasterDetailDemo />
        </Section>

        <Section title="Hierarchical and tree data">
          <TreeDemo />
        </Section>

        <Section title="Summary tiles with drill-down">
          <DrillDownDemo />
        </Section>

        <Section title="Card grid versus table">
          <ViewToggleDemo />
        </Section>

        <Section title="Pagination versus infinite scroll">
          <PaginationDemo />
        </Section>

        <Section title="State coverage">
          <StateCoverageDemo />
        </Section>

        <Section title="Clinical values with reference ranges">
          <LabResultsDemo />
        </Section>

        <Section title="Charts">
          <ChartsDemo />
        </Section>

        <Section title="Choosing a pattern">
          <Specimen className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">If the user needs to…</TableHead>
                  <TableHead className="pr-6">Reach for</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  [
                    "Compare many records on the same attributes",
                    "Dense table with sortable columns",
                  ],
                  [
                    "Narrow by a few known dimensions",
                    "Faceted filters with removable chips",
                  ],
                  [
                    "Work through a queue item by item",
                    "Master-detail split view",
                  ],
                  [
                    "See where a record sits in a hierarchy",
                    "Collapsible tree",
                  ],
                  ["Separate exclusive workflow stages", "Tabs with counts"],
                  [
                    "Start from a number and get to the rows behind it",
                    "Summary tiles with drill-down",
                  ],
                  ["Scan hundreds of rows per shift", "Compact density mode"],
                  [
                    "Judge a trend rather than a value",
                    "Chart, paired with its table",
                  ],
                ].map(([need, answer]) => (
                  <TableRow key={need}>
                    <TableCell className="pl-6 whitespace-normal">
                      {need}
                    </TableCell>
                    <TableCell className="pr-6 font-medium whitespace-normal">
                      {answer}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Specimen>
        </Section>

        <Section title="Rules that apply to every pattern">
          <Specimen>
            <ul className="flex flex-col gap-3 text-sm">
              {[
                "Filter state is visible state",
                "Never encode meaning in color alone",
                "Only semantic tokens",
                "Class names are always literal",
                "Identity columns stay monospaced",
                "Every table states its total",
              ].map((rule) => (
                <li key={rule} className="flex gap-3">
                  <IconEye className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{rule}</span>
                </li>
              ))}
            </ul>
          </Specimen>
        </Section>
      </div>
    </div>
  )
}
