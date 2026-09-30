import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Chip, FlowScreen } from "@/components/flow"
import { Button, TextField } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { INTAKE, type Intake } from "@/lib/program"
import { useSetupStep } from "@/lib/setup"
import { color, font } from "@/lib/theme"

/* Paid setup, step 1: the fuller questionnaire the plan is built from,
   one topic per page (goals, history, a normal week, what has been tried,
   what gets in the way). Back steps through the pages. */

export default function QuestionnaireScreen() {
  const onboarding = useOnboarding()
  const { finish } = useSetupStep("questionnaire")
  const [page, setPage] = React.useState(0)
  const [answers, setAnswers] = React.useState<Intake>(onboarding.intake ?? {})
  const current = INTAKE[page]
  const last = page === INTAKE.length - 1

  const list = (id: string) => (Array.isArray(answers[id]) ? (answers[id] as string[]) : [])
  const text = (id: string) => (typeof answers[id] === "string" ? (answers[id] as string) : "")
  const set = (id: string, value: string | string[]) => setAnswers((a) => ({ ...a, [id]: value }))

  function next() {
    onboarding.save({ intake: answers })
    if (last) finish({ intake: answers })
    else setPage((p) => p + 1)
  }

  return (
    <FlowScreen
      onBack={page > 0 ? () => setPage((p) => p - 1) : undefined}
      title={current.title}
      footer={<Button onPress={next}>{last ? "Continue" : "Next"}</Button>}
    >
      {current.questions.map((q) => (
        <View key={q.id} style={styles.question}>
          {q.type === "text" ? (
            <TextField label={q.label} value={text(q.id)} onChangeText={(v) => set(q.id, v)} placeholder={q.placeholder} />
          ) : (
            <>
              <Text style={styles.label}>{q.label}</Text>
              <View style={styles.chips}>
                {q.options.map((o) => {
                  const on = q.type === "one" ? answers[q.id] === o : list(q.id).includes(o)
                  return (
                    <Chip
                      key={o}
                      label={o}
                      selected={on}
                      onPress={() => {
                        if (q.type === "one") return set(q.id, o)
                        const picked = list(q.id)
                        if (on) return set(q.id, picked.filter((x) => x !== o))
                        if (q.max && picked.length >= q.max) return
                        set(q.id, [...picked, o])
                      }}
                    />
                  )
                })}
              </View>
            </>
          )}
        </View>
      ))}
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  question: { gap: 10 },
  label: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
})
