import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Chip, FlowScreen } from "@/components/flow"
import { Button, TextField } from "@/components/ui"
import { showDate } from "@/lib/dates"
import { useOnboarding } from "@/lib/onboarding"
import { color, font } from "@/lib/theme"

/* What the patient tells Inlay: a medicine or supplement they take (or
   stopped), a doctor they saw, a test done elsewhere. It goes into the
   record marked as told by the patient, and the doctor sees it alongside
   everyone else's lists. */

type About = "medicine" | "stopped" | "visit" | "test"

const TOPICS: { id: About; label: string; what: string; placeholder: string; detail: string }[] = [
  { id: "medicine", label: "I take a medicine or supplement", what: "Name and dose", placeholder: "Magnesium, 200 mg at night", detail: "Medicine you take" },
  { id: "stopped", label: "I stopped a medicine", what: "Which one, and why", placeholder: "Lisinopril, made me dizzy", detail: "Medicine you stopped" },
  { id: "visit", label: "I saw another doctor", what: "Who, and what for", placeholder: "Dr. Lee, cardiologist, palpitations", detail: "Visit elsewhere" },
  { id: "test", label: "I had a test elsewhere", what: "Which test, and the result if you have it", placeholder: "Cholesterol at a pharmacy, 158", detail: "Test elsewhere" },
]

export default function TellUsScreen() {
  const onboarding = useOnboarding()
  const params = useLocalSearchParams<{ about?: About }>()
  const [about, setAbout] = React.useState<About | undefined>(params.about)
  const [what, setWhat] = React.useState("")
  const [when, setWhen] = React.useState("")
  const [error, setError] = React.useState<string>()
  const topic = TOPICS.find((t) => t.id === about)

  async function save() {
    if (!topic) return
    if (!what.trim()) {
      setError("Tell us what it was.")
      return
    }
    await onboarding.save({
      added: [
        ...(onboarding.added ?? []),
        {
          id: `told-${Date.now()}`,
          title: what.trim(),
          detail: [topic.detail, when.trim()].filter(Boolean).join(", "),
          at: showDate(),
        },
      ],
    })
    router.back()
  }

  return (
    <FlowScreen title="Tell us something" footer={<Button onPress={save} disabled={!topic}>Add to my record</Button>}>
      <View style={styles.topics}>
        {TOPICS.map((t) => (
          <Chip key={t.id} label={t.label} selected={about === t.id} onPress={() => setAbout(t.id)} />
        ))}
      </View>
      {topic && (
        <View style={styles.fields}>
          <TextField
            label={topic.what}
            required
            value={what}
            onChangeText={(v) => {
              setWhat(v)
              setError(undefined)
            }}
            placeholder={topic.placeholder}
            error={error}
          />
          <TextField label="When" value={when} onChangeText={setWhen} placeholder="Last month" />
          <Text style={styles.small}>Marked as told by you, and shown to Dr. Patel with your other lists.</Text>
        </View>
      )}
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  topics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fields: { gap: 18 },
  small: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.muted },
})
