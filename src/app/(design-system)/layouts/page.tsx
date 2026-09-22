"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconChevronUp,
  IconChartBox,
  IconCalendar,
  IconDashboard,
  IconFileText,
  IconLab,
  IconMore,
  IconNotification,
  IconSearch,
  IconSettings,
  IconStethoscope,
  IconUser,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { BRAND_NAME } from "@/lib/brand"
import { Avatar, AvatarFallback } from "@/design-system/ui/avatar"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import { Checkbox } from "@/design-system/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import { Input } from "@/design-system/ui/input"
import { Separator } from "@/design-system/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/design-system/ui/tooltip"

/* ------------------------------------------------------------------ data -- */

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: IconDashboard },
  { id: "patients", label: "Patients", icon: IconUser },
  { id: "schedule", label: "Schedule", icon: IconCalendar },
  { id: "orders", label: "Orders", icon: IconFileText },
  { id: "results", label: "Results", icon: IconLab },
  { id: "reports", label: "Reports", icon: IconChartBox },
]

type Patient = {
  id: string
  name: string
  mrn: string
  dob: string
  provider: string
  department: string
  status: "Active" | "Pending" | "Discharged"
  lastSeen: string
}

const PATIENTS: Patient[] = [
  { id: "1", name: "Amara Okafor", mrn: "MRN-10241", dob: "1984-03-12", provider: "Dr. Reyes", department: "Cardiology", status: "Active", lastSeen: "2026-09-14" },
  { id: "2", name: "Desmond Hale", mrn: "MRN-10242", dob: "1971-11-02", provider: "Dr. Lin", department: "Endocrinology", status: "Pending", lastSeen: "2026-09-13" },
  { id: "3", name: "Priya Raghunathan", mrn: "MRN-10243", dob: "1996-06-28", provider: "Dr. Reyes", department: "Primary Care", status: "Active", lastSeen: "2026-09-15" },
  { id: "4", name: "Marcus Bell", mrn: "MRN-10244", dob: "1959-01-19", provider: "Dr. Osei", department: "Nephrology", status: "Discharged", lastSeen: "2026-09-02" },
  { id: "5", name: "Lena Sørensen", mrn: "MRN-10245", dob: "1988-09-30", provider: "Dr. Lin", department: "Primary Care", status: "Active", lastSeen: "2026-09-15" },
  { id: "6", name: "Tobias Frank", mrn: "MRN-10246", dob: "2001-04-07", provider: "Dr. Osei", department: "Orthopedics", status: "Pending", lastSeen: "2026-09-11" },
]

const KPIS = [
  { label: "Open encounters", value: "24", delta: "+3 today" },
  { label: "Unsigned notes", value: "7", delta: "2 overdue" },
  { label: "Results to review", value: "18", delta: "4 critical" },
  { label: "Scheduled today", value: "31", delta: "6 telehealth" },
]

const VOLUME = [
  { day: "Mon", value: 62 },
  { day: "Tue", value: 78 },
  { day: "Wed", value: 54 },
  { day: "Thu", value: 91 },
  { day: "Fri", value: 70 },
]

/* -------------------------------------------------------------- controls -- */

type NavVariant = "sidebar" | "icon" | "inset" | "floating" | "topnav" | "hybrid"
type ContentVariant = "table" | "grid" | "split" | "dashboard"
type Density = "comfortable" | "compact"

const NAV_VARIANTS: { id: NavVariant; label: string; note: string }[] = [
  { id: "sidebar", label: "Sidebar", note: "Default shell. Deep navigation stays visible." },
  { id: "icon", label: "Icon rail", note: "Collapsed rail — maximum width for wide tables." },
  { id: "inset", label: "Inset", note: "Content floats as a card. Calmer, costs some width." },
  { id: "floating", label: "Floating", note: "Detached sidebar. Spacious, best for dashboards." },
  { id: "topnav", label: "Top nav", note: "Horizontal nav. Good for shallow information architecture." },
  { id: "hybrid", label: "Top + sidebar", note: "Global bar plus module nav. Scales to large suites." },
]

const CONTENT_VARIANTS: { id: ContentVariant; label: string; note: string }[] = [
  { id: "table", label: "Data table", note: "Dense worklist with sorting and batch selection." },
  { id: "grid", label: "Card grid", note: "Scannable cards. Fewer records, more context each." },
  { id: "split", label: "Master–detail", note: "List beside detail. Review without losing place." },
  { id: "dashboard", label: "Dashboard", note: "KPI tiles and trends as a landing surface." },
]

function OptionButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
        active
          ? "border-primary bg-primary-surface font-medium text-foreground"
          : "border-border text-muted-foreground hover:bg-surface-hover"
      )}
    >
      {children}
    </button>
  )
}

function ControlGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold">{label}</span>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------ nav pieces -- */

function SidebarNav({
  active,
  onSelect,
  collapsed,
}: {
  active: string
  onSelect: (id: string) => void
  collapsed?: boolean
}) {
  return (
    <nav className={cn("flex flex-col gap-1 p-2", collapsed && "items-center")}>
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === active
        const button = (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg text-sm transition-colors",
              collapsed ? "size-9 justify-center" : "w-full px-2.5 py-2",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        )

        return collapsed ? (
          <Tooltip key={item.id}>
            <TooltipTrigger render={button} />
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        ) : (
          button
        )
      })}
    </nav>
  )
}

function BrandMark({ collapsed }: { collapsed?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-12 shrink-0 items-center gap-2 px-3",
        collapsed && "justify-center px-0"
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <IconStethoscope className="size-3.5" />
      </span>
      {!collapsed && <span className="truncate text-sm font-semibold">{BRAND_NAME}</span>}
    </div>
  )
}

function TopBar({
  active,
  onSelect,
  showNav,
}: {
  active: string
  onSelect: (id: string) => void
  showNav: boolean
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b bg-card px-4">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <IconStethoscope className="size-3.5" />
        </span>
        <span className="text-sm font-semibold">{BRAND_NAME}</span>
      </div>

      {showNav && (
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={item.id === active ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                item.id === active
                  ? "bg-surface-selected selected-marker font-medium text-foreground"
                  : "text-muted-foreground hover:bg-surface-hover"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" aria-label="Notifications">
          <IconNotification />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Settings">
          <IconSettings />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button type="button" aria-label="Account">
                <Avatar className="size-7">
                  <AvatarFallback className="text-[10px]">JR</AvatarFallback>
                </Avatar>
              </button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

function PageHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">
          {PATIENTS.length} records · updated just now
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <IconSearch className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-8 w-44 pl-8 text-xs" placeholder="Search patients" />
        </div>
        <Button size="sm">New encounter</Button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- contents -- */

const STATUS_VARIANT = {
  Active: "secondary",
  Pending: "outline",
  Discharged: "outline",
} as const

const DENSITY_CELL = {
  comfortable: "py-3",
  compact: "py-1.5",
} as const

function WorklistTable({ density }: { density: Density }) {
  const [sortKey, setSortKey] = React.useState<keyof Patient>("name")
  const [asc, setAsc] = React.useState(true)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  const rows = React.useMemo(() => {
    return [...PATIENTS].sort((a, b) => {
      const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]))
      return asc ? cmp : -cmp
    })
  }, [sortKey, asc])

  const allSelected = selected.size === rows.length

  function toggleSort(key: keyof Patient) {
    if (key === sortKey) {
      setAsc((v) => !v)
    } else {
      setSortKey(key)
      setAsc(true)
    }
  }

  const columns: { key: keyof Patient; label: string }[] = [
    { key: "name", label: "Patient" },
    { key: "mrn", label: "MRN" },
    { key: "provider", label: "Provider" },
    { key: "department", label: "Department" },
    { key: "status", label: "Status" },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {selected.size > 0 && (
        <div className="flex items-center gap-3 border-b bg-surface-selected px-5 py-2 text-xs">
          <span className="font-medium">{selected.size} selected</span>
          <Button size="xs" variant="outline">
            Assign provider
          </Button>
          <Button size="xs" variant="outline">
            Export
          </Button>
          <button
            type="button"
            className="ml-auto text-muted-foreground underline underline-offset-2"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-5">
                <Checkbox
                  aria-label="Select all"
                  checked={allSelected}
                  indeterminate={selected.size > 0 && !allSelected}
                  onCheckedChange={(checked) =>
                    setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set())
                  }
                />
              </TableHead>
              {columns.map((col) => (
                <TableHead key={col.key}>
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className="flex items-center gap-1 transition-colors hover:text-foreground"
                  >
                    {col.label}
                    {sortKey === col.key &&
                      (asc ? (
                        <IconChevronUp className="size-3.5" />
                      ) : (
                        <IconChevronDown className="size-3.5" />
                      ))}
                  </button>
                </TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} data-selected={selected.has(row.id) || undefined}>
                <TableCell className={cn("pl-5", DENSITY_CELL[density])}>
                  <Checkbox
                    aria-label={`Select ${row.name}`}
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
                <TableCell className={cn("font-medium", DENSITY_CELL[density])}>
                  {row.name}
                </TableCell>
                <TableCell className={cn("font-mono text-xs text-muted-foreground", DENSITY_CELL[density])}>
                  {row.mrn}
                </TableCell>
                <TableCell className={cn("text-muted-foreground", DENSITY_CELL[density])}>
                  {row.provider}
                </TableCell>
                <TableCell className={cn("text-muted-foreground", DENSITY_CELL[density])}>
                  {row.department}
                </TableCell>
                <TableCell className={DENSITY_CELL[density]}>
                  <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
                </TableCell>
                <TableCell className={DENSITY_CELL[density]}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-xs" aria-label="Row actions">
                          <IconMore />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Open chart</DropdownMenuItem>
                      <DropdownMenuItem>Schedule follow-up</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive">Void encounter</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function CardGrid() {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PATIENTS.map((p) => (
          <div key={p.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {p.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{p.mrn}</p>
                </div>
              </div>
              <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
            </div>
            <Separator />
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Provider</dt>
                <dd>{p.provider}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Department</dt>
                <dd>{p.department}</dd>
              </div>
            </dl>
            <Button size="xs" variant="outline" className="w-full">
              Open chart
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function MasterDetail() {
  const [activeId, setActiveId] = React.useState(PATIENTS[0].id)
  const active = PATIENTS.find((p) => p.id === activeId) ?? PATIENTS[0]

  return (
    <div className="flex min-h-0 flex-1">
      <div className="w-60 shrink-0 overflow-auto border-r">
        {PATIENTS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveId(p.id)}
            className={cn(
              "flex w-full flex-col gap-0.5 border-b px-4 py-3 text-left transition-colors",
              p.id === activeId ? "bg-surface-selected" : "hover:bg-surface-hover"
            )}
          >
            <span className="text-sm font-medium">{p.name}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{p.mrn}</span>
          </button>
        ))}
      </div>
      <div className="min-w-0 flex-1 overflow-auto p-5">
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarFallback>
              {active.name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-heading text-lg font-semibold">{active.name}</h3>
            <p className="font-mono text-xs text-muted-foreground">
              {active.mrn} · DOB {active.dob}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[active.status]} className="ml-auto">
            {active.status}
          </Badge>
        </div>
        <Separator className="my-4" />
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Provider</dt>
            <dd>{active.provider}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Department</dt>
            <dd>{active.department}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Last seen</dt>
            <dd className="font-mono text-xs">{active.lastSeen}</dd>
          </div>
        </dl>
        <Separator className="my-4" />
        <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Recent note
        </h4>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Patient reports improved exercise tolerance since the last visit. Blood pressure is at
          goal on the current regimen. Continue present therapy and recheck in three months.
        </p>
      </div>
    </div>
  )
}

const BAR_HEIGHTS: Record<number, string> = {
  54: "h-[54%]",
  62: "h-[62%]",
  70: "h-[70%]",
  78: "h-[78%]",
  91: "h-[91%]",
}

function Dashboard() {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 font-heading text-2xl font-semibold">{k.value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{k.delta}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 lg:col-span-2">
          <p className="text-sm font-semibold">Encounter volume</p>
          <p className="text-xs text-muted-foreground">This week</p>
          <div className="mt-4 flex h-32 items-end gap-3">
            {VOLUME.map((v) => (
              <div key={v.day} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-full w-full items-end">
                  <div className={cn("w-full rounded-t-md bg-chart-2", BAR_HEIGHTS[v.value])} />
                </div>
                <span className="text-[10px] text-muted-foreground">{v.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold">Today&apos;s panel</p>
          <div className="mt-3 flex flex-col gap-2.5">
            {PATIENTS.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center gap-2.5">
                <Avatar className="size-7">
                  <AvatarFallback className="text-[10px]">
                    {p.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.department}</p>
                </div>
                <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- assembler -- */

function ScreenPreview({
  nav,
  content,
  density,
}: {
  nav: NavVariant
  content: ContentVariant
  density: Density
}) {
  const [activeNav, setActiveNav] = React.useState("patients")

  const title =
    CONTENT_VARIANTS.find((c) => c.id === content)?.label === "Dashboard"
      ? "Dashboard"
      : "Patient worklist"

  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      {content !== "dashboard" && <PageHeader title={title} />}
      {content === "table" && <WorklistTable density={density} />}
      {content === "grid" && <CardGrid />}
      {content === "split" && <MasterDetail />}
      {content === "dashboard" && <Dashboard />}
    </div>
  )

  if (nav === "topnav") {
    return (
      <div className="flex h-full flex-col bg-background">
        <TopBar active={activeNav} onSelect={setActiveNav} showNav />
        {body}
      </div>
    )
  }

  if (nav === "hybrid") {
    return (
      <div className="flex h-full flex-col bg-background">
        <TopBar active={activeNav} onSelect={setActiveNav} showNav={false} />
        <div className="flex min-h-0 flex-1">
          <aside className="w-52 shrink-0 border-r bg-sidebar text-sidebar-foreground">
            <SidebarNav active={activeNav} onSelect={setActiveNav} />
          </aside>
          {body}
        </div>
      </div>
    )
  }

  if (nav === "icon") {
    return (
      <div className="flex h-full bg-background">
        <aside className="flex w-14 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
          <BrandMark collapsed />
          <SidebarNav active={activeNav} onSelect={setActiveNav} collapsed />
        </aside>
        {body}
      </div>
    )
  }

  if (nav === "inset") {
    return (
      <div className="flex h-full bg-sidebar">
        <aside className="flex w-52 shrink-0 flex-col text-sidebar-foreground">
          <BrandMark />
          <SidebarNav active={activeNav} onSelect={setActiveNav} />
        </aside>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background m-2 ml-0">
          {body}
        </div>
      </div>
    )
  }

  if (nav === "floating") {
    return (
      <div className="flex h-full gap-2 bg-muted/40 p-2">
        <aside className="flex w-52 shrink-0 flex-col rounded-xl border bg-sidebar text-sidebar-foreground">
          <BrandMark />
          <SidebarNav active={activeNav} onSelect={setActiveNav} />
        </aside>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background">
          {body}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-background">
      <aside className="flex w-52 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <BrandMark />
        <SidebarNav active={activeNav} onSelect={setActiveNav} />
      </aside>
      {body}
    </div>
  )
}

export default function Page() {
  const [nav, setNav] = React.useState<NavVariant>("sidebar")
  const [content, setContent] = React.useState<ContentVariant>("table")
  const [density, setDensity] = React.useState<Density>("comfortable")

  const navNote = NAV_VARIANTS.find((v) => v.id === nav)?.note
  const contentNote = CONTENT_VARIANTS.find((v) => v.id === content)?.note

  return (
    <div>
      <header className="mb-6">
        <Badge variant="secondary" className="mb-3">
          Screens
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Screen assembler</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every shell variation combined with every content pattern, assembled live. Pick a
          navigation style and a content layout to see the composition you would actually ship —
          the preview is fully interactive, so sorting, selection, and navigation all work.
        </p>
      </header>

      <div className="mb-6 grid gap-5 rounded-xl border bg-card p-5 lg:grid-cols-[1fr_1fr_auto]">
        <ControlGroup label="Navigation">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {NAV_VARIANTS.map((v) => (
              <OptionButton key={v.id} active={nav === v.id} onClick={() => setNav(v.id)}>
                {v.label}
              </OptionButton>
            ))}
          </div>
        </ControlGroup>

        <ControlGroup label="Content">
          <div className="grid grid-cols-2 gap-2">
            {CONTENT_VARIANTS.map((v) => (
              <OptionButton
                key={v.id}
                active={content === v.id}
                onClick={() => setContent(v.id)}
              >
                {v.label}
              </OptionButton>
            ))}
          </div>
        </ControlGroup>

        <ControlGroup label="Density">
          <div className="flex gap-2 lg:flex-col">
            {(["comfortable", "compact"] as Density[]).map((d) => (
              <OptionButton key={d} active={density === d} onClick={() => setDensity(d)}>
                {d === "comfortable" ? "Comfortable" : "Compact"}
              </OptionButton>
            ))}
          </div>
        </ControlGroup>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">Shell:</strong> {navNote}
        </span>
        <span>
          <strong className="text-foreground">Content:</strong> {contentNote}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border shadow-sm">
        <div className="h-[36rem]">
          <ScreenPreview nav={nav} content={content} density={density} />
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Density only affects the data table. Shells are composed from plain layout primitives and
        semantic tokens rather than the Sidebar component, so they can be nested inside this page
        and edited freely — see{" "}
        <code className="font-mono">app/layouts/page.tsx</code>.
      </p>
    </div>
  )
}
