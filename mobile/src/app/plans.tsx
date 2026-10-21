import { router } from "expo-router"
import { StyleSheet, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { usePlanList } from "@/components/plan-match"
import { PlanShowroom, ShowroomActions } from "@/components/plan-showroom"
import { Button } from "@/components/ui"
import { planFor, useExperience } from "@/lib/experience"

/* The plan page (FINAL-SPEC C.14.2): where every offer in the app leads,
   pushed over the screen she was on (a marker, the assistant, Profile), so
   the swipe back returns her there. The same showroom as the free Plan
   tab, told the same way, with "Start my optimization plan" pinned to
   the foot; the checkout sheet opens over the page. `?from=` says
   where she came from and sets the first line ("You were looking at your
   A1c...") and the focus row it highlights. */

export default function PlansScreen() {
  const info = useExperience()
  const list = usePlanList()

  const member = planFor(info) === "member"
  // A member already has her plan; the page only describes it.
  const footer = member ? (
    <Button onPress={() => router.push("/goal-plans")}>Start My Optimization Plan</Button>
  ) : (
    <ShowroomActions onStart={() => router.push("/goal-plans")} />
  )

  return (
    <View style={styles.fill}>
      <FlowScreen page title="Upgrade plan" footer={footer}>
        <PlanShowroom onSeeAll={list.show} />
      </FlowScreen>
      {list.sheet}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
