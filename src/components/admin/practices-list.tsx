"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/design-system/ui/sonner"
import {
  IconCopy,
  IconFilter,
  IconHospital,
  IconMoreVertical,
  IconSearch,
  IconUserAdd,
} from "@/design-system/icons"

import { AdminShell } from "@/components/admin/admin-shell"
import { usePracticeActions } from "@/components/admin/practice-actions"
import {
  type Practice,
  type PracticeStatus,
  formatDate,
  managerName,
  usePractices,
} from "@/components/admin/practices-store"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import { Card } from "@/design-system/ui/card"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system/ui/tooltip"
import { Illustration } from "@/components/illustrations/illustration"

const STATUS_FILTER = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
]

const MANAGER_FILTER = [
  { label: "Any clinic manager", value: "all" },
  { label: "Active manager", value: "Active" },
  { label: "Invite pending", value: "Invited" },
  { label: "No manager yet", value: "none" },
]

const PAGE_SIZES = [
  { label: "10", value: "10" },
  { label: "15", value: "15" },
  { label: "25", value: "25" },
]

const STATUS_VARIANT: Record<PracticeStatus, "success" | "destructive"> = {
  Active: "success",
  Inactive: "destructive",
}

/* The pager matches the patients worklist: 26px squares at 4px radius. */
const PAGE_LINK =
  "size-[26px] cursor-pointer rounded-[4px] text-sm font-normal text-muted-foreground " +
  "data-[active=true]:border-transparent data-[active=true]:bg-primary " +
  "data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary/90"

const PAGE_STEP =
  "size-[26px] cursor-pointer px-0! text-muted-foreground [&>span]:hidden!"

function copy(text: string, what: string) {
  navigator.clipboard?.writeText(text).then(
    () => toast.success(`${what} copied`),
    () => toast.error(`Couldn't copy the ${what.toLowerCase()}`)
  )
}

export function ManagerCell({
  practice,
  onInvite,
}: {
  practice: Practice
  onInvite: () => void
}) {
  const { manager } = practice
  if (!manager) {
    return (
      <Button
        variant="link"
        size="sm"
        className="h-auto px-0"
        onClick={onInvite}
      >
        <IconUserAdd />
        Invite
      </Button>
    )
  }
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="truncate">{managerName(manager)}</span>
      {manager.status === "Invited" && <Badge variant="warning">Invited</Badge>}
    </div>
  )
}

