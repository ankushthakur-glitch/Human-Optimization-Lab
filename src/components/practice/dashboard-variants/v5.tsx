"use client"

import * as React from "react"
import Link from "next/link"
import {
  Alert02Icon,
  ArrowDown02Icon,
  ArrowUp02Icon,
  CreditCardIcon,
  Message01Icon,
  UserAdd01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { IconClock, IconLocation, IconMail } from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { Progress } from "@/design-system/ui/progress"
import { Skeleton } from "@/design-system/ui/skeleton"
import {
  type Location,
  DAYS,
  addressLine,
  fullName,
  providerName,
  time12,
} from "@/components/practice/practice-data"
import { ENCOUNTERS, ENCOUNTER_TYPES } from "@/components/practice/practice-reports-data"
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardHeader,
  FOCUS,
  MetricCard,
  MetricCardSkeleton,
  ReBarChart,
  ReDonut,
  ReDonutLegend,
  ReLegend,
  type ReSeries,
  type ReSlice,
  SegmentedControl,
} from "@/components/dashboard-kit-v2"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import { CardLink, IconTile } from "@/components/provider/home-v2/overview"
import { VariantFrame } from "@/components/practice/dashboard-variants/frame"
import {
  HREF,
  type LocationRow,
  type PeriodKind,
  daysAgo,
  pct,
  usePracticeOps,
  useReportTotals,
} from "@/components/practice/dashboard-variants/practice-ops"

/* Variation 5, Locations: the practice read site by site, after ReUI's
   Atlas admin, drawn only with the portal's own components. A strip of
   location cards picks the scope (all locations or one); the KPIs, the
   encounter mix and the lists under them follow it. The comparison chart
   always shows every location side by side, the picked one at full
   strength. Aggregates and admin work only, no medical data. */

const GREY = "#B5B5B5"

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

const ENCOUNTER_COLOR: Record<(typeof ENCOUNTER_TYPES)[number]["id"], string> = {
  inPerson: SUBTLE.blue,
  telehealth: SUBTLE.violet,
  messages: SUBTLE.green,
  askInlay: "var(--primary)",
  labDraws: SUBTLE.orange,
  checkIns: GREY,
}

const STATUS_SERIES: ReSeries[] = [
  { key: "active", label: "Active", color: SUBTLE.green },
  { key: "invited", label: "Invited", color: SUBTLE.blue },
  { key: "declined", label: "Declined", color: SUBTLE.orange },
  { key: "inactive", label: "Inactive", color: GREY },
]

/** Today's weekday in the order Location.hours keeps. */
const weekday = () => DAYS[(new Date().getDay() + 6) % 7]

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

/** Whether a location is open right now, and its hours today. */
function hoursToday(l: Location) {
  const today = l.hours.find((h) => h.day === weekday())
  if (!today || !today.open) return { open: false, closedToday: true, text: "Closed today" }
  const now = new Date()
  const at = now.getHours() * 60 + now.getMinutes()
  const open = at >= minutes(today.start) && at < minutes(today.end)
  return { open, closedToday: false, text: `${time12(today.start)} to ${time12(today.end)}` }
}

/** A change between two values as a badge, green when it went the good way. */
function Change({ now, before, goodWhen = "up", unit = "" }: { now: number; before: number; goodWhen?: "up" | "down"; unit?: string }) {
  const delta = now - before
  if (delta === 0) return <Badge tone="light">0{unit}</Badge>
  const better = delta > 0 === (goodWhen === "up")
  return (
    <Badge tone={better ? "success" : "error"} icon={delta < 0 ? ArrowDown02Icon : ArrowUp02Icon}>
      {delta > 0 ? "+" : ""}
      {delta}
      {unit}
    </Badge>
  )
}

/* -------------------------------------------------- location cards -- */

