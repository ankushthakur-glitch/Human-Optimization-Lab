"use client"

import { Alert02Icon, Cancel01Icon, MinusSignIcon, Tick02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Icon, type KitIcon } from "@/components/dashboard-kit"
import { usDay } from "@/components/provider/mock-clock"
import { Ring } from "@/components/patient-dashboard/optimization-computed/parts/charts"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import { checkInSlots } from "@/components/patient-dashboard/optimization/rules"
import type { CheckInState } from "@/components/patient-dashboard/optimization/types"
import { OptCard } from "@/components/patient-dashboard/optimization-computed/parts/ui"

/* The patient's reason, in their words, the first commitment they made,
   their confidence in it, and each monthly check-in as an icon and a word.
   A month still to come is an empty dashed circle. */

const STATE: Record<CheckInState, { icon: KitIcon; tint: string }> = {
  "Doing well": { icon: Tick02Icon, tint: "bg-success-1 text-success" },
  Somewhat: { icon: MinusSignIcon, tint: "bg-warning-1 text-warning" },
  Struggling: { icon: Alert02Icon, tint: "bg-warning-1 text-warning" },
  "Didn't start": { icon: Cancel01Icon, tint: "bg-secondary text-muted-foreground" },
}

export function CommitmentCard({ model }: { model: OptimizationModel }) {
  const c = model.data.commitment
  if (!c) return null
  const slots = checkInSlots(c)
  return (
    <OptCard
      id="commitment"
      title="Commitment and check-ins"
      description={`Intake reviewed ${usDay(c.intakeReviewedAt)}`}
      className="h-full"
      footer={`Next check-in ${usDay(c.nextCheckIn)}`}
    >
      <div className="flex flex-col gap-4">
        <blockquote className="border-l-[3px] border-primary pl-3 text-base leading-6">“{c.why}”</blockquote>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">First commitment</span>
          <p className="text-sm font-medium">{c.text}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Ring value={c.confidence} max={10} label={`Confidence ${c.confidence} of 10`} size={76}>
            <span className="text-xl leading-6 font-semibold tabular-nums">{c.confidence}</span>
            <span className="text-[11px] text-muted-foreground">of 10</span>
          </Ring>
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-xs text-muted-foreground">Confidence · check-ins</span>
            <ol className="flex flex-wrap gap-2">
              {slots.map((s) => {
                const t = s.state && STATE[s.state]
                return (
                  <li key={s.month} className="flex flex-col items-center gap-1" title={`${s.month}: ${s.state ?? "Due"}`}>
                    <span
                      className={cn(
                        "grid size-7 place-items-center rounded-full",
                        t ? t.tint : "border border-dashed border-ring"
                      )}
                    >
                      {t && <Icon icon={t.icon} className="size-3.5" />}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{s.month}</span>
                    <span className="sr-only">{s.state ?? "Due"}</span>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </div>
    </OptCard>
  )
}
