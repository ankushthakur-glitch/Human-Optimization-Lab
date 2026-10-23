import { Redirect } from "expo-router"
import * as React from "react"

import { useV14Member } from "@/components/v14-kit"

/* The v14 catalog is the member's Care tab now (components/care-member.tsx):
   old /v14/care links open it as the paid member. */
export default function V14Care() {
  useV14Member()
  return <Redirect href="/care" />
}
