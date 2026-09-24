import type { Metadata } from "next"

import { ProviderFormPage } from "@/components/practice/provider-record"

export const metadata: Metadata = { title: "Add provider" }

export default function AddProviderPage() {
  return <ProviderFormPage />
}
