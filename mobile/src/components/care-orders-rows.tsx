import * as React from "react"
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"

import { CaretRight, Check, Info } from "@/components/ph"
import type { Step } from "@/components/record-kit"
import { card, color, font, hairline, ink, space, type } from "@/lib/theme"

/* The care screens' own pieces (To do, a test, a care gap, a visit, and
   their sheets), drawn to the Figma "Hol" file (5 Oct 2026) where the
   record kit has no piece of the same shape:

   HeadCard     the teal tinted card a detail page opens with
   KindLine     a 28 tile on Primary/01 and the kind's name, inside it
   Reminders    the reminders as a dotted timeline (Figma "Clinical course")
   IconAction   a small action with an icon, stretched in a row of them
   SmallLink    a 12 medium text button in Primary/08: "Change", "Remove"
   InfoNote     the blue note at the top of a booking sheet
   SheetRows    rows on a sheet's white, split by rules, no card
   QuietRow     the partner offer on a test: optional, under the main ways
                to book, in smaller grey words (F-51)
   ChoiceRow    one place in a single choice list, with a round mark */

/** The tinted card at the top of a detail page: Primary/00 with a
    Primary/02 edge, 12.5 inside (Figma's 12 plus the edge's half). */
export function HeadCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.head, style]}>{children}</View>
}

/** What a care gap is, at the head of its page: its icon on a Primary/01
    tile, 6 from its name. */
export function KindLine({ icon, children }: { icon: React.ReactNode; children: string }) {
  return (
    <View style={styles.kind}>
      <View style={styles.kindTile}>{icon}</View>
      <Text style={styles.kindText}>{children}</Text>
    </View>
  )
}

/** The reminders sent so far and what comes after them: an 18 mark down a
    2 pt rail, done filled teal with a check, still to come a grey ring,
    the step after the last reminder a clay ring once it is reached. Done
    and reached steps read in Grey/09 medium, the ones still to come in
    Grey/07. */
export function Reminders({ steps }: { steps: Step[] }) {
  return (
    <View>
      {steps.map((s, i) => {
        const last = i === steps.length - 1
        const later = s.state === "next"
        return (
          <View key={i} style={styles.step}>
            <View style={styles.rail}>
              <View style={[styles.node, s.state === "done" && styles.nodeDone, s.state === "alert" && styles.nodeAlert]}>
                {s.state === "done" && <Check size={10} color={color.onPrimary} weight="bold" />}
              </View>
              {!last && <View style={styles.railLine} />}
            </View>
            <View style={[styles.stepBody, !last && styles.stepGap]}>
              <Text style={[styles.stepLabel, later && styles.stepLater]}>{s.label}</Text>
              {!!s.date && <Text style={styles.stepDate}>{s.date}</Text>}
            </View>
          </View>
        )
      })}
    </View>
  )
}

/** A small action with its icon ("Add to calendar", "Directions",
    "Call"): Primary/00, a Primary/02 edge, 12 medium in Primary/08. In a
    row they share the width (`grow`) or keep their own. */
export function IconAction({ icon, children, onPress, grow, width }: { icon: React.ReactNode; children: string; onPress: () => void; grow?: boolean; width?: number }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={4} style={({ pressed }) => [styles.iconAction, grow && styles.grow, !!width && { width }, pressed && styles.pressed]}>
      {icon}
      <Text style={styles.iconActionText}>{children}</Text>
    </Pressable>
  )
}

/** A text button inside a row, 12 medium in Primary/08 with no
    container: "Change", "Remove", "Save". */
export function SmallLink({ children, onPress, accessibilityLabel }: { children: string; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
      <Text style={styles.smallLink}>{children}</Text>
    </Pressable>
  )
}

/** Something to know before the day, on the blue tint (Figma's info
    note): fasting, or what to skip on the day. */
export function InfoNote({ children }: { children: string }) {
  return (
    <View style={styles.note} accessible accessibilityRole="text">
      <Info size={18} color={INFO_INK} />
      <Text style={styles.noteText}>{children}</Text>
    </View>
  )
}

/** Rows straight on a sheet's white, split by full width rules (Figma's
    "Update test"): no card around them. */
