import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { goalOf, GOALS } from "@/components/goal-list"
import { usePlanList, usePlanMatches } from "@/components/plan-match"
import { PlanStepPage } from "@/components/plan-steps"
import { Barbell, Bone, CaretRight, Drop, Heart, Heartbeat, Lightning, Moon, Plus, Scales, Sparkle } from "@/components/ph"
import { Card, Group, HUE, Tag, Tile, type Hue } from "@/components/record-kit"
import { useOnboarding } from "@/lib/onboarding"
import { PLAN_COUNT, SHORT_NAME, planHue, type PlanKind } from "@/lib/plan-match"
import { ink, space, type } from "@/lib/theme"

/* After the goals (step 1 of the plan's set-up): the plans her record
   points to, then what her goals added on top. Record plans come first and
   say so; a goal a record plan already covers adds nothing; every other
   goal adds its own plan, with the test that sets its starting point when
   one does. Up to five in all. "Want a different plan?" opens all 81 by
   area, where she adds any other plan; each one she adds joins the list
   as "Added", and a tap in the list takes it off again. Continue opens step 2, the tests her record is missing (/baseline). */

type Icon = typeof Heart
type Row = { key: string; name: string; says: string; Icon: Icon; hue: Hue; from: "record" | "goal" | "added" }

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

  const rows: Row[] = matches.map((m) => ({ key: `record-${m.kind}-${m.markerId}`, name: SHORT_NAME[m.kind], says: "From your record", Icon: RECORD_ICON[m.kind], hue: planHue(SHORT_NAME[m.kind]), from: "record" }))
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

  return (
    <PlanStepPage
      step={1}
      title={fromGoals ? "We updated your plans" : "Your plans"}
      lead={fromGoals ? `Based on your goals, we added ${COUNT[fromGoals]}.` : "Your goals are covered by the plans from your record."}
      onNext={() => router.push("/baseline")}
      overlay={list.sheet}
    >
      {shown.length > 0 && (
        <Group>
          {shown.map((r) => (
            <View key={r.key} style={styles.row} accessible accessibilityLabel={`${r.name}. ${r.says}`}>
              <Tile hue={r.hue} size={36}>
                <r.Icon size={20} color={HUE[r.hue].ink} />
              </Tile>
              <View style={styles.words}>
                <Text style={styles.name}>{r.name}</Text>
                <Text style={styles.says}>{r.says}</Text>
              </View>
              <Tag tone={r.from === "record" ? "primary" : "muted"}>{r.from === "record" ? "Record" : r.from === "goal" ? "Your goal" : "Added"}</Tag>
            </View>
          ))}
        </Group>
      )}
      <Card onPress={list.show} accessibilityLabel={`Want a different plan? Browse all ${PLAN_COUNT} and add any of them`} style={styles.more}>
        <Tile hue="teal" size={36}>
          <Plus size={20} color={HUE.teal.ink} />
        </Tile>
        <View style={styles.words}>
          <Text style={styles.name}>Want a different plan?</Text>
          <Text style={styles.says}>{`Browse all ${PLAN_COUNT} and add any of them.`}</Text>
        </View>
        <CaretRight size={16} color={ink.tertiary} />
      </Card>
    </PlanStepPage>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.lead, paddingVertical: space.item, paddingHorizontal: space.rowX },
  words: { flex: 1, gap: 2 },
  name: { ...type.title, color: ink.strong },
  says: { ...type.label, color: ink.secondary },
  more: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.item, paddingHorizontal: space.rowX, marginTop: space.inline },
})
