"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowDown02Icon, ArrowUp02Icon } from "@hugeicons/core-free-icons"
import {
  IconCalendar,
  IconFileList,
  IconChat,
  IconCheck,
  IconCheckCircle,
  IconChevronLeft,
  IconChevronRight,
  IconDashboard,
  IconDownload,
  IconFileCheck,
  IconFlash,
  IconHistory,
  IconLocation,
  IconMore,
  IconTarget,
  IconUsersGroup,
  IconVideo,
  IconWarning,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/design-system/ui/breadcrumb"
import { Button, buttonVariants } from "@/design-system/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/design-system/ui/dropdown-menu"
import { Item } from "@/design-system/ui/item"
import { Progress } from "@/design-system/ui/progress"
import { Skeleton } from "@/design-system/ui/skeleton"
import { toast } from "@/design-system/ui/sonner"
import { type Patient, fullName, providers } from "@/components/practice/practice-data"
import {
  Avatar,
  Badge,
  type Tone as BadgeTone,
  Card,
  CardFooter,
  CardHeader,
  FOCUS,
  KitIcon,
  PALETTE,
  ReBarChart,
  ReDonut,
  ReDonutLegend,
  ReLegend,
  ReRadial,
  SegmentedControl,
  Sparkline,
} from "@/components/dashboard-kit-v2"
import { AreaSpark } from "@/components/dashboard-kit-v2/charts"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import { CHAT_ME, chats, lastOf } from "@/components/provider/communication/chat-data"
import { ms } from "@/components/provider/mock-clock"
import { PROVIDER_ID } from "@/components/provider/provider-shell"
import { type Appointment, isoDay, useAppointments } from "@/components/provider/schedule/schedule-data"
import { AppointmentDialog } from "@/components/provider/schedule/schedule"
import { ME, tasks } from "@/components/provider/tasks/tasks-data"
import { daysSince } from "@/components/provider/home-v2/clock"
import { ItemPanel } from "@/components/provider/home-v2/item-panel"
import { recordAudit, workItems } from "@/components/provider/home-v2/mock"
import { IconTile, SegmentBar } from "@/components/provider/home-v2/overview"
import { TYPE_META } from "@/components/provider/home-v2/labels"
import { type ActionOptions, ITEM_TYPES, actionLabel, applyAction, byPriority, toQueue } from "@/components/provider/home-v2/selectors"
import type { ActionKind, ItemType, Priority, WorkItem } from "@/components/provider/home-v2/types"
import { VariantFrame } from "@/components/provider/dashboard-variants/frame"
import { useOptimization } from "@/components/provider/dashboard-variants/optimization-data"
import { useDashboardMetrics, useProviderDay } from "@/components/provider/dashboard-variants/use-provider-day"

/* Variation 3, after ReUI's Verve CRM: the practice as a CRM. A secondary
   nav switches six views (Dashboard, Today, Activity, Quick stats, Care
   plans, Engagement), each on the portal's own cards, badges, charts and tables. Every number
   reads the stores the live dashboard reads. */

const BASE = "/screens/patients"
const ACTOR = "Daniel Reyes, MD"

type View = "dashboard" | "today" | "activity" | "quick-stats" | "plans" | "members" | "upgrade"

const NAV: { group: string; items: { view: View; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    group: "Overview",
    items: [
      { view: "dashboard", label: "Dashboard", icon: IconDashboard },
      { view: "today", label: "Today", icon: IconCalendar },
      { view: "activity", label: "Activity", icon: IconHistory },
      { view: "quick-stats", label: "Quick stats", icon: IconFlash },
    ],
  },
  {
    group: "Optimization",
    items: [
      { view: "plans", label: "Plans to review", icon: IconFileCheck },
      { view: "members", label: "Members", icon: IconUsersGroup },
      { view: "upgrade", label: "Upgrade pipeline", icon: IconTarget },
    ],
  },
]
const VIEWS = NAV.flatMap((g) => g.items)
const viewOf = (s: string | null): View => VIEWS.find((v) => v.view === s)?.view ?? "dashboard"

/* ------------------------------------------------------------- dates -- */

const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
const LONG_DAY = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" })
const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short" })
const TIME = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })

function mondayOf(now: string, offsetWeeks = 0) {
  const d = new Date(`${now.slice(0, 10)}T00:00:00`)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offsetWeeks * 7)
  return d
}
function weekDays(now: string, offsetWeeks = 0, n = 5) {
  const m = mondayOf(now, offsetWeeks)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(m)
    d.setDate(m.getDate() + i)
    return d
  })
}
const inDays = (a: Appointment, days: Date[]) => days.some((d) => a.start.startsWith(isoDay(d)))

/** "12 min ago", "3 h ago", "Yesterday", "4 d ago". */
function ago(at: string, now: string) {
  const min = Math.round((ms(now) - ms(at)) / 60_000)
  if (min < 1) return "Just now"
  if (min < 60) return `${min} min ago`
  if (min < 24 * 60) return `${Math.round(min / 60)} h ago`
  const d = Math.round(min / (24 * 60))
  return d === 1 ? "Yesterday" : `${d} d ago`
}
const daysAgo = (iso: string, now: string) => Math.max(0, Math.round((ms(now.slice(0, 10)) - ms(iso.slice(0, 10))) / 86_400_000))
const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0)

/* ------------------------------------------------------------- tones -- */

/* The portal's soft status hues and the kit's badge tones, by one name. */
type Tone = "red" | "orange" | "amber" | "green" | "teal" | "blue" | "sky" | "violet" | "pink" | "gray"
const HUE: Record<Tone, string> = {
  red: SUBTLE.red,
  orange: SUBTLE.orange,
  amber: SUBTLE.orange,
  green: SUBTLE.green,
  teal: PALETTE.primary,
  blue: SUBTLE.blue,
  sky: PALETTE.info,
  violet: SUBTLE.violet,
  pink: PALETTE.primaryLight,
  gray: "#B5B5B5",
}
const BADGE: Record<Tone, BadgeTone> = {
  red: "error",
  orange: "warning",
  amber: "warning",
  green: "success",
  teal: "primary",
  blue: "info",
  sky: "info",
  violet: "light",
  pink: "light",
  gray: "light",
}
/** Words take the soft hue mixed toward the ink, as on the live dashboard. */
const ink = (tone: Tone) => `color-mix(in oklab, ${HUE[tone]} 70%, var(--foreground))`

function Chip({
  tone = "gray",
  dot,
  icon,
  className,
  children,
}: {
  tone?: Tone
  dot?: boolean
  icon?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <Badge tone={BADGE[tone]} dot={dot} className={className}>
      {icon}
      {children}
    </Badge>
  )
}

/** A change as an arrow and a number: green when it helps, red when it hurts. */
function TrendText({ value, suffix = "", goodWhen = "up" }: { value: number; suffix?: string; goodWhen?: "up" | "down" }) {
  const good = value === 0 ? null : (value > 0) === (goodWhen === "up")
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        good === null ? "text-muted-foreground" : good ? "text-success" : "text-destructive"
      )}
    >
      {value !== 0 && <KitIcon icon={value < 0 ? ArrowDown02Icon : ArrowUp02Icon} size={14} />}
      {value > 0 ? "+" : ""}
      {value}
      {suffix}
    </span>
  )
}

/** A share as the design system's progress bar, in a status hue. */
function Meter({ value, tone = "teal", label, className }: { value: number; tone?: Tone; label?: string; className?: string }) {
  return (
    <Progress
      value={Math.round(Math.min(1, Math.max(0, value)) * 100)}
      aria-label={label}
      className={cn("[&_[data-slot=progress-indicator]]:bg-(--bar) [&_[data-slot=progress-track]]:h-1.5", className)}
      style={{ "--bar": HUE[tone] } as React.CSSProperties}
    />
  )
}

