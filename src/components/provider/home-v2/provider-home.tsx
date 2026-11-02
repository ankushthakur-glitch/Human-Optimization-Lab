"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { fullName, patients, providers } from "@/components/practice/practice-data"
import { PROVIDER_ID, ProviderShell } from "@/components/provider/provider-shell"
import { NOW } from "@/components/provider/home-v2/clock"
import { TYPE_META } from "@/components/provider/home-v2/labels"
import { ItemPanel } from "@/components/provider/home-v2/item-panel"
import {
  MyTasks,
  NeedsYou,
  StatCardSkeleton,
  TodaySchedule,
  useClinicDay,
} from "@/components/provider/home-v2/overview"
import {
  ConversionFunnel,
  MembershipTrend,
  PanelStats,
  usePanelMonths,
} from "@/components/provider/home-v2/panel"
import { recordAudit, workItems } from "@/components/provider/home-v2/mock"
import { useNow } from "@/components/provider/schedule/schedule-data"
import {
  type ActionOptions,
  CARD_TYPES,
  type Scope,
  actionLabel,
  applyAction,
  byPriority,
  isOpen,
  openQueue,
  patientsInScope,
  toQueue,
  typeCounts,
} from "@/components/provider/home-v2/selectors"
import type { ActionKind, QueueItem, WorkItem } from "@/components/provider/home-v2/types"
import { Worklist, type WorklistTab } from "@/components/provider/home-v2/worklist"

/* The provider home (/screens/patients/dashboard), read top to bottom: the
   panel at a glance (optimization members, conversion rate, members
   continuing the paid plan); members by month beside the free to paid
   funnel; today's schedule, what needs the physician and My tasks in one row; then
   the Worklist of clinical items. Nothing here notifies. */

const ACTOR = "Daniel Reyes, MD"

/* The greeting follows the mock clock's hour. */
function greeting(iso: string) {
  const h = Number(iso.slice(11, 13))
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}
const UNDO_MS = 5000

type Finished = { label: string; snapshot: WorkItem; timer: ReturnType<typeof setTimeout> }

const tabFromSlug = (slug: string | null): WorklistTab =>
  slug === "urgent" || slug === "all" ? slug : (CARD_TYPES.find((t) => TYPE_META[t].slug === slug) ?? CARD_TYPES[0]!)

export function ProviderHomeV2() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  /* The provider home shows the signed-in provider's own patients. */
  const scope: Scope = "mine"
  const tab = tabFromSlug(params.get("tab"))

  const roster = patients.use()
  const work = workItems.use()
  const staff = providers.use()
  const ready = roster.ready && work.ready

  const [query, setQuery] = React.useState("")
  const [finished, setFinished] = React.useState<Record<string, Finished>>({})
  const [panel, setPanel] = React.useState<{ id: string; list: string[] } | null>(null)
  const worklistRef = React.useRef<HTMLElement | null>(null)
  const openerRef = React.useRef<HTMLElement | null>(null)

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false })
  }

  /* Undo timers end with the page. */
  const finishedRef = React.useRef(finished)
  finishedRef.current = finished
  React.useEffect(() => () => Object.values(finishedRef.current).forEach((f) => clearTimeout(f.timer)), [])

  /* ---------------------------------------------------------- data -- */

  const byId = React.useMemo(() => new Map(roster.items.map((p) => [p.id, p])), [roster.items])
  const inScope = React.useMemo(() => patientsInScope(roster.items, scope, PROVIDER_ID), [roster.items, scope])
  const open = React.useMemo(() => openQueue(work.items, inScope), [work.items, inScope])
  const counts = React.useMemo(() => typeCounts(open), [open])
  const urgent = React.useMemo(
    () => open.filter((i) => i.priority === "urgent").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [open]
  )
  /* Appointments run on the real clock, as the Schedule does. */
  const now = useNow()
  const clinic = useClinicDay(now)
  const months = usePanelMonths()
  /* The Worklist keeps a worked row, with Undo, until its timer ends. */
  const listed = React.useMemo(() => {
    const ids = new Set(inScope.map((p) => p.id))
    return work.items
      .filter((i) => ids.has(i.patientId) && (isOpen(i) || finished[i.id]))
      .map(toQueue)
      .sort(byPriority)
  }, [work.items, inScope, finished])

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
  /* What the panel walks: the rows as the Worklist shows them. */
  const panelOrder = rows.filter((i) => !finished[i.id]).map((i) => i.id)

  /* ------------------------------------------------------- actions -- */

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

  /* Work an item, from the panel or a row's Action cell; the row stays
     with Undo until its timer ends. */
  function workOn(id: string, kind: ActionKind, opts: ActionOptions = {}) {
    const item = work.items.find((i) => i.id === id)
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
    const item = work.items.find((i) => i.id === panel.id)
    if (!item) return
    workOn(item.id, kind, opts)

    /* Auto-advance: the next item in the list, or close at the end. */
    const at = panel.list.indexOf(item.id)
    const rest = panel.list.filter((id) => id !== item.id)
    const next = rest[at] ?? rest[at - 1]
    setPanel(next ? { id: next, list: rest } : null)
  }

  function openItem(item: QueueItem, from: HTMLElement, list: string[]) {
    openerRef.current = from
    setPanel({ id: item.id, list: list.includes(item.id) ? list : [item.id] })
  }

  function goToWorklist() {
    requestAnimationFrame(() => {
      worklistRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      worklistRef.current?.focus({ preventScroll: true })
    })
  }

  function showTab(next: WorklistTab, scroll = false) {
    setParam("tab", next === CARD_TYPES[0] ? null : next === "urgent" || next === "all" ? next : TYPE_META[next].slug)
    if (scroll) goToWorklist()
  }


  const current = panel ? (listed.find((i) => i.id === panel.id) ?? null) : null
  const at = panel ? panel.list.indexOf(panel.id) : -1
  const step = (d: -1 | 1) =>
    panel && panel.list[at + d] ? () => setPanel({ ...panel, id: panel.list[at + d]! }) : undefined

  /* ---------------------------------------------------------- view -- */

  const me = staff.items.find((s) => s.id === PROVIDER_ID)

  return (
    <ProviderShell active="dashboard">
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-surface-sunken">
        <div className="flex w-full min-w-0 flex-col gap-5 px-6 pt-5 pb-8">
          {/* The greeting. */}
          <header className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg leading-7 font-semibold">
              {greeting(NOW)}, Dr. {me ? fullName({ firstName: me.firstName, lastName: me.lastName }) : "Daniel Reyes"}
            </h1>
          </header>

          {ready && now ? (
            <PanelStats months={months} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          )}

          {ready && now && (
            <>
              {/* Members month by month beside the free to paid funnel. */}
              <div className="grid gap-4 xl:grid-cols-3">
                <MembershipTrend months={months} className="xl:col-span-2" />
                <ConversionFunnel months={months} />
              </div>

              {/* The day, what is waiting on the physician and the tasks, side by side. */}
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                <TodaySchedule now={now} day={clinic.day} title={clinic.title} className="lg:col-span-2 xl:col-span-1" />
                <NeedsYou urgent={urgent} byId={byId} onOpen={(item, from) => openItem(item, from, [item.id])} />
                <MyTasks byId={byId} today={NOW.slice(0, 10)} />
              </div>
            </>
          )}

          <Worklist
            sectionRef={worklistRef}
            ready={ready}
            tab={tab}
            onTab={(t) => showTab(t)}
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

        </div>
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
    </ProviderShell>
  )
}
