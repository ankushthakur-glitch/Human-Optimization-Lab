"use client"

import * as React from "react"
import Link from "next/link"
import { IconChat, IconFileList } from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/design-system/ui/button"
import { fullName } from "@/components/practice/practice-data"
import { NOW } from "@/components/provider/mock-clock"
import { ItemPanel } from "@/components/provider/home-v2/item-panel"
import { recordAudit, workItems } from "@/components/provider/home-v2/mock"
import {
  MyTasks,
  NeedsYou,
  StatCardSkeleton,
  TodaySchedule,
  WeekAhead,
} from "@/components/provider/home-v2/overview"
import {
  type ActionOptions,
  CARD_TYPES,
  actionLabel,
  applyAction,
  byPriority,
  isOpen,
  toQueue,
} from "@/components/provider/home-v2/selectors"
import type { ActionKind, QueueItem, WorkItem } from "@/components/provider/home-v2/types"
import { Worklist, type WorklistTab } from "@/components/provider/home-v2/worklist"
import { MetricCards, VariantFrame } from "@/components/provider/dashboard-variants/frame"
import { useOptimization } from "@/components/provider/dashboard-variants/optimization-data"
import { Activity } from "@/components/provider/dashboard-variants/v2"
import { CarePlanReview } from "@/components/provider/dashboard-variants/v5"
import { useProviderDay } from "@/components/provider/dashboard-variants/use-provider-day"

/* Variation 6, Briefing: the dashboard read top to bottom as a morning
   briefing. Section 1 is the four numbers (upcoming appointments, patients
   needing attention, active optimization members, open tasks). Section 2 is the day in three equal
   columns, what is booked, what is yours and what needs you, so nothing
   hides behind a chart. Section 3 is the trends: care plan review, the daily
   optimization score and visits by day. Section 4 is the Worklist table:
   tabs by kind of clinical item, with each row's patient, priority, test,
   result, source and the action to take. */

const BASE = "/screens/patients"
const ACTOR = "Daniel Reyes, MD"
const UNDO_MS = 5000

type Finished = { label: string; snapshot: WorkItem; timer: ReturnType<typeof setTimeout> }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/* ------------------------------------------------------------- page -- */

