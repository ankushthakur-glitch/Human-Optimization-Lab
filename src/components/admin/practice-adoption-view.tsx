"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

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
  TableHeader,
  TableRow,
  TableSortHead,
  useTableSort,
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

/* Lowest rate first, so the providers HOL should follow up with are at the
   top. Providers with no open patients sort last. A header click sorts on
   top of this, and a third click comes back to it. */
function byRate(a: ProviderAdoption, b: ProviderAdoption) {
  if (a.rate === null || b.rate === null) {
    return a.rate === b.rate
      ? a.name.localeCompare(b.name)
      : a.rate === null
        ? 1
        : -1
  }
  return a.rate - b.rate || b.open - a.open
}

function ProvidersTable({
  practiceId,
  adoption,
}: {
  practiceId: string
  adoption: Adoption
}) {
  const sorting = useTableSort([...adoption.providers].sort(byRate), {
    name: (p) => p.name,
    status: (p) => p.status,
    open: (p) => p.open,
    enrolled: (p) => p.enrolled,
    invited: (p) => p.invited,
    declined: (p) => p.declined,
    rate: (p) => p.rate,
  })
  const paged = usePaged(sorting.rows)

  if (adoption.providers.length === 0) {
    return (
      <NothingYet title="No providers yet" illustration="providers-empty" />
    )
  }

  return (
    <TableCard pager={<TablePager paged={paged} />}>
      <Table>
        <TableHeader className={HEAD}>
          <TableRow>
            <TableSortHead {...sorting.headProps("name")}>
              Provider
            </TableSortHead>
            <TableSortHead
              className="hidden md:table-cell"
              {...sorting.headProps("status")}
            >
              Status
            </TableSortHead>
            <TableSortHead
              className="text-center"
              {...sorting.headProps("open")}
            >
              Patients
            </TableSortHead>
            <TableSortHead
              className="text-center"
              {...sorting.headProps("enrolled")}
            >
              Enrolled
            </TableSortHead>
            <TableSortHead
              className="hidden text-center sm:table-cell"
              {...sorting.headProps("invited")}
            >
              Pending
            </TableSortHead>
            <TableSortHead
              className="hidden text-center sm:table-cell"
              {...sorting.headProps("declined")}
            >
              Declined
            </TableSortHead>
            <TableSortHead className="w-56" {...sorting.headProps("rate")}>
              Enrollment rate
            </TableSortHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_td]:px-4 [&_td]:py-2">
          {paged.visible.map((p) => (
            <TableRow key={p.id}>
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
                {p.declined}
              </TableCell>
              <TableCell>
                <RateCell rate={p.rate} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  )
}

export function RateCell({ rate }: { rate: number | null }) {
  if (rate === null) {
    return <span className="text-muted-foreground">No patients</span>
  }
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0">
        <Meter value={rate} tone="primary" />
      </div>
      <span className="w-9 text-right tabular-nums">{pct(rate)}</span>
    </div>
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
  const sorting = useTableSort(rows, {
    name: (u) => u.name,
    role: (u) => u.role,
    status: (u) => u.status,
    active: (u) => u.lastActive,
  })
  const paged = usePaged(sorting.rows)

  if (users.length === 0)
    return <NothingYet title="No users yet" illustration="users-empty" />

  return (
    <TableCard pager={<TablePager paged={paged} />}>
      <Table>
        <TableHeader className={HEAD}>
          <TableRow>
            <TableSortHead {...sorting.headProps("name")}>Name</TableSortHead>
            <TableSortHead {...sorting.headProps("role")}>Role</TableSortHead>
            <TableSortHead {...sorting.headProps("status")}>
              Status
            </TableSortHead>
            <TableSortHead
              className="hidden sm:table-cell"
              {...sorting.headProps("active")}
            >
              Last active
            </TableSortHead>
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
