import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { CaretLeft, CaretRight } from "@/components/ph"
import { Sheet } from "@/components/sheet"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* The app's date and time pickers, in sheets, the mobile twin of the
   portal's Calendar and DatePicker (src/design-system/ui): a month with
   Back and Next, the weekday letters, and the days in a grid, today on a
   grey tint, the chosen day filled teal, days that can't be picked faded.
   The time picker uses the same cells for the times on offer. Picking
   closes the sheet. Days are local day keys ("2026-10-13"), as bookings
   keep them. */

const pad = (n: number) => String(n).padStart(2, "0")
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dateOf = (key: string) => {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

/** The weeks of a month, Sunday first, with blanks before the 1st and
    after the last day. */
function weeksOf(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1)
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1))]
  while (cells.length % 7) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7))
}

/** A month of days to pick one from. `open` says which days can be
    picked; the months move only as far as the first and last of them. */
export function DatePickerSheet({
  title = "Select date",
  value,
  open,
  onPick,
  onClose,
}: {
  title?: string
  /** The chosen day, a local day key. */
  value?: string
  /** The days that can be picked, as local day keys, in order. */
  open: string[]
  onPick: (day: string) => void
  onClose: () => void
}) {
  const can = new Set(open)
  const start = dateOf(value ?? open[0] ?? keyOf(new Date()))
  const [month, setMonth] = React.useState({ y: start.getFullYear(), m: start.getMonth() })
  const first = open[0] ? dateOf(open[0]) : undefined
  const last = open.length ? dateOf(open[open.length - 1]) : undefined
  const index = month.y * 12 + month.m
  const hasBack = !!first && first.getFullYear() * 12 + first.getMonth() < index
  const hasNext = !!last && last.getFullYear() * 12 + last.getMonth() > index
  const move = (by: number) => setMonth(({ y, m }) => ({ y: Math.floor((y * 12 + m + by) / 12), m: (((m + by) % 12) + 12) % 12 }))
  const today = keyOf(new Date())
  const label = new Date(month.y, month.m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })

  return (
    <Sheet title={title} onClose={onClose}>
      <View style={styles.calendar}>
        <View style={styles.caption}>
          <NavButton dir="back" disabled={!hasBack} onPress={() => move(-1)} />
          <Text style={styles.month} accessibilityRole="header" accessibilityLiveRegion="polite">
            {label}
          </Text>
          <NavButton dir="next" disabled={!hasNext} onPress={() => move(1)} />
        </View>
        <View style={styles.week}>
          {WEEKDAYS.map((w) => (
            <Text key={w} style={[styles.cell, styles.weekday]}>
              {w}
            </Text>
          ))}
        </View>
        {weeksOf(month.y, month.m).map((week, i) => (
          <View key={i} style={styles.week}>
            {week.map((d, j) => {
              if (!d) return <View key={j} style={styles.cell} />
              const key = keyOf(d)
              const on = key === value
              const ok = can.has(key)
              return (
                <View key={j} style={styles.cell}>
                  <Pressable
                    onPress={() => onPick(key)}
                    disabled={!ok}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on, disabled: !ok }}
                    accessibilityLabel={d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    style={({ pressed }) => [styles.day, key === today && styles.today, on && styles.chosen, pressed && styles.pressed]}
                  >
                    <Text style={[styles.dayText, !ok && styles.off, on && styles.chosenText]}>{d.getDate()}</Text>
                  </Pressable>
                </View>
              )
            })}
          </View>
        ))}
      </View>
    </Sheet>
  )
}

function NavButton({ dir, disabled, onPress }: { dir: "back" | "next"; disabled: boolean; onPress: () => void }) {
  const Icon = dir === "back" ? CaretLeft : CaretRight
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={dir === "back" ? "Previous month" : "Next month"}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.nav, disabled && styles.navOff, pressed && styles.pressed]}
    >
      <Icon size={16} color={ink.strong} weight="bold" />
    </Pressable>
  )
}

/** The times on offer for one day, three across, morning and afternoon
    apart. */
export function TimePickerSheet({
  title = "Select time",
  times,
  value,
  onPick,
  onClose,
}: {
  title?: string
  /** "7:30 AM", in order. */
  times: string[]
  value?: string
  onPick: (time: string) => void
  onClose: () => void
}) {
  const parts = [
    { name: "Morning", list: times.filter((t) => /AM$/i.test(t)) },
    { name: "Afternoon", list: times.filter((t) => /PM$/i.test(t)) },
  ].filter((p) => p.list.length)
  return (
    <Sheet title={title} onClose={onClose}>
      <View style={styles.times}>
        {parts.map((p) => (
          <View key={p.name} style={styles.part}>
            <Text style={styles.partName}>{p.name}</Text>
            <View style={styles.slots} accessibilityRole="radiogroup" accessibilityLabel={p.name}>
              {p.list.map((t) => {
                const on = t === value
                return (
                  <Pressable
                    key={t}
                    onPress={() => onPick(t)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={({ pressed }) => [styles.slot, on && styles.chosen, pressed && styles.pressed]}
                  >
                    <Text style={[styles.slotText, on && styles.chosenText]}>{t}</Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        ))}
      </View>
    </Sheet>
  )
}

/** A day cell, and how tall each week row is. */
const DAY = 40

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  calendar: { gap: space.mark },
  caption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.inline },
  month: { ...type.section },
  nav: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: hairline.edge },
  navOff: { opacity: 0.35 },

  week: { flexDirection: "row" },
  cell: { flex: 1, height: DAY, alignItems: "center", justifyContent: "center" },
  weekday: { ...type.label, textAlign: "center", lineHeight: DAY },
  day: { width: DAY, height: DAY, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dayText: { fontFamily: font.medium, fontSize: 15, color: ink.strong, fontVariant: ["tabular-nums"] },
  off: { color: ink.tertiary, opacity: 0.45 },
  today: { backgroundColor: color.surface },
  chosen: { backgroundColor: color.primary, borderColor: color.primary },
  chosenText: { color: color.onPrimary },

  times: { gap: space.section },
  part: { gap: space.inline },
  partName: { ...type.label },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  slot: {
    width: "31.5%",
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  slotText: { fontFamily: font.medium, fontSize: 14, color: ink.strong, fontVariant: ["tabular-nums"] },
})