/** One card per location, plus All locations first; picking one scopes the page. */
function LocationStrip({
  rows,
  all,
  picked,
  onPick,
}: {
  rows: LocationRow[]
  all: { patients: number; providers: number; staff: number; enrollRate: number }
  picked: string
  onPick: (id: string) => void
}) {
  return (
    <section aria-label="Locations" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      <PickCard
        selected={picked === ""}
        onClick={() => onPick("")}
        media={<IconTile icon={IconLocation} color="var(--primary)" />}
        title="All locations"
        meta={plural(rows.filter((r) => r.location.status === "Active").length, "active location")}
        stats={all}
      />
      {rows.map((r) => {
        const h = hoursToday(r.location)
        return (
          <PickCard
            key={r.location.id}
            selected={picked === r.location.id}
            onClick={() => onPick(r.location.id)}
            media={
              r.location.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.location.photo} alt="" className="size-8 shrink-0 rounded-lg border border-border object-cover" />
              ) : (
                <IconTile icon={IconLocation} />
              )
            }
            title={r.location.name}
            badge={
              r.location.status === "Inactive" ? (
                <Badge tone="light" dot>
                  Inactive
                </Badge>
              ) : (
                <Badge tone={h.open ? "success" : "light"} dot>
                  {h.open ? "Open" : "Closed"}
                </Badge>
              )
            }
            meta={addressLine(r.location)}
            stats={{ patients: r.patients.length, providers: r.providers.length, staff: r.staff.length, enrollRate: r.enrollRate }}
          />
        )
      })}
    </section>
  )
}

