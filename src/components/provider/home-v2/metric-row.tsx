"use client"

import { Alert02Icon } from "@hugeicons/core-free-icons"

import { Badge, MetricCard, MetricCardSkeleton, PALETTE } from "@/components/dashboard-kit-v2"
import { fmtInt } from "@/components/provider/home-v2/clock"
import { TYPE_META } from "@/components/provider/home-v2/labels"
import { CARD_TYPES, type TypeCount, openSeries, urgentSeries, weekDelta } from "@/components/provider/home-v2/selectors"
import type { ItemType, QueueItem } from "@/components/provider/home-v2/types"
import type { WorklistTab } from "@/components/provider/home-v2/worklist"

/* Row 1: how much work is waiting and whether it is growing. Urgent
   action needed first, across every type, then one card per type.
   Pressing a card selects that Worklist tab. */

const SPARK: Record<ItemType, string> = {
  abnormal_result: PALETTE.clinical,
  medication_change: PALETTE.primary,
  overdue_order: PALETTE.process,
  outside_care: PALETTE.primary,
  care_gap: PALETTE.process,
  review_due: PALETTE.primary,
}

export function deltaText(delta: number) {
  if (delta === 0) return "No change vs last week"
  return `${delta > 0 ? "+" : "-"}${fmtInt(Math.abs(delta))} vs last week`
}

export function MetricRow({
  ready,
  counts,
  urgent,
  selected,
  onPick,
}: {
  ready: boolean
  counts: TypeCount[]
  urgent: QueueItem[]
  selected: WorklistTab
  onPick: (tab: WorklistTab) => void
}) {
  const fresh = urgent.filter((i) => i.isNew).length
  const series = urgentSeries(urgent.length)
  return (
    <section aria-label="Open work by type" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {!ready ? (
        ["urgent", ...CARD_TYPES].map((t) => <MetricCardSkeleton key={t} />)
      ) : (
        <>
          <MetricCard
            icon={Alert02Icon}
            label="Urgent action needed"
            value={urgent.length}
            badge={fresh > 0 ? <Badge tone="error">{fmtInt(fresh)} new</Badge> : null}
            delta={deltaText(weekDelta(series))}
            series={series}
            color={PALETTE.clinical}
            selected={selected === "urgent"}
            onPress={() => onPick("urgent")}
          />
          {counts
            .filter((c) => CARD_TYPES.includes(c.type))
            .map((c) => {
              const series = openSeries(c.type, c.open)
              const badge =
                c.open === 0 ? null : c.urgent > 0 ? (
                  <Badge tone="error" icon={Alert02Icon}>
                    {fmtInt(c.urgent)} urgent
                  </Badge>
                ) : c.fresh > 0 ? (
                  <Badge tone="light">{fmtInt(c.fresh)} new</Badge>
                ) : null
              return (
                <MetricCard
                  key={c.type}
                  icon={TYPE_META[c.type].icon}
                  label={TYPE_META[c.type].metric}
                  value={c.open}
                  badge={badge}
                  delta={deltaText(weekDelta(series))}
                  series={series}
                  color={SPARK[c.type]}
                  selected={selected === c.type}
                  onPress={() => onPick(c.type)}
                />
              )
            })}
        </>
      )}
    </section>
  )
}
