import type { Metadata } from "next"

import { HabitsScreen } from "@/components/patient-app/habits"

export const metadata: Metadata = { title: "Daily habits" }

export default function Page() {
  return <HabitsScreen />
}
