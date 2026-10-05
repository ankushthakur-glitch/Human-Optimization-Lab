"use client"

import { Tick02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Badge, type BadgeTone, FOCUS_RING, ProgressBar } from "@/components/dashboard-kit"
import { usDay } from "@/components/provider/mock-clock"
import { fmt } from "@/components/patient-dashboard/optimization/rules"
import { OptCard } from "@/components/patient-dashboard/optimization-computed/parts/ui"
import type { GoalCard, V2Model } from "@/components/patient-dashboard/optimization-computed/rules"

/* Progress toward each goal: baseline to goal as a bar, how far along the
   patient is, the projection and its confidence. A card opens its marker. */

const STATUS: Record<GoalCard["status"], BadgeTone> = {
  "Near goal": "primary",
  Improving: "success",
  "Needs improvement": "warning",
  Controlled: "light",
}

export function Goals({ v2, onOpen }: { v2: V2Model; onOpen: (name: string, from: HTMLElement) => void }) {
  const goals = v2.goals
  if (goals.length === 0) return null
  const met = goals.filter((g) => g.met).length
  return (
    <OptCard
      id="goals"
      title="Goals"
      count={<Badge tone={met === goals.length ? "success" : "light"}>{met} of {goals.length} met</Badge>}
      description="Baseline to goal"
      flush
    >
      <ul>
        {goals.map((g) => (
          <li key={g.metric} className="border-b border-[color-mix(in_oklab,var(--border)_65%,transparent)] last:border-0">
            <button
              type="button"
              onClick={(e) => onOpen(g.seriesMarkerName, e.currentTarget)}
              className={cn("flex w-full flex-col gap-2 px-5 py-3.5 text-left hover:bg-surface-row-hover", FOCUS_RING, "focus-visible:ring-inset")}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{g.metric}</span>
                <span className="text-2xl leading-7 font-semibold tabular-nums">
                  {fmt(g.current)} <span className="text-sm font-normal text-muted-foreground">{g.unit}</span>
                </span>
                <span className="ml-auto">
                  {g.met ? (
                    <Badge tone="success" icon={Tick02Icon}>
                      Goal met
                    </Badge>
                  ) : (
                    <Badge tone={STATUS[g.status]}>{g.status}</Badge>
                  )}
                </span>
              </span>
              <ProgressBar value={g.progress} tone={g.met ? "success" : "primary"} label={`${g.metric} ${g.line}`} />
              <span className="flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground tabular-nums">
                <span>
                  {fmt(g.baseline)} → {g.goalLabel}
                </span>
                <span className="font-medium text-foreground">{g.line}</span>
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                Projection {g.projection} by {usDay(g.goalDate)} · {g.confidence.toLowerCase()} confidence
              </span>
            </button>
          </li>
        ))}
      </ul>
    </OptCard>
  )
}
