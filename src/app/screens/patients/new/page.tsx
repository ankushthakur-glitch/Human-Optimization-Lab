import type { Metadata } from "next"

import { PatientFormPage } from "@/components/practice/patient-record"

export const metadata: Metadata = { title: "Add patient" }

export default function AddPatientPage() {
  return <PatientFormPage />
}
