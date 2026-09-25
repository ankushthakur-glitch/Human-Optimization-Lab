import type { Metadata } from "next"

import { ProviderAdoptionScreen } from "@/components/admin/provider-adoption"

export const metadata: Metadata = { title: "Provider" }

export default async function ProviderScreen({
  params,
}: {
  params: Promise<{ id: string; providerId: string }>
}) {
  const { id, providerId } = await params
  return <ProviderAdoptionScreen practiceId={id} providerId={providerId} />
}
