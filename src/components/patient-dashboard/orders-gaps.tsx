"use client"

import * as React from "react"
import { Clock01Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import {
  Badge,
  DIVIDER,
  ProgressBar,
  SegmentedControl,
  SidePanel,
} from "@/components/dashboard-kit-v2"
import { daysSince, usDay } from "@/components/provider/mock-clock"
import {
  type DashboardModel,
  type GapRow,
  type OrderRow,
  isOverdueRow,
} from "@/components/patient-dashboard/model"
import {
  type Clock,
  gapReminders,
  orderReminders,
} from "@/components/patient-dashboard/rules"
import {
  CLOSE_REASONS,
  Choice,
  type TrackActions,
} from "@/components/patient-dashboard/track-choice"
import { Clip } from "@/components/patient-dashboard/ui"
import { SectionCard } from "@/components/patient-dashboard/section-card"

/* Orders and care gaps on their clocks as one flat list, overdue first.
   Each row carries its name and where it went, a badge with its state, a
   bar toward escalation and one quiet line with one ghost action: Send
   reminder when overdue, View otherwise. View opens the side panel, where
   Postpone and Close live. Overdue stays amber, because a late process is
   never red. Every action is audited; Postpone and Close undo in place. */

const FINISH_MS = 5000
/** Reminders on an unscheduled order: days 14, 28 and 42. */
const ORDER_REMINDERS = 3
const GAP_REMINDERS = 2

type Done = { key: string; name: string; word: "Postponed" | "Closed" }
type Item = { kind: "order"; row: OrderRow } | { kind: "gap"; row: GapRow }

const mmdd = (iso: string) => usDay(iso).slice(0, 5)
/** "Elise Harrington, MD" as "E. Harrington, MD". */
const shortName = (name: string) => name.replace(/^(\p{L})\p{L}+\s+/u, "$1. ")

export function OrdersAndGaps({
  model,
  act,
}: {
  model: DashboardModel
  act: TrackActions
  compact?: boolean
}) {
  const ordersLate = model.orders.some(isOverdueRow)
  const gapsLate = model.gaps.some(isOverdueRow)
  const [tab, setTab] = React.useState<"orders" | "gaps">(
    !ordersLate && gapsLate ? "gaps" : "orders"
  )
  const [open, setOpen] = React.useState<Item | null>(null)
  const returnTo = React.useRef<HTMLElement | null>(null)

  /* A postponed or closed item leaves a line with Undo for five seconds. */
  const [done, setDone] = React.useState<Done[]>([])
  const [timers] = React.useState(
    () => new Map<string, ReturnType<typeof setTimeout>>()
  )
  React.useEffect(() => () => timers.forEach(clearTimeout), [timers])
  const nameOf = (key: string) =>
    model.orders.find((o) => o.key === key)?.order ??
    model.gaps.find((g) => g.key === key)?.gap ??
    ""
  const finish = (d: Done) => {
    clearTimeout(timers.get(d.key))
    setDone((x) => [...x.filter((y) => y.key !== d.key), d])
    timers.set(
      d.key,
      setTimeout(
        () => setDone((x) => x.filter((y) => y.key !== d.key)),
        FINISH_MS
      )
    )
  }
  const tracked: TrackActions = {
    postpone(key, days) {
      act.postpone(key, days)
      setOpen(null)
      finish({ key, name: nameOf(key), word: "Postponed" })
    },
    close(key, reason) {
      act.close(key, reason)
      setOpen(null)
      finish({ key, name: nameOf(key), word: "Closed" })
    },
    undoTrack(key) {
      clearTimeout(timers.get(key))
      setDone((x) => x.filter((y) => y.key !== key))
      act.undoTrack(key)
    },
    remind: act.remind,
  }

  const orders = [...model.orders].sort(byOverdue)
  const gaps = [...model.gaps].sort(byOverdue)
  const items: Item[] =
    tab === "orders"
      ? orders.map((row) => ({ kind: "order", row }))
      : gaps.map((row) => ({ kind: "gap", row }))
  const overdue = items.filter((i) => isOverdueRow(i.row)).length
  const onTrack = items.length - overdue
  const description = [
    overdue > 0 && `${overdue} overdue`,
    onTrack > 0 && `${onTrack} on track`,
    items.length === 0 && "None open",
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <SectionCard
      id="orders"
      title="Orders and care gaps"
      description={description}
      flush
      divider
      actions={
        <SegmentedControl
          label="Orders and care gaps"
          value={tab}
          onChange={setTab}
          items={[
            { value: "orders", label: "Orders", count: model.orders.length },
            { value: "gaps", label: "Care gaps", count: model.gaps.length },
          ]}
        />
      }
    >
      {done.length > 0 && (
        <ul className={cn("flex flex-col gap-1 border-b px-5 py-2.5", DIVIDER)}>
          {done.map((d) => (
            <li
              key={d.key}
              role="status"
              className="flex items-center gap-1 text-[13px] text-muted-foreground"
            >
              {d.name}: {d.word} ·
              <Button
                variant="link"
                size="xs"
                className="h-auto px-0"
                onClick={() => tracked.undoTrack(d.key)}
              >
                Undo
              </Button>
            </li>
          ))}
        </ul>
      )}
      {items.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">
          {tab === "orders" ? "No open orders" : "No open care gaps"}
        </p>
      ) : (
        <ul
          aria-label={tab === "orders" ? "Orders" : "Care gaps"}
          className="flex flex-col"
        >
          {items.map((item) => (
            <TrackRow
              key={item.row.key}
              item={item}
              act={tracked}
              onView={(from) => {
                returnTo.current = from
                setOpen(item)
              }}
            />
          ))}
        </ul>
      )}
      <SidePanel
        open={open !== null}
        onClose={() => setOpen(null)}
        returnFocus={returnTo}
        title={
          open ? (open.kind === "order" ? open.row.order : open.row.gap) : ""
        }
        meta={
          open ? (
            <StateBadge clock={open.row.clock} kind={open.kind} />
          ) : undefined
        }
        actions={
          open && (
            <>
              <Choice
                trigger="Postpone"
                outline
                options={["14 days", "30 days"]}
                confirm="Postpone"
                onConfirm={(v) =>
                  tracked.postpone(open.row.key, v === "30 days" ? 30 : 14)
                }
              />
              <Choice
                trigger="Close"
                options={CLOSE_REASONS}
                confirm="Close item"
                onConfirm={(v) => tracked.close(open.row.key, v)}
              />
            </>
          )
        }
      >
        {open && <Details item={open} />}
      </SidePanel>
    </SectionCard>
  )
}

