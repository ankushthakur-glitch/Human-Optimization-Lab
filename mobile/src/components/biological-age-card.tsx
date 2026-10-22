import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { CaretRight } from "@/components/ph"
import { Sparkline } from "@/components/trend-tile"
import { biologicalAge, biologicalAgeTrend, changeLabel, drivers } from "@/lib/biological-age"
import { useMarkers } from "@/lib/experience"
import { chart, color, font, ink, space, type } from "@/lib/theme"

/* The teal Biological age card, the client's reference: the number on the
   left under a small BIOLOGICAL cap, a red "7 years older" pill, and one
   plain sentence, then a small trend of the last year with its change in
   words (21 Oct 2026 call). It is the hero of the biological age sheet and, with a
   caret and an onPress, the card on the dashboard that opens that sheet. The
   number is a sample until the model exists (lib/biological-age.ts). */

/** The most drivers the sentence counts: the reference's four. */
export const MOST_DRIVERS = 4

const WORDS = ["No", "One", "Two", "Three", "Four"] as const

const years = (n: number) => `${n} ${n === 1 ? "year" : "years"}`

/** The card's sentence: how far off she is, and what accounts for it. */
export function useBiologicalAge() {
  const markers = useMarkers()
  const { calendar, biological, gap } = React.useMemo(() => biologicalAge(), [])
  const list = React.useMemo(() => drivers(markers).slice(0, MOST_DRIVERS), [markers])
  const trend = React.useMemo(() => biologicalAgeTrend(), [])
  const change = changeLabel(trend)

  const older = gap > 0
  const lede = older
    ? `Your body tests older than your ${years(calendar)}.${
        list.length > 0
          ? ` ${WORDS[list.length]} ${list.length === 1 ? "number drives" : "numbers drive"} most of it, and ${
              list.length === 1 ? "it is" : "all are"
            } movable.`
          : ""
      }`
    : gap < 0
      ? `Your body tests younger than your ${years(calendar)}.`
      : `Your body tests the same as your ${years(calendar)}.`

  return { calendar, biological, gap, older, lede, list, trend, change }
}

/** `trend` off where the full graph follows (the sheet). */
export function BiologicalAgeCard({ onPress, hint, trend: showTrend = true }: { onPress?: () => void; hint?: string; trend?: boolean }) {
  const { biological, gap, older, lede, trend, change } = useBiologicalAge()
  const withTrend = showTrend && trend.count > 1
  const label = [
    `Biological age ${biological}${gap !== 0 ? `, ${years(Math.abs(gap))} ${older ? "older" : "younger"}` : ""}. ${lede}`,
    withTrend && change ? `${change}.` : "",
  ]
    .filter(Boolean)
    .join(" ")

  const top = (
    <View style={styles.top}>
      <View style={styles.number}>
        <Text style={styles.cap}>BIOLOGICAL</Text>
        <Text style={styles.value} maxFontSizeMultiplier={1.2}>
          {biological}
        </Text>
      </View>
      <View style={styles.divider} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden />
      <View style={styles.text}>
        {gap !== 0 && (
          <View style={styles.pill}>
            <Text style={styles.pillText} maxFontSizeMultiplier={1.3}>
              {years(Math.abs(gap))} {older ? "older" : "younger"}
            </Text>
          </View>
        )}
        <Text style={styles.lede} maxFontSizeMultiplier={1.3}>
          {lede}
        </Text>
      </View>
      {onPress && (
        <View style={styles.caret} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <CaretRight size={16} color={ink.onColor} />
        </View>
      )}
    </View>
  )

  const body = (
    <>
      {top}
      {withTrend && (
        <View style={styles.trend} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Sparkline trend={trend} w={88} h={28} dots />
          {!!change && (
            <Text style={styles.change} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {change}
            </Text>
          )}
        </View>
      )}
    </>
  )

  if (!onPress)
    return (
      <View style={styles.card} accessible accessibilityLabel={label}>
        {body}
      </View>
    )
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      android_ripple={{ color: "rgba(255,255,255,0.2)" }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.item, padding: space.card, minHeight: 68, borderRadius: 8, backgroundColor: color.primary },
  top: { flexDirection: "row", alignItems: "center", gap: space.item },
  // A light strip, so the status colours read as they do on every other graph.
  trend: { flexDirection: "row", alignItems: "center", gap: space.item, paddingVertical: 6, paddingHorizontal: space.item, borderRadius: 6, backgroundColor: color.background },
  change: { ...type.metaStrong, flexShrink: 1 },
  pressed: { opacity: 0.9 },
  number: { gap: 2 },
  divider: { alignSelf: "stretch", width: StyleSheet.hairlineWidth * 2, backgroundColor: "rgba(255,255,255,0.45)" },
  cap: { fontFamily: font.medium, fontSize: 10, lineHeight: 14, letterSpacing: 1, color: ink.onColor },
  value: { fontFamily: font.semibold, fontSize: 44, lineHeight: 48, color: ink.onColor, fontVariant: ["tabular-nums"] },
  // The right side stays narrower than the card leaves it: a measure cap and a
  // little room before the caret, so the sentence sits balanced, not edge to edge.
  text: { flex: 1, maxWidth: 232, gap: space.inline, alignItems: "flex-start", paddingRight: space.inline },
  caret: { marginLeft: "auto" },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: chart.outside },
  pillText: { fontFamily: font.medium, fontSize: 11, lineHeight: 16, color: ink.onColor },
  lede: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink.onColor },
})
