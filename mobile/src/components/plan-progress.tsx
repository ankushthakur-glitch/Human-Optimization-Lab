import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import type { CheckInKind } from "@/components/check-in-sheet"
import { ProgressChart, type Dated } from "@/components/charts"
import { AskButton } from "@/components/hol"
import { Readout } from "@/components/progress-parts"
import { Block, Card, Group, SmallAction, StatRow, StatTile } from "@/components/record-kit"
import { AT_HOME, DAY_ONE, HEADLINES, RETESTED, WAIST_SERIES, WEIGHT_SERIES, type Pair } from "@/lib/topics"
import { chart, color, font, ink, space, type } from "@/lib/theme"


/* The Plan screen's "Progress" tab (Journey screen 48, "Day one, and
   today"): every number she has, against the one she started with. A band
   at the top carries the start date, today's date and the day count; the
   two figures she shows people come next (pounds lost, body fat down), then
   her weight and waist as graphs from day one to today; then
   two dated groups, each repeating the two dates above its columns: what
   the tests found (day one's value, then today's) and what she measures at
   home.
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

      <TrendCard title="Weight" readings={WEIGHT_SERIES} unit="lb" goal={DAY_ONE.goalWeight} readingsLabel="Weigh ins" onAdd={() => onAdd("weight")} />
      <TrendCard title="Waist" readings={WAIST_SERIES} unit="in" readingsLabel="Monthly checks" />

      <Block title="What the tests found" meta={DAY_ONE.range}>
        <Group>
          {RETESTED.map((p) => (
            <PairRow key={p.name} {...p} />
          ))}
        </Group>
      </Block>

      <Block title="Measured at home" meta={DAY_ONE.range}>
        <Group>
          {AT_HOME.map((p) => (
            <PairRow key={p.name} {...p} />
          ))}
        </Group>
      </Block>

    </View>
  )
}

/** One measure as a graph from day one to today: today's value and the
    change since day one above it, the goal as a line when there is one. */
function TrendCard({ title, readings, unit, goal, readingsLabel, onAdd }: { title: string; readings: Dated[]; unit: string; goal?: number; readingsLabel: string; onAdd?: () => void }) {
  const first = readings[0]
  const last = readings[readings.length - 1]
  const change = Math.round((last.value - first.value) * 10) / 10
  const words = `${change < 0 ? "Down" : "Up"} ${Math.abs(change)} ${unit} since ${DAY_ONE.started.replace(/, \d{4}$/, "")}`
  return (
    <Block title={title} meta={DAY_ONE.range} action={onAdd ? <SmallAction onPress={onAdd}>Add</SmallAction> : undefined}>
      <Card style={styles.chartCard}>
        <Readout value={String(last.value)} unit={unit} label={words} />
        <ProgressChart readings={readings} goal={goal} unit={unit} name={title.toLowerCase()} readingsLabel={readingsLabel} caption={null} playKey={`plan:progress:${title}`} />
      </Card>
    </Block>
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
  chartCard: { gap: space.card },

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
