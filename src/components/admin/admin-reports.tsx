"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"

import { AdminShell } from "@/components/admin/admin-shell"
import { BILLING_REPORTS } from "@/components/admin/billing/billing-data"
import { usePractices } from "@/components/admin/practices-store"
import { PRACTICE_REPORTS } from "@/components/practice/practice-reports-data"
import { ReportsView } from "@/components/provider/reports/reports"

/* The Super Admin's Reports: every report in one place. The practice
   reports run across the platform, one row per practice, and the billing
   reports follow. ?report= opens one, from a dashboard link. */
export function AdminReportsScreen() {
  const params = useSearchParams()
  const { practices } = usePractices()
  const reports = React.useMemo(() => {
    const items = practices
      .filter((p) => p.status === "Active")
      .map((p) => ({ id: p.id, name: p.name }))
    return [
      ...PRACTICE_REPORTS.map((r) => ({
        ...r,
        group: "Practices",
        rows: { header: "Practice", items },
      })),
      ...BILLING_REPORTS,
    ]
  }, [practices])
  return (
    <AdminShell active="reports">
      <ReportsView reports={reports} initialId={params.get("report")} />
    </AdminShell>
  )
}
