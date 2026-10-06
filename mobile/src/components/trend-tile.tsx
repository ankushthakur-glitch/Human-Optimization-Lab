import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { ChartLine, ChartLineUp } from "@/components/ph"
import { RecentDots, recentWords, TONE } from "@/components/recent-dots"
import { card, cardRadius, font, ink, space } from "@/lib/theme"
import { type Status, type Trend } from "@/lib/trends"

/* The home's trend tile (Figma "Hol" component 40024605:199273, 5 Oct
   2026): the marker's name with a trend icon, the latest value and its
   unit, the last three to five results as dots with their values (5 Oct
   call), and the status as a ring and a word. The whole tile opens the
   marker. */

/** The status under the dots: an 8 pt ring and its word. */
function StatusWord({ status }: { status: Status }) {
  const tone = TONE[status]
  return (
    <View style={styles.status}>
      <View style={[styles.ring, { borderColor: tone.edge }]} />
      <Text style={styles.statusText} maxFontSizeMultiplier={1.3}>
        {tone.word}
      </Text>
    </View>
  )
}

export function TrendTile({ trend, onPress }: { trend: Trend; onPress?: () => void }) {
  const b = trend.marker
  const tone = TONE[trend.status]
  const Icon = trend.status === "in" ? ChartLine : ChartLineUp
  const unit = b.unit
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={[trend.spoken, recentWords(trend)].filter(Boolean).join(". ")}
      accessibilityHint={onPress ? "Opens details" : undefined}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={styles.words}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {b.name}
            </Text>
            <Icon size={14} color={tone.edge} />
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.value} maxFontSizeMultiplier={1.3}>
              {trend.latest ? trend.value : "No results"}
            </Text>
            {!!trend.latest && !!unit && (
              <Text style={styles.unit} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {unit}
              </Text>
            )}
          </View>
        </View>
        {!!trend.latest && <RecentDots trend={trend} />}
      </View>
      <StatusWord status={trend.status} />
    </Pressable>
  )
}

/** Tiles two to a row, 12 apart; an odd last tile keeps its half. */
export function TrendTiles({ trends, onOpen }: { trends: Trend[]; onOpen?: (t: Trend) => void }) {
  const rows: Trend[][] = []
  for (let i = 0; i < trends.length; i += 2) rows.push(trends.slice(i, i + 2))
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row.map((t) => t.id).join(":")} style={styles.row}>
          {row.map((t) => (
            <View key={t.id} style={styles.cell}>
              <TrendTile trend={t} onPress={onOpen ? () => onOpen(t) : undefined} />
            </View>
          ))}
          {row.length === 1 && <View style={styles.cell} />}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { gap: space.item },
  row: { flexDirection: "row", gap: space.item, alignItems: "stretch" },
  cell: { flex: 1 },
  pressed: { opacity: 0.8 },
  // Figma: the card, 12 inside, the words and the dots 12 over the status.
  tile: {
    flex: 1,
    backgroundColor: card.fill,
    borderRadius: cardRadius,
    padding: space.card,
    gap: space.item,
    boxShadow: card.shadow,
  },
  top: { gap: space.stack },
  words: { gap: space.stack },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.mark },
  name: { flexShrink: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: ink.detail },
  valueRow: { flexDirection: "row", alignItems: "center", gap: space.stack },
  value: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: ink.strong, fontVariant: ["tabular-nums"] },
  unit: { flexShrink: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink.secondary },
  status: { flexDirection: "row", alignItems: "center", gap: space.mark },
  ring: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.6 },
  statusText: { fontFamily: font.medium, fontSize: 10, lineHeight: 14, color: ink.detail },
})
