import * as React from "react"

import { CareMember } from "@/components/care-member"
import { useV14Member } from "@/components/v14-kit"

/* The v14 catalog (deck screen 52), a dummy beside the member's Care tab:
   the page is components/care-member.tsx, opened as the paid member. */
export default function V14Care() {
  useV14Member()
  return <CareMember />
}
