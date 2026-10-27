import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { CheckMark } from "@/components/flow"
import { Info } from "@/components/ph"
import { usePlanMatches } from "@/components/plan-match"
import { PlanStepPage } from "@/components/plan-steps"
import { Sheet } from "@/components/sheet"
import { ADD_ONS, BASELINE_TESTS, chosenAddOns, chosenTests, dollars, type AddOnId, type BaselineTestId, type Coverage } from "@/lib/baseline-tests"
import { useOnboarding } from "@/lib/onboarding"
import { card, color, font, hairline, ink, space, type } from "@/lib/theme"

/* Step 2 of the plan's set-up, "What your baseline needs" (26 Oct 2026):
   the tests her numbers call for, not tests tied to a plan. One plain
   list, no grouping; each test has its own checkbox, says the number it was
   picked for. A
   test she clears greys out with its price struck through. The (i) beside
   a test opens what it is and why it matters in a bottom sheet. A note
   says her physician sorts the tests into insurance or Inlay before she
   books. Continue opens step 3
   (/enrollment). The blood panel, DEXA and RMR are kept in the onboarding
   picks, the sleep study in the add-ons; enrollment and payment charge
   from both. */

type Info = { what: string; why: string }

type Item = {
  key: BaselineTestId | AddOnId
  name: string
  says: string
  price: number
  info: Info
  insurance?: Coverage
}

const SLEEP: Info = {
  what: "A home sleep test worn for two nights. It tracks your breathing, oxygen and sleep stages while you sleep in your own bed.",
  why: "You told us you wake at three. This shows whether something like disrupted breathing is behind it, so your plan can target the cause.",
}

const TEST_ITEM = (id: BaselineTestId, says: string): Item => ({
  key: id,
  name: BASELINE_TESTS[id].name,
  says,
  price: BASELINE_TESTS[id].price,
  info: { what: BASELINE_TESTS[id].what, why: BASELINE_TESTS[id].why },
  insurance: BASELINE_TESTS[id].insurance,
})

/** "LDL 162", from "Matched on LDL 162 · up 34 since Apr 2022". */
const valueOf = (matchedOn: string) => matchedOn.replace(/^Matched on /, "").split(" · ")[0]

/** The same mid-sentence: "triglycerides 188", while "LDL 162" keeps its capitals. */
const inSentence = (value: string) => (/^[A-Z][a-z]/.test(value) ? value.charAt(0).toLowerCase() + value.slice(1) : value)

