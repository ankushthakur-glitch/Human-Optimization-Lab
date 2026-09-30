"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"

import { cn } from "@/lib/utils"
import {
  Illustration,
  type IllustrationName,
} from "@/components/illustrations/illustration"
import {
  type Patient,
  fullName,
  patients,
  time12,
} from "@/components/practice/practice-data"
import { SideSheet, SideSheetHeader } from "@/components/practice/sheets"
import { ProviderShell } from "@/components/provider/provider-shell"
import {
  type AbnormalResult,
  type ChartLink,
  type Escalation,
  type GapKind,
  OWN_EHR,
  QUEUE_TREND,
  type QueueItem,
  type QueueKey,
  REMINDER_LIMIT,
  type RuleAlert,
  VISITS_SEED,
  abnormalResults,
  daysBetween,
  escalations,
  ruleAlerts,
  todayIso,
  workQueue,
} from "@/components/provider/worklist"
import { Avatar, AvatarFallback, AvatarImage } from "@/design-system/ui/avatar"
import { Button } from "@/design-system/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/design-system/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/design-system/ui/chart"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/design-system/ui/empty"
import {
  InsightCard,
  InsightCardLabel,
  InsightCardValue,
  InsightSparkline,
} from "@/design-system/ui/insight-card"
import { LogoLoader } from "@/design-system/ui/logo-loader"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"

/* The provider's home. From the 28 Sep calls: the doctor is not pushed
   notifications, so everything that needs them waits here, across all their
   patients, to be cleared in one pass. Abnormal results come first (an
   outside result is the one thing marked new), then the day's visits,
   medication changes with their source, orders the patient never completed
   after three reminders, care gaps, and care the doctor was not told about.

   Laid out in the product's quiet language: soft grey panels on white, no
   borders or rules, big numbers, status as a dot and a word. Every row opens
   the chart at the section it concerns; a queue opens in a side sheet kept
   in ?queue= so it survives a reload. */

const BASE = "/screens/patients"

function chartHref(patientId: string, link: ChartLink = {}) {
  const query = new URLSearchParams()
  if (link.section && link.section !== "dashboard")
    query.set("section", link.section)
  if (link.tab) query.set("tab", link.tab)
  const qs = query.toString()
  return `${BASE}/${patientId}${qs ? `?${qs}` : ""}`
}

