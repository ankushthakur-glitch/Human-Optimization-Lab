import type { Metadata } from "next"

import { PatientFormPage } from "@/components/practice/patient-record"

export const metadata: Metadata = { title: "Edit patient" }

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PatientFormPage id={id} />
}
