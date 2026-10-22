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

const monthDay = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })

export default function YesterdayScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>()
  const today = dayFrom(localDay())
  const day = !date || date === "yesterday" ? addDays(today, -1) : /^\d{4}-\d{2}-\d{2}$/.test(date) ? dayFrom(date) : addDays(today, -1)
  const n = NUMBERS

  return (
    <TopicPage>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          Yesterday in numbers
        </Text>
        <Text style={type.body}>Energy in, energy out, and what moved. Every figure below the score on the last screen.</Text>
      </View>

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
            <View key={m.label} style={styles.macro} accessible accessibilityLabel={`${m.label}, ${m.value} of ${m.of} grams`}>
              <Text style={styles.cap}>{m.label.toUpperCase()}</Text>
              <Text style={styles.big}>
                {m.value}
                <Text style={type.unit}> g</Text>
              </Text>
              <Text style={type.caption}>{`of ${m.of}`}</Text>
            </View>
          ))}
        </View>
      </Block>

      <Block title="Movement" meta="against goal">
        <View style={styles.moves}>
          {n.movement.map((m) => (
            <View key={m.label} style={styles.move} accessible accessibilityLabel={`${m.value} ${m.label}, ${m.delta} on goal`}>
              <TopicIcon name={m.icon} size={14} color={ink.secondary} />
              <Text style={styles.big}>{m.value}</Text>
              <Text style={styles.cap}>{m.label.toUpperCase()}</Text>
              <Text style={styles.delta}>{m.delta}</Text>
            </View>
          ))}
        </View>
      </Block>

      <Foot>RMR is the measured figure from her own test, not an estimate from height and weight. That is what makes the deficit a number rather than a guess.</Foot>
    </TopicPage>
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
  head: { gap: space.stack },
  title: { ...type.hero, fontSize: 24, lineHeight: 32 },

  table: { borderRadius: 10, overflow: "hidden", backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge, boxShadow: card.shadowXs },
  row: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingHorizontal: space.item, paddingVertical: 10 },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  strong: { backgroundColor: surface.inset },
  rowLabel: { ...type.title, color: ink.strong },
  rowValue: { ...type.value, minWidth: 48, textAlign: "right", fontVariant: ["tabular-nums"] },
  deficit: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingHorizontal: space.item, paddingVertical: 12, backgroundColor: ink.strong },
  deficitLabel: { ...type.title, flex: 1, color: ink.onColor },
  deficitNote: { ...type.meta, color: "rgba(255, 255, 255, 0.72)" },
  deficitValue: { ...type.stat, color: ink.onColor, fontVariant: ["tabular-nums"] },
  over: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: "rgba(255, 255, 255, 0.16)" },
  overText: { ...type.tag, color: color.primaryHalo },

  macros: { flexDirection: "row", gap: space.inline },
  macro: { flex: 1, gap: 2, padding: space.item, borderRadius: 10, backgroundColor: surface.inset },
  cap: { ...type.caption, letterSpacing: 0.6, color: ink.secondary },
  big: { ...type.hero, fontVariant: ["tabular-nums"] },

  moves: { flexDirection: "row", gap: space.inline },
  move: { flex: 1, alignItems: "center", gap: 2, paddingVertical: space.item, paddingHorizontal: 4, borderRadius: 10, backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge, boxShadow: card.shadowXs },
  delta: { ...type.tag, color: ink.good },
})

