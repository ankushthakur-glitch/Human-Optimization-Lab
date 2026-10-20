import { type Href, router } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { AgeCompare } from "@/components/age-compare"
import { FlowScreen } from "@/components/flow"
import { Group } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { biologicalAge } from "@/lib/biological-age"
import { space } from "@/lib/theme"

/* The record tour's fourth step, the second of the two hard screens agreed
   on the 16 Oct 2026 call: her biological age against her calendar age, on
   the age line and nothing else, laid out as "Trending the wrong way"
   before it: the round back button, the title and one line under it, then
   one white card. Next: "What is driving it?".
   The biological age is a sample until the model exists
   (lib/biological-age.ts); calendar age is real. */

const NEXT = "/onboarding/what-is-driving-it" as Href

export default function BiologicalAgeScreen() {
  const { calendar, biological } = React.useMemo(() => biologicalAge(), [])

  return (
    <FlowScreen
      hol
      title="Your biological age"
      description="Estimated from your own results."
      footer={<Button onPress={() => router.push(NEXT)}>What is driving it?</Button>}
    >
      <Group>
        <View style={styles.hero}>
          <AgeCompare calendar={calendar} biological={biological} />
        </View>
      </Group>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  hero: { padding: space.card, paddingVertical: space.gutter },
})
