"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconCalendar,
  IconChartUp,
  IconChat,
  IconCopy,
  IconDna,
  IconEdit,
  IconExpandVertical,
  IconFileCheck,
  IconFileList,
  IconFilter,
  IconMore,
  IconSearch,
  IconTarget,
  IconTrendUp,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/design-system/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/design-system/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/design-system/ui/input-group"
import { Progress } from "@/design-system/ui/progress"
import { toast } from "@/design-system/ui/sonner"
import { Illustration } from "@/components/illustrations/illustration"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import { fullName } from "@/components/practice/practice-data"
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  DataTable,
  ReBarChart,
  type ReDatum,
  ReLegend,
  type ReSeries,
  Row,
  SegmentedControl,
  Sparkline,
  Td,
  Th,
  type Tone,
} from "@/components/dashboard-kit-v2"
import { type Appointment, isoDay, useAppointments } from "@/components/provider/schedule/schedule-data"
import { ItemPanel } from "@/components/provider/home-v2/item-panel"
import { TYPE_META, itemName, itemTitle } from "@/components/provider/home-v2/labels"
import { recordAudit, workItems } from "@/components/provider/home-v2/mock"
import {
  FooterLink,
  IconTile,
  type Segment,
  StatCard,
  StatCardSkeleton,
} from "@/components/provider/home-v2/overview"
import { type ActionOptions, actionLabel, applyAction, toQueue } from "@/components/provider/home-v2/selectors"
import type { ActionKind, QueueItem } from "@/components/provider/home-v2/types"
import { VariantFrame } from "@/components/provider/dashboard-variants/frame"
import {
  type Optimization,
  type PlanStage,
  PLAN_STAGES,
  useOptimization,
} from "@/components/provider/dashboard-variants/optimization-data"
import { useProviderDay } from "@/components/provider/dashboard-variants/use-provider-day"

/* Variation 2, after ReUI's Flowly dashboard, built from the portal's own
   components: four stat cards (plan health, members on track, biological
   age, today's visits), the members' daily optimization score beside what
   needs the physician, then the optimization members as a table. */

const BASE = "/screens/patients"
const ACTOR = "Daniel Reyes, MD"
const carePlan = (id: string) => `${BASE}/${id}?section=care-plan`

/* Words take the soft hue mixed toward the ink so they read. */
const word = (hex: string) => `color-mix(in oklab, ${hex} 70%, var(--foreground))`
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short" })

const STAGE_COLOR: Record<PlanStage, string> = {
  Active: SUBTLE.green,
  "Sent to patient": SUBTLE.blue,
  "Pending review": SUBTLE.violet,
  "Changes requested": SUBTLE.orange,
}
const STAGE_TONE: Record<PlanStage, Tone> = {
  Active: "success",
  "Sent to patient": "info",
  "Pending review": "primary",
  "Changes requested": "warning",
}

/* ----------------------------------------------------------- activity -- */

/* ReUI's striped run activity: on track striped, slipping dotted, missed solid. */
const SCORE_SERIES: ReSeries[] = [
  { key: "onTrack", label: "On track", color: SUBTLE.green, fill: "stripe" },
  { key: "slipping", label: "Slipping", color: SUBTLE.orange, fill: "dots" },
  { key: "missed", label: "Missed", color: SUBTLE.red, fill: "solid" },
]

const VISIT_SERIES: ReSeries[] = [
  { key: "seen", label: "Seen", color: SUBTLE.green, fill: "stripe" },
  { key: "upcoming", label: "Upcoming", color: SUBTLE.blue, fill: "dots" },
  { key: "missed", label: "Missed", color: SUBTLE.red, fill: "solid" },
]

