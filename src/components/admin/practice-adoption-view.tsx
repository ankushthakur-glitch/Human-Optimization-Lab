"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { IconArrowDown, IconArrowUp, IconWarning } from "@/design-system/icons"

import { cn } from "@/lib/utils"
import type {
  Adoption,
  AdoptionUser,
  ProviderAdoption,
} from "@/components/admin/practice-adoption"
import { formatDate } from "@/components/admin/practices-store"
import {
  avatarTone,
  initials,
  NAME_LINK,
  StatusBadge,
  SUB_TAB,
  SUB_TABS_LIST,
} from "@/components/practice/directory"
import { Avatar, AvatarFallback, AvatarImage } from "@/design-system/ui/avatar"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import { Card } from "@/design-system/ui/card"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/design-system/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"
import { TablePager, usePaged } from "@/components/table-pager"
import {
  Illustration,
  type IllustrationName,
} from "@/components/illustrations/illustration"

export const pct = (rate: number | null) =>
  rate === null ? "" : `${Math.round(rate * 100)}%`

/* -------------------------------------------------------------------------- */
/*  Stat tiles                                                                 */
/* -------------------------------------------------------------------------- */

/* A single meter, not a chart: the filled share of one total. */
export function Meter({
  value,
  tone = "primary",
}: {
  value: number
  tone?: "primary" | "warning"
}) {
  return (
    <div
      aria-hidden
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className={cn(
          "h-full rounded-full",
          tone === "warning" ? "bg-warning" : "bg-primary"
        )}
        style={{
          width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`,
        }}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Tabs                                                                       */
/* -------------------------------------------------------------------------- */

export const HEAD =
  "sticky top-0 z-10 bg-surface-head [&_th]:h-9 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground"

export type PracticeTab = "details" | "providers" | "users"

export function parsePracticeTab(value: string | undefined): PracticeTab {
  return value === "providers" || value === "users" ? value : "details"
}

/* The practice's profile first, then its providers and users. The tab lives
   in the URL (?tab=providers) so coming back from a provider's page lands on
   the same tab. */
export function AdoptionTabs({
  practiceId,
  adoption,
  details,
  initialTab,
}: {
  practiceId: string
  adoption: Adoption
  details: React.ReactNode
  initialTab: PracticeTab
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [tab, setTab] = React.useState<PracticeTab>(initialTab)
  const change = (next: PracticeTab) => {
    setTab(next)
    router.replace(next === "details" ? pathname : `${pathname}?tab=${next}`, {
      scroll: false,
    })
  }
  return (
    <Tabs
      value={tab}
      onValueChange={(v) => change(parsePracticeTab(String(v)))}
      className="min-h-0 flex-1 gap-3"
    >
      <TabsList className={SUB_TABS_LIST}>
        <TabsTrigger value="details" className={SUB_TAB}>
          Practice details
        </TabsTrigger>
        <TabsTrigger value="providers" className={SUB_TAB}>
          Providers ({adoption.providers.length})
        </TabsTrigger>
        <TabsTrigger value="users" className={SUB_TAB}>
          Users ({adoption.users.length})
        </TabsTrigger>
      </TabsList>
      {tab === "details" && details}
      {tab === "providers" && (
        <ProvidersTable practiceId={practiceId} adoption={adoption} />
      )}
      {tab === "users" && <UsersTable users={adoption.users} />}
    </Tabs>
  )
}

/* Tables fill the rest of the page: the rows scroll inside the card under a
   sticky header, and the pager stays pinned to the bottom. */
export function TableCard({
  children,
  pager,
}: {
  children: React.ReactNode
  pager?: React.ReactNode
}) {
  return (
    <Card className="min-h-80 flex-1 gap-0 overflow-hidden rounded-md border border-border py-0 shadow-[0_0_5px_rgb(0_0_0/0.08)] ring-0">
      <div className="min-h-0 flex-1 overflow-auto [&>[data-slot=table-container]]:overflow-visible">
        {children}
      </div>
      {pager}
    </Card>
  )
}

export function NothingYet({
  title,
  illustration,
}: {
  title: string
  illustration: IllustrationName
}) {
  return (
    <TableCard>
      <Empty className="h-full py-12">
        <EmptyHeader>
          <EmptyMedia>
            <Illustration name={illustration} />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    </TableCard>
  )
}

/* -------------------------------------------------------------------------- */
/*  Enrollment by provider                                                     */
/* -------------------------------------------------------------------------- */

type SortKey = "rate" | "name" | "open"

/* Lowest rate first by default, so the providers HOL should follow up with
   are at the top. Providers with no open patients sort last. */
function sortProviders(list: ProviderAdoption[], key: SortKey, asc: boolean) {
  const dir = asc ? 1 : -1
  return [...list].sort((a, b) => {
    if (key === "name") return dir * a.name.localeCompare(b.name)
    if (key === "open")
      return dir * (a.open - b.open) || a.name.localeCompare(b.name)
    if (a.rate === null || b.rate === null) {
      return a.rate === b.rate
        ? a.name.localeCompare(b.name)
        : a.rate === null
          ? 1
          : -1
    }
    return dir * (a.rate - b.rate) || b.open - a.open
  })
}

function SortHead({
  label,
  column,
  sort,
  onSort,
  className,
}: {
  label: string
  column: SortKey
  sort: { key: SortKey; asc: boolean }
  onSort: (key: SortKey) => void
  className?: string
}) {
  const active = sort.key === column
  return (
    <TableHead
      className={className}
      aria-sort={active ? (sort.asc ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
          active && "text-foreground"
        )}
      >
        {label}
        {active &&
          (sort.asc ? (
            <IconArrowUp className="size-3" />
          ) : (
            <IconArrowDown className="size-3" />
          ))}
      </button>
    </TableHead>
  )
}

function ProvidersTable({
  practiceId,
  adoption,
}: {
  practiceId: string
  adoption: Adoption
}) {
  const [sort, setSort] = React.useState<{ key: SortKey; asc: boolean }>({
    key: "rate",
    asc: true,
  })

  const rows = sortProviders(adoption.providers, sort.key, sort.asc)
  const paged = usePaged(rows)

  if (adoption.providers.length === 0) {
    return (
      <NothingYet title="No providers yet" illustration="providers-empty" />
    )
  }
  const onSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, asc: !s.asc } : { key, asc: key !== "open" }
    )

  return (
    <TableCard pager={<TablePager paged={paged} />}>
      <Table>
        <TableHeader className={HEAD}>
          <TableRow>
            <SortHead
              label="Provider"
              column="name"
              sort={sort}
              onSort={onSort}
            />
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <SortHead
              label="Patients"
              column="open"
              sort={sort}
              onSort={onSort}
              className="text-center"
            />
            <TableHead className="text-center">Enrolled</TableHead>
            <TableHead className="hidden text-center sm:table-cell">
              Invited
            </TableHead>
            <TableHead className="hidden text-center sm:table-cell">
              Not invited
            </TableHead>
            <SortHead
              label="Enrollment rate"
              column="rate"
              sort={sort}
              onSort={onSort}
              className="w-56"
            />
          </TableRow>
        </TableHeader>
        <TableBody className="[&_td]:px-4 [&_td]:py-2">
          {paged.visible.map((p) => (
            <TableRow
              key={p.id}
              className={cn(p.behind && "bg-warning-surface/40")}
            >
              <TableCell className="max-w-[18rem]">
                <div className="flex min-w-0 items-center gap-2">
                  <PersonAvatar name={p.name} photo={p.photo} />
                  <Button
                    variant="link"
                    className={NAME_LINK}
                    nativeButton={false}
                    render={
                      <Link
                        href={`/screens/admin/practices/${practiceId}/providers/${p.id}`}
                      />
                    }
                  >
                    {p.name}
                  </Button>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <StatusBadge status={p.status} />
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {p.open}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {p.enrolled}
              </TableCell>
              <TableCell className="hidden text-center tabular-nums sm:table-cell">
                {p.invited}
              </TableCell>
              <TableCell className="hidden text-center tabular-nums sm:table-cell">
                {p.notInvited}
              </TableCell>
              <TableCell>
                <RateCell rate={p.rate} behind={p.behind} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  )
}

export function RateCell({
  rate,
  behind,
}: {
  rate: number | null
  behind: boolean
}) {
  if (rate === null) {
    return <span className="text-muted-foreground">No patients</span>
  }
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0">
        <Meter value={rate} tone={behind ? "warning" : "primary"} />
      </div>
      <span className="w-9 text-right tabular-nums">{pct(rate)}</span>
      {behind && <BehindBadge />}
    </div>
  )
}

export function BehindBadge() {
  return (
    <Badge variant="warning">
      <IconWarning data-icon="inline-start" />
      Behind
    </Badge>
  )
}

/* -------------------------------------------------------------------------- */
/*  Users                                                                      */
/* -------------------------------------------------------------------------- */

export function PersonAvatar({ name, photo }: { name: string; photo: string }) {
  return (
    <Avatar className="size-7 shrink-0">
      {photo && <AvatarImage src={photo} alt="" />}
      <AvatarFallback className={cn("text-xs font-medium", avatarTone(name))}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

const USER_ORDER = ["Active", "Invited", "Not invited", "Inactive"]

function UsersTable({ users }: { users: AdoptionUser[] }) {
  /* The clinic manager first, then staff, then providers; signed in first. */
  const roleRank = (u: AdoptionUser) =>
    u.role === "Clinic manager" ? 0 : /provider/i.test(u.role) ? 2 : 1
  const rows = [...users].sort(
    (a, b) =>
      roleRank(a) - roleRank(b) ||
      USER_ORDER.indexOf(a.status) - USER_ORDER.indexOf(b.status) ||
      a.name.localeCompare(b.name)
  )
  const paged = usePaged(rows)

  if (users.length === 0)
    return <NothingYet title="No users yet" illustration="users-empty" />

  return (
    <TableCard pager={<TablePager paged={paged} />}>
      <Table>
        <TableHeader className={HEAD}>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Last active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_td]:px-4 [&_td]:py-2">
          {paged.visible.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="max-w-[18rem]">
                <div className="flex min-w-0 items-center gap-2">
                  <PersonAvatar name={u.name} photo={u.photo} />
                  <span className="truncate">{u.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{u.role}</TableCell>
              <TableCell>
                <StatusBadge status={u.status} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                {u.lastActive ? formatDate(u.lastActive) : "Never"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  )
}
