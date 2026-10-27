"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconActivity,
  IconCopy,
  IconCreditCard,
  IconFileCheck,
  IconMail,
  IconStethoscope,
  IconUserAdd,
  IconUsersGroup,
  IconWarning,
} from "@/design-system/icons"

import { Button, buttonVariants } from "@/design-system/ui/button"
import { Empty, EmptyHeader, EmptyTitle } from "@/design-system/ui/empty"
import { Input } from "@/design-system/ui/input"
import { Skeleton } from "@/design-system/ui/skeleton"
import { type Patient, type Provider, fullName, providerName } from "@/components/practice/practice-data"
import { ALERTS, ENCOUNTERS, ENCOUNTER_TYPES, ENROLLMENT, VALUE } from "@/components/practice/practice-reports-data"
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  DataTable,
  ReAreaChart,
  ReBarChart,
  ReLegend,
  Row,
  SegmentedControl,
  Td,
  Th,
  type Tone,
} from "@/components/dashboard-kit-v2"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import { CardLink, FooterLink, IconTile, LegendGrid, SegmentBar, StatCardSkeleton } from "@/components/provider/home-v2/overview"
import { ToolbarSelect } from "@/components/provider/reports/reports"
import { PracticeShell } from "@/components/practice/practice-shell"
import { VariantSwitch } from "@/components/practice/dashboard-variants/frame"
import { Pipeline } from "@/components/practice/dashboard-variants/v3"
import { lastSeen } from "@/components/practice/dashboard-variants/v4"
import {
  HREF,
  type PeriodKind,
  daysAgo,
  engagementOf,
  pct,
  shortDay,
} from "@/components/practice/dashboard-variants/practice-ops"
import { type Board, useBoard } from "@/components/practice/dashboard-layouts/board"
import { TrendCard } from "@/components/practice/dashboard-layouts/trend-card"
import { formatValue } from "@/components/provider/reports/reports-data"
import { type ChartConfig } from "@/design-system/ui/chart"

/* The Clinic Manager dashboard. Four sections: performance overview (five
   headline cards), trends and operations (enrollment trend, renewal
   overview), pipeline and actions (the patient pipeline, quick actions
   required) and patient management (the patient table).

   Headline cards, trends and the pipeline read the practice report totals
   for the period, so they agree with each other and with the reports. The
   action list and the two tables read the live patient, provider and
   duplicate lists, so every row opens a real record. The location filter
   scopes both. Aggregates and admin work only: no medical data. */

const BASE = "/screens/practice/dashboard"
const GREY = "#B5B5B5"

/** The chart palette: indigo, sky, mint, amber, coral, plum and slate. */
const CHART = {
  indigo: "#4F5BD5",
  sky: "#38BDF8",
  mint: "#2FBF8F",
  amber: "#F2A93B",
  coral: "#F0644F",
  plum: "#B04FC7",
  cyan: "#0EA5C6",
  slate: "#8A94A6",
}

export const LAYOUTS: Record<string, true> = { d3: true }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** The patient list, opened at a location and provider when one is picked. */
function patientsHref(board: Board, provider?: Provider | null) {
  const q = new URLSearchParams()
  if (board.locationName) q.set("location", board.locationName)
  if (provider) q.set("provider", providerName(provider))
  const s = q.toString()
  return s ? `${HREF.patients}?${s}` : HREF.patients
}

/* ------------------------------------------------------------- states -- */

/** Catches a section that throws so one failure doesn't blank the page. */
class SectionBoundary extends React.Component<{ name: string; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <Card>
        <CardHeader title={this.props.name} />
        <Empty className="py-8">
          <EmptyHeader>
            <EmptyTitle className="text-sm font-medium text-muted-foreground">This section could not load</EmptyTitle>
          </EmptyHeader>
          <Button variant="outline" size="sm" onClick={() => this.setState({ failed: false })}>
            Try again
          </Button>
        </Empty>
      </Card>
    )
  }
}

