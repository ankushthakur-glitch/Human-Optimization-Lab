"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { DIVIDER, TrendChart } from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import {
  type DashboardModel,
  resultKey,
} from "@/components/patient-dashboard/model"
import {
  changeBetween,
  comparable,
  isUrgentResult,
  latestOf,
  rangeText,
  readingStatus,
  sourceName,
  statusOf,
} from "@/components/patient-dashboard/rules"
import type { LabResult } from "@/components/patient-dashboard/types"
import { Clip } from "@/components/patient-dashboard/ui"
import { SectionCard } from "@/components/patient-dashboard/section-card"

/* The selected result: its latest value against the range, the area chart
   on the reference band with the last point red when it sits outside, every
   comparable reading (same code, same unit; another unit never shares the
   line) with its source, and the last move in the footer. "Not repeated
   since the ED visit" is computed: the latest reading came from an outside
   encounter and nothing of the same code has arrived since. */

export function ResultDetail({
  lab,
  model,
  onOrderRepeat,
}: {
  lab: LabResult
  model: DashboardModel
  onOrderRepeat: (code: string, date: string) => void
}) {
  const readings = comparable(lab)
  const last = latestOf(lab)!
  const prev = readings[readings.length - 2]
  const change = prev && changeBetween(lab, prev.value, last.value)
  const urgent = isUrgentResult(lab)
  const outside = statusOf(lab) !== "In range"
  const visit = last.isOutsideSource
    ? model.data.encounters.find(
        (e) => e.source === last.source && e.date === last.date.slice(0, 10)
      )
    : undefined
  const repeated = model.repeats.has(resultKey(lab.code, last.date))

  return (
    <SectionCard
      id="detail"
      title={lab.name}
      description={`${lab.unit} · ${readings.length} ${readings.length === 1 ? "result" : "results"}`}
      footer={
        <div className="flex w-full flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            {change && (
              <span className="text-[13px] font-medium">
                {change.text} since {usDay(prev.date)}
              </span>
            )}
            {visit && (
              <span className="text-[13px] text-muted-foreground">
                Not repeated since the {visit.event}
              </span>
            )}
          </div>
          {repeated ? (
            <span role="status" className="text-[13px] text-muted-foreground">
              Repeat ordered
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOrderRepeat(lab.code, last.date)}
            >
              Order repeat
            </Button>
          )}
        </div>
      }
    >
      <div className="flex h-full flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            className={cn(
              "text-[32px] leading-[38px] font-bold tracking-[-0.02em] tabular-nums",
              urgent && "text-destructive"
            )}
          >
            {last.value}
          </span>
          <span className="text-sm text-muted-foreground">{lab.unit}</span>
          <span className="ml-auto text-[13px] text-muted-foreground tabular-nums">
            Range {rangeText(lab)}
          </span>
        </div>
        <TrendChart
          label={`${lab.name} trend: ${readings.map((r) => `${usDay(r.date)} ${r.value}`).join(", ")}`}
          points={readings}
          low={lab.refLow}
          high={lab.refHigh}
          unit={lab.unit}
          latestOut={outside}
          height={170}
        />
        <ul className="flex flex-1 flex-col">
          {[...readings].reverse().map((r, i) => {
            const latest = i === 0
            return (
              <li
                key={`${r.date}-${r.source}`}
                className={cn(
                  "grid grid-cols-[5.5rem_3rem_minmax(0,1fr)] items-center gap-3 border-b py-1.5 text-sm tabular-nums last:border-0",
                  DIVIDER
                )}
              >
                <span className="text-muted-foreground">{usDay(r.date)}</span>
                <span
                  className={cn(
                    latest && "font-semibold",
                    latest &&
                      urgent &&
                      readingStatus(lab, r) !== "In range" &&
                      "text-destructive"
                  )}
                >
                  {r.value}
                </span>
                <Clip className="text-muted-foreground">
                  {sourceName(r.source)}
                </Clip>
              </li>
            )
          })}
        </ul>
      </div>
    </SectionCard>
  )
}
