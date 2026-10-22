import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { BowlFood, Check } from "@/components/ph"
import { foodsLine } from "@/components/member-day-nutrient"
import { Group, NeedsRow, Tag } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { Button } from "@/components/ui"
import {
  MEAL_SLOTS,
  NUTRIENTS,
  addDays,
  dayFrom,
  dayLabel,
  localDay,
  mealLine,
  mealName,
  totalsOf,
  type Amount,
  type Meal,
  type MealSlot,
  type MemberProfile,
  type NutrientId,
} from "@/lib/member"
import { chart, color, font, ink, space, type } from "@/lib/theme"
import { formatNumber } from "@/lib/trends"

/* The pieces the diet plan and log a meal share (FINAL-SPEC C.21, C.22):
   a meal's numbers in words, the words for each meal slot ("Log lunch",
   "Save as a snack"), the day a meal is logged for, the recent meals she
   can log again, the row a logged meal is listed in (a day lists its meals
   in it too), and the sheet that shows one logged meal with Edit and
   Delete. */

/* ---------------------------------------------------------- words -- */

export const slotName = (slot: MealSlot) => MEAL_SLOTS.find((m) => m.id === slot)?.name ?? "Meal"

/** "Log lunch", "Log a snack". */
export const logLabel = (slot: MealSlot) => (slot === "snack" ? "Log a snack" : `Log ${slotName(slot).toLowerCase()}`)

export const isSlot = (v: unknown): v is MealSlot => MEAL_SLOTS.some((m) => m.id === v)

/** Keeps an amount with its unit and what it measures on one line
    ("18 g protein", "352 kcal"), so a wrapped line never strands a unit. */
export const unbroken = (text: string) => text.replace(/(\d) (?=(kcal|g|mg|oz)\b)/g, "$1\u00A0").replace(/\b(g|mg) (?=[a-z])/g, "$1\u00A0")

/** "46 g protein, 11 g fiber, 0 g added sugar": the plan's nutrients in
    words. A known subtotal reads "at least"; no value reads "no fiber data",
    never zero (M-17). */
export function nutrientLine(totals: Partial<Record<NutrientId, Amount>>, ids: NutrientId[]) {
  return ids
    .map((id) => {
      const n = NUTRIENTS[id]
      const a = totals[id]
      if (!a) return `no ${n.name.toLowerCase()} data`
      return `${a.partial ? "at least " : ""}${formatNumber(Math.round(a.value))} ${n.unit} ${n.name.toLowerCase()}`
    })
    .map(unbroken)
    .join(", ")
    .replace(/^./, (c) => c.toUpperCase())
}

/** Minutes after midnight for "8:05 AM", to order a day's meals. */
export function minutesOf(time: string) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim())
  if (!m) return 0
  return ((Number(m[1]) % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0)) * 60 + Number(m[2])
}

/* ------------------------------------------------------------ days -- */

/** The day a meal is logged for: today, or an earlier day from `?day`
    ("yesterday" or a local key, "2026-10-04"). */
export type LogDay = { key: string; today: boolean; yesterday: boolean; label: string }

export function logDay(param: string | undefined, now: Date = new Date()): LogDay {
  const today = localDay(now)
  let date = now
  if (param === "yesterday") date = addDays(now, -1)
  else if (param && /^\d{4}-\d{2}-\d{2}$/.test(param) && param < today) date = dayFrom(param)
  const key = localDay(date)
  return { key, today: key === today, yesterday: key === localDay(addDays(now, -1)), label: dayLabel(date) }
}

/** The save button: "Save to lunch", "Save as a snack", "Save to
    yesterday's dinner", "Save to lunch on Fri, Oct 2". */
export function saveLabel(slot: MealSlot, day: LogDay) {
  const name = slotName(slot).toLowerCase()
  if (day.today) return slot === "snack" ? "Save as a snack" : `Save to ${name}`
  if (day.yesterday) return slot === "snack" ? "Save as yesterday's snack" : `Save to yesterday's ${name}`
  return slot === "snack" ? `Save as a snack on ${day.label}` : `Save to ${name} on ${day.label}`
}

/* ------------------------------------------------------- log again -- */

/** Meals she can log again in one tap (M-19), for the slot she picked:
    the latest checked snacks for a snack, else the latest checked main
    meals; newest first, one of each, never an estimate. */
export function recentMeals(meals: Record<string, Meal[]> | undefined, now: Date = new Date(), max = 2, slot?: MealSlot): Meal[] {
  const today = localDay(now)
  const snack = slot === "snack"
  const days = Object.keys(meals ?? {})
    .filter((d) => d <= today)
    .sort()
    .reverse()
  const out: Meal[] = []
  for (const d of days) {
    const list = [...(meals?.[d] ?? [])].sort((a, b) => minutesOf(b.time) - minutesOf(a.time))
    for (const m of list) {
      if (m.status !== "confirmed" || (m.slot === "snack") !== snack || !m.foods.length) continue
      if (out.some((o) => mealName(o) === mealName(m))) continue
      out.push(m)
      if (out.length === max) return out
    }
  }
  return out
}

/* ---------------------------------------------------------- pieces -- */

/** A logged meal's green check. */
export function LoggedCheck() {
  return (
    <View style={styles.check} accessible accessibilityLabel="Logged">
      <Check size={12} color={color.onPrimary} weight="bold" />
    </View>
  )
}

/** A logged meal as a row, the same on the diet plan and on a day (C.21,
    C.24): the slot and its time, then what she ate and the meal's line on
    her plan ("Greek yogurt with almonds. 280 kcal, 250 mg calcium, 20 g
    protein"), with "Estimated" for a meal kept as an estimate. What she ate
    is the meal's own name, or for a meal without one its foods in a short
    phrase, so the facts keep to the row's two lines on the narrowest phone.
    The diet plan adds its check and opens the meal; a day only lists it. */