function PickCard({
  selected,
  onClick,
  media,
  title,
  badge,
  meta,
  stats,
}: {
  selected: boolean
  onClick: () => void
  media: React.ReactNode
  title: string
  badge?: React.ReactNode
  meta: string
  stats: { patients: number; providers: number; staff: number; enrollRate: number }
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-[7.2px] border border-border bg-card p-3.5 text-left transition-[border-color,box-shadow] hover:border-foreground/20",
        selected && "border-primary ring-3 ring-primary-surface hover:border-primary",
        FOCUS
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {media}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">{title}</span>
          <span className="truncate text-xs text-muted-foreground">{meta}</span>
        </span>
        {badge}
      </span>
      <dl className="grid grid-cols-3 gap-2">
        {(
          [
            ["Patients", stats.patients],
            ["Providers", stats.providers],
            ["Staff", stats.staff],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col">
            <dt className="truncate text-xs text-muted-foreground">{label}</dt>
            <dd className="text-base font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <span className="flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">Enrolled</span>
          <span className="font-medium tabular-nums">{stats.enrollRate}%</span>
        </span>
        <Progress value={stats.enrollRate} className="[&_[data-slot=progress-track]]:h-1.5" />
      </span>
    </button>
  )
}

/* ------------------------------------------------------ comparison -- */

function Comparison({ rows, picked, onPick }: { rows: LocationRow[]; picked: string; onPick: (id: string) => void }) {
  const [view, setView] = React.useState<"status" | "rate">("status")
  const data = rows.map((r) => ({
    id: r.location.id,
    name: r.location.name,
    active: r.active,
    invited: r.invited,
    declined: r.patients.filter((p) => p.status === "Declined").length,
    inactive: r.patients.filter((p) => p.status === "Inactive").length,
    rate: r.enrollRate,
  }))
  const at = picked ? data.findIndex((d) => d.id === picked) : undefined
  const pickBar = (d: Record<string, unknown>) => onPick(d.id === picked ? "" : String(d.id))
  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Locations compared"
        actions={
          <SegmentedControl
            label="Compare by"
            value={view}
            onChange={setView}
            items={[
              { value: "status", label: "Patients by status" },
              { value: "rate", label: "Enrollment rate" },
            ]}
          />
        }
      />
      <CardBody className="flex flex-1 flex-col gap-3">
        {view === "status" ? (
          <>
            <ReLegend series={STATUS_SERIES} />
            <ReBarChart
              data={data}
              xKey="name"
              series={STATUS_SERIES}
              stacked
              showYAxis
              height={260}
              highlight={at === -1 ? undefined : at}
              onBarClick={pickBar}
            />
          </>
        ) : (
          <ReBarChart
            data={data}
            xKey="name"
            series={[{ key: "rate", label: "Enrollment rate", color: "var(--primary)", fill: "gradient" }]}
            showYAxis
            height={286}
            highlight={at === -1 ? undefined : at}
            valueFormat={(v) => `${v}%`}
            referenceY={{ value: pct(data.reduce((s, d) => s + d.active, 0), data.reduce((s, d) => s + d.active + d.invited + d.declined, 0)), label: "Practice" }}
            onBarClick={pickBar}
          />
        )}
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------ encounters -- */

function EncounterMix({ enc, scope, period }: { enc: Record<string, number>; scope: string; period: string }) {
  const slices: ReSlice[] = ENCOUNTER_TYPES.map((t) => ({ key: t.id, label: t.label, value: enc[t.id] ?? 0, color: ENCOUNTER_COLOR[t.id] }))
  const [active, setActive] = React.useState<string>("askInlay")
  return (
    <Card>
      <CardHeader title="Encounters by type" description={`${scope}, ${period}`} actions={<CardLink href={HREF.report(ENCOUNTERS)}>Report</CardLink>} />
      <CardBody className="flex flex-1 flex-col gap-2">
        <ReDonut
          data={slices}
          active={active}
          onSelect={setActive}
          height={190}
          centerValue={(enc.total ?? 0).toLocaleString("en-US")}
          centerLabel="Encounters"
        />
        <ReDonutLegend data={slices} active={active} onSelect={setActive} />
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------ team -- */

function Team({ rows, picked }: { rows: LocationRow[]; picked: string }) {
  const scoped = picked ? rows.filter((r) => r.location.id === picked) : rows
  const provs = [...new Map(scoped.flatMap((r) => r.providers).map((p) => [p.id, p])).values()]
  const staff = [...new Map(scoped.flatMap((r) => r.staff).map((s) => [s.id, s])).values()]
  return (
    <Card>
      <CardHeader
        title="Who works here"
        count={<Badge tone="light">{provs.length + staff.length}</Badge>}
        actions={<CardLink href={HREF.users}>Users</CardLink>}
      />
      <div className="no-scrollbar flex max-h-[360px] flex-col overflow-y-auto">
        <Group label="Providers" count={provs.length}>
          {provs.map((p) => (
            <PersonRow
              key={p.id}
              href={HREF.provider(p.id)}
              name={providerName(p)}
              photo={p.photo}
              meta={p.specialty}
              aside={`${scoped.flatMap((r) => r.patients).filter((x) => x.providerId === p.id).length} patients`}
            />
          ))}
        </Group>
        <Group label="Staff" count={staff.length}>
          {staff.map((s) => (
            <PersonRow
              key={s.id}
              href={HREF.staff}
              name={fullName(s)}
              photo={s.photo}
              meta={s.role}
              aside={s.status === "Invited" ? <Badge tone="info" dot>Invited</Badge> : undefined}
            />
          ))}
        </Group>
      </div>
    </Card>
  )
}

function Group({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <section className="flex flex-col">
      <h3 className="flex items-center justify-between bg-surface-head px-4 py-1.5 text-xs font-medium text-muted-foreground">
        {label}
        <span className="tabular-nums">{count}</span>
      </h3>
      {count ? <ul className="flex flex-col divide-y divide-border">{children}</ul> : <p className="px-4 py-3 text-[13px] text-muted-foreground">None yet</p>}
    </section>
  )
}

function PersonRow({ href, name, photo, meta, aside }: { href: string; name: string; photo?: string; meta: string; aside?: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className={cn("flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/60", FOCUS)}>
        <Avatar name={name} photo={photo} size={30} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="truncate text-xs text-muted-foreground">{meta}</span>
        </span>
        {aside && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{aside}</span>}
      </Link>
    </li>
  )
}

/* ----------------------------------------------------------- hours -- */

function Hours({ rows, picked }: { rows: LocationRow[]; picked: string }) {
  const one = picked ? rows.find((r) => r.location.id === picked)?.location : undefined
  const today = weekday()
  return (
    <Card>
      <CardHeader title={one ? "Working hours" : "Open today"} description={today} actions={<CardLink href={one ? HREF.location(one.id) : HREF.locations}>{one ? "Location" : "Locations"}</CardLink>} />
      <ul className="flex flex-col divide-y divide-border">
        {one
          ? one.hours.map((h) => (
              <li key={h.day} className={cn("flex items-center gap-3 px-4 py-2.5 text-[13px]", h.day === today && "bg-primary-surface/50")}>
                <span className={cn("w-24 shrink-0", h.day === today ? "font-semibold" : "text-muted-foreground")}>{h.day}</span>
                <span className={cn("ml-auto tabular-nums", !h.open && "text-muted-foreground")}>
                  {h.open ? `${time12(h.start)} to ${time12(h.end)}` : "Closed"}
                </span>
              </li>
            ))
          : rows.map((r) => {
              const h = hoursToday(r.location)
              const inactive = r.location.status === "Inactive"
              return (
                <li key={r.location.id} className="flex items-center gap-3 px-4 py-2.5">
                  <IconClock className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{r.location.name}</span>
                    <span className="truncate text-xs text-muted-foreground tabular-nums">{inactive ? "Location inactive" : h.text}</span>
                  </span>
                  <Badge tone={!inactive && h.open ? "success" : "light"} dot>
                    {!inactive && h.open ? "Open now" : "Closed"}
                  </Badge>
                </li>
              )
            })}
      </ul>
    </Card>
  )
}

/* --------------------------------------------------- still invited -- */

function StillInvited({ rows, picked, today, remindersSent }: { rows: LocationRow[]; picked: string; today: string; remindersSent: (p: LocationRow["patients"][number]) => number }) {
  const invited = (picked ? rows.filter((r) => r.location.id === picked) : rows)
    .flatMap((r) => r.patients.filter((p) => p.status === "Invited").map((p) => ({ p, at: r.location.name })))
    .sort((a, b) => a.p.invitedAt.localeCompare(b.p.invitedAt))
  return (
    <Card>
      <CardHeader
        title="Still invited"
        count={<Badge tone="info">{invited.length}</Badge>}
        actions={<CardLink href={HREF.patients}>Patients</CardLink>}
      />
      {invited.length ? (
        <ul className="no-scrollbar flex max-h-[360px] flex-col divide-y divide-border overflow-y-auto">
          {invited.map(({ p, at }) => {
            const d = daysAgo(p.invitedAt, today)
            const sent = remindersSent(p)
            return (
              <li key={p.id}>
                <Link href={HREF.patient(p.id)} className={cn("flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/60", FOCUS)}>
                  <Avatar name={fullName(p)} photo={p.photo} size={30} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{fullName(p)}</span>
                    <span className="truncate text-xs text-muted-foreground tabular-nums">
                      {picked ? `Invited ${plural(d, "day")} ago` : `${at}, invited ${plural(d, "day")} ago`}
                    </span>
                  </span>
                  <Badge tone={d >= 21 ? "warning" : "light"} icon={undefined}>
                    {sent ? `Reminder ${sent} of 4` : "Invite sent"}
                  </Badge>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="flex flex-1 items-center gap-3 px-4 py-6 text-[13px] text-muted-foreground">
          <IconMail className="size-4" />
          Everyone invited here has answered
        </div>
      )}
    </Card>
  )
}

/* ---------------------------------------------------------- screen -- */

export function PracticeDashboardV5() {
  const ops = usePracticeOps()
  const [kind, setKind] = React.useState<PeriodKind>("Month")
  const [picked, setPicked] = React.useState("")
  const totals = useReportTotals(kind, picked)

  const rows = ops.locationRows
  const row = rows.find((r) => r.location.id === picked)
  const scopeName = row ? row.location.name : "All locations"
  const scopedPatients = row ? row.patients : ops.patients
  const answered = (ps: typeof scopedPatients) => ps.filter((p) => p.status !== "Inactive").length
  const liveRate = pct(
    scopedPatients.filter((p) => p.status === "Active").length,
    answered(scopedPatients)
  )
  const addedLast30 = scopedPatients.filter((p) => daysAgo(p.registrationDate, ops.today) <= 30).length
  const addedPrior30 = scopedPatients.filter((p) => {
    const d = daysAgo(p.registrationDate, ops.today)
    return d > 30 && d <= 60
  }).length

  const { now, before, trend } = totals
  const rate = (c: Record<string, number>) => pct(c.enrolled ?? 0, c.added ?? 0)
  const span = `${now.period.label} vs ${before.period.label}`

  const all = {
    patients: ops.patients.length,
    providers: ops.activeProviders.length,
    staff: ops.staff.filter((s) => s.status !== "Inactive").length,
    enrollRate: pct(ops.byStatus.Active.length, ops.patients.filter((p) => p.status !== "Inactive").length),
  }

  return (
    <VariantFrame>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg leading-7 font-semibold">{scopeName}</h1>
        <SegmentedControl
          className="ml-auto"
          label="Period"
          value={kind}
          onChange={setKind}
          items={[
            { value: "Month", label: "Month" },
            { value: "Quarter", label: "Quarter" },
            { value: "Year", label: "Year" },
          ]}
        />
      </header>

      {ops.ready ? (
        <LocationStrip rows={rows} all={all} picked={picked} onPick={setPicked} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[150px] rounded-[7.2px]" />
          ))}
        </div>
      )}

      <section aria-label={`${scopeName} at a glance`} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {ops.ready ? (
          <>
            <MetricCard
              icon={UserGroupIcon}
              label="Patients"
              value={scopedPatients.length}
              series={trend.map((t) => t.enroll.added)}
              color={SUBTLE.blue}
              badge={<Change now={addedLast30} before={addedPrior30} />}
              delta={`${addedLast30} added in the last 30 days`}
            />
            <MetricCard
              icon={UserAdd01Icon}
              label="Enrollment rate, %"
              value={liveRate}
              series={trend.map((t) => rate(t.enroll))}
              color={SUBTLE.green}
              badge={<Change now={rate(now.enroll)} before={rate(before.enroll)} unit=" pts" />}
              delta={span}
            />
            <MetricCard
              icon={Message01Icon}
              label="Encounters"
              value={now.enc.total ?? 0}
              series={trend.map((t) => t.enc.total ?? 0)}
              color="var(--primary)"
              badge={<Change now={now.enc.total ?? 0} before={before.enc.total ?? 0} />}
              delta={span}
            />
            <MetricCard
              icon={Alert02Icon}
              label="Open alerts"
              value={now.alerts.open ?? 0}
              series={trend.map((t) => t.alerts.open ?? 0)}
              color={SUBTLE.orange}
              badge={<Change now={now.alerts.open ?? 0} before={before.alerts.open ?? 0} goodWhen="down" />}
              delta={`${now.alerts.raised ?? 0} raised in ${now.period.label}`}
            />
            <MetricCard
              icon={CreditCardIcon}
              label="Optimization members"
              value={now.value.members ?? 0}
              series={trend.map((t) => t.value.members ?? 0)}
              color={SUBTLE.violet}
              badge={<Change now={now.value.members ?? 0} before={before.value.members ?? 0} />}
              delta={`${now.value.newMembers ?? 0} new in ${now.period.label}`}
            />
          </>
        ) : (
          Array.from({ length: 5 }, (_, i) => <MetricCardSkeleton key={i} />)
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Comparison rows={rows} picked={picked} onPick={setPicked} />
        <EncounterMix enc={now.enc} scope={scopeName} period={now.period.label} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Team rows={rows} picked={picked} />
        <Hours rows={rows} picked={picked} />
        <StillInvited rows={rows} picked={picked} today={ops.today} remindersSent={ops.remindersSent} />
      </div>

    </VariantFrame>
  )
}
