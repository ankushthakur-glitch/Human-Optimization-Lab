import type { Metadata } from "next"

import { ProviderSettingsHome } from "@/components/settings/provider-settings"

export const metadata: Metadata = { title: "Settings" }

export default function ProviderSettingsScreen() {
  return <ProviderSettingsHome />
}
