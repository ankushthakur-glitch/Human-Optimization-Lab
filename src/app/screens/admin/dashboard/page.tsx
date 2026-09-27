import type { Metadata } from "next"

import { ComingSoon } from "@/components/admin/coming-soon"

export const metadata: Metadata = { title: "Dashboard" }

export default function AdminDashboardScreen() {
  return (
    <ComingSoon
      active="dashboard"
      illustration="dashboard-soon"
      title="Dashboard coming soon"
      description="Enrollment and adoption across every practice will show here."
    />
  )
}
