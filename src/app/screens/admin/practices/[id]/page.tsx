import type { Metadata } from "next"

import { PracticeDetails } from "@/components/admin/practice-details"

export const metadata: Metadata = { title: "Practice details" }

export default async function PracticeScreen({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams])
  return (
    <PracticeDetails
      id={id}
      tab={tab === "providers" || tab === "users" ? tab : "details"}
    />
  )
}
