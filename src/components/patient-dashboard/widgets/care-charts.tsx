"use client"

import * as React from "react"
import { PieChart01Icon, Table01Icon } from "@hugeicons/core-free-icons"

import { usDay } from "@/components/provider/mock-clock"
import type { GapRow, OrderRow } from "@/components/patient-dashboard/model"
import { type Clock, isOverdue } from "@/components/patient-dashboard/rules"
import {
  type Column,
  DonutWithTable,
  StatusDonut,
  SUBTLE,
  TabbedTable,
  Widget,
} from "@/components/patient-dashboard/widgets/kit"
import { Pill } from "@/components/patient-dashboard/widgets/status"

/* The free member's care gaps, in Dr. Blanchard's four kinds (28 Sep
   call): preventive, clinical, follow-up, and orders never completed. The
   donut and the table are one control: a slice picks the table's tab and
   a tab lights its slice. */

type Kind = "Preventive" | "Clinical" | "Follow-up" | "Order"
type View = "all" | Kind

const KINDS: { key: Kind; label: string; color: string }[] = [
  { key: "Preventive", label: "Preventive", color: SUBTLE.green },
  { key: "Clinical", label: "Clinical", color: SUBTLE.red },
  { key: "Follow-up", label: "Follow-up", color: SUBTLE.orange },
  { key: "Order", label: "Incomplete orders", color: SUBTLE.violet },
]

type GapItem = {
  key: string
  name: string
  kind: Kind
  /** Last done for a gap, ordered for an order. */
  last?: string
  due?: string
  clock: Clock
  reminders: number
}

function items(gaps: GapRow[], orders: OrderRow[]): GapItem[] {
  return [
    ...gaps.map((g) => ({
      key: g.key,
      name: g.gap,
      kind: g.gapType as Kind,
      last: g.lastDone,
      due: g.due,
      clock: g.clock,
      reminders: g.remindersSent,
    })),
    ...orders.map((o) => ({
      key: o.key,
      name: o.order,
      kind: "Order" as const,
      last: o.orderedAt,
      due: o.dueAt,
      clock: o.clock,
      reminders: o.reminderDates.length,
    })),
  ].sort((a, b) => Number(isOverdue(b.clock)) - Number(isOverdue(a.clock)) || days(b.clock) - days(a.clock))
}

const days = (c: Clock) => (c.kind === "running" ? c.day : 0)

function StatusCell({ clock }: { clock: Clock }) {
  if (clock.kind === "future") return <Pill tone="violet">Scheduled {usDay(clock.scheduledAt)}</Pill>
  return isOverdue(clock) ? <Pill tone="red">Overdue</Pill> : <Pill tone="orange">Due</Pill>
}

const COLUMNS: Column<GapItem>[] = [
  { head: "Care gap", className: "min-w-44 whitespace-normal text-sm font-medium text-foreground", cell: (g) => g.name },
  { head: "Type", className: "text-[13px] text-muted-foreground", cell: (g) => KINDS.find((k) => k.key === g.kind)!.label },
  {
    head: "Last done",
    className: "text-[13px] tabular-nums",
    cell: (g) => (g.last ? `${usDay(g.last.slice(0, 10))}${g.kind === "Order" ? ", ordered" : ""}` : "Never"),
  },
  { head: "Due", className: "text-[13px] tabular-nums", cell: (g) => (g.due ? usDay(g.due.slice(0, 10)) : "None") },
  { head: "Days open", className: "text-[13px] tabular-nums", cell: (g) => (g.clock.kind === "running" ? g.clock.day : "None") },
  { head: "Status", cell: (g) => <StatusCell clock={g.clock} /> },
  { head: "Reminders", className: "text-[13px] tabular-nums", cell: (g) => g.reminders },
]

export function CareGaps({ gaps, orders }: { gaps: GapRow[]; orders: OrderRow[] }) {
  const [view, setView] = React.useState<View>("all")
  const all = React.useMemo(() => items(gaps, orders), [gaps, orders])
  const count = (k: Kind) => all.filter((g) => g.kind === k).length
  const rows = view === "all" ? all : all.filter((g) => g.kind === view)
  const tabs = [
    { id: "all" as View, label: `All (${all.length})` },
    ...KINDS.map((k) => ({ id: k.key as View, label: `${k.label} (${count(k.key)})` })),
  ]
  return (
    <DonutWithTable
      donut={
        <Widget icon={PieChart01Icon} title="Care gaps">
          <StatusDonut<View>
            slices={KINDS.map((k) => ({ key: k.key, label: k.label, value: count(k.key), color: k.color }))}
            total={all.length}
            totalLabel="Open gaps"
            selected={view}
            onSelect={(k) => setView((cur) => (cur === k ? "all" : k))}
          />
        </Widget>
      }
      table={
        <TabbedTable
          icon={Table01Icon}
          title="Care gaps"
          tabs={tabs}
          value={view}
          onTab={setView}
          columns={COLUMNS}
          rows={rows}
          rowKey={(g) => g.key}
          empty="No open gaps of this kind"
        />
      }
    />
  )
}
