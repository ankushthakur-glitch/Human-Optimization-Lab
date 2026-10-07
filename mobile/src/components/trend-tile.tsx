import * as React from "react"
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native"
import Svg, { Circle, Defs, LinearGradient, Mask, Path, Rect, Stop } from "react-native-svg"

import { ArrowDown, ArrowRight, ArrowUp, CaretRight } from "@/components/ph"
import { dotTone, recentPoints, recentWords, severityColor, statusStops, TONE } from "@/components/recent-dots"
import { card, cardRadius, font, ink, space } from "@/lib/theme"
import { monthYear, movingThreshold, type Trend } from "@/lib/trends"

/* The home's trend list, from the 7 Oct 2026 reference: one row for each
   marker, stacked. The name over its latest value and unit with a mark
   (a tick when in range, an arrow when not), a small sparkline, the
   status as a tinted pill over the month of the latest result, and a
   chevron. The whole row opens the marker. */

/** The status pill's wording and colours. */
const PILL = {
  out: { bg: "#FDECEC", text: "#D9363E" },
  borderline: { bg: "#FEF7D6", text: "#93690A" },
  in: { bg: "#E9FAEF", text: "#2F7F4D" },
} as const

/** The status word: which side of the range an out of range result is on
    ("Above target"), else the status's own word. */
const statusWord = (t: Trend) =>
  t.status === "in" ? TONE.in.word : t.side === "above" ? "Above target" : t.side === "below" ? "Below target" : TONE[t.status].word

const SPARK_W = 72
const SPARK_H = 32
const PAD = 2

/** The line through the marker's last results, smooth, with a soft area
    under it. Red when the result is rising away from its range, else the
    status's own colour. */
