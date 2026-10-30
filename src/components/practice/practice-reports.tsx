"use client"

import { useSearchParams } from "next/navigation"

import { PracticeShell } from "@/components/practice/practice-shell"
import { PRACTICE_REPORTS, REPORT_ALIASES } from "@/components/practice/practice-reports-data"
import { ReportsView } from "@/components/provider/reports/reports"

/** The clinic manager's Reports: the provider portal's screen with the
    practice's reports. ?report= opens one, from a dashboard link. */
export function PracticeReportsScreen() {
  const params = useSearchParams()
  const id = params.get("report")
  return (
    <PracticeShell active="reports">
      <ReportsView reports={PRACTICE_REPORTS} initialId={(id && REPORT_ALIASES[id]) || id} />
    </PracticeShell>
  )
}
