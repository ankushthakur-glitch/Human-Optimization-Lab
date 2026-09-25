import type { Metadata } from "next"

import { MedicationsScreen } from "@/components/patient-app/medications"

export const metadata: Metadata = { title: "Medications" }

export default function Page() {
  return <MedicationsScreen />
}
