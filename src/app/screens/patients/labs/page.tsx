import type { Metadata } from "next"

import { LabsScreen } from "@/components/provider/labs/labs"

export const metadata: Metadata = { title: "Labs" }

export default function Page() {
  return <LabsScreen />
}
