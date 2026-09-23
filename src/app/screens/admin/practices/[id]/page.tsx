import type { Metadata } from "next"

import { PracticeDetails } from "@/components/admin/practice-details"

export const metadata: Metadata = { title: "Practice details" }

export default async function PracticeScreen({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PracticeDetails id={id} />
}
