import type { Metadata } from "next"

import { PracticeDashboardV5 } from "@/components/practice/dashboard-variants/v5"

export const metadata: Metadata = { title: "Dashboard" }

export default function Page() {
  return <PracticeDashboardV5 />
}
