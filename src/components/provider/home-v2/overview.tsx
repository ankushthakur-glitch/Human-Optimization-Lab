"use client"

import * as React from "react"
import Link from "next/link"
import { Bar, BarChart, Rectangle, XAxis, YAxis } from "recharts"
import {
  IconArrowDownDouble,
  IconArrowRight,
  IconArrowUpDouble,
  IconCalendar,
  IconChat,
  IconEqual,
  IconFileList,
  IconLocation,
  IconVideo,
  IconWarning,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/design-system/ui/button"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/design-system/ui/chart"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/design-system/ui/empty"
import { Skeleton } from "@/design-system/ui/skeleton"
import { Illustration } from "@/components/illustrations/illustration"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import {
  type Patient,
  fullName,
  patients,
  providers,
} from "@/components/practice/practice-data"
import {
  AXIS_PROPS,
  Avatar,
  Badge,
  Card,
  CardHeader,
  FOCUS,
  Grid,
  type IconDef,
  KitIcon,
  ReDonut,
  type ReSlice,
  SegmentedControl,
  useReducedMotion,
} from "@/components/dashboard-kit-v2"
import {
} from "@/components/provider/chart-care-plan"
import { CHAT_ME, chats, lastOf } from "@/components/provider/communication/chat-data"
import { clockTime, ms } from "@/components/provider/mock-clock"
import { PROVIDER_ID } from "@/components/provider/provider-shell"
import {
  type Appointment,
  isWorkingDay,
  isoDay,
  useAppointments,
} from "@/components/provider/schedule/schedule-data"
import { AppointmentDialog, STATUS_TONE } from "@/components/provider/schedule/schedule"
import { type Task, type TaskPriority, ME, isOverdue, tasks } from "@/components/provider/tasks/tasks-data"
import { TYPE_META, itemName } from "@/components/provider/home-v2/labels"
import type { QueueItem } from "@/components/provider/home-v2/types"

/* The provider's overall dashboard, above the Worklist: the day at a glance
   (five stat cards), today's schedule beside what needs the physician, then
   the week, the task list and the panel. Each block reads the store its own
   module reads (schedule on the real clock, tasks, chats and care plans on
   the mock clock), so a number here always matches the page it links to. */

const BASE = "/screens/patients"

/* Words take the soft hue mixed toward the ink so they read. */
const word = (hex: string) => `color-mix(in oklab, ${hex} 70%, var(--foreground))`

export type Segment = { label: string; value: number; color: string }

/* ------------------------------------------------------------- bits -- */

/** A thin bar split by segment, 2px gaps between fills. */
export function SegmentBar({ segments, label }: { segments: Segment[]; label: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  return (
    <div role="img" aria-label={label} className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-secondary">
      {total > 0 &&
        segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span
              key={s.label}
              title={`${s.label}: ${s.value}`}
              className="h-full rounded-full"
              style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
            />
          ))}
    </div>
  )
}

export function LegendGrid({ segments }: { segments: Segment[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
      {segments.map((s) => (
        <li key={s.label} className="flex min-w-0 items-center gap-1.5 text-xs">
          <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
          <span className="truncate text-muted-foreground">{s.label}</span>
          <span className="ml-auto font-medium text-foreground tabular-nums">{s.value}</span>
        </li>
      ))}
    </ul>
  )
}

export function IconTile({ icon: Icon, glyph, color }: { icon?: typeof IconCalendar; glyph?: IconDef; color?: string }) {
  return (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card"
      style={color ? { color } : undefined}
    >
      {Icon ? <Icon className="size-4" /> : glyph ? <KitIcon icon={glyph} size={16} /> : null}
    </span>
  )
}

/** The card's last row: where the number goes next. */
export function FooterLink({ href, onClick, children }: { href?: string; onClick?: () => void; children: React.ReactNode }) {
  const cls = cn(
    "group flex items-center justify-between border-t border-border px-4 py-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground",
    FOCUS
  )
  const body = (
    <>
      {children}
      <IconArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
    </>
  )
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cn(cls, "w-full text-left")}>
      {body}
    </button>
  )
}

