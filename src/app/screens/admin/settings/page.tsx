import type { Metadata } from "next"

import { AdminSettingsHome } from "@/components/settings/admin-settings"

export const metadata: Metadata = { title: "Settings" }

export default function AdminSettingsScreen() {
  return <AdminSettingsHome />
}
