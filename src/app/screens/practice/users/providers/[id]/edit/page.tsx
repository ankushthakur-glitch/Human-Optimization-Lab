import type { Metadata } from "next"

import { ProviderFormPage } from "@/components/practice/provider-record"

export const metadata: Metadata = { title: "Edit provider" }

export default async function EditProviderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProviderFormPage id={id} />
}