function PanelEmpty({ title }: { title: string }) {
  return (
    <Empty className="flex-1 py-8">
      <EmptyHeader>
        <EmptyTitle className="text-sm font-medium text-muted-foreground">{title}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

function CardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="flex-1 gap-3 p-4">
      <Skeleton className="h-5 w-40 rounded-md" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full rounded-md" />
      ))}
    </Card>
  )
}

/* ------------------------------------------------------------- frame -- */

function LayoutFrame({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <PracticeShell active="dashboard">
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-surface-sunken">
        <div className="border-b border-border bg-card px-6 py-2">
          <VariantSwitch current={`${BASE}?layout=${id}`} />
        </div>
        <div className="flex w-full min-w-0 flex-col gap-5 px-6 pt-5 pb-8">{children}</div>
      </div>
    </PracticeShell>
  )
}

/* -------------------------------------------------------- the screen -- */

export function PracticeLayout({ id }: { id: keyof typeof LAYOUTS }) {
  const [kind, setKind] = React.useState<PeriodKind>("Month")
  const [locationId, setLocationId] = React.useState("")
  const board = useBoard(kind, locationId)
  const ready = board.ops.ready

  return (
    <LayoutFrame id={id}>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg leading-7 font-semibold">Practice dashboard</h1>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <SegmentedControl
            label="Period"
            value={kind}
            onChange={setKind}
            items={[
              { value: "Month", label: "Month" },
              { value: "Quarter", label: "Quarter" },
              { value: "Year", label: "Year" },
            ]}
          />
          <ToolbarSelect
            label="Location"
            className="w-48"
            items={[{ label: "All locations", value: "" }, ...board.ops.activeLocations.map((l) => ({ label: l.name, value: l.id }))]}
            value={locationId}
            onChange={setLocationId}
          />
        </div>
      </header>

      {/* Section 1: performance overview */}
      <SectionBoundary name="Performance overview">
        {ready ? (
          <Overview board={board} />
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </section>
        )}
      </SectionBoundary>

      {/* Section 2: trends and operations, with the quick actions on the right */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)]">
        <SectionBoundary name="Patient enrollment trend">{ready ? <EnrollmentTrend board={board} kind={kind} /> : <CardSkeleton />}</SectionBoundary>
        <SectionBoundary name="Renewal overview">{ready ? <RenewalOverview board={board} kind={kind} /> : <CardSkeleton />}</SectionBoundary>
        <div className="flex min-w-0 flex-col lg:col-span-2 xl:col-span-1">
          <SectionBoundary name="Quick actions required">{ready ? <ActionsCard board={board} /> : <CardSkeleton rows={7} />}</SectionBoundary>
        </div>
      </div>

      {/* Section 3: encounters and pipeline */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionBoundary name="Encounters by type">{ready ? <EncountersByType board={board} /> : <CardSkeleton />}</SectionBoundary>
        <SectionBoundary name="Patient pipeline">{ready ? <PipelineCard board={board} kind={kind} /> : <CardSkeleton rows={7} />}</SectionBoundary>
      </div>

      {/* Section 4: patient and provider management */}
      <SectionBoundary name="Patient overview">{ready ? <PatientOverview board={board} /> : <CardSkeleton rows={8} />}</SectionBoundary>
    </LayoutFrame>
  )
}

/* ------------------------------------------------------- section 1 -- */

type Card5 = {
  key: string
  label: string
  icon: typeof IconUserAdd
  color: string
  value: number
  of?: number
  /** What the number counts, in words. */
  meaning: string
  segments: { label: string; value: number; color: string }[]
  href: string
  linkLabel: string
}

