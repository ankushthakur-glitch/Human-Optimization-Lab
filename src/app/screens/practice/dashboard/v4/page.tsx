import type { Metadata } from "next"

import { PracticeDashboardV4 } from "@/components/practice/dashboard-variants/v4"

export const metadata: Metadata = { title: "Dashboard" }

export default function Page() {
  return <PracticeDashboardV4 />
}
