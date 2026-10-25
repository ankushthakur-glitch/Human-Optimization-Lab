"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconActivity,
  IconClock,
  IconCopy,
  IconIdCard,
  IconMail,
  IconMore,
  IconSearch,
  IconStethoscope,
  IconUserAdd,
} from "@/design-system/icons"

import { Button, buttonVariants } from "@/design-system/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/design-system/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/design-system/ui/input-group"
import { NativeSelect, NativeSelectOption } from "@/design-system/ui/native-select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/design-system/ui/pagination"
import { Skeleton } from "@/design-system/ui/skeleton"
import { toast } from "@/design-system/ui/sonner"
import { Illustration } from "@/components/illustrations/illustration"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import { fullName, providerName } from "@/components/practice/practice-data"
import { ENROLLMENT } from "@/components/practice/practice-reports-data"
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  DataTable,
  ReBarChart,
  ReDonut,
  ReDonutLegend,
  ReLegend,
  type ReSeries,
  type ReSlice,
  Row as TableRow,
  SegmentedControl,
  Td,
  Th,
  type Tone,
} from "@/components/dashboard-kit-v2"
import {
  CardLink,
  FooterLink,
  StatCard,
  StatCardSkeleton,
} from "@/components/provider/home-v2/overview"
import { VariantFrame } from "@/components/practice/dashboard-variants/frame"
import {
  HREF,
  type PracticeOps,
  daysAgo,
  pct,
  usePracticeOps,
} from "@/components/practice/dashboard-variants/practice-ops"

/* Variation 1, Operations: the clinic manager's admin work read the way a
   help desk reads its tickets, after ReUI's Pulse, drawn only with the
   portal's own components. Five stat cards for what waits on the manager
   (invites, patient invites near the final reminder, possible duplicates,
   licenses running out, quiet patients), a chart row on the patient list,
   then one paged table of every to do with its action. Non-clinical: no
   medical data anywhere. */

const GREY = "#B5B5B5"

const days = (n: number) => `${n} d`
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/* ------------------------------------------------- patient status chart -- */

const STATUS_COLOR = {
  Active: SUBTLE.green,
  Invited: SUBTLE.blue,
  Declined: SUBTLE.orange,
  Inactive: GREY,
} as const