export function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}>
      {children}
      <IconArrowRight className="size-3.5" />
    </Link>
  )
}

const people = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/* ------------------------------------------------------- stat cards -- */

export function StatCard({
  icon,
  label,
  when,
  value,
  of,
  meta,
  segments,
  footer,
}: {
  icon: typeof IconCalendar
  label: string
  when: string
  value: number
  of?: number
  meta: React.ReactNode
  segments?: Segment[]
  footer: React.ReactNode
}) {
  return (
    <Card>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <IconTile icon={icon} />
          <span className="truncate text-sm font-medium">{label}</span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">{when}</span>
        </div>
        <div className="flex flex-col">
          <span className="flex items-baseline gap-0.5 tabular-nums">
            <span className="text-[28px] leading-9 font-semibold">{value}</span>
            {of !== undefined && <span className="text-base text-muted-foreground">/{of}</span>}
          </span>
          <span className="truncate text-xs text-muted-foreground tabular-nums">{meta}</span>
        </div>
        {segments && (
          <>
            <SegmentBar segments={segments} label={`${label}: ${segments.map((s) => `${s.label} ${s.value}`).join(", ")}`} />
            <LegendGrid segments={segments} />
          </>
        )}
      </div>
      {footer}
    </Card>
  )
}

export function StatCardSkeleton() {
  return (
    <Card className="gap-3 p-4">
      <Skeleton className="h-8 w-40 rounded-md" />
      <Skeleton className="h-9 w-16 rounded-sm" />
      <Skeleton className="h-1.5 w-full rounded-full" />
      <Skeleton className="h-8 w-full rounded-sm" />
    </Card>
  )
}

/** Today's visits by how they stand. */
function appointmentSegments(day: Appointment[]): Segment[] {
  const n = (s: Appointment["status"][]) => day.filter((a) => s.includes(a.status)).length
  return [
    { label: "Completed", value: n(["Completed"]), color: SUBTLE.green },
    { label: "Checked in", value: n(["Checked in"]), color: SUBTLE.orange },
    { label: "Scheduled", value: n(["Scheduled"]), color: SUBTLE.blue },
    { label: "Missed", value: n(["No show", "Cancelled"]), color: SUBTLE.red },
  ]
}

const TASK_COLOR: Record<TaskPriority, string> = { High: SUBTLE.red, Medium: SUBTLE.orange, Low: SUBTLE.green }