/** A status as a dot and a word, the way the live dashboard writes it. */
function Dot({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: HUE[tone] }} />
      {children}
    </span>
  )
}

const segs = (rows: { label: string; value: number; tone: Tone }[]) => rows.map((r) => ({ label: r.label, value: r.value, color: HUE[r.tone] }))

/* ------------------------------------------------------------ frames -- */

/** A section: the kit's card with its header (title, one data line, controls), a body and an optional footer of buttons. */
function VFrame({
  title,
  sub,
  actions,
  footer,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode
  sub?: React.ReactNode
  actions?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <Card className={className}>
      {(title || actions) && <CardHeader title={title ?? ""} description={sub} actions={actions} />}
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", bodyClassName)}>{children}</div>
      {footer && <CardFooter className="grid grid-cols-2 [&>*]:w-full">{footer}</CardFooter>}
    </Card>
  )
}

function SectionSkeleton({ h = 220 }: { h?: number }) {
  return <Skeleton className="w-full rounded-[7.2px]" style={{ height: h }} />
}

function AvatarStack({ people, max = 3 }: { people: Patient[]; max?: number }) {
  const shown = people.slice(0, max)
  return (
    <span className="flex items-center">
      {shown.map((p, i) => (
        <span key={p.id} className={cn("rounded-full ring-2 ring-card", i > 0 && "-ml-2")}>
          <Avatar name={fullName(p)} photo={p.photo} size={28} />
        </span>
      ))}
      {people.length > max && (
        <span className="-ml-2 flex size-7 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card tabular-nums">
          +{people.length - max}
        </span>
      )}
    </span>
  )
}

/** Mesh's inline action: a small button that turns into a green chip once done. */
function QuickAction({ label, done, onRun }: { label: string; done: string; onRun: () => void }) {
  const [ran, setRan] = React.useState(false)
  return ran ? (
    <Chip tone="green" icon={<IconCheck />}>
      {done}
    </Chip>
  ) : (
    <Button
      variant="outline"
      size="xs"
      className="bg-card"
      onClick={(e) => {
        e.stopPropagation()
        onRun()
        setRan(true)
      }}
    >
      {label}
    </Button>
  )
}

/** The ··· menu at a row's end. */
function RowMenu({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`More for ${label}`} onClick={(e) => e.stopPropagation()} />}
      >
        <IconMore />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}


/** The live dashboard's item panel over a list of work items: open one,
    step through the rest, and work it with Undo in a toast. */
function useItemPanel(day: Day) {
  const [panel, setPanel] = React.useState<{ id: string; list: string[] } | null>(null)
  const opener = React.useRef<HTMLElement | null>(null)
  const queue = React.useMemo(() => day.work.map(toQueue), [day.work])
  const current = panel ? (queue.find((i) => i.id === panel.id) ?? null) : null
  const at = panel ? panel.list.indexOf(panel.id) : -1
  const step = (d: -1 | 1) => (panel && panel.list[at + d] ? () => setPanel({ ...panel, id: panel.list[at + d]! }) : undefined)

  function act(kind: ActionKind, opts: ActionOptions = {}) {
    if (!panel || !current) return
    const snapshot: WorkItem = { ...current }
    workItems.patch(current.id, applyAction(kind, opts))
    recordAudit(ACTOR, kind, current.id)
    toast.success(actionLabel(kind, opts), {
      action: {
        label: "Undo",
        onClick: () => {
          workItems.patch(snapshot.id, snapshot)
          recordAudit(ACTOR, "undo", snapshot.id)
        },
      },
    })
    const rest = panel.list.filter((id) => id !== current.id)
    const next = rest[at] ?? rest[at - 1]
    setPanel(next ? { id: next, list: rest } : null)
  }

  return {
    open(id: string, list: string[], from: HTMLElement) {
      opener.current = from
      setPanel({ id, list })
    },
    node: (
      <ItemPanel
        item={current}
        patient={current ? (day.byId.get(current.patientId) ?? null) : null}
        onPrevious={step(-1)}
        onNext={step(1)}
        onClose={() => setPanel(null)}
        returnFocus={opener}
        onAct={act}
      />
    ),
  }
}

/* ------------------------------------------------------------- page -- */

export function DashboardBoard() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const view = viewOf(params.get("view"))
  const day = useProviderDay()
  const ready = day.ready && !!day.now

  function go(next: View) {
    const q = new URLSearchParams(params)
    if (next === "dashboard") q.delete("view")
    else q.set("view", next)
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false })
  }

  const label = VIEWS.find((v) => v.view === view)!.label

  return (
    <VariantFrame padded={false}>
      <div className="flex min-h-0 flex-1 max-lg:flex-col">
        {/* Verve's secondary nav: grouped views, the active one on a grey pill. */}
        <nav aria-label="Practice views" className="shrink-0 border-r border-border bg-card max-lg:hidden lg:w-[200px]">
          <div className="sticky top-0 flex flex-col gap-4 px-2.5 py-4">
            {NAV.map((g) => (
              <div key={g.group} className="flex flex-col gap-0.5">
                <span className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">{g.group}</span>
                {g.items.map((it) => {
                  const active = it.view === view
                  return (
                    <Button
                      key={it.view}
                      variant={active ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => go(it.view)}
                      aria-current={active ? "page" : undefined}
                      className={cn("justify-start gap-2.5 font-normal", active && "font-medium")}
                    >
                      <it.icon className="text-muted-foreground" />
                      {it.label}
                    </Button>
                  )
                })}
              </div>
            ))}
          </div>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-5 px-4 pt-4 pb-10 sm:px-6">
          {/* Under 1024px the nav becomes a row of pills. */}
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:hidden">
            {VIEWS.map((it) => (
              <Button
                key={it.view}
                variant={it.view === view ? "secondary" : "outline"}
                size="sm"
                onClick={() => go(it.view)}
                aria-current={it.view === view ? "page" : undefined}
                className={cn("shrink-0 rounded-full", it.view !== view && "bg-card")}
              >
                <it.icon />
                {it.label}
              </Button>
            ))}
          </div>

          <header className="flex flex-wrap items-center gap-3">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link href={`${BASE}/dashboard`} />}>Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>Practice</BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" className="bg-card">
                <IconCalendar />
                {day.now ? weekLabel(day.now) : "This week"}
              </Button>
              <Button variant="outline" size="sm" className="bg-card max-sm:hidden">
                <IconDownload />
                Export
              </Button>
            </div>
          </header>

          {!ready ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <SectionSkeleton key={i} h={128} />
                ))}
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <SectionSkeleton h={420} />
                <SectionSkeleton h={420} />
              </div>
            </div>
          ) : view === "dashboard" ? (
            <DashboardView />
          ) : view === "today" ? (
            <TodayView day={day} />
          ) : view === "activity" ? (
            <ActivityView day={day} />
          ) : view === "quick-stats" ? (
            <QuickStatsView day={day} />
          ) : view === "plans" ? (
            <PlansReviewView />
          ) : view === "members" ? (
            <MembersView />
          ) : (
            <UpgradeView />
          )}
        </div>
      </div>
    </VariantFrame>
  )
}

function weekLabel(now: string) {
  const days = weekDays(now)
  const a = days[0]!
  const b = days[4]!
  return a.getMonth() === b.getMonth()
    ? `${SHORT.format(a)} to ${b.getDate()}, ${b.getFullYear()}`
    : `${SHORT.format(a)} to ${SHORT.format(b)}, ${b.getFullYear()}`
}

type Day = ReturnType<typeof useProviderDay>

/* --------------------------------------------------------- dashboard -- */

