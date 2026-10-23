"use client"

import { useSearchParams } from "next/navigation"

import { PracticeShell } from "@/components/practice/practice-shell"
import { PRACTICE_REPORTS } from "@/components/practice/practice-reports-data"
import { ReportsView } from "@/components/provider/reports/reports"

/** The clinic manager's Reports: the provider portal's screen with the
    practice's reports. ?report= opens one, from a dashboard link. */
export function PracticeReportsScreen() {
  const params = useSearchParams()
  return (
    <PracticeShell active="reports">
      <ReportsView reports={PRACTICE_REPORTS} initialId={params.get("report")} />
    </PracticeShell>
  )
}
