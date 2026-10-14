import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { CaretLeft } from "@/components/ph"
import { StepBar } from "@/components/step-bar"
import { Block, Group, KeyValue, TextAction } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { TextField } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { useSetupStep } from "@/lib/setup"
import { color, font, ink, space, type } from "@/lib/theme"

/* Stage 01 · Enroll & Set Up, screen 4 of 26, "Health & Lifestyle" (Patient
   Journey deck, "Confirm, don't fill in"): fifteen fields pre-filled from
   the Inlay record, in three blocks. She confirms or edits; she never types
   her history into a blank form. An Edit link on each block keeps the record
   hers rather than ours. Step 3 of 5. The fields and values are the deck's. */

/** The set-up is five screens (deck screens 2 to 6), as on the goals screen. */
const STEPS = 5
const STEP = 3

type Field = { id: string; label: string; value: string }
type Section = { id: string; title: string; fields: Field[] }

/** What the record already holds, in the deck's three blocks. */
const SECTIONS: Section[] = [
  {
    id: "basic",
    title: "Basic Information",
    fields: [
      { id: "age", label: "Age", value: "77" },
      { id: "sex", label: "Sex", value: "Male" },
      { id: "height", label: "Height", value: "5′8″ (173 cm)" },
      { id: "weight", label: "Current Weight", value: "166 lb" },
      { id: "waist", label: "Waist Circumference", value: "35.0 in" },
    ],
  },
  {
    id: "lifestyle",
    title: "Lifestyle",
    fields: [
      { id: "diet", label: "Typical Diet", value: "Low carbohydrate" },
      { id: "meals", label: "Meals per day", value: "3" },
      { id: "exercise", label: "Exercise Days / Week", value: "5–6" },
      { id: "activities", label: "Preferred Activities", value: "Walking, strength training" },
      { id: "alcohol", label: "Alcohol", value: "Occasional" },
      { id: "sleep", label: "Sleep (avg per night)", value: "6 hours" },
    ],
  },
  {
    id: "medical",
    title: "Medical",
    fields: [
      { id: "conditions", label: "Key Conditions", value: "See record" },
      { id: "medications", label: "Medications", value: "3 medications" },
      { id: "supplements", label: "Supplements", value: "Yes" },
      { id: "allergies", label: "Allergies", value: "Birch, stone fruits" },
    ],
  },
]

/** Her intake key for a field, so what she edits is kept with her other answers. */
const keyOf = (id: string) => `about_${id}`

export default function AboutScreen() {
  const onboarding = useOnboarding()
  const { finish } = useSetupStep("about")

  // The record's values, under anything she has already edited.
  const [values, setValues] = React.useState<Record<string, string>>(() => {
    const kept = onboarding.intake ?? {}
    const out: Record<string, string> = {}
    for (const f of SECTIONS.flatMap((s) => s.fields)) {
      const v = kept[keyOf(f.id)]
      out[f.id] = typeof v === "string" ? v : f.value
    }
    return out
  })
  const [editing, setEditing] = React.useState<Section | null>(null)

  function next() {
    const edits = Object.fromEntries(Object.entries(values).map(([id, v]) => [keyOf(id), v]))
    finish({ intake: { ...(onboarding.intake ?? {}), ...edits } })
  }

  return (
    <>
      <FlowScreen
        page
        fixed={
          <>
            <StepBar step={STEP} steps={STEPS} />
            <View style={styles.intro}>
              <Text style={styles.title} accessibilityRole="header">
                Tell us about you
              </Text>
              <Text style={styles.lead}>We’ve pre-filled information from your Inlay health record. Please confirm or edit.</Text>
            </View>
          </>
        }
        title="Tell us about you"
        footer={
          <View style={styles.actions}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <CaretLeft size={16} color={ink.content} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <View style={styles.continue}>
              <PrimaryButton onPress={next}>Continue</PrimaryButton>
            </View>
          </View>
        }
      >
        {SECTIONS.map((section) => (
          <Block key={section.id} title={section.title} action={<TextAction onPress={() => setEditing(section)}>Edit</TextAction>}>
            <Group>
              {section.fields.map((f) => (
                <KeyValue key={f.id} label={f.label} value={values[f.id]} last />
              ))}
            </Group>
          </Block>
        ))}
      </FlowScreen>

      {editing && (
        <EditSheet
          section={editing}
          values={values}
          onSave={(patch) => {
            setValues((v) => ({ ...v, ...patch }))
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

/** One block's fields as plain inputs, starting from what is on record. */
function EditSheet({
  section,
  values,
  onSave,
  onClose,
}: {
  section: Section
  values: Record<string, string>
  onSave: (patch: Record<string, string>) => void
  onClose: () => void
}) {
  const [draft, setDraft] = React.useState(() => Object.fromEntries(section.fields.map((f) => [f.id, values[f.id]])))
  // An emptied field keeps what the record held rather than saving a blank.
  const save = () => onSave(Object.fromEntries(Object.entries(draft).map(([id, v]) => [id, v.trim() || values[id]])))
  return (
    <Sheet title={`Edit ${section.title.toLowerCase()}`} onClose={onClose}>
      <View style={styles.fields}>
        {section.fields.map((f) => (
          <TextField key={f.id} label={f.label} value={draft[f.id]} onChangeText={(t) => setDraft((d) => ({ ...d, [f.id]: t }))} />
        ))}
      </View>
      <PrimaryButton onPress={save}>Save</PrimaryButton>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  intro: { gap: space.inline },
  title: { fontFamily: font.medium, fontSize: 24, lineHeight: 30, color: ink.strong },
  lead: { ...type.body },
  fields: { gap: space.item, paddingBottom: space.stack },
  actions: { flexDirection: "row", alignItems: "center", gap: space.item },
  back: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 42, paddingRight: space.item },
  backText: { ...type.title },
  continue: { flex: 1 },
  pressed: { opacity: 0.6 },
})
