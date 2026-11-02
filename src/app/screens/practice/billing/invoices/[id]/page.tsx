import type { Metadata } from "next"

import { PracticeInvoiceScreen } from "@/components/practice/billing/practice-billing"

export const metadata: Metadata = { title: "Invoice" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PracticeInvoiceScreen id={id} />
}
