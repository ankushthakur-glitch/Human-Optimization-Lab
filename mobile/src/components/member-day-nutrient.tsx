import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { WeekBars, formatNumber, type WeekDay } from "@/components/charts"
import { Heading, KeyValue } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { relativeDay } from "@/lib/dates"
import { addDays, dayScore, weekdayOf, type DayScore, type Goal, type Meal, type NutrientId } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { ink, space, type } from "@/lib/theme"

/* One nutrient on one day of the member's plan, opened from a goal row on
   the day page (FINAL-SPEC C.24): the seven days up to that day against
   the goal, the foods it came from that day, and a pattern line only when
   the plan's pattern rule fires (M-32), as coaching, never an alert. The
   sheet does not scroll, so the food list stops at five rows, the last
   naming the smaller foods together.

   The food words live here too, so the day page's meal rows and this list
   name a dish the same way. */

/** A dish without its trimmings: "Turkey sandwich on whole grain bread"
    reads "Turkey sandwich", "Kale cooked in olive oil" reads "Kale". */
export function shortFood(name: string) {
  return name.replace(/ (?:on|with|made with|cooked in) .*$/, "")
}

/* Names that keep their capital in the middle of a phrase. */
const PROPER = /^(?:Greek|Thai|Caesar|Italian|Mexican|Swiss|Cheddar|Parmesan|Dijon)\b/

/** A portion of one whole thing ("1 medium" apple) reads "an apple". */
const ONE = /^1(?: (?:small|medium|large))?$/i

const lowered = (name: string) => (PROPER.test(name) || /^[A-Z]{2}/.test(name) ? name : name.charAt(0).toLowerCase() + name.slice(1))

/** A meal's foods as one phrase: "Vanilla Greek yogurt, granola and
    strawberries", "Turkey sandwich and an apple". Past three foods the
    rest are counted ("Scrambled eggs, whole grain toast and 2 more", the
    count never split from its "more"), so the phrase and the meal's totals
    fit a row's two lines. */
