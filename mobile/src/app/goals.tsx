import { router } from "expo-router"
import * as React from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import { FlourishingAssessment, TOTAL_QUESTIONS, type Answer, type Answers } from "@/components/flourishing-assessment"
import { CATEGORIES, GOAL_TOTAL } from "@/components/goal-list"
import { PlanStepPage } from "@/components/plan-steps"
import { CaretRight, Check, MagnifyingGlass, Plus, X } from "@/components/ph"
import { HUE } from "@/components/record-kit"
import { Sheet, useKeyboardHeight } from "@/components/sheet"
import { Button, TextField } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* Step 1 of the plan's set-up (Journey_7 screen 2, "Goals first, not a
   questionnaire"): opened by "Build my personalized plan". 84 goals in
   five expandable categories, searchable, multi-select, so one plan serves
   several. "Other" opens a sheet where
   she writes her own; it joins the list ticked, with an icon read from
   its words ("sleep" gets the moon). Continue keeps her choice and opens
   step 2, the tests her record is missing (/baseline). */

export default function GoalsScreen() {
  const onboarding = useOnboarding()
  const [own, setOwn] = React.useState<string[]>(() => [...new Set(onboarding.ownGoals ?? [])])
  const [picked, setPicked] = React.useState<string[]>(() => [...new Set(onboarding.goals ?? [])])
  const [adding, setAdding] = React.useState(false)
  const [tab, setTab] = React.useState<"goals" | "life">("goals")
  const [assessment, setAssessment] = React.useState<Answers>(() => ({ ...onboarding.assessment }))
  const answered = Object.keys(assessment).length
  const answer = (key: string, value: Answer) => setAssessment((a) => ({ ...a, [key]: value }))
  const [query, setQuery] = React.useState("")
  const [only, setOnly] = React.useState(false)
  const [open, setOpen] = React.useState<string[]>(() => {
    // The first category with a choice in it opens; the first one otherwise.
    const chosen = onboarding.goals ?? []
    return [(CATEGORIES.find((c) => c.goals.some((g) => chosen.includes(g))) ?? CATEGORIES[0]).id]
  })

  // Her own goals sit in a category of their own, after the five.
  const categories = [
    ...CATEGORIES,
    ...(own.length ? [{ id: "own", name: "Your own goals", desc: "Goals you added", icon: Plus, hue: "neutral" as const, goals: own }] : []),
  ]
  const goals = categories.flatMap((c) => c.goals)
  const q = query.trim().toLowerCase()
  const match = (g: string) => (!q || g.toLowerCase().includes(q)) && (!only || picked.includes(g))
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
      assessment: answered ? assessment : undefined,
    })
    router.push("/baseline")
  }

  return (
    <PlanStepPage
      step={1}
      title="What would you like to improve?"
      lead="Select all that apply. We'll build one personalized plan around your goals."
      onNext={next}
      nextLabel="Personalize my care"
      later={{ label: "I’ll do this later", onPress: () => router.replace("/plan") }}
      nextDisabled={!picked.length}
      overlay={adding && <OtherSheet onSave={add} onClose={() => setAdding(false)} />}
    >
      <View style={styles.tabs} accessibilityRole="tablist">
        <Tab label="Your goals" note={picked.length ? `${picked.length} chosen` : undefined} on={tab === "goals"} onPress={() => setTab("goals")} />
        <Tab label="Life assessment" note={`${answered}/${TOTAL_QUESTIONS}`} on={tab === "life"} onPress={() => setTab("life")} />
      </View>
      {tab === "goals" ? (
        <>
          <View style={styles.search}>
            <MagnifyingGlass size={18} color={ink.tertiary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${GOAL_TOTAL} goals`}
              placeholderTextColor={ink.tertiary}
              accessibilityLabel="Search goals"
              returnKeyType="search"
              autoCorrect={false}
              style={styles.searchInput}
            />
            {!!query && (
              <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8}>
                <X size={16} color={ink.secondary} />
              </Pressable>
            )}
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sum}>
              <Text style={styles.sumNum}>{picked.length}</Text> of {goals.length} selected
            </Text>
            <View style={styles.sumGap} />
            <Pressable
              onPress={() => setOnly((o) => !o)}
              accessibilityRole="button"
              accessibilityState={{ selected: only }}
              style={({ pressed }) => [styles.pill, only && styles.pillOn, pressed && styles.pressed]}
            >
              <Text style={[styles.pillText, only && styles.pillTextOn]}>Selected only</Text>
            </Pressable>
            <Pressable onPress={() => setPicked([])} disabled={!picked.length} accessibilityRole="button" hitSlop={6}>
              <Text style={[styles.clear, !picked.length && styles.clearOff]}>Clear all</Text>
            </Pressable>
          </View>
          {categories.map((c) => {
            const items = c.goals.filter(match)
            if ((q || only) && !items.length) return null
            const n = c.goals.filter((g) => picked.includes(g)).length
            const expanded = !!(q || only) || open.includes(c.id)
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
          {(q || only) && !goals.some(match) && (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{only && !q ? "Nothing selected yet" : `No goals match “${query.trim()}”`}</Text>
              <Text style={styles.emptyNote}>{only && !q ? "Choose goals and they will show here." : "Try a shorter word, like “sleep” or “walk”."}</Text>
            </View>
          )}
          <Pressable onPress={() => setAdding(true)} accessibilityRole="button" style={({ pressed }) => [styles.other, pressed && styles.pressed]}>
            <Plus size={20} color={HUE.neutral.ink} />
            <Text style={styles.label}>Other</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.scaleNote}>
            Rate each from 0 to 10. Higher is always better: 0 is not at all, 5 is moderate, 10 is completely.
          </Text>
          <FlourishingAssessment answers={assessment} onAnswer={answer} />
        </>
      )}
    </PlanStepPage>
  )
}

/** One of the two views of this step: a pill, teal when it is the one
    showing, with a quiet count beside it. */
function Tab({ label, note, on, onPress }: { label: string; note?: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [styles.tab, on && styles.tabOn, pressed && styles.pressed]}
    >
      <Text style={[styles.tabText, on && styles.tabTextOn]}>{label}</Text>
      {!!note && <Text style={[styles.tabNote, on && styles.tabNoteOn]}>{note}</Text>}
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

  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 44,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: hairline.outline,
    backgroundColor: color.background,
  },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: 14, color: ink.strong, padding: 0 },
  sumRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  sum: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: ink.secondary },
  sumNum: { fontFamily: font.semibold, color: ink.primary },
  sumGap: { flex: 1 },
  pill: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 99, borderWidth: 1, borderColor: hairline.outline, backgroundColor: color.background },
  pillOn: { backgroundColor: color.primary, borderColor: color.primary },
  pillText: { fontFamily: font.medium, fontSize: 12, lineHeight: 14, color: ink.secondary },
  pillTextOn: { color: color.onPrimary },
  clear: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, color: color.primaryText },
  clearOff: { color: ink.tertiary, opacity: 0.6 },

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
  empty: { alignItems: "center", gap: 6, paddingVertical: 28, paddingHorizontal: 12 },
  emptyTitle: { fontFamily: font.medium, fontSize: 15, lineHeight: 20, color: ink.strong },
  emptyNote: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 20, color: ink.secondary, textAlign: "center" },
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

  tabs: {
    flexDirection: "row",
    padding: 3,
    gap: 3,
    borderRadius: 12,
    backgroundColor: color.surface,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.mark,
    minHeight: 36,
    borderRadius: 10,
  },
  tabOn: { backgroundColor: color.background, boxShadow: "0 1px 2px rgba(16, 24, 40, 0.08)" },
  tabText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: ink.secondary },
  tabTextOn: { color: ink.strong },
  tabNote: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: ink.tertiary },
  tabNoteOn: { color: ink.primary },
  scaleNote: { ...type.body, color: ink.secondary },

  sheetFrame: { position: "absolute", top: 0, left: 0, right: 0 },

})
