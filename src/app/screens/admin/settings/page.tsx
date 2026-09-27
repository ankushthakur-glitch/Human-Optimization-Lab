import type { Metadata } from "next"

import { ComingSoon } from "@/components/admin/coming-soon"

export const metadata: Metadata = { title: "Settings" }

export default function AdminSettingsScreen() {
  return (
    <ComingSoon
      active="settings"
      illustration="settings-empty"
      title="Settings coming soon"
      description="Platform preferences for HOL will live here."
    />
  )
}
