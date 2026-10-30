import type { Metadata } from "next"

import { InvoiceScreen } from "@/components/admin/billing/billing"

export const metadata: Metadata = { title: "Invoice" }

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <InvoiceScreen id={id} />
}
