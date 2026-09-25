import type { Metadata } from "next"

import { ConsentScreen } from "@/components/patient-app/consent"

export const metadata: Metadata = { title: "Consent" }

export default function Page() {
  return <ConsentScreen />
}
