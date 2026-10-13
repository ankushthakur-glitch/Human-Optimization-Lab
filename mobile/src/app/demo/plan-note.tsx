import { StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { PlanNoteBanner, PlanNoteEquation } from "@/components/plan-note"
import { ink, space, type } from "@/lib/theme"

/* Review page, not a product screen: two designs for the closing note on
   "Your data insights". Both keep the deck's words and make "adjust your
   goals" a tap that returns to the goals screen. */
export default function PlanNoteOptions() {
  return (
    <FlowScreen page title="Closing note options">
      <View style={styles.gap}>
        <Text style={styles.label}>A · The equation</Text>
        <PlanNoteEquation />
        <Text style={styles.label}>B · The banner</Text>
        <PlanNoteBanner />
      </View>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  gap: { gap: space.item },
  label: { ...type.title, color: ink.secondary, marginTop: space.item },
})
