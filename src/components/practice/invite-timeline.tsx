"use client"

import * as React from "react"
import { IconCheck, IconMail } from "@/design-system/icons"
import { cn } from "cn"

import { StatusBadge } from "@/components/practice/directory"
import {
  type InviteStep,
  type Patient,
  fullName,
  inviteTimeline,
  sendPatientInvites,
  shortDate,
} from "@/components/practice/practice-data"
import { SideSheet, SideSheetHeader } from "@/components/practice/sheets"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import { Button } from "@/design-system/ui/button"
import { SheetFooter } from "@/design-system/ui/sheet"
import { toast } from "@/design-system/ui/sonner"

/* The invite and its four reminders for one patient, opened from the
   patient list: what went, what goes next, and where the patient answered. */

type Row = {
  label: string
  date: string
  meta: string
  state: InviteStep["state"] | "declined"
}

function rowsFor(p: Patient): Row[] {
  const rows: Row[] = inviteTimeline(p).map((s) => ({
    label: s.label,
    date: s.date,
    meta: [
      s.state === "skipped" ? "Not sent" : s.channels.join(" and "),
      s.decline && s.state !== "skipped" ? "Decline link" : "",
    ]
      .filter(Boolean)
      .join(", "),
    state: s.state,
  }))
  if (p.status === "Declined" && p.respondedAt) {
    /* The answer sits after the reminder it came from. */
    const at = rows.findIndex((r) => r.date > p.respondedAt!)
    rows.splice(at < 0 ? rows.length : at, 0, {
      label: "Declined",
      date: p.respondedAt,
      meta: "From the final reminder",
      state: "declined",
    })
  }
  return rows
}

function Dot({ state }: { state: Row["state"] }) {
  if (state === "sent")
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground [--icon-stroke-width:3]">
        <IconCheck className="size-3" />
      </span>
    )
  if (state === "declined")
    return (
      <span className="flex size-5 items-center justify-center">
        <span
          className="size-2.5 rounded-full"
          style={{ background: SUBTLE.red }}
        />
      </span>
    )
  return (
    <span
      className={cn(
        "size-5 rounded-full border-2 bg-background",
        state === "next" ? "border-primary" : "border-border"
      )}
    />
  )
}

export function InviteTimelineSheet({
  patient,
  onClose,
}: {
  patient: Patient | null
  onClose: () => void
}) {
  return (
    <SideSheet open={patient !== null} onOpenChange={(o) => !o && onClose()}>
      {patient && <Body patient={patient} onClose={onClose} />}
    </SideSheet>
  )
}

function Body({ patient: p, onClose }: { patient: Patient; onClose: () => void }) {
  const rows = rowsFor(p)
  const sent = rows.filter((r) => r.state === "sent").length
  const next = rows.find((r) => r.state === "next")

  return (
    <>
      <SideSheetHeader
        title="Invite timeline"
        description={`The invite and reminders sent to ${fullName(p)}`}
        badge={<StatusBadge status={p.status} />}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto p-6">
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-2.5 text-sm">
          {[
            ["Patient", fullName(p)],
            ["Invited", shortDate(p.invitedAt)],
            ["Reminders sent", `${Math.max(0, sent - 1)} of 4`],
            [
              "Next reminder",
              next
                ? shortDate(next.date)
                : p.status === "Invited"
                  ? "None left"
                  : "Stopped",
            ],
          ].map(([label, value]) => (
            <React.Fragment key={label}>
              <dt className="text-muted-foreground">{label} :</dt>
              <dd className="font-medium text-foreground tabular-nums">
                {value}
              </dd>
            </React.Fragment>
          ))}
        </dl>

        <ol className="flex flex-col">
          {rows.map((r, i) => (
            <li key={`${r.label}-${r.date}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <Dot state={r.state} />
                {i < rows.length - 1 && (
                  <span className="my-1 w-px flex-1 bg-border" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3 pb-6">
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      r.state === "scheduled" || r.state === "skipped"
                        ? "text-muted-foreground"
                        : "text-foreground"
                    )}
                  >
                    {r.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.meta}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {shortDate(r.date)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <SheetFooter className="mt-0 shrink-0 flex-row items-center justify-end gap-2 border-t p-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {(p.status === "Invited" || p.status === "Declined") && (
          <Button
            onClick={() => {
              sendPatientInvites([p.id])
              toast.success(
                p.status === "Declined" ? "Invite sent" : "Invite resent",
                { description: "The reminders start again from today." }
              )
              onClose()
            }}
          >
            <IconMail />
            {p.status === "Declined" ? "Invite again" : "Resend invite"}
          </Button>
        )}
      </SheetFooter>
    </>
  )
}
