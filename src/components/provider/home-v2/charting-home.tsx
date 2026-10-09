"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  RefreshIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { Skeleton } from "@/design-system/ui/skeleton"
import { toast } from "@/design-system/ui/sonner"
import { Spinner } from "@/design-system/ui/spinner"
import { fullName, patients, providers } from "@/components/practice/practice-data"
import { Avatar, DockedPanel, KitIcon, SidePanel } from "@/components/dashboard-kit-v2"
import { CardSkeleton } from "@/components/patient-dashboard/ui"
import { DotTrend } from "@/components/patient-dashboard/widgets/changes-dashboard"
import {
  DetailBody,
  PeekContext,
  PickRow,
  Preview,
  SECOND,
  SOFT_TEXT,
  SharedPeek,
  panelTitle,
  panelTone,
  usePeek,
} from "@/components/patient-dashboard/widgets/charting-dashboard"
import { DecisionBand, type Subject, day } from "@/components/patient-dashboard/widgets/decision-dashboard"
import { TYPE_SCALE, Widget } from "@/components/patient-dashboard/widgets/kit"
import { Pill } from "@/components/patient-dashboard/widgets/status"
import { PROVIDER_ID, ProviderShell } from "@/components/provider/provider-shell"
import { NOW, fmtDateTime } from "@/components/provider/home-v2/clock"
import { TYPE_META, ageSex, chartHref } from "@/components/provider/home-v2/labels"
import { recordAudit, workItems } from "@/components/provider/home-v2/mock"
import {
  type ActionOptions,
  actionLabel,
  applyAction,
  groupByPatient,
  oldestSync,
  openQueue,
  patientsInScope,
} from "@/components/provider/home-v2/selectors"
import { CATEGORY, toSubject } from "@/components/provider/home-v2/subjects"
import type { ActionKind, ItemType, QueueItem } from "@/components/provider/home-v2/types"
import { VersionSwitch } from "@/components/provider/home-v2/version-switch"

/* Provider home, Version 2: Version 1's data drawn with the patient chart
   dashboard's components. Every work item is mapped to the patient
   dashboard's Subject (subjects.ts), so the page reuses its pieces as they
   are:
   - AI Daily Brief          → DecisionBand on the top urgent item
   - metric cards + Worklist → one Widget per card, same names and counts;
                               rows are PickRow (dot, name, patient and line,
                               coloured alert word, date), labs in the
                               MarkerRow pattern with a DotTrend
   - row hover               → the shared peek card
   - item side panel         → DockedPanel + DetailBody (figure, stats, AI
                               note, range chart, readings, Label / Value
                               facts, From → To change, medication records)
   - actions                 → primary, soft teal second, grey third, with
                               an Undo toast
   The panel docks on the right and opens on the top item; a finishing
   action slides it shut, a row reopens it. Below 1280px rows open the
   overlay SidePanel. Cards show only when they have items. */

const ACTOR = "Daniel Reyes, MD"

function greeting(iso: string) {
  const h = Number(iso.slice(11, 13))
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/* The docked panel needs room beside the lists. */
const WIDE = "(min-width: 1280px)"
function useWide() {
  return React.useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(WIDE)
      list.addEventListener("change", notify)
      return () => list.removeEventListener("change", notify)
    },
    () => window.matchMedia(WIDE).matches,
    () => false
  )
}

/** Rows whose alert is a clock (orders, gaps, reviews) show it on the
    right, as the patient dashboard's follow up rows do. */
const ALERT_RIGHT: ItemType[] = ["overdue_order", "care_gap", "review_due"]

