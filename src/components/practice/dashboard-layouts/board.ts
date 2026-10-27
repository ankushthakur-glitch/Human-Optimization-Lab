"use client"

import * as React from "react"

import {
  type PeriodKind,
  usePracticeOps,
  useReportTotals,
} from "@/components/practice/dashboard-variants/practice-ops"

/* What the Clinic Manager dashboard reads. The headline cards, the trend
   charts and the pipeline use the practice report totals for the period
   (so they match each other and the reports); task lists and the two
   tables use the live practice lists. The location filter scopes both:
   report totals sum the active providers at the location, and the lists
   keep the records at it. */

export function useBoard(kind: PeriodKind, locationId: string) {
  const ops = usePracticeOps()
  const totals = useReportTotals(kind, locationId)

  return React.useMemo(() => {
    const inLocation = (ids: string[]) => !locationId || ids.includes(locationId)
    return {
      ops,
      totals,
      locationId,
      locationName: ops.locations.find((l) => l.id === locationId)?.name ?? "",
      when: totals.now.period.label,
      before: totals.before.period.label,
      /* The live lists, narrowed to the picked location. */
      patients: ops.patients.filter((p) => !locationId || p.locationId === locationId),
      providers: ops.providers.filter((p) => inLocation(p.locationIds)),
      inLocation,
    }
  }, [ops, totals, locationId])
}

export type Board = ReturnType<typeof useBoard>