export function MealRow({
  meal,
  plan,
  right,
  onPress,
}: {
  meal: Meal
  plan: Pick<MemberProfile, "mealNutrients">
  right?: React.ReactNode
  onPress?: () => void
}) {
  const name = slotName(meal.slot)
  const words = [meal.title ?? foodsLine(meal), mealLine(meal, plan)].filter(Boolean).join(". ")
  const estimated = meal.status === "estimated"
  return (
    <NeedsRow
      icon={<BowlFood size={16} color={color.primary} />}
      title={`${name}, ${meal.time}`}
      meta={words}
      tag={estimated ? { tone: "muted", label: "Estimated" } : undefined}
      right={right}
      onPress={onPress}
      chevron={false}
      accessibilityLabel={`${name}, logged at ${meal.time}, ${words}${estimated ? ", estimated" : ""}`}
    />
  )
}

/** Energy on the right of a food row: "190 kcal", or "Not known". */
export function Kcal({ value }: { value?: number }) {
  if (value === undefined) return <Text style={styles.unknown}>Not known</Text>
  return (
    <Text style={styles.value}>
      {formatNumber(Math.round(value))}
      <Text style={styles.unit}>{" kcal"}</Text>
    </Text>
  )
}

/** A food row's energy for a screen reader: "190 kilocalories", or
    "energy not known". */
export const kcalWords = (value?: number) => (value === undefined ? "energy not known" : `${formatNumber(Math.round(value))} kilocalories`)

/** A meal's energy as a headline: "About 405 kcal" for an estimate, "At
    least 190 kcal" when a food has no value, "Nutrients not known" when
    none has. The words are the card's title, the number a stat inside it. */
export function TotalsHead({ kcal, about = true }: { kcal?: Amount; about?: boolean }) {
  if (!kcal) return <Text style={styles.headline}>Nutrients not known</Text>
  const lead = kcal.partial ? "At least " : about ? "About " : ""
  return (
    <Text style={styles.headline}>
      {lead}
      <Text style={styles.stat}>{formatNumber(Math.round(kcal.value))}</Text>
      <Text style={styles.statUnit}>{" kcal"}</Text>
    </Text>
  )
}

const HOW: Record<Meal["how"], string> = { photo: "from a photo", voice: "by voice", typed: "typed in", again: "logged again", scan: "scanned from the package" }

/** One logged meal from the diet plan: its foods, its totals, and Edit and
    Delete. Delete asks once more in the same sheet. */
export function MealSheet({
  meal,
  ids,
  dayWord = "today's",
  onEdit,
  onDelete,
  onClose,
}: {
  meal: Meal
  /** The plan's nutrients for the totals line, without calories. */
  ids: NutrientId[]
  /** Whose totals it comes off: "today's". */
  dayWord?: string
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const [confirming, setConfirming] = React.useState(false)
  const name = slotName(meal.slot)
  const totals = totalsOf([meal])
  if (confirming)
    return (
      <Sheet title={`Delete ${name.toLowerCase()}?`} onClose={onClose}>
        <Text style={styles.body}>
          {totals.calories ? `Its ${formatNumber(Math.round(totals.calories.value))} kcal come off ${dayWord} totals.` : `It comes off ${dayWord} totals.`}
        </Text>
        <View style={styles.buttons}>
          <View style={styles.button}>
            <Button variant="outline" onPress={() => setConfirming(false)}>
              Keep it
            </Button>
          </View>
          <View style={styles.button}>
            <Button variant="destructive" onPress={onDelete}>
              Delete
            </Button>
          </View>
        </View>
      </Sheet>
    )
  return (
    <Sheet title={name} onClose={onClose}>
      <Text style={styles.meta}>{`${meal.time}, ${HOW[meal.how]}`}</Text>
      <Group>
        {meal.foods.map((f, i) => (
          <NeedsRow
            key={`${f.name}-${i}`}
            title={f.name}
            meta={f.portion}
            right={<Kcal value={f.nutrients.calories} />}
            accessibilityLabel={`${f.name}, ${f.portion}, ${kcalWords(f.nutrients.calories)}`}
          />
        ))}
      </Group>
      <View style={styles.totals}>
        <View style={styles.totalsTop}>
          <TotalsHead kcal={totals.calories} about={false} />
          {meal.status === "estimated" && <Tag tone="muted">Estimated</Tag>}
        </View>
        <Text style={styles.label}>{nutrientLine(totals, ids)}</Text>
        {!!meal.note && <Text style={styles.meta}>{meal.note}</Text>}
      </View>
      <View style={styles.buttons}>
        <View style={styles.button}>
          <Button variant="outline" onPress={onEdit}>
            Edit
          </Button>
        </View>
        <View style={styles.button}>
          <Button variant="destructive" onPress={() => setConfirming(true)}>
            Delete
          </Button>
        </View>
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  // A green mark, as every done or in range mark is.
  check: { width: 20, height: 20, borderRadius: 10, backgroundColor: chart.inRange, alignItems: "center", justifyContent: "center" },
  // Amounts in a column of rows line up.
  value: { ...type.value, fontVariant: ["tabular-nums"] },
  unit: { ...type.unit },
  unknown: { ...type.meta },
  // The meal's energy: its words a card title, its number a stat in
  // proportional figures (a headline, not a column).
  headline: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: ink.content },
  stat: { ...type.stat },
  statUnit: { ...type.unit },
  body: { ...type.body },
  label: { ...type.label },
  meta: { ...type.meta },
  totals: { gap: space.stack },
  totalsTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item },
  buttons: { flexDirection: "row", gap: space.item },
  button: { flex: 1 },
})
