"use client"

import { useSearchParams } from "next/navigation"

import { PracticeShell } from "@/components/practice/practice-shell"
import { KPI_REPORTS } from "@/components/provider/reports/kpi-reports"
import { ReportsView } from "@/components/provider/reports/reports"

/** The clinic manager's Reports: the provider portal's screen and its
    Executive Health KPIs. ?report= opens one. */
export function PracticeReportsScreen() {
  const params = useSearchParams()
  const id = params.get("report")
  return (
    <PracticeShell active="reports">
      <ReportsView reports={KPI_REPORTS} initialId={id} />
    </PracticeShell>
  )
}
