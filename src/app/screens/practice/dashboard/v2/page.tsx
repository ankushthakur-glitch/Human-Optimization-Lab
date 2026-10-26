import type { Metadata } from "next"

import { PracticeDashboardV2 } from "@/components/practice/dashboard-variants/v2"

export const metadata: Metadata = { title: "Dashboard" }

export default function Page() {
  return <PracticeDashboardV2 />
}
