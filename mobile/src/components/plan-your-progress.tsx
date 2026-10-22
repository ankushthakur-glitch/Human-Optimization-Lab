import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { BodyComposition, FatHeadline, WeightCard } from "@/app/progress"
import type { CheckInKind } from "@/components/check-in-sheet"
import { useOnboarding } from "@/lib/onboarding"
import { progress } from "@/lib/member"
import { space, type } from "@/lib/theme"

/* The Plan screen's "Your progress" tab (Journey_16 screen 39): the screen
   she shows other people. The headline first (the week, the pounds down
   since she started, the fat lost on DEXA), then her weight with the
   forecast, then her body composition. The forecast says it is an estimate. */

export function YourProgress({ onAdd }: { onAdd: (kind: CheckInKind) => void }) {
  const s = useOnboarding()
  const p = progress(s)
  return (
    <View style={styles.wrap}>
      <FatHeadline p={p} />
      <WeightCard p={p} onAdd={() => onAdd("weight")} />
      <BodyComposition p={p} />
      <Text style={type.meta}>{p.weight.forecast ? p.weight.forecast.caption : (p.weight.note ?? "")}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.section },
})