function KpiCard({
  icon,
  title,
  sub,
  badge,
  value,
  bars,
  tone,
  href,
}: {
  icon: typeof IconCalendar
  title: string
  sub: React.ReactNode
  badge?: React.ReactNode
  value: React.ReactNode
  bars?: number[]
  tone: Tone
  href: string
}) {
  return (
    <Link href={href} className={cn("group rounded-[7.2px]", FOCUS)}>
      <VFrame className="h-full transition-colors group-hover:border-foreground/20" bodyClassName="gap-5 p-4">
        <div className="flex items-start gap-3">
          <IconTile icon={icon} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[15px] font-medium">{title}</span>
            <span className="truncate text-[13px] text-muted-foreground tabular-nums">{sub}</span>
          </div>
          {badge}
        </div>
        <div className="flex items-end justify-between gap-3">
          <span className="text-[26px] leading-8 font-semibold tracking-tight tabular-nums">{value}</span>
          {bars && <AreaSpark values={bars} color={HUE[tone]} label={`${title}, recent values`} />}
        </div>
      </VFrame>
    </Link>
  )
}

type Opt = ReturnType<typeof useOptimization>
type Member = Opt["all"][number]

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)
const plansHref = (id: string) => `${BASE}/${id}?section=care-plan`

/** A member's standing on their plan: progress, the daily score and any marker off track. */
function memberStatus(o: Member): { label: string; tone: Tone } {
  if (o.stage !== "Active") return { label: o.stage ?? "No plan", tone: o.stage === "Changes requested" ? "orange" : "violet" }
  const score = mean(o.dailyScore ?? [])
  const off = o.markers.some((m) => !m.inRange && m.dir === "worse")
  if ((o.progress ?? 0) < 0.35 || off) return { label: "Slipping", tone: "red" }
  if ((o.progress ?? 0) >= 0.5 && score >= 70) return { label: "On track", tone: "green" }
  return { label: "Watch", tone: "amber" }
}

const ROUTE_TONE: Record<"Insurance" | "Cash" | "Physician to decide", Tone> = {
  Insurance: "blue",
  Cash: "teal",
  "Physician to decide": "amber",
}

function DashboardView() {
  const opt = useOptimization()
  const m = useDashboardMetrics()

  return (
    <div className="flex flex-col gap-4">
      {!m.ready ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[116px] rounded-[7.2px]" />
          ))}
        </div>
      ) : (
        <section aria-label="At a glance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={IconCalendar}
            title="Upcoming Appointments"
            sub={m.upcoming.today > 0 ? `${m.upcoming.today} later today` : "None later today"}
            badge={<Chip tone="blue">Next 7 days</Chip>}
            value={m.upcoming.count}
            tone="blue"
            href={`${BASE}/schedule`}
          />
          <KpiCard
            icon={IconUsersGroup}
            title="Patients Needing Attention"
            sub={`Review or follow-up, ${m.attention.urgent} with urgent items`}
            value={m.attention.patients}
            tone="amber"
            href={BASE}
          />
          <KpiCard
            icon={IconTarget}
            title="Active Optimization Members"
            sub={`Of ${m.active.members} optimization members`}
            value={m.active.count}
            tone="teal"
            href={`${BASE}/dashboard/v3?view=members`}
          />
          <KpiCard
            icon={IconFileList}
            title="Open Tasks"
            sub={m.tasks.overdue > 0 ? `${m.tasks.overdue} overdue` : "None overdue"}
            badge={m.tasks.overdue > 0 ? <Chip tone="red">{m.tasks.overdue} overdue</Chip> : undefined}
            value={m.tasks.open}
            tone="violet"
            href={`${BASE}/tasks`}
          />
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Performance opt={opt} />
        <div className="flex min-w-0 flex-col gap-4">
          <PlanCoverage opt={opt} />
          <MembersByPlan opt={opt} />
        </div>
      </div>

      <MemberTable
        title="Member progress"
        rows={opt.active.length ? opt.active : opt.members}
        sub={opt.active.length ? `${opt.active.length} on an active plan, slipping first` : `${opt.members.length} members, none on an active plan yet`}
      />
    </div>
  )
}

