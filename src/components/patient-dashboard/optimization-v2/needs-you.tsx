"use client"

import { Alert02Icon, ClipboardCheckIcon, UserIcon } from "@hugeicons/core-free-icons"

import { Button } from "@/design-system/ui/button"
import { Card, DoneRow, NeedsYouRow, ZoneLabel } from "@/components/dashboard-kit-v2"
import { clockTime } from "@/components/provider/mock-clock"
import type { NeedsYouRow as RowData } from "@/components/patient-dashboard/optimization-v2/rules"
import { AiChip, optDomId } from "@/components/patient-dashboard/optimization-v2/ui"

/* Tier 1: clinical urgency only, plus the one approval that blocks the
   plan and a check-in that went badly. One card, one row each, one action
   per row. When nothing needs the physician, one quiet line says so. */

export function NeedsYou({
  rows,
  checkedAt,
  onReviewReport,
  onReviewItem,
  onReviewPlan,
  onOpenCheckIn,
}: {
  rows: RowData[]
  /** When the record was last checked (the Health Gorilla sync). */
  checkedAt: string
  onReviewReport: (key: string, from: HTMLElement) => void
  onReviewItem: (key: string, from: HTMLElement) => void
  onReviewPlan: (from: HTMLElement) => void
  onOpenCheckIn: () => void
}) {
  return (
    <section aria-labelledby="opt-needs-label" className="flex flex-col gap-4">
      <ZoneLabel count={rows.length} tone="error">
        Needs you now
      </ZoneLabel>
      {rows.length === 0 ? (
        <DoneRow id={optDomId("needs")} title="Nothing needs you now">
          No urgent results from outside the practice · checked {clockTime(checkedAt)}
        </DoneRow>
      ) : (
        <Card id={optDomId("needs")} tabIndex={-1} className="scroll-mt-3 outline-none">
          <ul>
            {rows.map((r) =>
              r.kind === "report" || r.kind === "result" ? (
                <NeedsYouRow
                  key={r.key}
                  tone="clinical"
                  icon={Alert02Icon}
                  title={
                    <>
                      <span>{r.title}</span>
                      {r.kind === "report" && r.suffix && <span className="text-xs font-normal text-muted-foreground">· {r.suffix}</span>}
                    </>
                  }
                  subline={r.subline}
                  action={
                    <Button size="sm" onClick={(e) => (r.kind === "report" ? onReviewReport(r.key, e.currentTarget) : onReviewItem(r.key, e.currentTarget))}>
                      Review
                    </Button>
                  }
                />
              ) : r.kind === "plan" ? (
                <NeedsYouRow
                  key={r.key}
                  tone="process"
                  icon={ClipboardCheckIcon}
                  title={<span>Plan update waiting for your approval</span>}
                  chips={<AiChip />}
                  subline={r.subline}
                  action={
                    <Button variant="outline" size="sm" onClick={(e) => onReviewPlan(e.currentTarget)}>
                      Review plan
                    </Button>
                  }
                />
              ) : (
                <NeedsYouRow
                  key={r.key}
                  tone="process"
                  icon={UserIcon}
                  title={<span>{r.title}</span>}
                  subline={`Monthly check-in · ${r.month}`}
                  action={
                    <Button variant="outline" size="sm" onClick={onOpenCheckIn}>
                      Open check-in
                    </Button>
                  }
                />
              )
            )}
          </ul>
        </Card>
      )}
    </section>
  )
}