/** The members' daily optimization score by day, or the visits of this week and next. */
function Activity({ now, active, className }: { now: string; active: Optimization[]; className?: string }) {
  const all = useAppointments(now)
  const [mode, setMode] = React.useState<"score" | "visits">("score")
  const today = new Date(`${now.slice(0, 10)}T00:00:00`)

  /* Score: the last seven days, each member banded by that day's score. */
  const scoreRows = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    const day = active.map((o) => o.dailyScore?.[i]).filter((n): n is number => n !== undefined)
    return {
      day: i === 6 ? "Today" : WEEKDAY.format(d),
      date: SHORT.format(d),
      onTrack: day.filter((n) => n >= 70).length,
      slipping: day.filter((n) => n >= 50 && n < 70).length,
      missed: day.filter((n) => n < 50).length,
    }
  })
  const todayScores = active.map((o) => o.dailyScore?.[6]).filter((n): n is number => n !== undefined)

  /* Visits: this week and next, Monday to Friday. */
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const days = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i + (i >= 5 ? 2 : 0))
    return d
  })
  const on = (d: Date) => all.filter((a) => a.start.startsWith(isoDay(d)))
  const count = (list: Appointment[], s: Appointment["status"][]) => list.filter((a) => s.includes(a.status)).length
  const visitRows = days.map((d) => {
    const list = on(d)
    return {
      day: isoDay(d) === isoDay(today) ? "Today" : WEEKDAY.format(d),
      date: SHORT.format(d),
      seen: count(list, ["Completed"]),
      upcoming: count(list, ["Scheduled", "Checked in"]),
      missed: count(list, ["No show", "Cancelled"]),
    }
  })
  const week = days
    .slice(0, 5)
    .flatMap(on)
    .filter((a) => a.status !== "Cancelled")

  const score = mode === "score"
  const series = score ? SCORE_SERIES : VISIT_SERIES
  const rows: ReDatum[] = score ? scoreRows : visitRows
  const dateOf = new Map(rows.map((r) => [String(r.day), String(r.date)]))

  return (
    <Card className={className}>
      <CardHeader
        title={score ? "Daily optimization score" : "Visit activity"}
        description={
          score
            ? `${todayScores.filter((x) => x >= 70).length} of ${todayScores.length} members on track today, average ${Math.round(avg(todayScores))}`
            : `${plural(week.length, "visit")} this week, ${pct(count(week, ["Completed"]), week.length)}% seen`
        }
        actions={
          <SegmentedControl
            label="Show"
            value={mode}
            onChange={setMode}
            items={[
              { value: "score", label: "Score" },
              { value: "visits", label: "Visits" },
            ]}
          />
        }
      />
      <div className="flex flex-1 flex-col p-4">
        {score && active.length === 0 ? (
          <Empty className="flex-1 py-10">
            <EmptyHeader>
              <EmptyMedia>
                <Illustration name="no-results" />
              </EmptyMedia>
              <EmptyTitle>No member has a running plan yet</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ReLegend series={series} className="mb-3" />
            <ReBarChart
              key={mode}
              data={rows}
              xKey="day"
              series={series}
              stacked
              height={236}
              showYAxis
              tooltipLabel={(day: string) => dateOf.get(day) ?? day}
            />
          </>
        )}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------- needs attention -- */

type Attention = {
  id: string
  glyph?: (typeof TYPE_META)[keyof typeof TYPE_META]["icon"]
  icon?: typeof IconCalendar
  color: string
  title: string
  meta: string
  badge: { tone: Tone; label: string }
  verb: string
  href?: string
  onPress?: (from: HTMLElement) => void
}

function NeedsAttention({
  urgent,
  opt,
  nameOf,
  onOpen,
  className,
}: {
  urgent: QueueItem[]
  opt: ReturnType<typeof useOptimization>
  nameOf: (id: string) => string
  onOpen: (item: QueueItem, from: HTMLElement) => void
  className?: string
}) {
  const rows: Attention[] = [
    ...urgent.map<Attention>((i) => ({
      id: i.id,
      glyph: TYPE_META[i.type].icon,
      color: SUBTLE.red,
      title: itemName(i),
      meta: `${TYPE_META[i.type].word} · ${nameOf(i.patientId)}`,
      badge: { tone: "error", label: "Urgent" },
      verb: "Review",
      onPress: (from) => onOpen(i, from),
    })),
    ...[...opt.reviewing]
      .sort((a, b) => (b.stageDays ?? 0) - (a.stageDays ?? 0))
      .map<Attention>((o) => ({
        id: `plan-${o.patient.id}`,
        icon: IconFileCheck,
        color: o.stage === "Changes requested" ? SUBTLE.orange : SUBTLE.violet,
        title: `${plural(o.plans.length, "plan")} to approve`,
        meta: `${o.name} · waiting ${o.stageDays ?? 0} d`,
        badge: o.stage === "Changes requested" ? { tone: "warning", label: "Changes asked" } : { tone: "primary", label: "Review" },
        verb: "Review",
        href: carePlan(o.patient.id),
      })),
    ...opt.offTrack.map<Attention>(({ o, m }) => ({
      id: `off-${o.patient.id}-${m.name}`,
      icon: IconTrendUp,
      color: SUBTLE.red,
      title: `${m.name} ${m.values[m.values.length - 1]} ${m.unit}`,
      meta: o.name,
      badge: { tone: "error", label: "Off track" },
      verb: "Open",
      href: `${BASE}/${o.patient.id}`,
    })),
    ...opt.watchful.map<Attention>(({ o, m }) => ({
      id: `watch-${o.patient.id}-${m.name}`,
      icon: IconChartUp,
      color: SUBTLE.orange,
      title: m.name,
      meta: `${o.name} · in range, moving the wrong way`,
      badge: { tone: "warning", label: "Watchful" },
      verb: "Open",
      href: `${BASE}/${o.patient.id}`,
    })),
  ]

  return (
    <Card className={className}>
      <CardHeader
        title="Needs attention"
        count={<Badge tone="light">{rows.length}</Badge>}
        description="Worst first"
      />
      {rows.length === 0 ? (
        <Empty className="flex-1 py-10">
          <EmptyHeader>
            <EmptyMedia>
              <Illustration name="no-results" />
            </EmptyMedia>
            <EmptyTitle>You are all caught up</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="no-scrollbar max-h-[336px] min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <IconTile icon={r.icon} glyph={r.glyph} color={r.color} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium">{r.title}</span>
                  <Badge tone={r.badge.tone}>{r.badge.label}</Badge>
                </span>
                <span className="truncate text-xs text-muted-foreground">{r.meta}</span>
              </span>
              {r.href ? (
                <Link href={r.href} className={cn(buttonVariants({ variant: "outline", size: "xs" }), "shrink-0")}>
                  {r.verb}
                </Link>
              ) : (
                <Button variant="outline" size="xs" className="shrink-0" onClick={(e) => r.onPress?.(e.currentTarget)}>
                  {r.verb}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* ------------------------------------------------------ members table -- */

type Sort = "progress" | "score" | "gap" | "name"
const SORT_LABEL: Record<Sort, string> = {
  progress: "Progress",
  score: "Daily score",
  gap: "Bio age gap",
  name: "Name",
}

function MembersTable({ members }: { members: Optimization[] }) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [sort, setSort] = React.useState<Sort>("progress")
  const [stage, setStage] = React.useState<"all" | PlanStage>("all")
  const [all, setAll] = React.useState(false)

  const latest = (o: Optimization) => o.dailyScore?.[o.dailyScore.length - 1] ?? -1
  const q = query.trim().toLowerCase()
  const rows = members
    .filter(
      (o) =>
        (stage === "all" || o.stage === stage) &&
        (!q || o.name.toLowerCase().includes(q) || o.patient.id.toLowerCase().includes(q))
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "score"
          ? latest(b) - latest(a)
          : sort === "gap"
            ? a.gap - b.gap
            : (b.progress ?? -1) - (a.progress ?? -1)
    )
  const shown = all ? rows : rows.slice(0, 8)

  return (
    <Card>
      <CardHeader
        title="Optimization members"
        count={<Badge tone="light">{rows.length}</Badge>}
        actions={
          <>
            <InputGroup className="h-8 w-full sm:w-48">
              <InputGroupAddon>
                <IconSearch />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Search members"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </InputGroup>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm">
                    <IconExpandVertical />
                    {SORT_LABEL[sort]}
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as Sort)}>
                  {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
                    <DropdownMenuRadioItem key={s} value={s}>
                      {SORT_LABEL[s]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm">
                    <IconFilter />
                    {stage === "all" ? "Filters" : stage}
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={stage} onValueChange={(v) => setStage(v as typeof stage)}>
                  <DropdownMenuRadioItem value="all">All stages</DropdownMenuRadioItem>
                  {PLAN_STAGES.map((s) => (
                    <DropdownMenuRadioItem key={s} value={s}>
                      {s}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <DataTable minWidth={960}>
        <thead>
          <tr>
            <Th>Progress</Th>
            <Th>Member</Th>
            <Th>Plans</Th>
            <Th>Bio age</Th>
            <Th>Daily score</Th>
            <Th>Stage</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {shown.map((o) => {
            const p = o.patient
            const running = o.stage === "Active" && o.progress !== undefined
            const progress = pct(o.progress ?? 0, 1)
            const scores = o.dailyScore ?? []
            const last = scores[scores.length - 1]
            const gapColor = o.gap <= -3 ? SUBTLE.green : o.gap > 0 ? SUBTLE.red : undefined
            return (
              <Row key={p.id} onOpen={() => router.push(`${BASE}/${p.id}`)}>
                <Td>
                  <div className="flex w-36 flex-col gap-1.5">
                    <span className="flex items-baseline justify-between gap-2 text-[13px] tabular-nums">
                      <span className="font-medium">{running ? `${progress}% to goal` : "Not started"}</span>
                      <span className="text-xs text-muted-foreground">
                        {running && o.week ? `Week ${o.week}` : `${o.stageDays ?? 0} d`}
                      </span>
                    </span>
                    <Progress
                      value={running ? progress : 0}
                      aria-label={`${o.name}, progress to goal`}
                      className="[&_[data-slot=progress-track]]:h-1.5"
                    />
                  </div>
                </Td>
                <Td>
                  <span className="flex items-center gap-2.5">
                    <Avatar name={o.name} photo={p.photo} size={30} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{o.name}</span>
                      <span className="truncate text-xs text-muted-foreground tabular-nums">
                        {o.age} y · {p.id}
                      </span>
                    </span>
                  </span>
                </Td>
                <Td>
                  <span className="flex max-w-[240px] flex-wrap gap-1">
                    {o.plans.slice(0, 2).map((name) => (
                      <Badge key={name} tone="outline">
                        {name}
                      </Badge>
                    ))}
                    {o.plans.length > 2 && <Badge tone="light">+{o.plans.length - 2}</Badge>}
                  </span>
                </Td>
                <Td>
                  <span className="flex flex-col tabular-nums">
                    <span>
                      <span className="font-semibold" style={gapColor ? { color: word(gapColor) } : undefined}>
                        {o.bioAge}
                      </span>
                      <span className="text-muted-foreground"> at {o.age}</span>
                    </span>
                    <span className="text-xs" style={gapColor ? { color: word(gapColor) } : undefined}>
                      {o.gap === 0 ? "Even with age" : `${Math.abs(o.gap)} y ${o.gap < 0 ? "younger" : "older"}`}
                    </span>
                  </span>
                </Td>
                <Td>
                  {last !== undefined ? (
                    <span className="flex items-center gap-2.5">
                      <Sparkline values={scores} low={70} high={100} width={72} height={24} label={`${o.name}, daily score`} />
                      <span className="font-semibold tabular-nums">{last}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not yet</span>
                  )}
                </Td>
                <Td>
                  {o.stage && (
                    <Badge tone={STAGE_TONE[o.stage]} dot>
                      {o.stage}
                    </Badge>
                  )}
                </Td>
                <Td>
                  <span className="flex items-center justify-end gap-0.5">
                    <Link
                      href={carePlan(p.id)}
                      aria-label={`Open the care plan for ${o.name}`}
                      className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-muted-foreground")}
                    >
                      <IconFileCheck className="size-4" />
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" aria-label={`More for ${o.name}`} className="text-muted-foreground">
                            <IconMore className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="min-w-40">
                        <DropdownMenuItem onClick={() => router.push(`${BASE}/${p.id}`)}>
                          <IconEdit />
                          Open chart
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`${BASE}/communication`)}>
                          <IconChat />
                          Message
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            void navigator.clipboard?.writeText(p.id)
                            toast("Copied", { description: p.id })
                          }}
                        >
                          <IconCopy />
                          Copy ID
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </Td>
              </Row>
            )
          })}
        </tbody>
      </DataTable>
      {shown.length === 0 && (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyTitle>No members match</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
      {rows.length > 8 && (
        <FooterLink onClick={() => setAll((v) => !v)}>{all ? "Show fewer" : `Show all ${rows.length}`}</FooterLink>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------- page -- */

export function DashboardClinicDay() {
  const { ready, byId, mine, urgent, now, clinic, work } = useProviderDay()
  const opt = useOptimization()
  const queue = React.useMemo(() => work.map(toQueue), [work])
  const nameOf = (id: string) => {
    const p = byId.get(id)
    return p ? fullName(p) : id
  }

  /* The item panel walks the urgent list; working an item steps on. */
  const [panel, setPanel] = React.useState<{ id: string; list: string[] } | null>(null)
  const openerRef = React.useRef<HTMLElement | null>(null)
  const current = panel ? (queue.find((i) => i.id === panel.id) ?? null) : null
  const at = panel ? panel.list.indexOf(panel.id) : -1
  const step = (d: -1 | 1) => (panel && panel.list[at + d] ? () => setPanel({ ...panel, id: panel.list[at + d]! }) : undefined)

  function act(kind: ActionKind, opts: ActionOptions = {}) {
    if (!panel || !current) return
    const snapshot = work.find((i) => i.id === current.id)
    if (!snapshot) return
    workItems.patch(current.id, applyAction(kind, opts))
    recordAudit(ACTOR, [kind, opts.reason ?? (opts.days && `${opts.days} days`)].filter(Boolean).join(": "), current.id)
    toast.success(actionLabel(kind, opts), {
      description: itemTitle(current),
      action: {
        label: "Undo",
        onClick: () => {
          workItems.patch(snapshot.id, { ...snapshot })
          recordAudit(ACTOR, "undo", snapshot.id)
        },
      },
    })
    const rest = panel.list.filter((id) => id !== current.id)
    const next = rest[at] ?? rest[at - 1]
    setPanel(next ? { id: next, list: rest } : null)
  }

  /* Plans */
  const stages: Segment[] = (["Active", "Sent to patient", "Pending review", "Changes requested"] as const).map((s) => ({
    label: s,
    value: opt.members.filter((o) => o.stage === s).length,
    color: STAGE_COLOR[s],
  }))
  const firstReview = [...opt.reviewing].sort((a, b) => (b.stageDays ?? 0) - (a.stageDays ?? 0))[0]

  /* Members on track: today's daily score of members with a running plan. */
  const todayScores = opt.active.map((o) => o.dailyScore?.[6]).filter((n): n is number => n !== undefined)
  const weekAgo = Math.round(avg(opt.active.map((o) => o.dailyScore?.[0]).filter((n): n is number => n !== undefined)))
  const todayAvg = Math.round(avg(todayScores))
  const scoreSegs: Segment[] = [
    { label: "On track", value: todayScores.filter((n) => n >= 70).length, color: SUBTLE.green },
    { label: "Slipping", value: todayScores.filter((n) => n >= 50 && n < 70).length, color: SUBTLE.orange },
    { label: "Missed", value: todayScores.filter((n) => n < 50).length, color: SUBTLE.red },
  ]

  /* Biological age against real age, across engaged patients. */
  const bioSegs: Segment[] = [
    { label: "Younger", value: opt.bio.younger, color: SUBTLE.green },
    { label: "Near age", value: opt.bio.near, color: "#B5B5B5" },
    { label: "Older", value: opt.bio.older, color: SUBTLE.red },
  ]

  /* Visits */
  const day = clinic.today
  const booked = day.filter((a) => a.status !== "Cancelled")
  const seen = day.filter((a) => a.status === "Completed").length
  const visitSegs: Segment[] = [
    { label: "Completed", value: seen, color: SUBTLE.green },
    { label: "Checked in", value: day.filter((a) => a.status === "Checked in").length, color: SUBTLE.orange },
    { label: "Scheduled", value: day.filter((a) => a.status === "Scheduled").length, color: SUBTLE.blue },
    { label: "Missed", value: day.filter((a) => a.status === "No show" || a.status === "Cancelled").length, color: SUBTLE.red },
  ]

  const faces = mine.filter((p) => p.photo).slice(0, 3)
  const loaded = ready && opt.ready && now

  return (
    <VariantFrame>
      {/* The page bar: title, the panel's faces, and two ways to start work. */}
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg leading-7 font-semibold">Dashboard</h1>
        <div className="ml-auto flex items-center gap-2">
          {ready && (
            <Link href={BASE} aria-label={plural(mine.length, "patient")} className="mr-1 hidden items-center gap-1 sm:flex">
              <span className="flex -space-x-2">
                {faces.map((p) => (
                  <Avatar key={p.id} name={fullName(p)} photo={p.photo} size={28} className="ring-2 ring-card" />
                ))}
              </span>
              {mine.length > faces.length && <Badge tone="light">+{mine.length - faces.length}</Badge>}
            </Link>
          )}
          <Link href={`${BASE}/communication`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-card")}>
            <IconChat />
            Message
          </Link>
          <Link href={`${BASE}/tasks`} className={buttonVariants({ size: "sm" })}>
            <IconFileList />
            Add task
          </Link>
        </div>
      </header>

      {!loaded ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <section aria-label="Optimization at a glance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={IconTarget}
              label="Plan health"
              when="Now"
              value={stages[0]!.value}
              of={opt.members.length}
              meta={`${opt.reviewing.length} waiting on your review`}
              segments={stages}
              footer={
                <FooterLink href={firstReview ? carePlan(firstReview.patient.id) : BASE}>
                  {firstReview ? `Review ${firstReview.name}` : "View members"}
                </FooterLink>
              }
            />
            <StatCard
              icon={IconChartUp}
              label="Members on track"
              when="Today"
              value={scoreSegs[0]!.value}
              of={todayScores.length}
              meta={
                todayScores.length > 0
                  ? `Average daily score ${todayAvg}, ${weekAgo} a week ago`
                  : `No running plans, ${opt.reviewing.length} in review`
              }
              segments={scoreSegs}
              footer={<FooterLink href={BASE}>View daily scores</FooterLink>}
            />
            <StatCard
              icon={IconDna}
              label="Bio age gap"
              when="Panel"
              value={opt.bio.avgGap}
              meta={
                <span>
                  Years against real age, members{" "}
                  <span style={{ color: word(opt.bio.avgGapMembers <= 0 ? SUBTLE.green : SUBTLE.red) }}>
                    {opt.bio.avgGapMembers > 0 ? "+" : ""}
                    {opt.bio.avgGapMembers} y
                  </span>
                </span>
              }
              segments={bioSegs}
              footer={<FooterLink href={BASE}>View biological ages</FooterLink>}
            />
            <StatCard
              icon={IconCalendar}
              label="Visits"
              when="Today"
              value={seen}
              of={booked.length}
              meta={`${booked.length - seen} still to see`}
              segments={visitSegs}
              footer={<FooterLink href={`${BASE}/schedule`}>Open schedule</FooterLink>}
            />
          </section>

          <div className="grid gap-4 xl:grid-cols-3">
            <Activity now={now} active={opt.active} className="xl:col-span-2" />
            <NeedsAttention
              urgent={urgent}
              opt={opt}
              nameOf={nameOf}
              onOpen={(item, from) => {
                openerRef.current = from
                setPanel({ id: item.id, list: urgent.map((u) => u.id) })
              }}
            />
          </div>

          <MembersTable members={opt.members} />
        </>
      )}

      <ItemPanel
        item={current}
        patient={current ? (byId.get(current.patientId) ?? null) : null}
        onPrevious={step(-1)}
        onNext={step(1)}
        onClose={() => setPanel(null)}
        returnFocus={openerRef}
        onAct={act}
      />
    </VariantFrame>
  )
}
