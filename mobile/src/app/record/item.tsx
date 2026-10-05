import { useLocalSearchParams } from "expo-router"
import * as React from "react"

import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { ItemDetails, type ItemDetail } from "@/components/record-rows"

/* One record item's details (an allergy, a visit, a test, a report she
   added), opened from its list: only its own facts and where they come
   from (user, 5 Oct 2026). The item travels in the `d` param. */
export default function RecordItemScreen() {
  const { d } = useLocalSearchParams<{ d?: string }>()
  const item = React.useMemo(() => {
    try {
      return d ? (JSON.parse(d) as ItemDetail) : undefined
    } catch {
      return undefined
    }
  }, [d])
  if (!item) return <PageNotFoundState />
  return (
    <FlowScreen page title={item.title}>
      <ItemDetails item={item} />
    </FlowScreen>
  )
}
