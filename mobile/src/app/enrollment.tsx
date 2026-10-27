import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import {
  BillingToggle,
  IncludedSheet,
  PlanCard,
  firstMonth,
} from "@/components/enrollment-kit"
import { CheckMark } from "@/components/flow"
import { PlanStepPage } from "@/components/plan-steps"
import { chosenAddOns, chosenTests, dollars, dollarsExact, OFFERED_ADD_ONS, toggleTest, type AddOnId, type BaselineTestId } from "@/lib/baseline-tests"
import { useOnboarding } from "@/lib/onboarding"
import { type Cadence } from "@/lib/plans"
import { card, color, hairline, ink, space, type } from "@/lib/theme"

/* Step 3 of the plan's set-up, "Complete your enrollment" (Journey_7
   screen 6): opens after the tests her numbers call for (/baseline).
   Monthly or yearly (yearly the default, saving 10% and taking 10% off
   the tests), the plan named from her goals with its price and what it
   includes, then (26 Oct 2026) the tests she ticked on /baseline, each
   with its checkbox and price; one cleared here stays listed, greyed with
   its price struck through. When to pay for the tests is chosen on
   /payment. The total over Continue follows the ticks. "Continue to payment" opens step 4
   (/payment). */

export default function EnrollmentScreen() {
  const onboarding = useOnboarding()
  const billing = onboarding.billingPick ?? "yearly"
  const [included, setIncluded] = React.useState(false)
  const cost = firstMonth(onboarding.baselinePicks, billing, onboarding.addOns)
  // The tests ticked on /baseline, held as she arrived so one cleared here
  // stays in the list to tick again.
  const [listed] = React.useState(() => [
    ...chosenTests(onboarding.baselinePicks).map((t) => ({ key: t.id as string, name: t.name, price: t.price })),
    ...chosenAddOns(onboarding.addOns).map((a) => ({ key: a.id as string, name: a.name, price: a.price })),
  ])
  const on = new Set<string>([...cost.tests.map((t) => t.id), ...cost.addOns.map((a) => a.id)])

  function flip(key: string) {
    if ((OFFERED_ADD_ONS as string[]).includes(key)) {
      const next = new Set(cost.addOns.map((a) => a.id as string))
      if (next.has(key)) next.delete(key)
      else next.add(key)
      onboarding.save({ addOns: OFFERED_ADD_ONS.filter((id: AddOnId) => next.has(id)) })
    } else {
      onboarding.save({ baselinePicks: toggleTest(onboarding.baselinePicks, key as BaselineTestId) })
    }
  }

  function pay(next: Cadence) {
    onboarding.save({ billingPick: next })
  }

  return (
    <PlanStepPage
      step={3}
      title="Complete your enrollment"
      onNext={() => router.push("/payment")}
      nextLabel="Continue to payment"
      nextWide
      overlay={included && <IncludedSheet onClose={() => setIncluded(false)} />}
      aboveFoot={
      <View style={styles.total}>
        <View style={styles.totalWords}>
          <Text style={styles.totalLabel}>
            {billing === "yearly" ? "Total due today" : "First month total"}
          </Text>
        </View>
        <Text style={styles.totalValue}>{dollarsExact(cost.total)}</Text>
      </View>
      }
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
          {`Your ${listed.length === 1 ? "test" : `${listed.length} tests`}`}
        </Text>
        <View style={styles.tests}>
          {listed.map((t, i) => {
            const checked = on.has(t.key)
            return (
              <Pressable
                key={t.key}
                onPress={() => flip(t.key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={`${t.name}, ${dollars(t.price)}`}
                style={({ pressed }) => [styles.test, i > 0 && styles.rule, pressed && styles.pressed]}
              >
                <CheckMark checked={checked} centered />
                <Text style={[styles.name, !checked && styles.dim]} numberOfLines={1}>
                  {t.name}
                </Text>
                <Text style={[styles.price, !checked && styles.dim, !checked && styles.struck]}>{dollars(t.price)}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    </PlanStepPage>
  )
}

const styles = StyleSheet.create({
  plan: { marginTop: space.inline },

  section: { gap: space.inline, marginTop: space.item },
  heading: { ...type.title, color: ink.strong },

  // The tests in one white card, a hairline between rows, as on /baseline.
  tests: {
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
    boxShadow: card.shadow,
  },
  test: { flexDirection: "row", alignItems: "center", gap: space.item, paddingVertical: space.rowY, paddingHorizontal: space.rowX },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  pressed: { opacity: 0.7 },
  name: { ...type.title, flex: 1, fontSize: 14, color: ink.strong },
  // Digits of one width, as in the totals.
  price: { ...type.value, fontVariant: ["tabular-nums"] },
  // A cleared test: quieter words, the price struck through.
  dim: { color: ink.tertiary },
  struck: { textDecorationLine: "line-through" },

  // The total, fixed over Continue on a deeper teal: the page's one big number.
  total: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.item,
    paddingVertical: space.inline,
    paddingHorizontal: space.rowX,
    borderWidth: 1,
    borderColor: color.primaryEdge,
    borderRadius: 12,
    backgroundColor: color.primarySoft,
  },
  totalWords: { flex: 1, gap: 2 },
  totalLabel: { ...type.title, fontSize: 14 },
  totalValue: { ...type.hero, fontSize: 18, lineHeight: 24, fontVariant: ["tabular-nums"] },
})