function shortDay(iso: string) {
  const ago = daysBetween(iso, todayIso())
  if (ago === 0) return "Today"
  if (ago === 1) return "Yesterday"
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function initials(p: Patient) {
  return `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`
}

/* ------------------------------------------------------------ queues -- */

type QueueMeta = { key: QueueKey; label: string }

const QUEUES: QueueMeta[] = [
  { key: "biomarkers", label: "Out of target" },
  { key: "medications", label: "Medication changes" },
  { key: "care-gaps", label: "Care gaps" },
  { key: "escalated", label: "Escalated orders" },
  { key: "off-ranch", label: "Care outside the practice" },
  { key: "off-plan", label: "Off the care plan" },
]

const isQueue = (value: string | null): value is QueueKey =>
  QUEUES.some((q) => q.key === value)

/* ---------------------------------------------------------- building -- */

const PANEL =
  "gap-4 rounded-2xl bg-surface-sunken py-5 shadow-none ring-0 [--card-spacing:--spacing(5)]"

/** A soft, borderless panel: a title with its count, then the content. */
function Panel({
  title,
  count,
  action,
  className,
  children,
}: {
  title: string
  count?: number
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={cn(PANEL, className)}>
      <CardHeader className="items-center">
        <CardTitle className="flex items-baseline gap-2 text-[15px] font-semibold">
          {title}
          {count !== undefined && (
            <span className="text-[13px] font-normal text-muted-foreground tabular-nums">
              {count}
            </span>
          )}
        </CardTitle>
        {action && <CardAction className="self-center">{action}</CardAction>}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {children}
      </CardContent>
    </Card>
  )
}

function ViewAll({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-my-1 text-muted-foreground"
      onClick={onClick}
    >
      View all
    </Button>
  )
}

/** Status as a small dot and a word. */
function Dot({
  tone,
  children,
}: {
  tone: "destructive" | "warning" | "primary" | "muted"
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        tone === "destructive" && "text-destructive",
        tone === "warning" && "text-warning",
        tone === "primary" && "text-primary",
        tone === "muted" && "text-muted-foreground"
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      {children}
    </span>
  )
}

function Nothing({
  title,
  illustration,
}: {
  title: string
  illustration: IllustrationName
}) {
  return (
    <Empty className="flex-1 border-0 p-6">
      <EmptyHeader>
        <EmptyMedia>
          <Illustration name={illustration} />
        </EmptyMedia>
        <EmptyTitle className="text-sm font-medium">{title}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

/** The row's main link, stretched over the whole row. */
function RowLink({
  href,
  onOpen,
  className,
  children,
}: {
  href: string
  onOpen?: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onOpen}
      className={cn(
        "truncate outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50",
        className
      )}
    >
      {children}
    </Link>
  )
}

/* Rows sit on the panel with no rules between them; hover is the divider. */
const ROW = "relative border-0 hover:bg-surface-hover/70"
const HEAD_ROW = "border-0 hover:bg-transparent"
const HEAD = "h-8 text-xs font-normal text-muted-foreground"

/** A person in a row: avatar, name, and a muted second line. */
function Person({
  patient,
  href,
  onOpen,
  strong,
  meta,
}: {
  patient: Patient
  href: string
  onOpen?: () => void
  strong?: boolean
  meta: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={patient.photo} alt="" />
        <AvatarFallback className="text-xs">{initials(patient)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <RowLink
          href={href}
          onOpen={onOpen}
          className={cn("text-sm text-foreground", strong && "font-medium")}
        >
          {fullName(patient)}
        </RowLink>
        <span className="truncate text-xs text-muted-foreground">{meta}</span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------- the screen -- */

export function ProviderDashboard() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const asked = params.get("queue")
  const openQueue = isQueue(asked) ? asked : null

  const { items: roster, ready } = patients.use()
  const { items: results } = abnormalResults.use()
  const { items: queue } = workQueue.use()
  const { items: escalated } = escalations.use()
  const { items: alerts } = ruleAlerts.use()

  const byId = React.useMemo(
    () => new Map(roster.map((p) => [p.id, p])),
    [roster]
  )

  function setQueue(next: QueueKey | null) {
    router.replace(next ? `${pathname}?queue=${next}` : pathname, {
      scroll: false,
    })
  }

  /* Sample dates are relative to today, so wait for the client's today. */
  if (!ready) {
    return (
      <ProviderShell active="dashboard">
        <div className="flex min-h-[60vh] flex-1 items-center justify-center">
          <LogoLoader kind="ripple" label="Loading dashboard" />
        </div>
      </ProviderShell>
    )
  }

  /* A row whose patient has since been removed is dropped, not shown blank. */
  const known = <T extends { patientId: string }>(rows: T[]) =>
    rows.filter((r) => byId.has(r.patientId))
  const liveResults = known(results)
  const liveQueue = known(queue)
  const liveEscalated = known(escalated)
  const liveAlerts = known(alerts)

  const rowsFor = (key: QueueKey): (QueueItem | Escalation)[] =>
    key === "escalated"
      ? liveEscalated
      : liveQueue.filter((q) => q.queue === key)
  const patientsIn = (key: QueueKey) =>
    new Set(rowsFor(key).map((r) => r.patientId)).size

  const allOpen = [
    ...liveResults,
    ...liveQueue,
    ...liveEscalated,
    ...liveAlerts,
  ]
  const openFor = (patientId: string) =>
    allOpen.filter((r) => r.patientId === patientId).length

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <ProviderShell active="dashboard">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pt-6 pb-10 sm:px-8">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {greeting}
            </h1>
            <span className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
          </header>

          <QueueTiles
            count={patientsIn}
            items={(key) => rowsFor(key).length}
            onPick={setQueue}
          />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <AbnormalResults rows={liveResults} byId={byId} />
            <Visits byId={byId} openFor={openFor} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <MedicationChanges
              rows={liveQueue.filter((q) => q.queue === "medications")}
              byId={byId}
              onAll={() => setQueue("medications")}
            />
            <Escalations
              rows={liveEscalated}
              byId={byId}
              onAll={() => setQueue("escalated")}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <CareGaps
              rows={liveQueue.filter((q) => q.queue === "care-gaps")}
              onAll={() => setQueue("care-gaps")}
            />
            <OutsideCare
              rows={liveQueue.filter((q) => q.queue === "off-ranch")}
              byId={byId}
              onAll={() => setQueue("off-ranch")}
            />
            <RuleAlerts rows={liveAlerts} byId={byId} />
          </div>
        </div>
      </div>

      <SideSheet
        open={openQueue !== null}
        onOpenChange={(open) => !open && setQueue(null)}
      >
        {openQueue && (
          <QueueSheet
            queue={openQueue}
            rows={rowsFor(openQueue)}
            patientCount={patientsIn(openQueue)}
            byId={byId}
          />
        )}
      </SideSheet>
    </ProviderShell>
  )
}

/* ------------------------------------------------------- queue tiles -- */

function QueueTiles({
  count,
  items,
  onPick,
}: {
  count: (key: QueueKey) => number
  items: (key: QueueKey) => number
  onPick: (key: QueueKey) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {QUEUES.map((q) => {
        const now = count(q.key)
        /* The trend is the last 8 weeks, with this week swapped for now. */
        const trend = [...QUEUE_TREND[q.key].slice(0, -1), now]
        const lastWeek = QUEUE_TREND[q.key].at(-2) ?? now
        const change = now - lastWeek
        const n = items(q.key)
        return (
          <button
            key={q.key}
            type="button"
            onClick={() => onPick(q.key)}
            className="rounded-2xl text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <InsightCard className="h-full gap-1 rounded-2xl border-0 bg-surface-sunken p-4 transition-colors hover:bg-surface-hover">
              <InsightCardLabel className="flex items-center gap-1.5 text-[13px] font-normal">
                {q.key === "escalated" && now > 0 && (
                  <span className="size-1.5 rounded-full bg-destructive" />
                )}
                <span className="truncate">{q.label}</span>
              </InsightCardLabel>
              <InsightCardValue className="text-3xl font-semibold">
                {now}
              </InsightCardValue>
              <span className="text-xs text-muted-foreground">
                {now === 1 ? "patient" : "patients"}, {n}{" "}
                {n === 1 ? "item" : "items"}
              </span>
              <InsightSparkline
                points={trend}
                className="mt-2 h-6 text-muted-foreground/60"
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {change === 0
                  ? "Same as last week"
                  : `${change > 0 ? "+" : ""}${change} vs last week`}
              </span>
            </InsightCard>
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------- abnormal results -- */

function AbnormalResults({
  rows,
  byId,
}: {
  rows: AbnormalResult[]
  byId: Map<string, Patient>
}) {
  /* Unread outside results first, then newest. */
  const sorted = [...rows].sort(
    (a, b) =>
      Number(b.unread) - Number(a.unread) || b.date.localeCompare(a.date)
  )
  const fresh = rows.filter((r) => r.unread).length

  return (
    <Panel
      title="Abnormal results"
      count={rows.length}
      action={
        fresh > 0 ? <Dot tone="primary">{fresh} new from outside</Dot> : null
      }
    >
      {sorted.length === 0 ? (
        <Nothing
          title="No abnormal results to review"
          illustration="biomarkers-in-range"
        />
      ) : (
        <Table className="-mx-2 w-[calc(100%+1rem)]">
          <TableHeader className="[&_tr]:border-0">
            <TableRow className={HEAD_ROW}>
              <TableHead className={cn(HEAD, "pl-2")}>Patient</TableHead>
              <TableHead className={HEAD}>Result</TableHead>
              <TableHead className={cn(HEAD, "hidden md:table-cell")}>
                Source
              </TableHead>
              <TableHead className={cn(HEAD, "pr-2 text-right")}>
                Date
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => {
              const patient = byId.get(r.patientId)!
              return (
                <TableRow key={r.id} className={ROW}>
                  <TableCell className="py-2 pl-2">
                    <Person
                      patient={patient}
                      href={chartHref(r.patientId, { section: "labs" })}
                      onOpen={() =>
                        r.unread &&
                        abnormalResults.patch(r.id, { unread: false })
                      }
                      strong={r.unread}
                      meta={<span className="font-mono">{patient.id}</span>}
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm">
                        {r.test}{" "}
                        <span className="font-medium tabular-nums">
                          {r.value}
                        </span>{" "}
                        <span className="text-xs text-muted-foreground">
                          {r.unit}
                        </span>
                      </span>
                      <Dot tone="destructive">
                        {r.flag === "high" ? "High" : "Low"}
                      </Dot>
                    </div>
                  </TableCell>
                  <TableCell className="hidden py-2 md:table-cell">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] text-muted-foreground">
                        {r.source}
                      </span>
                      {r.unread && <Dot tone="primary">New</Dot>}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 pr-2 text-right text-xs text-muted-foreground">
                    {shortDay(r.date)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------------ visits -- */

function Visits({
  byId,
  openFor,
}: {
  byId: Map<string, Patient>
  openFor: (patientId: string) => number
}) {
  const today = todayIso()
  const upcoming = VISITS_SEED.filter(
    (v) => byId.has(v.patientId) && v.date >= today
  ).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))

  const days = [...new Set(upcoming.map((v) => v.date))]

  return (
    <Panel title="Upcoming visits" count={upcoming.length}>
      {upcoming.length === 0 ? (
        <Nothing
          title="No visits scheduled"
          illustration="appointments-empty"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((day) => (
            <section key={day} className="flex flex-col gap-1">
              <h3 className="text-xs text-muted-foreground">
                {day === today
                  ? "Today"
                  : daysBetween(today, day) === 1
                    ? "Tomorrow"
                    : shortDay(day)}
              </h3>
              <ul className="-mx-2 flex flex-col">
                {upcoming
                  .filter((v) => v.date === day)
                  .map((v) => {
                    const patient = byId.get(v.patientId)!
                    const open = openFor(v.patientId)
                    return (
                      <li
                        key={v.id}
                        className="relative flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-hover/70"
                      >
                        <span className="w-16 shrink-0 text-[13px] text-muted-foreground tabular-nums">
                          {time12(v.time)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Person
                            patient={patient}
                            href={chartHref(v.patientId)}
                            strong
                            meta={v.reason}
                          />
                        </div>
                        {open > 0 && (
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            {open} open
                          </span>
                        )}
                      </li>
                    )
                  })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Panel>
  )
}

/* ------------------------------------------------ medication changes -- */

function MedicationChanges({
  rows,
  byId,
  onAll,
}: {
  rows: QueueItem[]
  byId: Map<string, Patient>
  onAll: () => void
}) {
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date))
  const people = new Set(rows.map((r) => r.patientId)).size

  return (
    <Panel
      title="Medication changes"
      count={people}
      action={rows.length > 6 ? <ViewAll onClick={onAll} /> : null}
    >
      {sorted.length === 0 ? (
        <Nothing
          title="Every medication list matches yours"
          illustration="review-resolved"
        />
      ) : (
        <Table className="-mx-2 w-[calc(100%+1rem)]">
          <TableHeader className="[&_tr]:border-0">
            <TableRow className={HEAD_ROW}>
              <TableHead className={cn(HEAD, "pl-2")}>Patient</TableHead>
              <TableHead className={HEAD}>Change</TableHead>
              <TableHead className={cn(HEAD, "pr-2 text-right")}>
                Date
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.slice(0, 6).map((r) => {
              const patient = byId.get(r.patientId)!
              return (
                <TableRow key={r.id} className={ROW}>
                  <TableCell className="w-[34%] py-2 pl-2">
                    <Person
                      patient={patient}
                      href={chartHref(r.patientId, r.link)}
                      strong
                      meta={<span className="font-mono">{patient.id}</span>}
                    />
                  </TableCell>
                  <TableCell className="py-2 whitespace-normal">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm">{r.title}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {r.source}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 pr-2 text-right text-xs text-muted-foreground">
                    {shortDay(r.date)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------- escalations -- */

function Escalations({
  rows,
  byId,
  onAll,
}: {
  rows: Escalation[]
  byId: Map<string, Patient>
  onAll: () => void
}) {
  const today = todayIso()
  const sorted = [...rows].sort(
    (a, b) =>
      daysBetween(b.startsAt ?? b.orderedAt, today) -
      daysBetween(a.startsAt ?? a.orderedAt, today)
  )

  return (
    <Panel
      title="Escalated orders"
      count={rows.length}
      action={rows.length > 5 ? <ViewAll onClick={onAll} /> : null}
    >
      {sorted.length === 0 ? (
        <Nothing
          title="No orders past their reminders"
          illustration="review-resolved"
        />
      ) : (
        <ul className="-mx-2 flex flex-col">
          {sorted.slice(0, 5).map((e) => {
            const patient = byId.get(e.patientId)!
            const age = daysBetween(e.startsAt ?? e.orderedAt, today)
            return (
              <li
                key={e.id}
                className="relative flex items-start justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-hover/70"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <RowLink
                    href={chartHref(e.patientId, e.link)}
                    className="text-sm font-medium text-foreground"
                  >
                    {e.item}
                  </RowLink>
                  <span className="truncate text-xs text-muted-foreground">
                    {fullName(patient)}, {e.stage.toLowerCase()}, {e.reminders}{" "}
                    of {REMINDER_LIMIT} reminders
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-sm font-medium tabular-nums">
                    {age} days
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {e.kind}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/* ---------------------------------------------------------- care gaps -- */

const GAP_KINDS: GapKind[] = [
  "Preventive",
  "Uncontrolled condition",
  "Missed follow-up",
  "Order not completed",
]

const gapConfig = {
  count: { label: "Care gaps", color: "var(--primary)" },
} satisfies ChartConfig

function CareGaps({ rows, onAll }: { rows: QueueItem[]; onAll: () => void }) {
  const data = GAP_KINDS.map((kind) => ({
    kind,
    count: rows.filter((r) => r.kind === kind).length,
  }))

  return (
    <Panel
      title="Care gaps"
      count={rows.length}
      action={rows.length > 0 ? <ViewAll onClick={onAll} /> : null}
    >
      {rows.length === 0 ? (
        <Nothing title="No care gaps" illustration="review-resolved" />
      ) : (
        <ChartContainer config={gapConfig} className="aspect-auto h-44 w-full">
          <BarChart
            data={data}
            layout="vertical"
            barSize={10}
            margin={{ top: 0, right: 28, bottom: 0, left: 0 }}
          >
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="kind"
              width={190}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 13 }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel={false} />}
            />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={999}
              background={{ fill: "var(--viz-track)", radius: 999 }}
            >
              <LabelList
                dataKey="count"
                position="right"
                className="fill-foreground text-[13px] font-medium"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------ outside care -- */

function OutsideCare({
  rows,
  byId,
  onAll,
}: {
  rows: QueueItem[]
  byId: Map<string, Patient>
  onAll: () => void
}) {
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <Panel
      title="Care outside the practice"
      count={rows.length}
      action={rows.length > 4 ? <ViewAll onClick={onAll} /> : null}
    >
      {sorted.length === 0 ? (
        <Nothing
          title="No care outside the practice"
          illustration="review-resolved"
        />
      ) : (
        <ul className="-mx-2 flex flex-col">
          {sorted.slice(0, 4).map((r) => (
            <SimpleRow
              key={r.id}
              href={chartHref(r.patientId, r.link)}
              title={r.title}
              meta={`${fullName(byId.get(r.patientId)!)}, ${r.source}`}
              aside={shortDay(r.date)}
            />
          ))}
        </ul>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------- rule alerts -- */

function RuleAlerts({
  rows,
  byId,
}: {
  rows: RuleAlert[]
  byId: Map<string, Patient>
}) {
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <Panel title="Rule alerts" count={rows.length}>
      {sorted.length === 0 ? (
        <Nothing
          title="No readings outside a rule"
          illustration="review-resolved"
        />
      ) : (
        <ul className="-mx-2 flex flex-col">
          {sorted.map((a) => (
            <SimpleRow
              key={a.id}
              href={chartHref(a.patientId, {
                section: "vitals",
                tab: "trends",
              })}
              title={fullName(byId.get(a.patientId)!)}
              meta={a.rule}
              aside={<Dot tone="warning">{a.reading}</Dot>}
            />
          ))}
        </ul>
      )}
    </Panel>
  )
}

function SimpleRow({
  href,
  title,
  meta,
  aside,
}: {
  href: string
  title: string
  meta: string
  aside: React.ReactNode
}) {
  return (
    <li className="relative flex items-start justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-hover/70">
      <div className="flex min-w-0 flex-col gap-0.5">
        <RowLink href={href} className="text-sm font-medium text-foreground">
          {title}
        </RowLink>
        <span className="truncate text-xs text-muted-foreground">{meta}</span>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{aside}</span>
    </li>
  )
}

/* ------------------------------------------------------- queue sheet -- */

function QueueSheet({
  queue,
  rows,
  patientCount,
  byId,
}: {
  queue: QueueKey
  rows: (QueueItem | Escalation)[]
  patientCount: number
  byId: Map<string, Patient>
}) {
  const meta = QUEUES.find((q) => q.key === queue)!
  const sorted = [...rows].sort((a, b) =>
    ("date" in b ? b.date : b.orderedAt).localeCompare(
      "date" in a ? a.date : a.orderedAt
    )
  )

  return (
    <>
      <SideSheetHeader
        title={meta.label}
        description={`${patientCount} patients in the ${meta.label.toLowerCase()} queue`}
        badge={
          <span className="text-sm font-normal text-muted-foreground tabular-nums">
            {patientCount} {patientCount === 1 ? "patient" : "patients"}
          </span>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {sorted.length === 0 ? (
          <Nothing
            title="Nothing left in this queue"
            illustration="review-resolved"
          />
        ) : (
          <ul className="flex flex-col">
            {sorted.map((r) => {
              const patient = byId.get(r.patientId)!
              const isItem = "title" in r
              return (
                <li
                  key={r.id}
                  className="relative flex items-start justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-hover/70"
                >
                  <Person
                    patient={patient}
                    href={chartHref(r.patientId, r.link)}
                    strong
                    meta={
                      isItem
                        ? `${r.kind ? `${r.kind}: ` : ""}${r.title}`
                        : `${r.item}, ${r.stage.toLowerCase()}`
                    }
                  />
                  <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground">
                    <span>{shortDay(isItem ? r.date : r.orderedAt)}</span>
                    <span className="max-w-40 truncate">
                      {isItem
                        ? r.source === OWN_EHR
                          ? "Your EHR"
                          : r.source
                        : `${r.reminders} of ${REMINDER_LIMIT} reminders`}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
