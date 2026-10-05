"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/dashboard-kit-v2"
import { SourceChip } from "@/components/dashboard-kit-v2/brief"
import { usDay } from "@/components/provider/mock-clock"
import type { DashboardModel } from "@/components/patient-dashboard/model"
import { encounterKey } from "@/components/patient-dashboard/rules"
import { Clip, type OpenSection } from "@/components/patient-dashboard/ui"
import { SectionCard } from "@/components/patient-dashboard/section-card"

/* Care the practice did not give, from the last twelve months, newest
   first on a rail. An unreviewed visit has a filled node and a New badge;
   Mark reviewed in the toolbar clears them. Document chips open the
   Documents section. */

export function OutsideCare({
  model,
  onOpen,
}: {
  model: DashboardModel
  onOpen: OpenSection
}) {
  return (
    <SectionCard id="outside" title="Outside care" description="Last 12 months">
      <ol className="flex flex-col pt-1">
        {model.encounters.map((e) => (
          <li
            key={encounterKey(e)}
            className="group/node relative flex gap-3 pb-5 last:pb-1"
          >
            <span
              aria-hidden
              className="absolute top-[18px] bottom-0 left-[6px] w-0.5 bg-secondary group-last/node:hidden"
            />
            <span
              aria-hidden
              className={cn(
                "relative mt-[3px] size-3.5 shrink-0 rounded-full border-2",
                e.reviewed
                  ? "border-muted-foreground/40 bg-card"
                  : "border-primary bg-primary"
              )}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium">{e.event}</span>
                {!e.reviewed && <Badge tone="primary">New</Badge>}
                <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                  {usDay(e.date)}
                </span>
              </div>
              <Clip className="text-xs text-muted-foreground">
                {[e.facility, e.clinician, e.reason]
                  .filter(Boolean)
                  .join(" · ")}
              </Clip>
              {e.documents.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {e.documents.map((d, i) => (
                    <SourceChip
                      key={d}
                      source={{
                        label: d,
                        kind: "document",
                        refId: `${encounterKey(e)}:${d}`,
                      }}
                      index={i}
                      total={e.documents.length}
                      onOpen={() => onOpen("documents")}
                    />
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  )
}
