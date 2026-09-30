import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { IconChevronRight } from "@/components/icons"
import { color, font } from "@/lib/theme"

/* The list the signed-in screens share, in Superpower's manner: one soft
   grey card with no outline, rows split by faint rules, each with an
   optional icon tile, a title, a meta line and something on the right. A
   row with `onPress` gets a chevron, or `action` in teal in its place. */

export function List({ children }: { children: React.ReactNode }) {
  const rows = React.Children.toArray(children).filter(Boolean)
  return (
    <View style={styles.list}>
      {rows.map((row, i) => (
        <View key={i} style={i < rows.length - 1 && styles.rule}>
          {row}
        </View>
      ))}
    </View>
  )
}

/** A teal tinted square holding an icon; `tone` greys it or warms it. */
export function IconTile({
  children,
  tone = "primary",
  size = 34,
}: {
  children: React.ReactNode
  tone?: "primary" | "muted" | "high" | "low" | "solid"
  size?: number
}) {
  const bg = {
    primary: color.primaryTint,
    // White, so it still reads on the list's grey card.
    muted: color.background,
    high: color.highTint,
    low: color.lowTint,
    solid: color.primary,
  }[tone]
  return <View style={[styles.tile, { width: size, height: size, borderRadius: size / 3.2, backgroundColor: bg }]}>{children}</View>
}

export function ListRow({
  icon,
  label,
  title,
  meta,
  note,
  right,
  onPress,
  action,
  accessibilityLabel,
}: {
  icon?: React.ReactNode
  /** Small text above the title, naming what the title answers, e.g. "How long". */
  label?: string
  title: string
  meta?: string
  /** A second line in colour, e.g. a difference between two lists. */
  note?: { text: string; tone?: "high" | "low" | "primary" | "muted" }
  right?: React.ReactNode
  onPress?: () => void
  /** Words for the tap, e.g. "Change", shown instead of the chevron. */
  action?: string
  accessibilityLabel?: string
}) {
  const noteColor = { high: color.high, low: color.low, primary: color.primary, muted: color.muted }[note?.tone ?? "low"]
  const body = (
    <>
      {icon}
      <View style={styles.body}>
        {!!label && <Text style={styles.meta}>{label}</Text>}
        <Text style={styles.title}>{title}</Text>
        {!!meta && <Text style={styles.meta}>{meta}</Text>}
        {!!note && <Text style={[styles.note, { color: noteColor }]}>{note.text}</Text>}
      </View>
      {right}
      {onPress && (action ? <Text style={styles.action}>{action}</Text> : <IconChevronRight size={16} color={color.muted} />)}
    </>
  )
  if (!onPress) return <View style={styles.row}>{body}</View>
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  )
}

/** A number on the right of a row. */
export const Count = ({ children }: { children: React.ReactNode }) => <Text style={styles.count}>{children}</Text>

const styles = StyleSheet.create({
  list: { backgroundColor: color.canvas, borderRadius: 20, paddingHorizontal: 16 },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E3E3E0" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  pressed: { opacity: 0.6 },
  tile: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 2 },
  title: { fontFamily: font.medium, fontSize: 15, lineHeight: 20, letterSpacing: -0.1, color: color.text },
  meta: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.muted },
  note: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 17 },
  action: { fontFamily: font.semibold, fontSize: 14, color: color.primary },
  count: { fontFamily: font.semibold, fontSize: 15, color: color.text },
})
