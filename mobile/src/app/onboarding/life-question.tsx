import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { RECORD_READY } from "@/app/onboarding/syncing"
import { PlanStepPage } from "@/components/plan-steps"
import { useOnboarding } from "@/lib/onboarding"
import { SCALE, THINKING_ABOUT } from "@/lib/wellbeing"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* Setup's "What Matters Most", page 2: one of the three symptoms she chose
   on the page before, a question each, 1 to 10, in the same frame as the
   plan's steps (components/plan-steps.tsx): the symptom in the header (no
   step counter), the question as the heading, Skip and Continue in the foot
   (Back is the header's caret and the swipe). A tap picks a number and
   Continue saves it and moves on; Skip moves on without one. The caret goes
   to the symptom before (the first goes back to the choice). Every rating
   is saved as it is picked. The last one starts the record building. */

/** 1 to 10, five to a row: 1 to 5, then 6 to 10. */
const PER_ROW = 5
const NUMBERS = SCALE.filter((n) => n > 0)
const ROWS = [NUMBERS.slice(0, PER_ROW), NUMBERS.slice(PER_ROW)]

const asked = (symptom: string) => `How much has ${symptom.toLowerCase()} bothered you?`

export default function SymptomRatingScreen() {
  const onboarding = useOnboarding()
  const symptoms = onboarding.life?.symptoms ?? []
  const ratings = onboarding.life?.symptomRatings ?? {}
  const [at, setAt] = React.useState(0)
  const symptom = symptoms[at]
  const last = at === symptoms.length - 1
  const value = symptom === undefined ? undefined : ratings[symptom]

  // Nothing chosen (opened directly): on to the record building.
  React.useEffect(() => {
    if (symptoms.length === 0) router.replace(RECORD_READY)
  }, [symptoms.length])
  if (symptom === undefined) return null

  const pick = (n: number) => onboarding.save({ life: { ...onboarding.life, ratings: onboarding.life?.ratings ?? {}, symptomRatings: { ...ratings, [symptom]: n } } })
  const move = () => {
    if (!last) return setAt(at + 1)
    onboarding.save({ step: "records" })
    router.push(RECORD_READY)
  }
  const back = () => (at === 0 ? router.back() : setAt(at - 1))

  return (
    <PlanStepPage
      headerTitle={symptom}
      title={asked(symptom)}
      lead={THINKING_ABOUT}
      onBack={back}
      skip={move}
      noBack
      onNext={move}
      nextDisabled={value === undefined}
    >
      <View style={styles.ends}>
        <Text style={styles.end}>1 · Not at all</Text>
        <Text style={styles.end}>Very much · 10</Text>
      </View>
      <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel={asked(symptom)}>
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
                  accessibilityLabel={`${n}${n === 1 ? ", not at all" : n === 10 ? ", very much" : ""}`}
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
