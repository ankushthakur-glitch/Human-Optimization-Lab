"use client"

import * as React from "react"
import Link from "next/link"
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
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/design-system/ui/button"
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
  Avatar,
  Badge,
  Card,
  CardHeader,
  FOCUS,
  type IconDef,
  KitIcon,
} from "@/components/dashboard-kit-v2"
import {
} from "@/components/provider/chart-care-plan"
import { CHAT_ME, chats, lastOf } from "@/components/provider/communication/chat-data"
import { clockTime, ms } from "@/components/provider/mock-clock"
import {
  type Appointment,
  DAY_END,
  DAY_START,
  LUNCH,
  isWorkingDay,
  minuteOf,
  isoDay,
  useAppointments,
} from "@/components/provider/schedule/schedule-data"
import { AppointmentDialog, EventCard, HATCH } from "@/components/provider/schedule/schedule"
import { type Task, type TaskPriority, ME, isOverdue, tasks } from "@/components/provider/tasks/tasks-data"
import { TYPE_META, itemName } from "@/components/provider/home-v2/labels"
import type { QueueItem } from "@/components/provider/home-v2/types"

/* The provider home's day blocks: the stat card kit (also used by the panel
   blocks in panel.tsx), today's schedule, what needs the physician and the
   task list. Each block reads the store its own module reads (schedule on
   the real clock, tasks and chats on the mock clock), so a number here
   always matches the page it links to. */

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

/* ------------------------------------------------------- stat cards -- */

export function StatCard({
  icon,
  label,
  when,
  value,
  of,
  unit,
  meta,
  segments,
  footer,
}: {
  icon: typeof IconCalendar
  label: string
  when: string
  value: number
  of?: number
  unit?: string
  meta: React.ReactNode
  segments?: Segment[]
  footer?: React.ReactNode
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
            {unit && <span className="text-base text-muted-foreground">{unit}</span>}
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

const TASK_COLOR: Record<TaskPriority, string> = { High: SUBTLE.red, Medium: SUBTLE.orange, Low: SUBTLE.green }

/* -------------------------------------------------- today's schedule -- */

function ModeIcon({ a, className }: { a: Appointment; className?: string }) {
  const Icon = a.mode === "Virtual" ? IconVideo : IconLocation
  return <Icon aria-label={a.mode} className={cn("size-3.5 shrink-0", className)} />
}

/* The short day grid: clinic hours at 56px an hour. */
const MINI_HOUR = 56
const MINI_HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)
const MINI_GRID = MINI_HOURS.length * MINI_HOUR
const miniTop = (minute: number) => ((minute - DAY_START * 60) / 60) * MINI_HOUR

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
  const listRef = React.useRef<HTMLDivElement>(null)
  const nowRef = React.useRef<HTMLDivElement>(null)

  const next = day.find((a) => a.status === "Scheduled" || a.status === "Checked in")
  const nextPatient = next ? byId.get(next.patientId) : undefined
  const nameOf = (a: Appointment) => {
    const p = byId.get(a.patientId)
    return p ? fullName(p) : a.patientId
  }
  /* The Now rule shows when the card is on today, inside clinic hours. */
  const minute = minuteOf(now)
  const nowMinute =
    day[0]?.start.startsWith(now.slice(0, 10)) && minute >= DAY_START * 60 && minute <= DAY_END * 60 ? minute : null

  /* Open on the present (or the first visit): scroll it near the top. */
  React.useEffect(() => {
    const list = listRef.current
    if (!list || !day.length) return
    list.scrollTop = Math.max(0, miniTop(nowMinute ?? minuteOf(day[0].start)) - 24)
  }, [day, nowMinute])

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

          {/* The day as a short calendar: hour rules, lunch hatched, each
              visit a block sized to its length, the Now rule in place. */}
          <div ref={listRef} className="no-scrollbar relative max-h-[372px] min-h-0 flex-1 overflow-y-auto">
            <div className="relative mx-4 my-2" style={{ height: MINI_GRID }}>
              {MINI_HOURS.map((h) => (
                <React.Fragment key={h}>
                  <span
                    className="absolute left-0 w-12 -translate-y-1/2 text-right text-[11px] text-muted-foreground tabular-nums"
                    style={{ top: miniTop(h * 60) }}
                  >
                    {h % 12 || 12} {h < 12 ? "AM" : "PM"}
                  </span>
                  <span className="absolute right-0 left-14 border-t border-border/70" style={{ top: miniTop(h * 60) }} />
                </React.Fragment>
              ))}
              <span className="absolute right-0 left-14 border-t border-border/70" style={{ top: MINI_GRID }} />
              <div
                aria-label="Lunch"
                className={cn("absolute right-0 left-14", HATCH)}
                style={{ top: miniTop(LUNCH.start), height: miniTop(LUNCH.end) - miniTop(LUNCH.start) }}
              />
              {day.map((a) => {
                const height = (a.minutes / 60) * MINI_HOUR - 3
                return (
                  <EventCard
                    key={a.id}
                    a={a}
                    name={nameOf(a)}
                    size={height < 34 ? "line" : height < 60 ? "short" : "full"}
                    onOpen={setOpenId}
                    className="absolute right-0 left-[60px]"
                    style={{ top: miniTop(minuteOf(a.start)) + 1.5, height }}
                  />
                )
              })}
              {nowMinute !== null && (
                <div
                  ref={nowRef}
                  aria-label={`Now, ${clockTime(now)}`}
                  className="pointer-events-none absolute right-0 left-14 z-10 flex items-center"
                  style={{ top: miniTop(nowMinute) }}
                >
                  <span className="-ml-1 size-2 rounded-full ring-2 ring-card" style={{ backgroundColor: SUBTLE.red }} />
                  <span className="h-px flex-1" style={{ backgroundColor: SUBTLE.red }} />
                </div>
              )}
            </div>
          </div>
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
        <ul className="no-scrollbar max-h-[372px] min-h-0 flex-1 divide-y divide-border overflow-y-auto">
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

const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })

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
        <ul className="no-scrollbar max-h-[372px] min-h-0 flex-1 divide-y divide-border overflow-y-auto">
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
      if (list.length) return { today, day: list, title: i === 0 ? `Today, ${SHORT.format(d)}` : LONG.format(d) }
    }
    return { ...none, today }
  }, [all, now])
}
