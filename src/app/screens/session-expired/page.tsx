import type { Metadata } from "next"

import { SessionExpiredState } from "@/components/error-state"

export const metadata: Metadata = { title: "Session expired" }

/** Where the app shell's idle timer lands; see SessionTimeout. */
export default function SessionExpiredScreen() {
  return <SessionExpiredState />
}
