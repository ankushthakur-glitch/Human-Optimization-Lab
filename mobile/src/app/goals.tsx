import { router } from "expo-router"
import * as React from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import { GOALS, ownGoal, type Goal } from "@/components/goal-list"
import { PlanStepPage } from "@/components/plan-steps"
import { Check, Plus } from "@/components/ph"
import { HUE } from "@/components/record-kit"
import { Sheet, useKeyboardHeight } from "@/components/sheet"
import { Button, TextField } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { color, hairline, space, type } from "@/lib/theme"

/* Step 1 of the plan's set-up (Journey_7 screen 2, "Goals first, not a
   questionnaire"): opened by "Build my personalized plan". Ten goals,
   multi-select, so one plan serves several. "Other" opens a sheet where
   she writes her own; it joins the list ticked, with an icon read from
   its words ("sleep" gets the moon). Continue keeps her choice and opens
   step 2, each goal checked against the record (/goals-record). */

export default function GoalsScreen() {
  const onboarding = useOnboarding()
  const [own, setOwn] = React.useState<string[]>(() => [...new Set(onboarding.ownGoals ?? [])])
  const [picked, setPicked] = React.useState<string[]>(() => [...new Set(onboarding.goals ?? [])])
  const [adding, setAdding] = React.useState(false)

  const goals = [...GOALS, ...own.map(ownGoal)]
  const toggle = (label: string) =>
    setPicked((p) =>
      p.includes(label) ? p.filter((x) => x !== label) : [...p, label]
    )

  function add(label: string) {
    // A goal already on the list is ticked rather than added twice.
    const same = goals.find(
      (g) => g.label.toLowerCase() === label.toLowerCase()
    )
    if (!same) setOwn((o) => [...o, label])
    setPicked((p) =>
      p.includes(same?.label ?? label) ? p : [...p, same?.label ?? label]
    )
    setAdding(false)
  }

  async function next() {
    await onboarding.save({
      // Each goal once, even if one slipped in twice.
      goals: [...new Set(picked)],
      ownGoals: own.length ? [...new Set(own)] : undefined,
    })
    router.push("/goals-record")
  }

  return (
    <PlanStepPage
      step={1}
      title="What would you like to improve?"
      lead="Select all that apply. We'll build one personalized plan around your goals."
      onNext={next}
      nextDisabled={!picked.length}
      overlay={adding && <OtherSheet onSave={add} onClose={() => setAdding(false)} />}
    >
      {goals.map((g) => (
        <GoalRow key={g.label} goal={g} selected={picked.includes(g.label)} onPress={() => toggle(g.label)} />
      ))}
      <GoalRow goal={{ label: "Other", icon: Plus, hue: "neutral" }} onPress={() => setAdding(true)} />
    </PlanStepPage>
  )
}

/** One goal: a grey icon, the words, and a box ticked in teal; the tick
    alone marks it chosen. "Other" is in teal with no box; it opens the
    sheet. */
function GoalRow({
  goal,
  selected,
  onPress,
}: {
  goal: Goal
  selected?: boolean
  onPress: () => void
}) {
  const Icon = goal.icon
  const box = selected !== undefined
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={box ? "checkbox" : "button"}
      accessibilityState={box ? { checked: selected } : undefined}
      style={({ pressed }) => [styles.row, selected && styles.rowOn, pressed && styles.pressed]}
    >
      {/* The icon alone, in its own colour, with no tile behind it. */}
      <View style={styles.icon}>
        <Icon size={20} color={HUE[goal.hue].ink} />
      </View>
      <Text style={styles.label}>{goal.label}</Text>
      {box && (
        <View style={[styles.box, selected && styles.boxOn]}>
          {selected && (
            <Check size={12} color={color.onPrimary} weight="bold" />
          )}
        </View>
      )}
    </Pressable>
  )
}

/** "Other": her own goal in a few words. The sheet rides above the
    keyboard: its frame ends where the keyboard begins. */
function OtherSheet({
  onSave,
  onClose,
}: {
  onSave: (label: string) => void
  onClose: () => void
}) {
  const [text, setText] = React.useState("")
  const keyboard = useKeyboardHeight()
  const label = text.trim()
  // Focused once the sheet is on screen: autoFocus on a sheet that is still
  // mounting shows the caret on iOS but never raises the keyboard.
  const field = React.useRef<TextInput>(null)
  React.useEffect(() => {
    const t = setTimeout(() => field.current?.focus(), 250)
    return () => clearTimeout(t)
  }, [])
  return (
    <View
      style={[styles.sheetFrame, { bottom: keyboard }]}
      pointerEvents="box-none"
    >
      <Sheet title="Add your own goal" onClose={onClose}>
        <TextField
          ref={field}
          label="Your goal"
          value={text}
          onChangeText={setText}
          placeholder="Sleep through the night"
          autoCapitalize="sentences"
          returnKeyType="done"
          onSubmitEditing={() => label && onSave(label)}
        />
        <Button onPress={() => label && onSave(label)} disabled={!label}>
          Save
        </Button>
      </Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lead,
    minHeight: 48,
    paddingVertical: 8,
    paddingHorizontal: space.rowX,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  // Chosen: the same row, edged in teal on a light green that stands
  // apart from the grey page.
  rowOn: { borderColor: color.primary, backgroundColor: "#E5F4F1" },
  icon: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  label: { ...type.title, flex: 1 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: hairline.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { borderColor: color.primary, backgroundColor: color.primary },

  sheetFrame: { position: "absolute", top: 0, left: 0, right: 0 },

})
