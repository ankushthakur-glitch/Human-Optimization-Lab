import * as React from "react"

import { FlowScreen } from "@/components/flow"
import { MedicineList, useMedicinesLeft } from "@/components/medicines"
import { Button } from "@/components/ui"
import { useSetupStep } from "@/lib/setup"

/** Paid setup, step 2: every medicine and supplement confirmed before the
    plan is built, since the plan must not conflict with any of them. */
export default function SetupMedicinesScreen() {
  const { finish } = useSetupStep("medicines")
  const left = useMedicinesLeft()
  return (
    <FlowScreen
      back={false}
      title="Confirm your medicines and supplements"
      footer={
        <Button onPress={() => finish()} disabled={left > 0}>
          {left > 0 ? `${left} left to confirm` : "Continue"}
        </Button>
      }
    >
      <MedicineList />
    </FlowScreen>
  )
}
