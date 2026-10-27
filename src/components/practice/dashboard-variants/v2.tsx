"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconActivity,
  IconChat,
  IconClose,
  IconCopy,
  IconCreditCard,
  IconMail,
  IconRefresh,
  IconStethoscope,
  IconUser,
  IconUserAdd,
  IconUsersGroup,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/design-system/ui/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/design-system/ui/empty"
import { Progress, ProgressLabel } from "@/design-system/ui/progress"
import { Skeleton } from "@/design-system/ui/skeleton"
import { Illustration } from "@/components/illustrations/illustration"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import {
  PRACTICE,
  type Patient,
  fullName,
  inviteTimeline,
  providerName,
} from "@/components/practice/practice-data"
import { ENCOUNTER_TYPES, ENCOUNTERS, ENROLLMENT, VALUE } from "@/components/practice/practice-reports-data"
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  ReAreaChart,
  ReBarChart,
  type ReDatum,
  ReLegend,
  type ReSeries,
  SegmentedControl,
  type Tone,
} from "@/components/dashboard-kit-v2"
import { AreaSpark } from "@/components/dashboard-kit-v2/charts"
import { CardLink, FooterLink, IconTile, type Segment, SegmentBar } from "@/components/provider/home-v2/overview"
import { VariantFrame } from "@/components/practice/dashboard-variants/frame"
import {
  type Engagement,
  HREF,
  type PeriodKind,
  type PracticeOps,
  type ReportTotals,
  daysAgo,
  pct,
  shortDay,
  usePracticeOps,
  useReportTotals,
} from "@/components/practice/dashboard-variants/practice-ops"

/* Variation 2, Activity: what happened in the practice, after ReUI's
   Flowly dashboard, built from the portal's own components. A greeting
   with the period, four headline numbers with their trend, engagement by
   encounter type beside the patients added each week, then a feed of what
   the practice did recently beside where the patient panel stands now. */

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const GREY = "#B5B5B5"

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

/* ----------------------------------------------------------- headline -- */

type Headline = {
  icon: typeof IconUser
  label: string
  color: string
  values: number[]
  before: number
  meta: string
  href: string
}

/** A Flowly headline: icon and label, the number with its change on the
    period before, and the trend as a soft area on the right. */
function HeadlineCard({ h, when }: { h: Headline; when: string }) {
  const now = h.values[h.values.length - 1] ?? 0
  const change = h.before ? Math.round(((now - h.before) / h.before) * 100) : 0
  const tone: Tone = change > 0 ? "success" : change < 0 ? "error" : "light"
  return (
    <Card>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <IconTile icon={h.icon} color={h.color} />
          <span className="truncate text-sm font-medium">{h.label}</span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">{when}</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-2">
              <span className="text-[28px] leading-9 font-semibold tabular-nums">{now.toLocaleString("en-US")}</span>
              <Badge tone={tone}>
                {change > 0 ? "+" : ""}
                {change}%
              </Badge>
            </span>
            <span className="truncate text-xs text-muted-foreground tabular-nums">{h.meta}</span>
          </span>
          <AreaSpark values={h.values} color={h.color} label={`${h.label}, last ${h.values.length} periods`} />
        </div>
      </div>
      <FooterLink href={h.href}>Open report</FooterLink>
    </Card>
  )
}

/* --------------------------------------------------------- engagement -- */

const ENCOUNTER_COLOR: Record<(typeof ENCOUNTER_TYPES)[number]["id"], string> = {
  inPerson: SUBTLE.blue,
  telehealth: SUBTLE.violet,
  messages: SUBTLE.green,
  askInlay: "var(--primary)",
  labDraws: SUBTLE.orange,
  checkIns: GREY,
}

/** Encounters by type over the last few periods, as Flowly's stacked areas;
    the switch folds them into visits, messages and Ask Inlay. */
