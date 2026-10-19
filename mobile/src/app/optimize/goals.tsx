import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { Barbell, Bone, Check, Clock, Drop, Flask, Heart, Heartbeat, Lightning, PencilSimple, Plus, Scales } from "@/components/ph"
import { StepBar } from "@/components/step-bar"
import { Sheet } from "@/components/sheet"
import { HUE, TextAction, Tile, type Hue } from "@/components/record-kit"
import { TextField } from "@/components/ui"
import { useMarkers } from "@/lib/experience"
import { planFocus } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { useSetupStep } from "@/lib/setup"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* Stage 01 · Enroll & Set Up, screen 2 of 17, "Select Your Goals" (Patient
   Journey deck): goals first, not a questionnaire. Ten goals, multi-select,
   so one plan serves several goals rather than forcing a single named
   program. The patient tells us what they want before we tell them anything
   about themselves; "Other" opens a line for what is not on the list. The
   whole set-up is five screens and the bar says so from the start: this is
   step 1 of 5. What her record and her why conversation already point to is
   ticked for her, and she keeps, drops or adds. */

/** The set-up is five screens (deck screens 2 to 6), whatever the app has built so far. */
const STEPS = 5

type Goal = { id: string; label: string; Icon: typeof Heart; hue: Hue }

const GOALS: Goal[] = [
  { id: "weight", label: "Lose weight / reduce body fat", Icon: Scales, hue: "teal" },
  { id: "metabolic", label: "Improve metabolic health (blood sugar, A1C)", Icon: Drop, hue: "amber" },
  { id: "heart", label: "Improve cholesterol / heart health", Icon: Heart, hue: "red" },
  { id: "muscle", label: "Gain or preserve muscle", Icon: Barbell, hue: "green" },
  { id: "bone", label: "Improve bone health", Icon: Bone, hue: "violet" },
  { id: "sleep", label: "Improve sleep", Icon: Clock, hue: "blue" },
  { id: "energy", label: "Increase energy", Icon: Lightning, hue: "amber" },
  { id: "fitness", label: "Improve fitness / VO₂", Icon: Heartbeat, hue: "green" },
  { id: "kidney", label: "Improve kidney health", Icon: Flask, hue: "blue" },
  { id: "other", label: "Other", Icon: Plus, hue: "neutral" },
]

/** Her "improve" answers from the why conversation, as goals. */
const GOAL_OF_WHY: Record<string, string> = {
  "Blood sugar": "metabolic",
  Weight: "weight",
  Energy: "energy",
  Sleep: "sleep",
  Fitness: "fitness",
  "Blood pressure": "heart",
}

/** The goal each area of her record points to. */
const GOAL_OF_AREA = { "blood sugar": "metabolic", weight: "weight", heart: "heart", bone: "bone" } as const

type Custom = { id: string; text: string }

