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
import { Switch } from "@/components/settings-rows"
import {
  ADD_ONS,
  BASELINE_TESTS,
  chosenAddOns,
  chosenTests,
  type AddOnId,
  dollars,
  dollarsExact,
  type BaselineTestId,
} from "@/lib/baseline-tests"
import { useOnboarding } from "@/lib/onboarding"
import { type Cadence } from "@/lib/plans"
import { card, color, hairline, ink, space, surface, type } from "@/lib/theme"

/* Step 3 of the plan's set-up, "Complete your enrollment" (Journey_7
   screen 6): opens after the tests her record is missing (/baseline). The
   Monthly or yearly (yearly the default, saving 10% and taking 10% off
   the tests), the plan named from her goals with its price and what it
   includes, then a summary of the tests she kept on
   step 2, each part with a switch to drop or restore it, grouped as there, with their prices, and in the same card what she pays today, with
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
type Part = { key: string; name: string; lines: Line[]; on: boolean; set: (on: boolean) => void }

export default function EnrollmentScreen() {
  const onboarding = useOnboarding()
  const billing = onboarding.billingPick ?? "yearly"
  const [included, setIncluded] = React.useState(false)
  const chosen = new Set(chosenTests(onboarding.baselinePicks).map((t) => t.id))
  const addOns = new Set<string>(chosenAddOns(onboarding.addOns).map((a) => a.id))
  const cost = firstMonth(onboarding.baselinePicks, billing, onboarding.addOns)

  // The parts she kept on step 2, fixed when the screen opens, so one she
  // switches off here stays listed and can come back on.
  const [kept] = React.useState(() => new Set<string>([...chosen, ...addOns]))

  function setTests(ids: BaselineTestId[], on: boolean) {
    const next = new Set<string>(chosen)
    for (const id of ids) {
      if (on) next.add(id)
      else next.delete(id)
    }
    const order: BaselineTestId[] = ["panel", "dexa", "rmr"]
    onboarding.save({ baselinePicks: order.filter((id) => next.has(id)) })
  }
  function setAddOn(id: AddOnId, on: boolean) {
    const next = new Set(addOns)
    if (on) next.add(id)
    else next.delete(id)
    onboarding.save({ addOns: (["sleep", "smart"] as AddOnId[]).filter((k) => next.has(k)) })
  }

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
  const metabolic = (["dexa", "rmr"] as BaselineTestId[]).filter((id) => kept.has(id))
  const parts: Part[] = [
    {
      key: "metabolic",
      name: "Metabolic & weight",
      lines: metabolic.map(line),
      on: metabolic.some((id) => chosen.has(id)),
      set: (on: boolean) => setTests(metabolic, on),
    },
    {
      key: "lipid",
      name: "Lipid & cardiovascular",
      lines: kept.has("panel") ? [line("panel")] : [],
      on: chosen.has("panel"),
      set: (on: boolean) => setTests(["panel"], on),
    },
    {
      key: "sleep",
      name: "Sleep restoration",
      lines: kept.has("sleep")
        ? [{ key: "sleep", name: ADD_ONS.sleep.name, says: "Two nights at home - you said you wake at three", price: ADD_ONS.sleep.price }]
        : [],
      on: addOns.has("sleep"),
      set: (on: boolean) => setAddOn("sleep", on),
    },
    {
      key: "smart",
      name: "SMART stress & resiliency",
      lines: kept.has("smart")
        ? [{ key: "smart", name: ADD_ONS.smart.name, says: "Benson-Henry Institute · 8 weeks", price: ADD_ONS.smart.price }]
        : [],
      on: addOns.has("smart"),
      set: (on: boolean) => setAddOn("smart", on),
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
              <Switch value={p.on} onChange={p.set} label={p.name} />
            </View>
            {p.lines.map((l, i) => (
              <View key={l.key} style={[styles.row, i > 0 && styles.rule, !p.on && styles.off]}>
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
    backgroundColor: surface.inset,
    borderBottomWidth: 1,
    borderBottomColor: hairline.edge,
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
  // A part she switched off: still listed, faded, not in the total.
  off: { opacity: 0.4 },
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
