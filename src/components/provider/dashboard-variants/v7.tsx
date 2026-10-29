"use client"

import * as React from "react"
import Link from "next/link"

import { IconArrowRight, IconCalendar, IconChat, IconFileList, IconSearch, IconTarget, IconUsersGroup } from "@/design-system/icons"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/design-system/ui/button"
import { Input } from "@/design-system/ui/input"
import { Skeleton } from "@/design-system/ui/skeleton"
import { Avatar, Badge, Card, CardHeader, FOCUS, SegmentedControl, type Tone } from "@/components/dashboard-kit-v2"
import { type Patient, fullName } from "@/components/practice/practice-data"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import { IconTile, LegendGrid, SegmentBar, type Segment } from "@/components/provider/home-v2/overview"
import { itemName, TYPE_META } from "@/components/provider/home-v2/labels"
import { type Appointment, minuteOf } from "@/components/provider/schedule/schedule-data"
import { clockTime } from "@/components/provider/mock-clock"
import { isOverdue } from "@/components/provider/tasks/tasks-data"
import { VariantFrame } from "@/components/provider/dashboard-variants/frame"
import { useDashboardMetrics } from "@/components/provider/dashboard-variants/use-provider-day"

/* Variation 7, Workspace: four summary counts that double as tabs. Pick a
   count and the one panel below lists the people and things behind it, with
   a preview pane for the row you pick. Counts live only on the cards; the
   detail lives only in the panel, so nothing is shown twice. */

const BASE = "/screens/patients"

type Key = "appointments" | "attention" | "members" | "tasks"

type Row = {
  id: string
  /** Filter bucket within the tab. */
  bucket: string
  name: string
  photo?: string
  title: string
  sub: string
  badge?: { tone: Tone; label: string }
  facts: [string, string][]
  action: { href: string; label: string }
}

const dayLabel = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })

