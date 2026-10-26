import type { Metadata } from "next"

import { ClinicalHome } from "@/components/clinical/clinical-console"

export const metadata: Metadata = { title: "Clinical content" }

export default function ClinicalScreen() {
  return <ClinicalHome />
}
