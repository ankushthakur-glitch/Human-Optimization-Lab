"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconListView,
  IconLocation,
  IconVideo,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import {
  DetailSection,
  SUB_TAB,
  SUB_TABS_LIST,
  avatarTone,
  initials,
} from "@/components/practice/directory"
import {
  fullName,
  patients,
  providerName,
  providers,
  useLocationLookup,
} from "@/components/practice/practice-data"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import { clockTime, ms, usDay } from "@/components/provider/mock-clock"
import { PROVIDER_ID, ProviderShell } from "@/components/provider/provider-shell"
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  DAY_END,
  DAY_START,
  LUNCH,
  VISIT_MODES,
  type Appointment,
  type AppointmentStatus,
  endOf,
  isWorkingDay,
  isoDay,
  minuteOf,
  useAppointments,
  useNow,
} from "@/components/provider/schedule/schedule-data"
import { TablePager, usePaged } from "@/components/table-pager"
import { Illustration } from "@/components/illustrations/illustration"
import { Avatar, AvatarFallback, AvatarImage } from "@/design-system/ui/avatar"
import { Badge } from "@/design-system/ui/badge"
import { Button, buttonVariants } from "@/design-system/ui/button"
import { Card } from "@/design-system/ui/card"
import { LogoLoader } from "@/design-system/ui/logo-loader"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/design-system/ui/empty"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/design-system/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableSortHead,
  useTableSort,
} from "@/design-system/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system/ui/tooltip"

/* The provider portal's Schedule, laid out from the Amazing Grace Center
   appointments page (Figma OulMy5QOcLc2lJ6aX0GpFo, 40009578:61254): a list
   or a Day, Week and Month calendar, and the appointment's details in a
   dialog. View only: appointments are booked outside the portal, so there
   is no Schedule appointment button and no new appointment form. */

const PANEL =
  "gap-0 rounded-md border border-border py-0 shadow-[0_0_5px_rgb(0_0_0/0.08)] ring-0"

/* Status colours: the kit's soft hues for the bar and tint, the word a
   step darker so it reads. */
export const STATUS_TONE: Record<
  AppointmentStatus,
  { bar: string; word: string; tint: number }
> = {
  Scheduled: { bar: SUBTLE.blue, word: "#2F6BD0", tint: 13 },
  "Checked in": { bar: SUBTLE.orange, word: "#B8641A", tint: 16 },
  Completed: { bar: SUBTLE.green, word: "#1E7F4E", tint: 15 },
  "No show": { bar: SUBTLE.red, word: "#B9443E", tint: 11 },
  Cancelled: { bar: "#B5B5B5", word: "#737373", tint: 9 },
}

const STATUS_BADGE: Record<
  AppointmentStatus,
  "info" | "warning" | "success" | "destructive" | "secondary"
> = {
  Scheduled: "info",
  "Checked in": "warning",
  Completed: "success",
  "No show": "destructive",
  Cancelled: "secondary",
}

/* Off hours and lunch: a light diagonal hatch, as in the reference. */
export const HATCH =
  "bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--border)_6px_7px)]"

type Range = "day" | "week" | "month"
type Mode = "calendar" | "list"

/* ---------------------------------------------------------------- dates -- */

