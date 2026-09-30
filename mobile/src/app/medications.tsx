import * as React from "react"

import { FlowScreen } from "@/components/flow"
import { MedicineList } from "@/components/medicines"

/** Medicines, from the record: each list side by side, and the patient's
    answer for each. */
export default function MedicationsScreen() {
  return (
    <FlowScreen title="Your medicines">
      <MedicineList />
    </FlowScreen>
  )
}
