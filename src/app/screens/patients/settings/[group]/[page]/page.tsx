import type { Metadata } from "next"

import { ProviderSettingsPage } from "@/components/settings/provider-settings"

export const metadata: Metadata = { title: "Settings" }

export default async function Page({
  params,
}: {
  params: Promise<{ group: string; page: string }>
}) {
  const { group, page } = await params
  return <ProviderSettingsPage group={group} page={page} />
}
