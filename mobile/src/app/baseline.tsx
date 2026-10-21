import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { Info } from "@/components/ph"
import { PlanStepPage } from "@/components/plan-steps"
import { Switch } from "@/components/settings-rows"
import { Sheet } from "@/components/sheet"
import {
  ADD_ONS,
  BASELINE_TESTS,
  chosenAddOns,
  chosenTests,
  dollars,
  type AddOnId,
  type BaselineTestId,
} from "@/lib/baseline-tests"
import { useOnboarding } from "@/lib/onboarding"
import { card, color, font, hairline, ink, space, type } from "@/lib/theme"

/* Step 2 of the plan's set-up, "What your baseline needs": the tests and
   the program her plan calls for, each under the part of the plan that
   needs it. A group's switch turns the whole part off and its tests come
   off with it; a skipped one greys out with its price struck through. The
   (i) beside a test opens what it is and why it matters in a bottom sheet.
   "Triglyceride & insulin" is covered by the blood panel above, so it
   costs nothing and follows the panel. A summary bar totals what is added
   to the plan, and a line under it says what her record already holds.
   Continue opens step 3 (/enrollment). The blood panel, DEXA and RMR are
   kept in the onboarding picks, which enrollment and payment charge from;
   the sleep study and SMART program are held on this screen. */

type Info = { what: string; why: string }

type Item = {
  key: string
  name: string
  says: string
  price: number
  info?: Info
  /** Costs nothing here: another test covers it. */
  shared?: boolean
}

type Group = {
  key: "metabolic" | "lipid" | "insulin" | "sleep" | "smart"
  name: string
  /** "2 tests", "shared", "program". */
  tag: string
  on: boolean
  items: Item[]
}

const SLEEP: Info = {
  what: "A home sleep test worn for two nights. It tracks your breathing, oxygen and sleep stages while you sleep in your own bed.",
  why: "You told us you wake at three. This shows whether something like disrupted breathing is behind it, so your plan can target the cause.",
}
const SMART: Info = {
  what: "An eight-week stress and resiliency program from the Benson-Henry Institute, with short guided practices you do at home.",
  why: "Stress shapes sleep, blood pressure and blood sugar. The program gives your plan a way to work on it directly.",
}

const TEST_ITEM = (id: BaselineTestId, says: string): Item => ({
  key: id,
  name: BASELINE_TESTS[id].name,
  says,
  price: BASELINE_TESTS[id].price,
  info: { what: BASELINE_TESTS[id].what, why: BASELINE_TESTS[id].why },
})

