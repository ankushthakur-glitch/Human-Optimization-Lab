import { router, useLocalSearchParams } from "expo-router"
import { StyleSheet, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { PlanShowroom, ShowroomActions } from "@/components/plan-showroom"
import { EmptyState } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { planFor, useExperience } from "@/lib/experience"

/* The plan page (FINAL-SPEC C.14.2): where every offer in the app leads,
   pushed over the screen she was on (a marker, the assistant, Profile), so
   the swipe back returns her there. The same showroom as the free Plan
   tab, told the same way, with "Build my personalized plan" pinned to
   the foot; the checkout sheet opens over the page. `?from=` says
   where she came from and sets the first line ("You were looking at your
   A1c...") and the focus row it highlights. */

export default function PlansScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>()
  const info = useExperience()

  const member = planFor(info) === "member"
  const waiting = info.experience === "declined" || info.experience === "building"

  // A member already has her plan; the page only describes it.
  const footer = waiting ? undefined : member ? (
    <Button onPress={() => router.push("/plan")}>See your plan</Button>
  ) : (
    <ShowroomActions mode="page" from={from} onStart={() => router.push("/optimize/goals")} />
  )

  return (
    <View style={styles.fill}>
      <FlowScreen page title="A plan built around you" footer={footer}>
        {waiting ? <EmptyState title="Your plan options appear once your record is ready." /> : <PlanShowroom mode="page" from={from} onStart={() => router.push("/optimize/goals")} />}
      </FlowScreen>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