function Sparkline({ trend: t, w = SPARK_W, h = SPARK_H, dots = false }: { trend: Trend; w?: number; h?: number; dots?: boolean }) {
  const gid = `spark${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const points = recentPoints(t)
  if (points.length < 2) return <View style={{ width: w, height: h }} />
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, movingThreshold(t.marker) * 2)
  const lo = (min + max) / 2 - span / 2
  const edge = dots ? 6 : PAD
  const y = (v: number) => h - edge - ((v - lo) / span) * (h - edge * 2)
  const x = (i: number) => edge + (i * (w - edge * 2)) / (points.length - 1)
  const xy = points.map((p, i) => [x(i), y(p.value)] as const)
  const line = xy
    .map(([px, py], i) => {
      if (!i) return `M${px} ${py}`
      const [ax, ay] = xy[i - 1]
      const mid = (ax + px) / 2
      return `C${mid} ${ay} ${mid} ${py} ${px} ${py}`
    })
    .join(" ")
  const area = `${line} L${xy[xy.length - 1][0]} ${h} L${xy[0][0]} ${h} Z`
  const xs = xy.map(([px]) => px)
  const paint = `url(#${gid}-line)`
  const last = xy.length - 1
  return (
    <View style={{ width: w, height: h }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={`${gid}-line`} gradientUnits="userSpaceOnUse" x1={xs[0]} y1="0" x2={xs[last] + 0.01} y2="0">
            {statusStops(t, xs)}
          </LinearGradient>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.4} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
          <Mask id={`${gid}-mask`} maskUnits="userSpaceOnUse" x={0} y={0} width={w} height={h}>
            <Path d={area} fill={`url(#${gid})`} />
          </Mask>
        </Defs>
        <Rect x={0} y={0} width={w} height={h} fill={paint} mask={`url(#${gid}-mask)`} />
        <Path d={line} stroke={paint} strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {dots &&
          xy.map(([px, py], i) => {
            const c = dotTone(t, points[i]).line
            return <Circle key={points[i].t} cx={px} cy={py} r={i === last ? 3.4 : 2.6} fill={i === last ? c : "#FFFFFF"} stroke={c} strokeWidth={1.2} />
          })}
      </Svg>
    </View>
  )
}

/** A sparkline that fills the width it is given. */
function WideSparkline({ trend }: { trend: Trend }) {
  const [w, setW] = React.useState(0)
  const onLayout = (e: LayoutChangeEvent) => {
    const width = Math.round(e.nativeEvent.layout.width)
    setW((old) => (old === width ? old : width))
  }
  return (
    <View style={styles.wide} onLayout={onLayout}>
      {w > 0 && <Sparkline trend={trend} w={w} h={56} dots />}
    </View>
  )
}

/** The mark after the value: an arrow the way it moves, green in range. */
function Mark({ trend: t }: { trend: Trend }) {
  if (t.status === "in") {
    const Arrow =
      t.movement === "falling" ? ArrowDown : t.movement === "rising" ? ArrowUp : ArrowRight
    return <Arrow size={14} color={TONE.in.edge} weight="bold" />
  }
  const Arrow = t.movement === "falling" ? ArrowDown : ArrowUp
  return <Arrow size={14} color={t.latest ? severityColor(t, t.latest) : TONE.out.edge} weight="bold" />
}

export function TrendTile({ trend, onPress }: { trend: Trend; onPress?: () => void }) {
  const b = trend.marker
  const pill = PILL[trend.status]
  const has = !!trend.latest
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={[trend.spoken, recentWords(trend)].filter(Boolean).join(". ")}
      accessibilityHint={onPress ? "Opens details" : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.words}>
        <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {b.name}
        </Text>
        <View style={styles.valueRow}>
          <Text style={styles.value} maxFontSizeMultiplier={1.3}>
            {has ? trend.value : "No results"}
          </Text>
          {has && !!b.unit && (
            <Text style={styles.unit} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {b.unit}
            </Text>
          )}
          {has && <Mark trend={trend} />}
        </View>
      </View>
      {has && <Sparkline trend={trend} dots />}
      {has && (
        <View style={styles.status}>
          <View style={[styles.pill, { backgroundColor: pill.bg }]}>
            <Text style={[styles.pillText, { color: pill.text }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {statusWord(trend)}
            </Text>
          </View>
          {!!trend.latest && (
            <Text style={styles.date} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {monthYear(trend.latest.t)}
            </Text>
          )}
        </View>
      )}
      <CaretRight size={16} color={card.chevron} weight="bold" />
    </Pressable>
  )
}

/** The home's card: name, value and sparkline over the status and its
    direction in words. Two to a row. */
export function TrendCard({ trend, onPress }: { trend: Trend; onPress?: () => void }) {
  const b = trend.marker
  const has = !!trend.latest
  const tone = TONE[trend.status]
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={[trend.spoken, recentWords(trend)].filter(Boolean).join(". ")}
      accessibilityHint={onPress ? "Opens details" : undefined}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <View style={styles.words}>
          <Text style={styles.cardName} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {b.name}
          </Text>
          <View style={styles.valueRow}>
            <Text style={styles.cardValue} maxFontSizeMultiplier={1.3}>
              {has ? trend.value : "No results"}
            </Text>
            {has && !!b.unit && (
              <Text style={styles.unit} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {b.unit}
              </Text>
            )}
            {has && <Mark trend={trend} />}
          </View>
        </View>
      </View>
      {has && <WideSparkline trend={trend} />}
      {has && (
        <View style={styles.statusBlock}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: tone.fill }]} />
            <Text style={[styles.statusText, { color: tone.edge }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {statusWord(trend)}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  )
}

/** The cards, two to a row, 12 apart; an odd last card keeps its half. */
export function TrendTiles({ trends, onOpen }: { trends: Trend[]; onOpen?: (t: Trend) => void }) {
  const rows: Trend[][] = []
  for (let i = 0; i < trends.length; i += 2) rows.push(trends.slice(i, i + 2))
  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <View key={row.map((t) => t.id).join(":")} style={styles.gridRow}>
          {row.map((t) => (
            <View key={t.id} style={styles.cell}>
              <TrendCard trend={t} onPress={onOpen ? () => onOpen(t) : undefined} />
            </View>
          ))}
          {row.length === 1 && <View style={styles.cell} />}
        </View>
      ))}
    </View>
  )
}

/** The rows stacked, one to a line. */
export function TrendRows({ trends, onOpen }: { trends: Trend[]; onOpen?: (t: Trend) => void }) {
  return (
    <View style={styles.list}>
      {trends.map((t) => (
        <TrendTile key={t.id} trend={t} onPress={onOpen ? () => onOpen(t) : undefined} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: space.item },
  pressed: { opacity: 0.8 },
  gridRow: { flexDirection: "row", gap: space.item, alignItems: "stretch" },
  cell: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: "#EEF0F2",
    padding: space.card,
    gap: space.item,
    boxShadow: card.shadow,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  wide: { height: 56 },
  cardName: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: ink.detail },
  cardValue: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, color: ink.strong, fontVariant: ["tabular-nums"] },
  statusBlock: { gap: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  directionRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  direction: { flexShrink: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink.secondary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    backgroundColor: "#FFFFFF",
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: "#EEF0F2",
    paddingVertical: space.card,
    paddingHorizontal: space.card,
    boxShadow: card.shadow,
  },
  words: { flex: 1, gap: 4, minWidth: 0 },
  name: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: ink.detail },
  valueRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  value: { fontFamily: font.semibold, fontSize: 20, lineHeight: 26, color: ink.strong, fontVariant: ["tabular-nums"] },
  unit: { flexShrink: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink.secondary },
  spark: { width: SPARK_W, height: SPARK_H },
  status: { alignItems: "flex-start", gap: 4 },
  pill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  date: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink.secondary, paddingLeft: 2 },
})
