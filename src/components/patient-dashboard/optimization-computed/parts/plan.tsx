"use client"

import * as React from "react"
import { Alert02Icon, Tick02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { Textarea } from "@/design-system/ui/textarea"
import { Badge, type BadgeTone, type KitIcon, SidePanel } from "@/components/dashboard-kit"
import { usDay } from "@/components/provider/mock-clock"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import { planAxis } from "@/components/patient-dashboard/optimization/rules"
import type { Biomarker, InterventionStatus, PlanDraft } from "@/components/patient-dashboard/optimization/types"
import { AiChip, BasedOn, OptCard } from "@/components/patient-dashboard/optimization-computed/parts/ui"

/* The plan as date-range lanes: each intervention from its start to today
   (a completed one to its review date), coloured by status, with what it
   has achieved on the right. And the drawer where the physician approves,
   edits or removes what the AI drafted, item by item. */

const STATUS: Record<InterventionStatus, { tone: BadgeTone; bar: string; icon?: KitIcon }> = {
  "High priority": { tone: "error", bar: "bg-destructive", icon: Alert02Icon },
  Active: { tone: "primary", bar: "bg-primary" },
  Verify: { tone: "warning", bar: "bg-warning" },
  Completed: { tone: "light", bar: "bg-ring/60", icon: Tick02Icon },
}

const DIVIDER = "border-[color-mix(in_oklab,var(--border)_65%,transparent)]"
const COLS = "grid grid-cols-[minmax(160px,240px)_minmax(320px,1fr)_minmax(260px,340px)]"

export function PlanGantt({ model }: { model: OptimizationModel }) {
  const lanes = model.lanes
  if (lanes.length === 0) return null
  const { pos, months } = planAxis(model.data.planSince)
  const active = lanes.filter((l) => l.status !== "Completed").length
  const grid = (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {months.slice(1).map((m) => (
        <span key={m.label} className={cn("absolute inset-y-0 border-l", DIVIDER)} style={{ left: `${m.x * 100}%` }} />
      ))}
    </div>
  )
  return (
    <OptCard
      id="plan"
      title="Plan"
      count={<Badge tone="primary">{active} active</Badge>}
      description={`Interventions since ${usDay(model.data.planSince)}`}
      flush
    >
      <div className="overflow-x-auto">
        <div role="table" aria-label="Plan" className="min-w-[760px]">
          <div role="row" className={cn(COLS, "border-b bg-card text-xs font-medium text-muted-foreground")}>
            <span role="columnheader" className="px-5 py-2.5">
              Intervention
            </span>
            <span role="columnheader" className="relative py-2.5">
              <span className="sr-only">Timeline</span>
              {months.map((m) => (
                <span key={m.label} aria-hidden className="absolute top-2.5 pl-1.5" style={{ left: `${m.x * 100}%` }}>
                  {m.label}
                </span>
              ))}
            </span>
            <span role="columnheader" className="px-5 py-2.5">
              Outcome
            </span>
          </div>
          {lanes.map((l) => {
            const t = STATUS[l.status]
            const left = pos(l.start)
            const width = Math.max(0, pos(l.end) - left)
            return (
              <div key={l.name} role="row" className={cn(COLS, "items-center border-b last:border-0", DIVIDER)}>
                <span role="cell" className="truncate px-5 py-2.5 text-sm font-medium" title={l.name}>
                  {l.name}
                </span>
                <span role="cell" className="relative h-full min-h-10">
                  {grid}
                  <span
                    className={cn("absolute top-1/2 h-3 -translate-y-1/2 rounded-full", t.bar)}
                    style={{ left: `${left * 100}%`, width: `max(8px, ${width * 100}%)` }}
                  />
                  <span className="sr-only">
                    {usDay(l.start)} to {usDay(l.end)}
                  </span>
                </span>
                <span role="cell" className="flex min-w-0 items-center gap-2 px-5 py-2.5">
                  <Badge tone={t.tone} icon={t.icon} className="shrink-0">
                    {l.status}
                  </Badge>
                  <span className="truncate text-[13px] text-foreground/80 tabular-nums" title={l.observed}>
                    {l.observed}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </OptCard>
  )
}

/* -------------------------------------------------------- plan review -- */

type DraftItem = PlanDraft["items"][number]

export function PlanReviewPanel({
  model,
  open,
  onClose,
  returnFocus,
  onDecide,
  onApproveAll,
  onOpenMarker,
}: {
  model: OptimizationModel
  open: boolean
  onClose: () => void
  returnFocus?: React.RefObject<HTMLElement | null>
  onDecide: (id: string, status: "approved" | "removed", text?: string) => void
  onApproveAll: (ids: string[]) => void
  onOpenMarker: (name: string, from: HTMLElement) => void
}) {
  const draft = model.draft
  if (!draft) return null
  const pending = model.pendingDraft
  return (
    <SidePanel
      open={open}
      onClose={onClose}
      returnFocus={returnFocus}
      title="Plan awaiting approval"
      meta={<span>Drafted {usDay(draft.draftedAt)}{model.draftLine && ` · ${model.draftLine}`}</span>}
      actions={
        <Button
          disabled={pending.length === 0}
          onClick={() => {
            onApproveAll(pending.map((i) => i.id))
            onClose()
          }}
        >
          Approve plan
        </Button>
      }
    >
      <ul className="flex flex-col gap-3">
        {draft.items.map((item) => (
          <DraftRow key={item.id} item={item} model={model} onDecide={onDecide} onOpenMarker={onOpenMarker} />
        ))}
      </ul>
    </SidePanel>
  )
}

function DraftRow({
  item,
  model,
  onDecide,
  onOpenMarker,
}: {
  item: DraftItem
  model: OptimizationModel
  onDecide: (id: string, status: "approved" | "removed", text?: string) => void
  onOpenMarker: (name: string, from: HTMLElement) => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [text, setText] = React.useState(item.text)
  const evidence = item.basedOn.map(model.marker).filter((b): b is Biomarker => Boolean(b))
  const done = item.status !== "pending"
  return (
    <li className={cn("flex flex-col gap-2.5 rounded-[7.2px] border p-3.5", done && "bg-surface-sunken")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="outline">{item.kind}</Badge>
        {item.status === "pending" && <AiChip />}
        {item.status === "approved" && (
          <Badge tone="success" icon={Tick02Icon}>
            Approved
          </Badge>
        )}
        {item.status === "removed" && <Badge tone="light">Removed</Badge>}
      </div>
      {editing ? (
        <Textarea aria-label="Plan item" value={text} onChange={(e) => setText(e.target.value)} className="min-h-16" />
      ) : (
        <p className={cn("text-sm", item.status === "removed" && "text-muted-foreground line-through")}>{item.text}</p>
      )}
      <BasedOn markers={evidence} onOpen={onOpenMarker} />
      {!done && (
        <div className="flex flex-wrap gap-1.5">
          {editing ? (
            <>
              <Button
                size="sm"
                disabled={!text.trim()}
                onClick={() => {
                  onDecide(item.id, "approved", text.trim() === item.text ? undefined : text.trim())
                  setEditing(false)
                }}
              >
                Save and approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setText(item.text)
                  setEditing(false)
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => onDecide(item.id, "approved")}>
                Approve
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDecide(item.id, "removed")}>
                Remove
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  )
}