function Overview({ board }: { board: Board }) {
  const { now } = board.totals
  const e = now.enroll
  const a = now.alerts
  const v = now.value
  const rate = (n: number, d: number) => pct(n, d)
  const active = board.providers.filter((p) => p.status === "Active").length
  const invited = board.providers.filter((p) => p.status === "Invited").length
  const left = board.providers.filter((p) => p.status === "Inactive").length

  const cards: Card5[] = [
    {
      key: "enrollment",
      label: "Enrollment",
      icon: IconUserAdd,
      color: SUBTLE.green,
      value: e.enrolled,
      of: e.added,
      meaning: e.added
        ? `${rate(e.enrolled, e.added)}% of added patients enrolled`
        : "No patients added this period",
      segments: [
        { label: "Enrolled", value: e.enrolled, color: SUBTLE.green },
        { label: "Still invited", value: e.waiting, color: SUBTLE.blue },
        { label: "Declined", value: e.declined, color: SUBTLE.red },
      ],
      href: HREF.report(ENROLLMENT),
      linkLabel: "Enrollment report",
    },
    {
      key: "activation",
      label: "Activation",
      icon: IconActivity,
      color: SUBTLE.violet,
      value: e.activated,
      of: e.enrolled,
      meaning: e.enrolled
        ? `${rate(e.activated, e.enrolled)}% of enrolled finished onboarding`
        : "No enrolled patients this period",
      segments: [
        { label: "Activated", value: e.activated, color: SUBTLE.green },
        { label: "Connected only", value: e.connected - e.activated, color: SUBTLE.orange },
        { label: "Not connected", value: e.enrolled - e.connected, color: GREY },
      ],
      href: HREF.report(ENROLLMENT),
      linkLabel: "Activation report",
    },
    {
      key: "critical",
      label: "Alerts",
      icon: IconWarning,
      color: SUBTLE.red,
      value: a.critical,
      of: a.raised,
      meaning: `${a.open} alerts of any kind still open`,
      segments: [
        { label: "Critical results", value: a.critical, color: SUBTLE.red },
        { label: "Routine alerts", value: a.raised - a.critical, color: GREY },
      ],
      href: HREF.report(ALERTS),
      linkLabel: "Alert report",
    },
    {
      key: "members",
      label: "Optimization member",
      icon: IconCreditCard,
      color: "var(--primary)",
      value: v.members,
      meaning: `${plural(v.newMembers, "new member")} joined this period`,
      segments: [
        { label: "Renewed", value: v.renewed, color: SUBTLE.green },
        { label: "Cancelled", value: v.cancelled, color: SUBTLE.red },
        { label: "Renewal pending", value: Math.max(0, v.due - v.decided), color: SUBTLE.blue },
      ],
      href: HREF.report(VALUE),
      linkLabel: "Value report",
    },
    {
      key: "providers",
      label: "Active providers",
      icon: IconStethoscope,
      color: SUBTLE.blue,
      value: active,
      of: board.providers.length,
      meaning: `${invited} invited, ${left} left the practice`,
      segments: [
        { label: "Active", value: active, color: SUBTLE.green },
        { label: "Invited", value: invited, color: SUBTLE.blue },
        { label: "Left", value: left, color: GREY },
      ],
      href: HREF.users,
      linkLabel: "Providers",
    },
  ]

  return (
    <section aria-label={`Performance overview, ${board.when}`} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.key}>
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <IconTile icon={c.icon} color={c.color} />
              <span className="min-w-0 truncate text-[13px] font-medium whitespace-nowrap">{c.label}</span>
              <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{c.key === "providers" ? "Now" : board.when}</span>
            </div>
            <div className="flex flex-col">
              <span className="flex items-baseline gap-0.5 tabular-nums">
                <span className="text-[28px] leading-9 font-semibold">{c.value}</span>
                {c.of !== undefined && <span className="text-base text-muted-foreground">/{c.of}</span>}
              </span>
              <span className="truncate text-xs text-muted-foreground">{c.meaning}</span>
            </div>
            <SegmentBar segments={c.segments} label={`${c.label}: ${c.segments.map((s) => `${s.label} ${s.value}`).join(", ")}`} />
            <LegendGrid segments={c.segments} />
          </div>
          <FooterLink href={c.href}>{c.linkLabel}</FooterLink>
        </Card>
      ))}
    </section>
  )
}

/* ------------------------------------------------------- section 2 -- */

const tick = (n: number) => (v: string) => (n > 4 ? v.slice(0, 3) : v)

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