const day0 = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`)
const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
/** The Monday on or before `d`. */
const weekStart = (d: Date) => addDays(d, -((d.getDay() + 6) % 7))
const sameDay = (a: Date, b: Date) => isoDay(a) === isoDay(b)

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", o)
const LONG_DAY = fmt({ weekday: "long", month: "short", day: "numeric", year: "numeric" })
const SHORT = fmt({ month: "short", day: "numeric" })
const MONTH = fmt({ month: "long", year: "numeric" })
const WEEKDAY = fmt({ weekday: "short" })

/** The days a range covers, start inclusive, end exclusive. */
function span(range: Range, at: Date): [Date, Date] {
  if (range === "day") return [at, addDays(at, 1)]
  if (range === "week") {
    const s = weekStart(at)
    return [s, addDays(s, 7)]
  }
  const first = new Date(at.getFullYear(), at.getMonth(), 1)
  return [first, new Date(at.getFullYear(), at.getMonth() + 1, 1)]
}

function rangeLabel(range: Range, at: Date) {
  if (range === "day") return LONG_DAY.format(at)
  if (range === "month") return MONTH.format(at)
  const [s, e] = span("week", at)
  const last = addDays(e, -1)
  return `${SHORT.format(s)} to ${SHORT.format(last)}, ${last.getFullYear()}`
}

function step(range: Range, at: Date, dir: 1 | -1) {
  if (range === "day") return addDays(at, dir)
  if (range === "week") return addDays(at, 7 * dir)
  return new Date(at.getFullYear(), at.getMonth() + dir, 1)
}

/** Age in whole years on the day of `nowIso`. */
function ageOn(dob: string, nowIso: string) {
  const [y, m, d] = dob.split("-").map(Number)
  const [ny, nm, nd] = nowIso.slice(0, 10).split("-").map(Number)
  return ny - y - (nm < m || (nm === m && nd < d) ? 1 : 0)
}

export const timeRange = (a: Appointment) =>
  `${clockTime(a.start)} to ${clockTime(endOf(a))}`

/* -------------------------------------------------------------------------- */
/*  Screen                                                                     */
/* -------------------------------------------------------------------------- */

export function ScheduleScreen() {
  return (
    <ProviderShell active="schedule">
      <Schedule />
    </ProviderShell>
  )
}

function Schedule() {
  const now = useNow()
  if (!now)
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center">
        <LogoLoader kind="ripple" label="Loading schedule" />
      </div>
    )
  return <ScheduleOn now={now} />
}

function ScheduleOn({ now }: { now: string }) {
  const TODAY = day0(now)
  const all = useAppointments(now)
  const { items: pts } = patients.use()
  const patientOf = React.useCallback(
    (id: string) => pts.find((p) => p.id === id),
    [pts]
  )

  const [mode, setMode] = React.useState<Mode>("calendar")
  const [range, setRange] = React.useState<Range>("week")
  const [at, setAt] = React.useState<Date>(TODAY)
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState("")
  const [type, setType] = React.useState("")
  const [visit, setVisit] = React.useState("")

  const filterCount = [status, type, visit].filter(Boolean).length
  const matches = all.filter(
    (a) =>
      (!status || a.status === status) &&
      (!type || a.type === type) &&
      (!visit || a.mode === visit)
  )
  const [from, to] = span(range, at)
  const inRange = matches.filter(
    (a) => ms(a.start) >= from.getTime() && ms(a.start) < to.getTime()
  )
  const open = all.find((a) => a.id === openId) ?? null

  /* "2 more" in a month cell opens that day. */
  const openDay = (d: Date) => {
    setAt(d)
    setRange("day")
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 bg-surface-sunken px-4 pt-3 pb-4">
      <h1 className="sr-only">Schedule</h1>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-md"
            disabled={sameDay(span(range, at)[0], span(range, TODAY)[0])}
            onClick={() => setAt(TODAY)}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Previous ${range}`}
            onClick={() => setAt(step(range, at, -1))}
          >
            <IconChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Next ${range}`}
            onClick={() => setAt(step(range, at, 1))}
          >
            <IconChevronRight />
          </Button>
          <span className="text-base font-semibold whitespace-nowrap">
            {rangeLabel(range, at)}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {inRange.length} {inRange.length === 1 ? "appointment" : "appointments"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
            <TabsList className={SUB_TABS_LIST}>
              <TabsTrigger value="day" className={SUB_TAB}>Day</TabsTrigger>
              <TabsTrigger value="week" className={SUB_TAB}>Week</TabsTrigger>
              <TabsTrigger value="month" className={SUB_TAB}>Month</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList className={SUB_TABS_LIST}>
              {(
                [
                  ["calendar", "Calendar", IconCalendar],
                  ["list", "List", IconListView],
                ] as const
              ).map(([value, label, Icon]) => (
                <Tooltip key={value}>
                  <TooltipTrigger
                    render={
                      <TabsTrigger
                        value={value}
                        aria-label={label}
                        className={cn(SUB_TAB, "px-2.5")}
                      />
                    }
                  >
                    <Icon className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}
            </TabsList>
          </Tabs>

          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" size="sm" className="rounded-md">
                  <IconFilter />
                  Filters
                  {filterCount > 0 && (
                    <span className="text-xs text-primary-tint tabular-nums">
                      {filterCount}
                    </span>
                  )}
                </Button>
              }
            />
            <PopoverContent align="end" className="w-64">
              <div className="flex flex-col gap-3">
                <FilterSelect
                  label="Status"
                  all="All statuses"
                  options={APPOINTMENT_STATUSES}
                  value={status}
                  onChange={setStatus}
                />
                <FilterSelect
                  label="Appointment type"
                  all="All types"
                  options={APPOINTMENT_TYPES}
                  value={type}
                  onChange={setType}
                />
                <FilterSelect
                  label="Visit"
                  all="In person and virtual"
                  options={VISIT_MODES}
                  value={visit}
                  onChange={setVisit}
                />
                {filterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStatus("")
                      setType("")
                      setVisit("")
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Card className={cn(PANEL, "min-h-0 flex-1 overflow-hidden")}>
        {mode === "list" ? (
          <ListView
            rows={inRange}
            showDate={range !== "day"}
            patientOf={patientOf}
            onOpen={setOpenId}
          />
        ) : range === "day" ? (
          <TimeGrid now={now} days={[at]} items={inRange} patientOf={patientOf} onOpen={setOpenId} />
        ) : range === "week" ? (
          <TimeGrid
            now={now}
            days={Array.from({ length: 7 }, (_, i) => addDays(from, i))}
            items={inRange}
            patientOf={patientOf}
            onOpen={setOpenId}
            onDay={openDay}
          />
        ) : (
          <MonthView
            today={TODAY}
            at={at}
            items={matches}
            patientOf={patientOf}
            onOpen={setOpenId}
            onDay={openDay}
          />
        )}
      </Card>

      <AppointmentDialog now={now} appointment={open} onClose={() => setOpenId(null)} />
    </div>
  )
}

type PatientOf = (id: string) => ReturnType<typeof patients.use>["items"][number] | undefined

function FilterSelect({
  label,
  all,
  options,
  value,
  onChange,
}: {
  label: string
  all: string
  options: readonly string[]
  value: string
  onChange: (v: string) => void
}) {
  const items = [{ label: all, value: "" }, ...options.map((o) => ({ label: o, value: o }))]
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v: string | null) => onChange(v ?? "")}
    >
      <SelectTrigger size="sm" aria-label={label} className="w-full rounded-md border-border bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function ModeIcon({ a, className }: { a: Appointment; className?: string }) {
  const Icon = a.mode === "Virtual" ? IconVideo : IconLocation
  return <Icon aria-label={a.mode} className={cn("size-3.5 shrink-0", className)} />
}

function PersonAvatar({ name, photo, className }: { name: string; photo?: string; className?: string }) {
  return (
    <Avatar className={cn("size-8 shrink-0", className)}>
      {photo && <AvatarImage src={photo} alt="" />}
      <AvatarFallback className={cn("text-xs font-medium", avatarTone(name))}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

function NoAppointments() {
  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia>
          <Illustration name="no-results" />
        </EmptyMedia>
        <EmptyTitle>No appointments</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

/* -------------------------------------------------------------------------- */
/*  Event card                                                                 */
/* -------------------------------------------------------------------------- */

/* One appointment on the calendar, read top down: who, when, how it went.
   The card is a solid tint of its status with a short bar inset on the
   left; finished visits sit quieter than the ones still to come. Taller
   cards show more: one line, then the time, then the status. */
type CardSize = "line" | "short" | "full"

export function EventCard({
  a,
  name,
  size,
  withType,
  onOpen,
  style,
  className,
}: {
  a: Appointment
  name: string
  size: CardSize
  /** The wide day column also names the type and the length. */
  withType?: boolean
  onOpen: (id: string) => void
  style?: React.CSSProperties
  className?: string
}) {
  const tone = STATUS_TONE[a.status]
  const done = a.status === "Completed" || a.status === "Cancelled"
  const cancelled = a.status === "Cancelled"
  return (
    <button
      type="button"
      onClick={() => onOpen(a.id)}
      title={`${name}, ${timeRange(a)}, ${a.status}`}
      style={{
        ...style,
        backgroundColor: `color-mix(in oklab, ${tone.bar} ${tone.tint}%, var(--card))`,
      }}
      className={cn(
        "relative z-[1] flex min-w-0 flex-col overflow-hidden rounded-lg py-1.5 pr-2 pl-3.5 text-left transition-shadow hover:shadow-[0_1px_4px_rgb(0_0_0/0.12)] focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        size === "line" ? "justify-center" : "gap-0.5",
        className
      )}
    >
      <span
        aria-hidden
        className="absolute top-1.5 bottom-1.5 left-1.5 w-[3px] rounded-full"
        style={{ backgroundColor: tone.bar }}
      />
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            "min-w-0 truncate text-xs font-semibold",
            done ? "text-foreground/80" : "text-foreground",
            cancelled && "font-medium text-muted-foreground line-through"
          )}
        >
          {name}
          {withType && (
            <span className="font-normal text-muted-foreground"> · {a.type}</span>
          )}
        </span>
        {size === "line" && (
          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular-nums">
            {clockTime(a.start)}
          </span>
        )}
      </span>
      {size !== "line" && (
        <span className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
          <ModeIcon a={a} className="size-3" />
          <span className="truncate">
            {timeRange(a)}
            {withType && ` (${a.minutes} min)`}
          </span>
        </span>
      )}
      {size === "full" && (
        <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: tone.word }}>
          <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: tone.bar }} />
          {a.status}
        </span>
      )}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Day and week                                                               */
/* -------------------------------------------------------------------------- */

const HOUR_PX = 88
const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)
const GRID_PX = HOURS.length * HOUR_PX
const topOf = (minute: number) => ((minute - DAY_START * 60) / 60) * HOUR_PX

function hourLabel(h: number) {
  return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`
}

