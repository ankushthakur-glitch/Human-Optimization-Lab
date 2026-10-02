import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { keepTogether } from "@/components/care-gap"
import { FlowScreen, Section } from "@/components/flow"
import { IconCheck } from "@/components/icons"
import { List, ListRow } from "@/components/list"
import { SetupStepLabel } from "@/components/plan-account-pieces"
import { ChipRow } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { BASELINE } from "@/lib/program"
import { bookingsFor, startingTests, useSetupStep } from "@/lib/setup"
import { color, space, type } from "@/lib/theme"

/* Paid setup, step 4 (FINAL-SPEC C.27): Inlay checks what the plan needs
   measured against what the record already has, and books the rest. She
   picks a time for each; the times she picks are booked, so they show
   with her other tests in This week and To do. Each test's times are one
   choice, read out as radio buttons (C.0.9), and wrap so every opening
   stays in view. */

/** "Aug 14" in this year, "Aug 14, 2025" in another (C.0.5). */
const inYear = (date: string, now = new Date()) => date.replace(new RegExp(`, ${now.getFullYear()}$`), "")

export default function TestsScreen() {
  const onboarding = useOnboarding()
  const { label, finish } = useSetupStep("tests")
  // Openings from tomorrow, worked out once while she is on the step.
  const tests = React.useMemo(() => startingTests(), [])
  const [slots, setSlots] = React.useState<Record<string, string>>(() => {
    // A time she picked before stays picked while it is still open.
    const kept = onboarding.tests ?? {}
    return Object.fromEntries(tests.flatMap((t) => (t.slots.some((s) => s.words === kept[t.id]) ? [[t.id, kept[t.id]]] : [])))
  })
  const ready = tests.every((t) => slots[t.id])

  return (
    <FlowScreen
      back={false}
      title="Your starting tests"
      footer={
        <Button onPress={() => finish({ tests: slots, bookings: { ...onboarding.bookings, ...bookingsFor(slots, tests) } })} disabled={!ready}>
          {ready ? "Book these tests" : "Pick a time for each"}
        </Button>
      }
    >
      <SetupStepLabel>{label}</SetupStepLabel>

      <Section title="Already in your record">
        <List>
          {BASELINE.have.map((t) => (
            <ListRow key={t.name} icon={<IconCheck color={color.ok} size={18} />} title={t.name} meta={inYear(t.date)} />
          ))}
        </List>
      </Section>

      {tests.map((t) => (
        <Section key={t.id} title={t.name}>
          <View style={styles.test}>
            <View style={styles.words}>
              <Text style={styles.detail}>{keepTogether(t.detail)}</Text>
              <Text style={styles.where}>{t.where}</Text>
            </View>
            <ChipRow
              wrap
              label={`Pick a time for ${t.name}`}
              options={t.slots.map((s) => ({ value: s.words, label: s.words }))}
              value={slots[t.id]}
              onChange={(words) => setSlots((x) => ({ ...x, [t.id]: words }))}
            />
          </View>
        </Section>
      ))}
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  // What the test is and where, then its times.
  test: { gap: space.item },
  words: { gap: space.stack },
  detail: { ...type.body },
  where: { ...type.label },
})
