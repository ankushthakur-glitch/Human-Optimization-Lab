"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconFileCheck,
  IconLogout,
  IconMail,
  IconStethoscope,
  IconUserAdd,
  IconUsersGroup,
} from "@/design-system/icons"

import { Button, buttonVariants } from "@/design-system/ui/button"
import { Empty, EmptyHeader, EmptyTitle } from "@/design-system/ui/empty"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/design-system/ui/item"
import { toast } from "@/design-system/ui/sonner"
import {
  type Provider,
  type StaffUser,
  USER_ROLES,
  fullName,
  providerName,
} from "@/components/practice/practice-data"
import { ALERTS, ENCOUNTERS } from "@/components/practice/practice-reports-data"
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  DataTable,
  ReBarChart,
  ReDonut,
  ReDonutLegend,
  type ReSlice,
  Row,
  SegmentedControl,
  Td,
  Th,
  type Tone,
} from "@/components/dashboard-kit-v2"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import {
  CardLink,
  FooterLink,
  type Segment,
  SegmentBar,
  StatCard,
  StatCardSkeleton,
} from "@/components/provider/home-v2/overview"
import { VariantFrame } from "@/components/practice/dashboard-variants/frame"
import {
  HREF,
  type PeriodKind,
  type PracticeOps,
  type ProviderRow,
  type ReportTotals,
  daysAgo,
  daysUntil,
  pct,
  shortDay,
  usePracticeOps,
  useReportTotals,
} from "@/components/practice/dashboard-variants/practice-ops"

/* Variation 4, "Team": the clinic manager's people, laid out after ReUI's
   Roster HR dashboard and drawn with the build's own components. Four stat
   cards (providers, staff, invites waiting, licence renewals), the provider
   roster with each panel's enrollment and the period's report numbers,
   panels compared side by side beside staff by role, then the admin lists:
   invites waiting, license renewals and providers who left. Aggregates
   only: the clinic manager sees no medical data. */

const GREY = "#B5B5B5"

