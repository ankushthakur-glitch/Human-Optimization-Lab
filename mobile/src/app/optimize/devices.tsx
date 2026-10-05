import * as React from "react"
import { Text } from "react-native"

import { keepTogether } from "@/components/care-gap"
import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { Watch } from "@/components/ph"
import { SetupStepLabel } from "@/components/plan-account-pieces"
import { HeadCard, headText } from "@/components/plan-tab-pieces"
import { Block, ChipRow, Group, HUE, NeedsRow, Tag } from "@/components/record-kit"
import { DEVICE_STATUS } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { FOOD_LOGGING } from "@/lib/program"
import { useSetupStep } from "@/lib/setup"

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
      page
      title="Connect a device"
      bar={<SetupStepLabel>{label}</SetupStepLabel>}
      footer={<PrimaryButton onPress={() => finish({ devices: [], foodLogging: food })}>Continue</PrimaryButton>}
    >
      <HeadCard>
        <Text style={headText.line}>{keepTogether("Devices arrive in a later update. Your plan works without one.")}</Text>
      </HeadCard>

      <Block title="Devices">
        <Group>
          {DEVICE_STATUS.map((d) => (
            <NeedsRow key={d.id} icon={<Watch size={16} color={HUE.teal.ink} />} title={d.name} meta={d.kind} right={<Tag tone="muted">{d.label}</Tag>} />
          ))}
        </Group>
      </Block>

      <Block title="Log food by">
        <ChipRow options={FOOD_CHOICES} value={food} onChange={setFood} />
      </Block>
    </FlowScreen>
  )
}

