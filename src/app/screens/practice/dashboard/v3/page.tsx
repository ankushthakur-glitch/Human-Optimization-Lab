import type { Metadata } from "next"
import { Suspense } from "react"

import { PracticeDashboardV3 } from "@/components/practice/dashboard-variants/v3"

export const metadata: Metadata = { title: "Dashboard" }

/* The variation reads its view from the search params, which needs a
   Suspense boundary to prerender. */
export default function Page() {
  return (
    <Suspense>
      <PracticeDashboardV3 />
    </Suspense>
  )
}
