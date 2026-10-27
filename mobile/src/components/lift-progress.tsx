import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { ProgressChart } from "@/components/charts"
import { Readout, entryDay } from "@/components/progress-parts"
import { Block, Card, ChipRow, Tabs } from "@/components/record-kit"
import { useOnboarding } from "@/lib/onboarding"
import { changeText, changesOf, loadShort, resistanceOf, sessionsOf } from "@/lib/strength"
import { LIFTS, liftOf } from "@/lib/topics"
import { color, hairline, ink, space, type } from "@/lib/theme"

/* Exercise history's lift progression (HOL, 27 Oct): each lift's weight or
   reps per set, session by session, from her longitudinal record, and
   under it every change she made to the lift's weight or reps. Opened on a
   lift from its page's View progress. */

type Measure = "weight" | "reps"
const MEASURES: { value: Measure; label: string }[] = [
  { value: "weight", label: "Weight" },
  { value: "reps", label: "Reps" },
]

export function LiftProgress({ initial }: { initial?: string }) {
  const s = useOnboarding()
  const [id, setId] = React.useState(liftOf(initial ?? "")?.id ?? LIFTS[0].id)
  const [measure, setMeasure] = React.useState<Measure>("weight")
  const lift = liftOf(id)!
  const sessions = sessionsOf(s, lift)
  const points =
    measure === "weight" ? resistanceOf(sessions) : sessions.map((x) => ({ date: x.day, value: Math.max(...x.entries.map((e) => e.reps ?? 0)) }))
  const first = points[0]
  const latest = points[points.length - 1]
  const unit = measure === "weight" ? "lb" : "reps"
  const up = latest && first ? latest.value - first.value : 0
  const changes = changesOf(s, lift).slice().reverse()

  return (
    <Block title="Lift progression">
      <ChipRow options={LIFTS.map((l) => ({ value: l.id, label: l.name }))} value={id} onChange={setId} tick={false} label="Lift" />
      <Card style={styles.card}>
        <Tabs options={MEASURES} value={measure} onChange={setMeasure} snug />
        {latest && first && (
          <>
            <Readout
              value={measure === "weight" && lift.gear === "band" ? loadShort(lift, latest.value) : String(latest.value)}
              unit={measure === "weight" && lift.gear === "band" ? undefined : unit}
              label={up > 0 ? `Up ${up} ${unit} since ${entryDay(first.date)}` : `Since ${entryDay(first.date)}`}
            />
            <ProgressChart
              readings={points}
              trend={points}
              name={`${lift.name.toLowerCase()} ${measure}`}
              readingsLabel="Sessions"
              unit={unit}
              caption={null}
              playKey={`lift:${lift.id}:${measure}`}
            />
          </>
        )}
      </Card>
      {changes.length > 0 && (
        <View style={styles.table}>
          {changes.map((c, i) => (
            <View key={c.at} style={[styles.row, i > 0 && styles.rule]} accessible accessibilityLabel={`${entryDay(c.at)}, ${changeText(lift, c)}`}>
              <Text style={[styles.what, styles.fill]}>{changeText(lift, c)}</Text>
              <Text style={type.meta}>{entryDay(c.at)}</Text>
            </View>
          ))}
        </View>
      )}
    </Block>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  card: { gap: space.item },
  table: { borderRadius: 10, overflow: "hidden", backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge },
  row: { flexDirection: "row", alignItems: "center", gap: space.inline, minHeight: 40, paddingHorizontal: space.item, paddingVertical: 8 },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  what: { ...type.body, color: ink.strong },
})
