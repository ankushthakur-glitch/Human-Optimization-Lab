import type { Metadata } from "next"

import { ClinicalPage } from "@/components/clinical/clinical-console"

export const metadata: Metadata = { title: "Clinical content" }

export default async function Page({
  params,
}: {
  params: Promise<{ group: string; page: string }>
}) {
  const { group, page } = await params
  return <ClinicalPage group={group} page={page} />
}
