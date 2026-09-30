import Award01Icon from "@hugeicons/core-free-icons/Award01Icon"
import FavouriteIcon from "@hugeicons/core-free-icons/FavouriteIcon"
import Flag02Icon from "@hugeicons/core-free-icons/Flag02Icon"
import Idea01Icon from "@hugeicons/core-free-icons/Idea01Icon"
import PencilEdit02Icon from "@hugeicons/core-free-icons/PencilEdit02Icon"
import Rocket01Icon from "@hugeicons/core-free-icons/Rocket01Icon"
import Target02Icon from "@hugeicons/core-free-icons/Target02Icon"
import * as React from "react"
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native"

import { HugeIcon, type IconSvgObject } from "@/components/hugeicon"
import { IconTile } from "@/components/list"
import { own, spoken, type Answers } from "@/lib/conversation"
import { color, font } from "@/lib/theme"

/* The patient's why, as it goes into the care plan: their reason on top,
   then one row per answer with its icon. Every answer opens to be edited. */

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

const ROWS: { key: Exclude<WhyKey, "reason">; icon: IconSvgObject }[] = [
  { key: "values", icon: FavouriteIcon },
  { key: "focus", icon: Target02Icon },
  { key: "why", icon: Idea01Icon },
  { key: "commitment", icon: Flag02Icon },
  { key: "easier", icon: Rocket01Icon },
  { key: "obstacle", icon: Flag02Icon },
  { key: "solution", icon: Idea01Icon },
  { key: "success", icon: Award01Icon },
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
              <IconTile size={32}>
                <HugeIcon icon={r.icon} size={15} color={color.primary} />
              </IconTile>
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

const Pencil = () => <HugeIcon icon={PencilEdit02Icon} size={15} color={color.muted} />

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
  card: {
    backgroundColor: color.background,
    borderRadius: 24,
    overflow: "hidden",
    marginVertical: 4,
    boxShadow: "0 1px 3px rgba(16, 24, 40, 0.10), 0 12px 32px rgba(16, 24, 40, 0.14)",
  },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  head: {
    marginHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  reason: { fontFamily: font.semibold, fontSize: 15.5, lineHeight: 21, letterSpacing: -0.1, color: color.text },
  pad: { paddingHorizontal: 20, paddingBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16 },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  pressed: { opacity: 0.6 },
  text: { flex: 1, gap: 3 },
  label: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: color.muted },
  value: { fontFamily: font.medium, fontSize: 15, lineHeight: 20, color: color.text },
})
