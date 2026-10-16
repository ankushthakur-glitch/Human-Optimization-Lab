import { router } from "expo-router"
import * as React from "react"
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native"

import { PlanStepPage } from "@/components/plan-steps"
import { TextAction } from "@/components/record-kit"
import { Pair } from "@/components/settings-rows"
import { Sheet, useKeyboardHeight } from "@/components/sheet"
import { Button, TextField } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { color, hairline, ink, space, type } from "@/lib/theme"

/* Step 2 of the plan's set-up (Journey_7 screen 4, "Confirm, don't fill
   in"): opens after the goals are chosen. Fifteen
   fields already filled from the record, in the deck's words and values,
   in three blocks; she confirms them. Basic information and lifestyle
   edit in a sheet over this screen; medical has no Edit, as it is what
   her record holds. Continue opens step 3, the tests her record is
   missing (/baseline). */

type Field = { id: string; label: string; value: string }

const BASIC: Field[] = [
  { id: "age", label: "Age", value: "77" },
  { id: "sex", label: "Sex", value: "Male" },
  { id: "height", label: "Height", value: "5′8″ (173 cm)" },
  { id: "weight", label: "Current Weight", value: "166 lb" },
  { id: "waist", label: "Waist Circumference", value: "35.0 in" },
]

const LIFESTYLE: Field[] = [
  { id: "diet", label: "Typical Diet", value: "Low carbohydrate" },
  { id: "meals", label: "Meals per day", value: "3" },
  { id: "exercise", label: "Exercise Days / Week", value: "5-6" },
  { id: "activities", label: "Preferred Activities", value: "Walking, strength training" },
  { id: "alcohol", label: "Alcohol", value: "Occasional" },
  { id: "sleep", label: "Sleep (avg per night)", value: "6 hours" },
]

const MEDICAL: Field[] = [
  { id: "conditions", label: "Key Conditions", value: "See record" },
  { id: "medicines", label: "Medications", value: "3 medications" },
  { id: "supplements", label: "Supplements", value: "Yes" },
  { id: "allergies", label: "Allergies", value: "Birch, stone fruits" },
]

export default function HealthProfileScreen() {
  const onboarding = useOnboarding()
  const [editing, setEditing] = React.useState<{ title: string; fields: Field[] }>()
  const changed = onboarding.healthProfile ?? {}
  const withChanges = (fields: Field[]) => fields.map((f) => ({ ...f, value: changed[f.id] ?? f.value }))
  const basic = withChanges(BASIC)
  const lifestyle = withChanges(LIFESTYLE)

  async function save(values: Record<string, string>) {
    await onboarding.save({ healthProfile: { ...changed, ...values } })
    setEditing(undefined)
  }

  return (
    <PlanStepPage
      step={2}
      title="Tell us about you"
      lead="We’ve pre-filled information from your Inlay health record."
      onNext={() => router.push("/baseline")}
      overlay={editing && <EditSheet title={editing.title} fields={editing.fields} onSave={save} onClose={() => setEditing(undefined)} />}
    >
      <Section title="Basic Information" fields={basic} onEdit={() => setEditing({ title: "Basic Information", fields: basic })} />
      <Section title="Lifestyle" fields={lifestyle} onEdit={() => setEditing({ title: "Lifestyle", fields: lifestyle })} />
      <Section title="Medical" fields={MEDICAL} />
    </PlanStepPage>
  )
}

/** One block: its name and Edit (none on medical, which comes from the
    record), then its fields as label and value rows. */
function Section({ title, fields, onEdit }: { title: string; fields: Field[]; onEdit?: () => void }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {onEdit && <TextAction onPress={onEdit}>Edit</TextAction>}
      </View>
      {/* The card: white, edged, radius 14, the rows split by hairlines. */}
      <View style={styles.card}>
        {fields.map((f, i) => (
          <View key={f.id} style={[styles.row, i > 0 && styles.rule]}>
            <Pair label={f.label} value={f.value} />
          </View>
        ))}
      </View>
    </View>
  )
}

/** A block's fields to change, in a sheet that rides above the keyboard. */
function EditSheet({
  title,
  fields,
  onSave,
  onClose,
}: {
  title: string
  fields: Field[]
  onSave: (values: Record<string, string>) => void
  onClose: () => void
}) {
  const [values, setValues] = React.useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.id, f.value])))
  const keyboard = useKeyboardHeight()
  const refs = React.useRef<(TextInput | null)[]>([])

  function done() {
    // Only what she changed is kept; a cleared field keeps the record's value.
    const edits = Object.fromEntries(fields.filter((f) => values[f.id].trim() && values[f.id].trim() !== f.value).map((f) => [f.id, values[f.id].trim()]))
    onSave(edits)
  }

  return (
    <View style={[styles.sheetFrame, { bottom: keyboard }]} pointerEvents="box-none">
      <Sheet title={`Edit ${title.toLowerCase()}`} onClose={onClose}>
        <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetFields} keyboardShouldPersistTaps="handled">
          {fields.map((f, i) => (
            <TextField
              key={f.id}
              ref={(r) => {
                refs.current[i] = r
              }}
              label={f.label}
              value={values[f.id]}
              onChangeText={(v) => setValues((s) => ({ ...s, [f.id]: v }))}
              autoCapitalize="sentences"
              returnKeyType={i < fields.length - 1 ? "next" : "done"}
              onSubmitEditing={() => (i < fields.length - 1 ? refs.current[i + 1]?.focus() : done())}
            />
          ))}
        </ScrollView>
        <Button onPress={done}>Save</Button>
      </Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: space.inline, marginBottom: space.item },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline },
  sectionTitle: { ...type.title, color: ink.strong },
  card: {
    paddingHorizontal: space.rowX,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  row: { paddingVertical: 10 },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: hairline.rule },

  sheetFrame: { position: "absolute", top: 0, left: 0, right: 0 },
  sheetList: { maxHeight: 360 },
  sheetFields: { gap: space.card },
})
