import type { Metadata } from "next"

import { LocationProfile } from "@/components/practice/location-record"

export const metadata: Metadata = { title: "Location" }

export default async function LocationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <LocationProfile id={id} />
}