const ROLE_COLOR: Record<string, string> = {
  "Front desk": SUBTLE.blue,
  Nurse: SUBTLE.violet,
  "Care coordinator": SUBTLE.green,
  "Medical assistant": SUBTLE.orange,
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** "Today", "Yesterday" or "5 days ago" for a last login. */
function lastSeen(iso: string, today: string) {
  if (!iso) return "Never"
  const d = daysAgo(iso, today)
  return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`
}

const shortName = (p: Provider) => `${p.firstName[0]}. ${p.lastName}`

/* ------------------------------------------------------- licences -- */

type Renewal = {
  provider: Provider
  type: string
  state: string
  expiry: string
  days: number
}

/** Every licence on a current provider, soonest renewal first. */
function renewalsOf(ops: PracticeOps): Renewal[] {
  return ops.providers
    .filter((p) => p.status !== "Inactive")
    .flatMap((provider) =>
      provider.licenses
        .filter((l) => l.expiry)
        .map((l) => ({ provider, type: l.type || "License", state: l.state, expiry: l.expiry, days: daysUntil(l.expiry, ops.today) }))
    )
    .sort((a, b) => a.days - b.days)
}

function renewalTone(days: number): { tone: Tone; label: string } {
  if (days < 0) return { tone: "error", label: "Expired" }
  if (days <= 90) return { tone: "warning", label: "Within 90 days" }
  if (days <= 365) return { tone: "info", label: "Within 12 months" }
  return { tone: "light", label: "Later" }
}

/* ---------------------------------------------------------- screen -- */

export function PracticeDashboardV4() {
  const ops = usePracticeOps()
  const [kind, setKind] = React.useState<PeriodKind>("Month")
  const totals = useReportTotals(kind)

  return (
    <VariantFrame>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg leading-7 font-semibold">Team</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Link href={HREF.staff} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <IconUsersGroup />
            Non-clinical users
          </Link>
          <Link href={HREF.newProvider} className={buttonVariants({ size: "sm" })}>
            <IconUserAdd />
            Add provider
          </Link>
        </div>
      </header>

      {ops.ready ? <TeamStats ops={ops} /> : <StatsSkeleton />}

      <Roster ops={ops} totals={totals} kind={kind} onKind={setKind} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <PanelCompare rows={ops.providerRows} />
        <StaffByRole ops={ops} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <InvitesWaiting ops={ops} />
        <LicenceRenewals ops={ops} />
        <Departures ops={ops} />
      </div>
    </VariantFrame>
  )
}

function StatsSkeleton() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </section>
  )
}

/* ------------------------------------------------------ stat cards -- */

function TeamStats({ ops }: { ops: PracticeOps }) {
  const staff = ops.staff.filter((s) => s.status !== "Inactive" && USER_ROLES.includes(s.role))
  const renewals = renewalsOf(ops)
  const soon = renewals.filter((r) => r.days <= 90).length
  const year = renewals.filter((r) => r.days > 90 && r.days <= 365).length
  const waiting = ops.invitedProviders.length + ops.invitedStaff.length
  const oldest = [...ops.invitedProviders, ...ops.invitedStaff].reduce((m, p) => Math.max(m, daysAgo(p.invitedAt, ops.today)), 0)

  return (
    <section aria-label="Team at a glance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={IconStethoscope}
        label="Providers"
        when="Now"
        value={ops.activeProviders.length}
        of={ops.providers.length}
        meta={`${ops.providerRows.reduce((s, r) => s + r.patients.length, 0)} patients across ${plural(ops.activeLocations.length, "location")}`}
        segments={[
          { label: "Active", value: ops.activeProviders.length, color: SUBTLE.green },
          { label: "Invited", value: ops.invitedProviders.length, color: SUBTLE.blue },
          { label: "Left", value: ops.departed.length, color: GREY },
        ]}
        footer={<FooterLink href={HREF.users}>Providers</FooterLink>}
      />
      <StatCard
        icon={IconUsersGroup}
        label="Staff"
        when="Now"
        value={staff.length}
        meta={`${staff.filter((s) => s.status === "Active").length} signed in, ${staff.filter((s) => s.status === "Invited").length} still invited`}
        segments={USER_ROLES.map((role) => ({
          label: role,
          value: staff.filter((s) => s.role === role).length,
          color: ROLE_COLOR[role] ?? GREY,
        }))}
        footer={<FooterLink href={HREF.staff}>Non-clinical users</FooterLink>}
      />
      <StatCard
        icon={IconMail}
        label="Invites waiting"
        when="Now"
        value={waiting}
        meta={waiting ? `Oldest sent ${plural(oldest, "day")} ago` : "Everyone has joined"}
        segments={[
          { label: "Providers", value: ops.invitedProviders.length, color: SUBTLE.violet },
          { label: "Staff", value: ops.invitedStaff.length, color: SUBTLE.blue },
        ]}
        footer={<FooterLink href={HREF.users}>Users</FooterLink>}
      />
      <StatCard
        icon={IconFileCheck}
        label="License renewals"
        when="Next 12 months"
        value={soon + year}
        of={renewals.length}
        meta={soon ? `${soon} due within 90 days` : "None due within 90 days"}
        segments={[
          { label: "Within 90 days", value: soon, color: SUBTLE.orange },
          { label: "Within 12 months", value: year, color: SUBTLE.blue },
          { label: "Later", value: renewals.length - soon - year, color: GREY },
        ]}
        footer={<FooterLink href={HREF.users}>Provider records</FooterLink>}
      />
    </section>
  )
}

/* ---------------------------------------------------------- roster -- */

type Sort = "panel" | "enrollment" | "quiet"

function patientSegments(r: ProviderRow): Segment[] {
  return [
    { label: "Active", value: r.active, color: SUBTLE.green },
    { label: "Invited", value: r.invited, color: SUBTLE.blue },
    { label: "Declined", value: r.declined, color: SUBTLE.red },
  ]
}

function Roster({
  ops,
  totals,
  kind,
  onKind,
}: {
  ops: PracticeOps
  totals: ReportTotals
  kind: PeriodKind
  onKind: (k: PeriodKind) => void
}) {
  const router = useRouter()
  const [sort, setSort] = React.useState<Sort>("panel")
  const locationName = React.useMemo(() => new Map(ops.locations.map((l) => [l.id, l.name])), [ops.locations])

  const rows = [...ops.providerRows].sort((a, b) =>
    sort === "panel" ? b.patients.length - a.patients.length : sort === "enrollment" ? b.enrollRate - a.enrollRate : b.quiet - a.quiet
  )

  return (
    <Card>
      <CardHeader
        title="Provider roster"
        count={<Badge>{rows.length}</Badge>}
        actions={
          <>
            <SegmentedControl
              label="Sort by"
              value={sort}
              onChange={setSort}
              items={[
                { value: "panel", label: "Panel" },
                { value: "enrollment", label: "Enrollment" },
                { value: "quiet", label: "Quiet" },
              ]}
            />
            <SegmentedControl
              label="Period"
              value={kind}
              onChange={onKind}
              items={[
                { value: "Month", label: "Month" },
                { value: "Quarter", label: "Quarter" },
                { value: "Year", label: "Year" },
              ]}
            />
          </>
        }
      />
      <DataTable minWidth={1040}>
        <thead>
          <tr>
            <Th>Provider</Th>
            <Th>Locations</Th>
            <Th className="text-right">Panel</Th>
            <Th className="w-48">Patients</Th>
            <Th className="text-right">Enrolled</Th>
            <Th className="text-right">Quiet 30+ days</Th>
            <Th className="text-right">Encounters per patient</Th>
            <Th className="text-right">Alert acknowledged in</Th>
            <Th>Last login</Th>
          </tr>
        </thead>
        <tbody>
          {!ops.ready
            ? null
            : rows.map((r) => {
                const p = r.provider
                const enc = totals.forProvider(ENCOUNTERS, p.id)
                const alerts = totals.forProvider(ALERTS, p.id)
                const perPatient = enc.active ? enc.total / enc.active : 0
                const hours = alerts.acknowledged ? alerts.hours / alerts.acknowledged : 0
                return (
                  <Row key={p.id} onOpen={() => router.push(HREF.provider(p.id))}>
                    <Td>
                      <Link href={HREF.provider(p.id)} className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={fullName(p)} photo={p.photo} size={36} />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-foreground">{providerName(p)}</span>
                          <span className="truncate text-xs text-muted-foreground">{p.specialty}</span>
                        </span>
                      </Link>
                    </Td>
                    <Td className="text-muted-foreground">
                      {p.locationIds.map((id) => locationName.get(id)).filter(Boolean).join(", ")}
                    </Td>
                    <Td className="text-right font-semibold tabular-nums">{r.patients.length}</Td>
                    <Td>
                      <SegmentBar
                        segments={patientSegments(r)}
                        label={`${r.active} active, ${r.invited} invited, ${r.declined} declined`}
                      />
                      <span className="mt-1 block text-xs text-muted-foreground tabular-nums">
                        {r.active} active, {r.invited} invited, {r.declined} declined
                      </span>
                    </Td>
                    <Td className="text-right tabular-nums">{r.enrollRate}%</Td>
                    <Td className="text-right tabular-nums">
                      {r.quiet ? <Badge tone="warning">{r.quiet}</Badge> : <span className="text-muted-foreground">0</span>}
                    </Td>
                    <Td className="text-right tabular-nums">{perPatient.toFixed(1)}</Td>
                    <Td className="text-right tabular-nums">{hours.toFixed(1)} hours</Td>
                    <Td className="text-muted-foreground">{lastSeen(p.lastLogin, ops.today)}</Td>
                  </Row>
                )
              })}
        </tbody>
      </DataTable>
      <FooterLink href={HREF.reports}>Reports by provider</FooterLink>
    </Card>
  )
}

/* --------------------------------------------------- panel compare -- */

type Compare = "panel" | "rate"

function PanelCompare({ rows }: { rows: ProviderRow[] }) {
  const [mode, setMode] = React.useState<Compare>("panel")
  const sorted = [...rows].sort((a, b) => (mode === "panel" ? b.patients.length - a.patients.length : b.enrollRate - a.enrollRate))
  const data = sorted.map((r) => ({
    name: shortName(r.provider),
    active: r.active,
    invited: r.invited,
    declined: r.declined,
    rate: r.enrollRate,
  }))
  const avgRate = pct(
    rows.reduce((s, r) => s + r.active, 0),
    rows.reduce((s, r) => s + r.active + r.invited + r.declined, 0)
  )

  return (
    <Card>
      <CardHeader
        title="Panels compared"
        actions={
          <SegmentedControl
            label="Compare"
            value={mode}
            onChange={setMode}
            items={[
              { value: "panel", label: "Panel size" },
              { value: "rate", label: "Enrollment rate" },
            ]}
          />
        }
      />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <dl className="grid grid-cols-3 gap-3">
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">Largest panel</dt>
            <dd className="text-xl font-semibold tabular-nums">{Math.max(0, ...rows.map((r) => r.patients.length))}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">Smallest panel</dt>
            <dd className="text-xl font-semibold tabular-nums">{rows.length ? Math.min(...rows.map((r) => r.patients.length)) : 0}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">Practice enrollment</dt>
            <dd className="text-xl font-semibold tabular-nums">{avgRate}%</dd>
          </div>
        </dl>
        {data.length ? (
          mode === "panel" ? (
            <ReBarChart
              data={data}
              xKey="name"
              layout="vertical"
              stacked
              height={Math.max(200, data.length * 40)}
              series={[
                { key: "active", label: "Active", color: SUBTLE.green },
                { key: "invited", label: "Invited", color: SUBTLE.blue },
                { key: "declined", label: "Declined", color: SUBTLE.red, fill: "stripe" },
              ]}
            />
          ) : (
            <ReBarChart
              data={data}
              xKey="name"
              layout="vertical"
              height={Math.max(200, data.length * 40)}
              valueFormat={(v) => `${v}%`}
              series={[{ key: "rate", label: "Enrollment rate", color: "var(--primary)" }]}
            />
          )
        ) : (
          <NothingHere title="No active providers" />
        )}
      </div>
    </Card>
  )
}

/* --------------------------------------------------- staff by role -- */

function StaffByRole({ ops }: { ops: PracticeOps }) {
  const [active, setActive] = React.useState<string | undefined>()
  const staff = ops.staff.filter((s) => s.status !== "Inactive" && USER_ROLES.includes(s.role))
  const slices: ReSlice[] = USER_ROLES.map((role) => ({
    key: role.replace(/\s+/g, "-").toLowerCase(),
    label: role,
    value: staff.filter((s) => s.role === role).length,
    color: ROLE_COLOR[role],
  }))
  const pick = slices.find((s) => s.key === active)
  const invited = staff.filter((s) => s.status === "Invited" && (!pick || s.role === pick.label))

  return (
    <Card>
      <CardHeader title="Staff by role" actions={<CardLink href={HREF.staff}>All staff</CardLink>} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid items-center gap-4 sm:grid-cols-2">
          <ReDonut
            data={slices}
            active={active}
            onSelect={(k) => setActive((a) => (a === k ? undefined : k))}
            centerValue={pick ? pick.value : staff.length}
            centerLabel={pick ? pick.label : "Staff"}
            height={200}
          />
          <ReDonutLegend data={slices} active={active} onSelect={(k) => setActive((a) => (a === k ? undefined : k))} />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-[13px] font-medium">
            Still invited <span className="text-muted-foreground tabular-nums">{invited.length}</span>
          </h3>
          {invited.length ? (
            <ItemGroup>
              {invited.slice(0, 3).map((s) => (
                <PersonItem key={s.id} person={s} role={s.role} today={ops.today} />
              ))}
            </ItemGroup>
          ) : (
            <p className="text-[13px] text-muted-foreground">Everyone has joined</p>
          )}
        </div>
      </div>
    </Card>
  )
}

function PersonItem({
  person,
  role,
  today,
  href,
}: {
  person: StaffUser | Provider
  role: string
  today: string
  href?: string
}) {
  const name = "credential" in person ? providerName(person) : fullName(person)
  const d = daysAgo(person.invitedAt, today)
  return (
    <Item size="xs" className="px-0">
      <ItemMedia>
        <Avatar name={fullName(person)} photo={person.photo} size={30} />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="truncate">{href ? <Link href={href}>{name}</Link> : name}</ItemTitle>
        <ItemDescription className="truncate">
          {role}, invited {shortDay(person.invitedAt)}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Badge tone={d > 14 ? "warning" : "light"}>{plural(d, "day")}</Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.success(`Invite sent again to ${fullName(person)}`)}
        >
          Resend
        </Button>
      </ItemActions>
    </Item>
  )
}

/* ------------------------------------------------- invites waiting -- */

function InvitesWaiting({ ops }: { ops: PracticeOps }) {
  const people = [
    ...ops.invitedProviders.map((p) => ({ person: p as Provider | StaffUser, role: p.credential ? `Provider, ${p.credential}` : "Provider", href: HREF.provider(p.id) })),
    ...ops.invitedStaff.map((s) => ({ person: s as Provider | StaffUser, role: s.role, href: undefined })),
  ].sort((a, b) => a.person.invitedAt.localeCompare(b.person.invitedAt))

  return (
    <Card>
      <CardHeader title="Invites waiting" count={<Badge>{people.length}</Badge>} actions={<CardLink href={HREF.users}>Users</CardLink>} />
      <div className="flex-1 px-4 py-2">
        {people.length ? (
          <ItemGroup>
            {people.slice(0, 6).map((x) => (
              <PersonItem key={x.person.id} person={x.person} role={x.role} today={ops.today} href={x.href} />
            ))}
          </ItemGroup>
        ) : (
          <NothingHere title="Everyone has joined" />
        )}
      </div>
    </Card>
  )
}

/* ------------------------------------------------ licence renewals -- */

function LicenceRenewals({ ops }: { ops: PracticeOps }) {
  const renewals = renewalsOf(ops).slice(0, 6)
  return (
    <Card>
      <CardHeader title="License renewals" actions={<CardLink href={HREF.users}>Providers</CardLink>} />
      <div className="flex-1 px-4 py-2">
        {renewals.length ? (
          <ItemGroup>
            {renewals.map((r) => {
              const t = renewalTone(r.days)
              return (
                <Item key={`${r.provider.id}-${r.type}`} size="xs" className="px-0" render={<Link href={HREF.provider(r.provider.id)} />}>
                  <ItemMedia>
                    <Avatar name={fullName(r.provider)} photo={r.provider.photo} size={30} />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle className="truncate">{providerName(r.provider)}</ItemTitle>
                    <ItemDescription className="truncate">
                      {r.type}, {r.state}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions className="flex-col items-end gap-1">
                    <span className="text-[13px] font-medium tabular-nums">{shortDay(r.expiry)}, {r.expiry.slice(0, 4)}</span>
                    <Badge tone={t.tone}>{t.label}</Badge>
                  </ItemActions>
                </Item>
              )
            })}
          </ItemGroup>
        ) : (
          <NothingHere title="No licenses on file" />
        )}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------ departures -- */

function Departures({ ops }: { ops: PracticeOps }) {
  return (
    <Card>
      <CardHeader title="Providers who left" count={<Badge>{ops.departed.length}</Badge>} />
      <div className="flex-1 px-4 py-2">
        {ops.departed.length ? (
          <ItemGroup>
            {ops.departed.map((p) => {
              const d = p.departure
              const what = !d ? "Deactivated" : d.kind === "moved" ? `Moved to ${d.practiceName}` : "Left Inlay"
              return (
                <Item key={p.id} size="xs" className="px-0" render={<Link href={HREF.provider(p.id)} />}>
                  <ItemMedia>
                    <Avatar name={fullName(p)} photo={p.photo} size={30} />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle className="truncate">{providerName(p)}</ItemTitle>
                    <ItemDescription className="truncate">
                      {what}
                      {d && `, ${shortDay(d.at)}`}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    {d ? (
                      <Badge tone={d.kind === "moved" ? "info" : "light"}>
                        {plural(d.patients, "patient")} {d.kind === "moved" ? "moved" : "reassigned"}
                      </Badge>
                    ) : (
                      <IconLogout className="size-4 text-muted-foreground" />
                    )}
                  </ItemActions>
                </Item>
              )
            })}
          </ItemGroup>
        ) : (
          <NothingHere title="No one has left" />
        )}
      </div>
    </Card>
  )
}

function NothingHere({ title }: { title: string }) {
  return (
    <Empty className="py-8">
      <EmptyHeader>
        <EmptyTitle className="text-sm font-medium text-muted-foreground">{title}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}
