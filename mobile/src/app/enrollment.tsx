import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import {
  BillingToggle,
  IncludedSheet,
  MoneyRow,
  PlanCard,
  firstMonth,
  priceNumber,
} from "@/components/enrollment-kit"
import { Check, Info } from "@/components/ph"
import { PlanStepPage } from "@/components/plan-steps"
import {
  BASELINE_TESTS,
  chosenTests,
  dollars,
  dollarsExact,
  toggleTest,
  type BaselineTest,
  type BaselineTestId,
} from "@/lib/baseline-tests"
import { useOnboarding } from "@/lib/onboarding"
import { YEARLY_TEST_DISCOUNT, type Cadence } from "@/lib/plans"
import { color, hairline, ink, space, type } from "@/lib/theme"

/* Step 3 of the plan's set-up, "Complete your enrollment" (Journey_7
   screen 6): opens after the tests her record is missing (/baseline). The
   Monthly or yearly (yearly the default, saving 10% and taking 10% off
   the tests), the plan named from her goals with its price and what it
   includes, then every baseline test with its icon and price, ticked as
   she left them on step 2, and what she pays today under them, with one
   quiet line on what paying the other way would cost.
   "Continue to payment" opens step 4 (/payment). */

/** The order the tests are listed in. */
const LIST: BaselineTestId[] = ["panel", "dexa", "rmr"]

export default function EnrollmentScreen() {
  const onboarding = useOnboarding()
  const billing = onboarding.billingPick ?? "yearly"
  const [included, setIncluded] = React.useState(false)
  const chosen = new Set(chosenTests(onboarding.baselinePicks).map((t) => t.id))
  const cost = firstMonth(onboarding.baselinePicks, billing)

  function pay(next: Cadence) {
    onboarding.save({ billingPick: next })
  }

  function toggle(test: BaselineTest) {
    onboarding.save({ baselinePicks: toggleTest(onboarding.baselinePicks, test.id) })
  }

  return (
    <PlanStepPage
      step={3}
      title="Complete your enrollment"
      onNext={() => router.push("/payment")}
      nextLabel="Continue to payment"
      nextWide
      overlay={included && <IncludedSheet onClose={() => setIncluded(false)} />}
    >
      <BillingToggle billing={billing} onChange={pay} />

      <View style={styles.plan}>
        <PlanCard
          goals={onboarding.goals}
          billing={billing}
          onIncluded={() => setIncluded(true)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.heading} accessibilityRole="header">
          Select your tests
        </Text>
        <View style={styles.card}>
          {LIST.map((id, i) => (
            <TestRow
              key={id}
              test={BASELINE_TESTS[id]}
              checked={chosen.has(id)}
              first={i === 0}
              onPress={() => toggle(BASELINE_TESTS[id])}
            />
          ))}
        </View>
      </View>

      <View style={[styles.card, styles.summary]}>
        <MoneyRow
          label={`${cost.tests.length} ${cost.tests.length === 1 ? "test" : "tests"} selected`}
          value={dollarsExact(cost.subtotal)}
        />
        <MoneyRow
          label={
            billing === "yearly"
              ? "Membership (12 months)"
              : "Membership (first month)"
          }
          value={dollars(cost.membership)}
        />
        {cost.discount > 0 && (
          <MoneyRow
            label={`Annual member discount, ${YEARLY_TEST_DISCOUNT}% off tests`}
            value={`−${dollarsExact(cost.discount)}`}
            good
          />
        )}
        <View style={styles.total}>
          <Text style={styles.totalLabel}>
            {billing === "yearly" ? "Total due today" : "First month total"}
          </Text>
          <Text style={styles.totalValue}>{dollarsExact(cost.total)}</Text>
        </View>
      </View>

      <View style={styles.note}>
        <Info size={14} color={ink.tertiary} />
        <Text style={styles.noteText}>
          {billing === "yearly"
            ? `Paying monthly instead is ${dollars(priceNumber("monthly"))} a month${cost.subtotal ? ` plus ${dollars(cost.subtotal)} of tests` : ""} — ${dollars(cost.monthlyToday)} today, and ${dollars(cost.yearlySaving)} more across the year.`
            : `Paying yearly instead is ${dollars(priceNumber("yearly"))} up front with ${YEARLY_TEST_DISCOUNT}% off your tests, and saves ${dollars(cost.yearlySaving)} across the year.`}
        </Text>
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

  plan: { marginTop: space.item },

  section: { gap: space.inline, marginTop: space.section },
  heading: { ...type.title, color: ink.strong },

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
  // The consent's checkbox at 20, as on step 2: one teal for every tick.
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

  // The sums in a white card; the total under a rule, the page's one big number.
  summary: {
    gap: space.inline,
    padding: space.gutter,
    marginTop: space.item,
  },
  total: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.stack,
    paddingTop: space.item,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: hairline.edge,
  },
  totalLabel: { ...type.section },
  totalValue: { ...type.hero, fontSize: 24, lineHeight: 30, fontVariant: ["tabular-nums"] },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.mark,
    marginTop: space.item,
  },
  noteText: { ...type.meta, flex: 1 },
})
