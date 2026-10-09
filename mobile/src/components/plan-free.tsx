import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { PlanShowroom, ShowroomActions } from "@/components/plan-showroom"
import { Block, Card, Group, NeedsRow, TextAction } from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { useExperience } from "@/lib/experience"
import { useOnboarding } from "@/lib/onboarding"
import { space, type } from "@/lib/theme"

/* The Plan tab for everyone who is not a member (FINAL-SPEC C.14.1):
   honest about the plan (S-03); the step and why cards were removed (user,
   5 Oct 2026); then the showroom: what a plan would do for her, what
   it costs and what stays free. A place she opens herself, so it is never
   capped and never badged (S-04).

   States: readiness "Not ready" or "A little" keeps the showroom folded
   behind one quiet link; a cancelled member finds her past plans above it
   and the button reads "Start again", which opens the goals step
   (/goals) ahead of the checkout. */

export function PlanFree() {
  const onboarding = useOnboarding()
  const { readiness } = useExperience()
  // At low readiness the showroom waits behind "See what a plan includes".
  const [open, setOpen] = React.useState(false)

  const past = onboarding.planHistory ?? []
  const showroom = readiness !== "low" || open
  return (
    <TabScreen
      tab="plan"
      title="Upgrade"
      footer={showroom ? <ShowroomActions onStart={() => router.push("/goals")} /> : undefined}
    >
      {past.length > 0 && (
        <Block title="Your past plans">
          <Group>
            {past.map((v) => (
              <NeedsRow key={v.version} title={`Version ${v.version}`} meta={`Approved ${v.approved.replace(/,\s*\d{4}$/, "")}. Kept.`} />
            ))}
          </Group>
        </Block>
      )}
      {showroom ? (
        <PlanShowroom />
      ) : (
        <Card style={styles.ready}>
          <View style={styles.readyWords}>
            <Text style={styles.readyTitle}>When you're ready</Text>
            <Text style={styles.body}>A plan can build on your step, one change at a time. No rush.</Text>
          </View>
          <TextAction onPress={() => setOpen(true)} chevron>
            See what a plan includes
          </TextAction>
        </Card>
      )}
    </TabScreen>
  )
}

const styles = StyleSheet.create({
  body: { ...type.body },
  ready: { gap: space.inline },
  readyWords: { gap: space.stack },
  readyTitle: { ...type.section },
})
