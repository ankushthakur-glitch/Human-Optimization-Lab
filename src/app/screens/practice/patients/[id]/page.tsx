import type { Metadata } from "next"

import { PatientProfile } from "@/components/practice/patient-record"

export const metadata: Metadata = { title: "Patient" }

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PatientProfile id={id} />
}