export function DashboardBriefing() {
  const { ready, byId, mine, open, counts, urgent, now, clinic, work } = useProviderDay()
  const opt = useOptimization()

  /* The item panel walks the rows as the worklist shows them; a worked row
     keeps an Undo until its timer ends, as on the live dashboard. */
  const [tab, setTab] = React.useState<WorklistTab>(CARD_TYPES[0]!)
  const [query, setQuery] = React.useState("")
  const [finished, setFinished] = React.useState<Record<string, Finished>>({})
  const [panel, setPanel] = React.useState<{ id: string; list: string[] } | null>(null)
  const worklistRef = React.useRef<HTMLElement | null>(null)
  const openerRef = React.useRef<HTMLElement | null>(null)

  const finishedRef = React.useRef(finished)
  finishedRef.current = finished
  React.useEffect(() => () => Object.values(finishedRef.current).forEach((f) => clearTimeout(f.timer)), [])

  const listed = React.useMemo(() => {
    const ids = new Set(mine.map((p) => p.id))
    return work
      .filter((i) => ids.has(i.patientId) && (isOpen(i) || finished[i.id]))
      .map(toQueue)
      .sort(byPriority)
  }, [work, mine, finished])

  const tabCounts = React.useMemo(() => {
    const c = { all: open.length, urgent: urgent.length } as Record<WorklistTab, number>
    for (const t of counts) c[t.type] = t.open
    return c
  }, [open, counts, urgent])

  const q = query.trim().toLowerCase()
  const rows = listed.filter((i) => {
    if (tab === "urgent" ? i.priority !== "urgent" : tab !== "all" && i.type !== tab) return false
    const p = byId.get(i.patientId)
    if (!p) return false
    return !q || fullName(p).toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
  })
  const panelOrder = rows.filter((i) => !finished[i.id]).map((i) => i.id)

  const current = panel ? (listed.find((i) => i.id === panel.id) ?? null) : null
  const at = panel ? panel.list.indexOf(panel.id) : -1
  const step = (d: -1 | 1) => (panel && panel.list[at + d] ? () => setPanel({ ...panel, id: panel.list[at + d]! }) : undefined)

  function release(id: string) {
    setFinished((all) => {
      if (!all[id]) return all
      clearTimeout(all[id].timer)
      const { [id]: _gone, ...rest } = all
      void _gone
      return rest
    })
  }

  function undo(id: string) {
    const f = finished[id]
    if (!f) return
    workItems.patch(id, { ...f.snapshot })
    recordAudit(ACTOR, "undo", id)
    release(id)
  }

  function workOn(id: string, kind: ActionKind, opts: ActionOptions = {}) {
    const item = work.find((i) => i.id === id)
    if (!item) return
    workItems.patch(item.id, applyAction(kind, opts))
    recordAudit(ACTOR, [kind, opts.reason ?? (opts.days && `${opts.days} days`)].filter(Boolean).join(": "), item.id)
    const timer = setTimeout(() => release(item.id), UNDO_MS)
    setFinished((all) => ({ ...all, [item.id]: { label: actionLabel(kind, opts), snapshot: item, timer } }))
  }

  function actRow(item: QueueItem, kind: ActionKind, opts: ActionOptions = {}) {
    workOn(item.id, kind, opts)
    if (panel?.id === item.id) setPanel(null)
  }

  function act(kind: ActionKind, opts: ActionOptions = {}) {
    if (!panel) return
    const item = work.find((i) => i.id === panel.id)
    if (!item) return
    workOn(item.id, kind, opts)
    const rest = panel.list.filter((id) => id !== item.id)
    const next = rest[at] ?? rest[at - 1]
    setPanel(next ? { id: next, list: rest } : null)
  }

  function openItem(item: QueueItem, from: HTMLElement, list: string[]) {
    openerRef.current = from
    setPanel({ id: item.id, list: list.includes(item.id) ? list : [item.id] })
  }


  const loaded = ready && opt.ready && now

  return (
    <VariantFrame>
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col">
          <h1 className="text-lg leading-7 font-semibold">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            {loaded ? `${plural(mine.length, "patient")} on your panel, ${plural(urgent.length, "urgent item")} waiting` : "Loading your day"}
          </p>
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

      {!loaded ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <MetricCards />

          {/* Section 2: the day, in three equal columns. */}
          <section aria-label="Your day" className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <TodaySchedule now={now} day={clinic.day} title={clinic.title} />
            <MyTasks byId={byId} today={NOW.slice(0, 10)} />
            <NeedsYou
              urgent={urgent}
              byId={byId}
              onOpen={(item, from) => {
                openItem(item, from, urgent.map((u) => u.id))
              }}
              className="lg:col-span-2 xl:col-span-1"
            />
          </section>

          {/* Section 3: how the plans and the week are moving. */}
          <section
            aria-label="Trends"
            className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)]"
          >
            <CarePlanReview opt={opt} />
            <Activity now={now} active={opt.active} className="lg:col-span-2 xl:col-span-1" />
            <WeekAhead now={now} className="lg:col-span-2 xl:col-span-1" />
          </section>

          {/* Section 4: the worklist of clinical items. */}
          <Worklist
            sectionRef={worklistRef}
            ready={ready}
            tab={tab}
            onTab={setTab}
            counts={tabCounts}
            query={query}
            onQuery={setQuery}
            priority=""
            onClearPriority={() => {}}
            age=""
            onClearAge={() => {}}
            rows={rows}
            byId={byId}
            finished={Object.fromEntries(Object.entries(finished).map(([id, f]) => [id, f.label]))}
            selectedId={current?.id}
            onOpen={(item, from) => openItem(item, from, panelOrder)}
            onUndo={undo}
            onAct={actRow}
          />
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
