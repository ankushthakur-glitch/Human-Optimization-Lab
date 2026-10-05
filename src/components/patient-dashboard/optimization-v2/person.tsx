"use client"

import { Alert02Icon, Cancel01Icon, MinusSignIcon, Tick02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { type IconDef, KitIcon, PersonCard, RadialScore } from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import { checkInSlots } from "@/components/patient-dashboard/optimization/rules"
import type { CheckInState } from "@/components/patient-dashboard/optimization/types"
import { optDomId } from "@/components/patient-dashboard/optimization-v2/ui"

/* About {first name}: the reason in the patient's own words, the first
   commitment, their confidence in it and each monthly check-in as an icon
   and a word. A month still to come is a dashed circle. No scores. */

const STATE: Record<CheckInState, { icon: IconDef; tint: string }> = {
  "Doing well": { icon: Tick02Icon, tint: "bg-success-surface text-success" },
  Somewhat: { icon: MinusSignIcon, tint: "bg-warning-surface text-warning" },
  Struggling: { icon: Alert02Icon, tint: "bg-warning-surface text-warning" },
  "Didn't start": { icon: Cancel01Icon, tint: "bg-secondary text-muted-foreground" },
}

export function AboutPerson({ model, firstName }: { model: OptimizationModel; firstName: string }) {
  const c = model.data.commitment
  if (!c) return null
  const slots = checkInSlots(c)
  return (
    <PersonCard
      id={optDomId("about")}
      title={`About ${firstName}`}
      description={`Intake reviewed ${usDay(c.intakeReviewedAt)}`}
      quote={c.why}
      pairs={[{ label: "First commitment", value: c.text }]}
    >
      <div className="flex flex-wrap items-center gap-4">
        <RadialScore value={c.confidence} max={10} label="Confidence" size={84}>
          <span className="text-[22px] leading-7 font-semibold tabular-nums">{c.confidence}</span>
          <span className="text-[11px] text-muted-foreground">of 10</span>
        </RadialScore>
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-[13px] text-muted-foreground">Confidence · monthly check-ins</span>
          <ol className="flex flex-wrap gap-2.5">
            {slots.map((s) => {
              const t = s.state && STATE[s.state]
              return (
                <li key={s.month} className="flex flex-col items-center gap-1">
                  <span
                    className={cn("grid size-8 place-items-center rounded-full", t ? t.tint : "border border-dashed border-ring")}
                    title={`${s.month}: ${s.state ?? "Due"}`}
                  >
                    {t && <KitIcon icon={t.icon} size={14} />}
                  </span>
                  <span className="text-xs text-muted-foreground">{s.month}</span>
                  <span className="sr-only">{s.state ?? "Due"}</span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground tabular-nums">Next check-in {usDay(c.nextCheckIn)}</p>
    </PersonCard>
  )
}
