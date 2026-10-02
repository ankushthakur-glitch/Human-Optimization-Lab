import * as React from "react"
import { StyleSheet, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { MedicineConfirm } from "@/components/medicines"
import { SetupStepLabel } from "@/components/plan-account-pieces"
import { TextAction } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { useSetupStep } from "@/lib/setup"

/** Paid setup, step 2 (FINAL-SPEC C.27): her medicines, confirmed before
    the plan is built, since the plan must fit around every one of them.
    Where her lists differ she says what she actually takes (the same
    questions as Your medicines; Dr. Patel settles any difference), and
    "Continue" opens once each has an answer. "Skip for now" goes on
    without them; they stay on her To do list (A-24). */
export default function SetupMedicinesScreen() {
  const { label, finish } = useSetupStep("medicines")
  const [answered, setAnswered] = React.useState(false)
  return (
    <FlowScreen
      back={false}
      title="Confirm your medicines"
      footer={
        <>
          <Button onPress={() => finish()} disabled={!answered}>
            Continue
          </Button>
          {!answered && (
            <View style={styles.quiet}>
              <TextAction tone="muted" onPress={() => finish()}>
                Skip for now
              </TextAction>
            </View>
          )}
        </>
      }
    >
      <SetupStepLabel>{label}</SetupStepLabel>
      <MedicineConfirm compact onAnswered={() => setAnswered(true)} />
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  quiet: { alignItems: "center" },
})
