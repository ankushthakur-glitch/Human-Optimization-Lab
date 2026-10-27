"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Activity01Icon,
  ArrowDown02Icon,
  ArrowUp02Icon,
  DnaIcon,
  HeartPulseIcon,
  Target02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import {
  IconAlert,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconDna,
  IconDownload,
  IconFileCheck,
  IconInfo,
  IconLab,
  IconLocation,
  IconPulse,
  IconShare,
  IconSparkles,
  IconTarget,
  IconTrendUp,
  IconUserAdd,
  IconVideo,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/design-system/ui/button"
import { Empty, EmptyHeader, EmptyTitle } from "@/design-system/ui/empty"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/design-system/ui/item"
import { Progress } from "@/design-system/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/design-system/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/design-system/ui/sheet"
import { Skeleton } from "@/design-system/ui/skeleton"
import { toast } from "@/design-system/ui/sonner"
import { TableBody, TableHeader, TableRow } from "@/design-system/ui/table"
import { type Patient, fullName } from "@/components/practice/practice-data"
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  DataTable,
  FOCUS,
  MetricCard,
  ReAreaChart,
  ReDonut,
  ReDonutLegend,
  type ReSeries,
  type ReSlice,
  Row,
  SegmentedControl,
  Td,
  Th,
  type Tone as BadgeTone,
} from "@/components/dashboard-kit-v2"
import { AreaSpark } from "@/components/dashboard-kit-v2/charts"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import { clockTime, ms } from "@/components/provider/mock-clock"
import { NOW } from "@/components/provider/home-v2/clock"
import { type Act, ItemPanel } from "@/components/provider/home-v2/item-panel"
import { ageSex, itemName } from "@/components/provider/home-v2/labels"
import { recordAudit, workItems } from "@/components/provider/home-v2/mock"
import {
  CardLink,
  FooterLink,
  IconTile,
  type Segment,
  StatCard,
  StatCardSkeleton,
} from "@/components/provider/home-v2/overview"
import { type ActionOptions, actionLabel, applyAction, toQueue } from "@/components/provider/home-v2/selectors"
import type { ActionKind, QueueItem } from "@/components/provider/home-v2/types"
import { type Appointment, isoDay, useAppointments } from "@/components/provider/schedule/schedule-data"
import { VariantFrame } from "@/components/provider/dashboard-variants/frame"
import { type Optimization, type PlanStage, PLAN_STAGES, useOptimization } from "@/components/provider/dashboard-variants/optimization-data"
import { useProviderDay } from "@/components/provider/dashboard-variants/use-provider-day"

/* Variation 5, "Panel": the physician's optimization panel, laid out after
   ReUI's Mesh home and Roster dashboard and drawn only with the build's own
   components: the live dashboard's stat cards, the kit's metric cards,
   cards, badges, table and spark, and the design system's items, insight
   tiles, progress, sheet and chart. Visits run on the real clock, work
   items on the mock one. */

const BASE = "/screens/patients"
const ACTOR = "Daniel Reyes, MD"
const GREY = "#B5B5B5"

const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
const MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })
const MONTH_SHORT = new Intl.DateTimeFormat("en-US", { month: "short" })
const LONG_DAY = new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long" })

