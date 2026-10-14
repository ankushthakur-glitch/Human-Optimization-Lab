"use client"

import * as React from "react"
import { IconEye } from "@/design-system/icons"

import { type Updated, atLabel } from "@/components/provider/chart-epic"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import { TableCell, TableHead } from "@/design-system/ui/table"

/* The chart only reads from Epic, so a row has one action: View details.
   The popup carries the rest of the record, with who last changed it in
   Epic and when. */

type DetailField = [label: string, value: React.ReactNode]

/** What a row's View details popup shows. Empty values are left out, and a
    section with nothing left in it goes too. */
export type RowDetails = {
  title: string
  /** Codes shown small beside the source under the title. */
  codes?: (string | false | undefined)[]
  status?: {
    label: string
    tone: "success" | "warning" | "destructive" | "secondary" | "info"
  }
  /** The one line a clinician reads first, set apart: a sig, a reaction. */
  lead?: DetailField
  sections: { title: string; fields: DetailField[] }[]
  note?: string
  source: string
  updated?: Updated
}

/** The row's View details button and the popup it opens, for one section. */
export function useRowDetails() {
  const [viewing, setViewing] = React.useState<RowDetails | null>(null)

  const rowAction = (details: RowDetails) => (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`View details of ${details.title}`}
      title="View details"
      onClick={(event) => {
        event.stopPropagation()
        setViewing(details)
      }}
    >
      <IconEye />
    </Button>
  )

  const dialog = (
    <DetailsDialog
      details={viewing ?? undefined}
      open={viewing !== null}
      onOpenChange={(open) => !open && setViewing(null)}
    />
  )

  return { rowAction, dialog }
}

/** The closing column every Epic table carries: who last changed the
    record in Epic, with the date and time under the name. */
export function UpdatedHeads() {
  return <TableHead className="min-w-40">Updated by</TableHead>
}

export function UpdatedCells({ updated }: { updated: Updated }) {
  return (
    <TableCell>
      <div>{updated.by}</div>
      <div className="text-xs text-muted-foreground tabular-nums">
        {atLabel(updated.at)}
      </div>
    </TableCell>
  )
}

const filled = (value: React.ReactNode) =>
  value !== null && value !== undefined && value !== ""

/* A row's full record in a centred popup: the title with its status, codes
   and source; the lead line set apart; then small titled sections of
   Label : Value pairs in two columns; the note, then the last update. */
function DetailsDialog({
  details,
  open,
  onOpenChange,
}: {
  details?: RowDetails
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const all = [...(details?.sections ?? [])]
  if (details?.updated)
    all.push({
      title: "Last update in Epic",
      fields: [
        ["Updated by", details.updated.by],
        ["Updated on", atLabel(details.updated.at)],
      ],
    })
  const sections = all
    .map((s) => ({ ...s, fields: s.fields.filter(([, v]) => filled(v)) }))
    .filter((s) => s.fields.length > 0)
  const meta = [...(details?.codes ?? []).filter(Boolean), details?.source]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-xl">
        <DialogHeader className="gap-1 pr-8">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-base font-semibold">
              {details?.title}
            </DialogTitle>
            {details?.status && (
              <Badge
                variant={details.status.tone}
                className="h-5 rounded-full px-2 text-xs font-normal"
              >
                {details.status.label}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground tabular-nums">
            {meta.filter(Boolean).join("  ·  ")}
          </DialogDescription>
        </DialogHeader>

        {details?.lead && filled(details.lead[1]) && (
          <div className="rounded-md bg-surface-sunken px-3.5 py-3">
            <div className="text-xs text-muted-foreground">
              {details.lead[0]}
            </div>
            <div className="mt-0.5 text-sm font-medium">{details.lead[1]}</div>
          </div>
        )}

        <div className="flex max-h-[55dvh] flex-col gap-5 overflow-y-auto">
          {sections.map((section) => (
            <section key={section.title}>
              <h3 className="border-b pb-1.5 text-[13px] font-semibold">
                {section.title}
              </h3>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
                {section.fields.map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 text-sm break-words tabular-nums">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          {details?.note && (
            <section>
              <h3 className="border-b pb-1.5 text-[13px] font-semibold">
                Note
              </h3>
              <p className="mt-3 text-sm whitespace-pre-line">{details.note}</p>
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
