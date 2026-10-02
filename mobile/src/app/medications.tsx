import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"

import { FlowScreen } from "@/components/flow"
import { MedicineConfirm } from "@/components/medicines"
import { EmptyState } from "@/components/record-kit"
import { useExperience } from "@/lib/experience"

/** Your medicines (FINAL-SPEC C.10): every list in one place, the ones that
    differ with a question each, answered in place and saved at once. Opened
    from Home's "Check 2 medicines" and Your medicines, To do and the Record
    tab; `?id=` (a medicine she tapped by name) lands on that medicine,
    scrolled into view and marked for a moment. Before anything is collected
    there is nothing to list, and it says when there will be. A clinical
    page: no offer and no object. */
export default function MedicationsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { experience } = useExperience()
  return (
    <FlowScreen page title="Your medicines">
      {experience === "declined" ? (
        <EmptyState title="Your medicines appear once your records are connected." action="Connect my records" onAction={() => router.push("/connect")} />
      ) : experience === "building" ? (
        <EmptyState title="Your medicines appear once your records arrive." />
      ) : (
        <MedicineConfirm focus={id} />
      )}
    </FlowScreen>
  )
}
