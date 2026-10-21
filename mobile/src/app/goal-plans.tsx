import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { goalOf, GOALS } from "@/components/goal-list"
import { usePlanList, usePlanMatches } from "@/components/plan-match"
import { PlanStepPage } from "@/components/plan-steps"
import { Barbell, Bone, Drop, Heart, Heartbeat, Lightning, Moon, Plus, Scales, Sparkle } from "@/components/ph"
import { Card, HUE, Heading, Tile, type Hue } from "@/components/record-kit"
import { useOnboarding } from "@/lib/onboarding"
import { SHORT_NAME, planHue, type PlanKind } from "@/lib/plan-match"
import { color, ink, space, type } from "@/lib/theme"

/* After the goals (step 1 of the plan's set-up): the plans her record
   points to, then what her goals added on top. Record plans come first and
   say so; a goal a record plan already covers adds nothing; every other
   goal adds its own plan, with the test that sets its starting point when
   one does. Up to five in all. "Want a different plan?" opens all 81 by
   area, where she adds any other plan; each one she adds joins the list
   as "Added", and a tap in the list takes it off again. Continue opens step 2, the tests her record is missing (/baseline). */

type Icon = typeof Heart
type Row = { key: string; name: string; says: string; Icon: Icon; hue: Hue; from: "record" | "goal" | "life" | "added"; more?: string }

/** What her answers to the life questions add: a plan of its own, with the
    line she said and a word on what it is. */
const LIFE_PLANS: { name: string; Icon: Icon; says: string; more: string }[] = [
  {
    name: "Sleep restoration",
    Icon: Moon,
    says: "You said you wake at three and cannot get back off",
    more: "A home sleep study shows whether something like disrupted breathing is behind the waking, so the plan can target the cause.",
  },
  {
    name: "SMART stress & resiliency",
    Icon: Lightning,
    says: "You said you are snapping at everyone",
    more: "SMART is the Benson-Henry Institute's Stress Management and Resiliency Training, an eight-week program with short guided practices at home.",
  },
]

/** The most plans one set-up starts with. */
const MAX = 5

const RECORD_ICON: Record<PlanKind, Icon> = { metabolic: Scales, insulin: Drop, lipid: Heart, bone: Bone, other: Sparkle }

/** The plan each listed goal adds: a record plan's kind, or a plan of its own. */
const GOAL_PLAN: Record<string, { kind?: PlanKind; name: string; Icon: Icon; test?: string }> = {
  "Lose weight or reduce body fat": { kind: "metabolic", name: "Metabolic health", Icon: Scales },
  "Improve metabolic health": { kind: "metabolic", name: "Metabolic health", Icon: Scales },
  "Improve cholesterol and heart health": { kind: "lipid", name: "Lipid control", Icon: Heart },
  "Gain or preserve muscle": { name: "Muscle strength", Icon: Barbell, test: "A body composition scan" },
  "Improve bone health": { kind: "bone", name: "Bone strength", Icon: Bone, test: "A bone density scan" },
  "Improve sleep": { name: "Better sleep", Icon: Moon, test: "A sleep study" },
  "Increase energy": { name: "More energy", Icon: Lightning },
  "Improve fitness and VO₂ max": { name: "Fitness and VO₂ max", Icon: Heartbeat, test: "A VO₂ max test" },
  "Improve kidney health": { name: "Kidney health", Icon: Drop },
}

const COUNT = ["none", "one", "two", "three", "four", "five"]

