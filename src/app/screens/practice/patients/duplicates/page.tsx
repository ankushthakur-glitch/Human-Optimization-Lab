import type { Metadata } from "next"

import { DuplicateQueueScreen } from "@/components/practice/duplicates"

export const metadata: Metadata = { title: "Possible duplicates" }

export default function Page() {
  return <DuplicateQueueScreen />
}
