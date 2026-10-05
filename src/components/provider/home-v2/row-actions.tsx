"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MoreVerticalIcon, Tick02Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/design-system/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import { KitIcon } from "@/components/dashboard-kit-v2"
import { chartHref } from "@/components/provider/home-v2/labels"
import { type ActionOptions, CLOSE_REASONS } from "@/components/provider/home-v2/selectors"
import type { ActionKind, QueueItem } from "@/components/provider/home-v2/types"

/* The Worklist's Action column: every row can be worked without opening
   the panel. One button for the action the type usually ends in, and a
   menu with the rest, the same actions the panel's footer offers. */

export type RowAct = (item: QueueItem, kind: ActionKind, opts?: ActionOptions) => void

type Action = { label: string; kind: ActionKind; opts?: ActionOptions }

const closeAll: Action[] = CLOSE_REASONS.map((reason) => ({ label: `Close: ${reason.toLowerCase()}`, kind: "close", opts: { reason } }))

function actionsFor(item: QueueItem): { main: Action; more: Action[] } {
  switch (item.type) {
    case "medication_change":
      return { main: { label: "Confirm", kind: "confirm_change" }, more: [{ label: "Not current", kind: "not_current" }] }
    case "overdue_order":
      return {
        main: { label: "Postpone", kind: "postpone", opts: { days: 14 } },
        more: [{ label: "Postpone 30 days", kind: "postpone", opts: { days: 30 } }, ...closeAll],
      }
    case "care_gap":
      return { main: { label: "Reviewed", kind: "mark_reviewed" }, more: closeAll }
    default:
      return { main: { label: "Reviewed", kind: "mark_reviewed" }, more: [] }
  }
}

export function RowActions({ item, onAct }: { item: QueueItem; onAct: RowAct }) {
  const router = useRouter()
  const { main, more } = actionsFor(item)
  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="sm" onClick={() => onAct(item, main.kind, main.opts)}>
        <KitIcon icon={Tick02Icon} />
        {main.label}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="More actions">
              <KitIcon icon={MoreVerticalIcon} />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          {more.length > 0 && (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                {more.map((a) => (
                  <DropdownMenuItem key={a.label} onClick={() => onAct(item, a.kind, a.opts)}>
                    {a.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push(chartHref(item.patientId))}>Open chart</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
