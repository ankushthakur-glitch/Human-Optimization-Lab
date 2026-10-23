import { Redirect, useLocalSearchParams } from "expo-router"
import * as React from "react"

import { useV14Member } from "@/components/v14-kit"

/* The v14 plan is the member's Plan tab now (PlanMember's live plan): old
   /v14/plan links open it, on the section they name, as the paid member. */
export default function V14Plan() {
  useV14Member()
  const { section } = useLocalSearchParams<{ section?: string }>()
  return <Redirect href={section ? { pathname: "/plan", params: { section } } : "/plan"} />
}