function Engagement({ totals, className }: { totals: ReportTotals; className?: string }) {
  const [mode, setMode] = React.useState<"type" | "channel">("channel")
  const label = (p: { label: string }) => (totals.trend.length > 4 ? p.label.slice(0, 3) : p.label)

  const byType: ReSeries[] = ENCOUNTER_TYPES.map((t) => ({
    key: t.id,
    label: t.label,
    color: ENCOUNTER_COLOR[t.id],
    fill: "gradient",
  }))
  const byChannel: ReSeries[] = [
    { key: "askInlay", label: "Ask Inlay", color: "var(--primary)", fill: "gradient" },
    { key: "messages", label: "Messages", color: SUBTLE.green, fill: "gradient" },
    { key: "visits", label: "Visits", color: SUBTLE.blue, fill: "gradient" },
    { key: "other", label: "Lab draws and check ins", color: GREY, fill: "gradient", dashed: true },
  ]
  const rows: ReDatum[] = totals.trend.map((t) => ({
    period: label(t.period),
    full: t.period.label,
    ...Object.fromEntries(ENCOUNTER_TYPES.map((x) => [x.id, t.enc[x.id]])),
    visits: t.enc.inPerson + t.enc.telehealth,
    other: t.enc.labDraws + t.enc.checkIns,
  }))
  const fullOf = new Map(rows.map((r) => [String(r.period), String(r.full)]))
  const series = mode === "type" ? byType : byChannel
  const enc = totals.now.enc
  const virtual = pct(enc.telehealth + enc.messages + enc.askInlay, enc.total)

  return (
    <Card className={className}>
      <CardHeader
        title="Engagement"
        description={`${enc.total.toLocaleString("en-US")} encounters in ${totals.now.period.label}, ${virtual}% virtual`}
        actions={
          <>
            <SegmentedControl
              label="Group by"
              value={mode}
              onChange={setMode}
              items={[
                { value: "channel", label: "Channel" },
                { value: "type", label: "Type" },
              ]}
            />
            <CardLink href={HREF.report(ENCOUNTERS)}>Report</CardLink>
          </>
        }
      />
      <div className="flex flex-1 flex-col p-4">
        <ReLegend series={series} className="mb-3" />
        <ReAreaChart
          key={mode}
          data={rows}
          xKey="period"
          series={series}
          stacked
          curve="monotone"
          dots="glow"
          height={248}
          showYAxis
          tooltipLabel={(p: string) => fullOf.get(p) ?? p}
        />
      </div>
    </Card>
  )
}

/* ------------------------------------------------------ weekly adds -- */

const WEEK_SERIES: ReSeries[] = [
  { key: "active", label: "Joined", color: SUBTLE.green, fill: "stripe" },
  { key: "waiting", label: "Not joined yet", color: SUBTLE.blue, fill: "dots" },
]

/** Patients added each week for the last twelve weeks, split by whether
    they have joined since. */
