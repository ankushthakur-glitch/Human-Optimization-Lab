import * as React from "react"
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native"

import { Flag, Heart, Lightbulb, PencilSimple, RocketLaunch, Target, Trophy } from "@/components/ph"
import { Tile } from "@/components/record-kit"
import { own, spoken, type Answers } from "@/lib/conversation"
import { card, color, hairline, ink, space, type } from "@/lib/theme"

/* The patient's why, as it goes into the care plan: their reason on top,
   then one row per answer on its round teal tile, on the Figma "Hol" card.
   Every answer opens to be edited. */

export type WhyKey = "reason" | "values" | "focus" | "why" | "commitment" | "easier" | "obstacle" | "solution" | "success"

export const WHY_LABELS: Record<WhyKey, string> = {
  reason: "My reason for being healthy",
  values: "What matters most to me",
  focus: "What I want to work on first",
  why: "Why it matters",
  commitment: "My first commitment",
  easier: "To make it easier",
  obstacle: "My biggest obstacle",
  solution: "My solution",
  success: "What success will look like",
}

type PhIcon = React.ComponentType<{ size?: number; color?: string }>

const ROWS: { key: Exclude<WhyKey, "reason">; icon: PhIcon }[] = [
  { key: "values", icon: Heart },
  { key: "focus", icon: Target },
  { key: "why", icon: Lightbulb },
  { key: "commitment", icon: Flag },
  { key: "easier", icon: RocketLaunch },
  { key: "obstacle", icon: Flag },
  { key: "solution", icon: Lightbulb },
  { key: "success", icon: Trophy },
]

/** Where each answer on the card is kept: a field, or the reply to a turn. */
const WHY_TURN = (a: Answers) => (own(a, "whyImportant") ? "whyImportant" : "worries")

export function whyValue(a: Answers, key: WhyKey): string {
  switch (key) {
    case "reason":
      return a.reason.trim()
    case "values":
      return Array.isArray(a.values) ? spoken(a.values) : a.values.trim()
    case "focus":
      return a.focus ?? ""
    case "why":
      return own(a, WHY_TURN(a))
    case "commitment":
      return a.step.trim()
    default:
      return own(a, key)
  }
}

/** The answers with one of the card's values replaced. */
export function withWhy(a: Answers, key: WhyKey, value: string): Answers {
  switch (key) {
    case "reason":
      return { ...a, reason: value }
    case "values":
      return { ...a, values: value }
    case "focus":
      return { ...a, focus: value }
    case "commitment":
      return { ...a, step: value }
    case "why":
      return { ...a, said: { ...a.said, [WHY_TURN(a)]: value } }
    default:
      return { ...a, said: { ...a.said, [key]: value } }
  }
}

export function WhyCard({ a, onEdit }: { a: Answers; onEdit?: (key: WhyKey) => void }) {
  const rows = ROWS.map((r) => ({ ...r, value: whyValue(a, r.key) })).filter((r) => !!r.value)
  return (
    <View style={styles.card}>
      <Pressable onPress={onEdit && (() => onEdit("reason"))} disabled={!onEdit} style={styles.head} accessibilityRole="button">
        <View style={styles.between}>
          <Text style={styles.label}>{WHY_LABELS.reason}</Text>
          {onEdit && <Pencil />}
        </View>
        <Text style={styles.reason}>{a.reason}</Text>
      </Pressable>
      <View style={styles.pad}>
        {rows.map((r, i) => (
          <Reveal key={r.key} index={i}>
            <Pressable
              onPress={onEdit && (() => onEdit(r.key))}
              disabled={!onEdit}
              style={({ pressed }) => [styles.row, i < rows.length - 1 && styles.rule, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Tile>
                <r.icon size={16} color={color.primary} />
              </Tile>
              <View style={styles.text}>
                <Text style={styles.label}>{WHY_LABELS[r.key]}</Text>
                <Text style={styles.value}>{r.value}</Text>
              </View>
              {onEdit && <Pencil />}
            </Pressable>
          </Reveal>
        ))}
      </View>
    </View>
  )
}

const Pencil = () => <PencilSimple size={16} color={card.chevron} />

/** Fades and lifts in, `index` steps after the card appears. */
function Reveal({ index, children }: { index: number; children: React.ReactNode }) {
  const v = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 360, delay: 80 + index * 55, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [v, index])
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  // The Figma "Hol" card: white at 60%, radius 8, 12 inside, the softest lift.
  card: {
    backgroundColor: card.fill,
    borderRadius: 8,
    overflow: "hidden",
    marginVertical: space.stack,
    boxShadow: card.shadow,
  },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item },
  head: {
    marginHorizontal: space.card,
    paddingTop: space.card,
    paddingBottom: space.rowY,
    gap: space.stack,
    borderBottomWidth: 0.8,
    borderBottomColor: hairline.rule,
  },
  reason: { ...type.section, color: ink.content },
  pad: { paddingHorizontal: space.card },
  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
  rule: { borderBottomWidth: 0.8, borderBottomColor: hairline.rule },
  pressed: { opacity: 0.6 },
  text: { flex: 1, gap: space.stack },
  label: { ...type.label },
  value: { ...type.title },
})