export function ProviderChartingHome() {
  const router = useRouter()
  const dock = useWide()
  const { peek, card } = usePeek()
  const roster = patients.use()
  const work = workItems.use()
  const staff = providers.use()
  const ready = roster.ready && work.ready

  const [pick, setPick] = React.useState<{ id: string; list: string[] } | null>(null)
  /* The subject a finishing action closed the docked panel on. */
  const [closed, setClosed] = React.useState<Subject | null>(null)
  const [from, setFrom] = React.useState<HTMLElement | null>(null)

  const byId = React.useMemo(() => new Map(roster.items.map((p) => [p.id, p])), [roster.items])
  const inScope = React.useMemo(() => patientsInScope(roster.items, "mine", PROVIDER_ID), [roster.items])
  const open = React.useMemo(() => openQueue(work.items, inScope), [work.items, inScope])

  const [syncedAt, setSyncedAt] = React.useState<string | null>(null)
  const [syncing, setSyncing] = React.useState(false)
  const synced = syncedAt ?? oldestSync(inScope)
  function syncNow() {
    setSyncing(true)
    setTimeout(() => {
      setSyncedAt(NOW)
      setSyncing(false)
    }, 1200)
  }

  const name = React.useCallback(
    (id: string) => {
      const p = byId.get(id)
      return p ? fullName(p) : id
    },
    [byId]
  )

  /* Work an item; a toast offers Undo, as the patient dashboard does. */
  function act(item: QueueItem, kind: ActionKind, opts: ActionOptions = {}) {
    const snapshot = work.items.find((i) => i.id === item.id)
    if (!snapshot) return
    workItems.patch(item.id, applyAction(kind, opts))
    recordAudit(ACTOR, [kind, opts.reason ?? (opts.days && `${opts.days} days`)].filter(Boolean).join(": "), item.id)
    toast.success(`${actionLabel(kind, opts)}: ${name(item.patientId)}`, {
      action: {
        label: "Undo",
        onClick: () => {
          workItems.patch(item.id, { ...snapshot })
          recordAudit(ACTOR, "undo", item.id)
        },
      },
    })
  }

  /* Every open item as the patient dashboard's Subject. */
  const subjects = new Map(
    open.map((i) => [
      i.id,
      toSubject(i, {
        patient: byId.get(i.patientId),
        act,
        openChart: (id, section) => router.push(chartHref(id, section)),
      }),
    ])
  )
  const itemOf = React.useMemo(() => new Map(open.map((i) => [i.id, i])), [open])
  const subs = (items: QueueItem[]) => items.map((i) => subjects.get(i.id)!)

  const view = (() => {
    const urgent = open.filter((i) => i.priority === "urgent")
    const first = urgent[0]
    const related = first ? open.filter((i) => i.patientId === first.patientId && i.id !== first.id) : []
    const base = first ? subjects.get(first.id) : undefined
    /* The band tells the lead's story in the patient dashboard's words. */
    const lead: Subject | undefined =
      base && first
        ? {
            ...base,
            story: {
              title: `${base.short} for ${name(first.patientId)}`,
              area: base.short,
              facts: [
                `${CATEGORY[first.type]} from ${first.source}${first.isOutsideSource ? ", outside your EHR" : ""}`,
                day(first.createdAt),
                ...(related.length
                  ? [`${plural(related.length, "more open item", "more open items")} for ${name(first.patientId).split(" ")[0]}`]
                  : []),
                ...(urgent.length > 1 ? [`${plural(urgent.length - 1, "other urgent item", "other urgent items")} after this`] : []),
              ],
              weight: 0,
              related: related.map((i) => i.id),
            },
          }
        : undefined
    return { urgent, lead, related, groups: groupByPatient(open).slice(0, 8) }
  })()

  /* The top subject and the list it leads open the docked panel. */
  const topList = view.lead ? [view.lead, ...subs(view.related)] : subs(open)
  const top = dock ? topList[0] : undefined
  const picked = pick ? subjects.get(pick.id) : undefined
  const current = picked ?? top
  const shown = dock && closed ? closed : current
  const list = pick ? pick.list.filter((id) => subjects.has(id)) : topList.map((s) => s.id)
  const at = current ? list.indexOf(current.id) : -1
  const go = (i: number) => (list[i] ? () => setPick({ id: list[i]!, list }) : undefined)

  const choose = (group: Subject[]) => (s: Subject, el: HTMLElement) => {
    setFrom(el)
    setClosed(null)
    setPick({ id: s.id, list: group.map((x) => x.id) })
  }
  const isPicked = (s: Subject) => !closed && current?.id === s.id

  /* A finishing action slides the docked panel shut on what it finished. */
  const runAction = (a: Subject["actions"][number]) => {
    const was = current
    a.run()
    if (!a.keepOpen) {
      if (dock && was) setClosed(was)
      setPick(null)
    }
  }

  const me = staff.items.find((s) => s.id === PROVIDER_ID)

  /* ------------------------------------------------------------ rows -- */

  function row(s: Subject, group: Subject[], urgentCard = false) {
    const item = itemOf.get(s.id)!
    const m = s.marker
    const last = m?.points[m.points.length - 1]
    const tone = panelTone(s)
    const right = ALERT_RIGHT.includes(item.type)
    return (
      <PickRow
        key={s.id}
        s={s}
        tone={tone}
        selected={isPicked(s)}
        onPick={choose(group)}
        meta={
          <>
            <span className="text-foreground/70">
              {name(item.patientId)}. {urgentCard && `${CATEGORY[item.type]}. `}
            </span>
            {m && last ? (
              <span className="tabular-nums">
                <span className={cn("font-semibold", last.out ? SOFT_TEXT.red : "text-foreground")}>{last.value}</span>
                {m.unit && ` ${m.unit}`}
              </span>
            ) : (
              <>
                {s.line}
                {!right && s.alert && <span className={cn("ml-1 font-medium", SOFT_TEXT[tone])}>{s.alert}</span>}
              </>
            )}
          </>
        }
        graph={
          m && m.points.length > 1 ? (
            <span className="hidden shrink-0 sm:flex">
              <DotTrend
                subtle
                points={m.points}
                low={m.low}
                high={m.high}
                label={`${m.name}, last readings ${m.points
                  .slice(-3)
                  .map((p) => p.value)
                  .join(", ")}`}
              />
            </span>
          ) : undefined
        }
        status={
          right ? (
            <span
              className={cn(
                "min-w-24 shrink-0 text-right text-xs whitespace-nowrap tabular-nums",
                s.alert === "Overdue" || item.type === "overdue_order"
                  ? cn("font-semibold", SOFT_TEXT.orange)
                  : "text-muted-foreground"
              )}
            >
              {s.alert}
            </span>
          ) : (
            !m && <span className="w-24 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{day(item.createdAt)}</span>
          )
        }
      />
    )
  }

  /** One of the dashboard's cards: its name, count and items, most pressing first. */
  const widget = (key: "urgent" | ItemType, items: QueueItem[]) => {
    if (!items.length) return null
    const meta = key === "urgent" ? { metric: "Urgent action needed", icon: Alert02Icon } : TYPE_META[key]
    const fresh = items.filter((i) => i.isNew).length
    const urgent = key === "urgent" ? 0 : items.filter((i) => i.priority === "urgent").length
    const group = subs(items)
    return (
      <Widget
        icon={meta.icon}
        title={meta.metric}
        count={items.length}
        action={
          (urgent > 0 || fresh > 0) && (
            <span className="flex items-center gap-2 text-xs font-normal tabular-nums">
              {urgent > 0 && <span className={cn("font-medium", SOFT_TEXT.red)}>{urgent} urgent</span>}
              {fresh > 0 && <span className="text-muted-foreground">{fresh} new</span>}
            </span>
          )
        }
        flush
      >
        <Preview items={group} render={(s) => row(s, group, key === "urgent")} />
      </Widget>
    )
  }
  const ofType = (t: ItemType) => open.filter((i) => i.type === t)
  const pair = (a: React.ReactNode | null, b: React.ReactNode | null) =>
    a || b ? (
      <div className={cn("grid grid-cols-1 gap-4", a && b && "2xl:grid-cols-2")}>
        {a}
        {b}
      </div>
    ) : null

  const lists = ready ? (
    <PeekContext.Provider value={peek}>
      <SharedPeek peek={peek} card={card} />
      <div className={cn("flex min-w-0 flex-col gap-4", TYPE_SCALE)}>
        {view.lead ? (
          <DecisionBand
            lead={view.lead}
            related={subs(view.related)}
            onOpen={choose([view.lead, ...subs(view.related)])}
          />
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border bg-card px-5 py-4">
            <KitIcon icon={CheckmarkCircle02Icon} size={18} className={SOFT_TEXT.green} />
            <span className="flex-1 text-sm font-medium">Nothing urgent today</span>
          </div>
        )}

        {widget("urgent", view.urgent)}
        {pair(widget("abnormal_result", ofType("abnormal_result")), widget("medication_change", ofType("medication_change")))}
        {pair(widget("overdue_order", ofType("overdue_order")), widget("care_gap", ofType("care_gap")))}
        {pair(
          widget("review_due", ofType("review_due")),
          view.groups.length > 0 ? (
            <Widget icon={UserMultipleIcon} title="Patients with the most open items" count={view.groups.length} flush>
              <Preview
                items={view.groups}
                render={(g) => {
                  const p = byId.get(g.patientId)
                  const urgent = g.items.filter((i) => i.priority === "urgent").length
                  const group = subs(g.items)
                  return (
                    <PickRow
                      key={g.patientId}
                      s={{ ...group[0]!, title: name(g.patientId) }}
                      selected={
                        !closed && !!pick && pick.list.join() === group.map((x) => x.id).join() && current?.id === group[0]!.id
                      }
                      onPick={(_, el) => choose(group)(group[0]!, el)}
                      meta={
                        <>
                          {plural(g.items.length, "open item", "open items")}
                          {urgent > 0 && <span className={cn("font-medium", SOFT_TEXT.red)}>, {urgent} urgent</span>}
                        </>
                      }
                      graph={<Avatar name={name(g.patientId)} photo={p?.photo} size={30} className="order-first" />}
                      status={
                        p?.membership && (
                          <Pill tone={p.membership === "optimization" ? "green" : "blue"}>
                            {p.membership === "optimization" ? "Optimization" : "Free"}
                          </Pill>
                        )
                      }
                    />
                  )
                }}
              />
            </Widget>
          ) : null
        )}
      </div>
    </PeekContext.Provider>
  ) : (
    <div className="flex flex-col gap-4" aria-busy>
      <CardSkeleton rows={2} />
      <CardSkeleton rows={6} />
    </div>
  )

  /* ----------------------------------------------------------- panel -- */

  const shownItem = shown ? (work.items.find((i) => i.id === shown.id) ?? null) : null
  const shownPatient = shownItem ? byId.get(shownItem.patientId) : undefined
  const panelHead = shown && (
    <span className="flex flex-wrap items-center gap-2">
      {panelTitle(shown)}
      <Pill tone={panelTone(shown)}>{shown.category}</Pill>
    </span>
  )
  const panelMeta = shownPatient && (
    <>
      <Link href={chartHref(shownPatient.id)} className="font-medium text-foreground/80 hover:underline">
        {fullName(shownPatient)}
      </Link>
      <span aria-hidden>·</span>
      <span>{shownPatient.id}</span>
      <span aria-hidden>·</span>
      <span>{ageSex(shownPatient)}</span>
    </>
  )
  const panelActions = shown?.actions.map((a, i) => (
    <Button
      key={a.label}
      variant={a.primary ? "default" : i <= 1 ? "outline" : "secondary"}
      className={cn(!a.primary && i <= 1 && SECOND)}
      onClick={() => runAction(a)}
    >
      {a.label}
    </Button>
  ))

  return (
    <ProviderShell active="dashboard">
      <div className="flex min-h-0 flex-1">
        <div className="no-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-surface-sunken">
          <div className="flex w-full min-w-0 flex-col gap-4 px-6 pt-5 pb-8">
            <header className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg leading-7 font-semibold">
                {greeting(NOW)}, Dr. {me ? fullName({ firstName: me.firstName, lastName: me.lastName }) : "Daniel Reyes"}
              </h1>
              <div className="ml-auto flex flex-wrap items-center gap-2.5">
                <VersionSwitch />
                {!ready ? (
                  <Skeleton className="h-4 w-48 rounded-sm" />
                ) : (
                  synced && <span className="text-[13px] text-muted-foreground tabular-nums">Records synced {fmtDateTime(synced)}</span>
                )}
                <Button variant="outline" size="sm" disabled={!ready || syncing} onClick={syncNow} className="bg-card">
                  {syncing ? <Spinner /> : <KitIcon icon={RefreshIcon} />}
                  {syncing ? "Syncing" : "Sync now"}
                </Button>
              </div>
            </header>
            {lists}
          </div>
        </div>

        {dock && shown && (
          /* The width eases to zero when closed, so the lists widen into
             the space; the panel keeps its own width and slides out. */
          <div
            aria-hidden={!!closed || undefined}
            inert={!!closed || undefined}
            className={cn(
              "flex h-full justify-end overflow-hidden transition-[width] duration-300 ease-out motion-reduce:transition-none",
              closed ? "w-0" : "w-[420px]"
            )}
          >
            <DockedPanel
              className="w-[420px]"
              title={panelHead}
              meta={panelMeta}
              index={at >= 0 ? at : undefined}
              total={list.length}
              onPrevious={at > 0 ? go(at - 1) : undefined}
              onNext={at >= 0 ? go(at + 1) : undefined}
              actions={panelActions}
              onClose={() => current && setClosed(current)}
            >
              <DetailBody key={shown.id} s={shown} />
            </DockedPanel>
          </div>
        )}
      </div>

      {!dock && picked && (
        <SidePanel
          open
          onClose={() => setPick(null)}
          returnFocus={{ current: from }}
          title={panelHead}
          meta={panelMeta}
          onPrevious={at > 0 ? go(at - 1) : undefined}
          onNext={at >= 0 ? go(at + 1) : undefined}
          actions={panelActions}
        >
          <DetailBody s={picked} />
        </SidePanel>
      )}
    </ProviderShell>
  )
}
