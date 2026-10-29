import type { Metadata } from "next"

import { ProviderShell } from "@/components/provider/provider-shell"
import { ImportSheetPage } from "@/components/settings/import-history"

export const metadata: Metadata = { title: "Import history" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <ProviderShell active="settings">
      <ImportSheetPage scope="provider" id={id} />
    </ProviderShell>
  )
}
