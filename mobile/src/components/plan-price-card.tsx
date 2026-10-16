import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"

import { font, ink, space, type } from "@/lib/theme"

/* The plan's price on a deep teal card (the upgrade flow's "Weight &
   metabolic optimization" card). Two columns: the plan's name with how it
   is billed under it on the left; the price stacked at the right, aligned
   to the card's right edge: the full price struck through (when there is a
   saving), the price in large type, then its period ("/ year"). Used by
   the enrollment step's PlanCard; any screen that shows a plan and its
   price can use it. */

export function PlanPriceCard({
  name,
  note,
  price,
  was,
  period,
  style,
}: {
  /** The plan, e.g. "Weight & metabolic optimization". */
  name: string
  /** How it is billed, e.g. "Billed yearly · cancel any time, no contract". */
  note?: string
  /** What she pays, already formatted: "$1,080". */
  price: string
  /** The price without the saving, struck through above it: "$1,200". */
  was?: string
  /** What the price covers: "/ year", "/ month". */
  period: string
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View
      style={[styles.card, style]}
      accessible
      accessibilityLabel={`${name}. ${note ? `${note}. ` : ""}${was ? `Was ${was}, now ` : ""}${price} ${period.replace("/", "per")}`}
    >
      <View style={styles.words}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        {!!note && (
          <Text style={styles.note} numberOfLines={2}>
            {note}
          </Text>
        )}
      </View>
      <View style={styles.price}>
        {!!was && <Text style={styles.was}>{was}</Text>}
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {price}
        </Text>
        <Text style={styles.period}>{period}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    padding: space.gutter,
    borderRadius: 14,
    backgroundColor: ink.primary,
  },
  // Takes what the price leaves; the name wraps rather than shrinks.
  words: { flex: 1, minWidth: 0, gap: space.stack },
  name: { ...type.section, color: ink.onColor },
  note: { ...type.label, color: "rgba(255, 255, 255, 0.82)" },
  // Right-aligned, so the digits end on the card's edge in both billings.
  price: { flexShrink: 0, alignItems: "flex-end" },
  was: {
    ...type.label,
    color: "rgba(255, 255, 255, 0.7)",
    textDecorationLine: "line-through",
    fontVariant: ["tabular-nums"],
  },
  value: {
    fontFamily: font.semibold,
    fontSize: 28,
    lineHeight: 34,
    color: ink.onColor,
    fontVariant: ["tabular-nums"],
  },
  period: { ...type.label, color: "rgba(255, 255, 255, 0.82)" },
})
