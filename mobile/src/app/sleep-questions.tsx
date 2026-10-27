import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native"

import { PlanStepPage } from "@/components/plan-steps"
import { HUE } from "@/components/record-kit"
import { useOnboarding } from "@/lib/onboarding"
import { STOP, type SleepAnswers } from "@/lib/sleep-screen"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* The sleep apnea screen (STOP-BANG, 26 Oct call), after the flourishing
   result (/flourishing-result), in the flourishing questions' frame: one
   question a page, only the four STOP questions about her sleep (BMI, age
   and sex come from her record, lib/sleep-screen.ts). Over it a "Your
   sleep" chip, "3 of 4" and a thin bar. The question is the heading; under
   it Yes and No as two big buttons. A tap picks and moves on by itself a
   moment later; Continue does the same. Every answer is saved as it is
   tapped, and she picks up at the first one left; `?q=` opens a given
   question. The last question opens her result (/sleep-result). */

const TOTAL = STOP.length
const native = Platform.OS !== "web"
/** How long a picked answer shows before the next question slides in, ms. */
const ADVANCE_MS = 380

const PART = { name: "Your sleep", hue: "violet" } as const

const answered = (v: boolean | undefined) => typeof v === "boolean"

export default function SleepQuestionsScreen() {
  const onboarding = useOnboarding()
  const params = useLocalSearchParams<{ q?: string }>()
  const [answers, setAnswers] = React.useState<SleepAnswers>(() => onboarding.sleepScreen ?? {})
  // Opens on the question asked for, else the first one left.
  const [at, setAt] = React.useState(() => {
    const asked = Number(params.q)
    if (asked >= 1 && asked <= TOTAL) return asked - 1
    const open = STOP.findIndex((i) => !answered(answers[i.id]))
    return open < 0 ? 0 : open
  })
  const enter = React.useRef(new Animated.Value(1)).current
  const advance = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  React.useEffect(() => () => clearTimeout(advance.current), [])

  const item = STOP[at]
  const value = answers[item.id]
  const last = at === TOTAL - 1
  const done = answered(value)

  function pick(yes: boolean) {
    const next = { ...answers, [item.id]: yes }
    setAnswers(next)
    onboarding.save({ sleepScreen: next }).catch(() => {})
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
      headerTitle="Sleep"
      onBack={() => (at === 0 ? router.back() : go(at - 1))}
      onNext={() => (last ? router.push("/sleep-result") : go(at + 1))}
      nextLabel={last ? "See my result" : "Continue"}
      nextDisabled={!done}
    >
      <View style={styles.progress}>
        <View style={styles.progressTop}>
          <View style={[styles.chip, { backgroundColor: HUE[PART.hue].tint }]}>
            <View style={[styles.chipDot, { backgroundColor: HUE[PART.hue].ink }]} />
            <Text style={[styles.chipText, { color: HUE[PART.hue].ink }]}>{PART.name}</Text>
          </View>
          <Text style={styles.count} accessibilityLabel={`Question ${at + 1} of ${TOTAL}`}>{`${at + 1} of ${TOTAL}`}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.bar, { width: `${((at + (done ? 1 : 0)) / TOTAL) * 100}%` }]} />
        </View>
      </View>

      <Animated.View
        style={[styles.body, { transform: [{ translateX: enter.interpolate({ inputRange: [0, 1, 2], outputRange: [28, 0, -28] }) }] }]}
      >
        <Text style={styles.question} accessibilityRole="header">
          {item.text}
        </Text>

        <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={item.text}>
          {[true, false].map((yes) => {
            const chosen = value === yes
            return (
              <Pressable
                key={String(yes)}
                onPress={() => pick(yes)}
                accessibilityRole="radio"
                accessibilityState={{ checked: chosen }}
                style={({ pressed }) => [styles.answer, chosen && styles.answerOn, pressed && !chosen && styles.answerPressed]}
              >
                <Text style={[styles.answerText, chosen && styles.answerTextOn]}>{yes ? "Yes" : "No"}</Text>
              </Pressable>
            )
          })}
        </View>
      </Animated.View>
    </PlanStepPage>
  )
}

const styles = StyleSheet.create({
  progress: { gap: space.inline, marginTop: space.line },
  progressTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  count: { ...type.label, fontVariant: ["tabular-nums"] },
  track: { height: 4, borderRadius: 2, overflow: "hidden", backgroundColor: hairline.outline },
  bar: { height: 4, borderRadius: 2, backgroundColor: color.primary },

  body: { gap: space.section, marginTop: space.section },
  question: { fontFamily: font.semibold, fontSize: 19, lineHeight: 25, letterSpacing: -0.2, color: ink.strong },

  row: { flexDirection: "row", gap: space.inline },
  answer: { flex: 1, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.background },
  answerOn: { borderColor: color.primary, backgroundColor: color.primary, transform: [{ scale: 1.04 }] },
  answerPressed: { backgroundColor: color.primaryTint },
  answerText: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, color: ink.strong },
  answerTextOn: { color: color.onPrimary },
})