export function OverviewStats({
  day,
  dayLabel,
  open,
  urgent,
  onUrgent,
}: {
  day: Appointment[]
  dayLabel: string
  open: QueueItem[]
  urgent: QueueItem[]
  onUrgent: () => void
}) {
  const allTasks = tasks.use().items
  const threads = chats.use().items

  const mine = allTasks.filter((t) => t.assigneeId === ME && t.status !== "Completed")
  const overdue = mine.filter(isOverdue).length
  const booked = day.filter((a) => a.status !== "Cancelled")
  const left = day.filter((a) => a.status === "Scheduled" || a.status === "Checked in").length
  const unread = threads.filter((t) => t.unread > 0)
  const unreadCount = unread.reduce((s, t) => s + t.unread, 0)
  const fresh = urgent.filter((i) => i.isNew).length

  return (
    <section aria-label="Today at a glance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={IconCalendar}
        label="Appointments"
        when={dayLabel}
        value={booked.length}
        meta={`${left} still to see`}
        segments={appointmentSegments(day)}
        footer={<FooterLink href={`${BASE}/schedule`}>Open schedule</FooterLink>}
      />
      <StatCard
        icon={IconWarning}
        label="Urgent items"
        when="Now"
        value={urgent.length}
        of={open.length}
        meta={fresh > 0 ? `${fresh} new since your last visit` : "Nothing new since your last visit"}
        segments={[
          { label: "Urgent", value: urgent.length, color: SUBTLE.red },
          { label: "Moderate", value: open.filter((i) => i.priority === "moderate").length, color: SUBTLE.orange },
          { label: "Routine", value: open.filter((i) => i.priority === "routine").length, color: "#B5B5B5" },
        ]}
        footer={<FooterLink onClick={onUrgent}>Show urgent items</FooterLink>}
      />
      <StatCard
        icon={IconFileList}
        label="My tasks"
        when="Open"
        value={mine.length}
        meta={overdue > 0 ? <span style={{ color: word(SUBTLE.red) }}>{overdue} overdue</span> : "None overdue"}
        segments={(["High", "Medium", "Low"] as TaskPriority[]).map((p) => ({
          label: p,
          value: mine.filter((t) => t.priority === p).length,
          color: TASK_COLOR[p],
        }))}
        footer={<FooterLink href={`${BASE}/tasks`}>Open tasks</FooterLink>}
      />
      <StatCard
        icon={IconChat}
        label="Messages"
        when="Unread"
        value={unreadCount}
        meta={unread.length > 0 ? `From ${people(unread.length, "colleague")}` : "All caught up"}
        segments={[
          { label: "Unread", value: unread.length, color: SUBTLE.blue },
          { label: "Read", value: threads.length - unread.length, color: "#B5B5B5" },
        ]}
        footer={<FooterLink href={`${BASE}/communication`}>Open messages</FooterLink>}
      />
    </section>
  )
}

/* -------------------------------------------------- today's schedule -- */

function ModeIcon({ a, className }: { a: Appointment; className?: string }) {
  const Icon = a.mode === "Virtual" ? IconVideo : IconLocation
  return <Icon aria-label={a.mode} className={cn("size-3.5 shrink-0", className)} />
}

const isPast = (a: Appointment) => a.status === "Completed" || a.status === "No show" || a.status === "Cancelled"

