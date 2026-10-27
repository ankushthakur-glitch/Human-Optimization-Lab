import type { Metadata } from "next"
import { Suspense } from "react"

import { PracticeDashboardScreen } from "@/components/practice/practice-dashboard"

export const metadata: Metadata = { title: "Dashboard" }

export default function Page() {
  return (
    <Suspense>
      <PracticeDashboardScreen />
    </Suspense>
  )
}
