"use client"

import * as React from "react"
import Link from "next/link"
import { IconArrowLeft, IconSearch } from "@/design-system/icons"

import { AdminShell } from "@/components/admin/admin-shell"
import {
  type AdoptionPatient,
  type ProviderAdoption,
  usePracticeAdoption,
} from "@/components/admin/practice-adoption"
import {
  BehindBadge,
  HEAD,
  NothingYet,
  PersonAvatar,
  TableCard,
} from "@/components/admin/practice-adoption-view"
import { KpiGrid, providerKpis } from "@/components/admin/adoption-kpis"
import {
  type Practice,
  formatDate,
  usePractices,
} from "@/components/admin/practices-store"
import {
  ID_CELL,
  StatusBadge,
  SUB_TAB,
  SUB_TABS_LIST,
} from "@/components/practice/directory"
import { REACTIVATABLE } from "@/components/practice/practice-data"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/design-system/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/design-system/ui/input-group"
import { Skeleton } from "@/design-system/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableSortHead,
  useTableSort,
  TableRow,
} from "@/design-system/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"
import { TablePager, usePaged } from "@/components/table-pager"
import { Illustration } from "@/components/illustrations/illustration"

/* One provider at one practice, as the HOL admin sees it: how many of their
   patients have enrolled, against the practice as a whole, and every patient
   assigned to them. */

export function ProviderAdoptionScreen({
  practiceId,
  providerId,
}: {
  practiceId: string
  providerId: string
}) {
  const { practices, ready } = usePractices()
  const practice = practices.find((p) => p.id === practiceId)

  return (
    <AdminShell active="practices">
      {practice ? (
        <ProviderBody practice={practice} providerId={providerId} />
      ) : !ready ? (
        <Loading />
      ) : (
        <NotFound practiceId={practiceId} title="Practice not found" />
      )}
    </AdminShell>
  )
}

