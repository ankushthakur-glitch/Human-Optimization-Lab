import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import {
  IncludedSheet,
  MoneyRow,
  PlanCard,
  TotalBand,
  firstMonth,
} from "@/components/enrollment-kit"
import { Check } from "@/components/ph"
import { PlanStepPage } from "@/components/plan-steps"
import {
  BASELINE_TESTS,
  chosenTests,
  dollars,
  toggleTest,
  type BaselineTest,
} from "@/lib/baseline-tests"
import { useOnboarding } from "@/lib/onboarding"
import { color, hairline, ink, space, type } from "@/lib/theme"

/* Step 5 of the plan's set-up, "Complete your enrollment" (Journey_7
   screen 6): opens after the tests her record is missing (/baseline). The
   plan named from her goals with its price and what it includes, then
   every baseline test with its price, ticked as she left them on step 4,
   and the first month's total under them.
   "Continue to payment" opens step 6 (/payment). */

export default function EnrollmentScreen() {
  const onboarding = useOnboarding()
  const billing = onboarding.membership?.billing ?? "monthly"
  const [included, setIncluded] = React.useState(false)
  const chosen = new Set(chosenTests(onboarding.baselinePicks).map((t) => t.id))
  const cost = firstMonth(onboarding.baselinePicks, billing)

  function toggle(test: BaselineTest) {
    onboarding.save({ baselinePicks: toggleTest(onboarding.baselinePicks, test.id) })
  }

  return (
    <PlanStepPage
      step={5}
      title="Complete your enrollment"
      onNext={() => router.push("/payment")}
      nextLabel="Continue to payment"
      nextWide
      overlay={included && <IncludedSheet onClose={() => setIncluded(false)} />}
    >
      <PlanCard
        goals={onboarding.goals}
        billing={billing}
        onIncluded={() => setIncluded(true)}
      />

      <View style={styles.section}>
        <Text style={styles.heading} accessibilityRole="header">
          Select your tests
        </Text>
        <View style={styles.card}>
          {Object.values(BASELINE_TESTS).map((t, i) => (
            <TestRow
              key={t.id}
              test={t}
              checked={chosen.has(t.id)}
              first={i === 0}
              onPress={() => toggle(t)}
            />
          ))}
        </View>
      </View>

      <View style={[styles.card, styles.summary]}>
        <MoneyRow
          label={`${cost.tests.length} tests selected`}
          value={dollars(cost.subtotal)}
        />
        <MoneyRow
          label="Membership (first month)"
          value={dollars(cost.membership)}
        />
        <TotalBand total={cost.total} />
      </View>
    </PlanStepPage>
  )
}

/** One test: its box, the name and the price. */
function TestRow({
  test,
  checked,
  first,
  onPress,
}: {
  test: BaselineTest
  checked: boolean
  first: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${test.name}, ${dollars(test.price)}`}
      style={({ pressed }) => [
        styles.row,
        !first && styles.rule,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked && <Check size={12} color={color.onPrimary} weight="bold" />}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {test.name}
      </Text>
      <Text style={styles.price}>{dollars(test.price)}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  section: { gap: space.inline, marginTop: space.section },
  heading: { ...type.section },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    minHeight: 48,
    paddingVertical: space.inline,
    paddingHorizontal: space.rowX,
  },
  rule: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: hairline.rule,
  },
  name: { ...type.title, flex: 1, color: ink.strong },
  // Digits of one width, so the prices line up down the column.
  price: { ...type.value, fontVariant: ["tabular-nums"] },
  // The consent's checkbox at 20, as on step 4: one teal for every tick.
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#C6C6C8",
    backgroundColor: color.background,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: color.primary, borderColor: color.primary },

  summary: {
    gap: space.inline,
    paddingHorizontal: space.card,
    paddingTop: space.card,
    marginTop: space.item,
  },
})
