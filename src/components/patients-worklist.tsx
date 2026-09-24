"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "@/design-system/ui/sonner"
import {
  IconChevronDown,
  IconDownload,
  IconFilter,
  IconMore,
  IconSearch,
  IconUserAdd,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { EhrShell } from "@/components/ehr-shell"
import { AddPatientForm } from "@/components/add-patient-form"
import { Avatar, AvatarFallback } from "@/design-system/ui/avatar"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import { Card } from "@/design-system/ui/card"
import { ButtonGroup } from "@/design-system/ui/button-group"
import { Checkbox } from "@/design-system/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import {
  Empty,
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/design-system/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"

/* -------------------------------------------------------------------------- */
/*  Data                                                                       */
/* -------------------------------------------------------------------------- */

type PatientStatus = "Active" | "Pending" | "Discharged"

type Patient = {
  id: string
  name: string
  mrn: string
  dob: string
  age: number
  sex: "F" | "M" | "X"
  phone: string
  provider: string
  department: string
  status: PatientStatus
  lastSeen: string
  flag?: string
}

const PATIENTS: Patient[] = [...handWrittenPatients(), ...morePatients()]

function handWrittenPatients(): Patient[] {
  return [
    {
      id: "1",
      name: "Amara Okafor",
      mrn: "MRN-10241",
      dob: "1984-03-12",
      age: 42,
      sex: "F",
      phone: "(555) 018-2245",
      provider: "Dr. Reyes",
      department: "Cardiology",
      status: "Active",
      lastSeen: "2026-09-14",
      flag: "Allergy",
    },
    {
      id: "2",
      name: "Desmond Hale",
      mrn: "MRN-10242",
      dob: "1971-11-02",
      age: 54,
      sex: "M",
      phone: "(555) 018-7781",
      provider: "Dr. Lin",
      department: "Endocrinology",
      status: "Pending",
      lastSeen: "2026-09-13",
    },
    {
      id: "3",
      name: "Priya Raghunathan",
      mrn: "MRN-10243",
      dob: "1996-06-28",
      age: 30,
      sex: "F",
      phone: "(555) 018-3390",
      provider: "Dr. Reyes",
      department: "Primary Care",
      status: "Active",
      lastSeen: "2026-09-15",
    },
    {
      id: "4",
      name: "Marcus Bell",
      mrn: "MRN-10244",
      dob: "1959-01-19",
      age: 67,
      sex: "M",
      phone: "(555) 018-9012",
      provider: "Dr. Osei",
      department: "Nephrology",
      status: "Discharged",
      lastSeen: "2026-09-02",
    },
    {
      id: "5",
      name: "Lena Sørensen",
      mrn: "MRN-10245",
      dob: "1988-09-30",
      age: 37,
      sex: "F",
      phone: "(555) 018-4417",
      provider: "Dr. Lin",
      department: "Primary Care",
      status: "Active",
      lastSeen: "2026-09-15",
    },
    {
      id: "6",
      name: "Tobias Frank",
      mrn: "MRN-10246",
      dob: "2001-04-07",
      age: 25,
      sex: "M",
      phone: "(555) 018-6654",
      provider: "Dr. Osei",
      department: "Orthopedics",
      status: "Pending",
      lastSeen: "2026-09-11",
    },
    {
      id: "7",
      name: "Nadia Haddad",
      mrn: "MRN-10247",
      dob: "1979-12-21",
      age: 46,
      sex: "F",
      phone: "(555) 018-2208",
      provider: "Dr. Reyes",
      department: "Cardiology",
      status: "Active",
      lastSeen: "2026-09-16",
      flag: "Interpreter",
    },
    {
      id: "8",
      name: "Julian Vega",
      mrn: "MRN-10248",
      dob: "1965-08-03",
      age: 61,
      sex: "M",
      phone: "(555) 018-5573",
      provider: "Dr. Lin",
      department: "Endocrinology",
      status: "Active",
      lastSeen: "2026-09-10",
    },
    {
      id: "9",
      name: "Hana Ishikawa",
      mrn: "MRN-10249",
      dob: "1993-02-14",
      age: 33,
      sex: "F",
      phone: "(555) 018-8845",
      provider: "Dr. Osei",
      department: "Orthopedics",
      status: "Discharged",
      lastSeen: "2026-08-28",
    },
    {
      id: "10",
      name: "Samuel Adeyemi",
      mrn: "MRN-10250",
      dob: "1952-07-09",
      age: 74,
      sex: "M",
      phone: "(555) 018-1196",
      provider: "Dr. Reyes",
      department: "Nephrology",
      status: "Pending",
      lastSeen: "2026-09-09",
      flag: "Fall risk",
    },
    {
      id: "11",
      name: "Beatriz Almeida",
      mrn: "MRN-10251",
      dob: "1990-05-25",
      age: 36,
      sex: "F",
      phone: "(555) 018-7334",
      provider: "Dr. Lin",
      department: "Primary Care",
      status: "Active",
      lastSeen: "2026-09-17",
    },
    {
      id: "12",
      name: "Oskar Lindqvist",
      mrn: "MRN-10252",
      dob: "1974-10-16",
      age: 51,
      sex: "M",
      phone: "(555) 018-6620",
      provider: "Dr. Osei",
      department: "Cardiology",
      status: "Active",
      lastSeen: "2026-09-12",
    },
  ]
}

/* The rest of the 50 rows, derived from each row's position so the list is
   stable across reloads. */
function morePatients(): Patient[] {
  const names: [name: string, sex: Patient["sex"]][] = [
    ["Clara Whitmore", "F"],
    ["Rohan Kapoor", "M"],
    ["Ines Marchetti", "F"],
    ["Gareth Lloyd", "M"],
    ["Yuki Tanaka", "F"],
    ["Mateus Costa", "M"],
    ["Freya Lindgren", "F"],
    ["Kwame Mensah", "M"],
    ["Sofia Petrova", "F"],
    ["Elliot Ramsey", "M"],
    ["Anika Sharma", "F"],
    ["Hugo Laurent", "M"],
    ["Maribel Cruz", "F"],
    ["Declan Murphy", "M"],
    ["Leila Nasser", "F"],
    ["Arturo Salinas", "M"],
    ["Greta Holm", "F"],
    ["Idris Bakari", "M"],
    ["Paige Donovan", "F"],
    ["Emil Novak", "M"],
    ["Rosa Jimenez", "F"],
    ["Theo Park", "M"],
    ["Aaliyah Brooks", "F"],
    ["Callum Reid", "M"],
    ["Mei Chen", "F"],
    ["Dario Russo", "M"],
    ["Noor Siddiqui", "F"],
    ["Jonas Weber", "M"],
    ["Imogen Clarke", "F"],
    ["Rafael Ortega", "M"],
    ["Selin Aydin", "F"],
    ["Wes Harper", "M"],
    ["Alex Morgan", "X"],
    ["Beatrix Keller", "F"],
    ["Omar Farouk", "M"],
    ["Lucia Romano", "F"],
    ["Nathan Cole", "M"],
    ["Tali Cohen", "F"],
  ]
  const providers = ["Dr. Reyes", "Dr. Lin", "Dr. Osei"]
  const departments = [
    "Primary Care",
    "Cardiology",
    "Endocrinology",
    "Nephrology",
    "Orthopedics",
  ]
  const statuses: PatientStatus[] = [
    "Active",
    "Active",
    "Pending",
    "Active",
    "Discharged",
  ]
  const flags = ["Allergy", "Interpreter", "Fall risk"]
  const pad = (n: number, width: number) => String(n).padStart(width, "0")
  return names.map(([name, sex], i) => {
    const age = 22 + ((i * 17) % 60)
    const n = 13 + i
    return {
      id: String(n),
      name,
      mrn: `MRN-${10240 + n}`,
      dob: `${2026 - age}-${pad(1 + ((i * 5) % 12), 2)}-${pad(1 + ((i * 7) % 28), 2)}`,
      age,
      sex,
      phone: `(555) 018-${pad(1000 + ((i * 2749) % 9000), 4)}`,
      provider: providers[i % providers.length],
      department: departments[(i * 3) % departments.length],
      status: statuses[i % statuses.length],
      lastSeen: `2026-09-${pad(1 + ((i * 3) % 17), 2)}`,
      ...(i % 6 === 2 ? { flag: flags[i % flags.length] } : {}),
    }
  })
}

const STATUS_VARIANT: Record<
  PatientStatus,
  "success" | "warning" | "secondary"
> = {
  Active: "success",
  Pending: "warning",
  Discharged: "secondary",
}

const DEPARTMENT_FILTER = [
  { label: "All departments", value: "all" },
  { label: "Primary Care", value: "Primary Care" },
  { label: "Cardiology", value: "Cardiology" },
  { label: "Endocrinology", value: "Endocrinology" },
  { label: "Nephrology", value: "Nephrology" },
  { label: "Orthopedics", value: "Orthopedics" },
]

const PROVIDER_FILTER = [
  { label: "All providers", value: "all" },
  { label: "Dr. Reyes", value: "Dr. Reyes" },
  { label: "Dr. Lin", value: "Dr. Lin" },
  { label: "Dr. Osei", value: "Dr. Osei" },
]

const PAGE_SIZE = 8

/* The pager in the reference offers a page size, so the footer here does
   too. `value` is a string because that is what the Select round-trips. */
const PAGE_SIZES = [
  { label: "8", value: "8" },
  { label: "15", value: "15" },
  { label: "25", value: "25" },
]

/* The segmented switch from the design: square segments inside one 6px-radius
   outline, 16px side padding, a 1px rule between segments. The selected one
   is Primary/00 behind Primary/07-Main ink (--primary-surface / --primary);
   the rest are regular-weight muted text. Dark mode falls back to the tint,
   because a dark card needs the lighter end of the ramp to read. */
const SUB_TAB =
  "h-full flex-none rounded-none px-4 font-normal text-muted-foreground " +
  "not-first:shadow-[inset_1px_0_0_var(--border)] " +
  "data-active:bg-primary-surface data-active:font-medium data-active:text-primary " +
  "dark:data-active:bg-primary-surface dark:data-active:text-primary-tint"

/* A page number in the pager: a 26px square at 4px radius, the current page
   filled with the primary. */
const PAGE_LINK =
  "size-[26px] cursor-pointer rounded-[4px] text-sm font-normal text-muted-foreground " +
  "data-[active=true]:border-transparent data-[active=true]:bg-primary " +
  "data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary/90"

/* Previous / next are bare chevrons in the design, the same 26px square. */
const PAGE_STEP =
  "size-[26px] cursor-pointer px-0! text-muted-foreground [&>span]:hidden!"

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
}