const dayOf = (iso: string) => iso.slice(0, 10)
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7))
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const years = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)} y`
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)
const seedOf = (id: string, salt = 0) => [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0) + salt) % 997, 7 + salt)
const carePlanHref = (id: string) => `${BASE}/${id}?section=care-plan`

/** A sample history that ends on today's real value: a seeded walk back in
    time, wider for longer periods. The panel keeps no snapshots yet. */
function history(current: number, points: number, seed: number, swing: number, digits = 0) {
  let x = seed * 7919
  const rand = () => (x = (x * 9301 + 49297) % 233280) / 233280
  const f = 10 ** digits
  const out = [current]
  for (let i = 1; i < points; i++) out.unshift(Math.max(0, Math.round((out[0]! - swing * (0.45 + (rand() - 0.5) * 1.1)) * f) / f))
  return out
}

/** Points between two monthly readings, for the shorter periods. */
const between = (a: number, b: number, points: number) =>
  Array.from({ length: points }, (_, i) => +(a + ((b - a) * i) / (points - 1)).toFixed(2))

/** How a member's plan stands, from the week's daily scores. */
type MemberStatus = "On track" | "At risk" | "Slipping" | "Not started"
const STATUS_TONE: Record<MemberStatus, BadgeTone> = {
  "On track": "success",
  "At risk": "warning",
  Slipping: "error",
  "Not started": "light",
}
const STATUS_COLOR: Record<MemberStatus, string> = {
  "On track": SUBTLE.green,
  "At risk": SUBTLE.orange,
  Slipping: SUBTLE.red,
  "Not started": GREY,
}
function statusOf(o: Optimization): MemberStatus {
  if (o.stage !== "Active" || !o.dailyScore) return "Not started"
  const recent = avg(o.dailyScore.slice(-3))
  const before = avg(o.dailyScore.slice(0, 4))
  if (recent < before - 2 || recent < 72) return "Slipping"
  if (recent < 82 || (o.progress ?? 0) < 0.45) return "At risk"
  return "On track"
}

const STAGE_TONE: Record<PlanStage, BadgeTone> = {
  "Pending review": "warning",
  "Changes requested": "error",
  "Sent to patient": "info",
  Active: "success",
}

/** Members whose weekly symptom check in is late: a sample flag fixed per patient. */
const missedCheckIn = (o: Optimization) => o.stage === "Active" && seedOf(o.patient.id, 5) % 3 === 0

type Opt = ReturnType<typeof useOptimization>

/* ---------------------------------------------------- panel overview -- */

type Period = "week" | "month" | "year"
const PERIOD: Record<Period, { points: number; label: string; swing: number }> = {
  week: { points: 8, label: "over 7 days", swing: 0.4 },
  month: { points: 11, label: "over 30 days", swing: 0.9 },
  year: { points: 13, label: "over 12 months", swing: 1.8 },
}

function OptimizationOverview({ opt }: { opt: Opt }) {
  const [period, setPeriod] = React.useState<Period>("month")
  const cfg = PERIOD[period]
  const n = cfg.points

  /* Biological age and symptoms carry real monthly and weekly readings;
     members and progress are sampled back from today's value. */
  const engaged = opt.all.filter((o) => o.patient.status === "Active")
  const bioMonthly = Array.from({ length: 6 }, (_, i) => +avg(engaged.map((o) => o.bioTrend[i]! - o.age)).toFixed(1))
  const bioLine =
    period === "year" ? bioMonthly : period === "month" ? bioMonthly.slice(3) : between((bioMonthly[4]! + 3 * bioMonthly[5]!) / 4, bioMonthly[5]!, n)
  const reliefWeekly = Array.from(
    { length: 6 },
    (_, i) => +avg(opt.active.map((o) => avg(o.symptoms.map((s) => s.weeks[0]! - s.weeks[i]!)))).toFixed(1)
  )
  const reliefLine = period === "week" ? reliefWeekly.slice(-3) : period === "month" ? reliefWeekly.slice(-5) : reliefWeekly

  const metrics = [
    { key: "members", label: "Optimization members", icon: HeartPulseIcon, value: opt.members.length, line: history(opt.members.length, n, n + 1, cfg.swing), goodWhen: "up", unit: "" },
    {
      key: "progress",
      label: "Avg progress to goal, %",
      icon: Target02Icon,
      value: Math.round(opt.avgProgress * 100),
      line: history(Math.round(opt.avgProgress * 100), n, n + 4, cfg.swing * 2.5),
      goodWhen: "up",
      unit: " pts",
    },
    { key: "bio", label: "Bio age gap, years", icon: DnaIcon, value: opt.bio.avgGap, line: bioLine, goodWhen: "down", unit: " y" },
    { key: "relief", label: "Symptom relief, points", icon: Activity01Icon, value: opt.symptomRelief, line: reliefLine, goodWhen: "up", unit: "" },
  ] as const

  return (
    <Card>
      <CardHeader
        title="Panel optimization overview"
        description={`${plural(opt.members.length, "member")}, ${plural(opt.active.length, "active plan")}, ${plural(opt.reviewing.length, "plan")} in review`}
        actions={
          <SegmentedControl
            label="Period"
            value={period}
            onChange={setPeriod}
            items={[
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
              { value: "year", label: "Year" },
            ]}
          />
        }
      />
      <CardBody className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => {
          const delta = +(m.line[m.line.length - 1]! - m.line[0]!).toFixed(1)
          const better = delta !== 0 && (delta > 0) === (m.goodWhen === "up")
          return (
            <MetricCard
              key={m.key}
              icon={m.icon}
              label={m.label}
              value={m.value}
              series={m.line}
              color={delta === 0 ? GREY : better ? SUBTLE.green : SUBTLE.red}
              badge={
                <Badge tone={delta === 0 ? "light" : better ? "success" : "error"} icon={delta < 0 ? ArrowDown02Icon : ArrowUp02Icon}>
                  {delta > 0 ? "+" : ""}
                  {delta}
                  {m.unit}
                </Badge>
              }
              delta={cfg.label}
            />
          )
        })}
      </CardBody>
      <CardFooter className="flex-wrap text-[13px] text-muted-foreground">
        <IconInfo className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 tabular-nums">
          {plural(opt.bio.younger, "patient")} 3+ years younger than their age, {plural(opt.bio.older, "patient")} older
        </span>
        <CardLink href={BASE}>View patients</CardLink>
      </CardFooter>
    </Card>
  )
}

/* --------------------------------------------------------- calendar -- */

type Stream = "visit" | "plan" | "checkin" | "retest" | "gap" | "order"

const STREAM: Record<Stream, { label: string; tone: BadgeTone }> = {
  visit: { label: "Visits", tone: "success" },
  plan: { label: "Plan reviews", tone: "primary" },
  checkin: { label: "Symptom check ins", tone: "info" },
  retest: { label: "Retests", tone: "light" },
  gap: { label: "Care gaps", tone: "warning" },
  order: { label: "Orders", tone: "outline" },
}

type Person = { patient: Patient; note: string }

type CalEvent = {
  key: string
  day: string
  stream: Stream
  text: string
  /** What the detail sheet reads. */
  title: string
  place?: string
  virtual?: boolean
  people: Person[]
  href?: string
  item?: QueueItem
}

const RETEST: Record<string, string> = {
  "Diabetes and A1C": "HbA1c retest",
  "Heart health": "Lipid panel retest",
  "Weight loss": "Body composition scan",
  "Bone health": "6 month DEXA",
  "Muscle building": "Body composition scan",
  "Better sleep": "Sleep study follow up",
  "Metabolic health": "Metabolic panel retest",
  "Healthy aging": "Biological age retest",
}

function useEvents(appts: Appointment[], open: QueueItem[], byId: Map<string, Patient>, opt: Opt, today: string) {
  return React.useMemo(() => {
    const out: CalEvent[] = []
    const group = new Map<string, CalEvent>()
    const add = (k: string, e: Omit<CalEvent, "people">, person: Person) => {
      const g = group.get(k)
      if (g) g.people.push(person)
      else group.set(k, { ...e, people: [person] })
    }

    /* A day's visits read as one event, the way Roster stacks a team's. */
    for (const a of appts) {
      if (a.status === "Cancelled") continue
      const p = byId.get(a.patientId)
      if (!p) continue
      const day = dayOf(a.start)
      add(
        `visit|${day}`,
        { key: `visit-${day}`, day, stream: "visit", text: "Visits", title: "Visits", place: "Your clinic and virtual", href: `${BASE}/schedule` },
        { patient: p, note: `${clockTime(a.start)}, ${a.type}, ${a.mode === "Virtual" ? "virtual" : "in person"}` }
      )
    }

    const base = new Date(`${today}T00:00:00`)
    for (const o of opt.members) {
      const s = seedOf(o.patient.id)
      /* The physician's review is due a week after the plan reached them. */
      if (o.stage === "Pending review" || o.stage === "Changes requested") {
        const day = isoDay(addDays(base, Math.max(0, 7 - (o.stageDays ?? 0))))
        add(
          `plan|${day}`,
          { key: `plan-${day}`, day, stream: "plan", text: "Plan review due", title: "Care plan review due", place: "Waiting on your review", href: carePlanHref(o.patient.id) },
          { patient: o.patient, note: `${o.stage}, ${plural(o.stageDays ?? 0, "day")}, ${o.plans.join(", ")}` }
        )
      }
      if (o.stage === "Active") {
        /* Weekly symptom re-rating, on the member's own weekday. */
        for (let w = -5; w <= 5; w++) {
          const day = isoDay(addDays(mondayOf(base), w * 7 + (s % 5)))
          add(
            `checkin|${day}`,
            { key: `checkin-${day}`, day, stream: "checkin", text: "Symptom check in", title: "Weekly symptom check in", place: "In the Inlay app" },
            { patient: o.patient, note: o.symptoms.map((x) => `${x.name} ${x.weeks[x.weeks.length - 1]}`).join(", ") }
          )
        }
        const plan = o.plans[0]
        if (plan) {
          const day = isoDay(addDays(base, -8 + (s % 28)))
          add(
            `retest|${day}|${plan}`,
            { key: `retest-${o.patient.id}`, day, stream: "retest", text: RETEST[plan] ?? "Retest", title: RETEST[plan] ?? "Retest", place: `${plan} plan, week ${o.week}`, href: `${BASE}/${o.patient.id}` },
            { patient: o.patient, note: `${Math.round((o.progress ?? 0) * 100)}% to goal` }
          )
        }
      }
    }

    for (const i of open) {
      const p = byId.get(i.patientId)
      if (!p) continue
      if (i.type === "care_gap") {
        add(
          `gap|${i.payload.due}|${i.payload.gap}`,
          { key: i.id, day: i.payload.due, stream: "gap", text: i.payload.gap, title: i.payload.gap, place: `${i.payload.gapType} gap`, item: i },
          { patient: p, note: i.payload.lastDone ? `Last done ${SHORT.format(new Date(`${i.payload.lastDone}T00:00:00`))}` : "Never done" }
        )
      } else if (i.type === "overdue_order" && i.payload.scheduledAt) {
        out.push({
          key: i.id,
          day: i.payload.scheduledAt,
          stream: "order",
          text: i.payload.order,
          title: i.payload.order,
          place: i.payload.facility ?? "Scheduled, not completed",
          item: i,
          people: [{ patient: p, note: `Ordered by ${i.payload.orderedBy}` }],
        })
      }
    }
    return [...out, ...group.values()].map((e) => (e.stream === "visit" ? { ...e, text: plural(e.people.length, "visit") } : e))
  }, [appts, open, byId, opt.members, today])
}

const ORDER: Stream[] = ["visit", "plan", "retest", "checkin", "order", "gap"]
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function CalendarCard({
  events,
  today,
  onEvent,
  className,
}: {
  events: CalEvent[]
  today: string
  onEvent: (e: CalEvent) => void
  className?: string
}) {
  const [anchor, setAnchor] = React.useState(() => new Date(`${today}T00:00:00`))
  const [view, setView] = React.useState<"month" | "week">("month")
  const [stream, setStream] = React.useState<"all" | Stream>("all")

  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = view === "month" ? mondayOf(first) : mondayOf(anchor)
  const weeks =
    view === "month" ? Math.ceil((((first.getDay() + 6) % 7) + new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()) / 7) : 1
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i))
  const byDay = new Map<string, CalEvent[]>()
  for (const e of events) {
    if (stream !== "all" && e.stream !== stream) continue
    byDay.set(e.day, [...(byDay.get(e.day) ?? []), e])
  }
  for (const list of byDay.values()) list.sort((a, b) => ORDER.indexOf(a.stream) - ORDER.indexOf(b.stream))
  const cap = view === "month" ? 3 : 8

  function step(d: -1 | 1) {
    setAnchor((a) => (view === "month" ? new Date(a.getFullYear(), a.getMonth() + d, 1) : addDays(a, d * 7)))
  }

  return (
    <Card className={className}>
      <CardHeader
        title={view === "month" ? MONTH.format(anchor) : `Week of ${SHORT.format(start)}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date(`${today}T00:00:00`))}>
              Today
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Previous" onClick={() => step(-1)}>
              <IconChevronLeft />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Next" onClick={() => step(1)}>
              <IconChevronRight />
            </Button>
            <SegmentedControl
              label="View"
              value={view}
              onChange={setView}
              items={[
                { value: "month", label: "Month" },
                { value: "week", label: "Week" },
              ]}
            />
            <Select value={stream} onValueChange={(v) => setStream(v as "all" | Stream)}>
              <SelectTrigger size="sm" aria-label="Streams">
                <SelectValue>{stream === "all" ? "All streams" : STREAM[stream].label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All streams</SelectItem>
                {(Object.keys(STREAM) as Stream[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    <Badge tone={STREAM[s].tone} dot>
                      {STREAM[s].label}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />
      <CardBody flush className="no-scrollbar overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((d) => (
              <span key={d} className="px-2.5 py-2 text-xs text-muted-foreground">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              const iso = isoDay(d)
              const list = byDay.get(iso) ?? []
              const inMonth = view === "week" || d.getMonth() === anchor.getMonth()
              return (
                <div
                  key={iso}
                  className={cn(
                    "flex min-w-0 flex-col gap-1 border-border p-1.5",
                    view === "month" ? "min-h-[116px]" : "min-h-[280px]",
                    i % 7 !== 6 && "border-r",
                    i < cells.length - 7 && "border-b",
                    i % 7 >= 5 && "bg-surface-sunken"
                  )}
                >
                  <span
                    className={cn(
                      "px-1 text-right text-[13px] tabular-nums",
                      !inMonth && "text-muted-foreground/60",
                      iso === today && "font-semibold text-primary-tint"
                    )}
                  >
                    {iso === today ? <Badge tone="primary">{d.getDate()}</Badge> : d.getDate()}
                  </span>
                  {list.slice(0, cap).map((e) => (
                    <button
                      key={e.key}
                      type="button"
                      title={`${STREAM[e.stream].label}: ${e.text}`}
                      onClick={() => onEvent(e)}
                      className={cn("flex min-w-0 rounded-sm text-left", FOCUS)}
                    >
                      <Badge tone={STREAM[e.stream].tone} dot className="w-full min-w-0 justify-start">
                        <span className="min-w-0 truncate">{e.text}</span>
                      </Badge>
                    </button>
                  ))}
                  {list.length > cap && <span className="px-1 text-xs text-muted-foreground tabular-nums">+{list.length - cap} more</span>}
                </div>
              )
            })}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

/** Roster's event sheet: when, which stream, where, and who. */
function EventSheet({ event, onClose, onItem }: { event: CalEvent | null; onClose: () => void; onItem: (item: QueueItem) => void }) {
  /* Keep the last event while the sheet slides out. */
  const [shown, setShown] = React.useState<CalEvent | null>(null)
  if (event && event !== shown) setShown(event)
  const e = event ?? shown
  return (
    <Sheet open={!!event} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="gap-0 sm:max-w-md">
        {e && (
          <>
            <SheetHeader className="border-b border-border">
              <SheetTitle className="pr-8">{e.title}</SheetTitle>
            </SheetHeader>
            <ItemGroup className="min-h-0 flex-1 gap-0 overflow-y-auto p-3">
              <Item size="xs">
                <ItemMedia variant="icon">
                  <IconClock className="text-muted-foreground" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{LONG_DAY.format(new Date(`${e.day}T00:00:00`))}</ItemTitle>
                  <ItemDescription className="tabular-nums">
                    {e.stream === "visit" ? `${plural(e.people.length, "visit")} booked` : plural(e.people.length, "patient")}
                  </ItemDescription>
                </ItemContent>
              </Item>
              <Item size="xs">
                <ItemMedia variant="icon">
                  <IconCalendar className="text-muted-foreground" />
                </ItemMedia>
                <ItemContent>
                  <Badge tone={STREAM[e.stream].tone} dot>
                    {STREAM[e.stream].label}
                  </Badge>
                </ItemContent>
              </Item>
              {e.place && (
                <Item size="xs">
                  <ItemMedia variant="icon">
                    {e.virtual ? <IconVideo className="text-muted-foreground" /> : <IconLocation className="text-muted-foreground" />}
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{e.place}</ItemTitle>
                  </ItemContent>
                </Item>
              )}
              {e.people.map(({ patient: p, note }, i) => (
                <Item key={`${p.id}-${i}`} size="xs" render={<Link href={`${BASE}/${p.id}`} />}>
                  <ItemMedia>
                    <Avatar name={fullName(p)} photo={p.photo} size={30} />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle>{fullName(p)}</ItemTitle>
                    <ItemDescription className="truncate">
                      {ageSex(p)} · {note}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
            <SheetFooter className="flex-row justify-end border-t border-border">
              {e.item ? (
                <Button variant="outline" size="sm" onClick={() => onItem(e.item!)}>
                  Open item
                </Button>
              ) : (
                e.href && (
                  <Link href={e.href} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                    {e.stream === "visit" ? "Open schedule" : e.stream === "plan" ? "Review plan" : "Open chart"}
                  </Link>
                )
              )}
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

/* ------------------------------------------------- care plan review -- */

export function CarePlanReview({ opt }: { opt: Opt }) {
  const counts = Object.fromEntries(opt.byStage.map((s) => [s.stage, s.count])) as Record<PlanStage, number>
  const total = opt.members.length
  const reviewed = counts["Sent to patient"] + counts.Active
  const oldest = [...opt.reviewing].sort((a, b) => (b.stageDays ?? 0) - (a.stageDays ?? 0))[0]
  const [stage, setStage] = React.useState<string | undefined>()
  const slices: ReSlice[] = PLAN_STAGES.map((st) => ({
    key: st.replace(/\s+/g, "-").toLowerCase(),
    label: st,
    value: counts[st],
    color: STAGE_HUE[st],
    fill: st === "Pending review" ? "stripe" : "solid",
  }))

  return (
    <Card>
      <CardHeader
        title="Care plan review"
        description={`${plural(total, "member plan")} this cycle`}
        actions={
          <Link href={oldest ? carePlanHref(oldest.patient.id) : BASE} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Review next
          </Link>
        }
      />
      <CardBody className="flex flex-col gap-4">
        {/* ReUI's donut with a centre total: each stage a slice, the stage
            still on the physician striped. */}
        <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
          <ReDonut
            data={slices}
            active={stage}
            onSelect={(k) => setStage((s) => (s === k ? undefined : k))}
            centerValue={`${reviewed}/${total}`}
            centerLabel="Reviewed"
            height={184}
            thickness={22}
            className="w-[184px] shrink-0"
          />
          <ReDonutLegend data={slices} active={stage} onSelect={(k) => setStage((s) => (s === k ? undefined : k))} className="w-full" />
        </div>
        <p className="text-[13px] text-muted-foreground">
          {oldest ? (
            <>
              {oldest.name} waits <span className="font-semibold text-foreground tabular-nums">{plural(oldest.stageDays ?? 0, "day")}</span>
            </>
          ) : (
            "Nothing waiting on you"
          )}
        </p>
      </CardBody>
    </Card>
  )
}

/* ---------------------------------------------------- biological age -- */

const STAGE_HUE: Record<PlanStage, string> = {
  "Pending review": SUBTLE.orange,
  "Changes requested": SUBTLE.red,
  "Sent to patient": SUBTLE.blue,
  Active: SUBTLE.green,
}

const BIO_SERIES: ReSeries[] = [{ key: "gap", label: "Bio age gap, years", color: SUBTLE.blue, fill: "gradient" }]

function BiologicalAge({ opt, today }: { opt: Opt; today: string }) {
  const [who, setWho] = React.useState<"all" | "members">("all")
  const list = who === "all" ? opt.all.filter((o) => o.patient.status === "Active") : opt.active
  const end = new Date(`${today}T00:00:00`)
  const rows = Array.from({ length: 6 }, (_, i) => ({
    label: MONTH_SHORT.format(new Date(end.getFullYear(), end.getMonth() - (5 - i), 1)),
    gap: +avg(list.map((o) => o.bioTrend[i]! - o.age)).toFixed(1),
  }))
  const now = rows[rows.length - 1]!.gap
  /* Whole years with a year of room; the span is a multiple of the axis's
     four steps so every tick lands on a whole year. */
  const lo = Math.floor(Math.min(...rows.map((r) => r.gap)) - 1)
  const top = Math.ceil(Math.max(...rows.map((r) => r.gap)) + 1)
  const hi = lo + Math.max(4, Math.ceil((top - lo) / 4) * 4)
  const change = +(now - rows[0]!.gap).toFixed(1)
  const better = change < 0

  return (
    <Card>
      <CardHeader
        title="Biological age"
        description={`${plural(list.length, "patient")}, against their real age`}
        actions={
          <SegmentedControl
            label="Who"
            value={who}
            onChange={setWho}
            items={[
              { value: "all", label: "All" },
              { value: "members", label: "On plans" },
            ]}
          />
        }
      />
      <CardBody className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[28px] leading-9 font-semibold tabular-nums">{years(now)}</span>
          <Badge tone={change === 0 ? "light" : better ? "success" : "error"} icon={better ? ArrowDown02Icon : ArrowUp02Icon}>
            {years(change)} over 6 months
          </Badge>
        </div>
        {/* ReUI's area chart with glowing dot markers. */}
        <ReAreaChart
          data={rows}
          xKey="label"
          series={BIO_SERIES}
          dots="glow"
          height={168}
          showYAxis
          yDomain={[lo, hi]}
          baseValue="dataMin"
          referenceY={lo < 0 && hi > 0 ? { value: 0 } : undefined}
          yTickFormat={(v) => `${v > 0 ? "+" : ""}${v} y`}
          valueFormat={(v) => years(v)}
        />
      </CardBody>
    </Card>
  )
}

/* --------------------------------------------------- member progress -- */

function MemberProgress({
  opt,
  open,
  onOpen,
  className,
}: {
  opt: Opt
  open: QueueItem[]
  onOpen: (items: QueueItem[], from: HTMLElement) => void
  className?: string
}) {
  const router = useRouter()
  const rank: Record<MemberStatus, number> = { Slipping: 0, "At risk": 1, "On track": 2, "Not started": 3 }
  const rows = opt.members
    .map((o) => ({ o, status: statusOf(o), items: open.filter((i) => i.patientId === o.patient.id) }))
    .sort((a, b) => rank[a.status] - rank[b.status] || (a.o.progress ?? 0) - (b.o.progress ?? 0))
  const [all, setAll] = React.useState(false)
  const shown = all ? rows : rows.slice(0, 8)

  return (
    <Card className={className}>
      <CardHeader
        title="Member progress"
        count={<Badge tone="light">{opt.members.length}</Badge>}
        description={`${plural(opt.active.length, "active plan")}, slipping first`}
      />
      {rows.length === 0 ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyTitle>No optimization members yet</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable minWidth={860}>
          <TableHeader>
            <TableRow>
              <Th>Member</Th>
              <Th>Plans</Th>
              <Th className="w-[200px]">Progress</Th>
              <Th>Open</Th>
              <Th>Daily score</Th>
              <Th>Status</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map(({ o, status, items }) => (
              <Row key={o.patient.id} onOpen={() => router.push(carePlanHref(o.patient.id))}>
                <Td>
                  <span className="flex items-center gap-3">
                    <Avatar name={o.name} photo={o.patient.photo} size={36} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{o.name}</span>
                      <span className="truncate text-xs text-muted-foreground tabular-nums">
                        Bio age {o.bioAge}, {years(o.gap)}
                      </span>
                    </span>
                  </span>
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1" title={o.plans.join(", ")}>
                    <Badge tone="light">{o.plans[0]}</Badge>
                    {o.plans.length > 1 && <Badge tone="outline">+{o.plans.length - 1}</Badge>}
                  </span>
                </Td>
                <Td>
                  {o.stage === "Active" ? (
                    <span className="flex flex-col gap-1.5">
                      <span className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="font-semibold tabular-nums">{Math.round((o.progress ?? 0) * 100)}%</span>
                        <span className="text-muted-foreground tabular-nums">Week {o.week}</span>
                      </span>
                      <Progress value={Math.round((o.progress ?? 0) * 100)} aria-label={`${o.name} progress to goal`} />
                    </span>
                  ) : (
                    o.stage && (
                      <Badge tone={STAGE_TONE[o.stage]} dot>
                        {o.stage}
                      </Badge>
                    )
                  )}
                </Td>
                <Td>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={!items.length}
                    aria-label={`${plural(items.length, "open item")} for ${o.name}`}
                    onClick={(e) => onOpen(items, e.currentTarget)}
                    className="tabular-nums"
                  >
                    {items.length}
                  </Button>
                </Td>
                <Td>
                  {o.dailyScore ? (
                    <span className="flex items-center gap-2">
                      <AreaSpark
                        values={o.dailyScore}
                        color={STATUS_COLOR[status]}
                        label={`${o.name}, daily score for 7 days`}
                        domain={[50, 100]}
                        className="w-16"
                      />
                      <span className="text-sm font-semibold tabular-nums">{o.dailyScore[o.dailyScore.length - 1]}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not yet</span>
                  )}
                </Td>
                <Td>
                  <Badge tone={STATUS_TONE[status]} dot>
                    {status}
                  </Badge>
                </Td>
              </Row>
            ))}
          </TableBody>
        </DataTable>
      )}
      {rows.length > 8 && <FooterLink onClick={() => setAll((v) => !v)}>{all ? "Show fewer" : `Show all ${rows.length}`}</FooterLink>}
    </Card>
  )
}

/* ------------------------------------------------------ action queue -- */

type QueueRow = {
  key: string
  icon: React.ComponentProps<typeof IconTile>["icon"]
  color: string
  title: string
  meta: string
  verb: string
  href?: string
  items?: QueueItem[]
  /** Done right here: the button turns into this word, with Undo. */
  done?: { word: string; toast: string; description: string }
}

function ActionQueue({
  rows,
  onOpen,
  className,
}: {
  rows: QueueRow[]
  onOpen: (items: QueueItem[], from: HTMLElement) => void
  className?: string
}) {
  const [done, setDone] = React.useState<Record<string, boolean>>({})
  function finish(r: QueueRow) {
    if (!r.done) return
    setDone((d) => ({ ...d, [r.key]: true }))
    toast.success(r.done.toast, {
      description: r.done.description,
      action: { label: "Undo", onClick: () => setDone((d) => ({ ...d, [r.key]: false })) },
    })
  }
  const left = rows.filter((r) => !done[r.key]).length
  return (
    <Card className={className}>
      <CardHeader title="Action queue" count={<Badge tone="light">{left}</Badge>} />
      {rows.length === 0 ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyTitle>You are all caught up</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <ItemGroup className="gap-0 divide-y divide-border">
          {rows.map((r) => (
            <Item key={r.key} size="sm" className="rounded-none">
              <ItemMedia>
                <IconTile icon={r.icon} color={r.color} />
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle className={cn(done[r.key] && "text-muted-foreground")}>{r.title}</ItemTitle>
                <ItemDescription className="truncate">{r.meta}</ItemDescription>
              </ItemContent>
              <ItemActions>
                {done[r.key] && r.done ? (
                  <Badge tone="success" icon={Tick02Icon}>
                    {r.done.word}
                  </Badge>
                ) : r.done ? (
                  <Button variant="outline" size="xs" onClick={() => finish(r)}>
                    {r.verb}
                  </Button>
                ) : r.items ? (
                  <Button variant="outline" size="xs" onClick={(e) => onOpen(r.items!, e.currentTarget)}>
                    {r.verb}
                  </Button>
                ) : (
                  <Link href={r.href ?? BASE} className={cn(buttonVariants({ variant: "outline", size: "xs" }))}>
                    {r.verb}
                  </Link>
                )}
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}
    </Card>
  )
}

/* -------------------------------------------------------------- page -- */

/** Today's visits by how they stand, as the live dashboard's stat card shows them. */
function visitSegments(day: Appointment[]): Segment[] {
  const n = (s: Appointment["status"][]) => day.filter((a) => s.includes(a.status)).length
  return [
    { label: "Completed", value: n(["Completed"]), color: SUBTLE.green },
    { label: "Checked in", value: n(["Checked in"]), color: SUBTLE.orange },
    { label: "Scheduled", value: n(["Scheduled"]), color: SUBTLE.blue },
    { label: "Missed", value: n(["No show", "Cancelled"]), color: SUBTLE.red },
  ]
}

export function DashboardBrief() {
  const d = useProviderDay()
  const opt = useOptimization()
  const appts = useAppointments(d.now)
  const [event, setEvent] = React.useState<CalEvent | null>(null)

  const today = d.now ? dayOf(d.now) : NOW.slice(0, 10)
  const events = useEvents(appts, d.open, d.byId, opt, today)
  const ready = d.ready && opt.ready && !!d.now

  /* ------------------------------------------------- item panel -- */

  const [panel, setPanel] = React.useState<{ id: string; list: string[] } | null>(null)
  const openerRef = React.useRef<HTMLElement | null>(null)
  const queueItems = React.useMemo(() => d.work.map(toQueue), [d.work])
  const current = panel ? (queueItems.find((i) => i.id === panel.id) ?? null) : null
  const at = panel ? panel.list.indexOf(panel.id) : -1
  const stepTo = (n: -1 | 1) => (panel && panel.list[at + n] ? () => setPanel({ ...panel, id: panel.list[at + n]! }) : undefined)

  function openItems(items: QueueItem[], from?: HTMLElement) {
    if (!items.length) return
    if (from) openerRef.current = from
    setPanel({ id: items[0]!.id, list: items.map((i) => i.id) })
  }

  const act: Act = (kind: ActionKind, opts: ActionOptions = {}) => {
    if (!panel || !current) return
    const snapshot = d.work.find((i) => i.id === current.id)
    workItems.patch(current.id, applyAction(kind, opts))
    recordAudit(ACTOR, [kind, opts.reason ?? (opts.days && `${opts.days} days`)].filter(Boolean).join(": "), current.id)
    toast.success(actionLabel(kind, opts), {
      description: itemName(current),
      action: snapshot
        ? {
            label: "Undo",
            onClick: () => {
              workItems.patch(snapshot.id, { ...snapshot })
              recordAudit(ACTOR, "undo", snapshot.id)
            },
          }
        : undefined,
    })
    const rest = panel.list.filter((id) => id !== current.id)
    const next = rest[at] ?? rest[at - 1]
    setPanel(next ? { id: next, list: rest } : null)
  }

  /* ------------------------------------------------------ stats -- */

  const day = d.clinic.today
  const booked = day.filter((a) => a.status !== "Cancelled")
  const next = d.clinic.day.find((a) => a.status === "Scheduled" || a.status === "Checked in")
  const nextPatient = next ? d.byId.get(next.patientId) : undefined
  const minsTo = next && d.now ? Math.round((ms(next.start) - ms(d.now)) / 60_000) : 0
  const late = opt.reviewing.filter((o) => (o.stageDays ?? 0) >= 7).length
  const byStatus = (s: MemberStatus) => opt.active.filter((o) => statusOf(o) === s).length
  const upgradePlans = new Set(opt.upgrade.flatMap((o) => o.plans)).size
  const free = opt.all.filter((o) => !o.member).length
  const oldest = [...opt.reviewing].sort((a, b) => (b.stageDays ?? 0) - (a.stageDays ?? 0))[0]

  /* --------------------------------------------------- the queue -- */

  const route = opt.tests.filter((x) => x.t.route === "Physician to decide")
  const missed = opt.active.filter(missedCheckIn)
  const queue = (
    [
      d.urgent.length > 0 && {
        key: "urgent",
        icon: IconAlert,
        color: SUBTLE.red,
        title: plural(d.urgent.length, "urgent result"),
        meta: d.urgent.slice(0, 2).map(itemName).join(", "),
        verb: "Review",
        items: d.urgent,
      },
      opt.reviewing.length > 0 && {
        key: "plans",
        icon: IconFileCheck,
        color: SUBTLE.violet,
        title: `${plural(opt.reviewing.length, "plan")} to review`,
        meta: opt.reviewing
          .slice(0, 2)
          .map((o) => `${o.name}, ${o.plans[0]}`)
          .join("; "),
        verb: "Review",
        href: carePlanHref(opt.reviewing[0]!.patient.id),
      },
      route.length > 0 && {
        key: "route",
        icon: IconLab,
        color: SUBTLE.blue,
        title: `${plural(route.length, "baseline test")} to route`,
        meta: `${route
          .slice(0, 2)
          .map((x) => x.t.name)
          .join(", ")}: insurance or cash`,
        verb: "Route",
        href: carePlanHref(route[0]!.o.patient.id),
      },
      opt.watchful.length > 0 && {
        key: "watch",
        icon: IconTrendUp,
        color: SUBTLE.orange,
        title: plural(opt.watchful.length, "watchful trend"),
        meta: opt.watchful
          .slice(0, 2)
          .map((x) => `${x.m.name}, ${x.o.patient.firstName}`)
          .join("; "),
        verb: "Check",
        href: `${BASE}/${opt.watchful[0]!.o.patient.id}`,
      },
      missed.length > 0 && {
        key: "checkin",
        icon: IconPulse,
        color: SUBTLE.blue,
        title: `${plural(missed.length, "symptom check in")} missed`,
        meta: missed.map((o) => o.name).join(", "),
        verb: "Nudge",
        done: { word: "Nudged", toast: "Members nudged", description: `A check in reminder went to ${plural(missed.length, "member")}.` },
      },
      opt.upgrade.length > 0 && {
        key: "upgrade",
        icon: IconSparkles,
        color: SUBTLE.green,
        title: plural(opt.upgrade.length, "upgrade candidate"),
        meta: `${plural(upgradePlans, "plan")} matched from their records`,
        verb: "Invite to plan",
        done: { word: "Invited", toast: "Plan invites sent", description: `${plural(opt.upgrade.length, "patient")} will see their matched plans.` },
      },
    ] as (QueueRow | false)[]
  ).filter((r): r is QueueRow => !!r)

  return (
    <VariantFrame>
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-lg leading-7 font-semibold">Home</h1>
        <Button variant="outline" size="sm" className="bg-card" onClick={() => toast("Ask Inlay", { description: "Ask about your panel from here." })}>
          <IconSparkles />
          <span className="max-sm:sr-only">Ask Inlay</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-card"
          onClick={() => {
            void navigator.clipboard?.writeText(window.location.href)
            toast.success("Link copied")
          }}
        >
          <IconShare />
          <span className="max-sm:sr-only">Share</span>
        </Button>
        <Button size="sm" onClick={() => toast.success("Export started", { description: "Panel report, PDF" })}>
          <IconDownload />
          Export
        </Button>
      </header>

      {!ready ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <Skeleton className="h-[220px] w-full rounded-[7.2px]" />
          <div className="grid gap-4 xl:grid-cols-3">
            <Skeleton className="h-[620px] rounded-[7.2px] xl:col-span-2" />
            <Skeleton className="h-[620px] rounded-[7.2px]" />
          </div>
        </>
      ) : (
        <>
          <section aria-label="Your panel at a glance" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              icon={IconFileCheck}
              label="Plans to review"
              when="Waiting"
              value={opt.reviewing.length}
              of={opt.members.length}
              meta={late > 0 ? `${late} waiting 7 days or more` : `${plural(opt.tests.length, "baseline test")} to route`}
              segments={[
                { label: "Pending review", value: opt.byStage.find((s) => s.stage === "Pending review")?.count ?? 0, color: SUBTLE.orange },
                { label: "Changes asked", value: opt.byStage.find((s) => s.stage === "Changes requested")?.count ?? 0, color: SUBTLE.red },
              ]}
              footer={<FooterLink href={oldest ? carePlanHref(oldest.patient.id) : BASE}>Review the oldest</FooterLink>}
            />
            <StatCard
              icon={IconTarget}
              label="On track"
              when="This week"
              value={byStatus("On track")}
              of={opt.active.length}
              meta={`${Math.round(opt.avgProgress * 100)}% to goal on average`}
              segments={(["On track", "At risk", "Slipping"] as MemberStatus[]).map((s) => ({
                label: s,
                value: byStatus(s),
                color: STATUS_COLOR[s],
              }))}
              footer={<FooterLink href={BASE}>Open members</FooterLink>}
            />
            <StatCard
              icon={IconDna}
              label="Bio age gap"
              when="Years"
              value={opt.bio.avgGap}
              meta={`Members on plans ${years(opt.bio.avgGapMembers)}`}
              segments={[
                { label: "Younger", value: opt.bio.younger, color: SUBTLE.green },
                { label: "Near age", value: opt.bio.near, color: SUBTLE.blue },
                { label: "Older", value: opt.bio.older, color: SUBTLE.red },
              ]}
              footer={<FooterLink href={BASE}>View patients</FooterLink>}
            />
            <StatCard
              icon={IconUserAdd}
              label="Upgrade candidates"
              when="Free"
              value={opt.upgrade.length}
              of={free}
              meta={`${plural(upgradePlans, "plan")} matched from records`}
              segments={[
                { label: "Plan fit", value: opt.upgrade.length, color: SUBTLE.violet },
                { label: "Not yet", value: Math.max(0, free - opt.upgrade.length), color: GREY },
              ]}
              footer={<FooterLink href={BASE}>View candidates</FooterLink>}
            />
            <StatCard
              icon={IconCalendar}
              label="Visits"
              when="Today"
              value={booked.length}
              meta={
                next
                  ? `Next ${clockTime(next.start)}, ${nextPatient ? fullName(nextPatient) : next.type}${
                      next.status === "Checked in" ? ", in the room" : minsTo > 0 && minsTo < 60 ? `, in ${minsTo} min` : ""
                    }`
                  : "None left today"
              }
              segments={visitSegments(day)}
              footer={<FooterLink href={`${BASE}/schedule`}>Open schedule</FooterLink>}
            />
          </section>

          <OptimizationOverview opt={opt} />

          <div className="grid gap-4 xl:grid-cols-3">
            <CalendarCard events={events} today={today} onEvent={setEvent} className="xl:col-span-2" />
            <div className="flex min-w-0 flex-col gap-4">
              <CarePlanReview opt={opt} />
              <BiologicalAge opt={opt} today={today} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <MemberProgress opt={opt} open={d.open} onOpen={openItems} className="xl:col-span-2" />
            <ActionQueue rows={queue} onOpen={openItems} />
          </div>
        </>
      )}

      <EventSheet
        event={event}
        onClose={() => setEvent(null)}
        onItem={(i) => {
          setEvent(null)
          openItems([i])
        }}
      />
      <ItemPanel
        item={current}
        patient={current ? (d.byId.get(current.patientId) ?? null) : null}
        onPrevious={stepTo(-1)}
        onNext={stepTo(1)}
        onClose={() => setPanel(null)}
        returnFocus={openerRef}
        onAct={act}
      />
    </VariantFrame>
  )
}
