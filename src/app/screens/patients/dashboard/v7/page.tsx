import type { Metadata } from "next"
import { Suspense } from "react"

import { DashboardWorkspace } from "@/components/provider/dashboard-variants/v7"
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
      <DashboardWorkspace />
    </Suspense>
  )
}