export function SheetRows({ children }: { children: React.ReactNode }) {
  const rows = React.Children.toArray(children).filter(Boolean)
  return (
    <View style={styles.sheetRows}>
      {rows.map((row, i) => (
        <View key={i} style={[styles.sheetRow, i < rows.length - 1 && styles.sheetRule]}>
          {row}
        </View>
      ))}
    </View>
  )
}

/** A quiet choice under the main ones: smaller grey words, a chevron, no
    tile. The partner offer on a test (F-51) is the one use. */
export function QuietRow({ title, meta, onPress }: { title: string; meta?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, meta].filter(Boolean).join(", ")}
      style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
    >
      <View style={styles.body}>
        <Text style={styles.quietTitle}>{title}</Text>
        {!!meta && <Text style={styles.quietMeta}>{meta}</Text>}
      </View>
      <CaretRight size={16} color={card.chevron} />
    </Pressable>
  )
}

/** One option in a single choice list (a place to book): the name, its
    facts, and a 16 round mark, a grey ring until chosen, then teal with a
    check. Put them in a Group inside a View with accessibilityRole
    "radiogroup". */
export function ChoiceRow({ title, meta, selected, onPress }: { title: string; meta?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityLabel={[title, meta].filter(Boolean).join(", ")}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {!!meta && <Text style={styles.meta}>{meta}</Text>}
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <Check size={9} color={color.onPrimary} weight="bold" />}</View>
    </Pressable>
  )
}

/** Figma's info blue and its tint. */
const INFO_INK = "#3056D3"

/** The reminders' mark. */
const NODE = 18

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  grow: { flex: 1 },

  head: {
    backgroundColor: color.primaryTint,
    borderWidth: 1,
    borderColor: color.primaryEdge,
    borderRadius: 8,
    padding: 11.5,
    gap: space.inline,
    boxShadow: card.shadow,
  },
  kind: { flexDirection: "row", alignItems: "center", gap: space.mark },
  kindTile: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.primarySoft, alignItems: "center", justifyContent: "center" },
  kindText: { ...type.title, color: ink.detail, flexShrink: 1 },

  step: { flexDirection: "row", gap: space.item },
  rail: { alignItems: "center", width: NODE },
  node: { width: NODE, height: NODE, borderRadius: NODE / 2, borderWidth: 1.6, borderColor: hairline.outline, alignItems: "center", justifyContent: "center" },
  nodeDone: { backgroundColor: color.primary, borderColor: color.primary },
  // The step after the last reminder, once reached: clay, never red.
  nodeAlert: { borderColor: "#C8641B", borderWidth: 2 },
  railLine: { flex: 1, width: 2, backgroundColor: hairline.outline },
  stepBody: { flex: 1, gap: space.stack },
  stepGap: { paddingBottom: space.item },
  stepLabel: { ...type.title },
  stepLater: { fontFamily: font.regular, color: ink.secondary },
  stepDate: { ...type.label },

  iconAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.inline,
    paddingHorizontal: 10,
    paddingVertical: space.inline,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.primaryEdge,
    backgroundColor: color.primaryTint,
    boxShadow: card.shadowXs,
  },
  iconActionText: { ...type.action },
  smallLink: { ...type.action, lineHeight: 17 },

  note: { flexDirection: "row", alignItems: "center", gap: space.mark, padding: space.inline, borderRadius: 8, borderWidth: 1, borderColor: "#C7D5FF", backgroundColor: "#F0F4FF" },
  noteText: { flex: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink.strong },

  // The sheet's own 16 above the first row is the row's: each row keeps 16
  // above and below its words (the kit row's 12 plus 4).
  sheetRows: { marginTop: -space.gutter },
  sheetRow: { paddingVertical: space.gutter - space.rowY },
  sheetRule: { borderBottomWidth: 1, borderBottomColor: hairline.rule },

  // The kit's row (NeedsRow): its words 12 from the rule above and below.
  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
  body: { flex: 1, gap: space.stack },
  title: { ...type.title },
  meta: { ...type.label },

  quiet: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY, paddingHorizontal: space.rowX },
  quietTitle: { ...type.label },
  quietMeta: { ...type.meta },

  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: hairline.outline, alignItems: "center", justifyContent: "center" },
  radioOn: { backgroundColor: color.primary, borderColor: color.primary },
})