export default function BaselineScreen() {
  const onboarding = useOnboarding()
  const [open, setOpen] = React.useState<string | null>(null)
  const addOns = new Set<string>(chosenAddOns(onboarding.addOns).map((a) => a.id))
  const sleep = addOns.has("sleep")
  const smart = addOns.has("smart")
  function setAddOn(id: AddOnId, on: boolean) {
    const next = new Set(addOns)
    if (on) next.add(id)
    else next.delete(id)
    onboarding.save({ addOns: (["sleep", "smart"] as AddOnId[]).filter((k) => next.has(k)) })
  }
  const picks = new Set<string>(chosenTests(onboarding.baselinePicks).map((t) => t.id))

  function setTests(ids: BaselineTestId[], on: boolean) {
    const next = new Set(picks)
    for (const id of ids) {
      if (on) next.add(id)
      else next.delete(id)
    }
    const order: BaselineTestId[] = ["panel", "dexa", "rmr"]
    onboarding.save({ baselinePicks: order.filter((id) => next.has(id)) })
  }

  const metabolicOn = picks.has("dexa") || picks.has("rmr")
  const panelOn = picks.has("panel")

  const groups: Group[] = [
    {
      key: "metabolic",
      name: "Metabolic & weight",
      tag: "2 tests",
      on: metabolicOn,
      items: [
        TEST_ITEM("dexa", "Separates fat from lean mass"),
        TEST_ITEM("rmr", "No metabolic rate on file"),
      ],
    },
    {
      key: "lipid",
      name: "Lipid & cardiovascular",
      tag: "1 test",
      on: panelOn,
      items: [TEST_ITEM("panel", "Also covers triglycerides and insulin")],
    },
    {
      key: "insulin",
      name: "Triglyceride & insulin",
      tag: "shared",
      on: panelOn,
      items: [{ key: "insulin", name: "", says: "Covered by the blood panel above", price: 0, shared: true }],
    },
    {
      key: "sleep",
      name: "Sleep restoration",
      tag: "1 test",
      on: sleep,
      items: [{ key: "sleep", name: "Home Sleep Study", says: "Two nights at home - you said you wake at three", price: ADD_ONS.sleep.price, info: SLEEP }],
    },
    {
      key: "smart",
      name: "SMART stress & resiliency",
      tag: "program",
      on: smart,
      items: [{ key: "smart", name: "SMART program", says: "Benson-Henry Institute · 8 weeks", price: ADD_ONS.smart.price, info: SMART }],
    },
  ]

  // For now the screen shows three cards; the shared insulin card and the
  // SMART program stay defined above and return by adding their keys here
  // (and "smart" to OFFERED_ADD_ONS, so enrollment and payment follow).
  const SHOWN: Group["key"][] = ["metabolic", "lipid", "sleep"]
  const shown = groups.filter((g) => SHOWN.includes(g.key))

  function toggle(g: Group) {
    if (g.key === "metabolic") setTests(["dexa", "rmr"], !g.on)
    else if (g.key === "lipid" || g.key === "insulin") setTests(["panel"], !g.on)
    else if (g.key === "sleep") setAddOn("sleep", !g.on)
    else setAddOn("smart", !g.on)
  }

  const openItem = shown.flatMap((g) => g.items).find((i) => i.key === open)
  const onItems = shown.filter((g) => g.on).flatMap((g) => g.items)
  const total = onItems.reduce((sum, i) => sum + i.price, 0)
  const programs = smart ? 1 : 0
  const tests = onItems.filter((i) => !i.shared && i.key !== "smart").length
  const added = [
    `${tests} ${tests === 1 ? "test" : "tests"}`,
    ...(programs ? [`${programs} ${programs === 1 ? "program" : "programs"}`] : []),
  ].join(" and ")

  return (
    <PlanStepPage
      step={2}
      title="What your baseline needs"
      onNext={() => router.push("/enrollment")}
      overlay={
        openItem?.info && (
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
      aboveFoot={
        <View style={styles.summary} accessibilityLiveRegion="polite">
          <Text style={styles.summaryText}>{`${added} added to your plan`}</Text>
          <Text style={styles.totalValue}>{dollars(total)}</Text>
        </View>
      }
    >
      <View style={styles.groups}>
        {shown.map((g) => (
          <View key={g.key} style={styles.group}>
            <View style={styles.head}>
              <Text style={styles.groupName}>{g.name}</Text>
              <Text style={styles.tag}>{g.tag}</Text>
              <Switch value={g.on} onChange={() => toggle(g)} label={g.name} />
            </View>
            {g.items.map((item) => (
              <View key={item.key} style={styles.item}>
                <View style={styles.row}>
                  <View style={styles.body}>
                    {!!item.name && (
                      // The info button sits right after the test's name.
                      <View style={styles.nameRow}>
                        <Text style={[styles.name, !g.on && styles.dim]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.info && (
                          <Pressable
                            onPress={() => setOpen(item.key)}
                            accessibilityRole="button"
                            accessibilityLabel={`About ${item.name}`}
                            hitSlop={8}
                            style={({ pressed }) => [styles.more, pressed && styles.pressed]}
                          >
                            <Info size={14} color={ink.primary} />
                          </Pressable>
                        )}
                      </View>
                    )}
                    <Text style={[styles.says, item.shared && styles.shared, !g.on && styles.dim]}>{item.says}</Text>
                  </View>
                  <View style={styles.side}>
                    <Text style={[styles.price, !g.on && styles.dim, !g.on && styles.struck]}>{dollars(item.price)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </PlanStepPage>
  )
}

const styles = StyleSheet.create({
  groups: { gap: space.inline, marginTop: space.mark, paddingBottom: space.inline },
  // One white card per part of the plan: its name and switch on an inset
  // header, the tests under it.
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
  item: { paddingHorizontal: space.rowX, borderTopWidth: 1, borderTopColor: hairline.rule },
  row: { flexDirection: "row", alignItems: "center", gap: space.item, paddingVertical: space.rowY },
  body: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: space.mark },
  name: { ...type.title, flexShrink: 1, fontSize: 14, color: ink.strong },
  says: { ...type.label, fontSize: 12, color: ink.secondary },
  shared: { fontStyle: "italic" },
  side: { alignItems: "flex-end", gap: space.mark },
  // Digits of one width, so the prices line up down the column.
  price: { ...type.value, fontVariant: ["tabular-nums"] },
  more: { flexDirection: "row", alignItems: "center" },
  pressed: { opacity: 0.7 },
  // A skipped part: quieter words, the price struck through.
  dim: { color: ink.tertiary },
  struck: { textDecorationLine: "line-through" },
  whyPart: { gap: space.line },
  whyHead: { ...type.title, fontSize: 13, color: ink.strong },
  whyBody: { ...type.body, fontSize: 13, lineHeight: 19 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.item,
    padding: space.item,
    borderRadius: 12,
    backgroundColor: color.primarySoft,
    borderWidth: 1,
    borderColor: color.primaryEdge,
  },
  summaryText: { ...type.label, flex: 1, fontFamily: font.medium, fontSize: 13, color: color.primaryText },
  totalValue: {
    fontFamily: font.semibold,
    fontSize: 18,
    lineHeight: 24,
    fontVariant: ["tabular-nums"],
    color: color.primaryText,
  },})
