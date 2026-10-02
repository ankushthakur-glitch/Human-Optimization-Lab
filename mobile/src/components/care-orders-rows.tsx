import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { IconCheck, IconChevronRight } from "@/components/icons"
import { color, ink, space, type } from "@/lib/theme"

/* The care screens' rows, composed with the record kit's row metrics, for
   the two places its NeedsRow is not the right piece (To do's rows are
   NeedsRow with its action on the title line):

   QuietRow   the partner offer on a test: optional, under the main ways to
              book, in smaller grey words (F-51)
   ChoiceRow  one place in a single choice list, with a round mark */

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
      <IconChevronRight size={16} color={ink.tertiary} />
    </Pressable>
  )
}

/** One option in a single choice list (a place to book): the name, its
    facts, and a round mark that fills teal with a check when chosen. Put
    them in a Group inside a View with accessibilityRole "radiogroup". */
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
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <IconCheck size={12} color={color.onPrimary} strokeWidth={3} />}</View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // The kit's row (NeedsRow): its words 12 from the rule above and below,
  // the title over its facts as Frontline stacks a 14 pt title over a 12 pt
  // line.
  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
  pressed: { opacity: 0.6 },
  body: { flex: 1, gap: space.line },
  title: { ...type.title },
  meta: { ...type.label },

  quiet: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY, paddingHorizontal: space.rowX },
  quietTitle: { ...type.label },
  quietMeta: { ...type.meta },

  // An empty ring until chosen, in the resting edge of a field, as the
  // consent screens' radios draw it.
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: color.inputBorder, alignItems: "center", justifyContent: "center" },
  radioOn: { backgroundColor: color.primary, borderColor: color.primary },
})
