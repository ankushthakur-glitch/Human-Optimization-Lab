import { router } from "expo-router"
import { StyleSheet, Text, View } from "react-native"

import { usePlanMatches } from "@/components/plan-match"
import { PlanStepPage } from "@/components/plan-steps"
import { Barbell, Bone, Brain, Drop, Flame, ForkKnife, Heart, Lightning, Moon, Pill, Ruler, Scales } from "@/components/ph"
import { Card, HUE, Heading, Tag, Tile, type Hue } from "@/components/record-kit"
import { ADDS, SHORT_NAME, planHue, type PlanKind, type SixStep } from "@/lib/plan-match"
import { color, ink, space, type } from "@/lib/theme"

/* Step 1 of the plan's set-up (since 26 Oct 2026 there is no plan to
   pick): the six steps every plan has, each with what it asks of her,
   then what her record adds to them and what she told us adds. Every
   addition says which step it sits in. A step that has an addition says
   how many. Continue opens step 2, the tests her numbers call for
   (/baseline). */

type Icon = typeof Heart
type Row = { key: string; name: string; says: string; Icon: Icon; hue: Hue; step: SixStep }

/** The six steps, each with what it starts with. */
const STEPS: { step: SixStep; says: string; Icon: Icon; hue: Hue }[] = [
  { step: "Exercise", says: "3 strength days and 8,000 steps", Icon: Barbell, hue: "teal" },
  { step: "Eat", says: "Protein at every meal, fiber 30 g", Icon: ForkKnife, hue: "green" },
  { step: "Sleep", says: "7 hours, the same bedtime", Icon: Moon, hue: "blue" },
  { step: "Mind", says: "Rate stress, coping and distress each day", Icon: Brain, hue: "violet" },
  { step: "Medication", says: "Your medicines, and supplement checks", Icon: Pill, hue: "amber" },
  { step: "Measure", says: "Weigh in every morning", Icon: Ruler, hue: "red" },
]

/** What her answers to the life questions add, with the line she said. */
const LIFE: Row[] = [
  { key: "life-sleep", name: "Back to sleep after waking", says: "You said you wake at three and cannot get back off", Icon: Moon, hue: "violet", step: "Sleep" },
  { key: "life-mind", name: "SMART stress program", says: "You said you are snapping at everyone", Icon: Lightning, hue: "violet", step: "Mind" },
]

const RECORD_ICON: Record<PlanKind, Icon> = { metabolic: Scales, insulin: Drop, lipid: Heart, bone: Bone, other: Flame }

export default function GoalPlansScreen() {
  const { matches } = usePlanMatches()

  const fromRecord: Row[] = matches.map((m) => ({
    key: `record-${m.kind}-${m.markerId}`,
    name: ADDS[m.kind].target,
    says: m.matchedOn.replace(/^Matched on /, ""),
    Icon: RECORD_ICON[m.kind],
    hue: planHue(SHORT_NAME[m.kind]),
    step: ADDS[m.kind].step,
  }))
  const added = (step: SixStep) => [...fromRecord, ...LIFE].filter((r) => r.step === step).length

  const renderRow = (r: Row) => (
    <Card key={r.key} style={styles.rowCard} accessibilityLabel={`${r.name}, in ${r.step}. ${r.says}`}>
      <View style={styles.rowTop}>
        <Tile hue={r.hue} size={36}>
          <r.Icon size={20} color={HUE[r.hue].ink} />
        </Tile>
        <View style={styles.words}>
          <Text style={styles.name}>{r.name}</Text>
          <Text style={styles.says}>{r.says}</Text>
        </View>
        <Tag tone="muted">{r.step}</Tag>
      </View>
    </Card>
  )

  return (
    <PlanStepPage
      step={1}
      title="Your plan works on six steps"
      lead="The same six for everyone. What each one asks of you comes from your record."
      nextLabel="Next"
      nextOneLine
      onNext={() => router.push("/baseline")}
    >
      <View style={styles.section}>
        <Heading title="Every plan" action={<Text style={[styles.count, { color: color.primaryText }]}>6 steps</Text>} />
        {STEPS.map((s) => {
          const n = added(s.step)
          return (
            <Card key={s.step} style={styles.rowCard} accessibilityLabel={`${s.step}. ${s.says}${n ? `. ${n} added for you` : ""}`}>
              <View style={styles.rowTop}>
                <Tile hue={s.hue} size={36}>
                  <s.Icon size={20} color={HUE[s.hue].ink} />
                </Tile>
                <View style={styles.words}>
                  <Text style={styles.name}>{s.step}</Text>
                  <Text style={styles.says}>{s.says}</Text>
                </View>
                {n > 0 && <Tag tone="primary">{`+${n} for you`}</Tag>}
              </View>
            </Card>
          )
        })}
      </View>
      {fromRecord.length > 0 && (
        <View style={styles.section}>
          <Heading title="From your record" action={<Text style={[styles.count, { color: color.high }]}>{`${fromRecord.length} biomarker ${fromRecord.length === 1 ? "match" : "matches"}`}</Text>} />
          {fromRecord.map(renderRow)}
        </View>
      )}
      <View style={styles.section}>
        <Heading title="From what you told us" action={<Text style={[styles.count, { color: color.ok }]}>{`${LIFE.length} the record missed`}</Text>} />
        {LIFE.map(renderRow)}
      </View>
    </PlanStepPage>
  )
}

const styles = StyleSheet.create({
  section: { gap: space.inline },
  count: { ...type.label },
  rowCard: { gap: space.inline, paddingVertical: space.item, paddingHorizontal: space.rowX },
  rowTop: { flexDirection: "row", alignItems: "center", gap: space.lead },
  words: { flex: 1, gap: 2 },
  name: { ...type.title, color: ink.strong },
  says: { ...type.label, color: ink.secondary },
})
