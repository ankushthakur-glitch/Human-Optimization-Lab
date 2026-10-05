"use client"

import { Tick02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { Badge, FOCUS, KitIcon } from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import { AiChip, DIVIDER, OptCard } from "@/components/patient-dashboard/optimization-v2/ui"

/* The visit priorities the AI drafted from the tracker, each with its
   next milestone; met ones sink to the bottom with a check. A row opens
   the evidence it rests on (a marker's panel, or the report). The footer
   holds the approval, pinned to the bottom so the card fills its column. */

export function TopPriorities({
  model,
  onApprove,
  onEdit,
  onOpenMarker,
  onOpenReport,
}: {
  model: OptimizationModel
  onApprove: () => void
  onEdit: (from: HTMLElement) => void
  onOpenMarker: (name: string, from: HTMLElement, list?: string[]) => void
  onOpenReport: (name: string, from: HTMLElement) => void
}) {
  const approved = model.prioritiesApproved
  return (
    <OptCard
      id="priorities"
      title="Top priorities"
      description="Next milestone for each"
      actions={approved ? <Badge tone="success" icon={Tick02Icon}>Approved {usDay(approved.at)}</Badge> : <AiChip />}
      flush
      bodyClassName="flex flex-col"
      footerDivider={!approved}
      footer={
        !approved && (
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={onApprove}>
              Approve priorities
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => onEdit(e.currentTarget)}>
              Edit
            </Button>
          </div>
        )
      }
    >
      <ol className={cn("mt-3 flex flex-col border-t", DIVIDER)}>
        {model.priorities.map((p, i) => {
          const markers = p.basedOn.filter((n) => model.marker(n))
          const open = (from: HTMLElement) => {
            if (p.basedOnReport) onOpenReport(p.basedOnReport, from)
            else if (markers.length) onOpenMarker(markers[0], from, markers)
          }
          const pressable = Boolean(p.basedOnReport || markers.length)
          return (
            <li key={`${p.order}-${p.text}`} className={cn("border-b last:border-0", DIVIDER)}>
              <button
                type="button"
                disabled={!pressable}
                onClick={(e) => open(e.currentTarget)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-2.5 text-left",
                  pressable && "hover:bg-surface-row-hover",
                  FOCUS,
                  "focus-visible:ring-inset"
                )}
              >
                <span
                  className={cn(
                    "mt-px grid size-[22px] shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums",
                    p.met ? "bg-success-surface text-success" : "bg-secondary text-foreground/80"
                  )}
                >
                  {p.met ? <KitIcon icon={Tick02Icon} size={12} /> : i + 1}
                  {p.met && <span className="sr-only">Met</span>}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className={cn("text-[13px] font-medium", p.met && "text-muted-foreground")}>{p.text}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{p.milestone}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </OptCard>
  )
}