const RANK = { urgent: 0, moderate: 1, routine: 2 } as const
const PRIORITY_TONE: Record<string, Tone> = { urgent: "error", moderate: "warning", routine: "light" }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function DashboardWorkspace() {
  const m = useDashboardMetrics()
  const [tab, setTab] = React.useState<Key>("attention")
  const [filter, setFilter] = React.useState<Record<Key, string>>({ appointments: "all", attention: "all", members: "all", tasks: "all" })
  const [query, setQuery] = React.useState("")
  const [picked, setPicked] = React.useState<Partial<Record<Key, string>>>({})

  const rows = React.useMemo<Record<Key, Row[]>>(() => {
    const L = m.lists
    const who = (id: string): { name: string; photo?: string } => {
      const p: Patient | undefined = L.byId.get(id)
      return p ? { name: fullName(p), photo: p.photo } : { name: "No patient" }
    }
    const today = m.today

    const appointments = L.upcoming.map<Row>((a) => ({
      id: a.id,
      bucket: a.start.startsWith(today) ? "today" : "later",
      ...who(a.patientId),
      title: `${a.start.startsWith(today) ? "Today" : dayLabel(a.start)}, ${clockTime(a.start)}`,
      sub: `${a.type} · ${a.mode}`,
      badge: { tone: a.mode === "In person" ? "light" : "info", label: a.mode },
      facts: [
        ["When", `${dayLabel(a.start)}, ${clockTime(a.start)}`],
        ["Length", `${a.minutes} min`],
        ["Visit", a.type],
        ["Reason", a.reason || "Not given"],
      ],
      action: { href: `${BASE}/schedule`, label: "Open in calendar" },
    }))

    const byPatient = new Map<string, typeof L.attention>()
    for (const i of L.attention) byPatient.set(i.patientId, [...(byPatient.get(i.patientId) ?? []), i])
    const attention = [...byPatient.entries()]
      .map<Row>(([id, items]) => {
        const sorted = [...items].sort((a, b) => RANK[a.priority] - RANK[b.priority])
        const top = sorted[0]!
        return {
          id,
          bucket: top.priority === "urgent" ? "urgent" : "other",
          ...who(id),
          title: `${TYPE_META[top.type].word}: ${itemName(top)}`,
          sub: items.length > 1 ? `${items.length} open items` : "1 open item",
          badge: { tone: PRIORITY_TONE[top.priority]!, label: cap(top.priority) },
          facts: [
            ["Open items", String(items.length)],
            ["Most urgent", `${cap(top.priority)}, ${TYPE_META[top.type].word.toLowerCase()}`],
            ...sorted.slice(0, 3).map((i): [string, string] => [TYPE_META[i.type].word, itemName(i)]),
          ],
          action: { href: `${BASE}/${id}`, label: "Open chart" },
        }
      })
      .sort((a, b) => (a.bucket === b.bucket ? 0 : a.bucket === "urgent" ? -1 : 1))

    const members = L.members.map<Row>((o) => ({
      id: o.patient.id,
      bucket: "all",
      ...who(o.patient.id),
      title: o.plans.join(", "),
      sub: o.week ? `Week ${o.week} of the plan` : "Active plan",
      facts: [
        ["Plans", o.plans.join(", ")],
        ["Program week", o.week ? String(o.week) : "Not started"],
        ["Progress to goal", o.progress !== undefined ? `${Math.round(o.progress * 100)}%` : "No data"],
      ],
      action: { href: `${BASE}/${o.patient.id}?section=care-plan`, label: "Open care plan" },
    }))

    const tasks = [...L.tasks]
      .sort((a, b) => a.due.localeCompare(b.due))
      .map<Row>((t) => {
        const late = isOverdue(t)
        return {
          id: t.id,
          bucket: late ? "overdue" : "ontime",
          ...who(t.patientId),
          title: t.title,
          sub: `${t.type} · due ${dayLabel(t.due)}, ${clockTime(t.due)}`,
          badge: late ? { tone: "error", label: "Overdue" } : { tone: PRIORITY_TONE[t.priority.toLowerCase()] ?? "light", label: t.priority },
          facts: [
            ["Due", `${dayLabel(t.due)}, ${clockTime(t.due)}`],
            ["Priority", t.priority],
            ["Type", t.type],
            ["Details", t.description || "None"],
          ],
          action: { href: `${BASE}/tasks`, label: "Open in tasks" },
        }
      })

    return { appointments, attention, members, tasks }
  }, [m.lists, m.today])

  const cards: { key: Key; label: string; icon: typeof IconCalendar; value: number; meta: string; cta: string; href: string; filters: [string, string][] }[] = [
    {
      key: "appointments",
      label: "Upcoming Appointments",
      icon: IconCalendar,
      value: m.upcoming.count,
      meta: `Next 7 days, ${m.upcoming.today} later today`,
      cta: "View Calendar",
      href: `${BASE}/schedule`,
      filters: [["all", "All"], ["today", "Today"]],
    },
    {
      key: "attention",
      label: "Patients Needing Attention",
      icon: IconUsersGroup,
      value: m.attention.patients,
      meta: `${m.attention.urgent} with urgent items`,
      cta: "View Patients",
      href: BASE,
      filters: [["all", "All"], ["urgent", "Urgent"]],
    },
    {
      key: "members",
      label: "Active Optimization Members",
      icon: IconTarget,
      value: m.active.count,
      meta: `Of ${m.active.members} optimization members`,
      cta: "View Members",
      href: BASE,
      filters: [],
    },
    {
      key: "tasks",
      label: "Open Tasks",
      icon: IconFileList,
      value: m.tasks.open,
      meta: m.tasks.overdue > 0 ? `${m.tasks.overdue} overdue` : "None overdue",
      cta: "View Tasks",
      href: `${BASE}/tasks`,
      filters: [["all", "All"], ["overdue", "Overdue"]],
    },
  ]
  const visits = m.visitsToday
  const visitSegs: Segment[] = [
    { label: "Completed", value: visits.filter((a) => a.status === "Completed").length, color: SUBTLE.green },
    { label: "Checked in", value: visits.filter((a) => a.status === "Checked in").length, color: SUBTLE.orange },
    { label: "Scheduled", value: visits.filter((a) => a.status === "Scheduled").length, color: SUBTLE.blue },
    { label: "Missed", value: visits.filter((a) => a.status === "No show" || a.status === "Cancelled").length, color: SUBTLE.red },
  ]
  const active = cards.find((c) => c.key === tab)!
  const f = filter[tab]
  const q = query.trim().toLowerCase()
  const list = rows[tab].filter(
    (r) => (f === "all" || r.bucket === f) && (!q || `${r.name} ${r.title} ${r.sub}`.toLowerCase().includes(q))
  )
  const current = list.find((r) => r.id === picked[tab]) ?? list[0]

  function onKeys(e: React.KeyboardEvent) {
    const i = cards.findIndex((c) => c.key === tab)
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null
    if (next === null) return
    e.preventDefault()
    const to = cards[(next + cards.length) % cards.length]!
    setTab(to.key)
    document.getElementById(`v7-tab-${to.key}`)?.focus()
  }

  return (
    <VariantFrame>
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col">
          <h1 className="text-lg leading-7 font-semibold">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Pick a count to see who and what is behind it</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
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

      {!m.ready ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[132px] rounded-[7.2px]" />
            ))}
          </div>
          <Skeleton className="h-[420px] rounded-[7.2px]" />
        </>
      ) : (
        <>
          <div role="tablist" aria-label="Summary" onKeyDown={onKeys} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((c) => {
              const on = c.key === tab
              return (
                <Card key={c.key} className={cn("transition-shadow", on && "border-foreground/30 ring-2 ring-primary/20")}>
                  <button
                    type="button"
                    role="tab"
                    id={`v7-tab-${c.key}`}
                    aria-selected={on}
                    aria-controls="v7-panel"
                    tabIndex={on ? 0 : -1}
                    onClick={() => setTab(c.key)}
                    className={cn("flex flex-1 flex-col gap-3 rounded-t-[7.2px] p-4 text-left hover:bg-surface-soft", FOCUS)}
                  >
                    <span className="flex items-center gap-2.5">
                      <IconTile icon={c.icon} />
                      <span className="truncate text-sm font-medium">{c.label}</span>
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[28px] leading-9 font-semibold tabular-nums">{c.value}</span>
                      <span className="truncate text-xs text-muted-foreground">{c.meta}</span>
                    </span>
                  </button>
                  <Link
                    href={c.href}
                    className={cn(
                      "group flex items-center justify-between border-t border-border px-4 py-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground",
                      FOCUS
                    )}
                  >
                    {c.cta}
                    <IconArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Card>
              )
            })}
          </div>

          <div id="v7-panel" role="tabpanel" aria-labelledby={`v7-tab-${tab}`} className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader
                title={active.label}
                count={<Badge tone="light">{list.length}</Badge>}
                actions={
                  active.filters.length > 0 ? (
                    <SegmentedControl
                      label="Filter"
                      value={f}
                      onChange={(v) => setFilter((s) => ({ ...s, [tab]: v }))}
                      items={active.filters.map(([value, label]) => ({ value, label }))}
                    />
                  ) : undefined
                }
              />
              {tab === "appointments" && (
                <div className="flex flex-col gap-2.5 border-b border-border px-4 py-3">
                  <span className="text-xs text-muted-foreground">Today&apos;s visits</span>
                  <SegmentBar segments={visitSegs} label={`Today's visits: ${visitSegs.map((s) => `${s.label} ${s.value}`).join(", ")}`} />
                  <LegendGrid segments={visitSegs} />
                </div>
              )}
              <div className="relative border-b border-border px-4 py-2.5">
                <IconSearch aria-hidden className="pointer-events-none absolute top-1/2 left-7 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by patient or item"
                  aria-label="Search this list"
                  className="pl-9"
                />
              </div>
              {list.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {q || f !== "all" ? "Nothing matches. Clear the search or filter." : "Nothing here right now."}
                </p>
              ) : (
                <ul className="no-scrollbar max-h-[460px] divide-y divide-border overflow-y-auto">
                  {list.map((r) => {
                    const sel = r.id === current?.id
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          aria-pressed={sel}
                          onClick={() => setPicked((s) => ({ ...s, [tab]: r.id }))}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-soft",
                            sel && "bg-surface-soft",
                            FOCUS
                          )}
                        >
                          <Avatar name={r.name} photo={r.photo} size={30} />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-medium">{r.name}</span>
                            <span className="truncate text-xs text-muted-foreground">{r.title}</span>
                          </span>
                          {r.badge && <Badge tone={r.badge.tone}>{r.badge.label}</Badge>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>

            <Card className="self-start">
              {current ? (
                <>
                  <div className="flex items-center gap-3 border-b border-border p-4">
                    <Avatar name={current.name} photo={current.photo} size={36} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold">{current.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{current.sub}</span>
                    </span>
                    {current.badge && <Badge tone={current.badge.tone}>{current.badge.label}</Badge>}
                  </div>
                  <dl className="flex flex-col divide-y divide-border">
                    {current.facts.map(([k, v], i) => (
                      <div key={`${k}-${i}`} className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm">
                        <dt className="shrink-0 text-muted-foreground">{k}</dt>
                        <dd className="min-w-0 text-right font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex justify-end gap-2 border-t border-border p-3">
                    <Link href={current.action.href} className={buttonVariants({ size: "sm" })}>
                      {current.action.label}
                    </Link>
                  </div>
                </>
              ) : (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">Pick a row to preview it here.</p>
              )}
            </Card>
          </div>

          {m.schedule.now && (
            <ScheduleList
              now={m.schedule.now}
              day={m.schedule.day}
              title={m.schedule.title}
              reviews={m.lists.attention.reduce((n, i) => n.set(i.patientId, (n.get(i.patientId) ?? 0) + 1), new Map<string, number>())}
              byId={m.lists.byId}
            />
          )}
        </>
      )}
    </VariantFrame>
  )
}

/* ----------------------------------------------------- the day's list -- */

/** What the right hand badge says about a visit, and how it reads. */
function visitState(a: Appointment, now: string): { label: string; tone: Tone; live: boolean } {
  switch (a.status) {
    case "Completed":
      return { label: "Completed", tone: "success", live: false }
    case "Checked in": {
      const started = minuteOf(a.start) <= minuteOf(now)
      return started ? { label: "In room now", tone: "error", live: true } : { label: "Checked in", tone: "info", live: false }
    }
    case "No show":
      return { label: "No show", tone: "error", live: false }
    case "Cancelled":
      return { label: "Cancelled", tone: "light", live: false }
    default:
      return { label: "Scheduled", tone: "light", live: false }
  }
}

const visitKind = (a: Appointment) =>
  a.mode === "Virtual" ? "Virtual visit" : a.type === "New patient visit" ? "New patient" : "Office visit"

/** Today's visits in time order: time, patient, kind of visit and how many
    items wait for review, with the visit's state on the right. */
function ScheduleList({
  now,
  day,
  title,
  reviews,
  byId,
}: {
  now: string
  day: Appointment[]
  title: string
  reviews: Map<string, number>
  byId: Map<string, Patient>
}) {
  const list = [...day].sort((a, b) => a.start.localeCompare(b.start))
  return (
    <Card>
      <CardHeader
        title={title}
        actions={
          <Link href={`${BASE}/schedule`} className="text-[13px] font-medium text-primary hover:underline">
            Open schedule
          </Link>
        }
      />
      {list.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">No visits booked.</p>
      ) : (
        <ul className="no-scrollbar max-h-[520px] divide-y divide-border overflow-y-auto">
          {list.map((a) => {
            const p = byId.get(a.patientId)
            const s = visitState(a, now)
            const n = reviews.get(a.patientId) ?? 0
            return (
              <li key={a.id}>
                <Link
                  href={p ? `${BASE}/${p.id}` : `${BASE}/schedule`}
                  aria-current={s.live ? "true" : undefined}
                  className={cn("flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-soft", s.live && "bg-surface-soft", FOCUS)}
                >
                  <span className="w-14 shrink-0 text-sm font-semibold tabular-nums">{a.start.slice(11, 16)}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">{p ? fullName(p) : "Unknown patient"}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {visitKind(a)}
                      {n > 0 && (
                        <>
                          {" · "}
                          <span className="font-semibold text-warning">{n} to review</span>
                        </>
                      )}
                    </span>
                  </span>
                  <Badge tone={s.tone} dot={s.tone !== "light"}>
                    {s.label}
                  </Badge>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
