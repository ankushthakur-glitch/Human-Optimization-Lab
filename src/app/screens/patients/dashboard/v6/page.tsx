import type { Metadata } from "next"
import { Suspense } from "react"

import { DashboardBriefing } from "@/components/provider/dashboard-variants/v6"
import { LogoLoader } from "@/design-system/ui/logo-loader"

export const metadata: Metadata = { title: "Dashboard" }

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <LogoLoader kind="ripple" label="Loading dashboard" />
        </div>
      }
    >
      <DashboardBriefing />
    </Suspense>
  )
}
