import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native"

import { PlanStepPage } from "@/components/plan-steps"
import { HUE } from "@/components/record-kit"
import { FLOURISH } from "@/lib/conversation"
import { AREAS, demoToResult } from "@/lib/flourishing"
import { useOnboarding } from "@/lib/onboarding"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* The Inlay Human Flourishing Assessment as a questionnaire (not the
   assistant's chat): opened by "Start the questions" on "Are you
   flourishing?" (/flourishing). One question a page. Over it, the part of
   life it belongs to as a coloured chip, "3 of 39" and a thin bar. The
   question is the heading; under it the 1 to 10 scale as ten big buttons,
   five to a row, 1 "Not at all" and 10 "Completely". A tap picks a number
   and moves on by itself a moment later; Continue does the same. The one
   optional question also has "Prefer not to answer". Every answer is saved
   as it is tapped, into the same place the chat kept them, so she picks up
   where she stopped; `?q=` opens a given question (for review). The last
   question opens her result (/flourishing-result). Demo only: tapping
   "Flourishing" in the header jumps to the result (demoToResult). */

const NUMBERS = Array.from({ length: 10 }, (_, i) => i + 1)
const ROWS = [NUMBERS.slice(0, 5), NUMBERS.slice(5)]
const TOTAL = FLOURISH.length
const native = Platform.OS !== "web"
/** How long a picked number shows before the next question slides in, ms. */
const ADVANCE_MS = 380

const answered = (v: number | undefined) => typeof v === "number"

export default function FlourishingQuestionsScreen() {
  const onboarding = useOnboarding()
  const params = useLocalSearchParams<{ q?: string }>()
  const [answers, setAnswers] = React.useState<number[]>(() => onboarding.why?.flourish ?? [])
  // Opens on the question asked for, else the first one left.
  const [at, setAt] = React.useState(() => {
    const asked = Number(params.q)
    if (asked >= 1 && asked <= TOTAL) return asked - 1
    const open = FLOURISH.findIndex((_, i) => !answered(answers[i]))
    return open < 0 ? 0 : open
  })
  const enter = React.useRef(new Animated.Value(1)).current
  const advance = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  React.useEffect(() => () => clearTimeout(advance.current), [])

  const item = FLOURISH[at]
  const area = AREAS[item.domain]
  const value = answers[at]
  const last = at === TOTAL - 1
  const done = answered(value)

  function pick(v: number) {
    const next = [...answers]
    next[at] = v
    setAnswers(next)
    onboarding.save({ why: { ...onboarding.why, flourish: next } }).catch(() => {})
    clearTimeout(advance.current)
    if (!last) advance.current = setTimeout(() => go(at + 1), ADVANCE_MS)
  }

  // Each question slides in from the side it comes from.
  function go(to: number) {
    clearTimeout(advance.current)
    setAt(to)
    enter.setValue(to > at ? 0 : 2)
    Animated.timing(enter, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start()
  }

  return (
    <PlanStepPage
      headerTitle="Flourishing"
      onTitlePress={() => void demoToResult(onboarding)}
      onBack={() => (at === 0 ? router.back() : go(at - 1))}
      onNext={() => (last ? router.push("/flourishing-result") : go(at + 1))}
      nextLabel={last ? "See my result" : "Continue"}
      nextDisabled={!done}
    >
      <View style={styles.progress}>
        <View style={styles.progressTop}>
          <View style={[styles.chip, { backgroundColor: HUE[area.hue].tint }]}>
            <View style={[styles.chipDot, { backgroundColor: HUE[area.hue].ink }]} />
            <Text style={[styles.chipText, { color: HUE[area.hue].ink }]}>{area.name}</Text>
          </View>
          <Text style={styles.count} accessibilityLabel={`Question ${at + 1} of ${TOTAL}`}>{`${at + 1} of ${TOTAL}`}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.bar, { width: `${((at + (done ? 1 : 0)) / TOTAL) * 100}%` }]} />
        </View>
      </View>

      <Animated.View
        style={[
          styles.body,
          {
            // A slide only, never a fade: an interrupted fade left the
            // question invisible.
            transform: [{ translateX: enter.interpolate({ inputRange: [0, 1, 2], outputRange: [28, 0, -28] }) }],
          },
        ]}
      >
        <Text style={styles.question} accessibilityRole="header">
          {item.text}
        </Text>

        <View style={styles.scale} accessibilityRole="radiogroup" accessibilityLabel={item.text}>
          {ROWS.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((n) => {
                const chosen = value === n
                return (
                  <Pressable
                    key={n}
                    onPress={() => pick(n)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: chosen }}
                    accessibilityLabel={`${n} of 10${n === 1 ? ", not at all" : n === 10 ? ", completely" : ""}`}
                    style={({ pressed }) => [styles.number, chosen && styles.numberOn, pressed && !chosen && styles.numberPressed]}
                  >
                    <Text style={[styles.numberText, chosen && styles.numberTextOn]}>{n}</Text>
                  </Pressable>
                )
              })}
            </View>
          ))}
          <View style={styles.ends}>
            <Text style={styles.end}>1 Not at all</Text>
            <Text style={styles.end}>10 Completely</Text>
          </View>
        </View>

        {item.optional && (
          <Pressable onPress={() => pick(-1)} accessibilityRole="radio" accessibilityState={{ checked: value === -1 }} hitSlop={6} style={({ pressed }) => [styles.prefer, value === -1 && styles.preferOn, pressed && styles.pressed]}>
            <Text style={[styles.preferText, value === -1 && styles.preferTextOn]}>Prefer not to answer</Text>
          </Pressable>
        )}
      </Animated.View>
    </PlanStepPage>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  progress: { gap: space.inline, marginTop: space.line },
  progressTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  count: { ...type.label, fontVariant: ["tabular-nums"] },
  track: { height: 4, borderRadius: 2, overflow: "hidden", backgroundColor: hairline.outline },
  bar: { height: 4, borderRadius: 2, backgroundColor: color.primary },

  body: { gap: space.section, marginTop: space.section },
  question: { fontFamily: font.semibold, fontSize: 22, lineHeight: 29, letterSpacing: -0.2, color: ink.strong },

  scale: { gap: space.inline },
  row: { flexDirection: "row", gap: space.inline },
  number: { flex: 1, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.background },
  numberOn: { borderColor: color.primary, backgroundColor: color.primary, transform: [{ scale: 1.04 }] },
  numberPressed: { backgroundColor: color.primaryTint },
  numberText: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, color: ink.strong, fontVariant: ["tabular-nums"] },
  numberTextOn: { color: color.onPrimary },
  ends: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  end: { ...type.meta },

  prefer: { alignSelf: "center", paddingVertical: 8, paddingHorizontal: space.item, borderRadius: 999, borderWidth: 1, borderColor: hairline.edge },
  preferOn: { borderColor: color.primary, backgroundColor: color.primaryTint },
  preferText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: ink.secondary },
  preferTextOn: { color: color.primary },
})
