"use client"

import { Alert02Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/design-system/ui/button"
import { Alert } from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import {
  type UrgentItem,
  shortSource,
} from "@/components/patient-dashboard/rules"
import { sectionDomId } from "@/components/patient-dashboard/ui"

/* Tier 1: the page's one alert (inline, never a toast), naming every
   urgent item nobody has reviewed in a single line. Review selects the
   first one. It stays until it is acted on. */

export function UrgentAlert({
  items,
  onReview,
}: {
  items: UrgentItem[]
  onReview: () => void
}) {
  const n = items.length
  const first = items[0]
  const one = items.every(
    (i) =>
      i.source === first.source &&
      i.date.slice(0, 10) === first.date.slice(0, 10)
  )
  const noun = n === 1 ? "urgent result" : "urgent results"
  const title = one
    ? `${n} ${noun} from ${shortSource(first.source)} · ${usDay(first.date)}`
    : `${n} ${noun}`
  return (
    <div
      id={sectionDomId("alert")}
      tabIndex={-1}
      className="scroll-mt-3 outline-none"
    >
      <Alert
        tone="error"
        icon={Alert02Icon}
        title={title}
        className="items-center px-4 py-3"
        actions={
          <Button size="sm" className="h-8" onClick={onReview}>
            Review {n}
          </Button>
        }
      >
        {items.map((i) => i.text).join(" · ")}
      </Alert>
    </div>
  )
}
