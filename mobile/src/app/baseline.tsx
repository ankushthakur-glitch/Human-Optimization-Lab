import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { Check, Info } from "@/components/ph"
import { PlanStepPage } from "@/components/plan-steps"
import { HUE } from "@/components/record-kit"
import {
  BASELINE_TESTS,
  chosenTests,
  dollars,
  testCosts,
  toggleTest,
  type BaselineTest,
  type BaselineTestId,
} from "@/lib/baseline-tests"
import { useOnboarding } from "@/lib/onboarding"
import { color, font, hairline, ink, space, surface, type } from "@/lib/theme"

/* Step 2 of the plan's set-up, "Establish your baseline" (Journey_7 screen
   5): opens after her health profile is confirmed. The same standard three
   for every member, the blood panel, DEXA and RMR, and nothing more, so
   onboarding measures rather than sells. Each test carries its price, a
   checkbox (all ticked to start, any can be cleared) and a Why? button
   that opens what it is and why it matters. A note under them always
   says a skipped test falls back to standard averages, naming the test
   once one is cleared. Continue opens step 3
   (/enrollment), which breaks down what the ticked tests cost.

   Layout is the "Tinted selection" variation (artifact "Baseline Step
   Variations", 02): a ticked test fills with the brand teal tint and edge,
   a skipped one greys out with its price struck through, Why? opens the
   explanation under its own test, and the total sits in a soft teal box. */

export default function BaselineScreen() {
  const onboarding = useOnboarding()
  const [why, setWhy] = React.useState<BaselineTestId | null>(null)
  const chosen = new Set(chosenTests(onboarding.baselinePicks).map((t) => t.id))
  const { total } = testCosts(onboarding.baselinePicks)
  const tests = Object.values(BASELINE_TESTS)
  const skipped = tests.filter((t) => !chosen.has(t.id))

  function toggle(id: BaselineTestId) {
    onboarding.save({ baselinePicks: toggleTest(onboarding.baselinePicks, id) })
  }

  return (
    <PlanStepPage
      step={2}
      title="Establish your baseline"
      lead="Three standard tests give your plan its starting point."
      onNext={() => router.push("/enrollment")}
    >
      <View style={styles.groups}>
        <View style={styles.group}>
          {tests.map((t) => (
            <View key={t.id} style={styles.item}>
              <TestCard
                test={t}
                checked={chosen.has(t.id)}
                open={why === t.id}
                onToggle={() => toggle(t.id)}
                onWhy={() => setWhy(why === t.id ? null : t.id)}
              />
              {why === t.id && <WhyPanel test={t} />}
            </View>
          ))}
        </View>
        <View style={styles.note} accessibilityLiveRegion="polite">
          <Info size={16} color={HUE.blue.ink} />
          <Text style={styles.noteText}>
            {skipped.length === 0
              ? "These tests are needed to personalize your plan to you. If you skip one, your plan uses standard averages instead and may not fit you as closely."
              : skipped.length === 1
                ? `These tests are needed to personalize your plan to you. Without ${shortName(skipped[0])}, your plan uses standard averages instead and may not fit you as closely.`
                : "These tests are needed to personalize your plan to you. Without them, your plan uses standard averages instead and may not fit you as closely."}
          </Text>
        </View>
        <View style={styles.total}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue} accessibilityLiveRegion="polite">
            {dollars(total)}
          </Text>
        </View>
      </View>
    </PlanStepPage>
  )
}

/** "the blood panel", "DEXA", "RMR": how the note names one test. */
const shortName = (t: BaselineTest) =>
  t.id === "panel" ? "the blood panel" : t.id === "dexa" ? "DEXA" : "RMR"

/** One test on its own row: its checkbox, the name with Why? under it, the
    price at the right. Ticked rows take the teal tint; skipped rows grey
    out and strike the price. */
function TestCard({
  test,
  checked,
  open,
  onToggle,
  onWhy,
}: {
  test: BaselineTest
  checked: boolean
  open: boolean
  onToggle: () => void
  onWhy: () => void
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${test.name}, ${dollars(test.price)}`}
      style={({ pressed }) => [styles.card, checked && styles.cardOn, pressed && styles.pressed]}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked && <Check size={12} color={color.onPrimary} weight="bold" />}
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, !checked && styles.dim]} numberOfLines={1}>
          {test.name}
        </Text>
        <Pressable
          onPress={onWhy}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`Why ${test.name}?`}
          hitSlop={8}
          style={({ pressed }) => [styles.why, pressed && styles.pressed]}
        >
          <Info size={14} color={ink.primary} />
          <Text style={[styles.whyText, open && styles.whyTextOpen]}>Why?</Text>
        </Pressable>
      </View>
      <Text style={[styles.price, !checked && styles.dim, !checked && styles.struck]}>
        {dollars(test.price)}
      </Text>
    </Pressable>
  )
}

/** What the test is, then why it matters for her plan, under its row. */
function WhyPanel({ test }: { test: BaselineTest }) {
  return (
    <View style={styles.whyBox}>
      <View style={styles.whyPart}>
        <Text style={styles.whyHead}>What it is</Text>
        <Text style={styles.whyBody}>{test.what}</Text>
      </View>
      <View style={styles.whyPart}>
        <Text style={styles.whyHead}>Why it matters</Text>
        <Text style={styles.whyBody}>{test.why}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // One rhythm: 16 between the tests, the note and the total; 8 between
  // the test rows.
  groups: {
    gap: space.gutter,
    marginTop: space.mark,
    paddingBottom: space.inline,
  },
  group: { gap: space.inline },
  item: { gap: space.inline },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    padding: space.rowX,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  cardOn: { backgroundColor: color.primaryTint, borderColor: color.primaryEdge },
  pressed: { opacity: 0.7 },
  body: { flex: 1, gap: space.line },
  name: { ...type.title, color: ink.strong },
  // A skipped test: quieter words, the price struck through.
  dim: { color: ink.tertiary },
  struck: { textDecorationLine: "line-through" },
  // Digits of one width, so the prices line up down the column.
  price: { ...type.value, fontVariant: ["tabular-nums"] },
  // A small teal link under the name, the tap target widened by hitSlop.
  why: { flexDirection: "row", alignItems: "center", gap: space.mark, alignSelf: "flex-start" },
  whyText: { ...type.action },
  whyTextOpen: { textDecorationLine: "underline" },
  // The explanation under its own row, on the kit's inset surface.
  whyBox: {
    gap: space.inline,
    padding: space.rowX,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: surface.inset,
  },
  whyPart: { gap: space.line },
  whyHead: { ...type.title, fontSize: 13, color: ink.strong },
  whyBody: { ...type.body, fontSize: 13, lineHeight: 19 },
  // The consent's checkbox at 20: a grey edge, one teal for every tick.
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
  // Information, not a warning: the kit's light blue, never red.
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.inline,
    padding: space.rowX,
    borderRadius: 14,
    backgroundColor: HUE.blue.tint,
  },
  noteText: { ...type.label, flex: 1, fontSize: 13, lineHeight: 18, color: ink.detail },
  // The total in a soft teal box, no divider.
  total: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.item,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: color.primarySoft,
  },
  totalLabel: { ...type.section },
  totalValue: {
    fontFamily: font.semibold,
    fontSize: 16,
    lineHeight: 22,
    fontVariant: ["tabular-nums"],
    color: ink.strong,
  },
})