export default function GoalsScreen() {
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const { finish } = useSetupStep("goals")

  const [picked, setPicked] = React.useState<string[]>(() => {
    const kept = onboarding.intake?.goals
    if (Array.isArray(kept)) return GOALS.filter((g) => kept.includes(g.label)).map((g) => g.id)
    const said = (onboarding.why?.improve ?? []).map((i) => GOAL_OF_WHY[i]).filter(Boolean)
    const record = planFocus(onboarding, markers, 3).areas.map((a) => GOAL_OF_AREA[a])
    return [...new Set([...said, ...record])]
  })
  // The goals she has written herself, each a row like the others, ticked when saved.
  const [customs, setCustoms] = React.useState<Custom[]>(() => {
    const saved = onboarding.intake?.otherGoals
    return Array.isArray(saved) ? saved.map((text: string, i: number) => ({ id: `custom-${i}`, text })) : []
  })
  const [customPicked, setCustomPicked] = React.useState<string[]>(() => {
    const kept = onboarding.intake?.goals
    const saved = onboarding.intake?.otherGoals
    return Array.isArray(saved) ? saved.map((text: string, i: number) => (!Array.isArray(kept) || kept.includes(text) ? `custom-${i}` : "")).filter(Boolean) : []
  })
  // Which sheet is open: a new goal ("new"), one being edited (its id), or none.
  const [editing, setEditing] = React.useState<string | null>(null)

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((g) => g !== id) : [...p, id]))
  const toggleCustom = (id: string) => setCustomPicked((p) => (p.includes(id) ? p.filter((g) => g !== id) : [...p, id]))

  function saveCustom(text: string) {
    if (editing && editing !== "new") {
      setCustoms((c) => c.map((x) => (x.id === editing ? { ...x, text } : x)))
    } else {
      const id = `custom-${Date.now()}`
      setCustoms((c) => [...c, { id, text }])
      setCustomPicked((p) => [...p, id])
    }
    setEditing(null)
  }

  const ready = picked.length > 0 || customPicked.length > 0

  function next() {
    const goals = [...GOALS.filter((g) => g.id !== "other" && picked.includes(g.id)).map((g) => g.label), ...customs.filter((c) => customPicked.includes(c.id)).map((c) => c.text)]
    finish({ intake: { ...(onboarding.intake ?? {}), goals, otherGoals: customs.map((c) => c.text) } })
  }

  const editingText = editing && editing !== "new" ? (customs.find((c) => c.id === editing)?.text ?? "") : ""

  return (
    <>
    <FlowScreen
      page
      fixed={
        <>
          <StepBar step={1} steps={STEPS} />
          <View style={styles.intro}>
            <Text style={styles.title} accessibilityRole="header">
              What would you like to improve?
            </Text>
          </View>
        </>
      }
      title="Your goals"
      footer={
        <PrimaryButton disabled={!ready} onPress={next}>
          Continue
        </PrimaryButton>
      }
    >
      <View style={styles.list}>
        {GOALS.filter((g) => g.id !== "other").map(({ id, label, Icon, hue }) => (
          <GoalRow key={id} label={label} Icon={Icon} hue={hue} on={picked.includes(id)} onPress={() => toggle(id)} />
        ))}
        {customs.map((c) => (
          <GoalRow key={c.id} label={c.text} Icon={PencilSimple} hue="neutral" on={customPicked.includes(c.id)} onPress={() => toggleCustom(c.id)} onEdit={() => setEditing(c.id)} />
        ))}
        <Pressable onPress={() => setEditing("new")} accessibilityRole="button" accessibilityLabel="Other: add your own goal" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Tile hue="neutral" size={32}>
            <Plus size={18} color={HUE.neutral.ink} />
          </Tile>
          <Text style={styles.label}>Other</Text>
        </Pressable>
      </View>
    </FlowScreen>
    {editing && <OtherSheet value={editingText} onSave={saveCustom} onClose={() => setEditing(null)} />}
    </>
  )
}

/** One goal as a card: tile, name and checkbox; a goal she wrote herself also has Edit. */
function GoalRow({ label, Icon, hue, on, onPress, onEdit }: { label: string; Icon: typeof Heart; hue: Hue; on: boolean; onPress: () => void; onEdit?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      aria-checked={on}
      accessibilityLabel={onEdit ? `${label}, your own goal` : label}
      style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && styles.pressed]}
    >
      <Tile hue={hue} size={32}>
        <Icon size={18} color={HUE[hue].ink} />
      </Tile>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
      {onEdit && <TextAction onPress={onEdit}>Edit</TextAction>}
      <View style={[styles.box, on && styles.boxOn]}>{on && <Check size={12} color={color.onPrimary} weight="bold" />}</View>
    </Pressable>
  )
}

/** The custom goal, typed in a bottom sheet and kept on Save. */
function OtherSheet({ value, onSave, onClose }: { value: string; onSave: (v: string) => void; onClose: () => void }) {
  const [draft, setDraft] = React.useState(value)
  return (
    <Sheet title="Add your own goal" onClose={onClose}>
      <TextField label="What else would you like to improve?" value={draft} onChangeText={setDraft} placeholder="In your own words" autoFocus />
      <PrimaryButton disabled={draft.trim().length === 0} onPress={() => onSave(draft.trim())}>
        Save
      </PrimaryButton>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  intro: { gap: space.inline },
  title: { fontFamily: font.medium, fontSize: 24, lineHeight: 30, color: ink.strong },
  lead: { ...type.body },
  list: { gap: space.inline },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lead,
    minHeight: 52,
    paddingHorizontal: space.card,
    paddingVertical: space.inline,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  rowOn: { borderColor: color.primary, backgroundColor: color.primaryTint },
  pressed: { opacity: 0.85 },
  label: { ...type.title, flex: 1 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: ink.secondary, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: color.primary, borderColor: color.primary },
})
