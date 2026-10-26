import type { Metadata } from "next"

import { PracticeDashboardV1 } from "@/components/practice/dashboard-variants/v1"

export const metadata: Metadata = { title: "Dashboard" }

export default function Page() {
  return <PracticeDashboardV1 />
}