/* -------------------------------------------------------------------------- */
/*  Screen                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The patients worklist. It lives here rather than in the route so the screen
 * and the shell that frames it stay separable.
 */
export function PatientsWorklist() {
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<"all" | PatientStatus>("all")
  const [department, setDepartment] = React.useState("all")
  const [provider, setProvider] = React.useState("all")
  const [selected, setSelected] = React.useState<string[]>([])
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(PAGE_SIZE)

  /* The three presentations of the same form. Which one is right depends on how
     much the task needs to borrow from the page behind it — see the note under
     the table. */
  const [centerOpen, setCenterOpen] = React.useState(false)
  const [sideOpen, setSideOpen] = React.useState(false)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return PATIENTS.filter((patient) => {
      if (status !== "all" && patient.status !== status) return false
      if (department !== "all" && patient.department !== department)
        return false
      if (provider !== "all" && patient.provider !== provider) return false
      if (!q) return true
      return (
        patient.name.toLowerCase().includes(q) ||
        patient.mrn.toLowerCase().includes(q) ||
        patient.phone.includes(q)
      )
    })
  }, [query, status, department, provider])

  const activeFilters =
    Number(department !== "all") + Number(provider !== "all")

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const rows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )
  /* The range the footer prints, 1-based and clamped so an empty filter
     reads "0-0 of 0" rather than "1–0 of 0". */
  const rangeStart =
    filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, filtered.length)

  const allOnPageSelected =
    rows.length > 0 && rows.every((r) => selected.includes(r.id))

  function toggleAll() {
    setSelected((prev) =>
      allOnPageSelected
        ? prev.filter((id) => !rows.some((r) => r.id === id))
        : [...new Set([...prev, ...rows.map((r) => r.id)])]
    )
  }

  function toggleOne(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  function handleCreated(where: string) {
    toast.success("Patient record created", {
      description: `Saved from the ${where}. The worklist would refresh here.`,
    })
  }

  const counts = React.useMemo(
    () => ({
      all: PATIENTS.length,
      Active: PATIENTS.filter((p) => p.status === "Active").length,
      Pending: PATIENTS.filter((p) => p.status === "Pending").length,
      Discharged: PATIENTS.filter((p) => p.status === "Discharged").length,
    }),
    []
  )

  return (
    <EhrShell active="patients">
      {/* Spacing is measured off the Figma frame (Amazing Grace Center →
          Inpatient List), not approximated: 16px either side, 12px above the
          32px toolbar, 16px between the toolbar and the table, 16px under it.
          The toolbar sits on the canvas and the table is the one card. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 bg-surface-sunken px-4 pt-3 pb-4">
        <h1 className="sr-only">Patients</h1>

        {/* One 32px row: the segmented switch on the left, the actions on the
            right 12px apart — the Figma "Table Header-32px" frame. */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <Tabs
            value={status}
            onValueChange={(value) => {
              setStatus(value as "all" | PatientStatus)
              setPage(1)
            }}
          >
            <TabsList className="h-8! gap-0 overflow-hidden rounded-md border bg-card p-0">
              <TabsTrigger value="all" className={SUB_TAB}>
                All ({counts.all})
              </TabsTrigger>
              <TabsTrigger value="Active" className={SUB_TAB}>
                Active ({counts.Active})
              </TabsTrigger>
              <TabsTrigger value="Pending" className={SUB_TAB}>
                Pending ({counts.Pending})
              </TabsTrigger>
              <TabsTrigger value="Discharged" className={SUB_TAB}>
                Discharged ({counts.Discharged})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Once rows are checked the toolbar swaps to bulk actions in place,
              so the selection's controls sit where the eye already is and the
              table below keeps its position. */}
          {selected.length > 0 ? (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <span className="text-xs text-muted-foreground">
                {selected.length} selected
              </span>
              <Button variant="outline" size="sm" className="rounded-md">
                Assign provider
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-md"
                onClick={() => setSelected([])}
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
                    aria-label="Search patients"
                  />
                </InputGroup>
              </div>
              {/* The design's toolbar has one Filters button, not a row of
                selects — so department and provider live in its popover, which
                keeps the row at the frame's single 32px line. */}
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
                    <Select
                      items={DEPARTMENT_FILTER}
                      value={department}
                      onValueChange={(value: string | null) => {
                        setDepartment(value ?? "all")
                        setPage(1)
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-full rounded-md"
                        aria-label="Department"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {DEPARTMENT_FILTER.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    <Select
                      items={PROVIDER_FILTER}
                      value={provider}
                      onValueChange={(value: string | null) => {
                        setProvider(value ?? "all")
                        setPage(1)
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-full rounded-md"
                        aria-label="Provider"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {PROVIDER_FILTER.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>

              {/* The 32px square after Filters in the design. */}
              <Button
                variant="outline"
                size="icon-sm"
                className="rounded-md"
                aria-label="Export"
              >
                <IconDownload />
              </Button>

              {/* Split control: the default action opens the centre modal, the
                menu reaches the other two presentations. */}
              <ButtonGroup>
                <Button size="sm" onClick={() => setCenterOpen(true)}>
                  <IconUserAdd />
                  Add patient
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        size="sm"
                        aria-label="Choose how to add a patient"
                      >
                        <IconChevronDown />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-60">
                    {/* Base UI requires GroupLabel to live inside a Group. */}
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Open the form as</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setCenterOpen(true)}>
                        Center modal
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSideOpen(true)}>
                        Side modal
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        render={<Link href="/screens/patients/new" />}
                      >
                        Full page
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>
            </div>
          )}
        </div>

        {/* The card carries the design's "Shadow 1" (0 0 5px, 8% black) and a
            hairline in the same --border as the row rules, so the table's edge
            reads as one outline with the lines inside it. */}
        <Card className="min-h-0 flex-1 gap-0 rounded-md border border-border py-0 shadow-[0_0_5px_rgb(0_0_0/0.08)] ring-0">
          {/* table */}
          <div className="min-h-0 flex-1 overflow-auto">
            {rows.length === 0 ? (
              <Empty className="h-full">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconSearch />
                  </EmptyMedia>
                  <EmptyTitle>No patients match these filters</EmptyTitle>
                  <EmptyDescription>
                    Widen the search or clear a filter to see the rest of the
                    panel.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                {/* Header cells: 10px / 16px padding, 12px medium muted type —
                    36px tall. Body cells: 8px / 16px. Both from the frame. */}
                <TableHeader className="sticky top-0 z-10 bg-surface-head [&_th]:h-9 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allOnPageSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select all on this page"
                      />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      MRN Number
                    </TableHead>
                    <TableHead>Patient Name</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      DOB / Age
                    </TableHead>
                    <TableHead className="hidden xl:table-cell">
                      Phone Number
                    </TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Department
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden 2xl:table-cell">
                      Last seen
                    </TableHead>
                    <TableHead className="w-10 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_td]:px-4 [&_td]:py-2">
                  {rows.map((patient) => {
                    const isSelected = selected.includes(patient.id)
                    return (
                      <TableRow
                        key={patient.id}
                        data-state={isSelected ? "selected" : undefined}
                        className={cn(isSelected && "bg-surface-selected")}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleOne(patient.id)}
                            aria-label={`Select ${patient.name}`}
                          />
                        </TableCell>
                        {/* The design draws the MRN as the row's link, in
                            Primary/09 — which is what --primary-tint is. */}
                        <TableCell className="hidden font-medium text-primary-tint md:table-cell">
                          {patient.mrn}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8">
                              <AvatarFallback>
                                {initials(patient.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-medium">
                                  {patient.name}
                                </span>
                                {patient.flag && (
                                  <Badge
                                    variant="destructive"
                                    className="hidden sm:inline-flex"
                                  >
                                    {patient.flag}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground md:hidden">
                                {patient.mrn}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="tabular-nums">{patient.dob}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {patient.age}
                            {patient.sex}
                          </span>
                        </TableCell>
                        <TableCell className="hidden tabular-nums xl:table-cell">
                          {patient.phone}
                        </TableCell>
                        <TableCell>{patient.provider}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {patient.department}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[patient.status]}>
                            {patient.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground tabular-nums 2xl:table-cell">
                          {patient.lastSeen}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Actions for ${patient.name}`}
                                >
                                  <IconMore />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Open chart</DropdownMenuItem>
                              <DropdownMenuItem>
                                Schedule visit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                Message patient
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive">
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pager, 11px / 16px padding: page size and range on the left, the
              page links on the right as 26px squares at 4px radius, the current
              one filled with the primary. */}
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
                    setPageSize(Number(value ?? PAGE_SIZE))
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (n) => (
                    <PaginationItem key={n}>
                      <PaginationLink
                        className={PAGE_LINK}
                        isActive={n === currentPage}
                        onClick={() => setPage(n)}
                      >
                        {n}
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

      {/* ------------------------------------------------ center modal ----- */}
      <Dialog open={centerOpen} onOpenChange={setCenterOpen}>
        <DialogContent className="flex max-h-[85svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b p-6">
            <DialogTitle>Add patient</DialogTitle>
            <DialogDescription>
              Registration essentials. Coverage and consent can be completed on
              the full page.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <AddPatientForm
              id="add-patient-center"
              variant="compact"
              onSubmit={() => {
                setCenterOpen(false)
                handleCreated("center modal")
              }}
            />
          </div>

          <DialogFooter className="mt-0 shrink-0 flex-row items-center justify-between border-t p-4">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/screens/patients/new" />}
            >
              Open full page
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCenterOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="add-patient-center">
                Create patient
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------- side modal ----- */}
      <Sheet open={sideOpen} onOpenChange={setSideOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b">
            <SheetTitle>Add patient</SheetTitle>
            <SheetDescription>
              The worklist stays visible behind the panel, so you can keep
              checking it against what you are typing.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <AddPatientForm
              id="add-patient-side"
              variant="compact"
              onSubmit={() => {
                setSideOpen(false)
                handleCreated("side modal")
              }}
            />
          </div>

          <SheetFooter className="mt-0 shrink-0 flex-row justify-end gap-2 border-t p-4">
            <Button variant="outline" onClick={() => setSideOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-patient-side">
              Create patient
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </EhrShell>
  )
}