function Performance({ opt }: { opt: Opt }) {
  const [scope, setScope] = React.useState<"active" | "members">(opt.active.length ? "active" : "members")
  const list = scope === "active" ? opt.active : opt.members
  const onTrack = list.filter((o) => memberStatus(o).label === "On track").length
  const relief = mean(list.map((o) => mean(o.symptoms.map((s) => s.weeks[0]! - s.weeks[s.weeks.length - 1]!))))
  const gapNow = mean(list.map((o) => o.bioTrend[o.bioTrend.length - 1]! - o.age))
  const gapThen = mean(list.map((o) => o.bioTrend[0]! - o.age))
  const activePatients = opt.all.filter((o) => o.patient.status === "Active")
  const memberShare = pct(activePatients.filter((o) => o.member).length, activePatients.length)
  const feed = useOptimizationFeed(opt).slice(0, 4)

  return (
    <VFrame
      footer={
        <>
          <Link href={`${BASE}/dashboard/v3?view=plans`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-card")}>
            Plans to review
          </Link>
          <Link href={`${BASE}/reports`} className={buttonVariants({ size: "sm" })}>
            Full report
          </Link>
        </>
      }
      bodyClassName="p-5"
    >
      <div className="flex items-center gap-3">
        <h2 className="text-[17px] font-semibold">Performance</h2>
        <SegmentedControl
          label="Members"
          value={scope}
          onChange={setScope}
          className="ml-auto"
          items={[
            { value: "active", label: "Active plans" },
            { value: "members", label: "All members" },
          ]}
        />
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-4">
        <div className="flex min-w-0 flex-col">
          <dd className="text-[22px] leading-8 font-semibold tracking-tight tabular-nums">{pct(onTrack, list.length)}%</dd>
          <dt className="truncate text-[13px] text-muted-foreground">Members on track</dt>
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {onTrack} of {list.length}
          </span>
        </div>
        <div className="flex min-w-0 flex-col">
          <dd className="text-[22px] leading-8 font-semibold tracking-tight tabular-nums">{relief.toFixed(1)} pts</dd>
          <dt className="truncate text-[13px] text-muted-foreground">Symptom relief</dt>
          <TrendText value={+relief.toFixed(1)} suffix=" in 6 weeks" />
        </div>
        <div className="flex min-w-0 flex-col">
          <dd className="text-[22px] leading-8 font-semibold tracking-tight tabular-nums">
            {gapNow > 0 ? "+" : ""}
            {gapNow.toFixed(1)} y
          </dd>
          <dt className="truncate text-[13px] text-muted-foreground">Bio age gap</dt>
          <TrendText value={+(gapNow - gapThen).toFixed(1)} suffix=" y" goodWhen="down" />
        </div>
      </dl>

      <div className="mt-5 flex flex-col gap-2.5 border-t border-border pt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Members of active patients</span>
          <span className="font-semibold tabular-nums">{memberShare}%</span>
        </div>
        <Meter value={memberShare / 100} tone="teal" label="Members of active patients" />
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
        <h3 className="text-sm font-medium">Recent activity</h3>
        <ul className="flex flex-col gap-2.5">
          {feed.map((e) => (
            <li key={e.id}>
              <Link href={e.href} className={cn("flex items-center gap-2.5 rounded-md text-[13px] hover:text-foreground", FOCUS)}>
                <IconCheckCircle className="size-4 shrink-0" style={{ color: HUE[e.tone] }} />
                <span className="min-w-0 flex-1 truncate">
                  {e.who} <span className="text-muted-foreground">{e.what}</span>
                </span>
                <Chip tone={e.tone}>{e.chip}</Chip>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </VFrame>
  )
}

/** What moved on the optimization side: plans drafted, symptoms easing, scores slipping, trends to watch. */
function useOptimizationFeed(opt: Opt) {
  return React.useMemo(() => {
    const out: { id: string; who: string; what: string; chip: string; tone: Tone; href: string }[] = []
    for (const o of opt.reviewing)
      out.push({
        id: `r-${o.patient.id}`,
        who: o.name,
        what: o.stage === "Changes requested" ? "asked for plan changes" : `has ${o.plans.length} AI matched ${o.plans.length === 1 ? "plan" : "plans"} to review`,
        chip: "Review",
        tone: "violet",
        href: plansHref(o.patient.id),
      })
    for (const o of opt.active) {
      const best = [...o.symptoms].sort((a, b) => b.weeks[0]! - b.weeks.at(-1)! - (a.weeks[0]! - a.weeks.at(-1)!))[0]
      const s = memberStatus(o)
      if (s.label === "Slipping")
        out.push({ id: `s-${o.patient.id}`, who: o.name, what: "is slipping on their plan", chip: "Watch", tone: "amber", href: plansHref(o.patient.id) })
      else if (best && best.weeks[0]! - best.weeks.at(-1)! >= 2)
        out.push({
          id: `b-${o.patient.id}`,
          who: o.name,
          what: `${best.name.toLowerCase()} down ${best.weeks[0]! - best.weeks.at(-1)!} points`,
          chip: "Better",
          tone: "green",
          href: plansHref(o.patient.id),
        })
    }
    return out
  }, [opt])
}

function PlanCoverage({ opt }: { opt: Opt }) {
  const share = opt.members.length ? opt.active.length / opt.members.length : 0
  const sent = opt.byStage.find((x) => x.stage === "Sent to patient")?.count ?? 0
  const rings = [
    { key: "active", label: "Active", count: opt.active.length, color: HUE.green },
    { key: "sent", label: "Sent to patient", count: sent, color: HUE.blue },
    { key: "review", label: "In review", count: opt.reviewing.length, color: HUE.violet },
  ].map((r) => ({ ...r, value: pct(r.count, opt.members.length) }))
  return (
    <VFrame bodyClassName="gap-4 p-5">
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-semibold">Plan coverage</h2>
        <span className="ml-auto text-[13px] text-muted-foreground tabular-nums">
          {opt.active.length} of {opt.members.length} members
        </span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[30px] leading-9 font-semibold tracking-tight tabular-nums">{Math.round(share * 100)}%</span>
        <span className="text-[13px] text-muted-foreground">on an active plan</span>
      </div>
      <Meter value={share} tone="green" label="Members on an active plan" className="[&_[data-slot=progress-track]]:h-2.5" />
      {opt.members.length > 0 && (
        <div className="flex flex-wrap items-center gap-4">
          <ReRadial
            height={168}
            barSize={12}
            showLabels={false}
            className="w-[168px] shrink-0"
            data={rings}
            valueFormat={(v) => `${v}% of members`}
          />
          <ReDonutLegend
            className="min-w-[180px] flex-1"
            data={rings.map((r) => ({ ...r, value: r.count }))}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        {opt.byStage.map((s) => (
          <Chip key={s.stage} tone={s.stage === "Active" ? "green" : s.stage === "Changes requested" ? "orange" : s.stage === "Sent to patient" ? "blue" : "violet"}>
            {s.stage} {s.count}
          </Chip>
        ))}
        <span className="ml-auto flex items-center gap-2 text-muted-foreground">
          <AvatarStack people={opt.reviewing.map((o) => o.patient)} />
          {opt.reviewing.length} in review
        </span>
      </div>
    </VFrame>
  )
}

function MembersByPlan({ opt }: { opt: Opt }) {
  const [who, setWho] = React.useState<"members" | "suggested">("members")
  const tones: Tone[] = ["teal", "blue", "amber", "violet", "green", "orange", "sky", "pink"]
  const rows = opt.byPlan
    .map((p, i) => ({ label: p.name, value: who === "members" ? p.members : p.suggested, tone: tones[i % tones.length]! }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
  const total = rows.reduce((s, r) => s + r.value, 0)
  const slices = rows.map((r) => ({ key: r.label.replace(/[^A-Za-z0-9]+/g, "-"), label: r.label, value: r.value, color: HUE[r.tone] }))
  const [active, setActive] = React.useState<string | undefined>()
  return (
    <VFrame bodyClassName="gap-4 p-5">
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-semibold">By plan</h2>
        <SegmentedControl
          label="Who"
          value={who}
          onChange={setWho}
          className="ml-auto"
          items={[
            { value: "members", label: "Members" },
            { value: "suggested", label: "Suggested" },
          ]}
        />
      </div>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-muted-foreground">No plans yet</p>
      ) : (
        <div className="flex flex-wrap items-center gap-6">
          <ReDonut
            data={slices}
            centerValue={total}
            centerLabel="Plans"
            active={active}
            onSelect={(k) => setActive((a) => (a === k ? undefined : k))}
            height={180}
            thickness={22}
            className="w-[180px] shrink-0"
          />
          <ReDonutLegend
            data={slices.slice(0, 6)}
            active={active}
            onSelect={(k) => setActive((a) => (a === k ? undefined : k))}
            className="min-w-[200px] flex-1"
          />
        </div>
      )}
    </VFrame>
  )
}

const STATUS_RANK: Record<string, number> = { Slipping: 0, Watch: 1, "On track": 2 }

function MemberTable({ title, sub, rows }: { title: string; sub: string; rows: Member[] }) {
  const router = useRouter()
  const sorted = [...rows].sort(
    (a, b) => (STATUS_RANK[memberStatus(a).label] ?? 3) - (STATUS_RANK[memberStatus(b).label] ?? 3) || (a.progress ?? 0) - (b.progress ?? 0)
  )
  return (
    <VFrame title={title} sub={sub} actions={<Chip tone="violet">{rows.length} members</Chip>} bodyClassName="overflow-hidden">
      <div className="no-scrollbar overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
          <thead>
            <tr className="border-b border-border text-left text-[13px] text-muted-foreground">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Progress to goal</th>
              <th className="px-4 py-3 font-medium">Week</th>
              <th className="px-4 py-3 font-medium">Bio age</th>
              <th className="px-4 py-3 font-medium">Daily score</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No members yet
                </td>
              </tr>
            )}
            {sorted.map((o) => {
              const s = memberStatus(o)
              const active = o.stage === "Active"
              const score = o.dailyScore ?? []
              const latest = score[score.length - 1]
              return (
                <tr key={o.patient.id} onClick={() => router.push(plansHref(o.patient.id))} className="cursor-pointer transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`${BASE}/${o.patient.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={cn("flex items-center gap-3 rounded-md", FOCUS)}
                    >
                      <Avatar name={o.name} photo={o.patient.photo} size={36} />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{o.name}</span>
                        <span className="max-w-[200px] truncate text-[13px] text-muted-foreground">{o.plans.join(", ")}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="w-[30%] px-4 py-3">
                    {active ? (
                      <>
                        <div className="flex items-center justify-between gap-3 pb-1.5 text-[13px]">
                          <span className="font-semibold tabular-nums">{Math.round((o.progress ?? 0) * 100)}%</span>
                          <span className="truncate text-muted-foreground">{o.plans[0]}</span>
                        </div>
                        <Meter value={o.progress ?? 0} tone={s.tone === "red" ? "red" : s.tone === "amber" ? "amber" : "green"} />
                      </>
                    ) : (
                      <span className="text-[13px] text-muted-foreground tabular-nums">
                        {o.stage}, {o.stageDays} d
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{o.week ? `Week ${o.week}` : "Not started"}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 tabular-nums">
                      <span className="font-medium">{o.bioAge}</span>
                      <span className="text-muted-foreground">vs {o.age}</span>
                      <Chip tone={o.gap <= 0 ? "green" : "orange"}>
                        {o.gap > 0 ? "+" : ""}
                        {o.gap} y
                      </Chip>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {latest !== undefined ? (
                      <span className="flex items-center gap-2">
                        <span className="w-7 font-semibold tabular-nums">{latest}</span>
                        <Sparkline values={score} latest={latest >= 75 ? "better" : latest >= 65 ? "neutral" : "out"} width={72} label={`${o.name}, daily score for 7 days`} />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">None yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Chip tone={s.tone} dot>
                      {s.label}
                    </Chip>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {s.label === "Slipping" || s.label === "Watch" ? (
                        <QuickAction
                          label="Check in"
                          done="Sent"
                          onRun={() => toast.success(`Check in sent to ${o.name}`, { description: "In the Inlay app" })}
                        />
                      ) : null}
                      <RowMenu label={o.name}>
                        <DropdownMenuItem render={<Link href={plansHref(o.patient.id)} />}>Open care plan</DropdownMenuItem>
                        <DropdownMenuItem render={<Link href={`${BASE}/${o.patient.id}`} />}>Open chart</DropdownMenuItem>
                        <DropdownMenuItem render={<Link href={`${BASE}/communication`} />}>Message care team</DropdownMenuItem>
                      </RowMenu>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </VFrame>
  )
}

/* ------------------------------------------------------------- today -- */

function TodayView({ day }: { day: Day }) {
  const now = day.now!
  const list = day.clinic.day
  const [openId, setOpenId] = React.useState<string | null>(null)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-lg font-semibold">{day.clinic.title}</h1>
        <span className="text-[13px] text-muted-foreground tabular-nums">
          {list.filter((a) => a.status !== "Cancelled").length} visits,{" "}
          {list.filter((a) => a.status === "Scheduled" || a.status === "Checked in").length} still to see
        </span>
      </div>
      {list.length === 0 ? (
        <VFrame bodyClassName="items-center justify-center py-16 text-sm text-muted-foreground">No visits booked</VFrame>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((a) => {
            const p = day.byId.get(a.patientId)
            const name = p ? fullName(p) : a.patientId
            const open = day.open.filter((i) => i.patientId === a.patientId)
            const tone = STATUS_TONES[a.status]
            return (
              <VFrame
                key={a.id}
                title={<span className="font-medium">Visit</span>}
                actions={
                  <>
                    <Dot tone={tone}>
                      <span style={{ color: ink(tone) }}>{a.status}</span>
                    </Dot>
                    <RowMenu label={name}>
                      <DropdownMenuItem onClick={() => setOpenId(a.id)}>Visit details</DropdownMenuItem>
                      <DropdownMenuItem render={<Link href={`${BASE}/${a.patientId}`} />}>Open chart</DropdownMenuItem>
                      <DropdownMenuItem render={<Link href={`${BASE}/schedule`} />}>Open schedule</DropdownMenuItem>
                    </RowMenu>
                  </>
                }
              >
                <button
                  type="button"
                  onClick={() => setOpenId(a.id)}
                  className={cn("flex flex-col gap-3 rounded-t-[11px] p-4 text-left transition-colors hover:bg-muted/20", FOCUS)}
                >
                  <span className="flex items-start gap-3">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span
                        className={cn("truncate text-[15px] font-medium", a.status === "Cancelled" && "text-muted-foreground line-through")}
                      >
                        {name}, {a.type.toLowerCase()}
                      </span>
                      <span className="text-[13px] text-muted-foreground tabular-nums">
                        {TIME.format(new Date(a.start))}, {a.mode.toLowerCase()}
                      </span>
                    </span>
                    <Chip tone="gray">{a.minutes} min</Chip>
                  </span>
                  <span className="line-clamp-2 text-sm text-muted-foreground">{a.reason}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    {p && <Avatar name={name} photo={p.photo} size={28} />}
                    <Chip tone="gray">{p?.membership === "optimization" ? "Optimization" : "Free"}</Chip>
                    {open.length > 0 && (
                      <Chip tone={open.some((i) => i.priority === "urgent") ? "red" : "amber"}>{open.length} open items</Chip>
                    )}
                  </span>
                </button>
                <div className="mt-auto border-t border-border px-4 py-2.5">
                  {a.mode === "Virtual" ? (
                    <button
                      type="button"
                      onClick={() => setOpenId(a.id)}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-mx-2")}
                    >
                      <IconVideo className="size-4 text-muted-foreground" />
                      Join video
                    </button>
                  ) : (
                    <Link href={`${BASE}/${a.patientId}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-mx-2")}>
                      <IconLocation className="size-4 text-muted-foreground" />
                      Open chart
                    </Link>
                  )}
                </div>
              </VFrame>
            )
          })}
        </div>
      )}
      <AppointmentDialog now={now} appointment={list.find((a) => a.id === openId) ?? null} onClose={() => setOpenId(null)} />
    </div>
  )
}

const STATUS_TONES: Record<Appointment["status"], Tone> = {
  Scheduled: "blue",
  "Checked in": "orange",
  Completed: "green",
  "No show": "red",
  Cancelled: "gray",
}

/* ---------------------------------------------------------- activity -- */

type Activity = {
  id: string
  at: string
  avatar?: Patient
  icon: React.ComponentType<{ className?: string }>
  actor: string
  verb: string
  object: string
  detail?: string
  quote?: string
  chip?: { key: string; label: string; tone: Tone }
}

/** Visits, tasks, messages and care plan steps, newest first. */
function useActivity(day: Day): Activity[] {
  const now = day.now!
  const all = useAppointments(now)
  const allTasks = tasks.use().items
  const threads = chats.use().items
  const staff = providers.use().items
  const person = (id: string) => {
    if (id === ME || id === PROVIDER_ID) return "You"
    const s = staff.find((x) => x.id === id)
    return s ? `Dr. ${s.firstName} ${s.lastName}` : "The care team"
  }
  const name = (id: string) => {
    const p = day.byId.get(id)
    return p ? fullName(p) : id
  }

  return React.useMemo(() => {
    const out: Activity[] = []
    for (const a of all) {
      if (a.start > now) continue
      if (a.status === "Scheduled") continue
      const verb =
        a.status === "Completed" ? "was seen for" : a.status === "Checked in" ? "checked in for" : a.status === "No show" ? "missed" : "cancelled"
      out.push({
        id: `visit-${a.id}`,
        at: a.start,
        avatar: day.byId.get(a.patientId),
        icon: IconCalendar,
        actor: name(a.patientId),
        verb,
        object: a.type.toLowerCase(),
        detail: a.reason,
        chip: {
          key: "Visit",
          label: a.status === "Completed" ? "Seen" : a.status,
          tone: STATUS_TONES[a.status],
        },
      })
    }
    for (const t of allTasks) {
      if (t.status !== "Completed") continue
      const done = t.events[t.events.length - 1]
      out.push({
        id: `task-${t.id}`,
        at: done?.at ?? t.due,
        avatar: t.patientId ? day.byId.get(t.patientId) : undefined,
        icon: IconCheckCircle,
        actor: person(done?.by ?? t.assigneeId),
        verb: "completed",
        object: t.title,
        detail: t.patientId ? `For ${name(t.patientId)}` : undefined,
        chip: { key: "Task", label: "Cleared", tone: "green" },
      })
    }
    for (const th of threads) {
      const m = lastOf(th)
      if (!m || m.authorId === CHAT_ME) continue
      out.push({
        id: `chat-${th.id}`,
        at: m.at,
        icon: IconChat,
        actor: person(m.authorId),
        verb: "messaged",
        object: "you",
        quote: m.text,
        chip: th.unread > 0 ? { key: "Thread", label: "Review", tone: "violet" } : { key: "Thread", label: "Read", tone: "gray" },
      })
    }
    return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 24)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, allTasks, threads, staff, day.byId, now])
}

function ActivityView({ day }: { day: Day }) {
  const now = day.now!
  const feed = useActivity(day)
  const groups: { label: string; items: Activity[] }[] = []
  for (const e of feed) {
    const d = daysAgo(e.at, now)
    const label = d === 0 ? "Today" : d === 1 ? "Yesterday" : LONG_DAY.format(new Date(e.at))
    const last = groups[groups.length - 1]
    if (last?.label === label) last.items.push(e)
    else groups.push({ label, items: [e] })
  }
  return (
    <VFrame title="Recent activity" sub={`${feed.length} events across visits, tasks, messages and care plans`}>
      <div className="flex flex-col px-4 py-2">
        {groups.map((g) => (
          <div key={g.label} className="flex flex-col">
            <h3 className="sticky top-0 z-10 bg-card py-3 text-xs font-medium text-muted-foreground">{g.label}</h3>
            <ol className="flex flex-col">
              {g.items.map((e, i) => (
                <li key={e.id} className="relative flex gap-3 pb-6">
                  {i < g.items.length - 1 && <span aria-hidden className="absolute top-8 bottom-1 left-[13px] w-px bg-border" />}
                  {e.avatar ? (
                    <Avatar name={fullName(e.avatar)} photo={e.avatar.photo} size={28} />
                  ) : (
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                      <e.icon className="size-3.5" />
                    </span>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <p className="text-sm">
                      <span className="font-medium">{e.actor}</span> <span className="text-muted-foreground">{e.verb}</span>{" "}
                      <span className="font-medium">{e.object}</span>
                    </p>
                    {e.detail && <p className="max-w-[560px] text-[13px] text-muted-foreground">{e.detail}</p>}
                    {e.quote && (
                      <Item variant="muted" size="xs" render={<p />} className="max-w-[560px] flex-nowrap text-[13px]">
                        <IconChat className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{e.quote}</span>
                      </Item>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground tabular-nums">
                      <span>{ago(e.at, now)}</span>
                      {e.chip && (
                        <Chip tone={e.chip.tone}>
                          {e.chip.key}: {e.chip.label}
                        </Chip>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </VFrame>
  )
}

/* ------------------------------------------------------- quick stats -- */

const SOURCE_TONES: Tone[] = ["amber", "teal", "orange", "violet", "blue"]
const TYPE_TONE: Record<ItemType, Tone> = {
  abnormal_result: "blue",
  medication_change: "violet",
  overdue_order: "amber",
  outside_care: "red",
  care_gap: "green",
  review_due: "sky",
}
const PRIORITY_TONE: Record<Priority, Tone> = { urgent: "red", moderate: "orange", routine: "gray" }

function QuickStatsView({ day }: { day: Day }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <BySource day={day} />
        <ByStage day={day} />
      </div>
      <VisitsByDay day={day} />
    </div>
  )
}

function BySource({ day }: { day: Day }) {
  const [only, setOnly] = React.useState<"all" | "urgent">("all")
  const list = only === "urgent" ? day.urgent : day.open
  const sources = React.useMemo(() => {
    const m = new Map<string, WorkItem[]>()
    for (const i of list) m.set(i.source, [...(m.get(i.source) ?? []), i])
    return [...m.entries()].map(([source, items]) => ({ source, items })).sort((a, b) => b.items.length - a.items.length)
  }, [list])
  const top = sources.slice(0, 3)
  const rest = list.length - top.reduce((s, x) => s + x.items.length, 0)
  return (
    <VFrame bodyClassName="gap-5 p-5">
      <div className="flex items-center gap-3">
        <h2 className="text-[15px] font-semibold">Open items by source</h2>
        <SegmentedControl
          label="Items"
          value={only}
          onChange={setOnly}
          className="ml-auto"
          items={[
            { value: "all", label: "All" },
            { value: "urgent", label: "Urgent" },
          ]}
        />
      </div>
      <dl className="flex gap-10">
        <div className="flex flex-col">
          <dt className="text-xs text-muted-foreground">Open items</dt>
          <dd className="text-[26px] leading-8 font-semibold tracking-tight tabular-nums">{list.length}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs text-muted-foreground">Sources</dt>
          <dd className="text-[26px] leading-8 font-semibold tracking-tight tabular-nums">{sources.length}</dd>
        </div>
      </dl>
      <SegmentBar
        label="Open items by source"
        segments={segs([
          ...top.map((s, i) => ({ label: s.source, value: s.items.length, tone: SOURCE_TONES[i]! })),
          { label: "Other sources", value: rest, tone: "gray" as Tone },
        ])}
      />
      <ul className="flex flex-col gap-2">
        {top.map((s, i) => {
          const patients = new Set(s.items.map((x) => x.patientId)).size
          return (
            <Item key={s.source} variant="muted" size="xs" render={<li />} className="flex-nowrap gap-3 px-3.5 py-2.5">
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: HUE[SOURCE_TONES[i]!] }} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{s.source}</span>
                <span className="truncate text-xs text-muted-foreground tabular-nums">
                  {patients} {patients === 1 ? "patient" : "patients"}
                </span>
              </span>
              <span className="flex flex-col items-end tabular-nums">
                <span className="text-sm font-semibold">{s.items.length}</span>
                <span className="text-xs text-muted-foreground">{pct(s.items.length, list.length)}%</span>
              </span>
            </Item>
          )
        })}
      </ul>
      {rest > 0 && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {rest} more from {sources.length - top.length} other sources
        </p>
      )}
    </VFrame>
  )
}

function ByStage({ day }: { day: Day }) {
  const [by, setBy] = React.useState<"type" | "priority">("type")
  const panel = useItemPanel(day)
  const openGroup = (label: string, from: HTMLElement) => {
    const ids = day.open
      .filter((i) => (by === "type" ? TYPE_META[i.type].metric === label : i.priority === label.toLowerCase()))
      .sort(byPriority)
      .map((i) => i.id)
    if (ids.length) panel.open(ids[0]!, ids, from)
  }
  const rows: { label: string; value: number; tone: Tone }[] =
    by === "type"
      ? ITEM_TYPES.map((t) => ({ label: TYPE_META[t].metric, value: day.open.filter((i) => i.type === t).length, tone: TYPE_TONE[t] })).filter(
          (r, i) => r.value > 0 || ITEM_TYPES[i] !== "outside_care"
        )
      : (["urgent", "moderate", "routine"] as Priority[]).map((p) => ({
          label: p.charAt(0).toUpperCase() + p.slice(1),
          value: day.open.filter((i) => i.priority === p).length,
          tone: PRIORITY_TONE[p],
        }))
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <VFrame
      title="Open items by stage"
      sub={`${day.open.length} open across ${new Set(day.open.map((i) => i.patientId)).size} patients`}
      actions={
        <SegmentedControl
          label="Group"
          value={by}
          onChange={setBy}
          items={[
            { value: "type", label: "Type" },
            { value: "priority", label: "Priority" },
          ]}
        />
      }
      bodyClassName="gap-2.5 p-4"
    >
      {rows.map((r) => (
        <button
          key={r.label}
          type="button"
          onClick={(e) => openGroup(r.label, e.currentTarget)}
          className={cn("group flex flex-col gap-1.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-surface-row-hover", FOCUS)}
        >
          <span className="flex items-center gap-2 text-[13px]">
            <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: HUE[r.tone] }} />
            <span className="truncate font-medium">{r.label}</span>
            <span className="ml-auto font-semibold tabular-nums" style={{ color: ink(r.tone) }}>
              {r.value}
            </span>
          </span>
          <Meter value={r.value / max} tone={r.tone} label={r.label} />
        </button>
      ))}
      {panel.node}
      <dl className="mt-auto grid grid-cols-3 gap-3 border-t border-border pt-4">
        {[
          { label: "Urgent", value: day.urgent.length, tone: "red" as Tone },
          { label: "New since last visit", value: day.open.filter((i) => i.isNew).length, tone: "blue" as Tone },
          { label: "Older than 30 days", value: day.open.filter((i) => daysSince(i.createdAt) > 30).length, tone: "amber" as Tone },
        ].map((x) => (
          <Item key={x.label} variant="muted" size="xs" className="flex-col items-start gap-0.5">
            <dt className="truncate text-xs text-muted-foreground">
              <Dot tone={x.tone}>{x.label}</Dot>
            </dt>
            <dd className="text-lg font-semibold tabular-nums">{x.value}</dd>
          </Item>
        ))}
      </dl>
    </VFrame>
  )
}

function VisitsByDay({ day }: { day: Day }) {
  const now = day.now!
  const all = useAppointments(now)
  const [offset, setOffset] = React.useState(0)
  const days = weekDays(now, offset, 7)
  const prev = weekDays(now, offset - 1, 7)
  const types = [...new Set(all.filter((a) => inDays(a, days) || inDays(a, prev)).map((a) => a.type))]
  const cell = (type: string, d: Date) => all.filter((a) => a.type === type && a.status !== "Cancelled" && a.start.startsWith(isoDay(d)))

  return (
    <VFrame
      title="Visits by day"
      sub="Booked visits by type"
      actions={
        <div className="flex items-center rounded-md border border-border bg-card">
          <Button variant="ghost" size="icon-sm" aria-label="Previous week" onClick={() => setOffset((o) => o - 1)}>
            <IconChevronLeft />
          </Button>
          <span className="px-2 text-[13px] whitespace-nowrap tabular-nums">
            {SHORT.format(days[0]!)} to {SHORT.format(days[6]!)}
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Next week" onClick={() => setOffset((o) => o + 1)}>
            <IconChevronRight />
          </Button>
        </div>
      }
      bodyClassName="overflow-hidden"
    >
      <div className="flex flex-col gap-1 border-b border-border px-4 pt-3 pb-2">
        <ReLegend
          className="justify-end"
          series={[
            { key: "booked", label: "Booked", color: HUE.blue },
            { key: "seen", label: "Seen", color: HUE.green },
          ]}
        />
        <ReBarChart
          height={200}
          xKey="day"
          data={days.map((d) => {
            const list = all.filter((a) => a.status !== "Cancelled" && a.start.startsWith(isoDay(d)))
            return {
              day: `${WEEKDAY.format(d)}, ${SHORT.format(d)}`,
              booked: list.length,
              seen: list.filter((a) => a.status === "Completed").length,
            }
          })}
          xTickFormat={(v) => v.split(",")[0]!}
          series={[
            { key: "booked", label: "Booked", color: HUE.blue, fill: "stripe" },
            { key: "seen", label: "Seen", color: HUE.green },
          ]}
        />
      </div>
      <div className="no-scrollbar overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className="text-[13px] text-muted-foreground">
              <th className="border-b border-border px-4 py-2.5 text-left font-medium">Visit type</th>
              {days.map((d) => (
                <th key={isoDay(d)} className="border-b border-l border-border px-3 py-2.5 text-center font-medium whitespace-nowrap">
                  {WEEKDAY.format(d)}, {SHORT.format(d)}
                </th>
              ))}
              <th className="border-b border-l border-border px-4 py-2.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {types.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                  No visits this week
                </td>
              </tr>
            )}
            {types.map((type) => {
              const total = days.reduce((s, d) => s + cell(type, d).length, 0)
              const before = prev.reduce((s, d) => s + cell(type, d).length, 0)
              const mins = all.filter((a) => a.type === type)
              const avg = mins.length ? Math.round(mins.reduce((s, a) => s + a.minutes, 0) / mins.length) : 0
              return (
                <tr key={type} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">
                    <span className="flex flex-col">
                      <span className="font-medium whitespace-nowrap">{type}</span>
                      <span className="text-[13px] text-muted-foreground tabular-nums">{avg} min average</span>
                    </span>
                  </td>
                  {days.map((d) => {
                    const list = cell(type, d)
                    const weekend = d.getDay() === 0 || d.getDay() === 6
                    const seen = list.filter((a) => a.status === "Completed").length
                    return (
                      <td key={isoDay(d)} className="border-l border-border px-3 py-2.5">
                        <span className="flex flex-col items-center gap-1 tabular-nums">
                          <span className={cn("text-sm font-semibold", list.length === 0 && "font-normal text-muted-foreground")}>
                            {list.length || "0"}
                          </span>
                          <Meter
                            value={list.length ? (seen || list.length) / list.length : 0}
                            tone={seen ? "green" : "blue"}
                            className="h-1 w-12"
                          />
                          <span className="text-[11px] text-muted-foreground">
                            {weekend ? "Off" : list.length === 0 ? "Open" : seen === list.length ? "Seen" : "Booked"}
                          </span>
                        </span>
                      </td>
                    )
                  })}
                  <td className="border-l border-border px-4 py-2.5 text-right">
                    <span className="flex flex-col items-end tabular-nums">
                      <span className="font-semibold">{total}</span>
                      <TrendText value={total - before} />
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </VFrame>
  )
}

/* ------------------------------------------------------ optimization -- */

function MiniStat({ label, value, tone, icon }: { label: string; value: React.ReactNode; tone?: Tone; icon: typeof IconCalendar }) {
  return (
    <VFrame bodyClassName="flex-row items-center gap-3 p-4">
      <IconTile icon={icon} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] text-muted-foreground">{label}</span>
        <span className="text-xl font-semibold tabular-nums" style={tone ? { color: ink(tone) } : undefined}>
          {value}
        </span>
      </span>
    </VFrame>
  )
}

/** Verve's Today cards, one per plan waiting on the physician: plans, why, baseline tests. */
function PlansReviewView() {
  const opt = useOptimization()
  const changes = opt.reviewing.filter((o) => o.stage === "Changes requested").length
  const decide = opt.tests.filter((x) => x.t.route === "Physician to decide").length
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat icon={IconFileCheck} label="Plans to review" value={opt.reviewing.length} />
        <MiniStat icon={IconWarning} label="Changes asked" value={changes} tone={changes ? "orange" : undefined} />
        <MiniStat icon={IconHistory} label="Tests for you to route" value={decide} tone={decide ? "amber" : undefined} />
      </div>
      {opt.reviewing.length === 0 ? (
        <VFrame bodyClassName="items-center justify-center py-16 text-sm text-muted-foreground">No plans waiting on you</VFrame>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {opt.reviewing.map((o) => {
            const why = o.markers.filter((m) => !m.inRange || m.watchful)
            const shown = why.length ? why : o.markers
            const tone: Tone = o.stage === "Changes requested" ? "orange" : "violet"
            return (
              <VFrame
                key={o.patient.id}
                title={<span className="font-medium">Plan review</span>}
                actions={
                  <>
                    <Dot tone={tone}>
                      <span style={{ color: ink(tone) }}>{o.stage}</span>
                    </Dot>
                    <RowMenu label={o.name}>
                      <DropdownMenuItem render={<Link href={plansHref(o.patient.id)} />}>Review plan</DropdownMenuItem>
                      <DropdownMenuItem render={<Link href={`${BASE}/${o.patient.id}`} />}>Open chart</DropdownMenuItem>
                    </RowMenu>
                  </>
                }
              >
                <div className="flex flex-col gap-4 p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={o.name} photo={o.patient.photo} size={36} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-medium">{o.name}</span>
                      <span className="text-[13px] text-muted-foreground tabular-nums">
                        {o.age} y, bio age {o.bioAge}
                      </span>
                    </span>
                    <Chip tone="gray">{o.stageDays} d waiting</Chip>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {o.plans.map((p) => (
                      <Chip key={p} tone="teal">
                        {p}
                      </Chip>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-medium text-muted-foreground">Why</h3>
                    <ul className="flex flex-col gap-1.5">
                      {shown.map((m) => {
                        const mt: Tone = !m.inRange ? "red" : m.watchful ? "amber" : "green"
                        return (
                          <Item key={m.name} variant="muted" size="xs" render={<li />} className="flex-nowrap gap-3 px-3 py-2">
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{m.name}</span>
                            <Sparkline values={m.values} latest={mt === "red" ? "out" : mt === "green" ? "better" : "neutral"} label={`${m.name}, last ${m.values.length} readings`} />
                            <span className="w-24 text-right text-[13px] tabular-nums">
                              {m.values[m.values.length - 1]} <span className="text-muted-foreground">{m.unit}</span>
                            </span>
                            <Chip tone={mt}>{!m.inRange ? "Off track" : m.watchful ? "Watch" : "In range"}</Chip>
                          </Item>
                        )
                      })}
                    </ul>
                  </div>
                  {o.tests.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h3 className="text-xs font-medium text-muted-foreground">Baseline tests</h3>
                      <ul className="flex flex-col divide-y divide-border">
                        {o.tests.map((t) => (
                          <li key={t.name} className="flex items-center gap-3 py-1.5 text-[13px]">
                            <span className="font-medium">{t.name}</span>
                            <span className="truncate text-muted-foreground">{t.plan}</span>
                            <Chip tone={ROUTE_TONE[t.route]} className="ml-auto">
                              {t.route}
                            </Chip>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="mt-auto border-t border-border px-4 py-2.5">
                  <Link href={plansHref(o.patient.id)} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-mx-2")}>
                    <IconFileCheck className="size-4 text-muted-foreground" />
                    Review plan
                  </Link>
                </div>
              </VFrame>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MembersView() {
  const opt = useOptimization()
  const [stage, setStage] = React.useState<"all" | "active" | "review">("all")
  const rows = stage === "active" ? opt.active : stage === "review" ? opt.reviewing : opt.members
  const status = opt.active.map(memberStatus)
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat icon={IconUsersGroup} label="Members" value={opt.members.length} />
        <MiniStat icon={IconTarget} label="On track" value={status.filter((s) => s.label === "On track").length} tone="green" />
        <MiniStat icon={IconWarning} label="Slipping" value={status.filter((s) => s.label === "Slipping").length} tone="red" />
        <MiniStat icon={IconHistory} label="Symptom relief" value={`${opt.symptomRelief} pts`} />
      </div>
      <div className="flex justify-end">
        <SegmentedControl
          label="Stage"
          value={stage}
          onChange={setStage}
          items={[
            { value: "all", label: "All members", count: opt.members.length },
            { value: "active", label: "Active plans", count: opt.active.length },
            { value: "review", label: "In review", count: opt.reviewing.length },
          ]}
        />
      </div>
      <MemberTable title="Members" sub="Progress, bio age and daily score" rows={rows} />
    </div>
  )
}

function UpgradeView() {
  const opt = useOptimization()
  const free = opt.all.filter((o) => !o.member && o.patient.status === "Active")
  const funnel: { label: string; value: number; tone: Tone }[] = [
    { label: "Free active", value: free.length, tone: "blue" },
    { label: "Records ready", value: free.filter((o) => o.patient.recordState === "active").length, tone: "sky" },
    { label: "Upgrade fit", value: opt.upgrade.length, tone: "amber" },
    { label: "Started plan", value: opt.active.length, tone: "green" },
  ]
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <VFrame title="Upgrade pipeline" sub={`${opt.upgrade.length} free patients fit the $149 a month plan`} bodyClassName="gap-2.5 p-4">
          <ReBarChart
            layout="vertical"
            height={200}
            xKey="stage"
            data={funnel.map((r) => ({ stage: r.label, patients: r.value }))}
            series={[{ key: "patients", label: "Patients", color: HUE.amber, fill: "stripe" }]}
            highlight={2}
          />
          <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-border pt-4">
            <Item variant="muted" size="xs" className="flex-col items-start gap-0.5">
              <dt className="text-xs text-muted-foreground">Monthly value</dt>
              <dd className="text-lg font-semibold tabular-nums">${(opt.upgrade.length * 149).toLocaleString("en-US")}</dd>
            </Item>
            <Item variant="muted" size="xs" className="flex-col items-start gap-0.5">
              <dt className="text-xs text-muted-foreground">Fit of free active</dt>
              <dd className="text-lg font-semibold tabular-nums">{pct(opt.upgrade.length, free.length)}%</dd>
            </Item>
          </dl>
        </VFrame>
        <BioAgeFrame opt={opt} />
      </div>

      <VFrame title="Upgrade candidates" sub="Areas worth working on, from the record" actions={<Chip tone="amber">{opt.upgrade.length} patients</Chip>}>
        {opt.upgrade.length === 0 ? (
          <p className="py-14 text-center text-sm text-muted-foreground">No free patients fit right now</p>
        ) : (
          <ul className="divide-y divide-border">
            {opt.upgrade.map((o) => {
              const areas = o.markers.filter((m) => !m.inRange || m.watchful)
              return (
                <li key={o.patient.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
                  <Avatar name={o.name} photo={o.patient.photo} size={36} />
                  <span className="flex min-w-[160px] flex-col">
                    <Link href={`${BASE}/${o.patient.id}`} className={cn("truncate text-sm font-medium hover:underline", FOCUS)}>
                      {o.name}
                    </Link>
                    <span className="text-[13px] text-muted-foreground tabular-nums">
                      {o.age} y, bio age {o.bioAge}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                    {o.gap > 0 && <Chip tone="orange">Bio age +{o.gap} y</Chip>}
                    {areas.map((m) => (
                      <Chip key={m.name} tone={!m.inRange ? "red" : "amber"}>
                        {m.name}
                      </Chip>
                    ))}
                    {o.plans.map((p) => (
                      <Chip key={p} tone="teal">
                        {p}
                      </Chip>
                    ))}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <QuickAction
                      label="Suggest plan"
                      done="Suggested"
                      onRun={() => toast.success(`Plan suggestion sent to ${o.name}`, { description: o.plans.join(", ") })}
                    />
                    <RowMenu label={o.name}>
                      <DropdownMenuItem render={<Link href={`${BASE}/${o.patient.id}`} />}>Open chart</DropdownMenuItem>
                      <DropdownMenuItem render={<Link href={`${BASE}/communication`} />}>Message care team</DropdownMenuItem>
                    </RowMenu>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </VFrame>
    </div>
  )
}

function BioAgeFrame({ opt }: { opt: Opt }) {
  const engaged = opt.bio.younger + opt.bio.near + opt.bio.older
  const rows: { label: string; value: number; tone: Tone }[] = [
    { label: "Younger by 3+ years", value: opt.bio.younger, tone: "green" },
    { label: "Near real age", value: opt.bio.near, tone: "blue" },
    { label: "Older than real age", value: opt.bio.older, tone: "orange" },
  ]
  return (
    <VFrame bodyClassName="gap-5 p-5">
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-semibold">Biological age</h2>
        <span className="ml-auto text-[13px] text-muted-foreground tabular-nums">{engaged} active patients</span>
      </div>
      <dl className="flex gap-10">
        <div className="flex flex-col">
          <dt className="text-xs text-muted-foreground">Average gap</dt>
          <dd className="text-[26px] leading-8 font-semibold tracking-tight tabular-nums">
            {opt.bio.avgGap > 0 ? "+" : ""}
            {opt.bio.avgGap} y
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs text-muted-foreground">Members on a plan</dt>
          <dd className="text-[26px] leading-8 font-semibold tracking-tight tabular-nums">
            {opt.active.length ? `${opt.bio.avgGapMembers > 0 ? "+" : ""}${opt.bio.avgGapMembers} y` : "None yet"}
          </dd>
        </div>
      </dl>
      <SegmentBar label="Patients by biological age" segments={segs(rows)} />
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <Item key={r.label} variant="muted" size="xs" render={<li />} className="flex-nowrap gap-3 px-3.5 py-2.5">
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: HUE[r.tone] }} />
            <span className="flex-1 truncate text-sm font-medium">{r.label}</span>
            <span className="flex flex-col items-end tabular-nums">
              <span className="text-sm font-semibold">{r.value}</span>
              <span className="text-xs text-muted-foreground">{pct(r.value, engaged)}%</span>
            </span>
          </Item>
        ))}
      </ul>
    </VFrame>
  )
}