function WeeklyAdds({ ops }: { ops: PracticeOps }) {
  const rows: ReDatum[] = ops.weekly.map((w) => ({
    week: w.label,
    active: w.active,
    waiting: w.added - w.active,
  }))
  const last4 = ops.weekly.slice(-4)
  const added = last4.reduce((s, w) => s + w.added, 0)
  const joined = last4.reduce((s, w) => s + w.active, 0)
  return (
    <Card>
      <CardHeader
        title="Patients added"
        description={`${added} in the last 4 weeks, ${pct(joined, added)}% joined`}
        actions={<CardLink href={HREF.patients}>Patients</CardLink>}
      />
      <div className="flex flex-1 flex-col p-4">
        <ReLegend series={WEEK_SERIES} className="mb-3" />
        <ReBarChart
          data={rows}
          xKey="week"
          series={WEEK_SERIES}
          stacked
          height={248}
          showYAxis
          tooltipLabel={(w: string) => `Week of ${w}`}
        />
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------ feed -- */

type Kind = "patients" | "team" | "records"

export type Event = {
  id: string
  kind: Kind
  /** Local "2026-10-12". */
  day: string
  icon: typeof IconUser
  color: string
  title: string
  meta: string
  badge?: { tone: Tone; label: string }
  person?: { name: string; photo: string }
  href: string
}

const FILTERS: { value: "all" | Kind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "patients", label: "Patients" },
  { value: "team", label: "Team" },
  { value: "records", label: "Records" },
]

/** Everything the practice did in the last 30 days, newest first, from the
    live lists, so every row matches Users and Patients. */
export function buildFeed(ops: PracticeOps): Event[] {
  const doctor = new Map(ops.providers.map((p) => [p.id, providerName(p)]))
  const under = (p: Patient) => doctor.get(p.providerId) ?? "No provider"
  const events: Event[] = []

  for (const p of ops.patients) {
    const name = fullName(p)
    const person = { name, photo: p.photo }
    const href = HREF.patient(p.id)
    if (p.status === "Active" && p.invitedAt) {
      /* A joined patient answered the invite; without the date on file the
         invite day stands in. */
      events.push({
        id: `joined-${p.id}`,
        kind: "patients",
        day: p.respondedAt ?? p.invitedAt,
        icon: IconUserAdd,
        color: SUBTLE.green,
        title: `${name} joined Inlay`,
        meta: under(p),
        badge: { tone: "success", label: "Joined" },
        person,
        href,
      })
    } else if (p.status === "Invited") {
      const sent = inviteTimeline(p).filter((s) => s.state === "sent")
      const last = sent[sent.length - 1]
      if (last)
        events.push({
          id: `invite-${p.id}`,
          kind: "patients",
          day: last.date,
          icon: IconMail,
          color: SUBTLE.blue,
          title: `${last.label} to ${name}`,
          meta: `By ${last.channels.join(" and ")} · ${under(p)}`,
          badge: last.label === "Final reminder" ? { tone: "warning", label: "Final reminder" } : { tone: "info", label: "Invited" },
          person,
          href,
        })
    } else if (p.status === "Declined" && p.respondedAt) {
      events.push({
        id: `declined-${p.id}`,
        kind: "patients",
        day: p.respondedAt,
        icon: IconClose,
        color: SUBTLE.red,
        title: `${name} declined the invite`,
        meta: under(p),
        badge: { tone: "error", label: "Declined" },
        person,
        href,
      })
    }
    if (p.reactivatedAt)
      events.push({
        id: `reopen-${p.id}`,
        kind: "records",
        day: p.reactivatedAt,
        icon: IconRefresh,
        color: SUBTLE.violet,
        title: `${name}'s record reopened`,
        meta: "Fresh consent requested",
        badge: { tone: "primary", label: "Reopened" },
        person,
        href,
      })
    if (p.mergedAt)
      events.push({
        id: `merge-${p.id}`,
        kind: "records",
        day: p.mergedAt,
        icon: IconCopy,
        color: SUBTLE.violet,
        title: `Duplicate merged into ${name}'s record`,
        meta: under(p),
        badge: { tone: "primary", label: "Merged" },
        person,
        href,
      })
  }

  for (const d of ops.duplicates) {
    const name = fullName(d.incoming)
    events.push({
      id: `dup-${d.id}`,
      kind: "records",
      day: d.submittedAt,
      icon: IconCopy,
      color: SUBTLE.orange,
      title: `Possible duplicate: ${name}`,
      meta: `Sent for review by ${d.submittedBy} · ${d.source}`,
      badge: { tone: "warning", label: "To review" },
      href: HREF.duplicate(d.id),
    })
  }

  for (const p of ops.providers) {
    const name = providerName(p)
    const person = { name, photo: p.photo }
    if (p.status === "Invited" && p.invitedAt)
      events.push({
        id: `prov-${p.id}`,
        kind: "team",
        day: p.invitedAt,
        icon: IconStethoscope,
        color: SUBTLE.blue,
        title: `${name} invited`,
        meta: p.specialty || "Provider",
        badge: { tone: "info", label: "Invited" },
        person,
        href: HREF.provider(p.id),
      })
    if (p.departure)
      events.push({
        id: `left-${p.id}`,
        kind: "team",
        day: p.departure.at,
        icon: IconStethoscope,
        color: GREY,
        title:
          p.departure.kind === "moved" ? `${name} moved to ${p.departure.practiceName}` : `${name} left Inlay`,
        meta:
          p.departure.kind === "moved"
            ? `${plural(p.departure.patients, "patient")} went with them`
            : `${plural(p.departure.patients, "patient")} reassigned`,
        badge: { tone: "light", label: "Inactive" },
        person,
        href: HREF.provider(p.id),
      })
  }

  for (const s of ops.invitedStaff)
    events.push({
      id: `staff-${s.id}`,
      kind: "team",
      day: s.invitedAt,
      icon: IconUsersGroup,
      color: SUBTLE.blue,
      title: `${s.firstName} ${s.lastName} invited`,
      meta: s.role,
      badge: { tone: "info", label: "Invited" },
      person: { name: `${s.firstName} ${s.lastName}`, photo: s.photo },
      href: HREF.staff,
    })

  return events
    .filter((e) => e.day && daysAgo(e.day, ops.today) <= 30 && e.day.slice(0, 10) <= ops.today)
    .sort((a, b) => b.day.localeCompare(a.day) || a.title.localeCompare(b.title))
}

export function dayHeading(day: string, today: string) {
  const d = daysAgo(day, today)
  if (d === 0) return "Today"
  if (d === 1) return "Yesterday"
  return `${new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(`${day.slice(0, 10)}T12:00:00`))}, ${shortDay(day)}`
}

function ActivityFeed({ ops, className }: { ops: PracticeOps; className?: string }) {
  const [filter, setFilter] = React.useState<"all" | Kind>("all")
  const [all, setAll] = React.useState(false)
  const feed = React.useMemo(() => buildFeed(ops), [ops])
  const rows = feed.filter((e) => filter === "all" || e.kind === filter)
  const shown = all ? rows : rows.slice(0, 10)

  /* Rows fall under a heading per day. */
  const days: { day: string; events: Event[] }[] = []
  for (const e of shown) {
    const day = e.day.slice(0, 10)
    const last = days[days.length - 1]
    if (last?.day === day) last.events.push(e)
    else days.push({ day, events: [e] })
  }

  return (
    <Card className={className}>
      <CardHeader
        title="Recent activity"
        count={<Badge tone="light">{rows.length}</Badge>}
        actions={
          <SegmentedControl
            label="Show"
            value={filter}
            onChange={(v) => {
              setFilter(v)
              setAll(false)
            }}
            items={FILTERS}
          />
        }
      />
      {rows.length === 0 ? (
        <Empty className="flex-1 py-10">
          <EmptyHeader>
            <EmptyMedia>
              <Illustration name="no-results" />
            </EmptyMedia>
            <EmptyTitle>Nothing in the last 30 days</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-1 flex-col">
          {days.map((g) => (
            <section key={g.day} aria-label={dayHeading(g.day, ops.today)}>
              <h3 className="border-b border-border bg-surface-head px-4 py-1.5 text-xs font-medium text-muted-foreground">
                {dayHeading(g.day, ops.today)}
              </h3>
              <ul className="divide-y divide-border">
                {g.events.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={e.href}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:outline-none"
                    >
                      <IconTile icon={e.icon} color={e.color} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">{e.title}</span>
                        <span className="truncate text-xs text-muted-foreground">{e.meta}</span>
                      </span>
                      {e.badge && (
                        <Badge tone={e.badge.tone} className="hidden sm:inline-flex">
                          {e.badge.label}
                        </Badge>
                      )}
                      {e.person && <Avatar name={e.person.name} photo={e.person.photo} size={28} />}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {rows.length > 10 && (
        <FooterLink onClick={() => setAll((v) => !v)}>{all ? "Show fewer" : `Show all ${rows.length}`}</FooterLink>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------ panel -- */

const ENGAGEMENT_COLOR: Record<Engagement, string> = {
  "This week": SUBTLE.green,
  "This month": SUBTLE.blue,
  "Quiet 30+ days": SUBTLE.orange,
}

/** Where the patient panel stands now: every status as a share of the
    panel, then how recently the active patients used the app. */
function PanelNow({ ops }: { ops: PracticeOps }) {
  const total = ops.patients.length
  const status: Segment[] = [
    { label: "Active", value: ops.byStatus.Active.length, color: SUBTLE.green },
    { label: "Invited", value: ops.byStatus.Invited.length, color: SUBTLE.blue },
    { label: "Declined", value: ops.byStatus.Declined.length, color: SUBTLE.red },
    { label: "Inactive", value: ops.byStatus.Inactive.length, color: GREY },
  ]
  const active = ops.byStatus.Active.length
  return (
    <Card>
      <CardHeader title="Patient panel" count={<Badge tone="light">{total}</Badge>} actions={<CardLink href={HREF.patients}>Patients</CardLink>} />
      <div className="flex flex-1 flex-col gap-5 p-4">
        <div className="flex flex-col gap-2">
          <span className="flex items-baseline gap-1 tabular-nums">
            <span className="text-[28px] leading-9 font-semibold">{active}</span>
            <span className="text-sm text-muted-foreground">active of {total}</span>
          </span>
          <SegmentBar segments={status} label={status.map((s) => `${s.label} ${s.value}`).join(", ")} />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {status.map((s) => (
              <li key={s.label} className="flex items-center gap-1.5 text-xs">
                <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-muted-foreground">{s.label}</span>
                <span className="ml-auto font-medium tabular-nums">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-[13px] font-medium">Last used the app</h3>
          {(Object.keys(ops.engagement) as Engagement[]).map((k) => {
            const n = ops.engagement[k].length
            return (
              <Progress
                key={k}
                value={pct(n, active)}
                className="gap-1.5 [&_[data-slot=progress-indicator]]:bg-[var(--bar)] [&_[data-slot=progress-track]]:h-1.5"
                style={{ "--bar": ENGAGEMENT_COLOR[k] } as React.CSSProperties}
              >
                <ProgressLabel className="text-xs text-muted-foreground">{k}</ProgressLabel>
                <span className="ml-auto text-xs font-medium tabular-nums">{n}</span>
              </Progress>
            )
          })}
        </div>
        <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-border pt-4">
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">Near the final reminder</dt>
            <dd className="text-lg font-semibold tabular-nums">{ops.nearFinal.length}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">Duplicates to review</dt>
            <dd className="text-lg font-semibold tabular-nums">{ops.duplicates.length}</dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------- page -- */

function HeadlineSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-[7.2px] border border-border bg-card p-4">
      <Skeleton className="h-8 w-32 rounded-sm" />
      <div className="flex items-end justify-between">
        <Skeleton className="h-9 w-20 rounded-sm" />
        <Skeleton className="h-10 w-[84px] rounded-sm" />
      </div>
    </div>
  )
}

export function PracticeDashboardV2() {
  const ops = usePracticeOps()
  const [kind, setKind] = React.useState<PeriodKind>("Month")
  const totals = useReportTotals(kind)
  const { now, before, trend } = totals
  const first = PRACTICE.manager.name.split(" ")[0]

  const headlines: Headline[] = [
    {
      icon: IconUserAdd,
      label: "Enrolled",
      color: SUBTLE.green,
      values: trend.map((t) => t.enroll.enrolled),
      before: before.enroll.enrolled,
      meta: `${pct(now.enroll.enrolled, now.enroll.added)}% of ${now.enroll.added} invited`,
      href: HREF.report(ENROLLMENT),
    },
    {
      icon: IconActivity,
      label: "Activated",
      color: SUBTLE.blue,
      values: trend.map((t) => t.enroll.activated),
      before: before.enroll.activated,
      meta: `${pct(now.enroll.activated, now.enroll.enrolled)}% finished onboarding`,
      href: HREF.report(ENROLLMENT),
    },
    {
      icon: IconChat,
      label: "Encounters",
      color: SUBTLE.violet,
      values: trend.map((t) => t.enc.total),
      before: before.enc.total,
      meta: `${now.enc.askInlay.toLocaleString("en-US")} Ask Inlay chats`,
      href: HREF.report(ENCOUNTERS),
    },
    {
      icon: IconCreditCard,
      label: "Members",
      color: SUBTLE.orange,
      values: trend.map((t) => t.value.members),
      before: before.value.members,
      meta: `${now.value.newMembers} new, ${now.value.cancelled} cancelled`,
      href: HREF.report(VALUE),
    },
  ]

  return (
    <VariantFrame>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg leading-7 font-semibold">
          {greeting()}, {first}
        </h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
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
          <Link href={HREF.newProvider} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-card")}>
            <IconStethoscope />
            Add provider
          </Link>
          <Link href={HREF.newPatient} className={buttonVariants({ size: "sm" })}>
            <IconUserAdd />
            Add patient
          </Link>
        </div>
      </header>

      {!ops.ready ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <HeadlineSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <section aria-label={`${now.period.label} at a glance`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {headlines.map((h) => (
              <HeadlineCard key={h.label} h={h} when={now.period.label} />
            ))}
          </section>

          <div className="grid gap-4 xl:grid-cols-3">
            <Engagement totals={totals} className="xl:col-span-2" />
            <WeeklyAdds ops={ops} />
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-3">
            <ActivityFeed ops={ops} className="xl:col-span-2" />
            <PanelNow ops={ops} />
          </div>
        </>
      )}
    </VariantFrame>
  )
}
