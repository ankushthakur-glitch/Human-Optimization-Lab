import type { Metadata } from "next"

import { PracticeSettingsHome } from "@/components/settings/practice-settings"

export const metadata: Metadata = { title: "Settings" }

export default function PracticeSettingsScreen() {
  return <PracticeSettingsHome />
}
