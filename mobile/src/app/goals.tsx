import { router } from "expo-router"
import * as React from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import { CATEGORIES } from "@/components/goal-list"
import { PlanStepPage } from "@/components/plan-steps"
import { CaretRight, Check, Plus } from "@/components/ph"
import { HUE } from "@/components/record-kit"
import { Sheet, useKeyboardHeight } from "@/components/sheet"
import { Button, TextField } from "@/components/ui"
import { useMarkers } from "@/lib/experience"
import { useOnboarding } from "@/lib/onboarding"
import { recordGoals } from "@/lib/record-goals"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* Step 1 of the plan's set-up (Journey_7 screen 2, "Goals first, not a
   questionnaire"): opened by "Build my personalized plan". 84 goals in
   five expandable categories, multi-select, so one plan serves
   several. "Other" opens a sheet where
   she writes her own; it joins the list ticked, with an icon read from
   its words ("sleep" gets the moon). Continue keeps her choice and opens
   step 2, the tests her record is missing (/baseline). */

export default function GoalsScreen() {
  const onboarding = useOnboarding()
  const [own, setOwn] = React.useState<string[]>(() => [...new Set(onboarding.ownGoals ?? [])])
  const markers = useMarkers()
  // Nothing chosen yet: the three goals her record backs start ticked, and
  // are saved so every later step reads the same choice.
  const [initial] = React.useState<string[]>(() => {
    const saved = [...new Set(onboarding.goals ?? [])]
    return saved.length || onboarding.ownGoals?.length ? saved : recordGoals(markers)
  })
  const [picked, setPicked] = React.useState<string[]>(initial)
  React.useEffect(() => {
    if (!onboarding.goals?.length && initial.length) onboarding.save({ goals: initial }).catch(() => {})
    // Once, on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [adding, setAdding] = React.useState(false)
  const [open, setOpen] = React.useState<string[]>(() => {
    // The first category with a choice in it opens; the first one otherwise.
    return [(CATEGORIES.find((c) => c.goals.some((g) => initial.includes(g))) ?? CATEGORIES[0]).id]
  })

  // Her own goals sit in a category of their own, after the five.
  const categories = [
    ...CATEGORIES,
    ...(own.length ? [{ id: "own", name: "Your own goals", desc: "Goals you added", icon: Plus, hue: "neutral" as const, goals: own }] : []),
  ]
  const goals = categories.flatMap((c) => c.goals)
  const toggle = (label: string) =>
    setPicked((p) =>
      p.includes(label) ? p.filter((x) => x !== label) : [...p, label]
    )

  function add(label: string) {
    // A goal already on the list is ticked rather than added twice.
    const same = goals.find(
      (g) => g.toLowerCase() === label.toLowerCase()
    )
    if (!same) setOwn((o) => [...o, label])
    setPicked((p) =>
      p.includes(same ?? label) ? p : [...p, same ?? label]
    )
    setAdding(false)
  }

  async function next() {
    await onboarding.save({
      // Each goal once, even if one slipped in twice.
      goals: [...new Set(picked)],
      ownGoals: own.length ? [...new Set(own)] : undefined,
    })
    router.push("/baseline")
  }

  return (
    <PlanStepPage
      step={1}
      title="What would you like to improve?"
      onNext={next}
      nextLabel="Continue"
      later={{ label: "Skip", onPress: () => router.replace("/plan") }}
      nextDisabled={!picked.length}
      overlay={adding && <OtherSheet onSave={add} onClose={() => setAdding(false)} />}
    >
      {categories.map((c) => {
        const items = c.goals
        const n = c.goals.filter((g) => picked.includes(g)).length
        const expanded = open.includes(c.id)
        const Icon = c.icon
        const hue = HUE[c.hue]
        return (
          <View key={c.id} style={[styles.cat, n > 0 && styles.catOn]}>
            <Pressable
              onPress={() => setOpen((o) => (o.includes(c.id) ? o.filter((x) => x !== c.id) : [...o, c.id]))}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${c.name}, ${n} of ${c.goals.length} selected`}
              style={({ pressed }) => [styles.catHead, pressed && styles.pressed]}
            >
              <View style={[styles.tile, { backgroundColor: hue.tint }]}>
                <Icon size={20} color={hue.ink} />
              </View>
              <View style={styles.catWords}>
                <Text style={styles.catName}>{c.name}</Text>
                <Text style={styles.catDesc}>{c.desc}</Text>
              </View>
              <View style={[styles.count, n > 0 && styles.countOn]}>
                <Text style={[styles.countText, n > 0 && styles.countTextOn]}>{`${n}/${c.goals.length}`}</Text>
              </View>
              <View style={expanded ? styles.caretOpen : undefined}>
                <CaretRight size={16} color="#818181" />
              </View>
            </Pressable>
            {expanded &&
              items.map((g) => {
                const on = picked.includes(g)
                return (
                  <Pressable
                    key={g}
                    onPress={() => toggle(g)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={({ pressed }) => [styles.goal, on && styles.goalOn, pressed && styles.pressed]}
                  >
                    <Text style={[styles.goalText, on && styles.goalTextOn]}>{g}</Text>
                    <View style={[styles.box, on && styles.boxOn]}>
                      {on && <Check size={12} color={color.onPrimary} weight="bold" />}
                    </View>
                  </Pressable>
                )
              })}
          </View>
        )
      })}
      <Pressable onPress={() => setAdding(true)} accessibilityRole="button" style={({ pressed }) => [styles.other, pressed && styles.pressed]}>
        <Plus size={20} color={HUE.neutral.ink} />
        <Text style={styles.label}>Other</Text>
      </Pressable>
    </PlanStepPage>
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

  other: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lead,
    minHeight: 48,
    paddingHorizontal: space.rowX,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  label: { ...type.title, flex: 1 },

  // The web build's own focus ring is off: the field keeps its look when tapped.

  cat: { borderRadius: 12, borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.background, overflow: "hidden" },
  catOn: { borderColor: "#CFE8E3" },
  catHead: { flexDirection: "row", alignItems: "center", gap: space.lead, padding: 12 },
  tile: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  catWords: { flex: 1, minWidth: 0 },
  catName: { fontFamily: font.medium, fontSize: 14.5, lineHeight: 20, color: ink.strong },
  catDesc: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink.secondary },
  count: { borderRadius: 99, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: "#F2F2F4" },
  countOn: { backgroundColor: color.primary },
  countText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: ink.secondary },
  countTextOn: { color: color.onPrimary },
  caretOpen: { transform: [{ rotate: "90deg" }] },
  goal: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lead,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: hairline.rule,
  },
  // Chosen: a light green row with a teal tick.
  goalOn: { backgroundColor: "#E9F6F3" },
  goalText: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink.primary },
  goalTextOn: { fontFamily: font.medium, color: ink.strong },
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