function TimeGrid({
  now,
  days,
  items,
  patientOf,
  onOpen,
  onDay,
}: {
  now: string
  days: Date[]
  items: Appointment[]
  patientOf: PatientOf
  onOpen: (id: string) => void
  onDay?: (d: Date) => void
}) {
  const scroller = React.useRef<HTMLDivElement>(null)
  const TODAY = day0(now)
  const nowMinute = minuteOf(now)
  const week = days.length > 1

  /* Open on the current hour, or the first visit of the day. */
  React.useEffect(() => {
    const el = scroller.current
    if (!el) return
    const first = items.length ? Math.min(...items.map((a) => minuteOf(a.start))) : DAY_START * 60
    const target = days.some((d) => sameDay(d, TODAY)) ? nowMinute - 60 : first - 30
    el.scrollTop = Math.max(0, topOf(target) - 8)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isoDay(days[0]), days.length])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {week && (
        <div className="grid shrink-0 grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b bg-surface-head">
          <span />
          {days.map((d) => {
            const today = sameDay(d, TODAY)
            return (
              <button
                key={isoDay(d)}
                type="button"
                onClick={() => onDay?.(d)}
                className="flex items-center justify-center gap-1.5 border-l py-2.5 text-xs text-muted-foreground transition-colors hover:bg-surface-row-hover"
              >
                {WEEKDAY.format(d)}
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-sm font-semibold text-foreground tabular-nums",
                    today && "bg-primary text-primary-foreground"
                  )}
                >
                  {d.getDate()}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 && !week && !isWorkingDay(days[0]) ? (
          <div className="flex h-full min-h-80 items-center justify-center">
            <NoAppointments />
          </div>
        ) : (
          <div
            className={cn(
              "relative grid",
              week ? "grid-cols-[64px_repeat(7,minmax(0,1fr))]" : "grid-cols-[64px_minmax(0,1fr)]"
            )}
            style={{ height: GRID_PX + 16 }}
          >
            {/* Hour labels */}
            <div className="relative">
              {HOURS.map((h) => (
                <span
                  key={h}
                  className="absolute right-3 -translate-y-1/2 text-xs text-muted-foreground tabular-nums"
                  style={{ top: topOf(h * 60) + 8 }}
                >
                  {hourLabel(h)}
                </span>
              ))}
            </div>

            {days.map((d) => {
              const key = isoDay(d)
              const working = isWorkingDay(d)
              const today = sameDay(d, TODAY)
              const dayItems = items.filter((a) => a.start.startsWith(key))
              return (
                <div key={key} className="relative border-l" style={{ marginTop: 8, height: GRID_PX }}>
                  {/* Hour and half hour rules */}
                  {HOURS.map((h) => (
                    <React.Fragment key={h}>
                      <span className="absolute inset-x-0 border-t border-border/70" style={{ top: topOf(h * 60) }} />
                      <span className="absolute inset-x-0 border-t border-dashed border-border/40" style={{ top: topOf(h * 60 + 30) }} />
                    </React.Fragment>
                  ))}
                  <span className="absolute inset-x-0 border-t" style={{ top: GRID_PX }} />

                  {working ? (
                    <div
                      aria-label="Lunch"
                      className={cn("absolute inset-x-0", HATCH)}
                      style={{ top: topOf(LUNCH.start), height: topOf(LUNCH.end) - topOf(LUNCH.start) }}
                    />
                  ) : (
                    <div aria-label="Not working" className={cn("absolute inset-0", HATCH)} />
                  )}

                  {dayItems.map((a) => {
                    const p = patientOf(a.patientId)
                    const height = (a.minutes / 60) * HOUR_PX - 4
                    return (
                      <EventCard
                        key={a.id}
                        a={a}
                        name={p ? fullName(p) : a.patientId}
                        size={height < 34 ? "line" : height < 60 ? "short" : "full"}
                        withType={!week}
                        onOpen={onOpen}
                        className="absolute inset-x-1"
                        style={{ top: topOf(minuteOf(a.start)) + 2, height }}
                      />
                    )
                  })}

                  {today && nowMinute >= DAY_START * 60 && nowMinute <= DAY_END * 60 && (
                    <div
                      aria-label={`Now, ${clockTime(now)}`}
                      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                      style={{ top: topOf(nowMinute) }}
                    >
                      <span className="-ml-1 size-2 rounded-full bg-primary ring-2 ring-card" />
                      <span className="h-px flex-1 bg-primary" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Month                                                                      */
/* -------------------------------------------------------------------------- */

const MONTH_SHOWN = 3

function MonthView({
  today: TODAY,
  at,
  items,
  patientOf,
  onOpen,
  onDay,
}: {
  today: Date
  at: Date
  items: Appointment[]
  patientOf: PatientOf
  onOpen: (id: string) => void
  onDay: (d: Date) => void
}) {
  const first = new Date(at.getFullYear(), at.getMonth(), 1)
  const start = weekStart(first)
  const last = new Date(at.getFullYear(), at.getMonth() + 1, 0)
  const weeks = Math.ceil((last.getTime() - start.getTime()) / 86_400_000 / 7 + 1 / 7)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i))

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="grid shrink-0 grid-cols-7 border-b bg-surface-head">
        {cells.slice(0, 7).map((d) => (
          <span key={d.getDay()} className="border-l py-2.5 text-center text-xs text-muted-foreground first:border-l-0">
            {WEEKDAY.format(d)}
          </span>
        ))}
      </div>
      <div
        className="grid min-h-[600px] flex-1 grid-cols-7"
        style={{ gridTemplateRows: `repeat(${weeks}, minmax(120px, 1fr))` }}
      >
        {cells.map((d) => {
          const key = isoDay(d)
          const inMonth = d.getMonth() === at.getMonth()
          const dayItems = items.filter((a) => a.start.startsWith(key))
          const more = dayItems.length - MONTH_SHOWN
          const today = sameDay(d, TODAY)
          return (
            <div
              key={key}
              className={cn(
                "flex min-w-0 flex-col gap-1 border-b border-l p-1.5 [&:nth-child(7n+1)]:border-l-0",
                !isWorkingDay(d) && HATCH,
                !inMonth && "bg-muted/40"
              )}
            >
              <button
                type="button"
                onClick={() => onDay(d)}
                aria-label={`Open ${LONG_DAY.format(d)}`}
                className={cn(
                  "flex size-6 items-center justify-center self-start rounded-full text-xs font-medium tabular-nums transition-colors hover:bg-surface-row-hover",
                  inMonth ? "text-foreground" : "text-muted-foreground",
                  today && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {d.getDate()}
              </button>
              {dayItems.slice(0, MONTH_SHOWN).map((a) => {
                const p = patientOf(a.patientId)
                return (
                  <EventCard
                    key={a.id}
                    a={a}
                    name={p ? fullName(p) : a.patientId}
                    size="line"
                    onOpen={onOpen}
                    className="h-6 shrink-0"
                  />
                )
              })}
              {more > 0 && (
                <button
                  type="button"
                  onClick={() => onDay(d)}
                  className="self-start rounded-sm px-1 text-[11px] font-medium text-primary-tint hover:underline"
                >
                  {more} more
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  List                                                                       */
/* -------------------------------------------------------------------------- */

function ListView({
  rows,
  showDate,
  patientOf,
  onOpen,
}: {
  rows: Appointment[]
  showDate: boolean
  patientOf: PatientOf
  onOpen: (id: string) => void
}) {
  const name = (a: Appointment) => {
    const p = patientOf(a.patientId)
    return p ? fullName(p) : a.patientId
  }
  const sorting = useTableSort(rows, {
    time: (a) => ms(a.start),
    patient: name,
    type: (a) => a.type,
    visit: (a) => a.mode,
    reason: (a) => a.reason,
    status: (a) => APPOINTMENT_STATUSES.indexOf(a.status),
  })
  const paged = usePaged(sorting.rows, 15)

  if (rows.length === 0) return <NoAppointments />

  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto [&>[data-slot=table-container]]:overflow-visible">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-surface-head [&_th]:h-9 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
            <TableRow>
              <TableSortHead {...sorting.headProps("time")}>
                {showDate ? "Date and time" : "Time"}
              </TableSortHead>
              <TableSortHead {...sorting.headProps("patient")}>Patient</TableSortHead>
              <TableSortHead className="hidden md:table-cell" {...sorting.headProps("type")}>
                Appointment type
              </TableSortHead>
              <TableSortHead className="hidden lg:table-cell" {...sorting.headProps("visit")}>
                Visit
              </TableSortHead>
              <TableSortHead className="hidden xl:table-cell" {...sorting.headProps("reason")}>
                Reason for visit
              </TableSortHead>
              <TableSortHead {...sorting.headProps("status")}>Status</TableSortHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_td]:px-4 [&_td]:py-2.5">
            {paged.visible.map((a) => {
              const p = patientOf(a.patientId)
              return (
                <TableRow
                  key={a.id}
                  tabIndex={0}
                  onClick={() => onOpen(a.id)}
                  onKeyDown={(e) => e.key === "Enter" && onOpen(a.id)}
                  className="cursor-pointer"
                >
                  <TableCell className="whitespace-nowrap tabular-nums">
                    <div className="flex flex-col">
                      {showDate && (
                        <span className="text-xs text-muted-foreground">
                          {WEEKDAY.format(day0(a.start))}, {SHORT.format(day0(a.start))}
                        </span>
                      )}
                      <span className="text-foreground">{timeRange(a)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <PersonAvatar name={name(a)} photo={p?.photo} />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-foreground">{name(a)}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{a.patientId}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-foreground md:table-cell">
                    {a.type} <span className="text-muted-foreground">({a.minutes} min)</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <ModeIcon a={a} className="size-4 text-muted-foreground" />
                      {a.mode}
                    </span>
                  </TableCell>
                  <TableCell className="hidden max-w-0 w-[26%] truncate text-muted-foreground xl:table-cell">
                    {a.reason}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[a.status]}>{a.status}</Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <TablePager paged={paged} />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Details                                                                    */
/* -------------------------------------------------------------------------- */

export function AppointmentDialog({
  now,
  appointment,
  onClose,
}: {
  now: string
  appointment: Appointment | null
  onClose: () => void
}) {
  return (
    <Dialog open={appointment !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 rounded-xl p-0 sm:max-w-xl">
        {appointment && <AppointmentDetails now={now} a={appointment} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function AppointmentDetails({
  now,
  a,
  onClose,
}: {
  now: string
  a: Appointment
  onClose: () => void
}) {
  const { items: pts } = patients.use()
  const { items: provs } = providers.use()
  const loc = useLocationLookup()
  const p = pts.find((x) => x.id === a.patientId)
  const doctor = provs.find((x) => x.id === PROVIDER_ID)
  const name = p ? fullName(p) : a.patientId

  return (
    <>
      <DialogHeader className="shrink-0 flex-row items-center gap-3 border-b px-6 py-4 pr-14">
        <DialogTitle className="text-base font-semibold">Appointment details</DialogTitle>
        <Badge variant={STATUS_BADGE[a.status]}>{a.status}</Badge>
        <DialogDescription className="sr-only">
          {name}, {usDay(a.start)}, {timeRange(a)}
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
        <div className="flex items-center gap-3">
          <PersonAvatar name={name} photo={p?.photo} className="size-11" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-semibold">
              {name} <span className="font-normal text-muted-foreground">({a.patientId})</span>
            </span>
            {p && (
              <span className="text-xs text-muted-foreground">
                {usDay(p.dob)}, {ageOn(p.dob, now)}y, {p.sex}
              </span>
            )}
          </div>
        </div>

        <DetailSection
          title="Appointment"
          rows={[
            { label: "Date", value: LONG_DAY.format(day0(a.start)) },
            { label: "Time", value: `${timeRange(a)} (${a.minutes} min)` },
            { label: "Appointment type", value: a.type },
            {
              label: "Visit",
              value: (
                <span className="inline-flex items-center gap-1.5">
                  <ModeIcon a={a} className="size-4 text-muted-foreground" />
                  {a.mode}
                </span>
              ),
            },
            { label: "Location", value: a.mode === "Virtual" ? "Video visit" : loc.name(a.locationId) },
            { label: "Provider", value: doctor ? providerName(doctor) : "" },
            { label: "Reason for visit", value: a.reason },
          ]}
        />

        {p && (
          <DetailSection
            title="Contact"
            rows={[
              { label: "Phone", value: p.phone },
              { label: "Email", value: p.email },
            ]}
          />
        )}
      </div>

      <DialogFooter className="mt-0 shrink-0 flex-row justify-end gap-2 border-t px-6 py-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {p && (
          <Link href={`/screens/patients/${p.id}`} className={buttonVariants()}>
            Open chart
          </Link>
        )}
      </DialogFooter>
    </>
  )
}
