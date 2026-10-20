import type { Metadata } from "next"

import { AdminSettingsPage } from "@/components/settings/admin-settings"

export const metadata: Metadata = { title: "Settings" }

export default async function Page({
  params,
}: {
  params: Promise<{ group: string; page: string }>
}) {
  const { group, page } = await params
  return <AdminSettingsPage group={group} page={page} />
}
