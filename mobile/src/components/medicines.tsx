import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { Badge } from "@/components/flow"
import { IconCheck } from "@/components/icons"
import { useOnboarding } from "@/lib/onboarding"
import { MED_ANSWER_LABEL, MEDICATIONS, ORIGIN_LABEL, medDifference, type MedAnswer } from "@/lib/record"
import { color, font } from "@/lib/theme"

/* The patient's side of medicine reconciliation: every medicine and
   supplement from every list, the doctor's line first as the true one, any
   difference called out, and the patient's answer: taking it, not taking
   it, or taking it differently. A difference the doctor already settled
   stays in the record, greyed, and asks nothing. */

const ANSWERS: MedAnswer[] = ["taking", "not", "different"]
const SHORT: Record<MedAnswer, string> = { taking: "Taking", not: "Not taking", different: "Differently" }

export function MedicineList() {
  const onboarding = useOnboarding()
  const answers = onboarding.meds ?? {}
  const set = (id: string, a: MedAnswer) => onboarding.save({ meds: { ...answers, [id]: a } })

  return (
    <View style={styles.list}>
      <View style={styles.lead}>
        <Text style={styles.leadText}>
          Dr. Patel's list is the one your care follows. Anything that doesn't match goes to your doctor to settle.
        </Text>
      </View>

      {MEDICATIONS.map((m) => {
        const diff = medDifference(m)
        const answer = answers[m.id]
        return (
          <View key={m.id} style={[styles.card, !!m.resolved && styles.cardSettled]}>
            <View style={styles.head}>
              <Text style={[styles.name, !!m.resolved && styles.settledText]}>{m.name}</Text>
              {m.kind === "supplement" && <Badge tone="ink">Supplement</Badge>}
              {m.resolved && <Badge tone="ok">Settled</Badge>}
            </View>

            <View style={styles.lines}>
              {m.lists.map((l) => (
                <View key={l.origin} style={styles.line}>
                  <Text style={styles.from}>{ORIGIN_LABEL[l.origin]}</Text>
                  <View style={styles.doseCol}>
                    <Text style={[styles.dose, !!m.resolved && styles.settledText]}>{l.dose}</Text>
                    <Text style={styles.date}>{l.date}</Text>
                  </View>
                </View>
              ))}
            </View>

            {diff && <Text style={styles.diff}>{diff}</Text>}
            {m.resolved ? (
              <Text style={styles.resolved}>{m.resolved}</Text>
            ) : (
              <View style={styles.answers} accessibilityRole="radiogroup" accessibilityLabel={`${m.name}: are you taking it?`}>
                {ANSWERS.map((a) => {
                  const on = answer === a
                  return (
                    <Pressable
                      key={a}
                      onPress={() => set(m.id, a)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={MED_ANSWER_LABEL[a]}
                      style={({ pressed }) => [styles.answer, on && styles.answerOn, pressed && styles.pressed]}
                    >
                      {on && <IconCheck size={13} color={color.onPrimary} strokeWidth={2.4} />}
                      <Text style={[styles.answerText, on && styles.answerTextOn]} numberOfLines={1}>
                        {SHORT[a]}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            )}
          </View>
        )
      })}

      <Pressable
        onPress={() => router.push({ pathname: "/tell-us", params: { about: "medicine" } })}
        accessibilityRole="button"
        style={({ pressed }) => [styles.add, pressed && styles.pressed]}
      >
        <Text style={styles.addText}>Add a medicine or supplement</Text>
      </Pressable>
    </View>
  )
}

/** How many medicines still need an answer. */
export function useMedicinesLeft() {
  const { meds = {} } = useOnboarding()
  return MEDICATIONS.filter((m) => !m.resolved && !meds[m.id]).length
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  pressed: { opacity: 0.75 },
  lead: { backgroundColor: color.primaryTint, borderRadius: 16, padding: 14 },
  leadText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.text },

  card: { borderWidth: 1, borderColor: color.border, borderRadius: 18, padding: 14, gap: 10 },
  cardSettled: { backgroundColor: color.canvas, borderColor: color.canvas },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontFamily: font.semibold, fontSize: 16, color: color.text },
  settledText: { color: color.muted },
  lines: { gap: 8 },
  line: { flexDirection: "row", gap: 12 },
  from: { width: 118, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.muted },
  doseCol: { flex: 1 },
  dose: { fontFamily: font.medium, fontSize: 14, lineHeight: 19, color: color.text },
  date: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: color.muted },
  diff: { fontFamily: font.medium, fontSize: 13, color: color.low },
  resolved: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.muted },

  answers: { flexDirection: "row", gap: 6 },
  answer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.border,
    paddingHorizontal: 6,
  },
  answerOn: { backgroundColor: color.primary, borderColor: color.primary },
  answerText: { fontFamily: font.medium, fontSize: 13, color: color.text },
  answerTextOn: { color: color.onPrimary },

  add: { alignItems: "center", paddingVertical: 10 },
  addText: { fontFamily: font.semibold, fontSize: 15, color: color.primary },
})
