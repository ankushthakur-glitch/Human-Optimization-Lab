import type { Metadata } from "next"

import { LocationFormPage } from "@/components/practice/location-record"

export const metadata: Metadata = { title: "Add location" }

export default function AddLocationPage() {
  return <LocationFormPage />
}