export function foodsLine(meal: Meal) {
  const names = meal.foods.map((f, i) => {
    const name = shortFood(f.name)
    if (i === 0) return name
    const lower = lowered(name)
    return ONE.test(f.portion.trim()) ? `${/^[aeiou]/i.test(lower) ? "an" : "a"} ${lower}` : lower
  })
  if (names.length > 3) return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`
  if (names.length < 2) return names[0] ?? ""
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}

/** A coaching line whose gap stays on one line: "Calcium was 200 mg short"
    wraps before "200 mg short", never inside it. */
export const keepGap = (line: string) => line.replace(/(\d[\d,.]*) (kcal|mg|g) (short|over)/, "$1 $2 $3")

/** A food's name in the list of where a nutrient came from: whole when it
    is short ("Oatmeal made with milk", whose milk is the calcium), the dish
    alone when it is long ("Turkey sandwich"). */
const listName = (name: string) => (name.length <= 24 ? name : shortFood(name))

/** An amount as a row shows it: whole above 10 ("1,050 mg"), one decimal
    below it when it has one ("2.5 g"). It never breaks before its unit, so
    a long food name beside it wraps instead. */
const amountText = (v: number, unit: string) => `${formatNumber(v < 10 ? Math.round(v * 10) / 10 : Math.round(v))}\u00A0${unit}`

/** "Granola", "Granola and white rice", "Granola, baby carrots,
    strawberries and white rice". Past five, the first four are named and
    the rest counted, so the row stays within two lines. */
function namesLine(names: string[]) {
  const words = names.map((name, i) => (i ? lowered(name) : name))
  const named = words.length > 5 ? [...words.slice(0, 4), `${words.length - 4} more`] : words
  return named.length > 1 ? `${named.slice(0, -1).join(", ")} and ${named[named.length - 1]}` : (named[0] ?? "")
}

/** The foods that gave a day its share of one nutrient, largest first (a
    tie goes to the bigger dish), the same dish counted once. Past five, the
    smallest fold into one last row that names them, so that row reads as
    several foods together, not as one food out of order. */
function sourcesOf(meals: Meal[], id: NutrientId) {
  const byName = new Map<string, { name: string; amount: number; kcal: number }>()
  for (const f of meals.flatMap((m) => m.foods)) {
    const v = f.nutrients[id]
    if (v === undefined || v <= 0) continue
    const name = listName(f.name)
    const had = byName.get(name)
    byName.set(name, { name, amount: (had?.amount ?? 0) + v, kcal: (had?.kcal ?? 0) + (f.nutrients.calories ?? 0) })
  }
  const list = [...byName.values()].sort((a, b) => b.amount - a.amount || b.kcal - a.kcal)
  if (list.length <= 5) return list
  const rest = list.slice(4)
  return [...list.slice(0, 4), { name: namesLine(rest.map((f) => f.name)), amount: rest.reduce((sum, f) => sum + f.amount, 0), kcal: 0 }]
}

const amountOf = (d: DayScore, id: NutrientId) => (d.status === "none" ? undefined : d.results.find((r) => r.goal.id === id)?.amount)

/** The pattern rule (M-32), for an "at least" goal: under 80% of it on four
    or more of the last seven complete days, or on average over the last
    thirty. Partial days and days with nothing logged never count. */
function patternOf(goal: Goal, week: DayScore[], month: () => DayScore[]): string | undefined {
  if (goal.kind !== "atLeast") return undefined
  const known = (d: DayScore) => {
    const a = d.status === "complete" ? amountOf(d, goal.id) : undefined
    return a && !a.partial ? a.value : undefined
  }
  const under = week.filter((d) => {
    const v = known(d)
    return v !== undefined && v < 0.8 * goal.target
  }).length
  if (under >= 4) return `Under 80% of your goal on ${under} of the last 7 days.`
  const values = month()
    .map(known)
    .filter((v): v is number => v !== undefined)
  if (values.length >= 7 && values.reduce((sum, v) => sum + v, 0) / values.length < 0.8 * goal.target)
    return "Under 80% of your goal on average over 30 days."
  return undefined
}

export function NutrientSheet({ goal, day, now, onClose }: { goal: Goal; day: Date; now: Date; onClose: () => void }) {
  const s = useOnboarding()
  const week = Array.from({ length: 7 }, (_, i) => dayScore(s, addDays(day, i - 6), now))
  const [picked, setPicked] = React.useState(week.length - 1)

  const bars: WeekDay[] = week.map((d) => {
    const a = amountOf(d, goal.id)
    return {
      label: weekdayOf(d.date),
      value: a ? Math.round(a.value) : undefined,
      partial: d.status !== "complete" || a?.partial || undefined,
      today: d.status === "today" || undefined,
    }
  })
  const chosen = week[picked]
  const bar = bars[picked]
  // A day without an amount says why, where the amount would be.
  const missing = chosen.status === "none" ? "Nothing logged" : `No ${goal.name.toLowerCase()} data`

  const viewed = week[week.length - 1]
  const sources = sourcesOf(viewed.meals, goal.id)
  const pattern = patternOf(goal, week, () => Array.from({ length: 30 }, (_, i) => dayScore(s, addDays(day, i - 29), now)))

  return (
    <Sheet title={goal.name} onClose={onClose}>
      <View style={styles.chart}>
        <View style={styles.readout} accessibilityLiveRegion="polite">
          <Text style={styles.readoutText}>
            <Text style={type.label}>{`${relativeDay(chosen.date, now)}: `}</Text>
            {/* The amount as the goal rows write it: the number semibold,
                its unit (and a partial day's "so far") after it. */}
            {bar.value !== undefined ? (
              <>
                <Text style={type.value}>{formatNumber(bar.value)}</Text>
                <Text style={type.unit}>{` ${goal.unit}${bar.partial ? " so far" : ""}`}</Text>
              </>
            ) : (
              <Text style={styles.empty}>{missing}</Text>
            )}
          </Text>
          <Text style={type.meta}>{goal.words}</Text>
        </View>
        <WeekBars
          days={bars}
          goal={goal.target}
          unit={goal.unit}
          name={goal.name}
          emptyWord="Nothing logged"
          selected={picked}
          onSelect={setPicked}
          readout={false}
        />
      </View>

      {sources.length > 0 && (
        <View style={styles.sources}>
          <Heading title="Where it came from" meta={relativeDay(viewed.date, now)} />
          <View>
            {sources.map((f, i) => (
              <KeyValue key={f.name} label={f.name} value={amountText(f.amount, goal.unit)} last={i === sources.length - 1} />
            ))}
          </View>
        </View>
      )}

      {!!pattern && <Text style={styles.pattern}>{pattern}</Text>}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  chart: { gap: space.item },
  readout: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.item },
  readoutText: { flexShrink: 1 },
  // "Nothing logged" or "No fiber data" in the amount's place: quiet
  // words, not a value.
  empty: { ...type.title, color: ink.tertiary },
  // Each food row keeps 12 over its words, so the heading sits 16 above
  // the first one.
  sources: { gap: space.stack },
  // Coaching, never an alert: a sentence in the quieter grey.
  pattern: { ...type.body, color: ink.secondary },
})
