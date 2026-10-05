import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { Block, Card, Group, toast } from "@/components/record-kit"
import { Button, TextField } from "@/components/ui"
import { showDate } from "@/lib/dates"
import { useOnboarding } from "@/lib/onboarding"
import { color, space, type } from "@/lib/theme"

/* What the patient tells Inlay (F-93): a medicine or supplement she takes
   (or stopped), a doctor she saw, a test done elsewhere. It joins her
   record as told by her, "Being checked" under "Added by you", and Dr.
   Patel sees it beside every other list. Reached from the Record tab's "Add
   to your record", and from "Tell us" when a place had no records. */

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
    toast("Added to your record")
    router.back()
  }

  return (
    <FlowScreen
      page
      title="Tell us something"
      footer={
        <Button onPress={save} disabled={!topic}>
          Add to my record
        </Button>
      }
    >
      <Block title="What is it about?">
        <Group>
          {TOPICS.map((t) => (
            <Topic key={t.id} label={t.label} selected={about === t.id} onPress={() => setAbout(t.id)} />
          ))}
        </Group>
      </Block>
      {topic && (
        <Card style={styles.fields}>
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
        </Card>
      )}
    </FlowScreen>
  )
}

/** One topic as a radio row: the words, and a ring filled teal once chosen. */
function Topic({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.topic, pressed && styles.pressed]}
    >
      <Text style={[type.title, styles.topicText]}>{label}</Text>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.radioDot} />}</View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  topic: { flexDirection: "row", alignItems: "center", gap: space.item, paddingVertical: space.rowY },
  pressed: { opacity: 0.6 },
  topicText: { flex: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#A3ACB9", alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: color.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.primary },
  // Frontline's form card: 16 inside and 16 between its fields.
  fields: { gap: space.card },
})
