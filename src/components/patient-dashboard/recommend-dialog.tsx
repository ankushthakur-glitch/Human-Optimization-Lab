"use client"

import * as React from "react"

import { Button } from "@/design-system/ui/button"
import { Checkbox } from "@/design-system/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/design-system/ui/dialog"
import { Label } from "@/design-system/ui/label"
import { Textarea } from "@/design-system/ui/textarea"
import type { DashboardModel } from "@/components/patient-dashboard/model"
import { ResultFlag } from "@/components/patient-dashboard/results"
import { latestOf } from "@/components/patient-dashboard/rules"

/* Recommends the optimization program to a free member, with the results
   behind it. Sending keeps the recommendation and says so in the footer;
   nothing else notifies. The caller remounts it (by key) for each opening,
   so it always starts with every reason checked. */

export function RecommendDialog({
  model,
  open,
  onOpenChange,
  onSend,
}: {
  model: DashboardModel
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (reasons: string[], note: string) => void
}) {
  const results = [...model.outOfRange, ...model.trending]
  const [picked, setPicked] = React.useState(() => results.map((r) => r.code))
  const [note, setNote] = React.useState("")
  const [sent, setSent] = React.useState(false)
  const id = React.useId()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Recommend optimization</DialogTitle>
        </DialogHeader>
        <fieldset className="flex min-w-0 flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">Reasons</legend>
          <ul className="flex max-h-72 flex-col divide-y overflow-y-auto rounded-lg border">
            {results.map((r) => {
              const last = latestOf(r)!
              const cid = `${id}-${r.code}`
              return (
                <li key={r.code} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-1">
                  <Checkbox
                    id={cid}
                    checked={picked.includes(r.code)}
                    disabled={sent}
                    onCheckedChange={(on) =>
                      setPicked((p) => (on ? [...p, r.code] : p.filter((c) => c !== r.code)))
                    }
                  />
                  <Label htmlFor={cid} className="min-w-0 truncate text-sm font-normal">
                    {r.name} {last.value} {r.unit}
                  </Label>
                  <span className="py-1.5"><ResultFlag lab={r} /></span>
                </li>
              )
            })}
          </ul>
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-note`}>Note to patient</Label>
          <Textarea
            id={`${id}-note`}
            value={note}
            disabled={sent}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-20"
          />
        </div>
        <DialogFooter>
          {sent ? (
            <p role="status" className="text-sm text-muted-foreground">
              Recommendation sent
            </p>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={picked.length === 0}
                onClick={() => {
                  onSend(
                    results.filter((r) => picked.includes(r.code)).map((r) => r.name),
                    note.trim()
                  )
                  setSent(true)
                }}
              >
                Send recommendation
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
