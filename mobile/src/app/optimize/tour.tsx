import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { keepTogether } from "@/components/care-gap"
import { FlowScreen, SoftOrb } from "@/components/flow"
import { SetupStepLabel } from "@/components/plan-account-pieces"
import { PrimaryButton } from "@/components/hol"
import { Card } from "@/components/record-kit"
import { TOUR_CARDS, useSetupStep } from "@/lib/setup"
import { color, font, ink, space, type } from "@/lib/theme"

/** Paid setup, the last step (FINAL-SPEC C.27): a short tour of how the
    plan works, then the plan goes to the doctor as a draft (version 1, or
    the next number after a rejoin) and she lands on the Plan tab. */
export default function TourScreen() {
  const { label, finish } = useSetupStep("tour")
  const [at, setAt] = React.useState(0)
  const card = TOUR_CARDS[at]
  const last = at === TOUR_CARDS.length - 1

  return (
    <FlowScreen
      page
      // Back steps through the cards, then leaves to the setup step before.
      onBack={at > 0 ? () => setAt((a) => a - 1) : undefined}
      title="How your plan works"
      bar={<SetupStepLabel>{label}</SetupStepLabel>}
      art={<SoftOrb size={150} orbit={last} />}
      footer={<PrimaryButton onPress={() => (last ? finish() : setAt((a) => a + 1))}>{last ? "Build my plan" : "Next"}</PrimaryButton>}
    >
      <Card style={styles.words}>
        <Text style={styles.title} accessibilityRole="header">
          {card.title}
        </Text>
        <Text style={styles.body}>{keepTogether(card.body)}</Text>
      </Card>
      <View style={styles.dots} accessibilityLabel={`${at + 1} of ${TOUR_CARDS.length}`}>
        {TOUR_CARDS.map((_, i) => (
          <View key={i} style={[styles.dot, i === at && styles.dotOn]} />
        ))}
      </View>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  words: { gap: space.stack, alignItems: "center" },
  title: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: ink.content, textAlign: "center" },
  body: { ...type.body, textAlign: "center" },
  dots: { flexDirection: "row", justifyContent: "center", gap: space.mark },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.border },
  dotOn: { width: 18, backgroundColor: color.primary },
})