function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-8 w-80" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function NotFound({
  practiceId,
  title,
}: {
  practiceId: string
  title: string
}) {
  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia>
          <Illustration name="record-not-found" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <Link
              href={`/screens/admin/practices/${practiceId}?tab=providers`}
            />
          }
        >
          <IconArrowLeft />
          Back to practice
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function ProviderBody({
  practice,
  providerId,
}: {
  practice: Practice
  providerId: string
}) {
  const adoption = usePracticeAdoption(practice)
  const provider = adoption.providers.find((p) => p.id === providerId)
  if (!provider) {
    return <NotFound practiceId={practice.id} title="Provider not found" />
  }

  const back = `/screens/admin/practices/${practice.id}?tab=providers`

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-surface-sunken px-4 pt-4 pb-6 sm:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Back to ${practice.name}`}
          nativeButton={false}
          render={<Link href={back} />}
        >
          <IconArrowLeft />
        </Button>
        <PersonAvatar name={provider.name} photo={provider.photo} />
        <h1 className="truncate font-heading text-lg font-semibold tracking-tight">
          {provider.name}
        </h1>
        <Badge
          variant="outline"
          render={<Link href={`/screens/admin/practices/${practice.id}`} />}
        >
          {practice.name}
        </Badge>
        <StatusBadge status={provider.status} />
        {provider.behind && <BehindBadge />}
      </div>

      <KpiGrid kpis={providerKpis(adoption, provider.id)} />

      <PatientsTable provider={provider} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Patients                                                                   */
/* -------------------------------------------------------------------------- */

type Segment = "all" | "enrolled" | "pending" | "declined" | "closed"

const SEGMENTS: {
  id: Segment
  label: string
  test: (p: AdoptionPatient) => boolean
}[] = [
  { id: "all", label: "All", test: () => true },
  { id: "enrolled", label: "Enrolled", test: (p) => p.status === "Active" },
  /* Pending is the Invited status: invited, no answer yet. */
  { id: "pending", label: "Pending", test: (p) => p.status === "Invited" },
  { id: "declined", label: "Declined", test: (p) => p.status === "Declined" },
  {
    id: "closed",
    label: "Closed",
    test: (p) => REACTIVATABLE.includes(p.status),
  },
]

const STATUS_ORDER = ["Active", "Invited", "Declined"]

/* Whole days since an ISO date, for how long an invite has gone unanswered. */
function daysSince(iso: string) {
  const days = Math.floor(
    (Date.now() - Date.parse(`${iso}T00:00:00Z`)) / 86_400_000
  )
  return Math.max(0, days)
}

const waitingLabel = (days: number) =>
  days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`

function PatientsTable({ provider }: { provider: ProviderAdoption }) {
  const [segment, setSegment] = React.useState<Segment>("all")
  const [query, setQuery] = React.useState("")

  const rank = (s: string) => {
    const i = STATUS_ORDER.indexOf(s)
    return i === -1 ? STATUS_ORDER.length : i
  }
  const test = SEGMENTS.find((s) => s.id === segment)!.test
  const q = query.trim().toLowerCase()
  const rows = provider.patients
    .filter(test)
    .filter(
      (p) =>
        !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    )
    .sort((a, b) =>
      segment === "pending"
        ? a.invitedAt.localeCompare(b.invitedAt) || a.name.localeCompare(b.name)
        : rank(a.status) - rank(b.status) || a.name.localeCompare(b.name)
    )
  const sorting = useTableSort(rows, {
    id: (p) => p.id,
    name: (p) => p.name,
    status: (p) => rank(p.status),
    invited: (p) => p.invitedAt,
    waiting: (p) => (p.invitedAt ? daysSince(p.invitedAt) : ""),
    declined: (p) => p.respondedAt,
  })
  const paged = usePaged(sorting.rows)

  if (provider.patients.length === 0) {
    return (
      <NothingYet
        title="No patients assigned yet"
        illustration="patients-empty"
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={segment}
          onValueChange={(v) => {
            setSegment(v as Segment)
            paged.setPage(1)
          }}
        >
          <TabsList className={SUB_TABS_LIST}>
            {SEGMENTS.map((s) => (
              <TabsTrigger key={s.id} value={s.id} className={SUB_TAB}>
                {s.label} ({provider.patients.filter(s.test).length})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <InputGroup className="h-8 w-full border-border bg-card sm:w-64">
          <InputGroupAddon>
            <IconSearch />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search patients"
            aria-label="Search patients"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              paged.setPage(1)
            }}
          />
        </InputGroup>
      </div>

      {rows.length === 0 ? (
        <NothingYet title="No patients match" illustration="no-results" />
      ) : (
        <TableCard pager={<TablePager paged={paged} />}>
          <Table>
            <TableHeader className={HEAD}>
              <TableRow>
                <TableSortHead
                  className="hidden md:table-cell"
                  {...sorting.headProps("id")}
                >
                  Patient ID
                </TableSortHead>
                <TableSortHead {...sorting.headProps("name")}>
                  Patient
                </TableSortHead>
                <TableSortHead {...sorting.headProps("status")}>
                  Status
                </TableSortHead>
                <TableSortHead
                  className="hidden sm:table-cell"
                  {...sorting.headProps("invited")}
                >
                  Invited
                </TableSortHead>
                {segment === "pending" && (
                  <TableSortHead {...sorting.headProps("waiting")}>
                    Waiting
                  </TableSortHead>
                )}
                {segment === "declined" && (
                  <TableSortHead {...sorting.headProps("declined")}>
                    Declined
                  </TableSortHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="[&_td]:px-4 [&_td]:py-2">
              {paged.visible.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className={ID_CELL}>{p.id}</TableCell>
                  <TableCell className="max-w-[18rem]">
                    <div className="flex min-w-0 items-center gap-2">
                      <PersonAvatar name={p.name} photo="" />
                      <span className="truncate">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                    {p.invitedAt ? formatDate(p.invitedAt) : "Not yet"}
                  </TableCell>
                  {segment === "pending" && (
                    <TableCell className="tabular-nums">
                      {p.invitedAt ? waitingLabel(daysSince(p.invitedAt)) : ""}
                    </TableCell>
                  )}
                  {segment === "declined" && (
                    <TableCell className="text-muted-foreground tabular-nums">
                      {p.respondedAt ? formatDate(p.respondedAt) : ""}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
    </div>
  )
}
