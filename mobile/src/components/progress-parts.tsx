import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { ScoreRing, formatNumber } from "@/components/charts"
import { CaretRight } from "@/components/ph"
import { Block, EmptyState, Group, NeedsRow, ResultRow } from "@/components/record-kit"
import { useMarkers } from "@/lib/experience"
import { BASELINE, PLAN_START_RESULTS, clockOf, dateOfAt, dayOfAt, daysBetween, shortDay, sinceStart, type DayScore, type Measure } from "@/lib/member"
import { classify } from "@/lib/trends"
import { card, font, ink, space, type } from "@/lib/theme"

/* The pieces Progress and History share: a card's readout (the number,
   then what it means), the rows of a history (a day with its score ring,
   one entry like a line on a statement), the member's results measured
   against her starting tests, and the one empty state. Private to the two
   screens; everything they draw with comes from the record and chart kits. */


/** A card's readout: the value in the stat size with its unit beside it,
    the words under it, and an action or a status on the right. A value
    with nothing to show ("Nothing logged") reads in grey, as the chart
    kit's readout draws it. */
export function Readout({
  value,
  unit,
  label,
  right,
  dim = false,
  accessibilityLabel,
}: {
  value: string
  unit?: string
  label?: string
  right?: React.ReactNode
  dim?: boolean
  accessibilityLabel?: string
}) {
  return (
    <View style={styles.readout}>
      <View style={styles.readoutBody} accessible accessibilityLabel={accessibilityLabel ?? [`${value}${unit ? ` ${unit}` : ""}`, label].filter(Boolean).join(", ")}>
        <Text style={[styles.readoutValue, dim && styles.readoutDim]} numberOfLines={1}>
          {value}
          {!!unit && !dim && <Text style={styles.unit}>{`${unit === "%" ? "" : " "}${unit}`}</Text>}
        </Text>
        {!!label && <Text style={styles.readoutLabel}>{label}</Text>}
      </View>
      {right}
    </View>
  )
}

/** A value with its unit, for the right side of a row: "178.0 lb". */
export function ValueText({ value, unit }: { value: string; unit?: string }) {
  return (
    <Text style={styles.value} numberOfLines={1}>
      {value}
      {!!unit && <Text style={styles.unit}>{` ${unit}`}</Text>}
    </Text>
  )
}

/** One entry in a history, like a line on a statement: the day, where it
    came from, and the value on the right. */
export function EntryRow({ title, meta, value, unit, spoken }: { title: string; meta: string; value: string; unit?: string; spoken?: string }) {
  return (
    <NeedsRow
      title={title}
      meta={meta}
      right={<ValueText value={value} unit={unit} />}
      accessibilityLabel={[title, spoken ?? `${value}${unit ? ` ${unit}` : ""}`, meta].join(", ")}
    />
  )
}

/** What a day held, in a few words: "85%, 4 meals, walk"; "Partial, 2
    meals, walk, strength"; "Nothing logged". The percent only on a complete
    day (M-28). */
export function dayWords(d: DayScore) {
  if (d.status === "none") return "Nothing logged"
  const meals = `${d.mealCount} ${d.mealCount === 1 ? "meal" : "meals"}`
  const lead = d.percent !== undefined ? `${d.percent}%` : d.status === "partial" ? "Partial" : "So far"
  return [lead, meals, d.walked ? "walk" : undefined, d.strength?.done ? "strength" : undefined].filter(Boolean).join(", ")
}

/** A day in the history: its score ring, the day, what it held. Opens the
    day. */
export function DayRow({ day, onPress }: { day: DayScore; onPress: () => void }) {
  const words = dayWords(day)
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${day.label}, ${words}`}
      accessibilityHint="Opens the day"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <ScoreRing percent={day.percent} size={40} label="" />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{day.label}</Text>
        <Text style={styles.rowMeta}>{words}</Text>
      </View>
      <CaretRight size={16} color={card.chevron} />
    </Pressable>
  )
}

/** Where a reading came from, with the time of day when she typed it in
    ("Entered by you, 9:05 PM"); the reading on her first day is her start. */
export function sourceOf(m: Measure) {
  const source = m.at.length > 10 ? `${m.source}, ${clockOf(dateOfAt(m.at))}` : m.source
  return dayOfAt(m.at) === BASELINE.at ? `Your start, ${source.charAt(0).toLowerCase()}${source.slice(1)}` : source
}

/** Measurements from the last `days` days, by their stored day. */
export function lastDays<T extends { at: string }>(list: readonly T[], days: number, now: Date = new Date()): T[] {
  return list.filter((m) => daysBetween(dateOfAt(m.at), now) <= days)
}

/** "Oct 1", or "Oct 1, 2025" outside this year. */
export function entryDay(at: string, now: Date = new Date()) {
  const d = dateOfAt(at)
  return d.getFullYear() === now.getFullYear() ? shortDay(d) : `${shortDay(d)}, ${d.getFullYear()}`
}

/** Her weight's change across a stretch, in words: "6 lb down since Jul
    2", "1.4 lb down since Sep 3", "No change since Sep 3". */
export function changeSince(from: { at: string; value: number }, to: number) {
  const diff = Math.round((to - from.value) * 10) / 10
  const since = `since ${entryDay(from.at)}`
  if (Math.abs(diff) < 0.05) return `No change ${since}`
  return `${formatNumber(Math.abs(diff), Number.isInteger(diff) ? 0 : 1)} lb ${diff < 0 ? "down" : "up"} ${since}`
}

/** The member's results with a starting test, each as its value, trend
    and status (15 Oct 2026: no "at your start" line under the value).
    Nothing at all when she has no starting tests. */
export function SinceStartRows({ title }: { title: string }) {
  const markers = useMarkers()
  const rows = Object.keys(PLAN_START_RESULTS).flatMap((id) => {
    const b = markers.find((m) => m.id === id)
    if (!b || !sinceStart(b)) return []
    const t = classify(b)
    return t.latest ? [t] : []
  })
  if (!rows.length) return null
  return (
    <Block title={title}>
      <Group>
        {rows.map((t) => (
          <ResultRow key={t.id} trend={t} onPress={() => router.push({ pathname: "/biomarker/[id]", params: { id: t.id } })} />
        ))}
      </Group>
    </Block>
  )
}

/** Nothing to show yet (C.0.10: the chart block at 80). */
export function NothingYet() {
  return <EmptyState art="chart-block" artSize={80} title="Nothing here yet" />
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },

  readout: { flexDirection: "row", alignItems: "center", gap: space.item },
  readoutBody: { flex: 1, gap: space.line },
  readoutValue: { ...type.stat, fontVariant: ["tabular-nums"] },
  readoutDim: { fontFamily: font.medium, color: ink.tertiary },
  readoutLabel: { ...type.label },
  // Nested in its value's line: the unit's face and grey, never its line
  // height, so the value's line keeps its own.
  unit: { fontFamily: type.unit.fontFamily, fontSize: type.unit.fontSize, letterSpacing: type.unit.letterSpacing, color: type.unit.color },
  value: { ...type.value, fontVariant: ["tabular-nums"] },

  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
  rowBody: { flex: 1, gap: space.line },
  rowTitle: { ...type.title },
  rowMeta: { ...type.label },
})
