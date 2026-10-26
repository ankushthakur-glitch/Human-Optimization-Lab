import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import {
  BillingToggle,
  IncludedSheet,
  PlanCard,
  firstMonth,
} from "@/components/enrollment-kit"
import { Card as Option } from "@/components/flow"
import { PlanStepPage } from "@/components/plan-steps"
import { dollarsExact, type TestPay } from "@/lib/baseline-tests"
import { MEMBER } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { type Cadence } from "@/lib/plans"
import { color, ink, space, type } from "@/lib/theme"

/* Step 3 of the plan's set-up, "Complete your enrollment" (Journey_7
   screen 6): opens after the tests her numbers call for (/baseline).
   Monthly or yearly (yearly the default, saving 10% and taking 10% off
   the tests), the plan named from her goals with its price and what it
   includes, then (26 Oct 2026) when to pay for the tests: now, with any
   her insurance covers refunded after her physician sorts them, or after
   that review, only for the ones booked through Inlay. The total over
   Continue follows the choice. "Continue to payment" opens step 4
   (/payment). */

export default function EnrollmentScreen() {
  const onboarding = useOnboarding()
  const billing = onboarding.billingPick ?? "yearly"
  const testPay: TestPay = onboarding.testPay ?? "now"
  const [included, setIncluded] = React.useState(false)
  const cost = firstMonth(onboarding.baselinePicks, billing, onboarding.addOns, testPay)
  const count = cost.tests.length + cost.addOns.length

  function pay(next: Cadence) {
    onboarding.save({ billingPick: next })
  }

  const options: { key: TestPay; name: string; amount: string; says: string }[] = [
    {
      key: "now",
      name: "Pay now",
      amount: dollarsExact(cost.testsTotal),
      says: `Book as soon as ${MEMBER.doctorShort} has checked them. Anything your insurance covers is refunded.`,
    },
    {
      key: "later",
      name: "Pay after review",
      amount: "$0 today",
      says: `Pay only for the tests ${MEMBER.doctorShort} sends to Inlay. Nothing to refund.`,
    },
  ]

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
          {`When to pay for your ${count === 1 ? "test" : `${count} tests`}`}
        </Text>
        {options.map((o) => (
          <Option key={o.key} selected={testPay === o.key} onPress={() => onboarding.save({ testPay: o.key })}>
            <View style={styles.option}>
              <View style={styles.optionTop}>
                <Text style={styles.name}>{o.name}</Text>
                <Text style={styles.price}>{o.amount}</Text>
              </View>
              <Text style={styles.says}>{o.says}</Text>
            </View>
          </Option>
        ))}
      </View>
    </PlanStepPage>
  )
}

const styles = StyleSheet.create({
  plan: { marginTop: space.inline },

  section: { gap: space.inline, marginTop: space.item },
  heading: { ...type.title, color: ink.strong },

  option: { gap: space.mark },
  optionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item },
  name: { ...type.title, fontSize: 14, color: ink.strong },
  says: { ...type.label, fontSize: 12, lineHeight: 17, color: ink.secondary },
  // Digits of one width, as in the totals.
  price: { ...type.value, fontVariant: ["tabular-nums"] },

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
