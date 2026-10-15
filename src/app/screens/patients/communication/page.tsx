import type { Metadata } from "next"

import { CommunicationScreen } from "@/components/provider/communication/communication"

export const metadata: Metadata = { title: "Communication" }

export default function Page() {
  return <CommunicationScreen />
}
