import { router } from "expo-router"
import * as React from "react"
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native"

import { PlanStepPage } from "@/components/plan-steps"
import { Tag, TextAction } from "@/components/record-kit"
import { Pair } from "@/components/settings-rows"
import { Sheet, useKeyboardHeight } from "@/components/sheet"
import { Button, TextField } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { color, hairline, ink, space, type } from "@/lib/theme"

/* "Tell us about you" (Journey_7 screen 29b, "Confirm, don't fill in"):
   opens from "Start conversation" on /schedule-confirmed, before the
   flourishing questions. Her profile as the record has it, in three blocks;
   she confirms it. Basic information and lifestyle edit in a sheet over
   this screen; medical has no Edit, as it is read from her record. Confirm
   opens "Are you flourishing?" (/flourishing), the short video before the
   flourishing questions (/flourishing-questions). */

type Field = { id: string; label: string; value: string }

const BASIC: Field[] = [
  { id: "age", label: "Age", value: "45" },
  { id: "sex", label: "Sex", value: "Female" },
  { id: "height", label: "Height", value: "5′8″ (173 cm)" },
  { id: "weight", label: "Current weight", value: "213 lb" },
  { id: "bmi", label: "BMI", value: "32.4" },
  { id: "waist", label: "Waist circumference", value: "41.0 in" },
]

const LIFESTYLE: Field[] = [
  { id: "diet", label: "Typical diet", value: "Low carbohydrate" },
  { id: "meals", label: "Meals per day", value: "3" },
  { id: "exercise", label: "Exercise days / week", value: "5-6" },
  { id: "activities", label: "Preferred activities", value: "Walking, strength training" },
  { id: "alcohol", label: "Alcohol", value: "Occasional" },
  { id: "sleep", label: "Sleep, avg per night", value: "6 hours" },
]

const MEDICAL: Field[] = [
  { id: "conditions", label: "Conditions", value: "Prediabetes, hyperlipidemia" },
  { id: "medicines", label: "Medications", value: "Atorvastatin 20 mg" },
  { id: "supplements", label: "Supplements", value: "Vitamin D3, omega-3" },
  { id: "allergies", label: "Allergies", value: "Penicillin" },
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
      title="Tell us about you"
      nextLabel="Confirm"
      onNext={() => router.push("/flourishing")}
      overlay={editing && <EditSheet title={editing.title} fields={editing.fields} onSave={save} onClose={() => setEditing(undefined)} />}
    >
      <Section title="Basic information" fields={basic} onEdit={() => setEditing({ title: "Basic information", fields: basic })} />
      <Section title="Lifestyle" fields={lifestyle} onEdit={() => setEditing({ title: "Lifestyle", fields: lifestyle })} />
      <Section title="Medical" fields={MEDICAL} badge="From your record" />
    </PlanStepPage>
  )
}

/** One block: its name and Edit, or on medical a "From your record" tag
    in its place, then its fields as label and value rows. */
function Section({ title, fields, onEdit, badge }: { title: string; fields: Field[]; onEdit?: () => void; badge?: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {onEdit && <TextAction onPress={onEdit}>Edit</TextAction>}
        {!!badge && <Tag tone="muted">{badge}</Tag>}
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
