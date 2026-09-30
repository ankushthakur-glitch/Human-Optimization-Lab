import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Chip, FlowScreen, Section } from "@/components/flow"
import { IconCheck } from "@/components/icons"
import { List, ListRow } from "@/components/list"
import { Button } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { BASELINE } from "@/lib/program"
import { useSetupStep } from "@/lib/setup"
import { color, font } from "@/lib/theme"

/* Paid setup, step 4: Inlay checks what the plan needs measured against
   what the record already has, and books the rest. Pick a time for each. */

export default function TestsScreen() {
  const onboarding = useOnboarding()
  const { finish } = useSetupStep("tests")
  const [slots, setSlots] = React.useState<Record<string, string>>(onboarding.tests ?? {})
  const ready = BASELINE.missing.every((t) => slots[t.id])

  return (
    <FlowScreen
      back={false}
      title="Your starting tests"
      footer={
        <Button onPress={() => finish({ tests: slots })} disabled={!ready}>
          {ready ? "Book these tests" : "Pick a time for each"}
        </Button>
      }
    >
      <Section title="Already in your record">
        <List>
          {BASELINE.have.map((t) => (
            <ListRow key={t.name} icon={<IconCheck color={color.ok} size={18} />} title={t.name} meta={t.date} />
          ))}
        </List>
      </Section>

      {BASELINE.missing.map((t) => (
        <Section key={t.id} title={t.name}>
          <View style={styles.test}>
            <Text style={styles.detail}>{t.detail}</Text>
            <Text style={styles.where}>{t.where}</Text>
            <View style={styles.slots}>
              {t.slots.map((s) => (
                <Chip key={s} label={s} selected={slots[t.id] === s} onPress={() => setSlots((x) => ({ ...x, [t.id]: s }))} />
              ))}
            </View>
          </View>
        </Section>
      ))}
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  test: { gap: 6 },
  detail: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: color.text },
  where: { fontFamily: font.regular, fontSize: 13, color: color.muted },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
})