export default function GoalPlansScreen() {
  const onboarding = useOnboarding()
  const { matches } = usePlanMatches()
  const [added, setAdded] = React.useState<string[]>(() => onboarding.addedPlans ?? [])
  const [open, setOpen] = React.useState<string | null>(null)

  const rows: Row[] = matches.map((m) => ({ key: `record-${m.kind}-${m.markerId}`, name: m.name, says: m.matchedOn.replace(/^Matched on /, ""), Icon: RECORD_ICON[m.kind], hue: planHue(SHORT_NAME[m.kind]), from: "record" }))
  const covered = new Set<string>(matches.map((m) => SHORT_NAME[m.kind]))
  for (const goal of onboarding.goals ?? []) {
    const plan = GOAL_PLAN[goal]
    const listed = GOALS.some((g) => g.label === goal)
    const name = plan?.name ?? goal
    if (covered.has(name)) continue
    covered.add(name)
    const says = plan?.test ? `From your goals. ${plan.test} is suggested to set your starting point.` : listed ? "From your goals" : "From your goals. Your physician builds it into your plan."
    rows.push({ key: `goal-${goal}`, name, says, Icon: plan?.Icon ?? goalOf(goal).icon, hue: plan ? planHue(name) : goalOf(goal).hue, from: "goal" })
  }
  for (const p of LIFE_PLANS) {
    if (covered.has(p.name)) continue
    covered.add(p.name)
    rows.push({ key: `life-${p.name}`, name: p.name, says: p.says, Icon: p.Icon, hue: planHue(p.name), from: "life", more: p.more })
  }
  const picked = rows.slice(0, MAX)
  const pickedNames = picked.map((r) => r.name)
  const shown = [
    ...picked,
    ...added.filter((name) => !pickedNames.includes(name)).map((name): Row => ({ key: `added-${name}`, name, says: "Added by you", Icon: Plus, hue: planHue(name), from: "added" })),
  ]
  const fromGoals = picked.filter((r) => r.from === "goal").length

  function toggle(name: string) {
    const next = added.includes(name) ? added.filter((n) => n !== name) : [...added, name]
    setAdded(next)
    onboarding.save({ addedPlans: next.length ? next : undefined }).catch(() => {})
  }
  const list = usePlanList({ chosen: pickedNames, added, toggle })

  const fromRecord = shown.filter((r) => r.from === "record")
  const fromYou = shown.filter((r) => r.from !== "record")
  const total = shown.length

  const renderRow = (r: Row) => (
    <Card key={r.key} style={styles.rowCard} accessibilityLabel={`${r.name}. ${r.says}`}>
      <View style={styles.rowTop}>
        <Tile hue={r.hue} size={36}>
          <r.Icon size={20} color={HUE[r.hue].ink} />
        </Tile>
        <View style={styles.words}>
          <Text style={styles.name}>{r.name}</Text>
          <Text style={styles.says}>{r.says}</Text>
        </View>
        {r.more && (
          <Pressable
            onPress={() => setOpen(open === r.key ? null : r.key)}
            accessibilityRole="button"
            accessibilityState={{ expanded: open === r.key }}
            accessibilityLabel={`More about ${r.name}`}
            hitSlop={8}
          >
            <Text style={styles.moreLink}>{open === r.key ? "Less ›" : "More ›"}</Text>
          </Pressable>
        )}
      </View>
      {r.more && open === r.key && <Text style={styles.moreText}>{r.more}</Text>}
    </Card>
  )

  return (
    <PlanStepPage
      step={1}
      title={`Your plan would work on ${COUNT[total] ?? total} ${total === 1 ? "thing" : "things"}`}
      lead="What we would work on, from your record and what you told us."
      nextLabel="Next"
      nextOneLine
      onNext={() => router.push("/baseline")}
      overlay={list.sheet}
    >
      {fromRecord.length > 0 && (
        <View style={styles.section}>
          <Heading title="From your record" action={<Text style={[styles.count, { color: color.high }]}>{`${fromRecord.length} biomarker ${fromRecord.length === 1 ? "match" : "matches"}`}</Text>} />
          {fromRecord.map(renderRow)}
        </View>
      )}
      {fromYou.length > 0 && (
        <View style={styles.section}>
          <Heading title="From what you told us" action={<Text style={[styles.count, { color: color.ok }]}>{`${fromYou.length} the record missed`}</Text>} />
          {fromYou.map(renderRow)}
        </View>
      )}
    </PlanStepPage>
  )
}


const styles = StyleSheet.create({
  section: { gap: space.inline },
  count: { ...type.label },
  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.item, paddingHorizontal: space.rowX },
  rowCard: { gap: space.inline, paddingVertical: space.item, paddingHorizontal: space.rowX },
  rowTop: { flexDirection: "row", alignItems: "center", gap: space.lead },
  moreLink: { ...type.label, color: color.primary },
  moreText: { ...type.label, color: ink.secondary },
  words: { flex: 1, gap: 2 },
  name: { ...type.title, color: ink.strong },
  says: { ...type.label, color: ink.secondary },
})
