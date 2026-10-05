"use client"

import { cn } from "@/lib/utils"
import { FOCUS, RadialScore, StackedBar } from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import { BANDS, type BandKey } from "@/components/patient-dashboard/optimization/rules"
import { scoreRows } from "@/components/patient-dashboard/optimization-v2/rules"
import { OptCard } from "@/components/patient-dashboard/optimization-v2/ui"

/* The HOLv.9 result summary as one compact card: the whole-panel score in
   a ring, the five status groups with their counts, and the same counts
   as one stacked bar. The three band rows select the Markers table; the
   other two open the full list in Lab results. */

export function OptimizationScore({
  model,
  band,
  onBand,
  onLabs,
}: {
  model: OptimizationModel
  band: BandKey
  onBand: (band: BandKey) => void
  onLabs: () => void
}) {
  const s = model.data.snapshot
  const rows = scoreRows(model)
  return (
    <OptCard id="score" title="Optimization score" description={`${s.markersTracked} markers · HOLv.9 · updated ${usDay(s.updatedAt)}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-5">
          <RadialScore value={s.score} max={100} label="Optimization score" size={112}>
            <span className="text-[26px] leading-8 font-bold tabular-nums">{s.score}%</span>
          </RadialScore>
          <ul className="flex min-w-0 flex-1 flex-col">
            {rows.map((r) => {
              const isBand = (BANDS as string[]).includes(r.key)
              const selected = isBand && r.key === band
              return (
                <li key={r.key}>
                  <button
                    type="button"
                    aria-pressed={isBand ? selected : undefined}
                    onClick={() => (isBand ? onBand(r.key as BandKey) : onLabs())}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[5.76px] px-2 py-1.5 text-left text-sm hover:bg-surface-row-hover",
                      FOCUS,
                      selected && "bg-primary-surface"
                    )}
                  >
                    <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: r.color }} />
                    <span className="min-w-0 flex-1 truncate">{r.label}</span>
                    <span className="font-semibold tabular-nums">{r.count}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <StackedBar label="Markers by status" segments={rows} />
      </div>
    </OptCard>
  )
}
