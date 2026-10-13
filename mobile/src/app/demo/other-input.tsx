import * as React from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { Check, PencilSimple, Plus, X } from "@/components/ph"
import { Chip, HUE, Tile } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { TextField } from "@/components/ui"
import { cardRadius, color, font, hairline, ink, space, type } from "@/lib/theme"

/* Review page, not a product screen: five ways the goals screen could take
   the "Other" answer once it is ticked. Every variation keeps the goals
   screen's row, tile, checkbox, field, type and spacing; only how she types
   the custom answer changes. Each one: a visible label (never placeholder
   only), a 60 character limit, Continue held back until there is an answer,
   and a 44 point touch target on every control. */

const MAX = 60
const SUGGESTIONS = ["Reduce stress", "Better digestion", "Less joint pain", "Quit smoking"]

/** The goals screen's "Other" row, ticked. `children` replaces the label. */
function OtherRow({ on = true, onPress, children, label = "Other" }: { on?: boolean; onPress?: () => void; children?: React.ReactNode; label?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      aria-checked={on}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && styles.pressed]}
    >
      <Tile hue="neutral" size={32}>
        <Plus size={18} color={HUE.neutral.ink} />
      </Tile>
      {children ?? <Text style={styles.label}>Other</Text>}
      <View style={[styles.box, on && styles.boxOn]}>{on && <Check size={12} color={color.onPrimary} weight="bold" />}</View>
    </Pressable>
  )
}

const Counter = ({ n }: { n: number }) => (
  <Text style={[styles.meta, n >= MAX && styles.metaFull]} accessibilityLiveRegion="polite" accessibilityLabel={`${n} of ${MAX} characters`}>
    {n}/{MAX}
  </Text>
)

/* 1 · Inline field (today's pattern, hardened): the field opens under the
   row, takes focus, shows a counter and says what is missing. */
function Inline() {
  const [text, setText] = React.useState("")
  return (
    <View style={styles.stack}>
      <OtherRow />
      <View style={styles.pad}>
        <TextField
          label="What else would you like to improve?"
          value={text}
          onChangeText={setText}
          placeholder="In your own words"
          maxLength={MAX}
          autoFocus
          returnKeyType="done"
        />
        <View style={styles.hintRow}>
          <Text style={styles.meta}>{text.trim() ? " " : "Required to continue"}</Text>
          <Counter n={text.length} />
        </View>
      </View>
    </View>
  )
}

/* 2 · Sheet: the row opens a bottom sheet with one roomy multiline field,
   and the answer comes back as the row's second line with an Edit pencil.
   Keeps the list short; best when the answer may be a sentence. */
function SheetInput() {
  const [saved, setSaved] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  return (
    <View style={styles.stack}>
      <OtherRow onPress={() => (setDraft(saved), setOpen(true))} label={saved ? `Other: ${saved}` : "Other"}>
        <View style={styles.grow}>
          <Text style={styles.label}>Other</Text>
          <Text style={[styles.meta, !saved && styles.metaWarn]} numberOfLines={1}>
            {saved || "Tap to add what you want to improve"}
          </Text>
        </View>
        <PencilSimple size={16} color={ink.secondary} />
      </OtherRow>
      {open && (
        <View style={styles.sheetHost}>
          <Sheet title="What else would you like to improve?" onClose={() => setOpen(false)}>
            <View style={styles.sheetBody}>
              <TextField label="In your own words" value={draft} onChangeText={setDraft} multiline maxLength={MAX} autoFocus placeholder="e.g. Reduce stress" />
              <View style={styles.hintRow}>
                <Text style={styles.meta}> </Text>
                <Counter n={draft.length} />
              </View>
              <PrimaryButton disabled={!draft.trim()} onPress={() => (setSaved(draft.trim()), setOpen(false))}>
                Save
              </PrimaryButton>
            </View>
          </Sheet>
        </View>
      )}
    </View>
  )
}

/* 3 · Suggestions + free text: common answers as chips under the row. One
   tap fills the field, which stays editable. Lowest typing effort. */
function Suggested() {
  const [text, setText] = React.useState("")
  return (
    <View style={styles.stack}>
      <OtherRow />
      <View style={styles.pad}>
        <Text style={styles.meta}>Popular answers</Text>
        <View style={styles.chips}>
          {SUGGESTIONS.map((s) => (
            <Chip key={s} label={s} selected={text === s} onPress={() => setText(text === s ? "" : s)} radio />
          ))}
        </View>
        <TextField label="Or write your own" value={text} onChangeText={setText} placeholder="In your own words" maxLength={MAX} returnKeyType="done" />
      </View>
    </View>
  )
}

/* 4 · Add as chips: she can name more than one thing. Type, press Add (or
   the keyboard's return) and each answer becomes a removable chip. */
