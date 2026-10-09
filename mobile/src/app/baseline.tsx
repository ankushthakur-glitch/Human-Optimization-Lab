import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { Check, Info } from "@/components/ph"
import { PlanStepPage } from "@/components/plan-steps"
import { HUE } from "@/components/record-kit"
import { Sheet, SheetText } from "@/components/sheet"
import { Button } from "@/components/ui"
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
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* Step 4 of the plan's set-up, "Establish your baseline" (Journey_7 screen
   5): opens after her health profile is confirmed. The same standard three
   for every member, the blood panel, DEXA and RMR, and nothing more, so
   onboarding measures rather than sells. Each test carries its price, a
   checkbox (all ticked to start, any can be cleared) and a Why? button
   that opens what it is and why it matters. A note under them always
   says a skipped test falls back to standard averages, naming the test
   once one is cleared. Continue opens step 5
   (/enrollment), which breaks down what the ticked tests cost. */

export default function BaselineScreen() {
  const onboarding = useOnboarding()
  const [why, setWhy] = React.useState<BaselineTest | null>(null)
  const chosen = new Set(chosenTests(onboarding.baselinePicks).map((t) => t.id))
  const { total } = testCosts(onboarding.baselinePicks)
  const tests = Object.values(BASELINE_TESTS)
  const skipped = tests.filter((t) => !chosen.has(t.id))

  function toggle(id: BaselineTestId) {
    onboarding.save({ baselinePicks: toggleTest(onboarding.baselinePicks, id) })
  }

  return (
    <PlanStepPage
      step={4}
      title="Establish your baseline"
      lead="Three standard tests give your plan its starting point."
      onNext={() => router.push("/enrollment")}
      overlay={why && <WhySheet test={why} onClose={() => setWhy(null)} />}
    >
      <View style={styles.groups}>
        <View style={styles.group}>
          {tests.map((t) => (
            <TestCard
              key={t.id}
              test={t}
              checked={chosen.has(t.id)}
              onToggle={() => toggle(t.id)}
              onWhy={() => setWhy(t)}
            />
          ))}
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
        </View>
        <View style={styles.total}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{dollars(total)}</Text>
        </View>
      </View>
    </PlanStepPage>
  )
}

/** "the blood panel", "DEXA", "RMR": how the note names one test. */
const shortName = (t: BaselineTest) =>
  t.id === "panel" ? "the blood panel" : t.id === "dexa" ? "DEXA" : "RMR"

/** One test on its own card, compact: its checkbox, the name with Why?
    under it, the price at the right, all centred on one row. */
function TestCard({
  test,
  checked,
  onToggle,
  onWhy,
}: {
  test: BaselineTest
  checked: boolean
  onToggle: () => void
  onWhy: () => void
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${test.name}, ${dollars(test.price)}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked && <Check size={12} color={color.onPrimary} weight="bold" />}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {test.name}
        </Text>
        <Pressable
          onPress={onWhy}
          accessibilityRole="button"
          accessibilityLabel={`Why ${test.name}?`}
          hitSlop={8}
          style={({ pressed }) => [styles.why, pressed && styles.pressed]}
        >
          <Info size={14} color={ink.primary} />
          <Text style={styles.whyText}>Why?</Text>
        </Pressable>
      </View>
      <Text style={styles.price}>{dollars(test.price)}</Text>
    </Pressable>
  )
}

/** What the test is, then why it matters for her plan. */
function WhySheet({ test, onClose }: { test: BaselineTest; onClose: () => void }) {
  return (
    <Sheet title={test.name} onClose={onClose}>
      <View style={styles.whyPart}>
        <Text style={styles.whyHead}>What it is</Text>
        <SheetText>{test.what}</SheetText>
      </View>
      <View style={styles.whyPart}>
        <Text style={styles.whyHead}>Why it matters</Text>
        <SheetText>{test.why}</SheetText>
      </View>
      <Button onPress={onClose}>Done</Button>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  // One rhythm: 20 between the lead, the tests and the total; 8 between
  // the cards and to the note.
  groups: {
    gap: space.section,
    marginTop: space.mark,
    paddingBottom: space.inline,
  },
  group: { gap: space.inline },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    minHeight: 56,
    paddingVertical: space.inline + 2,
    paddingHorizontal: space.rowX,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  pressed: { opacity: 0.7 },
  body: { flex: 1, gap: space.line },
  name: { ...type.title, color: ink.strong },
  // Digits of one width, so the prices line up down the column.
  price: { ...type.value, fontVariant: ["tabular-nums"] },
  // A small teal link under the name, the tap target widened by hitSlop.
  why: { flexDirection: "row", alignItems: "center", gap: space.mark, alignSelf: "flex-start" },
  whyText: { ...type.action },
  whyPart: { gap: space.mark },
  whyHead: { ...type.title, color: ink.strong },
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
  total: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.line,
    // A divider above, closing off the tests.
    paddingTop: space.item,
    borderTopWidth: 1,
    borderTopColor: hairline.edge,
  },
  totalLabel: { ...type.section },
  totalValue: {
    fontFamily: font.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: ink.strong,
  },
})
