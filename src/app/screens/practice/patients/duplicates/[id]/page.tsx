import type { Metadata } from "next"

import { DuplicateReviewScreen } from "@/components/practice/duplicates"

export const metadata: Metadata = { title: "Review possible duplicate" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <DuplicateReviewScreen id={id} />
}
