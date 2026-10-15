import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { PlanStepPage } from "@/components/plan-steps"
import { useOnboarding } from "@/lib/onboarding"
import { DOMAINS, SCALE, THINKING_ABOUT, firstOpen } from "@/lib/wellbeing"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* Setup's life questions, page 2: one question at a time, 1 to 10, a part
   of life each, in the same frame as the plan's steps (components/
   plan-steps.tsx): the part of life in the header (no step counter), the
   question as the heading, Skip and Continue in the foot (Back is the
   header's caret and the swipe). A tap
   picks a number and Continue saves it and moves on; Skip moves on
   without one. The caret goes to the question before (the first goes back to
   the intro). Every answer is saved as it is picked, so a patient who
   closes the app comes back to the question she stopped at. */

/** 1 to 10, five to a row: 1 to 5, then 6 to 10. */
const PER_ROW = 5
const NUMBERS = SCALE.filter((n) => n > 0)
const ROWS = [NUMBERS.slice(0, PER_ROW), NUMBERS.slice(PER_ROW)]

export default function LifeQuestionScreen() {
  const onboarding = useOnboarding()
  const [at, setAt] = React.useState(() => firstOpen(onboarding.life?.ratings ?? {}))
  const domain = DOMAINS[at]
  const last = at === DOMAINS.length - 1
  const ratings = onboarding.life?.ratings ?? {}
  const value = ratings[domain.key]

  const pick = (n: number) => onboarding.save({ life: { ...onboarding.life, ratings: { ...ratings, [domain.key]: n }, skipped: false } })
  const move = () => {
    if (last) router.push("/onboarding/life-focus")
    else setAt(at + 1)
  }
  const back = () => (at === 0 ? router.back() : setAt(at - 1))

  return (
    <PlanStepPage
      headerTitle={domain.short}
      title={domain.question}
      lead={THINKING_ABOUT}
      onBack={back}
      skip={move}
      noBack
      onNext={move}
      nextDisabled={value === undefined}
    >
      <View style={styles.ends}>
        <Text style={styles.end}>1 · Very poor</Text>
        <Text style={styles.end}>Excellent · 10</Text>
      </View>
      <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel={domain.question}>
        {ROWS.map((row, r) => (
          <View key={r} style={styles.row}>
            {Array.from({ length: PER_ROW }, (_, i) => {
              const n = row[i]
              if (n === undefined) return <View key={i} style={styles.cell} />
              const on = n === value
              return (
                <Pressable
                  key={n}
                  onPress={() => pick(n)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${n}${n === 1 ? ", very poor" : n === 10 ? ", excellent" : ""}`}
                  style={({ pressed }) => [styles.cell, styles.number, on && styles.numberOn, pressed && !on && styles.pressed]}
                >
                  <Text style={[styles.numberText, on && styles.numberTextOn]}>{n}</Text>
                </Pressable>
              )
            })}
          </View>
        ))}
      </View>
    </PlanStepPage>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  ends: { flexDirection: "row", justifyContent: "space-between", marginTop: space.inline, marginBottom: space.mark },
  end: { ...type.label },
  grid: { gap: space.inline },
  row: { flexDirection: "row", gap: space.inline },
  cell: { flex: 1, height: 52 },
  number: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  // Chosen, as a goal is on the plan's first step: edged in teal on a light green.
  numberOn: { borderColor: color.primary, backgroundColor: "#E5F4F1" },
  numberText: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, color: ink.content },
  numberTextOn: { color: ink.primary },
})