export function TodaySchedule({
  now,
  day,
  title,
  className,
}: {
  now: string
  day: Appointment[]
  title: string
  className?: string
}) {
  const { items: roster } = patients.use()
  const byId = React.useMemo(() => new Map(roster.map((p) => [p.id, p])), [roster])
  const [openId, setOpenId] = React.useState<string | null>(null)
  const listRef = React.useRef<HTMLOListElement>(null)
  const nowRef = React.useRef<HTMLLIElement>(null)

  const next = day.find((a) => a.status === "Scheduled" || a.status === "Checked in")
  const nextPatient = next ? byId.get(next.patientId) : undefined
  const nameOf = (a: Appointment) => {
    const p = byId.get(a.patientId)
    return p ? fullName(p) : a.patientId
  }
  /* The Now rule sits before the first visit still to come. */
  const nowAt = day.findIndex((a) => !isPast(a))

  /* Open on the present: the list scrolls the Now rule to its top. */
  React.useEffect(() => {
    const list = listRef.current
    const rule = nowRef.current
    if (list && rule) list.scrollTop = rule.offsetTop - list.offsetTop - 8
  }, [day.length])

  return (
    <Card className={className}>
      <CardHeader
        title={title}
        count={<Badge tone="light">{day.length}</Badge>}
      />
      {day.length === 0 ? (
        <Empty className="flex-1 py-10">
          <EmptyHeader>
            <EmptyMedia>
              <Illustration name="no-results" />
            </EmptyMedia>
            <EmptyTitle>No appointments</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Next up: the one visit worth reading in full. */}
          {next && (
            <div className="flex flex-wrap items-center gap-3 border-b border-border bg-primary-surface/40 px-4 py-3.5">
              <Avatar name={nameOf(next)} photo={nextPatient?.photo} size={48} />
              <div className="flex min-w-0 flex-1 basis-[calc(100%-60px)] flex-col gap-0.5 sm:basis-0">
                <span className="text-xs font-medium text-primary-tint">
                  {next.status === "Checked in"
                    ? "In the room now"
                    : `${next.start.startsWith(now.slice(0, 10)) ? "Next up" : "First visit"} at ${clockTime(next.start)}`}
                </span>
                <span className="truncate text-base font-semibold">{nameOf(next)}</span>
                <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
                  <ModeIcon a={next} />
                  <span className="truncate">
                    {next.type}, {next.minutes} min · {next.reason}
                  </span>
                </span>
              </div>
              <div className="flex shrink-0 gap-2 max-sm:w-full max-sm:pl-[60px]">
                <Button variant="outline" size="sm" className="bg-card" onClick={() => setOpenId(next.id)}>
                  Details
                </Button>
                <Link href={`${BASE}/${next.patientId}`} className={buttonVariants({ size: "sm" })}>
                  Open chart
                </Link>
              </div>
            </div>
          )}

          <ol ref={listRef} className="no-scrollbar relative max-h-[372px] min-h-0 flex-1 overflow-y-auto py-1.5">
            {day.map((a, i) => {
              const tone = STATUS_TONE[a.status]
              const past = isPast(a)
              return (
                <React.Fragment key={a.id}>
                  {i === nowAt && i > 0 && (
                    <li ref={nowRef} aria-label={`Now, ${clockTime(now)}`} className="flex items-center gap-2 px-4 py-1">
                      <span className="w-[68px] text-right text-[11px] font-medium" style={{ color: word(SUBTLE.red) }}>
                        {clockTime(now)}
                      </span>
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: SUBTLE.red }} />
                      <span className="h-px flex-1" style={{ backgroundColor: SUBTLE.red }} />
                    </li>
                  )}
                  <li>
                    <button
                      type="button"
                      onClick={() => setOpenId(a.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-soft",
                        a.id === next?.id && "bg-surface-soft",
                        FOCUS
                      )}
                    >
                      <span className="flex w-[68px] shrink-0 flex-col items-end tabular-nums">
                        <span className={cn("text-[13px] font-medium", past && "text-muted-foreground")}>
                          {clockTime(a.start)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{a.minutes} min</span>
                      </span>
                      <span aria-hidden className="h-8 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: tone.bar }} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span
                          className={cn(
                            "truncate text-sm font-medium",
                            past && "text-foreground/70",
                            a.status === "Cancelled" && "text-muted-foreground line-through"
                          )}
                        >
                          {nameOf(a)}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">{a.type}</span>
                      </span>
                      <ModeIcon a={a} className="text-muted-foreground max-sm:hidden" />
                      <span
                        className="flex shrink-0 items-center gap-1.5 text-xs font-medium sm:w-[84px]"
                        style={{ color: tone.word }}
                      >
                        <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: tone.bar }} />
                        <span className="max-sm:sr-only">{a.status}</span>
                      </span>
                    </button>
                  </li>
                </React.Fragment>
              )
            })}
          </ol>
        </div>
      )}
      <AppointmentDialog
        now={now}
        appointment={day.find((a) => a.id === openId) ?? null}
        onClose={() => setOpenId(null)}
      />
    </Card>
  )
}

/* ---------------------------------------------------------- needs you -- */

type Action = {
  id: string
  icon?: typeof IconCalendar
  glyph?: IconDef
  color: string
  title: string
  meta: string
  verb: string
  href?: string
  onPress?: (from: HTMLElement) => void
}

