import type { Metadata } from "next"

import { ReportsScreen } from "@/components/provider/reports/reports"

export const metadata: Metadata = { title: "Reports" }

export default function Page() {
  return <ReportsScreen />
}