const TREND_SERIES = [
  { key: "enrolled", label: "Enrolled", color: SUBTLE.green, fill: "stripe" as const },
  { key: "waiting", label: "Not enrolled yet", color: SUBTLE.blue, fill: "dots" as const },
]

function EnrollmentTrend({ board, kind }: { board: Board; kind: PeriodKind }) {
  const router = useRouter()
  const { trend, now } = board.totals
  /* Each bar is everyone added that period: the enrolled, then the rest. */
  const data = trend.map((t) => ({
    period: t.period.label,
    added: t.enroll.added,
    enrolled: t.enroll.enrolled,
    waiting: t.enroll.added - t.enroll.enrolled,
  }))
  const e = now.enroll

  return (
    <Card className="flex-1">
      <CardHeader
        title="Patient enrollment trend"
        description={`Last ${trend.length} ${kind === "Month" ? "months" : kind === "Quarter" ? "quarters" : "years"}, select a bar to open the patients`}
        actions={
          <>
            <CardLink href={patientsHref(board)}>Patients</CardLink>
          </>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <dl className="grid grid-cols-3 gap-3">
          <Stat label={`Added in ${board.when}`} value={e.added} />
          <Stat label="Enrolled" value={e.enrolled} />
          <Stat label="Enrollment conversion" value={e.added ? `${pct(e.enrolled, e.added)}%` : "No data"} />
        </dl>
        {data.every((d) => d.added === 0) ? (
          <PanelEmpty title="No patients added in this range" />
        ) : (
          <>
            <ReLegend series={TREND_SERIES} />
            <ReBarChart
              data={data}
              xKey="period"
              xTickFormat={tick(data.length)}
              stacked
              showYAxis
              height={220}
              series={TREND_SERIES}
              onBarClick={() => router.push(patientsHref(board))}
            />
          </>
        )}
      </div>
    </Card>
  )
}

const RENEWAL_SERIES = [
  { key: "members", label: "Active members", color: CHART.coral, fill: "gradient" as const },
  { key: "newMembers", label: "New members", color: CHART.cyan, dashed: true },
]

function RenewalOverview({ board, kind }: { board: Board; kind: PeriodKind }) {
  const { trend, now } = board.totals
  const v = now.value
  const data = trend.map((t) => ({ period: t.period.label, members: t.value.members, newMembers: t.value.newMembers }))
  const upcoming = Math.max(0, v.due - v.decided)

  return (
    <Card className="flex-1">
      <CardHeader
        title="Renewal overview"
        description={`${board.when}, ${plural(v.due, "renewal")} due`}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <dl className="grid grid-cols-3 gap-3">
          <Stat label="Active members" value={v.members} />
          <Stat label="Renewal rate" value={v.decided ? `${pct(v.renewed, v.decided)}%` : "No data"} />
          <Stat label="Upcoming renewals" value={upcoming} />
        </dl>
        {data.every((d) => d.members === 0) ? (
          <PanelEmpty title="No members in this range" />
        ) : (
          <>
            <ReLegend series={RENEWAL_SERIES} />
            <ReAreaChart data={data} xKey="period" xTickFormat={tick(data.length)} curve="linear" dots="glow" showYAxis height={220} series={RENEWAL_SERIES} />
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Renewal rate counts decided renewals only. Upcoming renewals are due this {kind.toLowerCase()} and not yet renewed or cancelled.
        </p>
      </div>
    </Card>
  )
}

/* Encounters by type: the same card the Current dashboard shows. */

const ENCOUNTER_COLOR: Record<(typeof ENCOUNTER_TYPES)[number]["id"], string> = {
  inPerson: SUBTLE.blue,
  telehealth: SUBTLE.violet,
  messages: SUBTLE.green,
  askInlay: "var(--primary)",
  labDraws: SUBTLE.orange,
  checkIns: GREY,
}

const ENCOUNTER_CONFIG = Object.fromEntries(
  ENCOUNTER_TYPES.map((t) => [t.id, { label: t.label, color: ENCOUNTER_COLOR[t.id] }])
) satisfies ChartConfig

function EncountersByType({ board }: { board: Board }) {
  const { trend, now } = board.totals
  const enc = now.enc
  const show = (column: string) => {
    const col = ENCOUNTERS.columns.find((x) => x.id === column)!
    return formatValue(col.value(enc), col.format)
  }
  return (
    <TrendCard
      title="Encounters by type"
      report={ENCOUNTERS}
      stats={[
        { label: "All encounters", value: show("total") },
        { label: "Per active patient", value: show("perPatient") },
        { label: "Virtual share", value: `${pct(enc.telehealth + enc.messages + enc.askInlay, enc.total)}%` },
      ]}
      config={ENCOUNTER_CONFIG}
      stacked
      rows={trend.map((t) => ({ period: t.period, counts: t.enc }))}
    />
  )
}

/* ------------------------------------------------------- section 3 -- */

/** The patient pipeline as variation 3 draws it. */
function PipelineCard({ board, kind }: { board: Board; kind: PeriodKind }) {
  return (
    <Pipeline
      ctx={{ ops: board.ops, totals: board.totals, kind, locationId: board.locationId }}
      hideReport
      footer={
        <>
          <Link href={`${BASE}/v3?view=pipeline`} className={buttonVariants({ variant: "outline", size: "sm" }) + " bg-card"}>
            Pipeline by provider
          </Link>
          <Link href={HREF.report(ENROLLMENT)} className={buttonVariants({ size: "sm" })}>
            Full report
          </Link>
        </>
      }
    />
  )
}

/* Quick actions required */

type Action = {
  key: string
  icon: typeof IconMail
  color: string
  count: number
  title: string
  detail: string
  tone: Tone
  badge: string
  cta: string
  href: string
  rank: number
}

/** What waits on the clinic manager, most urgent first. Counts come from the
    live lists at the picked location. */
function actionsOf(board: Board): Action[] {
  const { ops } = board
  const today = ops.today
  const invited = board.patients.filter((p) => p.status === "Invited")
  const nearFinal = invited.filter((p) => daysAgo(p.invitedAt, today) >= 21)
  const oldestInvite = invited.reduce((m, p) => Math.max(m, daysAgo(p.invitedAt, today)), 0)
  const quiet = board.patients.filter((p) => p.status === "Active" && engagementOf(p, today) === "Quiet 30+ days")
  const duplicates = ops.duplicates.filter((d) => !board.locationId || (d.incoming as { locationId?: string }).locationId === board.locationId)
  const oldestDup = duplicates.reduce((m, d) => Math.max(m, daysAgo(d.submittedAt, today)), 0)
  const providerInvites = board.providers.filter((p) => p.status === "Invited")
  const oldestProv = providerInvites.reduce((m, p) => Math.max(m, daysAgo(p.invitedAt, today)), 0)
  const licences = ops.expiringLicenses.filter((l) => board.inLocation(l.provider.locationIds))
  const soonest = licences[0]
  const a = board.totals.now.alerts

  const list: Omit<Action, "rank">[] = [
    {
      key: "critical",
      icon: IconWarning,
      color: SUBTLE.red,
      count: a.critical,
      title: "Critical operational alerts",
      detail: `${a.open} alerts of any kind still open in ${board.when}`,
      tone: a.open ? "error" : "warning",
      badge: a.open ? "Critical" : "Acknowledged",
      cta: "Review",
      href: HREF.report(ALERTS),
    },
    {
      key: "licences",
      icon: IconFileCheck,
      color: SUBTLE.orange,
      count: licences.length,
      title: "Upcoming licence renewals",
      detail: soonest ? (soonest.days < 0 ? `${plural(licences.filter((l) => l.days < 0).length, "licence")} expired, next due ${shortDay(licences.find((l) => l.days >= 0)?.expiry ?? soonest.expiry)}` : `Next due ${shortDay(soonest.expiry)}, in ${plural(soonest.days, "day")}`) : "None within 90 days",
      tone: soonest && soonest.days <= 30 ? "error" : "warning",
      badge: soonest && soonest.days < 0 ? "Expired" : soonest && soonest.days <= 30 ? "Due in 30 days" : "Due in 90 days",
      cta: "Open providers",
      href: HREF.users,
    },
    {
      key: "duplicates",
      icon: IconCopy,
      color: SUBTLE.orange,
      count: duplicates.length,
      title: "Duplicate patient records to review",
      detail: duplicates.length ? `Oldest submitted ${plural(oldestDup, "day")} ago` : "Nothing to review",
      tone: oldestDup > 7 ? "error" : "warning",
      badge: oldestDup > 7 ? "Overdue" : "To review",
      cta: "Review",
      href: HREF.duplicates,
    },
    {
      key: "followup",
      icon: IconMail,
      color: SUBTLE.blue,
      count: nearFinal.length,
      title: "Patient invitations needing follow-up",
      detail: nearFinal.length ? "Invited 21+ days ago, near the final reminder" : "No invitation is near the final reminder",
      tone: "warning",
      badge: "Follow up",
      cta: "Follow up",
      href: patientsHref(board),
    },
    {
      key: "enrollments",
      icon: IconUserAdd,
      color: SUBTLE.green,
      count: invited.length,
      title: "Pending patient enrollments",
      detail: invited.length ? `Oldest invited ${plural(oldestInvite, "day")} ago` : "No patient is waiting to enroll",
      tone: "info",
      badge: "Pending",
      cta: "View patients",
      href: patientsHref(board),
    },
    {
      key: "providers",
      icon: IconUsersGroup,
      color: SUBTLE.violet,
      count: providerInvites.length,
      title: "Pending provider invitations",
      detail: providerInvites.length ? `Oldest sent ${plural(oldestProv, "day")} ago` : "Every provider has joined",
      tone: oldestProv > 14 ? "warning" : "info",
      badge: oldestProv > 14 ? "Resend" : "Pending",
      cta: "Open providers",
      href: HREF.users,
    },
    {
      key: "quiet",
      icon: IconActivity,
      color: SUBTLE.green,
      count: quiet.length,
      title: "Inactive patients to follow up",
      detail: quiet.length ? "Enrolled, but no app activity for 30+ days" : "Everyone was active in the last 30 days",
      tone: "info",
      badge: "Re-engage",
      cta: "View patients",
      href: patientsHref(board),
    },
  ]
  const order: Record<Tone, number> = { error: 0, warning: 1, info: 2, success: 3, primary: 4, light: 5, outline: 6 }
  return list
    .filter((x) => x.count > 0)
    .map((x, i) => ({ ...x, rank: order[x.tone] * 10 + i }))
    .sort((x, y) => x.rank - y.rank)
}

const TOP_ACTIONS = 5

function ActionsCard({ board }: { board: Board }) {
  const [all, setAll] = React.useState(false)
  const actions = actionsOf(board)
  const shown = all ? actions : actions.slice(0, TOP_ACTIONS)

  return (
    <Card className="flex-1">
      <CardHeader
        title="Quick actions required"
        count={<Badge tone={actions.length ? "warning" : "success"}>{actions.length}</Badge>}
        description={actions.length ? `${plural(actions.length, "task")} waiting on you, most urgent first` : "Nothing waiting on you"}
      />
      {actions.length === 0 ? (
        <PanelEmpty title="All clear" />
      ) : (
        <ul className="flex flex-col divide-y divide-border/60">
          {shown.map((a) => (
            <li key={a.key} className="flex items-center gap-3 px-4 py-3">
              <IconTile icon={a.icon} color={a.color} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{a.title}</span>
                  <Badge tone={a.tone}>{a.badge}</Badge>
                </span>
                <span className="truncate text-xs text-muted-foreground">{a.detail}</span>
              </span>
              <Link href={a.href} className={buttonVariants({ variant: "outline", size: "sm" }) + " shrink-0 bg-card"}>
                {a.cta}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {actions.length > TOP_ACTIONS && (
        <FooterLink onClick={() => setAll((v) => !v)}>{all ? "Show fewer tasks" : `View all tasks (${actions.length})`}</FooterLink>
      )}
    </Card>
  )
}

/* ------------------------------------------------------- section 4 -- */

type PatientFilter = "all" | Patient["status"]

/** The next step for a patient, from their status and last app activity. */
function pendingAction(p: Patient, today: string): { label: string; tone: Tone; rank: number } | null {
  if (p.status === "Invited") {
    const d = daysAgo(p.invitedAt, today)
    return d >= 21
      ? { label: "Near final reminder", tone: "warning", rank: 0 }
      : { label: `Awaiting reply, invited ${plural(d, "day")} ago`, tone: "info", rank: 1 }
  }
  if (p.status === "Active" && engagementOf(p, today) === "Quiet 30+ days") return { label: "Follow up, quiet 30+ days", tone: "warning", rank: 0 }
  return null
}

const STATUS_TONE: Record<Patient["status"], Tone> = { Active: "success", Invited: "info", Declined: "error", Inactive: "light" }

function PatientOverview({ board }: { board: Board }) {
  const router = useRouter()
  const { ops } = board
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<PatientFilter>("all")
  const [limit, setLimit] = React.useState(10)
  const doctor = React.useMemo(() => new Map(ops.providers.map((p) => [p.id, providerName(p)])), [ops.providers])

  const rows = board.patients
    .filter((p) => filter === "all" || p.status === filter)
    .filter((p) => !query.trim() || `${fullName(p)} ${p.id}`.toLowerCase().includes(query.trim().toLowerCase()))
    .map((p) => ({ p, action: pendingAction(p, ops.today) }))
    .sort((a, b) => (a.action?.rank ?? 9) - (b.action?.rank ?? 9) || fullName(a.p).localeCompare(fullName(b.p)))

  return (
    <Card>
      <CardHeader
        title="Patient overview"
        count={<Badge>{rows.length}</Badge>}
        description={board.locationName || "All locations"}
        actions={
          <>
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setLimit(10)
              }}
              placeholder="Search patients"
              aria-label="Search patients"
              className="w-44"
            />
            <SegmentedControl
              label="Status"
              value={filter}
              onChange={(v) => {
                setFilter(v)
                setLimit(10)
              }}
              items={[
                { value: "all", label: "All" },
                { value: "Invited", label: "Invited" },
                { value: "Active", label: "Active" },
                { value: "Declined", label: "Declined" },
                { value: "Inactive", label: "Inactive" },
              ]}
            />
          </>
        }
      />
      <DataTable minWidth={900}>
        <thead>
          <tr>
            <Th>Patient</Th>
            <Th>Provider</Th>
            <Th>Status</Th>
            <Th>Last activity</Th>
            <Th>Pending action</Th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, limit).map(({ p, action }) => (
            <Row key={p.id} onOpen={() => router.push(HREF.patient(p.id))}>
              <Td>
                <Link href={HREF.patient(p.id)} className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={fullName(p)} photo={p.photo} size={36} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-foreground">{fullName(p)}</span>
                    <span className="truncate text-xs text-muted-foreground">{p.id}</span>
                  </span>
                </Link>
              </Td>
              <Td className="text-muted-foreground">{doctor.get(p.providerId) ?? "Not assigned"}</Td>
              <Td>
                <Badge tone={STATUS_TONE[p.status]} dot>
                  {p.status}
                </Badge>
              </Td>
              <Td className="text-muted-foreground">{p.lastEngagedAt ? lastSeen(p.lastEngagedAt, ops.today) : "No activity yet"}</Td>
              <Td>{action ? <Badge tone={action.tone}>{action.label}</Badge> : <span className="text-muted-foreground">None</span>}</Td>
            </Row>
          ))}
        </tbody>
      </DataTable>
      {rows.length === 0 && <PanelEmpty title={query || filter !== "all" ? "No patients match" : "No patients at this location"} />}
      {rows.length > limit ? (
        <FooterLink onClick={() => setLimit((n) => n + 10)}>{`Show more (${rows.length - limit} left)`}</FooterLink>
      ) : (
        <FooterLink href={patientsHref(board)}>All patients</FooterLink>
      )}
    </Card>
  )
}
