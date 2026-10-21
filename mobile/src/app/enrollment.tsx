import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import {
  BillingToggle,
  IncludedSheet,
  PlanCard,
  firstMonth,
} from "@/components/enrollment-kit"
import { PlanStepPage } from "@/components/plan-steps"
import {
  ADD_ONS,
  BASELINE_TESTS,
  chosenAddOns,
  chosenTests,
  dollars,
  dollarsExact,
  type BaselineTestId,
} from "@/lib/baseline-tests"
import { useOnboarding } from "@/lib/onboarding"
import { type Cadence } from "@/lib/plans"
import { card, color, hairline, ink, space, type } from "@/lib/theme"

/* Step 3 of the plan's set-up, "Complete your enrollment" (Journey_7
   screen 6): opens after the tests her record is missing (/baseline). The
   Monthly or yearly (yearly the default, saving 10% and taking 10% off
   the tests), the plan named from her goals with its price and what it
   includes, then a read-only summary of the tests she kept on
   step 2, grouped as there, with their prices, and in the same card what she pays today, with
   the tests and membership that make it up in one line under it. All on
   one screen, no scrolling.
   "Continue to payment" opens step 4 (/payment). */

/** What each test tells her, as on step 2. */
const SAYS: Record<BaselineTestId, string> = {
  dexa: "Separates fat from lean mass",
  rmr: "No metabolic rate on file",
  panel: "Also covers triglycerides and insulin",
}

type Line = { key: string; name: string; says: string; price: number }
type Part = { key: string; name: string; lines: Line[] }

export default function EnrollmentScreen() {
  const onboarding = useOnboarding()
  const billing = onboarding.billingPick ?? "yearly"
  const [included, setIncluded] = React.useState(false)
  const chosen = new Set(chosenTests(onboarding.baselinePicks).map((t) => t.id))
  const addOns = new Set<string>(chosenAddOns(onboarding.addOns).map((a) => a.id))
  const cost = firstMonth(onboarding.baselinePicks, billing, onboarding.addOns)

  function pay(next: Cadence) {
    onboarding.save({ billingPick: next })
  }

  const line = (id: BaselineTestId): Line => ({
    key: id,
    name: BASELINE_TESTS[id].name,
    says: SAYS[id],
    price: BASELINE_TESTS[id].price,
  })
  // The parts of the plan she kept on step 2, as that screen grouped them.
  const parts: Part[] = [
    { key: "metabolic", name: "Metabolic & weight", lines: (["dexa", "rmr"] as BaselineTestId[]).filter((id) => chosen.has(id)).map(line) },
    { key: "lipid", name: "Lipid & cardiovascular", lines: chosen.has("panel") ? [line("panel")] : [] },
    {
      key: "sleep",
      name: "Sleep restoration",
      lines: addOns.has("sleep")
        ? [{ key: "sleep", name: ADD_ONS.sleep.name, says: "Two nights at home", price: ADD_ONS.sleep.price }]
        : [],
    },
    {
      key: "smart",
      name: "SMART stress & resiliency",
      lines: addOns.has("smart")
        ? [{ key: "smart", name: ADD_ONS.smart.name, says: "Benson-Henry Institute · 8 weeks", price: ADD_ONS.smart.price }]
        : [],
    },
  ].filter((p) => p.lines.length > 0)

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
          Your plan summary
        </Text>
        {parts.map((p) => (
          <View key={p.key} style={styles.group}>
            <View style={styles.head}>
              <Text style={styles.groupName}>{p.name}</Text>
              <Text style={styles.tag}>{p.lines.length === 1 ? "1 test" : `${p.lines.length} tests`}</Text>
            </View>
            {p.lines.map((l, i) => (
              <View key={l.key} style={[styles.row, i > 0 && styles.rule]}>
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={1}>
                    {l.name}
                  </Text>
                  <Text style={styles.says}>{l.says}</Text>
                </View>
                <Text style={styles.price}>{dollars(l.price)}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </PlanStepPage>
  )
}

const styles = StyleSheet.create({
  plan: { marginTop: space.inline },

  section: { gap: space.inline, marginTop: space.item },
  heading: { ...type.title, color: ink.strong },

  group: {
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
    boxShadow: card.shadow,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inline,
    paddingVertical: space.inline,
    paddingHorizontal: space.rowX,
    backgroundColor: color.primarySoft,
    borderBottomWidth: 1,
    borderBottomColor: color.primaryEdge,
  },
  groupName: { ...type.title, flex: 1, fontSize: 13, color: ink.strong },
  tag: { ...type.label, fontSize: 12, color: ink.secondary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    paddingVertical: space.rowY,
    paddingHorizontal: space.rowX,
  },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  body: { flex: 1, gap: 2 },
  name: { ...type.title, fontSize: 14, color: ink.strong },
  says: { ...type.label, fontSize: 12, color: ink.secondary },
  // Digits of one width, so the prices line up down the column.
  price: { ...type.value, fontVariant: ["tabular-nums"] },

  // The total, fixed over Continue on a deeper teal: the page's one big number.
  total: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.item,
    paddingVertical: space.item,
    paddingHorizontal: space.rowX,
    borderWidth: 1,
    borderColor: color.primaryEdge,
    borderRadius: 14,
    backgroundColor: color.primarySoft,
  },
  totalWords: { flex: 1, gap: 2 },
  totalLabel: { ...type.section },
  totalValue: { ...type.hero, fontSize: 24, lineHeight: 30, fontVariant: ["tabular-nums"] },
})
