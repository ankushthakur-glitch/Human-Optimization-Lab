import { useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { formatNumber } from "@/components/charts"
import { Block } from "@/components/record-kit"
import { Foot, TopicIcon, TopicPage } from "@/components/topic-kit"
import { addDays, dayFrom, localDay } from "@/lib/member"
import { NUMBERS } from "@/lib/topics"
import { card, color, hairline, ink, space, surface, type } from "@/lib/theme"

/* Yesterday in numbers (Journey_14 screen 40), under the Review's day card:
   "the figures under the score". The level beneath the day: food in,
   resting metabolism, active energy and what that leaves, each against its
   target rather than on its own. The resting figure is the one measured
   from her own test, not an estimate from height and weight, which is what
   turns the deficit from a guess into a number. The macros sit under the
   calorie line, because a deficit hit on the wrong macros loses muscle, and
   movement is shown against its goal rather than as a bare total. */

const monthDay =(d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })

export default function YesterdayScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>()
  const today = dayFrom(localDay())
  const day = !date || date === "yesterday" ? addDays(today, -1) : /^\d{4}-\d{2}-\d{2}$/.test(date) ? dayFrom(date) : addDays(today, -1)
  const n = NUMBERS

  return (
    <TopicPage title="Yesterday">
      <Block title="Energy balance" meta={monthDay(day)}>
        <View style={styles.table}>
          {n.energy.map((r, i) => (
            <Row key={r.label} label={r.label} note={r.note} value={formatNumber(r.value)} rule={i > 0} />
          ))}
          <Row label="Energy out" value={formatNumber(n.out)} strong rule />
          <View style={styles.deficit} accessible accessibilityLabel={`Deficit ${n.deficit.value} kilocalories, target ${n.deficit.target}, ${n.deficit.over} past it`}>
            <Text style={styles.deficitLabel}>Deficit</Text>
            <Text style={styles.deficitNote}>{`target ${n.deficit.target}`}</Text>
            <Text style={styles.deficitValue}>{formatNumber(n.deficit.value)}</Text>
            <View style={styles.over}>
              <Text style={styles.overText}>{`+${n.deficit.over}`}</Text>
            </View>
          </View>
        </View>
        <View style={styles.macros}>
          {n.macros.map((m) => (
            <MacroTile key={m.label} label={m.label} value={m.value} of={m.of} />
          ))}
        </View>
      </Block>

      <Block title="Movement" meta="against goal">
        <View style={styles.moves}>
          {n.movement.map((m) => (
            <View key={m.label} style={styles.move} accessible accessibilityLabel={`${m.value} ${m.label}, ${m.delta} on goal`}>
              <TopicIcon name={m.icon} size={14} color={ink.secondary} />
              <Text style={styles.big}>{m.value}</Text>
              <Text style={styles.cap}>{m.label}</Text>
              <Text style={styles.delta}>{m.delta}</Text>
            </View>
          ))}
        </View>
      </Block>

      <Foot>RMR is the measured figure from her own test, not an estimate from height and weight. That is what makes the deficit a number rather than a guess.</Foot>
    </TopicPage>
  )
}

/** One macro as a tile: the name over the grams so far, the target under
    that. */
function MacroTile({ label, value, of }: { label: string; value: number; of: number }) {
  return (
    <View style={styles.macro} accessible accessibilityLabel={`${label}, ${value} of ${of} grams`}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>
        {value}
        <Text style={styles.macroUnit}>{" g"}</Text>
      </Text>
      <Text style={type.meta}>{`of ${of}`}</Text>
    </View>
  )
}

function Row({ label, note, value, strong, rule }: { label: string; note?: string; value: string; strong?: boolean; rule?: boolean }) {
  return (
    <View style={[styles.row, rule && styles.rule, strong && styles.strong]}>
      <Text style={[styles.rowLabel, styles.fill]}>{label}</Text>
      {!!note && <Text style={type.meta}>{note}</Text>}
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },

  table: { borderRadius: 10, overflow: "hidden", backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge, boxShadow: card.shadowXs },
  row: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingHorizontal: space.item, paddingVertical: 10 },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  strong: { backgroundColor: surface.inset },
  rowLabel: { ...type.title, color: ink.strong },
  rowValue: { ...type.value, minWidth: 48, textAlign: "right", fontVariant: ["tabular-nums"] },
  deficit: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingHorizontal: space.item, paddingVertical: 12, backgroundColor: color.primarySoft, borderTopWidth: 1, borderTopColor: color.primaryEdge },
  deficitLabel: { ...type.title, flex: 1, color: ink.strong },
  deficitNote: { ...type.meta },
  deficitValue: { ...type.stat, fontVariant: ["tabular-nums"] },
  over: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: color.background },
  overText: { ...type.tag, color: ink.primary },

  macros: { flexDirection: "row", gap: space.inline },
  macro: { flex: 1, gap: 2, paddingVertical: space.item, paddingHorizontal: space.item, borderRadius: 10, backgroundColor: "#E8ECF0", borderWidth: 1, borderColor: hairline.outline },
  macroLabel: { ...type.caption, color: ink.secondary },
  macroValue: { ...type.hero, fontVariant: ["tabular-nums"] },
  macroUnit: { ...type.meta },
  cap:{ ...type.caption, color: ink.secondary },
  big: { ...type.hero, fontVariant: ["tabular-nums"] },

  moves: { flexDirection: "row", gap: space.inline },
  move: { flex: 1, alignItems: "center", gap: 2, paddingVertical: space.item, paddingHorizontal: 4, borderRadius: 10, backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge, boxShadow: card.shadowXs },
  delta: { ...type.tag, color: ink.good },
})

