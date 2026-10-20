import type { Metadata } from "next"

import { PracticeSettingsPage } from "@/components/settings/practice-settings"

export const metadata: Metadata = { title: "Settings" }

export default async function Page({
  params,
}: {
  params: Promise<{ group: string; page: string }>
}) {
  const { group, page } = await params
  return <PracticeSettingsPage group={group} page={page} />
}