function Tokens() {
  const [items, setItems] = React.useState<string[]>([])
  const [text, setText] = React.useState("")
  const add = () => {
    const t = text.trim()
    if (!t || items.some((i) => i.toLowerCase() === t.toLowerCase()) || items.length >= 5) return
    setItems([...items, t])
    setText("")
  }
  return (
    <View style={styles.stack}>
      <OtherRow />
      <View style={styles.pad}>
        <View style={styles.addRow}>
          <View style={styles.grow}>
            <TextField label="What else would you like to improve?" value={text} onChangeText={setText} placeholder="Add one at a time" maxLength={MAX} returnKeyType="done" onSubmitEditing={add} blurOnSubmit={false} />
          </View>
          <Pressable onPress={add} disabled={!text.trim()} accessibilityRole="button" accessibilityLabel="Add" style={({ pressed }) => [styles.add, !text.trim() && styles.addOff, pressed && styles.pressed]}>
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        </View>
        <View style={styles.chips}>
          {items.map((i) => (
            <Pressable key={i} onPress={() => setItems(items.filter((x) => x !== i))} accessibilityRole="button" accessibilityLabel={`Remove ${i}`} style={styles.token}>
              <Text style={styles.tokenText}>{i}</Text>
              <X size={14} color={color.primary} />
            </Pressable>
          ))}
        </View>
        <Text style={styles.meta}>{items.length === 0 ? "Add at least one to continue" : `${items.length} of 5 added`}</Text>
      </View>
    </View>
  )
}

/* 5 · In the row: the "Other" label turns into the input itself, so the
   list does not grow or jump. A clear button resets it, and an empty field
   falls back to the word "Other" when it loses focus. */
function InRow() {
  const [text, setText] = React.useState("")
  const ref = React.useRef<TextInput>(null)
  return (
    <View style={styles.stack}>
      <OtherRow label="Other, type your own goal" onPress={() => ref.current?.focus()}>
        <TextInput
          ref={ref}
          value={text}
          onChangeText={setText}
          placeholder="Other: type your goal"
          placeholderTextColor={color.placeholder}
          maxLength={MAX}
          autoFocus
          returnKeyType="done"
          accessibilityLabel="Other, what would you like to improve"
          style={styles.inRow}
        />
        {!!text && (
          <Pressable onPress={() => setText("")} accessibilityRole="button" accessibilityLabel="Clear" hitSlop={12}>
            <X size={16} color={ink.secondary} />
          </Pressable>
        )}
      </OtherRow>
      <View style={styles.pad}>
        <View style={styles.hintRow}>
          <Text style={styles.meta}>{text.trim() ? " " : "Required to continue"}</Text>
          <Counter n={text.length} />
        </View>
      </View>
    </View>
  )
}

const VARIANTS = [
  { id: "1", name: "Inline field", note: "Today's pattern, hardened: auto focus, counter, required hint.", Body: Inline },
  { id: "2", name: "Bottom sheet", note: "Keeps the list short; the answer returns as the row's second line.", Body: SheetInput },
  { id: "3", name: "Suggestions + free text", note: "One tap for common answers, still editable.", Body: Suggested },
  { id: "4", name: "Add as chips", note: "For more than one answer: Add, return, remove with a tap.", Body: Tokens },
  { id: "5", name: "Type in the row", note: "The label becomes the input; nothing shifts on the page.", Body: InRow },
]

export default function OtherInputReview() {
  return (
    <FlowScreen page title="“Other” input options">
      {VARIANTS.map(({ id, name, note, Body }) => (
        <View key={id} style={styles.variant}>
          <Text style={styles.name} accessibilityRole="header">{`${id} · ${name}`}</Text>
          <Text style={styles.meta}>{note}</Text>
          <Body />
        </View>
      ))}
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  variant: { gap: space.inline, paddingBottom: space.stack },
  name: { ...type.section },
  stack: { gap: space.inline },
  pad: { paddingHorizontal: space.stack, gap: space.inline },
  grow: { flex: 1, gap: 2 },
  meta: { ...type.meta },
  metaWarn: { color: color.error },
  metaFull: { color: color.error },
  hintRow: { flexDirection: "row", justifyContent: "space-between" },
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  addRow: { flexDirection: "row", alignItems: "flex-end", gap: space.inline },
  add: { minHeight: 48, minWidth: 64, paddingHorizontal: space.card, borderRadius: 12, backgroundColor: color.primary, alignItems: "center", justifyContent: "center" },
  addOff: { opacity: 0.4 },
  addText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.onPrimary },
  token: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: color.primary, backgroundColor: color.primaryTint },
  tokenText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.primary },
  inRow: { flex: 1, ...type.title, minHeight: 44, padding: 0 },
  sheetHost: { height: 360, borderRadius: cardRadius, overflow: "hidden" },
  sheetBody: { gap: space.inline },
})
