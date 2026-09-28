import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { LogoLoader } from "@/design-system/ui/logo-loader"

export const metadata: Metadata = { title: "Dashboard" }

/* The dashboard reads its region from ?region=, and a component that reads
   search params needs a Suspense boundary to prerender. */
export default function AdminDashboardScreen() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <LogoLoader kind="ripple" label="Loading dashboard" />
        </div>
      }
    >
      <AdminDashboard />
    </Suspense>
  )
}
