import type { Metadata } from "next"

import { LocationFormPage } from "@/components/practice/location-record"

export const metadata: Metadata = { title: "Edit location" }

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <LocationFormPage id={id} />
}