export default function BaselineScreen() {
  const onboarding = useOnboarding()
  const { matches } = usePlanMatches()
  const [open, setOpen] = React.useState<string | null>(null)

  const picks = new Set<string>(chosenTests(onboarding.baselinePicks).map((t) => t.id))
  const addOns = new Set<string>(chosenAddOns(onboarding.addOns).map((a) => a.id))
  const on = (key: string) => picks.has(key) || addOns.has(key)

  function flip(key: Item["key"]) {
    if (key in BASELINE_TESTS) {
      const next = new Set(picks)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      const order: BaselineTestId[] = ["panel", "dexa", "rmr"]
      onboarding.save({ baselinePicks: order.filter((id) => next.has(id)) })
    } else {
      const next = new Set(addOns)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      onboarding.save({ addOns: (["sleep", "smart"] as AddOnId[]).filter((k) => next.has(k)) })
    }
  }

  // Each test names the numbers it was picked for, when her record has them.
  const blood = matches.filter((m) => m.kind === "lipid" || m.kind === "insulin").map((m, i) => (i ? inSentence(valueOf(m.matchedOn)) : valueOf(m.matchedOn)))
  const weight = matches.find((m) => m.kind === "metabolic")
  const items: Item[] = [
    TEST_ITEM("panel", blood.length ? `${blood.join(" and ")}, also covers insulin` : "Sets your starting values"),
    TEST_ITEM("dexa", weight ? `${valueOf(weight.matchedOn)}, separates fat from lean mass` : "Separates fat from lean mass"),
    TEST_ITEM("rmr", "No metabolic rate on file"),
    { key: "sleep", name: ADD_ONS.sleep.name, says: "Two nights at home, you said you wake at three", price: ADD_ONS.sleep.price, info: SLEEP, insurance: ADD_ONS.sleep.insurance },
  ]

  const openItem = items.find((i) => i.key === open)
  const ticked = items.filter((i) => on(i.key))

  return (
    <PlanStepPage
      step={2}
      title="What your baseline needs"
      lead="Picked from your numbers. We test these again later to show your progress."
      onNext={() => router.push("/enrollment")}
      nextDisabled={ticked.length === 0}
      overlay={
        openItem && (
          <Sheet title={openItem.name} onClose={() => setOpen(null)}>
            <View style={styles.whyPart}>
              <Text style={styles.whyHead}>What it is</Text>
              <Text style={styles.whyBody}>{openItem.info.what}</Text>
            </View>
            <View style={styles.whyPart}>
              <Text style={styles.whyHead}>Why it matters</Text>
              <Text style={styles.whyBody}>{openItem.info.why}</Text>
            </View>
          </Sheet>
        )
      }
    >
      <View style={styles.groups}>
        <Text style={styles.sectionHead}>ALREADY IN YOUR RECORD</Text>
        <View style={[styles.group, styles.record]}>
          <View style={styles.body}>
            <Text style={styles.recordName}>{BASELINE_TESTS.panel.name}</Text>
            <Text style={styles.says}>Drawn 12 days ago, in your record</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>No charge</Text>
          </View>
        </View>
        <View style={styles.group}>
          {items.map((item, i) => {
            const checked = on(item.key)
            return (
              <Pressable
                key={item.key}
                onPress={() => flip(item.key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={`${item.name}, ${dollars(item.price)}. ${item.says}`}
                style={({ pressed }) => [styles.item, i > 0 && styles.rule, pressed && styles.pressed]}
              >
                <CheckMark checked={checked} centered />
                <View style={styles.body}>
                  {/* The info button sits right after the test's name. */}
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, !checked && styles.dim]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Pressable
                      onPress={() => setOpen(item.key)}
                      accessibilityRole="button"
                      accessibilityLabel={`About ${item.name}`}
                      hitSlop={8}
                      style={({ pressed }) => [styles.more, pressed && styles.pressed]}
                    >
                      <Info size={14} color={ink.primary} />
                    </Pressable>
                  </View>
                  <Text style={[styles.says, !checked && styles.dim]}>{item.says}</Text>
                </View>
                <Text style={[styles.price, !checked && styles.dim, !checked && styles.struck]}>{dollars(item.price)}</Text>
              </Pressable>
            )
          })}
        </View>
        <View style={styles.note}>
          <Info size={16} color={ink.secondary} />
          <Text style={styles.noteText}>
            <Text style={styles.noteBold}>All tests are cash pay. </Text>
            We reuse what is already in your record: blood work from the last 30 days, other tests from the last 6 months.
          </Text>
        </View>
      </View>
    </PlanStepPage>
  )
}

const styles = StyleSheet.create({
  groups: { gap: space.inline, marginTop: space.mark, paddingBottom: space.inline },
  // One white card holding every test, a hairline between rows.
  group: {
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
    boxShadow: card.shadow,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    paddingVertical: space.rowY,
    paddingHorizontal: space.rowX,
  },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  body: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: space.mark },
  name: { ...type.title, flexShrink: 1, fontSize: 14, color: ink.strong },
  says: { ...type.label, fontSize: 12, color: ink.secondary },
  // Digits of one width, so the prices line up down the column.
  price: { ...type.value, fontVariant: ["tabular-nums"] },
  more: { flexDirection: "row", alignItems: "center" },
  pressed: { opacity: 0.7 },
  // A cleared test: quieter words, the price struck through.
  dim: { color: ink.tertiary },
  struck: { textDecorationLine: "line-through" },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.inline,
    padding: space.item,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.primaryEdge,
    backgroundColor: color.primaryTint,
  },
  noteText: { ...type.label, flex: 1, fontSize: 13, lineHeight: 19, color: ink.content },
  noteBold: { fontFamily: font.medium, color: ink.primary },
  sectionHead: { ...type.sectionLabel, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
  record: { flexDirection: "row", alignItems: "center", gap: space.item, paddingVertical: space.rowY, paddingHorizontal: space.rowX },
  recordName: { ...type.title, fontSize: 14, color: ink.strong },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: color.okTint },
  pillText: { ...type.label, fontSize: 12, fontFamily: font.medium, color: ink.good },
  whyPart: { gap: space.line },
  whyHead: { ...type.title, fontSize: 13, color: ink.strong },
  whyBody: { ...type.body, fontSize: 13, lineHeight: 19 },
})
