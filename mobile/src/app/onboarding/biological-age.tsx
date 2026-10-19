import { type Href, router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { AgeCompare } from "@/components/age-compare"
import { Card, FlowScreen } from "@/components/flow"
import { ArrowRight } from "@/components/ph"
import { Button } from "@/components/ui"
import { biologicalAge } from "@/lib/biological-age"
import { hairline, ink, space, type } from "@/lib/theme"

/* The second of the two hard screens agreed on the 16 Oct 2026 call with
   Dr. Blanchard, after "These are trending the wrong way": her biological
   age against her calendar age. Kept to the one message: the gap in years.
   The patient moves on to "What is driving it?".
   The biological age is a labelled sample until the model exists
   (lib/biological-age.ts); calendar age is real. */

/** What is driving it, the next screen in the agreed flow. */
const NEXT = "/onboarding/what-is-driving-it" as Href

const years = (n: number) => `${n} ${n === 1 ? "year" : "years"}`

export default function BiologicalAgeScreen() {
  const age = React.useMemo(() => biologicalAge(), [])
  const { calendar, biological, gap } = age

  const headline = gap > 0 ? `${years(gap)} older` : gap < 0 ? `${years(-gap)} younger` : "The same age"

  return (
    <FlowScreen
      hol
      title="Your biological age"
      footer={
        <Button onPress={() => router.push(NEXT)} trailing={({ color }) => <ArrowRight size={18} color={color} weight="bold" />}>
          What is driving it?
        </Button>
      }
    >
      <Text style={styles.lede}>How your body is doing, estimated from your own results.</Text>

      <Card>
        <View style={styles.hero}>
          <AgeCompare calendar={calendar} biological={biological} />
          <View style={styles.verdict}>
            <Text style={styles.verdictHead} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
              {headline}
            </Text>
            {age.sample && (
              <Text style={styles.sample} maxFontSizeMultiplier={1.3}>
                Sample estimate for design review.
              </Text>
            )}
          </View>
        </View>
      </Card>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  lede: { ...type.body, marginTop: -space.inline },

  hero: { gap: space.section, paddingVertical: space.stack },
  verdict: { gap: space.stack, paddingTop: space.item, borderTopWidth: 0.8, borderTopColor: hairline.rule },
  verdictHead: { ...type.hero },
  sample: { ...type.meta, color: ink.tertiary },
})
