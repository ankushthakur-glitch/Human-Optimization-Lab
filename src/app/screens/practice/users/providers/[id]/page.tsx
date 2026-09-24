import type { Metadata } from "next"

import { ProviderProfile } from "@/components/practice/provider-record"

export const metadata: Metadata = { title: "Provider" }

export default async function ProviderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProviderProfile id={id} />
}