/** Super Admin: every practice on the platform. */
export function PracticesList() {
  const { practices } = usePractices()
  const router = useRouter()
  const searchParams = useSearchParams()
  const actions = usePracticeActions()
  const { openCreate } = actions

  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [managerFilter, setManagerFilter] = React.useState("all")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(15)

  /* "Add practice" in the command palette lands here with ?new=1. */
  React.useEffect(() => {
    if (searchParams.get("new") !== "1") return
    openCreate()
    router.replace("/screens/admin/practices")
  }, [searchParams, openCreate, router])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return practices.filter((p) => {
      if (status !== "all" && p.status !== status) return false
      if (managerFilter === "none" && p.manager) return false
      if (
        managerFilter !== "all" &&
        managerFilter !== "none" &&
        p.manager?.status !== managerFilter
      )
        return false
      if (!q) return true
      return [
        p.id,
        p.name,
        p.npi,
        p.tenant,
        p.locationName,
        p.manager ? managerName(p.manager) : "",
      ].some((field) => field.toLowerCase().includes(q))
    })
  }, [practices, query, status, managerFilter])

  const activeFilters =
    Number(status !== "all") + Number(managerFilter !== "all")

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const rows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )
  const rangeStart =
    filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, filtered.length)

  return (
    <AdminShell active="practices">
      <div className="flex min-h-0 flex-1 flex-col gap-4 bg-surface-sunken px-4 pt-4 pb-4 sm:px-6">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              Practices
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="w-full sm:w-[240px]">
              <InputGroup className="h-8 border-border bg-card">
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
                  placeholder="Search practices..."
                  aria-label="Search practices"
                />
              </InputGroup>
            </div>

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
                    items={STATUS_FILTER}
                    value={status}
                    onValueChange={(value: string | null) => {
                      setStatus(value ?? "all")
                      setPage(1)
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-full rounded-md"
                      aria-label="Status"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {STATUS_FILTER.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Select
                    items={MANAGER_FILTER}
                    value={managerFilter}
                    onValueChange={(value: string | null) => {
                      setManagerFilter(value ?? "all")
                      setPage(1)
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-full rounded-md"
                      aria-label="Clinic manager"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {MANAGER_FILTER.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {activeFilters > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStatus("all")
                        setManagerFilter("all")
                        setPage(1)
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Button size="sm" onClick={openCreate}>
              <IconHospital />
              Add practice
            </Button>
          </div>
        </div>

        <Card className="min-h-0 flex-1 gap-0 rounded-md border border-border py-0 shadow-[0_0_5px_rgb(0_0_0/0.08)] ring-0">
          <div className="min-h-0 flex-1 overflow-auto [&>[data-slot=table-container]]:overflow-visible">
            {rows.length === 0 ? (
              <Empty className="h-full">
                <EmptyHeader>
                  <EmptyMedia>
                    <Illustration
                      name={
                        practices.length === 0
                          ? "practices-empty"
                          : "no-results"
                      }
                    />
                  </EmptyMedia>
                  <EmptyTitle>
                    {practices.length === 0
                      ? "No practices yet"
                      : "No practices match"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {practices.length === 0
                      ? "Add the first practice, then invite its clinic manager."
                      : "Try a different search or clear a filter."}
                  </EmptyDescription>
                </EmptyHeader>
                {practices.length === 0 && (
                  <EmptyContent>
                    <Button size="sm" onClick={openCreate}>
                      <IconHospital />
                      Add practice
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-surface-head [&_th]:h-9 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
                  <TableRow>
                    <TableHead className="hidden md:table-cell">
                      Practice ID
                    </TableHead>
                    <TableHead>Practice</TableHead>
                    <TableHead className="hidden xl:table-cell">
                      Tenant
                    </TableHead>
                    <TableHead className="hidden 2xl:table-cell">
                      Referral URL
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Clinic manager
                    </TableHead>
                    <TableHead className="hidden text-center sm:table-cell">
                      Clinicians
                    </TableHead>
                    <TableHead className="hidden text-center sm:table-cell">
                      Patients
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Created
                    </TableHead>
                    <TableHead className="w-10 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_td]:px-4 [&_td]:py-2.5">
                  {rows.map((practice) => (
                    <TableRow key={practice.id}>
                      <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                        {practice.id}
                      </TableCell>
                      <TableCell className="max-w-[18rem]">
                        {/* The name opens the practice's details page. */}
                        <Button
                          variant="link"
                          className="block h-auto max-w-full truncate p-0 text-left"
                          nativeButton={false}
                          render={
                            <Link
                              href={`/screens/admin/practices/${practice.id}`}
                            />
                          }
                        >
                          {practice.name}
                        </Button>
                        <span className="block truncate text-xs text-muted-foreground">
                          {practice.locationName}
                        </span>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                        {practice.tenant}
                      </TableCell>
                      <TableCell className="hidden max-w-[16rem] 2xl:table-cell">
                        <div className="flex items-center gap-1">
                          <span className="truncate text-muted-foreground">
                            {practice.referralUrl.replace("https://", "")}
                          </span>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  aria-label={`Copy referral URL for ${practice.name}`}
                                  onClick={() =>
                                    copy(practice.referralUrl, "Referral URL")
                                  }
                                />
                              }
                            >
                              <IconCopy />
                            </TooltipTrigger>
                            <TooltipContent>Copy link</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell className="hidden max-w-[14rem] lg:table-cell">
                        <ManagerCell
                          practice={practice}
                          onInvite={() => actions.openInvite(practice)}
                        />
                      </TableCell>
                      <TableCell className="hidden text-center tabular-nums sm:table-cell">
                        {practice.clinicians}
                      </TableCell>
                      <TableCell className="hidden text-center tabular-nums sm:table-cell">
                        {practice.patients}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[practice.status]}>
                          {practice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
                        {formatDate(practice.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${practice.name}`}
                              >
                                <IconMoreVertical />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuGroup>
                              {actions.menuItems(practice)}
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
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

      {actions.dialogs}
    </AdminShell>
  )
}
