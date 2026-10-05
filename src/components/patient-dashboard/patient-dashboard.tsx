"use client"

import * as React from "react"

import { Button } from "@/design-system/ui/button"
import { Badge } from "@/components/dashboard-kit-v2"
import { useDashboard } from "@/components/patient-dashboard/model"
import { RecommendDialog } from "@/components/patient-dashboard/recommend-dialog"

/* The patient dashboard's state and its toolbar. The chart calls
   useDashboard once and hands it to both the toolbar (on the right of the
   Dashboard bar) and the content (widgets/). */

export { useDashboard }
export type Dashboard = ReturnType<typeof useDashboard>

/** The right side of the sub-tab bar: membership and actions. */
export function DashboardToolbar({ dash }: { dash: Dashboard }) {
  const { ready, model, actions, free } = dash
  const [opening, setOpening] = React.useState(0)
  const [open, setOpen] = React.useState(false)
  if (!ready) return null
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
      {free && <Badge tone="primary">Free member</Badge>}
      {free && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setOpening((n) => n + 1)
            setOpen(true)
          }}
        >
          Recommend optimization
        </Button>
      )}
      {free && (
        <RecommendDialog
          key={opening}
          model={model}
          open={open}
          onOpenChange={setOpen}
          onSend={actions.recommend}
        />
      )}
    </div>
  )
}
