import type { Metadata } from "next"

import { PracticeShell } from "@/components/practice/practice-shell"
import { ImportSheetPage } from "@/components/settings/import-history"

export const metadata: Metadata = { title: "Import history" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <PracticeShell active="settings">
      <ImportSheetPage scope="practice" id={id} />
    </PracticeShell>
  )
}