function PatientStatus({ ops }: { ops: PracticeOps }) {
  const [active, setActive] = React.useState<string | undefined>()
  const data: ReSlice[] = (Object.keys(STATUS_COLOR) as (keyof typeof STATUS_COLOR)[]).map((s) => ({
    key: s,
    label: s,
    value: ops.byStatus[s].length,
    color: STATUS_COLOR[s],
    fill: s === "Inactive" ? "stripe" : undefined,
  }))
  const answered = ops.byStatus.Active.length + ops.byStatus.Declined.length + ops.byStatus.Invited.length

  return (
    <Card>
      <CardHeader
        title="Patients by status"
        count={<Badge tone="light">{ops.patients.length}</Badge>}
        actions={<CardLink href={HREF.patients}>Patients</CardLink>}
      />
      <CardBody className="flex flex-1 flex-col items-center gap-4 sm:flex-row">
        <ReDonut
          data={data}
          height={220}
          centerValue={`${pct(ops.byStatus.Active.length, answered)}%`}
          centerLabel="Enrolled"
          active={active}
          onSelect={(k) => setActive((x) => (x === k ? undefined : k))}
          className="sm:w-1/2"
        />
        <ReDonutLegend
          data={data}
          active={active}
          onSelect={(k) => setActive((x) => (x === k ? undefined : k))}
          className="w-full sm:w-1/2"
        />
      </CardBody>
      <CardFooter className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="font-medium">Added by</span>
        <Badge tone="light">{ops.bySource.Manual} by hand</Badge>
        <Badge tone="light">{ops.bySource["Bulk import"]} bulk import</Badge>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------- added per week chart -- */

const WEEK_SERIES: ReSeries[] = [
  { key: "active", label: "Enrolled", color: "var(--primary)", fill: "solid" },
  { key: "waiting", label: "Not enrolled yet", color: SUBTLE.blue, fill: "stripe" },
]

function AddedPerWeek({ ops }: { ops: PracticeOps }) {
  const data = ops.weekly.map((w) => ({ week: w.label, active: w.active, waiting: w.added - w.active }))
  const added = ops.weekly.reduce((s, w) => s + w.added, 0)
  const last = ops.weekly[ops.weekly.length - 1]?.added ?? 0

  return (
    <Card>
      <CardHeader
        title="Patients added, 12 weeks"
        count={<Badge tone="light">{added}</Badge>}
        actions={<Badge tone="primary">{plural(last, "patient")} this week</Badge>}
      />
      <CardBody className="flex flex-1 flex-col gap-3">
        <ReLegend series={WEEK_SERIES} />
        <ReBarChart
          data={data}
          xKey="week"
          series={WEEK_SERIES}
          stacked
          height={220}
          highlight={data.length - 1}
          xTickFormat={(v) => v.replace(/^[A-Za-z]+ /, "")}
          tooltipLabel={(week) => `Week of ${week}`}
          valueFormat={(v) => `${v}`}
        />
      </CardBody>
    </Card>
  )
}

/* ---------------------------------------------- enrollment by provider -- */

const RATE_SERIES: ReSeries[] = [{ key: "rate", label: "Enrollment rate", color: "var(--primary)", fill: "gradient" }]

function EnrollmentByProvider({ ops }: { ops: PracticeOps }) {
  const rows = [...ops.providerRows].sort((a, b) => b.enrollRate - a.enrollRate)
  const data = rows.map((r) => ({ name: r.provider.lastName, rate: r.enrollRate }))
  const low = rows.filter((r) => r.enrollRate < 50)

  return (
    <Card>
      <CardHeader
        title="Enrollment by provider"
        count={<Badge tone="light">{rows.length}</Badge>}
        actions={<CardLink href={HREF.report(ENROLLMENT)}>Report</CardLink>}
      />
      <CardBody className="flex-1">
        <ReBarChart
          data={data}
          xKey="name"
          series={RATE_SERIES}
          layout="vertical"
          height={Math.max(220, data.length * 34)}
          valueFormat={(v) => `${v}%`}
          referenceY={{ value: 50 }}
        />
      </CardBody>
      <CardFooter className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="font-medium">Below half</span>
        {low.length ? (
          low.map((r) => (
            <Badge key={r.provider.id} tone="warning" dot>
              {r.provider.lastName} {r.enrollRate}%
            </Badge>
          ))
        ) : (
          <Badge tone="success" dot>
            None
          </Badge>
        )}
      </CardFooter>
    </Card>
  )
}

/* ------------------------------------------------------- to do table -- */

type Kind = "invite" | "patientInvite" | "duplicate" | "license" | "quiet" | "declined"
type Tab = "all" | "invites" | "duplicates" | "licenses" | "patients"

const KIND: Record<Kind, { label: string; tone: Tone; tab: Exclude<Tab, "all"> }> = {
  invite: { label: "Team invite", tone: "primary", tab: "invites" },
  patientInvite: { label: "Patient invite", tone: "info", tab: "invites" },
  duplicate: { label: "Duplicate", tone: "warning", tab: "duplicates" },
  license: { label: "License", tone: "error", tab: "licenses" },
  quiet: { label: "Quiet", tone: "light", tab: "patients" },
  declined: { label: "Declined", tone: "outline", tab: "patients" },
}

type Priority = "Urgent" | "Moderate" | "Routine"
const PRIORITY_TONE: Record<Priority, Tone> = { Urgent: "error", Moderate: "warning", Routine: "light" }
const RANK: Record<Priority, number> = { Urgent: 0, Moderate: 1, Routine: 2 }

type TodoRow = {
  id: string
  kind: Kind
  title: string
  detail: string
  who: { name: string; id: string; photo?: string }
  location: string
  /** Days the item has waited, or days left for a license. */
  wait: number
  waitText: React.ReactNode
  priority: Priority
  href: string
  /** The one step the row offers in place; links go to `href`. */
  quick: { label: string; done?: string }
}

function buildRows(ops: PracticeOps): TodoRow[] {
  const today = ops.today
  const where = new Map(ops.locations.map((l) => [l.id, l.name]))
  const loc = (id?: string) => (id && where.get(id)) || "No location"

  const team: TodoRow[] = [
    ...ops.invitedProviders.map((p) => ({ person: p, provider: true as const })),
    ...ops.invitedStaff.map((p) => ({ person: p, provider: false as const })),
  ].map(({ person, provider }) => {
    const waited = daysAgo(person.invitedAt, today)
    const name = provider ? providerName(person as (typeof ops.invitedProviders)[number]) : fullName(person)
    return {
      id: `invite-${person.id}`,
      kind: "invite",
      title: provider ? "Provider has not joined" : "Staff member has not joined",
      detail: provider ? "Provider invite" : person.role,
      who: { name, id: person.id, photo: person.photo },
      location: loc(person.locationIds[0]),
      wait: waited,
      waitText: <span className={waited > 7 ? "text-destructive" : undefined}>Waiting {days(waited)}</span>,
      priority: waited > 7 ? "Moderate" : "Routine",
      href: provider ? HREF.provider(person.id) : HREF.staff,
      quick: { label: "Resend", done: "Resent" },
    }
  })

  const invites: TodoRow[] = ops.pendingInvites.map((p) => {
    const waited = daysAgo(p.invitedAt, today)
    const sent = ops.remindersSent(p)
    return {
      id: `pinvite-${p.id}`,
      kind: "patientInvite",
      title: waited >= 21 ? "Final reminder next" : "Invite not answered",
      detail: sent ? `${plural(sent, "reminder")} sent` : "Invite sent",
      who: { name: fullName(p), id: p.id, photo: p.photo },
      location: loc(p.locationId),
      wait: waited,
      waitText: <span className={waited >= 21 ? "text-destructive" : undefined}>Waiting {days(waited)}</span>,
      priority: waited >= 21 ? "Moderate" : "Routine",
      href: HREF.patient(p.id),
      quick: { label: "Resend", done: "Resent" },
    }
  })

  const dups: TodoRow[] = ops.duplicates.map((d) => {
    const waited = daysAgo(d.submittedAt, today)
    return {
      id: `dup-${d.id}`,
      kind: "duplicate",
      title: "Possible duplicate",
      detail: `${d.source === "Bulk import" ? "Bulk import" : "Added by hand"}, sent by ${d.submittedBy}`,
      who: { name: fullName(d.incoming), id: d.matchId, photo: d.incoming.photo },
      location: loc(d.incoming.locationId),
      wait: waited,
      waitText: <span className={waited > 7 ? "text-destructive" : undefined}>Waiting {days(waited)}</span>,
      priority: waited > 7 ? "Urgent" : "Moderate",
      href: HREF.duplicate(d.id),
      quick: { label: "Review" },
    }
  })

  const licenses: TodoRow[] = ops.expiringLicenses.map((l) => ({
    id: `lic-${l.provider.id}-${l.type}-${l.state}`,
    kind: "license",
    title: l.days < 0 ? "License expired" : "License expires soon",
    detail: `${l.type}, ${l.state}`,
    who: { name: providerName(l.provider), id: l.provider.id, photo: l.provider.photo },
    location: loc(l.provider.locationIds[0]),
    wait: -l.days,
    waitText: (
      <span className={l.days < 30 ? "text-destructive" : undefined}>
        {l.days < 0 ? `Expired ${days(-l.days)} ago` : l.days === 0 ? "Expires today" : `In ${days(l.days)}`}
      </span>
    ),
    priority: l.days < 0 ? "Urgent" : l.days < 30 ? "Moderate" : "Routine",
    href: HREF.provider(l.provider.id),
    quick: { label: "Open" },
  }))

  const quiet: TodoRow[] = ops.engagement["Quiet 30+ days"].map((p) => {
    const d = daysAgo(p.lastEngagedAt, today)
    return {
      id: `quiet-${p.id}`,
      kind: "quiet",
      title: "Not using the app",
      detail: "Enrolled, quiet 30+ days",
      who: { name: fullName(p), id: p.id, photo: p.photo },
      location: loc(p.locationId),
      wait: d,
      waitText: <span className="text-muted-foreground">Last seen {days(d)} ago</span>,
      priority: "Routine",
      href: HREF.patient(p.id),
      quick: { label: "Nudge", done: "Nudged" },
    }
  })

  const declined: TodoRow[] = ops.byStatus.Declined.map((p) => {
    const d = daysAgo(p.respondedAt, today)
    return {
      id: `declined-${p.id}`,
      kind: "declined",
      title: "Declined the invite",
      detail: "Still eligible",
      who: { name: fullName(p), id: p.id, photo: p.photo },
      location: loc(p.locationId),
      wait: d,
      waitText: <span className="text-muted-foreground">Declined {days(d)} ago</span>,
      priority: "Routine",
      href: HREF.patient(p.id),
      quick: { label: "Invite again", done: "Invited" },
    }
  })

  return [...dups, ...licenses, ...team, ...invites, ...quiet, ...declined].sort(
    (a, b) => RANK[a.priority] - RANK[b.priority] || b.wait - a.wait
  )
}

function TodoTable({
  rows,
  done,
  onQuick,
}: {
  rows: TodoRow[]
  done: Record<string, string>
  onQuick: (row: TodoRow) => void
}) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [tab, setTab] = React.useState<Tab>("all")
  const [size, setSize] = React.useState(10)
  const [page, setPage] = React.useState(0)

  const q = query.trim().toLowerCase()
  const inTab = (r: TodoRow, t: Tab) => t === "all" || KIND[r.kind].tab === t
  const shown = rows.filter(
    (r) =>
      inTab(r, tab) &&
      (!q || r.title.toLowerCase().includes(q) || r.who.name.toLowerCase().includes(q) || r.who.id.toLowerCase().includes(q))
  )
  const pages = Math.max(1, Math.ceil(shown.length / size))
  const at = Math.min(page, pages - 1)
  const pageRows = shown.slice(at * size, at * size + size)
  const count = (t: Tab) => rows.filter((r) => inTab(r, t)).length
  const go = (p: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    if (p >= 0 && p < pages) setPage(p)
  }
  const urgent = rows.filter((r) => r.priority === "Urgent").length

  return (
    <Card>
      <CardHeader
        title="To do"
        count={<Badge tone="light">{rows.length}</Badge>}
        actions={
          urgent > 0 && (
            <Badge tone="error" dot>
              {urgent} urgent
            </Badge>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <SegmentedControl
          label="To do type"
          value={tab}
          onChange={(t) => {
            setTab(t)
            setPage(0)
          }}
          items={[
            { value: "all", label: "All", count: count("all") },
            { value: "invites", label: "Invites", count: count("invites") },
            { value: "duplicates", label: "Duplicates", count: count("duplicates") },
            { value: "licenses", label: "Licenses", count: count("licenses") },
            { value: "patients", label: "Patients", count: count("patients") },
          ]}
        />
        <InputGroup className="ml-auto h-8 w-full sm:w-64">
          <InputGroupAddon>
            <IconSearch className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search"
            placeholder="Search to dos or people"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
          />
        </InputGroup>
      </div>

      {shown.length === 0 ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyMedia>
              <Illustration name="no-results" />
            </EmptyMedia>
            <EmptyTitle>Nothing to do here</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable minWidth={1000} boxClassName="relative">
          <thead>
            <tr>
              <Th>Item</Th>
              <Th>Person</Th>
              <Th>Location</Th>
              <Th>Waiting</Th>
              <Th>Type</Th>
              <Th>Priority</Th>
              <Th className="w-[160px]">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <TableRow key={r.id} onOpen={() => router.push(r.href)}>
                <Td className="max-w-[260px]">
                  <span className="flex flex-col">
                    <span className="truncate text-sm font-medium">{r.title}</span>
                    <span className="truncate text-[13px] text-muted-foreground">{r.detail}</span>
                  </span>
                </Td>
                <Td>
                  <span className="flex items-center gap-2.5">
                    <Avatar name={r.who.name} photo={r.who.photo} size={30} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{r.who.name}</span>
                      <span className="text-[13px] text-muted-foreground tabular-nums">{r.who.id}</span>
                    </span>
                  </span>
                </Td>
                <Td className="text-sm whitespace-nowrap">{r.location}</Td>
                <Td className="text-sm whitespace-nowrap tabular-nums">{r.waitText}</Td>
                <Td>
                  <Badge tone={KIND[r.kind].tone}>{KIND[r.kind].label}</Badge>
                </Td>
                <Td>
                  <Badge tone={PRIORITY_TONE[r.priority]} dot>
                    {r.priority}
                  </Badge>
                </Td>
                <Td>
                  <span className="flex items-center justify-end gap-1">
                    {done[r.id] ? (
                      <Badge tone="success" dot>
                        {done[r.id]}
                      </Badge>
                    ) : r.quick.done ? (
                      <Button variant="outline" size="xs" onClick={() => onQuick(r)}>
                        {r.quick.label}
                      </Button>
                    ) : (
                      <Link href={r.href} className={buttonVariants({ variant: "outline", size: "xs" })}>
                        {r.quick.label}
                      </Link>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" aria-label="More actions">
                            <IconMore />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => router.push(r.href)}>Open</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void navigator.clipboard?.writeText(r.who.id)}>
                            <IconCopy />
                            Copy ID
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </Td>
              </TableRow>
            ))}
          </tbody>
        </DataTable>
      )}

      <CardFooter className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted-foreground">
        <label className="flex items-center gap-2">
          Rows per page
          <NativeSelect
            size="sm"
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value))
              setPage(0)
            }}
          >
            {[5, 10, 20].map((n) => (
              <NativeSelectOption key={n} value={n}>
                {n}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <span className="tabular-nums">
          {shown.length ? `${at * size + 1} to ${Math.min(shown.length, at * size + size)} of ${shown.length}` : "0 of 0"}
        </span>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" onClick={go(at - 1)} aria-disabled={at === 0} />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive onClick={go(at)}>
                {at + 1}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" onClick={go(at + 1)} aria-disabled={at >= pages - 1} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </CardFooter>
    </Card>
  )
}

/* -------------------------------------------------------------- page -- */

export function PracticeDashboardV1() {
  const ops = usePracticeOps()
  const [done, setDone] = React.useState<Record<string, string>>({})
  const rows = React.useMemo(() => buildRows(ops), [ops])

  function quick(r: TodoRow) {
    if (!r.quick.done) return
    const label = r.quick.done
    setDone((x) => ({ ...x, [r.id]: label }))
    toast.success(label, {
      description: r.who.name,
      action: { label: "Undo", onClick: () =>
          setDone((x) => {
            const rest = { ...x }
            delete rest[r.id]
            return rest
          }),
      },
    })
  }

  const today = ops.today
  const team = ops.invitedProviders.length + ops.invitedStaff.length
  const oldestTeam = Math.max(0, ...[...ops.invitedProviders, ...ops.invitedStaff].map((p) => daysAgo(p.invitedAt, today)))
  const waitBand = (lo: number, hi: number) =>
    ops.pendingInvites.filter((p) => {
      const d = daysAgo(p.invitedAt, today)
      return d >= lo && d <= hi
    }).length
  const oldestDup = Math.max(0, ...ops.duplicates.map((d) => daysAgo(d.submittedAt, today)))
  const expired = ops.expiringLicenses.filter((l) => l.days < 0).length
  const soon = ops.expiringLicenses.filter((l) => l.days >= 0 && l.days < 30).length
  const quiet = ops.engagement["Quiet 30+ days"].length
  const firstLicense = ops.expiringLicenses[0]

  return (
    <VariantFrame>
      <header className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-lg leading-7 font-semibold">Operations</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Link href={HREF.newPatient} className={buttonVariants({ variant: "outline", size: "sm", className: "bg-card" })}>
            <IconUserAdd />
            Add patient
          </Link>
          <Link href={HREF.newProvider} className={buttonVariants({ size: "sm" })}>
            <IconStethoscope />
            Add provider
          </Link>
        </div>
      </header>

      {!ops.ready ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            <Skeleton className="h-[360px] rounded-[7.2px]" />
            <Skeleton className="h-[360px] rounded-[7.2px]" />
            <Skeleton className="h-[360px] rounded-[7.2px]" />
          </div>
          <Skeleton className="h-[480px] rounded-[7.2px]" />
        </>
      ) : (
        <>
          <section aria-label="Admin queue at a glance" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              icon={IconMail}
              label="Team invites"
              when="Waiting"
              value={team}
              meta={team ? <span className={oldestTeam > 7 ? "text-destructive" : undefined}>Oldest waits {days(oldestTeam)}</span> : "Everyone joined"}
              segments={[
                { label: "Providers", value: ops.invitedProviders.length, color: "var(--primary)" },
                { label: "Staff", value: ops.invitedStaff.length, color: SUBTLE.blue },
              ]}
              footer={<FooterLink href={HREF.users}>Open users</FooterLink>}
            />
            <StatCard
              icon={IconClock}
              label="Patient invites"
              when="Open"
              value={ops.nearFinal.length}
              of={ops.pendingInvites.length}
              meta="Near the final reminder"
              segments={[
                { label: "Day 21+", value: waitBand(21, Infinity), color: SUBTLE.orange },
                { label: "Day 8 to 20", value: waitBand(8, 20), color: SUBTLE.blue },
                { label: "First week", value: waitBand(0, 7), color: GREY },
              ]}
              footer={<FooterLink href={HREF.patients}>Open patients</FooterLink>}
            />
            <StatCard
              icon={IconCopy}
              label="Possible duplicates"
              when="To review"
              value={ops.duplicates.length}
              meta={ops.duplicates.length ? <span className={oldestDup > 7 ? "text-destructive" : undefined}>Oldest waits {days(oldestDup)}</span> : "Queue is clear"}
              segments={[
                { label: "By hand", value: ops.duplicates.filter((d) => d.source === "Manual").length, color: SUBTLE.violet },
                { label: "Bulk import", value: ops.duplicates.filter((d) => d.source === "Bulk import").length, color: SUBTLE.orange },
              ]}
              footer={
                <FooterLink href={ops.duplicates[0] ? HREF.duplicate(ops.duplicates[0].id) : HREF.duplicates}>
                  {ops.duplicates[0] ? "Review the oldest" : "Open the queue"}
                </FooterLink>
              }
            />
            <StatCard
              icon={IconIdCard}
              label="Licenses"
              when="Next 90 days"
              value={ops.expiringLicenses.length}
              meta={expired ? <span className="text-destructive">{plural(expired, "license")} expired</span> : `${soon} within 30 days`}
              segments={[
                { label: "Expired", value: expired, color: SUBTLE.red },
                { label: "Within 30 d", value: soon, color: SUBTLE.orange },
                { label: "31 to 90 d", value: ops.expiringLicenses.length - expired - soon, color: SUBTLE.blue },
              ]}
              footer={
                <FooterLink href={firstLicense ? HREF.provider(firstLicense.provider.id) : HREF.users}>
                  {firstLicense ? `Open ${firstLicense.provider.lastName}` : "Open users"}
                </FooterLink>
              }
            />
            <StatCard
              icon={IconActivity}
              label="Quiet patients"
              when="30+ days"
              value={quiet}
              of={ops.byStatus.Active.length}
              meta={`${pct(ops.engagement["This week"].length, ops.byStatus.Active.length)}% used the app this week`}
              segments={[
                { label: "This week", value: ops.engagement["This week"].length, color: SUBTLE.green },
                { label: "This month", value: ops.engagement["This month"].length, color: SUBTLE.blue },
                { label: "Quiet", value: quiet, color: SUBTLE.orange },
              ]}
              footer={<FooterLink href={HREF.patients}>Open patients</FooterLink>}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            <PatientStatus ops={ops} />
            <AddedPerWeek ops={ops} />
            <div className="grid lg:col-span-2 2xl:col-span-1">
              <EnrollmentByProvider ops={ops} />
            </div>
          </div>

          <TodoTable rows={rows} done={done} onQuick={quick} />
        </>
      )}
    </VariantFrame>
  )
}