export function NeedsYou({
  urgent,
  byId,
  onOpen,
  className,
}: {
  urgent: QueueItem[]
  byId: Map<string, Patient>
  onOpen: (item: QueueItem, from: HTMLElement) => void
  className?: string
}) {
  const allTasks = tasks.use().items
  const threads = chats.use().items
  const staff = providers.use().items
  const name = (id: string) => {
    const p = byId.get(id)
    return p ? fullName(p) : id
  }
  const doctor = (id: string) => {
    const s = staff.find((x) => x.id === id)
    return s ? `Dr. ${s.lastName}` : "a colleague"
  }

  const actions: Action[] = [
    ...urgent.map<Action>((i) => ({
      id: i.id,
      glyph: TYPE_META[i.type].icon,
      color: SUBTLE.red,
      title: itemName(i),
      meta: `${TYPE_META[i.type].word} · ${name(i.patientId)}`,
      verb: "Review",
      onPress: (from) => onOpen(i, from),
    })),
    ...allTasks
      .filter((t) => t.assigneeId === ME && isOverdue(t))
      .map<Action>((t) => ({
        id: t.id,
        icon: IconFileList,
        color: SUBTLE.orange,
        title: t.title,
        meta: `Overdue task${t.patientId ? ` · ${name(t.patientId)}` : ""}`,
        verb: "Open",
        href: `${BASE}/tasks`,
      })),
    ...threads
      .filter((t) => t.unread > 0)
      .map<Action>((t) => {
        const other = t.memberIds.find((m) => m !== CHAT_ME) ?? ""
        return {
          id: t.id,
          icon: IconChat,
          color: SUBTLE.violet,
          title: `${t.unread} new from ${doctor(other)}`,
          meta: lastOf(t)?.text ?? "",
          verb: "Reply",
          href: `${BASE}/communication`,
        }
      }),
  ]

  return (
    <Card className={className}>
      <CardHeader title="Needs you" count={<Badge tone="light">{actions.length}</Badge>} />
      {actions.length === 0 ? (
        <Empty className="flex-1 py-10">
          <EmptyHeader>
            <EmptyMedia>
              <Illustration name="no-results" />
            </EmptyMedia>
            <EmptyTitle>You are all caught up</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="no-scrollbar max-h-[456px] min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {actions.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-4 py-3">
              <IconTile icon={a.icon} glyph={a.glyph} color={a.color} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{a.title}</span>
                <span className="truncate text-xs text-muted-foreground">{a.meta}</span>
              </span>
              {a.href ? (
                <Link href={a.href} className={cn(buttonVariants({ variant: "outline", size: "xs" }), "shrink-0")}>
                  {a.verb}
                </Link>
              ) : (
                <Button
                  variant="outline"
                  size="xs"
                  className="shrink-0"
                  onClick={(e) => a.onPress?.(e.currentTarget)}
                >
                  {a.verb}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* ---------------------------------------------------------- the week -- */

const WEEK_CONFIG = {
  completed: { label: "Completed", color: SUBTLE.green },
  upcoming: { label: "Upcoming", color: SUBTLE.blue },
  missed: { label: "Missed", color: SUBTLE.red },
} satisfies ChartConfig

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short" })
const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })

export function WeekAhead({ now, className }: { now: string; className?: string }) {
  const all = useAppointments(now)
  const reduced = useReducedMotion()
  const [week, setWeek] = React.useState<"this" | "next">("this")

  const monday = new Date(`${now.slice(0, 10)}T00:00:00`)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + (week === "next" ? 7 : 0))
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
  const rows = days.map((d) => {
    const list = all.filter((a) => a.start.startsWith(isoDay(d)))
    return {
      day: WEEKDAY.format(d),
      date: SHORT.format(d),
      completed: list.filter((a) => a.status === "Completed").length,
      upcoming: list.filter((a) => a.status === "Scheduled" || a.status === "Checked in").length,
      missed: list.filter((a) => a.status === "No show" || a.status === "Cancelled").length,
    }
  })
  const visits = all.filter(
    (a) => a.status !== "Cancelled" && days.some((d) => a.start.startsWith(isoDay(d)))
  )
  const stats = [
    { label: "Visits", value: visits.length },
    { label: "New patients", value: visits.filter((a) => a.type === "New patient visit").length },
    { label: "Virtual", value: visits.filter((a) => a.mode === "Virtual").length },
  ]

  return (
    <Card className={className}>
      <CardHeader
        title="Visits by day"
        actions={
          <SegmentedControl
            label="Week"
            value={week}
            onChange={setWeek}
            items={[
              { value: "this", label: "This week" },
              { value: "next", label: "Next week" },
            ]}
          />
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <dl className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="text-xl font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(WEEK_CONFIG).map(([k, c]) => (
            <li key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label}
            </li>
          ))}
        </ul>
        <ChartContainer config={WEEK_CONFIG} className="aspect-auto h-[196px] w-full">
          <BarChart data={rows} margin={{ top: 4, right: 0, left: -20, bottom: 0 }} barCategoryGap="28%">
            <Grid />
            <XAxis dataKey="day" {...AXIS_PROPS} />
            <YAxis allowDecimals={false} {...AXIS_PROPS} />
            <ChartTooltip
              cursor={{ fill: "var(--secondary)", radius: 6 }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(_, p) => (p?.[0]?.payload as { date?: string })?.date ?? ""}
                />
              }
            />
            {(["completed", "missed", "upcoming"] as const).map((k, i, arr) => (
              <Bar
                key={k}
                dataKey={k}
                stackId="day"
                fill={`var(--color-${k})`}
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={!reduced}
                shape={(props: React.ComponentProps<typeof Rectangle>) => (
                  <Rectangle {...props} radius={i === arr.length - 1 ? [4, 4, 0, 0] : 0} />
                )}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------ tasks -- */

const PRIORITY_ICON: Record<TaskPriority, typeof IconEqual> = {
  High: IconArrowUpDouble,
  Medium: IconEqual,
  Low: IconArrowDownDouble,
}

const DUE_TIME = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })

/** "Today, 11:00 AM" on the tasks' clock, or the short date. */
function dueLabel(t: Task, today: string) {
  const d = new Date(ms(t.due))
  const day = t.due.slice(0, 10) === today ? "Today" : SHORT.format(d)
  return `${day}, ${DUE_TIME.format(d)}`
}

export function MyTasks({ byId, today, className }: { byId: Map<string, Patient>; today: string; className?: string }) {
  const all = tasks.use().items
  const mine = all
    .filter((t) => t.assigneeId === ME && t.status !== "Completed")
    .sort((a, b) => a.due.localeCompare(b.due))
  const overdue = mine.filter(isOverdue).length
  const dueToday = mine.filter((t) => !isOverdue(t) && t.due.startsWith(today)).length

  return (
    <Card className={className}>
      <CardHeader
        title="My tasks"
        count={<Badge tone="light">{mine.length}</Badge>}
        actions={<CardLink href={`${BASE}/tasks`}>All tasks</CardLink>}
      />
      <div className="grid grid-cols-2 border-b border-border">
        {[
          { label: "Overdue", value: overdue, color: overdue > 0 ? SUBTLE.red : undefined },
          { label: "Due today", value: dueToday, color: undefined },
        ].map((s, i) => (
          <div key={s.label} className={cn("flex flex-col px-4 py-3", i === 1 && "border-l border-border")}>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {s.color && <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: s.color }} />}
              {s.label}
            </span>
            <span className="text-xl font-semibold tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
      {mine.length === 0 ? (
        <Empty className="flex-1 py-8">
          <EmptyHeader>
            <EmptyTitle>No open tasks</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="no-scrollbar max-h-[300px] min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {mine.map((t) => {
            const Icon = PRIORITY_ICON[t.priority]
            const late = isOverdue(t)
            const p = t.patientId ? byId.get(t.patientId) : undefined
            return (
              <li key={t.id}>
                <Link
                  href={`${BASE}/tasks`}
                  className={cn("flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-soft", FOCUS)}
                >
                  <Icon
                    aria-label={`${t.priority} priority`}
                    className="size-4 shrink-0 [--icon-stroke-width:2.5]"
                    style={{ color: TASK_COLOR[t.priority] }}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{t.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {t.type}
                      {p && ` · ${fullName(p)}`}
                    </span>
                  </span>
                  <span
                    className="shrink-0 text-xs whitespace-nowrap tabular-nums"
                    style={{ color: late ? word(SUBTLE.red) : undefined }}
                  >
                    {dueLabel(t, today)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/* ---------------------------------------------------------- patients -- */

const STATUS_COLOR: Record<Patient["status"], string> = {
  Active: SUBTLE.green,
  Invited: SUBTLE.blue,
  Declined: SUBTLE.orange,
  Inactive: "#B5B5B5",
}

/** Days since a local "2026-10-12", on the real clock the patient app uses. */
const daysAgo = (iso: string, today: string) => Math.round((ms(today) - ms(iso)) / 86_400_000)

export function MyPatients({ today, className }: { today: string; className?: string }) {
  const { items } = patients.use()
  const mine = items.filter((p) => p.providerId === PROVIDER_ID)
  const segments: Segment[] = (["Active", "Invited", "Declined", "Inactive"] as const).map((s) => ({
    label: s,
    value: mine.filter((p) => p.status === s).length,
    color: STATUS_COLOR[s],
  }))
  const slices: ReSlice[] = segments.map((s) => ({
    key: s.label.toLowerCase(),
    label: s.label,
    value: s.value,
    color: s.color,
    fill: "solid",
  }))
  const active = mine.filter((p) => p.status === "Active")
  const quiet = active.filter((p) => !p.lastEngagedAt || daysAgo(p.lastEngagedAt, today) > 30).length
  const members = mine.filter((p) => p.membership === "optimization").length

  return (
    <Card className={className}>
      <CardHeader title="My patients" actions={<CardLink href={BASE}>All patients</CardLink>} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* The panel by status as a pie, the total at its centre. */}
        <ReDonut
          data={slices}
          centerValue={mine.length}
          centerLabel="Patients"
          height={176}
          thickness={22}
          className="mx-auto w-[176px]"
        />
        <ul className="flex flex-col divide-y divide-border">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center gap-2 py-2 text-sm">
              <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="font-medium">{s.label}</span>
              <span className="ml-auto font-semibold tabular-nums">{s.value}</span>
              <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                {mine.length ? Math.round((s.value / mine.length) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-auto grid grid-cols-2 gap-3 rounded-lg bg-surface-soft p-3">
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">Optimization members</dt>
            <dd className="text-lg font-semibold tabular-nums">{members}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {quiet > 0 && <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: SUBTLE.orange }} />}
              Quiet for 30+ days
            </dt>
            <dd className="text-lg font-semibold tabular-nums">{quiet}</dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------ the day -- */

const LONG = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" })

/** Today's visits for the stat card, and the day the schedule card shows:
    today while visits remain, else the next clinic day. */
export function useClinicDay(now: string | null) {
  const all = useAppointments(now)
  return React.useMemo(() => {
    const none = { today: [] as Appointment[], day: [] as Appointment[], title: "Today's schedule" }
    if (!now) return none
    const start = new Date(`${now.slice(0, 10)}T00:00:00`)
    const on = (d: Date) => all.filter((a) => a.start.startsWith(isoDay(d)))
    const today = isWorkingDay(start) ? on(start) : []
    if (today.some((a) => !isPast(a))) return { today, day: today, title: "Today's schedule" }
    const d = new Date(start)
    for (let i = 0; i < 7; i++) {
      d.setDate(d.getDate() + 1)
      const list = isWorkingDay(d) ? on(d) : []
      if (list.length) return { today, day: list, title: i === 0 ? `Tomorrow, ${SHORT.format(d)}` : LONG.format(d) }
    }
    return { ...none, today }
  }, [all, now])
}
