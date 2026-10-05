import type { DashboardModel } from "@/components/patient-dashboard/model"
import { isOverdue, latestOf, statusOf } from "@/components/patient-dashboard/rules"
import type { LabResult } from "@/components/patient-dashboard/types"

/* The free member's results in the four bands the dashboard reads: Out of
   range, On watch (trending), Due or overdue (open orders and care gaps)
   and In range. */

export const valueOf = (lab: LabResult) => {
  const r = latestOf(lab)
  return r ? `${r.value} ${lab.unit}` : ""
}

export function bands(model: DashboardModel) {
  const out = model.outOfRange
  const watch = model.trending
  const due = [
    ...model.orders.map((o) => ({
      key: o.key,
      name: o.order,
      kind: "Order",
      since: o.orderedAt,
      clock: o.clock,
      reminders: o.reminderDates.length,
    })),
    ...model.gaps.map((g) => ({
      key: g.key,
      name: g.gap,
      kind: g.gapType,
      since: g.due,
      clock: g.clock,
      reminders: g.remindersSent,
    })),
  ].sort((a, b) => Number(isOverdue(b.clock)) - Number(isOverdue(a.clock)))
  const flagged = new Set([...out, ...watch].map((l) => l.code))
  const inRange = model.data.labs.filter(
    (l) => !flagged.has(l.code) && statusOf(l) === "In range"
  )
  return { out, watch, due, inRange }
}
