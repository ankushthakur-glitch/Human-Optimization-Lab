import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { FlowScreen, SoftOrb } from "@/components/flow"
import { Button } from "@/components/ui"
import { TOUR } from "@/lib/program"
import { useSetupStep } from "@/lib/setup"
import { color, font } from "@/lib/theme"

/** Paid setup, the last step: a short tour of how the plan works, then
    the plan goes to the doctor as a draft. */
export default function TourScreen() {
  const { finish } = useSetupStep("tour")
  const [at, setAt] = React.useState(0)
  const card = TOUR[at]
  const last = at === TOUR.length - 1

  return (
    <FlowScreen
      onBack={at > 0 ? () => setAt((a) => a - 1) : undefined}
      back={at > 0}
      title={card.title}
      art={<SoftOrb size={150} orbit={last} />}
      footer={<Button onPress={() => (last ? finish() : setAt((a) => a + 1))}>{last ? "Build my plan" : "Next"}</Button>}
    >
      <Text style={styles.body}>{card.body}</Text>
      <View style={styles.dots} accessibilityLabel={`${at + 1} of ${TOUR.length}`}>
        {TOUR.map((_, i) => (
          <View key={i} style={[styles.dot, i === at && styles.dotOn]} />
        ))}
      </View>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  body: { fontFamily: font.regular, fontSize: 17, lineHeight: 25, color: color.text, textAlign: "center", marginTop: -12 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.border },
  dotOn: { width: 18, backgroundColor: color.primary },
})
