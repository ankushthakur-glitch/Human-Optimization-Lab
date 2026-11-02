"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"

import { AdminShell } from "@/components/admin/admin-shell"
import {
  VENDOR_PERFORMANCE,
  aiUsage,
  channelRevenue,
} from "@/components/admin/admin-reports-data"
import { usePractices } from "@/components/admin/practices-store"
import { ReportsView } from "@/components/provider/reports/reports"

/* The Super Admin's Reports: channel revenue, vendor performance and AI
   usage, across every practice. ?report= opens one, from a dashboard link. */
export function AdminReportsScreen() {
  const params = useSearchParams()
  const { practices } = usePractices()
  const reports = React.useMemo(() => {
    const live = practices.filter((p) => p.status === "Active")
    return [channelRevenue(live), VENDOR_PERFORMANCE, aiUsage(live)]
  }, [practices])
  return (
    <AdminShell active="reports">
      <ReportsView reports={reports} initialId={params.get("report")} />
    </AdminShell>
  )
}
