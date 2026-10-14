import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { formatNumber } from "@/components/charts"
import { CaretRight, Check, Flame } from "@/components/ph"
import { Card } from "@/components/record-kit"
import { GOALS, type ReviewDay } from "@/lib/daily-review"
import { chart, color, hairline, ink, space, type } from "@/lib/theme"

/* Energy balance on the member home (14 Oct 2026), under the to-do: what she
   burned (resting plus active), what she ate, and the deficit between them,
   then the deficit for each of the past seven days against her goal line. */

const BAR_AREA = 72

/** "Sep 29" for the first day and the first of a month, otherwise "30". */
function dayLabel(date: Date, i: number) {
  const first = i === 0 || date.getDate() === 1
  return first ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : String(date.getDate())
}

export function EnergyBalance({ day, onDetails }: { day: ReviewDay; onDetails: () => void }) {
  const energy = day.energy
  if (!energy) return null
  const target = GOALS.energy.target
  const met = energy.deficit >= target
  const max = Math.max(target, ...day.energyWeek.map((w) => w.deficit ?? 0))
  const goalLine = (BAR_AREA * target) / max

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={styles.iconTile}>
          <Flame size={18} color={color.primary} />
        </View>
        <View style={styles.fill}>
          <Text style={styles.title} accessibilityRole="header">
            Energy Balance
          </Text>
          <Text style={styles.sub}>See how it adds up.</Text>
        </View>
        {met && (
          <View style={styles.badge}>
            <Check size={12} weight="bold" color={ink.good} />
            <Text style={styles.badgeText}>Goal met</Text>
          </View>
        )}
      </View>

      <View style={styles.sum} accessible accessibilityLabel={`Energy out ${energy.out}, food in ${energy.food}, ${energy.deficit < 0 ? "surplus" : "deficit"} ${Math.abs(energy.deficit)} kilocalories`}>
        <Figure value={energy.out} label="Energy out" />
        <Text style={styles.op}>−</Text>
        <Figure value={energy.food} label="Food in" />
        <Text style={styles.op}>=</Text>
        <Figure value={Math.abs(energy.deficit)} label={energy.deficit < 0 ? "Surplus" : "Deficit"} accent />
      </View>

      <Text style={styles.split}>
        RMR <Text style={styles.splitValue}>{formatNumber(energy.resting)}</Text>
        {"     +     "}Active <Text style={styles.splitValue}>{formatNumber(energy.active)}</Text>
      </Text>

      <View style={styles.weekHead}>
        <Text style={styles.weekTitle}>Past 7 days</Text>
        <Pressable onPress={onDetails} hitSlop={8} accessibilityRole="link" style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
          <Text style={styles.linkText}>Details</Text>
          <CaretRight size={16} color={color.primary} />
        </Pressable>
      </View>

      <View style={styles.chart}>
        <View style={[styles.goalLine, { bottom: 18 + goalLine }]} />
        <View style={styles.bars}>
          {day.energyWeek.map((w, i) => {
            const d = w.date
            const now = i === day.energyWeek.length - 1
            const h = w.deficit === undefined ? 3 : Math.max(3, (BAR_AREA * Math.max(w.deficit, 0)) / max)
            return (
              <View key={i} style={styles.col} accessible accessibilityLabel={`${dayLabel(d, i)}, ${w.deficit === undefined ? "not logged" : `${w.deficit} kilocalories`}`}>
                <Text style={[styles.barValue, now && styles.barValueNow]}>{w.deficit === undefined ? "" : formatNumber(Math.abs(w.deficit))}</Text>
                <View style={[styles.bar, { height: h, backgroundColor: w.deficit === undefined ? chart.track : now ? chart.dataStrong : chart.dataPast }]} />
                <Text style={[styles.barDay, now && styles.barDayNow]}>{dayLabel(d, i)}</Text>
              </View>
            )
          })}
        </View>
      </View>
    </Card>
  )
}

function Figure({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <View style={[styles.figure, accent && styles.figureAccent]}>
      <Text style={[styles.figureValue, accent && styles.figureValueAccent]}>{formatNumber(value)}</Text>
      <Text style={[styles.figureLabel, accent && styles.figureLabelAccent]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.item },
  fill: { flex: 1 },
  pressed: { opacity: 0.7 },

  head: { flexDirection: "row", alignItems: "center", gap: space.lead },
  iconTile: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },
  title: { ...type.section },
  sub: { ...type.label },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.mark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: chart.band,
    borderWidth: 1,
    borderColor: chart.bandEdge,
  },
  badgeText: { ...type.metaStrong, color: ink.good },

  sum: { flexDirection: "row", alignItems: "center", gap: space.inline },
  op: { ...type.title, color: ink.secondary },
  figure: { flex: 1, alignItems: "center", paddingVertical: space.item, borderRadius: 12, borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.background },
  figureAccent: { backgroundColor: color.primarySoft, borderColor: color.primaryEdge },
  figureValue: { ...type.hero },
  figureValueAccent: { color: ink.good },
  figureLabel: { ...type.meta },
  figureLabelAccent: { color: ink.good },

  split: { ...type.label, textAlign: "center" },
  splitValue: { ...type.metaStrong, color: ink.strong },

  weekHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.inline, paddingTop: space.item, borderTopWidth: 1, borderTopColor: hairline.edge },
  weekTitle: { ...type.title, color: ink.strong },
  link: { flexDirection: "row", alignItems: "center", gap: space.inline },
  linkText: { ...type.seeAll },

  chart: { justifyContent: "flex-end" },
  goalLine: { position: "absolute", left: 0, right: 0, height: 0, borderTopWidth: 1, borderStyle: "dashed", borderColor: chart.goal },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  col: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  bar: { alignSelf: "stretch", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barValue: { ...type.metaStrong, color: ink.primary },
  barValueNow: { color: ink.primary },
  barDay: { ...type.meta },
  barDayNow: { ...type.metaStrong, color: ink.strong },
})