const byOverdue = (a: { clock: Clock }, b: { clock: Clock }) =>
  Number(isOverdueRow(b)) - Number(isOverdueRow(a))

/** "Overdue · day 52" (amber, clock), "Scheduled 10/08", "Day 12" or "Due 10/01". */
function StateBadge({
  clock,
  kind,
  due,
}: {
  clock: Clock
  kind: "order" | "gap"
  due?: string
}) {
  if (clock.kind === "future")
    return <Badge tone="light">Scheduled {mmdd(clock.scheduledAt)}</Badge>
  if (clock.overdue)
    return (
      <Badge tone="warning" icon={Clock01Icon}>
        Overdue · day {clock.day}
      </Badge>
    )
  if (kind === "gap" && due) return <Badge tone="light">Due {mmdd(due)}</Badge>
  return <Badge tone="light">Day {clock.day}</Badge>
}

/** The share of the time to escalation that has gone, or of the wait to a booked date. */
function progress(clock: Clock, start: string) {
  if (clock.kind === "future") {
    const total = Math.max(1, daysSince(start) - daysSince(clock.scheduledAt))
    return (daysSince(start) / total) * 100
  }
  return (clock.day / clock.escalateAt) * 100
}

function TrackRow({
  item,
  act,
  onView,
}: {
  item: Item
  act: TrackActions
  onView: (from: HTMLElement) => void
}) {
  const { row } = item
  const late = isOverdueRow(row)
  const name = item.kind === "order" ? item.row.order : item.row.gap
  const where =
    item.kind === "order"
      ? late
        ? item.row.facility
        : [
            item.row.facility,
            `ordered ${mmdd(item.row.orderedAt)} by ${shortName(item.row.orderedBy)}`,
          ]
            .filter(Boolean)
            .join(" · ")
      : [
          item.row.lastDone && `Last done ${usDay(item.row.lastDone)}`,
          `due ${usDay(item.row.due)}`,
        ]
          .filter(Boolean)
          .join(" · ")
  const sent =
    item.kind === "order" ? orderReminders(item.row) : gapReminders(item.row)
  const total = item.kind === "order" ? ORDER_REMINDERS : GAP_REMINDERS
  const status =
    row.clock.kind === "future"
      ? "On track"
      : item.kind === "order" && !item.row.scheduledAt
        ? `Not scheduled · ${sent} of ${total} reminders sent`
        : item.kind === "order"
          ? `Scheduled ${usDay(item.row.scheduledAt!)} · not done`
          : late
            ? `${sent} of ${total} reminders sent`
            : "On track"
  const start = item.kind === "order" ? item.row.orderedAt : item.row.due
  return (
    <li
      className={cn(
        "flex flex-col gap-2 border-b px-5 py-3 last:border-0",
        DIVIDER
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Clip className="text-sm font-medium">{name}</Clip>
          <Clip className="text-xs text-muted-foreground">{where ?? ""}</Clip>
        </div>
        <StateBadge
          clock={row.clock}
          kind={item.kind}
          due={item.kind === "gap" ? item.row.due : undefined}
        />
      </div>
      <ProgressBar
        label={`${name} progress`}
        value={progress(row.clock, start)}
        tone={late ? "warning-light" : "primary-light"}
        className="h-1.5"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {status}
          {row.remindedAt && ` · reminder sent ${usDay(row.remindedAt)}`}
        </span>
        {late && !row.remindedAt ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[13px] text-muted-foreground hover:text-foreground"
            onClick={() => act.remind(row.key)}
          >
            Send reminder
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[13px] text-muted-foreground hover:text-foreground"
            onClick={(e) => onView(e.currentTarget)}
          >
            View
          </Button>
        )}
      </div>
    </li>
  )
}

function Details({ item }: { item: Item }) {
  const facts: [string, string][] =
    item.kind === "order"
      ? [
          ["Ordered", `${usDay(item.row.orderedAt)} by ${item.row.orderedBy}`],
          ["Facility", item.row.facility ?? "Not set"],
          [
            "Scheduled",
            item.row.scheduledAt
              ? usDay(item.row.scheduledAt)
              : "Not scheduled",
          ],
          [
            "Reminders",
            item.row.reminderDates.length
              ? item.row.reminderDates.map(usDay).join(", ")
              : "None sent",
          ],
          ...(item.row.postponedUntil
            ? [
                ["Postponed until", usDay(item.row.postponedUntil)] as [
                  string,
                  string,
                ],
              ]
            : []),
        ]
      : [
          ["Type", item.row.gapType],
          ["Last done", item.row.lastDone ? usDay(item.row.lastDone) : "Never"],
          ["Due", usDay(item.row.due)],
          ["Reminders", `${item.row.remindersSent} sent`],
          ...(item.row.postponedUntil
            ? [
                ["Postponed until", usDay(item.row.postponedUntil)] as [
                  string,
                  string,
                ],
              ]
            : []),
        ]
  return (
    <dl className="flex flex-col gap-3 text-sm">
      {facts.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
