import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { SetupStepLabel } from "@/components/plan-account-pieces"
import { Chip } from "@/components/record-kit"
import { Button, TextField } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { INTAKE, type Intake } from "@/lib/program"
import { useSetupStep } from "@/lib/setup"
import { ink, space, type } from "@/lib/theme"

/* Paid setup, step 1: the fuller questionnaire the plan is built from,
   one topic per page (goals, history, a normal week, what has been tried,
   what gets in the way). Back steps through the pages. What she already
   told us in her why conversation is filled in, never asked again (M-73):
   what she wants to improve becomes her goals, and the future she
   described becomes what would be different. Open answers are a few
   lines, so a sentence shows whole. */

/** Her "improve" answers from the why conversation, as the goals here. */
const GOAL_OF: Record<string, string> = {
  "Blood sugar": "Steadier blood sugar",
  Weight: "Lose weight",
  Energy: "More energy",
  Sleep: "Sleep better",
  Fitness: "Get stronger",
  "Blood pressure": "Lower my blood pressure",
}

export default function QuestionnaireScreen() {
  const onboarding = useOnboarding()
  const { label, finish } = useSetupStep("questionnaire")
  const [page, setPage] = React.useState(0)
  const [answers, setAnswers] = React.useState<Intake>(() => {
    if (onboarding.intake) return onboarding.intake
    const goals = (onboarding.why?.improve ?? []).map((i) => GOAL_OF[i]).filter(Boolean).slice(0, 3)
    const picture = onboarding.why?.future ?? onboarding.why?.healthyFor
    return { ...(goals.length ? { goals } : {}), ...(picture ? { picture } : {}) }
  })
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
      <SetupStepLabel>{label}</SetupStepLabel>
      {current.questions.map((q) => (
        <View key={q.id} style={styles.question}>
          {q.type === "text" ? (
            <TextField label={q.label} value={text(q.id)} onChangeText={(v) => set(q.id, v)} placeholder={q.placeholder} multiline />
          ) : (
            <>
              <Text style={styles.label}>{q.label}</Text>
              <View
                style={styles.chips}
                accessibilityRole={q.type === "one" ? "radiogroup" : undefined}
                accessibilityLabel={q.type === "one" ? q.label : undefined}
              >
                {q.options.map((o) => {
                  const on = q.type === "one" ? answers[q.id] === o : list(q.id).includes(o)
                  return (
                    <Chip
                      key={o}
                      label={o}
                      selected={on}
                      radio={q.type === "one"}
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
  // A question's words over its answers, 8 apart.
  question: { gap: space.inline },
  // As dark as the text fields' labels on the same page (ui.tsx), so every
  // question reads at one level.
  label: { ...type.title, color: ink.strong },
  // Chips in a row and a wrapped line under them, 8 apart (Frontline).
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
})
