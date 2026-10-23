import type { Metadata } from "next"

import { PracticeDashboardScreen } from "@/components/practice/practice-dashboard"

export const metadata: Metadata = { title: "Dashboard" }

export default function Page() {
  return <PracticeDashboardScreen />
}
