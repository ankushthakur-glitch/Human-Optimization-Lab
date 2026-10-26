import * as React from "react"
import { Platform, StyleSheet, Text, TextInput, View, type TextStyle } from "react-native"

import { decimal, digits } from "@/components/today-exercise-parts"
import { card, color, font, hairline, ink, space, surface, touchRadius, type } from "@/lib/theme"

/* A lift's sets as one compact table: Set, Reps and Weight named once over
   the columns, then a row per set with its number and two filled boxes.
   The plan's reps sit in an empty box as a grey hint, so the three sets fit
   a sheet without scrolling. Used by the lift's sheet, a move's page and the
   session log, where it sits on a grey card and the boxes turn white
   (`onInset`). */

export type SetEntry = { reps: string; weight: string }

export function SetTable({ rows, onEdit, target, onInset }: { rows: SetEntry[]; onEdit: (i: number, part: Partial<SetEntry>) => void; target?: string; onInset?: boolean }) {
  return (
    <View style={styles.table}>
      <View style={styles.row}>
        <Text style={[type.label, styles.setCol]}>Set</Text>
        <Text style={[type.label, styles.fill]}>Reps</Text>
        <Text style={[type.label, styles.fill]}>Weight</Text>
      </View>
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          <Text style={[styles.setNum, styles.setCol]}>{i + 1}</Text>
          <Cell label={`Set ${i + 1} reps`} value={row.reps} placeholder={target} onChangeText={(t) => onEdit(i, { reps: digits(t) })} keyboardType="number-pad" onInset={onInset} />
          <Cell label={`Set ${i + 1} weight`} value={row.weight} onChangeText={(t) => onEdit(i, { weight: decimal(t) })} keyboardType="decimal-pad" unit="lb" onInset={onInset} />
        </View>
      ))}
    </View>
  )
}

function Cell({ label, unit, onInset, ...input }: { label: string; unit?: string; onInset?: boolean } & Pick<React.ComponentProps<typeof TextInput>, "value" | "placeholder" | "onChangeText" | "keyboardType">) {
  const [focused, setFocused] = React.useState(false)
  return (
    <View style={[styles.box, onInset && styles.boxOnInset, focused && styles.boxFocused]}>
      <TextInput
        {...input}
        accessibilityLabel={label}
        returnKeyType="done"
        placeholderTextColor={card.chevron}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, unit ? styles.inputUnit : null]}
      />
      {unit && <Text style={styles.unit}>{unit}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  table: { gap: space.inline },
  row: { flexDirection: "row", alignItems: "center", gap: space.item },
  fill: { flex: 1 },
  setCol: { width: 28 },
  setNum: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22, color: ink.detail },
  // A filled box that turns white with the teal edge while she types.
  box: { flex: 1, minWidth: 0, height: 44, flexDirection: "row", alignItems: "center", borderRadius: touchRadius, borderWidth: 1, borderColor: hairline.edge, backgroundColor: surface.inset },
  boxOnInset: { backgroundColor: color.background },
  boxFocused: { borderColor: color.primary, backgroundColor: color.background, boxShadow: `0 0 0 3px ${color.primaryHalo}` },
  input: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    paddingHorizontal: 12,
    textAlign: "center",
    fontFamily: font.semibold,
    fontSize: 16,
    color: ink.strong,
    ...Platform.select({ web: { outlineStyle: "none" } as unknown as TextStyle }),
  },
  // The weight reads against its unit, so it sits right, next to "lb".
  inputUnit: { textAlign: "right", paddingRight: 6 },
  unit: { ...type.unitLarge, paddingRight: 12 },
})
