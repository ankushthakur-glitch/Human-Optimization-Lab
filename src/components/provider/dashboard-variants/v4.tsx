"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis } from "recharts"
import {
  IconArrowDown,
  IconArrowUp,
  IconCalendar,
  IconCalendarCheck,
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconDownload,
  IconFileCheck,
  IconSearch,
  IconShare,
  IconTarget,
  IconWarning,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/design-system/ui/button"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/design-system/ui/chart"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/design-system/ui/collapsible"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/design-system/ui/input-group"
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/design-system/ui/item"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/design-system/ui/select"
import { Skeleton } from "@/design-system/ui/skeleton"
import { toast } from "@/design-system/ui/sonner"
import { Switch } from "@/design-system/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"
import { type Patient, fullName } from "@/components/practice/practice-data"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import {
  AXIS_PROPS,
  Avatar,
  Badge,
  Card,
  CardHeader,
  ChartCard,
  DataTable,
  Grid,
  Legend,
  Row,
  Td,
  Th,
  type Tone,
  useReducedMotion,
} from "@/components/dashboard-kit-v2"
import { clockTime } from "@/components/provider/mock-clock"
import { daysSince } from "@/components/provider/home-v2/clock"
import { type Act, ItemPanel } from "@/components/provider/home-v2/item-panel"
import { TYPE_META, chartHref, itemDetail, itemName } from "@/components/provider/home-v2/labels"
import { recordAudit, workItems } from "@/components/provider/home-v2/mock"
import {
  FooterLink,
  type Segment,
  SegmentBar,
  StatCard,
  StatCardSkeleton,
} from "@/components/provider/home-v2/overview"
import { actionLabel, applyAction, byPriority, toQueue } from "@/components/provider/home-v2/selectors"
import type { Priority, QueueItem } from "@/components/provider/home-v2/types"
import { AppointmentDialog } from "@/components/provider/schedule/schedule"
import {
  type Appointment,
  type AppointmentStatus,
  DAY_END,
  DAY_START,
  LUNCH,
  endOf,
} from "@/components/provider/schedule/schedule-data"
import { VariantFrame } from "@/components/provider/dashboard-variants/frame"
import {
  type Optimization,
  PLAN_CATALOG,
  PLAN_STAGES,
  type PlanName,
  optimizationOf,
  useOptimization,
} from "@/components/provider/dashboard-variants/optimization-data"
import { useProviderDay } from "@/components/provider/dashboard-variants/use-provider-day"

/* Variation 4, the clinic day, laid out after ReUI's Miro clinic dashboard
   and built only from the portal's own components: a left panel with the
   day's booked time, visits by status and the next visits (each with the
   patient's plan week and biological age gap); the live dashboard's stat
   cards; plans by goal and biological age as chart cards; and the panel
   broken down by patient, plan or plan stage as a heat table of progress,
   symptoms, watchful trends, open items and baseline tests to route. */

const BASE = "/screens/patients"
const ACTOR = "Daniel Reyes, MD"

const SHORT = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" })

/** "2h 15m", "45m", "3h". */
function hm(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`
}

const STATUS_TONE: Record<AppointmentStatus, Tone> = {
  Scheduled: "info",
  "Checked in": "warning",
  Completed: "success",
  "No show": "error",
  Cancelled: "light",
}

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  Scheduled: SUBTLE.blue,
  "Checked in": SUBTLE.orange,
  Completed: SUBTLE.green,
  "No show": SUBTLE.red,
  Cancelled: "#B5B5B5",
}

const STATUS_ORDER: AppointmentStatus[] = ["Checked in", "Scheduled", "Completed", "No show", "Cancelled"]

const PRIORITY_LABEL: Record<Priority, string> = { urgent: "Urgent", moderate: "Moderate", routine: "Routine" }

const upcoming = (a: Appointment) => a.status === "Scheduled" || a.status === "Checked in"

/* ------------------------------------------------------------- page -- */

export function DashboardTriage() {
  const { ready, byId, open, urgent, now, clinic, work } = useProviderDay()
  const opt = useOptimization()
  const all = React.useMemo(() => work.map(toQueue), [work])
  const [visitId, setVisitId] = React.useState<string | null>(null)
  const [panel, setPanel] = React.useState<{ id: string; list: string[] } | null>(null)
  const openerRef = React.useRef<HTMLElement | null>(null)

  const loaded = ready && !!now
  const current = panel ? (all.find((i) => i.id === panel.id) ?? null) : null
  const at = panel ? panel.list.indexOf(panel.id) : -1
  const step = (d: -1 | 1) =>
    panel && panel.list[at + d] ? () => setPanel({ ...panel, id: panel.list[at + d]! }) : undefined

  /* Work the item, toast it with Undo, then walk on to the next. */
  const act: Act = (kind, opts = {}) => {
    if (!panel) return
    const item = work.find((i) => i.id === panel.id)
    if (!item) return
    const snapshot = { ...item }
    workItems.patch(item.id, applyAction(kind, opts))
    recordAudit(ACTOR, [kind, opts.reason ?? (opts.days && `${opts.days} days`)].filter(Boolean).join(": "), item.id)
    toast.success(actionLabel(kind, opts), {
      description: itemName(item),
      action: {
        label: "Undo",
        onClick: () => {
          workItems.patch(item.id, snapshot)
          recordAudit(ACTOR, "undo", item.id)
        },
      },
    })
    const rest = panel.list.filter((id) => id !== item.id)
    const next = rest[at] ?? rest[at - 1]
    setPanel(next ? { id: next, list: rest } : null)
  }

  return (
    <VariantFrame padded={false}>
      <div className="flex min-h-full flex-1 flex-col lg:flex-row">
        <aside className="no-scrollbar flex shrink-0 flex-col border-b border-border bg-card lg:sticky lg:top-0 lg:h-[calc(100dvh-107px)] lg:w-[290px] lg:self-start lg:overflow-y-auto lg:border-r lg:border-b-0">
          {loaded ? (
            <DayRail now={now!} day={clinic.day} title={clinic.title} byId={byId} opt={opt.all} onVisit={setVisitId} />
          ) : (
            <div className="flex flex-col gap-3 p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-40" />
              <Skeleton className="h-1.5 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:p-5">
          <header className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg leading-7 font-semibold">Clinic dashboard</h1>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" className="bg-card">
                <IconDownload />
                Export
              </Button>
              <Button size="sm">
                <IconShare />
                Share
              </Button>
            </div>
          </header>

          {loaded ? (
            <>
              <Stats today={clinic.today} open={open} urgent={urgent} opt={opt} />
              <div className="grid gap-4 xl:grid-cols-2">
                <PlansByGoal byPlan={opt.byPlan} />
                <BioAgeChart now={now!} all={opt.all} />
              </div>
              <PanelBreakdown
                opt={opt.all}
                open={open}
                byId={byId}
                selectedId={panel?.id}
                onOpen={(item, list, from) => {
                  openerRef.current = from
                  setPanel({ id: item.id, list: list.includes(item.id) ? list : [item.id] })
                }}
              />
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <StatCardSkeleton key={i} />
                ))}
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <Skeleton className="h-[340px] rounded-[7.2px]" />
                <Skeleton className="h-[340px] rounded-[7.2px]" />
              </div>
              <Skeleton className="h-[420px] rounded-[7.2px]" />
            </>
          )}
        </main>
      </div>

      <ItemPanel
        item={current}
        patient={current ? (byId.get(current.patientId) ?? null) : null}
        onPrevious={step(-1)}
        onNext={step(1)}
        onClose={() => setPanel(null)}
        returnFocus={openerRef}
        onAct={act}
      />
      {now && (
        <AppointmentDialog
          now={now}
          appointment={clinic.day.find((a) => a.id === visitId) ?? null}
          onClose={() => setVisitId(null)}
        />
      )}
    </VariantFrame>
  )
}

/* --------------------------------------------------------- the rail -- */

function RailHeading({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <span className="text-[13px] font-medium text-muted-foreground">{children}</span>
      {count !== undefined && <Badge tone="light">{count}</Badge>}
    </div>
  )
}

function DayRail({
  now,
  day,
  title,
  byId,
  opt,
  onVisit,
}: {
  now: string
  day: Appointment[]
  title: string
  byId: Map<string, Patient>
  opt: Optimization[]
  onVisit: (id: string) => void
}) {
  const optOf = React.useMemo(() => {
    const m = new Map(opt.map((o) => [o.patient.id, o]))
    return (id: string) => {
      const hit = m.get(id)
      if (hit) return hit
      const p = byId.get(id)
      return p ? optimizationOf(p) : undefined
    }
  }, [opt, byId])
  const [all, setAll] = React.useState(false)

  const isToday = day[0]?.start.startsWith(now.slice(0, 10)) ?? true
  const dateLabel = new Date(`${(day[0]?.start ?? now).slice(0, 10)}T00:00:00`)
  const booked = day.filter((a) => a.status !== "Cancelled")
  const bookedMin = booked.reduce((s, a) => s + a.minutes, 0)
  const minutesOf = (s: AppointmentStatus) => day.filter((a) => a.status === s).reduce((t, a) => t + a.minutes, 0)
  const seenMin = minutesOf("Completed")
  const inMin = minutesOf("Checked in")
  const leftMin = minutesOf("Scheduled")
  const dayMin = (DAY_END - DAY_START) * 60 - (LUNCH.end - LUNCH.start)
  const still = day.filter(upcoming)
  const shown = all ? still : still.slice(0, 5)
  const next = still[0]

  const time: Segment[] = [
    { label: "Seen", value: seenMin, color: SUBTLE.green },
    { label: "In the room", value: inMin, color: SUBTLE.orange },
    { label: "Still to come", value: leftMin, color: SUBTLE.blue },
  ]

  const nameOf = (a: Appointment) => {
    const p = byId.get(a.patientId)
    return p ? fullName(p) : a.patientId
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <span className="text-[15px] font-semibold">Clinic day</span>
        <Link
          href={`${BASE}/schedule`}
          aria-label="Open the schedule"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-muted-foreground")}
        >
          <IconClock />
        </Link>
      </div>

      {/* The day's booked time. */}
      <div className="flex flex-col gap-2.5 border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{isToday ? `Today · ${SHORT.format(dateLabel)}` : title}</span>
          <Badge tone="light">{day.length} visits</Badge>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[28px] leading-9 font-semibold tabular-nums">{hm(leftMin + inMin)}</span>
          <span className="text-[13px] text-muted-foreground">still booked</span>
        </div>
        <SegmentBar segments={time} label={time.map((s) => `${s.label} ${hm(s.value)}`).join(", ")} />
        <span className="text-xs text-muted-foreground tabular-nums">
          {still.length} still to see across {booked.length} visits
        </span>
      </div>

      {/* Visits by status. */}
      <div className="border-b border-border pb-3">
        <RailHeading count={STATUS_ORDER.filter((s) => day.some((a) => a.status === s)).length}>
          Visits by status
        </RailHeading>
        <Collapsible defaultOpen className="px-2">
          <CollapsibleTrigger
            render={<Button variant="ghost" size="sm" className="group w-full justify-start bg-secondary/60 font-medium" />}
          >
            <IconChevronRight className="transition-transform group-data-[panel-open]:rotate-90" />
            All visits
            <Badge tone="outline" className="ml-auto bg-card">
              {day.length}
            </Badge>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col py-1">
              {STATUS_ORDER.map((s) => {
                const list = day.filter((a) => a.status === s)
                return (
                  <Collapsible key={s} disabled={list.length === 0}>
                    <CollapsibleTrigger
                      render={<Button variant="ghost" size="sm" className="w-full justify-start pl-8 font-normal" />}
                    >
                      <Badge tone={STATUS_TONE[s]} dot>
                        {s}
                      </Badge>
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">{list.length}</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mb-1 ml-9 flex flex-col border-l border-border pl-1">
                        {list.map((a) => (
                          <Item key={a.id} size="xs" render={<button type="button" onClick={() => onVisit(a.id)} />} className="rounded-md text-left hover:bg-secondary">
                            <ItemContent className="flex-row items-center gap-2">
                              <span className="w-[62px] shrink-0 text-xs text-muted-foreground tabular-nums">{clockTime(a.start)}</span>
                              <ItemTitle className="truncate text-[13px] font-normal">{nameOf(a)}</ItemTitle>
                            </ItemContent>
                          </Item>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* The visits still to come. */}
      <div className="flex-1 border-b border-border pb-2">
        <RailHeading count={still.length}>Next visits</RailHeading>
        {still.length === 0 ? (
          <p className="px-4 py-2 text-[13px] text-muted-foreground">Nothing left on this day</p>
        ) : (
          <div className="flex flex-col gap-1 px-2">
            {shown.map((a) => (
              <Item
                key={a.id}
                size="xs"
                render={<button type="button" onClick={() => onVisit(a.id)} />}
                className="items-start rounded-lg text-left hover:bg-secondary"
              >
                <ItemContent className="min-w-0 gap-0.5">
                  <ItemTitle className="w-full justify-between tabular-nums">
                    {clockTime(a.start)} to {clockTime(endOf(a))}
                    <Badge tone={STATUS_TONE[a.status]} dot className="ml-auto">
                      {a.status}
                    </Badge>
                  </ItemTitle>
                  <ItemDescription className="truncate text-xs">
                    {nameOf(a)} · {a.type}
                  </ItemDescription>
                  <VisitMarks o={optOf(a.patientId)} />
                </ItemContent>
              </Item>
            ))}
          </div>
        )}
        {still.length > 5 && (
          <Button variant="link" size="sm" className="mx-2 text-muted-foreground" onClick={() => setAll((v) => !v)}>
            {all ? "Show fewer" : `Show all ${still.length}`}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 border-b border-border p-4">
        {next ? (
          <Link href={chartHref(next.patientId)} className={cn(buttonVariants({ size: "sm" }), "w-full")}>
            <IconFileCheck />
            Open the next chart
          </Link>
        ) : (
          <Button size="sm" className="w-full" disabled>
            <IconFileCheck />
            Open the next chart
          </Button>
        )}
        <Link href={`${BASE}/schedule`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>
          <IconCalendar />
          Open the schedule
        </Link>
      </div>

      <Item size="xs" className="rounded-none px-4 py-3">
        <IconClock className="size-4 text-muted-foreground" />
        <ItemContent className="gap-0">
          <ItemDescription className="text-[11px]">Booked time</ItemDescription>
          <ItemTitle className="text-xs font-normal tabular-nums">
            {hm(bookedMin)} of {hm(dayMin)}
          </ItemTitle>
        </ItemContent>
      </Item>
    </div>
  )
}

/** A visit's optimization marks: the plan week for a member, the bio age gap for everyone. */
function VisitMarks({ o }: { o?: Optimization }) {
  if (!o) return null
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1.5">
      {o.member ? (
        <Badge tone="primary">{o.week ? `Plan week ${o.week}` : (o.stage ?? "Member")}</Badge>
      ) : (
        <Badge tone="light">Free</Badge>
      )}
      <GapBadge gap={o.gap} />
    </span>
  )
}

/** "Bio age 3 y younger" in green, "2 y older" in amber. */
function GapBadge({ gap }: { gap: number }) {
  const g = Math.abs(Math.round(gap))
  return (
    <Badge tone={gap < 0 ? "success" : gap > 0 ? "warning" : "light"}>
      Bio age {g === 0 ? "on par" : `${g} y ${gap < 0 ? "younger" : "older"}`}
    </Badge>
  )
}

/* ------------------------------------------------------------ stats -- */

function Stats({
  today,
  open,
  urgent,
  opt,
}: {
  today: Appointment[]
  open: QueueItem[]
  urgent: QueueItem[]
  opt: ReturnType<typeof useOptimization>
}) {
  const booked = today.filter((a) => a.status !== "Cancelled")
  const seen = today.filter((a) => a.status === "Completed").length
  const noShow = today.filter((a) => a.status === "No show").length
  const kept = booked.length ? Math.round(((booked.length - noShow) / booked.length) * 100) : 100
  const oldest = Math.max(0, ...opt.reviewing.map((o) => o.stageDays ?? 0))
  const oldestPlan = [...opt.reviewing].sort((a, b) => (b.stageDays ?? 0) - (a.stageDays ?? 0))[0]
  /* On track: no marker out of range and still worsening. */
  const onTrack = opt.members.filter((o) => !o.markers.some((m) => !m.inRange && m.dir === "worse")).length
  const stage = (s: (typeof PLAN_STAGES)[number]) => opt.byStage.find((x) => x.stage === s)?.count ?? 0

  return (
    <section aria-label="The day at a glance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={IconCalendarCheck}
        label="Seen today"
        when="Today"
        value={seen}
        of={booked.length}
        meta={`${kept}% of visits kept`}
        segments={STATUS_ORDER.map((s) => ({
          label: s,
          value: today.filter((a) => a.status === s).length,
          color: STATUS_COLOR[s],
        })).filter((s) => s.label !== "Cancelled")}
        footer={<FooterLink href={`${BASE}/schedule`}>Open schedule</FooterLink>}
      />
      <StatCard
        icon={IconFileCheck}
        label="Plans to review"
        when="AI drafted"
        value={opt.reviewing.length}
        meta={opt.reviewing.length ? `Oldest waits ${oldest} days` : "All reviewed"}
        segments={[
          { label: "Pending", value: stage("Pending review"), color: SUBTLE.violet },
          { label: "Changes", value: stage("Changes requested"), color: SUBTLE.orange },
        ]}
        footer={
          <FooterLink href={oldestPlan ? `${BASE}/${oldestPlan.patient.id}?section=care-plan` : BASE}>
            {oldestPlan ? "Review the oldest" : "Open patients"}
          </FooterLink>
        }
      />
      <StatCard
        icon={IconTarget}
        label="On track"
        when="Members"
        value={onTrack}
        of={opt.members.length}
        meta={opt.active.length ? `${Math.round(opt.avgProgress * 100)}% to goal on average` : `${opt.improving.length} markers improving`}
        segments={[
          { label: "On track", value: onTrack, color: SUBTLE.green },
          { label: "Off track", value: opt.members.length - onTrack, color: SUBTLE.orange },
        ]}
        footer={<FooterLink href={BASE}>Open patients</FooterLink>}
      />
      <StatCard
        icon={IconWarning}
        label="Urgent items"
        when="Now"
        value={urgent.length}
        of={open.length}
        meta={`${open.length} open in the queue`}
        segments={[
          { label: "Urgent", value: urgent.length, color: SUBTLE.red },
          { label: "Moderate", value: open.filter((i) => i.priority === "moderate").length, color: SUBTLE.orange },
          { label: "Routine", value: open.filter((i) => i.priority === "routine").length, color: "#B5B5B5" },
        ]}
        footer={<FooterLink href={`${BASE}/dashboard?tab=urgent`}>Show urgent items</FooterLink>}
      />
    </section>
  )
}

/* ------------------------------------------------------------ charts -- */

const PLAN_SHORT: Record<PlanName, string> = {
  "Diabetes and A1C": "Diabetes",
  "Heart health": "Heart",
  "Weight loss": "Weight",
  "Bone health": "Bone",
  "Muscle building": "Muscle",
  "Better sleep": "Sleep",
  "Metabolic health": "Metabolic",
  "Healthy aging": "Aging",
}

const PLAN_CONFIG = {
  members: { label: "Members", color: SUBTLE.blue },
  suggested: { label: "AI suggested", color: SUBTLE.violet },
} satisfies ChartConfig

function PlansByGoal({ byPlan }: { byPlan: { name: PlanName; members: number; suggested: number }[] }) {
  const reduced = useReducedMotion()
  const members = byPlan.reduce((s, r) => s + r.members, 0)
  const suggested = byPlan.reduce((s, r) => s + r.suggested, 0)
  return (
    <ChartCard
      title="Plans by goal"
      titleId="v4-plans"
      description={`${members} plans running, ${suggested} suggested to free patients`}
      footer={<Legend items={Object.entries(PLAN_CONFIG).map(([key, c]) => ({ key, label: c.label, color: c.color }))} />}
    >
      <ChartContainer config={PLAN_CONFIG} className="aspect-auto h-[220px] w-full">
        <BarChart data={byPlan} margin={{ top: 4, right: 0, left: -20, bottom: 0 }} barGap={4} barCategoryGap="24%">
          <Grid />
          <XAxis dataKey="name" {...AXIS_PROPS} interval={0} tickFormatter={(n: PlanName) => PLAN_SHORT[n] ?? n} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <YAxis allowDecimals={false} {...AXIS_PROPS} />
          <ChartTooltip cursor={{ fill: "var(--secondary)", radius: 6 }} content={<ChartTooltipContent indicator="dot" />} />
          <Bar dataKey="members" fill="var(--color-members)" radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={!reduced} />
          <Bar dataKey="suggested" fill="var(--color-suggested)" radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={!reduced} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

const BIO_CONFIG = {
  members: { label: "Members", color: SUBTLE.green },
  others: { label: "Everyone else", color: SUBTLE.orange },
} satisfies ChartConfig

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short" })

/** The average gap between biological and real age, in years, per month. */
function BioAgeChart({ now, all }: { now: string; all: Optimization[] }) {
  const reduced = useReducedMotion()
  const members = all.filter((o) => o.member)
  const others = all.filter((o) => !o.member)
  const avgGap = (list: Optimization[], i: number) =>
    list.length ? +(list.reduce((s, o) => s + (o.bioTrend[i]! - o.age), 0) / list.length).toFixed(1) : 0
  const rows = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(`${now.slice(0, 7)}-01T00:00:00`)
    d.setMonth(d.getMonth() - (5 - i))
    return { month: MONTH.format(d), members: avgGap(members, i), others: avgGap(others, i) }
  })
  const last = rows[5]!.members
  const change = +(last - rows[0]!.members).toFixed(1)

  return (
    <ChartCard
      title="Bio age, members vs everyone"
      titleId="v4-bio"
      description={`Members ${Math.abs(last)} y ${last <= 0 ? "younger" : "older"} than their age on average`}
      aside={
        <div className="flex items-center px-4">
          <Badge tone={change <= 0 ? "success" : "error"}>
            {change <= 0 ? <IconArrowDown className="size-3" /> : <IconArrowUp className="size-3" />}
            {change > 0 ? "+" : ""}
            {change} y in 6 months
          </Badge>
        </div>
      }
      footer={<Legend items={Object.entries(BIO_CONFIG).map(([key, c]) => ({ key, label: c.label, color: c.color }))} />}
    >
      <ChartContainer config={BIO_CONFIG} className="aspect-auto h-[220px] w-full">
        <AreaChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <Grid />
          <XAxis dataKey="month" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} width={44} tickCount={5} tickFormatter={(v: number) => `${+v.toFixed(1)} y`} />
          <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<ChartTooltipContent indicator="dot" />} />
          <Area type="natural" dataKey="others" stroke="var(--color-others)" strokeWidth={2} fill="var(--color-others)" fillOpacity={0.12} baseValue="dataMin" isAnimationActive={!reduced} />
          <Area type="natural" dataKey="members" stroke="var(--color-members)" strokeWidth={2} fill="var(--color-members)" fillOpacity={0.16} baseValue="dataMin" isAnimationActive={!reduced} />
        </AreaChart>
      </ChartContainer>
    </ChartCard>
  )
}

/* -------------------------------------------------- panel breakdown -- */

type View = "patient" | "plan" | "stage"
type Filter = "all" | "members" | "free" | "review"

/** One heat cell: the reading, a muted second reading, and how hot it runs. */
type Cell = { main: string; sub?: string; heat: number; tone: "green" | "amber" } | null

type Child = {
  id: string
  badge: string
  tone: Tone
  title: string
  meta: string
  note?: string
  cells: Cell[]
  item?: QueueItem
  href?: string
}
type Bucket = {
  id: string
  label: string
  note?: string
  lead?: React.ReactNode
  count: string
  cells: Cell[]
  children: Child[]
}

const COLUMNS = ["Plan progress", "Symptoms", "Watchful trends", "Open items", "Tests to route"]

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "members", label: "Members" },
  { value: "free", label: "Free patients" },
  { value: "review", label: "Plans to review" },
]

const STAGE_TONE: Record<string, Tone> = {
  "Pending review": "primary",
  "Changes requested": "warning",
  "Sent to patient": "info",
  Active: "success",
  Free: "light",
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)
const latest = (o: Optimization) => avg(o.symptoms.map((x) => x.weeks[x.weeks.length - 1]!))
const first = (o: Optimization) => avg(o.symptoms.map((x) => x.weeks[0]!))
const toDecide = (o: Optimization) => o.tests.filter((t) => t.route === "Physician to decide").length

/** The five readings for a group of patients. */
function cellsOf(list: Optimization[], openOf: (id: string) => QueueItem[]): Cell[] {
  const active = list.filter((o) => o.progress !== undefined)
  const progress = avg(active.map((o) => o.progress!))
  const now = avg(list.map(latest))
  const was = avg(list.map(first))
  const markers = list.flatMap((o) => o.markers)
  const watch = markers.filter((m) => m.watchful).length
  const items = list.flatMap((o) => openOf(o.patient.id))
  const urgentN = items.filter((i) => i.priority === "urgent").length
  const tests = list.flatMap((o) => o.tests)
  const decide = list.reduce((s, o) => s + toDecide(o), 0)
  const delta = +(now - was).toFixed(1)
  return [
    active.length
      ? { main: `${Math.round(progress * 100)}%`, sub: `${active.length} active`, heat: progress, tone: "green" }
      : { main: "None", heat: 0, tone: "green" },
    { main: now.toFixed(1), sub: delta === 0 ? "steady" : `${delta > 0 ? "+" : ""}${delta}`, heat: now / 10, tone: "amber" },
    { main: String(watch), sub: `of ${markers.length}`, heat: markers.length ? watch / markers.length : 0, tone: "amber" },
    { main: String(items.length), sub: urgentN ? `${urgentN} urgent` : undefined, heat: Math.min(1, items.length / 14), tone: "green" },
    { main: String(decide), sub: `of ${tests.length}`, heat: tests.length ? decide / tests.length : 0, tone: "amber" },
  ]
}

/** One cell lit in the column a child belongs to. */
const only = (at: number, cell: Cell): Cell[] => COLUMNS.map((_, i) => (i === at ? cell : null))

function patientChildren(o: Optimization, openOf: (id: string) => QueueItem[]): Child[] {
  const plan = `${BASE}/${o.patient.id}?section=care-plan`
  const plans: Child[] = o.plans.map((name) => ({
    id: `${o.patient.id}-plan-${name}`,
    badge: o.member ? (o.week ? `Wk ${o.week}` : "Plan") : "AI",
    tone: o.member ? "primary" : "light",
    title: name,
    meta: o.member ? `Plan · ${o.stage}` : "Plan · Suggested by AI",
    note: o.member && o.stage !== "Active" ? `Waiting ${o.stageDays} d in ${o.stage?.toLowerCase()}` : undefined,
    cells: only(0, o.progress !== undefined ? { main: `${Math.round(o.progress * 100)}%`, heat: o.progress, tone: "green" } : null),
    href: plan,
  }))
  const markers: Child[] = o.markers
    .filter((m) => m.watchful || !m.inRange)
    .map((m) => ({
      id: `${o.patient.id}-m-${m.name}`,
      badge: String(m.values[m.values.length - 1]),
      tone: m.inRange ? "warning" : "error",
      title: m.name,
      meta: `Trend · ${m.inRange ? "In range, moving the wrong way" : m.dir === "worse" ? "Out of range, rising" : "Out of range"}`,
      note: `${m.values.join(", ")} ${m.unit}`,
      cells: only(2, { main: "1", heat: 0.6, tone: "amber" }),
      href: chartHref(o.patient.id, "labs"),
    }))
  const tests: Child[] = o.tests.map((t) => ({
    id: `${o.patient.id}-t-${t.name}`,
    badge: t.route === "Physician to decide" ? "Decide" : t.route,
    tone: t.route === "Physician to decide" ? "warning" : t.route === "Insurance" ? "info" : "light",
    title: t.name,
    meta: `Baseline test · ${t.plan}`,
    note: t.route === "Physician to decide" ? "Insurance or cash is yours to pick" : `Routed to ${t.route.toLowerCase()}`,
    cells: only(4, { main: t.route === "Physician to decide" ? "1" : "0", heat: t.route === "Physician to decide" ? 0.6 : 0, tone: "amber" }),
    href: plan,
  }))
  const items: Child[] = openOf(o.patient.id).map((i) => ({
    id: i.id,
    badge: `${Math.max(0, daysSince(i.createdAt))} d`,
    tone: i.priority === "urgent" ? "error" : "light",
    title: itemName(i),
    meta: `${TYPE_META[i.type].word} · ${PRIORITY_LABEL[i.priority]}`,
    note: itemDetail(i),
    cells: only(3, { main: "1", heat: 0.4, tone: "green" }),
    item: i,
  }))
  return [...plans, ...markers, ...tests, ...items]
}

function patientChild(o: Optimization, openOf: (id: string) => QueueItem[]): Child {
  return {
    id: o.patient.id,
    badge: o.member ? (o.week ? `Wk ${o.week}` : "Member") : "Free",
    tone: o.member ? "primary" : "light",
    title: o.name,
    meta: `${o.age} y · Bio age ${o.bioAge}`,
    note: o.symptoms.map((x) => `${x.name} ${x.weeks[x.weeks.length - 1]}`).join(", "),
    cells: cellsOf([o], openOf),
    href: `${BASE}/${o.patient.id}?section=care-plan`,
  }
}

function PanelBreakdown({
  opt,
  open,
  byId,
  onOpen,
  selectedId,
}: {
  opt: Optimization[]
  open: QueueItem[]
  byId: Map<string, Patient>
  onOpen: (item: QueueItem, list: string[], from: HTMLElement) => void
  selectedId?: string
}) {
  const router = useRouter()
  const [view, setView] = React.useState<View>("patient")
  const [filter, setFilter] = React.useState<Filter>("all")
  const [query, setQuery] = React.useState("")
  const [notes, setNotes] = React.useState(true)
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set())
  const seeded = React.useRef<View | null>(null)

  const openOf = React.useMemo(() => {
    const m = new Map<string, QueueItem[]>()
    for (const i of [...open].sort(byPriority)) m.set(i.patientId, [...(m.get(i.patientId) ?? []), i])
    return (id: string) => m.get(id) ?? []
  }, [open])

  const list = React.useMemo(
    () =>
      opt
        .filter((o) =>
          filter === "members"
            ? o.member
            : filter === "free"
              ? !o.member
              : filter === "review"
                ? o.stage === "Pending review" || o.stage === "Changes requested"
                : true
        )
        .sort((a, b) => Number(b.member) - Number(a.member) || a.gap - b.gap),
    [opt, filter]
  )

  const buckets = React.useMemo<Bucket[]>(() => {
    if (view === "plan") {
      return PLAN_CATALOG.map((name) => {
        const on = list.filter((o) => o.plans.includes(name))
        const m = on.filter((o) => o.member).length
        return {
          id: name,
          label: name,
          note: `${m} ${m === 1 ? "member" : "members"}, ${on.length - m} suggested`,
          count: String(on.length),
          cells: cellsOf(on, openOf),
          children: on.map((o) => patientChild(o, openOf)),
        }
      }).filter((b) => b.children.length > 0)
    }
    if (view === "stage") {
      return [...PLAN_STAGES, "Free" as const].map((stage) => {
        const on = list.filter((o) => (stage === "Free" ? !o.member : o.stage === stage))
        return {
          id: stage,
          label: stage === "Free" ? "Free, plans suggested" : stage,
          lead: <Badge tone={STAGE_TONE[stage]} dot>{stage === "Free" ? "Free" : "Stage"}</Badge>,
          note: stage === "Free" ? `${on.filter((o) => o.upgradeFit).length} a good fit to upgrade` : undefined,
          count: String(on.length),
          cells: cellsOf(on, openOf),
          children: on.map((o) => patientChild(o, openOf)),
        }
      }).filter((b) => b.children.length > 0)
    }
    return list.map((o) => {
      const p = byId.get(o.patient.id) ?? o.patient
      return {
        id: o.patient.id,
        label: o.name,
        note: o.member ? `${o.stage}${o.week ? `, week ${o.week}` : ""}` : "Free",
        lead: <Avatar name={o.name} photo={p.photo} size={28} />,
        count: String(o.plans.length),
        cells: cellsOf([o], openOf),
        children: patientChildren(o, openOf),
      }
    })
  }, [view, list, openOf, byId])

  const q = query.trim().toLowerCase()
  const rows = q
    ? buckets.filter((b) => b.label.toLowerCase().includes(q) || b.children.some((c) => c.title.toLowerCase().includes(q)))
    : buckets

  /* Each grouping opens on its first bucket, as Miro's does. */
  React.useEffect(() => {
    if (seeded.current !== view && buckets[0]) {
      seeded.current = view
      setExpanded(new Set([buckets[0].id]))
    }
  }, [buckets, view])

  function toggle(id: string) {
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const members = list.filter((o) => o.member).length
  const review = list.filter((o) => o.stage === "Pending review" || o.stage === "Changes requested").length
  const walk = open.map((i) => i.id)

  return (
    <Card>
      <CardHeader
        title="Panel breakdown"
        count={<Badge tone="light">{list.length}</Badge>}
        description={`${members} on a plan, ${review} to review`}
        actions={
          <>
            <Badge tone="primary">{members} members</Badge>
            <Badge tone={review ? "warning" : "light"}>{review} to review</Badge>
          </>
        }
        divider={false}
      />

      <Tabs value={view} onValueChange={(v) => setView(v as View)} className="gap-0">
        <TabsList variant="line" className="w-full justify-start gap-4 border-b border-border px-4">
          <TabsTrigger value="patient" className="flex-none">
            By patient
          </TabsTrigger>
          <TabsTrigger value="plan" className="flex-none">
            By plan
          </TabsTrigger>
          <TabsTrigger value="stage" className="flex-none">
            By stage
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <Select items={FILTERS} value={filter} onValueChange={(v: Filter | null) => v && setFilter(v)}>
          <SelectTrigger size="sm" className="w-44 bg-card" aria-label="Show">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <InputGroup className="h-8 w-full bg-card sm:w-56">
          <InputGroupAddon>
            <IconSearch />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patients or plans" aria-label="Search patients or plans" />
        </InputGroup>
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-2 text-[13px]">
            Notes
            <Switch size="sm" checked={notes} onCheckedChange={setNotes} />
          </label>
          <Button variant="outline" size="sm" className="bg-card" onClick={() => setExpanded(new Set())} disabled={expanded.size === 0}>
            Collapse
          </Button>
        </div>
      </div>

      <DataTable minWidth={980}>
        <thead>
          <tr>
            <Th>{view === "patient" ? "Patient" : view === "plan" ? "Plan" : "Stage"}</Th>
            <Th className="w-20 text-right">{view === "patient" ? "Plans" : "Patients"}</Th>
            {COLUMNS.map((c) => (
              <Th key={c} className="w-[124px] border-l text-right">
                {c}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <Row>
              <Td colSpan={COLUMNS.length + 2} className="py-10 text-center text-muted-foreground">
                Nothing matches
              </Td>
            </Row>
          ) : (
            rows.map((b) => {
              const isOpen = expanded.has(b.id)
              return (
                <React.Fragment key={b.id}>
                  <Row onOpen={() => toggle(b.id)}>
                    <Td>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Button
                          variant="outline"
                          size="icon-xs"
                          onClick={() => toggle(b.id)}
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? "Collapse" : "Expand"} ${b.label}`}
                        >
                          {isOpen ? <IconChevronDown /> : <IconChevronRight />}
                        </Button>
                        {b.lead}
                        <span className="truncate font-medium">{b.label}</span>
                        {b.note && <span className="truncate text-[13px] text-muted-foreground">{b.note}</span>}
                        <Badge tone="light" className="ml-1">
                          {b.children.length}
                        </Badge>
                      </div>
                    </Td>
                    <Td className="text-right font-medium tabular-nums">{b.count}</Td>
                    {b.cells.map((c, i) => (
                      <HeatCell key={COLUMNS[i]} cell={c} />
                    ))}
                  </Row>
                  {isOpen &&
                    b.children.map((c) => (
                      <Row
                        key={c.id}
                        selected={!!c.item && c.item.id === selectedId}
                        onOpen={(from) => (c.item ? onOpen(c.item, walk, from) : c.href && router.push(c.href))}
                      >
                        <Td className="pl-[52px]!">
                          <div className="flex min-w-0 items-center gap-3">
                            <Badge tone={c.tone} className="min-w-12 justify-center">
                              {c.badge}
                            </Badge>
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate font-medium">{c.title}</span>
                              <span className="truncate text-[13px] text-muted-foreground">{c.meta}</span>
                              {notes && c.note && <span className="truncate text-xs text-muted-foreground">{c.note}</span>}
                            </span>
                          </div>
                        </Td>
                        <Td />
                        {c.cells.map((cell, i) => (
                          <HeatCell key={COLUMNS[i]} cell={cell} />
                        ))}
                      </Row>
                    ))}
                </React.Fragment>
              )
            })
          )}
        </tbody>
      </DataTable>
    </Card>
  )
}

/** A reading and its second reading on a soft wash whose strength follows the heat. */
function HeatCell({ cell }: { cell: Cell }) {
  if (!cell) return <Td className="border-l bg-secondary/40" />
  const hue = cell.tone === "amber" ? SUBTLE.orange : SUBTLE.green
  const pct = Math.round(4 + cell.heat * 30)
  return (
    <Td className="border-l tabular-nums" style={{ backgroundColor: `color-mix(in oklab, ${hue} ${pct}%, var(--card))` }}>
      <span className="flex items-center justify-between gap-2 text-[13px]">
        <span className={cn("font-medium", cell.heat === 0 && "text-muted-foreground")}>{cell.main}</span>
        {cell.sub && <span className="whitespace-nowrap text-muted-foreground">{cell.sub}</span>}
      </span>
    </Td>
  )
}
