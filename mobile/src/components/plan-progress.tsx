import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import type { CheckInKind } from "@/components/check-in-sheet"
import { AskButton } from "@/components/hol"
import { Block, Group, NeedsRow, SmallAction, StatRow, StatTile } from "@/components/record-kit"
import { AT_HOME, DAY_ONE, HEADLINES, RESCORED, RETESTED, SYMPTOMS, type Pair } from "@/lib/topics"
import { chart, color, font, ink, space, type } from "@/lib/theme"


/* The Plan screen's "Progress" tab (Journey screen 48, "Day one, and
   today"): every number she has, against the one she started with. A band
   at the top carries the start date, today's date and the day count; the
   two figures she shows people come next (pounds lost, body fat down); then
   three dated groups, each repeating the two dates above its columns: what
   the tests found (day one's value, then today's), the three symptoms she
   named re-scored on her own 0 to 10 scale, and what she measures at home.
   The left column is always day one and the right is always today, so
   nothing reads as a trend without the point it moved from. Under them, the
   way to the forecast (the Outlook tab) and one question for Inlay. The
   photo check-in follows on the Plan screen. */

/** A value pair as the reference draws it: day one in grey, "to", then today
    in teal, with a unit once, after both. */
function PairText({ from, to, unit }: { from: string; to: string; unit?: string }) {
  return (
    <Text style={styles.pair} numberOfLines={1}>
      <Text style={styles.from}>{from}</Text>
      <Text style={styles.to}>{" to "}</Text>
      <Text style={styles.now}>{to}</Text>
      {!!unit && <Text style={styles.unit}>{` ${unit}`}</Text>}
    </Text>
  )
}

/** One compared line: the name and where it came from, then day one to today. */
function PairRow({ name, via, from, to, unit, spoken }: Pair) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${name}, ${spoken}, ${via}`}>
      <View style={styles.words}>
        <Text style={styles.name}>{name}</Text>
        <Text style={type.label}>{via}</Text>
      </View>
      <PairText from={from} to={to} unit={unit} />
    </View>
  )
}

export function YourProgress({ onAdd }: { onAdd: (kind: CheckInKind) => void }) {
  const { weight, fat } = HEADLINES
  return (
    <View style={styles.wrap}>
      <View style={styles.band} accessible accessibilityLabel={`Started ${DAY_ONE.started}, today ${DAY_ONE.today}, day ${DAY_ONE.day}`}>
        <Cell label="Started" value={DAY_ONE.started} />
        <Cell label="Today" value={DAY_ONE.today} />
        <Cell label="Day" value={String(DAY_ONE.day)} strong />
      </View>

      <StatRow>
        <StatTile value={String(weight.lost)} unit="lb" label="Weight lost" meta={`From ${weight.from} lb`} />
        <StatTile value={String(fat.down)} unit="pts" label="Body fat down" meta={`From ${fat.from}%`} />
      </StatRow>

      <Block title="What the tests found" meta={DAY_ONE.range}>
        <Group>
          {RETESTED.map((p) => (
            <PairRow key={p.name} {...p} />
          ))}
        </Group>
      </Block>

      <Block title="The three you named" meta="0 to 10, lower is better">
        <Group>
          {SYMPTOMS.map((s) => (
            <PairRow key={s.id} name={s.name} via="Re-scored at week 12" from={String(s.start)} to={String(RESCORED[s.id])} spoken={`${s.start} to ${RESCORED[s.id]} out of 10`} />
          ))}
        </Group>
      </Block>

      <Block title="Measured at home" meta={DAY_ONE.range} action={<SmallAction onPress={() => onAdd("weight")}>Add</SmallAction>}>
        <Group>
          {AT_HOME.map((p) => (
            <PairRow key={p.name} {...p} />
          ))}
        </Group>
      </Block>

    </View>
  )
}

/** The question for Inlay, pinned at the bottom of the Plan screen while
    the Progress tab is open. */
export function ProgressAsk() {
  return <AskButton about="your progress" onPress={() => router.push({ pathname: "/assistant", params: { topic: "plan", ask: "What moved most since day one?" } })} />
}

function Cell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.bandLabel}>{label}</Text>
      <Text style={[styles.bandValue, strong && styles.bandStrong]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.section },

  // The dated band: dark teal, three cells, the day count in the light teal.
  band: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item, paddingHorizontal: space.item, paddingVertical: space.compact, borderRadius: 8, backgroundColor: chart.dataStrong },
  cell: { gap: space.line },
  bandLabel: { ...type.meta, fontSize: 10, lineHeight: 14, color: color.primaryEdge },
  bandValue: { ...type.title, fontFamily: font.semibold, color: ink.onColor },
  bandStrong: { color: color.primaryHalo },

  row: { flexDirection: "row", alignItems: "center", gap: space.item, paddingVertical: space.rowY },
  words: { flex: 1, minWidth: 0, gap: space.line },
  name: { ...type.title },
  pair: { ...type.value, fontVariant: ["tabular-nums"], flexShrink: 0 },
  from: { fontFamily: font.regular, color: ink.secondary },
  to: { fontFamily: font.regular, color: ink.tertiary },
  now: { fontFamily: font.semibold, color: ink.primary },
  unit: { fontFamily: font.regular, color: ink.tertiary },
})
