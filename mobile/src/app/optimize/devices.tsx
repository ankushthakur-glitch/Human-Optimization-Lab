import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Art } from "@/components/art"
import { keepTogether } from "@/components/care-gap"
import { FlowScreen, Section } from "@/components/flow"
import { List, ListRow } from "@/components/list"
import { SetupStepLabel } from "@/components/plan-account-pieces"
import { ChipRow, Tag } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { DEVICE_STATUS } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { FOOD_LOGGING } from "@/lib/program"
import { useSetupStep } from "@/lib/setup"
import { ink, space, type } from "@/lib/theme"

/* Paid setup, step 3 (FINAL-SPEC C.27, M-70): a watch, ring or scale, and
   how she would like to log food. Devices connect through Terra in a later
   update, so each is shown as coming, never as connected (A-33), and the
   plan runs on what she enters and logs meanwhile. Logging food by photo
   is chosen for her; she can pick another way. Nothing here holds her up. */

type FoodLogging = (typeof FOOD_LOGGING)[number]

/** The ways to log food, one to pick: the kit's single choice chips, read
    out as radio buttons in a group (C.0.9). */
const FOOD_CHOICES = FOOD_LOGGING.map((f) => ({ value: f, label: f }))

export default function DevicesScreen() {
  const onboarding = useOnboarding()
  const { label, finish } = useSetupStep("devices")
  // Her earlier choice while it is still offered, otherwise photo.
  const [food, setFood] = React.useState<FoodLogging>(() => FOOD_LOGGING.find((f) => f === onboarding.foodLogging) ?? FOOD_LOGGING[0])

  return (
    <FlowScreen
      back={false}
      title="Connect a device"
      art={<Art name="watch" size={96} />}
      footer={<Button onPress={() => finish({ devices: [], foodLogging: food })}>Continue</Button>}
    >
      <View style={styles.intro}>
        <SetupStepLabel centred>{label}</SetupStepLabel>
        <Text style={styles.line}>{keepTogether("Devices arrive in a later update. Your plan works without one.")}</Text>
      </View>

      <List>
        {DEVICE_STATUS.map((d) => (
          <ListRow
            key={d.id}
            title={d.name}
            meta={d.kind}
            right={
              <View style={styles.soon}>
                <Tag tone="muted">{d.label}</Tag>
              </View>
            }
          />
        ))}
      </List>

      <Section title="Log food by">
        <ChipRow options={FOOD_CHOICES} value={food} onChange={setFood} />
      </Section>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  // The count and the line read with the centred title above them.
  intro: { gap: space.item },
  // The line under a centred title, as the kit's empty state sets it.
  line: { ...type.body, color: ink.secondary, textAlign: "center" },
  // The tag sits level with the row's two lines, not on the first.
  soon: { alignSelf: "center" },
})
