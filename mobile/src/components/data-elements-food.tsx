import * as React from "react"
import { StyleSheet, Text, View } from "react-native"
import Svg, { Circle, Line, Path } from "react-native-svg"

import { formatNumber } from "@/components/charts"
import {
  Big,
  DIVERGE,
  Delta,
  GOAL_HUE,
  Meter,
  STATUS,
  StatusWord,
  TEAL_RAMP,
  label,
  rampOf,
  tint,
  weekday,
  type Data,
  type El,
} from "@/components/data-elements"
import { ArrowsClockwise, BowlFood, Camera, Check, CheckCircle, ForkKnife, Info, Leaf, Microphone, Moon, PencilSimple, Sun } from "@/components/ph"
import { Card, Tag, type Level } from "@/components/record-kit"
import type { ReviewDay, ReviewGoalId } from "@/lib/daily-review"
import { MEAL_SLOTS, dayScore, daysBetween, mealsOn, profileOf, totalsOf, type Meal, type MealSlot } from "@/lib/member"
import { color, hairline, ink, space, surface, type } from "@/lib/theme"

/* Twenty five ways to show food and meals on the optimization plan (12 Oct
   2026), in the same colour method as data-elements.tsx:
   - a goal's identity keeps its hue (protein blue, calcium indigo, and
     the energy orange for calories);
   - meal slots are an order in time (breakfast, lunch, snack, dinner), so
     they take the one teal ramp, light to dark, and are always labelled;
   - above or below a share of the goal uses the blue and red poles;
   - met, close and below always carry an icon and a word.
   The day's meals come from her own log when there is one; otherwise the
   plan's sample meals are used as the shape of the day and scaled to the
   day's totals, so every element agrees with the daily review. */

/* ------------------------------------------------------------- model -- */

type S = Data["s"]
type IconType = React.ComponentType<{ size?: number; color?: string; weight?: "fill" | "regular" | "bold" }>

const SLOT_ORDER = MEAL_SLOTS.map((m) => m.id)
const SLOT_NAME = Object.fromEntries(MEAL_SLOTS.map((m) => [m.id, m.name])) as Record<MealSlot, string>
const MAINS = MEAL_SLOTS.filter((m) => m.main).map((m) => m.id)
const SLOT_ICON: Record<MealSlot, IconType> = { breakfast: Sun, lunch: ForkKnife, snack: Leaf, dinner: Moon }
/** Time of day is an order, so the slots walk the teal ramp. */
// The teal ramp's steps 2 to 5, written out: read at load, before the gallery module finishes on iOS.
const SLOT_SHADE: Record<MealSlot, string> = { breakfast: "#7FC6C1", lunch: "#3FA39D", snack: "#01837E", dinner: "#015D59" }
const CALORIES_HUE = "#eb6834"
const EMPTY = "#EEF1F4"
const QUIET = "#D9D8D3"

type MealRow = {
  slot: MealSlot
  title: string
  time: string
  how: Meal["how"]
  status: Meal["status"]
  note?: string
  foods: Meal["foods"]
  kcal: number
  protein: number
  calcium: number
  /** The meal had no calcium value, so its share of the day's is estimated. */
  calciumEstimated: boolean
}

const valueOf = (rd: ReviewDay, id: ReviewGoalId) => rd.goals.find((g) => g.goal.id === id)?.value
const targetOf = (rd: ReviewDay, id: ReviewGoalId) => rd.goals.find((g) => g.goal.id === id)?.goal.target

/** The day's calories: the review's food when it has an energy balance,
    otherwise the plan's own day score. */
function kcalOn(s: S, rd: ReviewDay): number | undefined {
  if (rd.energy) return rd.energy.food
  if (rd.status === "none") return undefined
  const r = dayScore(s, rd.date).results.find((x) => x.goal.id === "calories")
  return r?.amount ? Math.round(r.amount.value) : undefined
}

/** Splits a total by weights, rounded to a step, the remainder on the
    largest share so the parts always add up. */
function apportion(weights: number[], total: number, step: number): number[] {
  const sum = weights.reduce((a, w) => a + w, 0) || 1
  const parts = weights.map((w) => Math.round((w / sum) * total / step) * step)
  const rest = Math.round(total) - parts.reduce((a, p) => a + p, 0)
  const big = weights.indexOf(Math.max(...weights))
  if (big >= 0) parts[big] += rest
  return parts
}

/** A finished day's meals, in time order. */
function dayMeals(s: S, rd: ReviewDay): MealRow[] {
  if (rd.status === "none") return []
  const own = mealsOn(s, rd.day)
  const profile = profileOf(s)
  const missing = own.length ? undefined : profile.sampleDays.find((x) => x.day === daysBetween(new Date(), rd.date))?.missing
  const list = (own.length ? own : profile.sampleMeals.yesterday).filter((m) => m.slot !== missing).sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))
  if (!list.length) return []
  const raw = list.map((m) => {
    const t = totalsOf([m])
    return { m, kcal: t.calories?.value ?? 0, protein: t.protein?.value ?? 0, calcium: t.calcium?.value }
  })
  const calKnown = raw.every((r) => r.calcium !== undefined)
  const kSum = raw.reduce((a, r) => a + r.kcal, 0)
  const pSum = raw.reduce((a, r) => a + r.protein, 0)
  const cSum = raw.reduce((a, r) => a + (r.calcium ?? 0), 0)
  const kcal = apportion(raw.map((r) => r.kcal), own.length ? kSum : (kcalOn(s, rd) ?? kSum), 5)
  const protein = apportion(raw.map((r) => r.protein), own.length ? pSum : (valueOf(rd, "protein") ?? pSum), 1)
  const calcium = apportion(raw.map((r) => (calKnown ? (r.calcium ?? 0) : r.kcal)), valueOf(rd, "calcium") ?? cSum, 10)
  return raw.map((r, i) => ({
    slot: r.m.slot,
    title: r.m.title ?? r.m.foods.map((f) => f.name).join(", "),
    time: r.m.time,
    how: r.m.how,
    status: r.m.status,
    note: r.m.note,
    foods: r.m.foods,
    kcal: kcal[i],
    protein: protein[i],
    calcium: calcium[i],
    calciumEstimated: !calKnown,
  }))
}

/** "7:50 AM" as hours after midnight. */
function hoursOf(time: string): number {
  const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(time)
  if (!m) return 12
  const h = (Number(m[1]) % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0)
  return h + Number(m[2]) / 60
}
const duration = (h: number) => {
  const mins = Math.round(h * 60)
  return `${Math.floor(mins / 60)} h${mins % 60 ? ` ${mins % 60} min` : ""}`
}

const levelFor = (v: number, target: number): Level => (v >= target ? "in" : v >= target * 0.9 ? "borderline" : "out")
const avg = (list: number[]) => (list.length ? list.reduce((a, x) => a + x, 0) / list.length : 0)
const scoredValues = (days: ReviewDay[], id: ReviewGoalId) => days.filter((x) => x.status === "complete").map((x) => valueOf(x, id)).filter((v): v is number => v !== undefined)

/** A food idea's line, "34 g protein, 11 g fiber, 420 kcal", as amounts. */
function ideaAmounts(line: string) {
  const out: { kcal?: number; protein?: number; calcium?: number; fiber?: number } = {}
  for (const part of line.split(",")) {
    const m = /([\d,]+)\s*(kcal|g|mg)\s*(\w+)?/.exec(part.trim())
    if (!m) continue
    const v = Number(m[1].replace(/,/g, ""))
    if (m[2] === "kcal") out.kcal = v
    else if (m[3] === "protein") out.protein = v
    else if (m[3] === "calcium") out.calcium = v
    else if (m[3] === "fiber") out.fiber = v
  }
  return out
}

/* --------------------------------------------------------- small bits -- */

function Swatch({ hue, round }: { hue: string; round?: boolean }) {
  return <View style={[styles.key, { backgroundColor: hue }, round && { borderRadius: 5 }]} />
}

function Legend({ items }: { items: { hue: string; text: string; round?: boolean }[] }) {
  return (
    <View style={styles.wrap}>
      {items.map((x) => (
        <View key={x.text} style={styles.row}>
          <Swatch hue={x.hue} round={x.round} />
          <Text style={type.meta}>{x.text}</Text>
        </View>
      ))}
    </View>
  )
}

function SlotTile({ slot, size = 32 }: { slot: MealSlot; size?: number }) {
  const Icon = SLOT_ICON[slot]
  return (
    <View style={[styles.icon, { width: size, height: size, borderRadius: size / 2, backgroundColor: color.primaryTint }]}>
      <Icon size={size * 0.5} color={color.primary} />
    </View>
  )
}

/** A ring slice from angle a0 to a1 (radians, clockwise from the top). */
function slice(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => `${(cx + r * Math.sin(a)).toFixed(2)},${(cy - r * Math.cos(a)).toFixed(2)}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M${p(r1, a0)} A${r1},${r1} 0 ${large} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0},${r0} 0 ${large} 0 ${p(r0, a0)} Z`
}

/* ------------------------------------------------------ the elements -- */

export const ELEMENTS_FOOD: El[] = [
  /* ===== meals: yesterday, meal by meal ===== */
  {
    group: "Meals",
    form: "Plate diagram",
    name: "Yesterday's calories, meal by meal, as one plate",
    Draw: ({ s, d }) => {
      const meals = dayMeals(s, d)
      if (!meals.length) return null
      const total = meals.reduce((a, m) => a + m.kcal, 0)
      const size = 148
      const c = size / 2
      let at = 0
      return (
        <Card style={[styles.pad, styles.row]}>
          <View style={{ width: size, height: size }}>
            <Svg width={size} height={size}>
              <Circle cx={c} cy={c} r={c - 1} fill={surface.inset} stroke={hairline.edge} strokeWidth={1} />
              {meals.map((m) => {
                const a0 = at
                const a1 = at + (m.kcal / total) * Math.PI * 2
                at = a1
                const gap = 0.025
                return <Path key={m.slot} d={slice(c, c, 30, c - 12, a0 + gap, a1 - gap)} fill={SLOT_SHADE[m.slot]} />
              })}
            </Svg>
            <View style={styles.fillCenter}>
              <Text style={type.value}>{formatNumber(total)}</Text>
              <Text style={type.caption}>kcal</Text>
            </View>
          </View>
          <View style={[styles.fill, styles.stackSm]}>
            <Text style={type.label}>{`Yesterday, ${label(d.date)}`}</Text>
            {meals.map((m) => (
              <View key={m.slot} style={styles.between}>
                <View style={styles.row}>
                  <Swatch hue={SLOT_SHADE[m.slot]} />
                  <Text style={type.title}>{SLOT_NAME[m.slot]}</Text>
                </View>
                <Text style={type.value}>
                  {formatNumber(m.kcal)}
                  <Text style={type.unit}>{` ${Math.round((m.kcal / total) * 100)}%`}</Text>
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )
    },
  },
  {
    group: "Meals",
    form: "Meal cards",
    name: "Each meal with its calories, protein and calcium",
    Draw: ({ s, d }) => {
      const meals = dayMeals(s, d)
      if (!meals.length) return null
      return (
        <View style={styles.stack}>
          <View style={styles.grid}>
            {meals.map((m) => (
              <Card key={m.slot} style={[styles.half, styles.padSm]}>
                <View style={styles.between}>
                  <SlotTile slot={m.slot} size={28} />
                  <Text style={type.meta}>{m.time}</Text>
                </View>
                <Text style={type.label}>{SLOT_NAME[m.slot]}</Text>
                <Text style={type.title} numberOfLines={2}>
                  {m.title}
                </Text>
                <View style={styles.stackXs}>
                  {[
                    { hue: CALORIES_HUE, v: `${formatNumber(m.kcal)} kcal` },
                    { hue: GOAL_HUE.protein, v: `${m.protein} g protein` },
                    { hue: GOAL_HUE.calcium, v: `${formatNumber(m.calcium)} mg calcium` },
                  ].map((x) => (
                    <View key={x.v} style={styles.row}>
                      <View style={[styles.dot, { backgroundColor: x.hue }]} />
                      <Text style={type.metaStrong}>{x.v}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </View>
          {meals[0].calciumEstimated && <Text style={type.meta}>{"Calcium per meal is an estimate, split from the day's total by meal size."}</Text>}
        </View>
      )
    },
  },
  {
    group: "Meals",
    form: "Stacked part to whole bars",
    name: "Where each nutrient came from, by meal",
    Draw: ({ s, d }) => {
      const meals = dayMeals(s, d)
      if (!meals.length) return null
      const rows: { k: string; unit: string; get: (m: MealRow) => number }[] = [
        { k: "Calories", unit: "kcal", get: (m) => m.kcal },
        { k: "Protein", unit: "g", get: (m) => m.protein },
        { k: "Calcium", unit: "mg", get: (m) => m.calcium },
      ]
      return (
        <Card style={styles.pad}>
          {rows.map((r) => {
            const total = meals.reduce((a, m) => a + r.get(m), 0)
            return (
              <View key={r.k} style={styles.stackSm}>
                <View style={styles.between}>
                  <Text style={type.title}>{r.k}</Text>
                  <Text style={type.value}>
                    {formatNumber(total)}
                    <Text style={type.unit}>{` ${r.unit}`}</Text>
                  </Text>
                </View>
                <View style={styles.stackBar}>
                  {meals.map((m) => (
                    <View key={m.slot} style={[styles.stackSeg, { flex: Math.max(r.get(m), 0.001), backgroundColor: SLOT_SHADE[m.slot] }]} />
                  ))}
                </View>
              </View>
            )
          })}
          <Legend items={meals.map((m) => ({ hue: SLOT_SHADE[m.slot], text: SLOT_NAME[m.slot] }))} />
          {meals[0].calciumEstimated && <Text style={type.meta}>Calcium by meal is an estimate.</Text>}
        </Card>
      )
    },
  },
  {
    group: "Meals",
    form: "Ranking list",
    name: "Yesterday's meals ranked by protein",
    Draw: ({ s, d }) => {
      const meals = [...dayMeals(s, d)].sort((a, b) => b.protein - a.protein)
      if (!meals.length) return null
      const top = meals[0].protein || 1
      return (
        <Card style={styles.pad}>
          {meals.map((m, i) => (
            <View key={m.slot} style={styles.rankRow}>
              <View style={styles.rankNum}>
                <Text style={type.captionStrong}>{i + 1}</Text>
              </View>
              <View style={[styles.fill, styles.stackXs]}>
                <View style={styles.between}>
                  <Text style={[type.title, styles.fill]} numberOfLines={1}>
                    {`${SLOT_NAME[m.slot]}: ${m.title}`}
                  </Text>
                  <Text style={type.value}>
                    {m.protein}
                    <Text style={type.unit}> g</Text>
                  </Text>
                </View>
                <Meter share={m.protein / top} hue={GOAL_HUE.protein} h={6} />
              </View>
            </View>
          ))}
        </Card>
      )
    },
  },
  {
    group: "Meals",
    form: "Above or below an even share",
    name: "Protein at each main meal against an even split of the goal",
    Draw: ({ s, d }) => {
      const target = targetOf(d, "protein")
      const meals = dayMeals(s, d)
      if (!target || !meals.length) return null
      const share = Math.round(target / MAINS.length)
      const mains = meals.filter((m) => MAINS.includes(m.slot))
      const snack = meals.find((m) => m.slot === "snack")
      const span = Math.max(...mains.map((m) => Math.abs(m.protein - share)), 8)
      return (
        <Card style={styles.pad}>
          <Text style={type.body}>{`An even split of your ${target} g goal is about ${share} g at each main meal.`}</Text>
          {mains.map((m) => {
            const diff = m.protein - share
            const w = `${(Math.abs(diff) / span) * 50}%` as const
            return (
              <View key={m.slot} style={styles.divRow}>
                <Text style={[type.title, styles.divName]}>{SLOT_NAME[m.slot]}</Text>
                <View style={styles.divTrack}>
                  <View style={styles.divMid} />
                  {diff !== 0 && (
                    <View style={[styles.divBar, { width: w, backgroundColor: diff > 0 ? DIVERGE.above : DIVERGE.below }, diff > 0 ? { left: "50%" } : { right: "50%" }]} />
                  )}
                </View>
                <Text style={[type.value, styles.divValue]}>{`${diff > 0 ? "+" : diff < 0 ? "−" : ""}${Math.abs(diff)} g`}</Text>
              </View>
            )
          })}
          <Legend
            items={[
              { hue: DIVERGE.above, text: "Above an even share" },
              { hue: DIVERGE.below, text: "Below an even share" },
            ]}
          />
          {snack && <Text style={type.meta}>{`Snack: ${snack.protein} g, on top of the split.`}</Text>}
        </Card>
      )
    },
  },
  {
    group: "Meals",
    form: "Day strip with sized dots",
    name: "When you ate yesterday, each dot sized by its calories",
    Draw: ({ s, d }) => {
      const meals = dayMeals(s, d)
      if (meals.length < 2) return null
      const from = 6
      const to = 22
      const x = (h: number) => `${((h - from) / (to - from)) * 100}%` as const
      const max = Math.max(...meals.map((m) => m.kcal))
      const hours = meals.map((m) => hoursOf(m.time))
      const gaps = hours.slice(1).map((h, i) => ({ a: meals[i].slot, b: meals[i + 1].slot, h: h - hours[i] }))
      const longest = gaps.reduce((a, g) => (g.h > a.h ? g : a), gaps[0])
      return (
        <Card style={styles.pad}>
          <View style={styles.strip}>
            <View style={styles.stripLine} />
            {meals.map((m, i) => {
              const r = 7 + Math.sqrt(m.kcal / max) * 9
              return <View key={m.slot} style={[styles.stripDot, { left: x(hours[i]), width: r * 2, height: r * 2, borderRadius: r, marginLeft: -r, marginTop: -r, backgroundColor: SLOT_SHADE[m.slot] }]} />
            })}
          </View>
          <View style={styles.stripTicks}>
            {[
              { h: 6, t: "6 AM" },
              { h: 12, t: "Noon" },
              { h: 18, t: "6 PM" },
              { h: 22, t: "10 PM" },
            ].map((t) => (
              <Text key={t.t} style={[type.axis, styles.stripTick, { left: x(t.h), transform: [{ translateX: t.h === from ? 0 : t.h === to ? -36 : -14 }] }]}>
                {t.t}
              </Text>
            ))}
          </View>
          <Legend items={meals.map((m) => ({ hue: SLOT_SHADE[m.slot], text: `${SLOT_NAME[m.slot]} ${m.time}`, round: true }))} />
          <View style={styles.rule} />
          <View style={styles.between}>
            <Text style={type.label}>First to last meal</Text>
            <Text style={type.value}>{duration(hours[hours.length - 1] - hours[0])}</Text>
          </View>
          <View style={styles.between}>
            <Text style={type.label}>{`Longest gap, ${SLOT_NAME[longest.a].toLowerCase()} to ${SLOT_NAME[longest.b].toLowerCase()}`}</Text>
            <Text style={type.value}>{duration(longest.h)}</Text>
          </View>
        </Card>
      )
    },
  },
  {
    group: "Meals",
    form: "Comparison card",
    name: "Your largest meal and your lightest",
    Draw: ({ s, d }) => {
      const meals = dayMeals(s, d)
      if (meals.length < 2) return null
      const total = meals.reduce((a, m) => a + m.kcal, 0)
      const sorted = [...meals].sort((a, b) => b.kcal - a.kcal)
      const side = (k: string, m: MealRow) => (
        <View style={styles.compareCol}>
          <Text style={type.label}>{k}</Text>
          <View style={styles.row}>
            <SlotTile slot={m.slot} size={28} />
            <Text style={type.title}>{SLOT_NAME[m.slot]}</Text>
          </View>
          <Big value={formatNumber(m.kcal)} unit="kcal" size={24} />
          <Text style={type.meta} numberOfLines={2}>
            {`${Math.round((m.kcal / total) * 100)}% of the day. ${m.title}`}
          </Text>
        </View>
      )
      return (
        <Card style={[styles.pad, styles.compare]}>
          {side("Largest meal", sorted[0])}
          <View style={styles.vline} />
          {side("Lightest meal", sorted[sorted.length - 1])}
        </Card>
      )
    },
  },
  {
    group: "Meals",
    form: "Itemized meal",
    name: "One meal, food by food, with how sure the reading was",
    Draw: ({ s, d }) => {
      const meals = dayMeals(s, d)
      const m = meals.find((x) => x.status === "estimated") ?? [...meals].sort((a, b) => b.kcal - a.kcal)[0]
      if (!m) return null
      const sure = { high: { n: 3, w: "Sure" }, medium: { n: 2, w: "Fairly sure" }, low: { n: 1, w: "Not sure" } } as const
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <View style={styles.row}>
              <SlotTile slot={m.slot} />
              <View>
                <Text style={type.section}>{SLOT_NAME[m.slot]}</Text>
                <Text style={type.meta}>{`${m.time}, ${m.how === "voice" ? "said aloud" : m.how === "photo" ? "from a photo" : m.how === "typed" ? "typed" : "logged again"}`}</Text>
              </View>
            </View>
            {m.status === "estimated" ? <Tag tone="muted">Estimate</Tag> : <Tag tone="ok">Checked</Tag>}
          </View>
          {m.foods.map((f) => (
            <View key={f.name} style={[styles.tr, styles.trRule]}>
              <View style={styles.fill}>
                <Text style={type.title}>{f.name}</Text>
                <Text style={type.meta}>{f.portion}</Text>
              </View>
              <View style={styles.sureCol}>
                <View style={styles.sureBars}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={[styles.sureBar, { height: 6 + i * 4, backgroundColor: i < sure[f.confidence].n ? TEAL_RAMP[4] : EMPTY }]} />
                  ))}
                </View>
                <Text style={type.caption}>{sure[f.confidence].w}</Text>
              </View>
            </View>
          ))}
          {!!m.note && (
            <View style={styles.note}>
              <Info size={14} color={ink.secondary} />
              <Text style={[type.label, styles.fill]}>{`${m.note}. Sauces can add calories, so this meal stays an estimate until you check it.`}</Text>
            </View>
          )}
          <View style={[styles.between, styles.totalRule]}>
            <Text style={type.title}>Meal total</Text>
            <Text style={type.value}>{`${formatNumber(m.kcal)} kcal, ${m.protein} g protein`}</Text>
          </View>
        </Card>
      )
    },
  },

  /* ===== nutrients across days and weeks ===== */
  {
    group: "Nutrients",
    form: "Status calendar",
    name: "Protein over 30 days, met, close or below on each day",
    Draw: ({ month }) => {
      const lead = month[0].date.getDay()
      const cells: (ReviewDay | undefined)[] = [...Array.from({ length: lead }, () => undefined), ...month]
      const levelOn = (x: ReviewDay): Level | undefined => {
        const g = x.goals.find((y) => y.goal.id === "protein")
        if (!g || x.status !== "complete" || g.value === undefined) return undefined
        return levelFor(g.value, g.goal.target)
      }
      const met = month.filter((x) => levelOn(x) === "in").length
      const scored = month.filter((x) => levelOn(x) !== undefined).length
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.title}>Protein, last 30 days</Text>
            <Text style={type.metaStrong}>{`Met on ${met} of ${scored} scored days`}</Text>
          </View>
          <View style={styles.cal}>
            {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
              <Text key={i} style={[type.caption, styles.calHead]}>
                {w}
              </Text>
            ))}
            {cells.map((x, i) => {
              if (!x) return <View key={`b${i}`} style={styles.calCell} />
              const l = levelOn(x)
              const st = l ? STATUS[l] : undefined
              return (
                <View key={x.day} style={styles.calCell}>
                  <View style={[styles.calInner, { backgroundColor: st ? st.tint : "#F7F7F7" }]}>
                    <Text style={type.caption}>{x.date.getDate()}</Text>
                    {st ? <st.Icon size={12} color={st.mark} weight="fill" /> : <View style={styles.calNone} />}
                  </View>
                </View>
              )
            })}
          </View>
          <View style={styles.wrap}>
            <StatusWord level="in" />
            <StatusWord level="borderline" />
            <StatusWord level="out" />
            <View style={styles.row}>
              <View style={styles.calNone} />
              <Text style={type.meta}>Not scored</Text>
            </View>
          </View>
        </Card>
      )
    },
  },
  {
    group: "Nutrients",
    form: "Best day and hardest day",
    name: "Calcium this week: the best day and the hardest",
    Draw: ({ week }) => {
      const days = week.filter((x) => x.status === "complete" && valueOf(x, "calcium") !== undefined)
      if (days.length < 2) return null
      const sorted = [...days].sort((a, b) => (valueOf(b, "calcium") ?? 0) - (valueOf(a, "calcium") ?? 0))
      const card = (k: string, x: ReviewDay) => {
        const g = x.goals.find((y) => y.goal.id === "calcium")!
        return (
          <Card style={[styles.half, styles.padSm]}>
            <Text style={type.label}>{k}</Text>
            <Text style={type.title}>{`${weekday(x.date)}, ${label(x.date)}`}</Text>
            <Big value={formatNumber(g.value ?? 0)} unit="mg" size={24} />
            <StatusWord level={levelFor(g.value ?? 0, g.goal.target)} word={g.gapWords} />
          </Card>
        )
      }
      return (
        <View style={styles.grid}>
          {card("Best day", sorted[0])}
          {card("Hardest day", sorted[sorted.length - 1])}
        </View>
      )
    },
  },
  {
    group: "Nutrients",
    form: "Before and after table",
    name: "This week against last week, nutrient by nutrient",
    Draw: ({ s, month }) => {
      const now = month.slice(-7)
      const before = month.slice(-14, -7)
      const kcal = (days: ReviewDay[]) => Math.round(avg(days.filter((x) => x.status === "complete").map((x) => kcalOn(s, x)).filter((v): v is number => v !== undefined)))
      const rows = [
        { k: "Calories", unit: "kcal", a: kcal(before), b: kcal(now), up: false },
        { k: "Protein", unit: "g", a: Math.round(avg(scoredValues(before, "protein"))), b: Math.round(avg(scoredValues(now, "protein"))), up: true },
        { k: "Calcium", unit: "mg", a: Math.round(avg(scoredValues(before, "calcium")) / 10) * 10, b: Math.round(avg(scoredValues(now, "calcium")) / 10) * 10, up: true },
      ]
      return (
        <Card style={styles.pad}>
          <View style={styles.tr}>
            <Text style={[type.metaStrong, styles.fill]}>Daily average</Text>
            <Text style={[type.metaStrong, styles.td]}>Last week</Text>
            <Text style={[type.metaStrong, styles.td]}>This week</Text>
            <Text style={[type.metaStrong, styles.tdWide]}>Change</Text>
          </View>
          {rows.map((r) => (
            <View key={r.k} style={[styles.tr, styles.trRule]}>
              <Text style={[type.label, styles.fill]}>{`${r.k}, ${r.unit}`}</Text>
              <Text style={[type.label, styles.td]}>{formatNumber(r.a)}</Text>
              <Text style={[type.value, styles.td]}>{formatNumber(r.b)}</Text>
              <View style={styles.tdWide}>
                <Delta value={r.b - r.a} goodWhenUp={r.up} />
              </View>
            </View>
          ))}
          <Text style={type.meta}>Fully logged days only.</Text>
        </Card>
      )
    },
  },
  {
    group: "Nutrients",
    form: "Gauge",
    name: "Your average protein this week, on a dial to the goal",
    Draw: ({ week }) => {
      const target = targetOf(week[week.length - 1], "protein")
      const vals = scoredValues(week, "protein")
      if (!target || !vals.length) return null
      const mean = Math.round(avg(vals))
      const max = target * 1.4
      const W = 220
      const r = 88
      const cx = W / 2
      const cy = 100
      const pt = (share: number, rr = r) => {
        const a = Math.PI * (1 - Math.min(Math.max(share, 0), 1))
        return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)] as const
      }
      const arcTo = (share: number) => {
        const [x, y] = pt(share)
        return `M${cx - r},${cy} A${r},${r} 0 0 1 ${x.toFixed(2)},${y.toFixed(2)}`
      }
      const [g0x, g0y] = pt(target / max, r - 12)
      const [g1x, g1y] = pt(target / max, r + 12)
      return (
        <Card style={[styles.pad, styles.centerX]}>
          <View style={{ width: W, height: cy + 8 }}>
            <Svg width={W} height={cy + 8}>
              <Path d={arcTo(1)} stroke={tint(GOAL_HUE.protein, "24")} strokeWidth={14} fill="none" strokeLinecap="round" />
              <Path d={arcTo(mean / max)} stroke={GOAL_HUE.protein} strokeWidth={14} fill="none" strokeLinecap="round" />
              <Line x1={g0x} y1={g0y} x2={g1x} y2={g1y} stroke={ink.strong} strokeWidth={2} strokeLinecap="round" />
            </Svg>
            <View style={styles.gaugeCenter}>
              <Big value={mean} unit="g" size={32} />
              <Text style={type.label}>Average a day</Text>
            </View>
          </View>
          <Text style={type.meta}>{`Dark tick: your goal of ${target} g. Dial runs to ${Math.round(max)} g.`}</Text>
          <StatusWord level={levelFor(mean, target)} word={mean >= target ? "Goal met on average" : `${target - mean} g under on average`} />
        </Card>
      )
    },
  },
  {
    group: "Nutrients",
    form: "Ratio tiles",
    name: "Protein for every 100 kcal you ate, day by day",
    Draw: ({ s, week }) => {
      const days = week.map((x) => {
        const k = x.status === "complete" ? kcalOn(s, x) : undefined
        const p = valueOf(x, "protein")
        return { x, r: k && p !== undefined ? (p / k) * 100 : undefined }
      })
      const known = days.map((d) => d.r).filter((v): v is number => v !== undefined)
      if (!known.length) return null
      const lo = Math.min(...known)
      const hi = Math.max(...known)
      const best = days.find((d) => d.r === hi)!
      return (
        <Card style={styles.pad}>
          <View style={styles.tiles}>
            {days.map(({ x, r }) => {
              const shade = r === undefined ? EMPTY : rampOf(0.2 + ((r - lo) / (hi - lo || 1)) * 0.8)
              const dark = r !== undefined && TEAL_RAMP.indexOf(shade) >= 3
              return (
                <View key={x.day} style={styles.tileCol}>
                  <View style={[styles.ratioTile, { backgroundColor: shade }]}>
                    <Text style={[type.value, { color: dark ? ink.onColor : ink.strong }]}>{r === undefined ? "" : formatNumber(r, 1)}</Text>
                  </View>
                  <Text style={type.caption}>{weekday(x.date)}</Text>
                </View>
              )
            })}
          </View>
          <Text style={type.meta}>Grams of protein per 100 kcal. Darker is more protein for the calories. Empty: not fully logged.</Text>
          <Text style={type.body}>{`${weekday(best.x.date)} gave the most protein for its calories: ${formatNumber(hi, 1)} g per 100 kcal.`}</Text>
        </Card>
      )
    },
  },
  {
    group: "Nutrients",
    form: "Running total against a pace line",
    name: "Protein added up across the week, against your goal's pace",
    Draw: ({ week }) => {
      const target = targetOf(week[week.length - 1], "protein")
      if (!target) return null
      let run = 0
      const cum = week.map((x) => (run += valueOf(x, "protein") ?? 0))
      const W = 300
      const H = 120
      const top = Math.max(cum[cum.length - 1], target * 7) * 1.05
      const xs = (i: number) => 12 + (i * (W - 24)) / 6
      const ys = (v: number) => H - 8 - (v / top) * (H - 16)
      const line = cum.map((v, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ")
      const pace = `M${xs(0)},${ys(target)} L${xs(6)},${ys(target * 7)}`
      const gap = target * 7 - cum[cum.length - 1]
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.title}>Protein this week</Text>
            <Text style={type.value}>
              {formatNumber(cum[cum.length - 1])}
              <Text style={type.unit}>{` of ${formatNumber(target * 7)} g`}</Text>
            </Text>
          </View>
          <View style={styles.centerX}>
            <Svg width={W} height={H}>
              <Path d={pace} stroke={ink.tertiary} strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
              <Path d={line} stroke={GOAL_HUE.protein} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {cum.map((v, i) => (
                <Circle key={i} cx={xs(i)} cy={ys(v)} r={i === cum.length - 1 ? 5 : 3} fill={GOAL_HUE.protein} stroke={color.background} strokeWidth={i === cum.length - 1 ? 2 : 0} />
              ))}
            </Svg>
            <View style={[styles.axisRow, { width: W }]}>
              {week.map((x) => (
                <Text key={x.day} style={[type.caption, styles.axisLabel]}>
                  {weekday(x.date).slice(0, 1)}
                </Text>
              ))}
            </View>
          </View>
          <Legend
            items={[
              { hue: GOAL_HUE.protein, text: "Your protein, added up" },
              { hue: ink.tertiary, text: `Goal pace, ${target} g a day` },
            ]}
          />
          <Text style={type.body}>{gap > 0 ? `${formatNumber(gap)} g behind the week's pace. A partly logged day counts only what was logged.` : "At or ahead of the week's pace."}</Text>
        </Card>
      )
    },
  },
  {
    group: "Nutrients",
    form: "Slope chart",
    name: "Protein and calcium, first week of the month against the last",
    Draw: ({ month }) => {
      const first = month.slice(0, 7)
      const last = month.slice(-7)
      const series = (["protein", "calcium"] as const)
        .map((id) => {
          const t = targetOf(month[month.length - 1], id)
          if (!t) return undefined
          return { id, a: Math.round((avg(scoredValues(first, id)) / t) * 100), b: Math.round((avg(scoredValues(last, id)) / t) * 100) }
        })
        .filter((x): x is { id: "protein" | "calcium"; a: number; b: number } => !!x)
      if (!series.length) return null
      const H = 140
      const all = series.flatMap((x) => [x.a, x.b, 100])
      const lo = Math.min(...all) - 4
      const hi = Math.max(...all) + 4
      const y = (v: number) => 10 + ((hi - v) / (hi - lo)) * (H - 20)
      const W = 150
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.label}>{`Week of ${label(first[0].date)}`}</Text>
            <Text style={type.label}>{`Week of ${label(last[0].date)}`}</Text>
          </View>
          <View style={[styles.slope, { height: H }]}>
            <View style={styles.slopeSide}>
              {series.map((x) => (
                <Text key={x.id} style={[type.value, styles.slopeLeft, { top: y(x.a) - 10 }]}>{`${x.a}%`}</Text>
              ))}
            </View>
            <Svg width={W} height={H}>
              <Line x1={0} x2={W} y1={y(100)} y2={y(100)} stroke={ink.tertiary} strokeWidth={1} strokeDasharray="3 4" />
              {series.map((x) => (
                <React.Fragment key={x.id}>
                  <Line x1={8} x2={W - 8} y1={y(x.a)} y2={y(x.b)} stroke={GOAL_HUE[x.id]} strokeWidth={2.5} strokeLinecap="round" />
                  <Circle cx={8} cy={y(x.a)} r={4} fill={color.background} stroke={GOAL_HUE[x.id]} strokeWidth={2} />
                  <Circle cx={W - 8} cy={y(x.b)} r={5} fill={GOAL_HUE[x.id]} />
                </React.Fragment>
              ))}
            </Svg>
            <View style={styles.slopeSide}>
              {series.map((x) => (
                <Text key={x.id} style={[type.value, styles.slopeRight, { top: y(x.b) - 10 }]}>{`${x.b}%`}</Text>
              ))}
            </View>
          </View>
          <Legend items={[...series.map((x) => ({ hue: GOAL_HUE[x.id], text: x.id === "protein" ? "Protein" : "Calcium", round: true })), { hue: ink.tertiary, text: "Dashed: 100% of goal" }]} />
          <Text style={type.meta}>Daily average as a share of the goal, fully logged days only.</Text>
        </Card>
      )
    },
  },
  {
    group: "Nutrients",
    form: "Range plot",
    name: "Each nutrient's lowest, highest and average day this week",
    Draw: ({ s, week }) => {
      const kcals = week.filter((x) => x.status === "complete").map((x) => kcalOn(s, x)).filter((v): v is number => v !== undefined)
      const rows = [
        { k: "Protein", unit: "g", hue: GOAL_HUE.protein, vals: scoredValues(week, "protein"), goal: targetOf(week[6], "protein"), goalWord: "goal" },
        { k: "Calcium", unit: "mg", hue: GOAL_HUE.calcium, vals: scoredValues(week, "calcium"), goal: targetOf(week[6], "calcium"), goalWord: "goal" },
        { k: "Calories", unit: "kcal", hue: CALORIES_HUE, vals: kcals, goal: profileOf(s).goals.find((g) => g.id === "calories")?.target, goalWord: "limit" },
      ].filter((r) => r.vals.length && r.goal)
      return (
        <Card style={styles.pad}>
          {rows.map((r) => {
            const lo = Math.min(...r.vals)
            const hi = Math.max(...r.vals)
            const mean = avg(r.vals)
            const scaleMax = Math.max(hi, r.goal!) * 1.15
            const pct = (v: number) => `${(v / scaleMax) * 100}%` as const
            return (
              <View key={r.k} style={styles.stackSm}>
                <View style={styles.between}>
                  <Text style={type.title}>{r.k}</Text>
                  <Text style={type.label}>
                    {`Average `}
                    <Text style={type.value}>{formatNumber(Math.round(mean))}</Text>
                    {` ${r.unit}`}
                  </Text>
                </View>
                <View style={styles.range}>
                  <View style={[styles.rangeSpan, { left: pct(lo), width: `${((hi - lo) / scaleMax) * 100}%`, backgroundColor: tint(r.hue, "33") }]} />
                  <View style={[styles.rangeGoal, { left: pct(r.goal!) }]} />
                  <View style={[styles.rangeDot, { left: pct(mean), backgroundColor: r.hue }]} />
                </View>
                <Text style={type.meta}>{`Lowest ${formatNumber(lo)}, highest ${formatNumber(hi)}, ${r.goalWord} ${formatNumber(r.goal!)} ${r.unit}`}</Text>
              </View>
            )
          })}
          <View style={styles.wrap}>
            <View style={styles.row}>
              <View style={styles.rangeKeySpan} />
              <Text style={type.meta}>Lowest to highest day</Text>
            </View>
            <View style={styles.row}>
              <View style={[styles.key, { borderRadius: 5, backgroundColor: ink.secondary }]} />
              <Text style={type.meta}>Average</Text>
            </View>
            <View style={styles.row}>
              <View style={styles.rangeKeyGoal} />
              <Text style={type.meta}>Goal or limit</Text>
            </View>
          </View>
        </Card>
      )
    },
  },

  /* ===== logging habits ===== */
  {
    group: "Logging",
    form: "Log matrix",
    name: "Which meals you logged, day by day",
    Draw: ({ s, week }) => {
      const logged = week.map((x) => new Set(dayMeals(s, x).map((m) => m.slot)))
      return (
        <Card style={styles.pad}>
          <View style={styles.tr}>
            <View style={styles.rowHead} />
            {week.map((x) => (
              <Text key={x.day} style={[type.caption, styles.cellHead]}>
                {weekday(x.date).slice(0, 2)}
              </Text>
            ))}
          </View>
          {SLOT_ORDER.map((slot) => (
            <View key={slot} style={styles.matrixRow}>
              <Text style={[type.label, styles.rowHead]}>{SLOT_NAME[slot]}</Text>
              {logged.map((set, i) => (
                <View key={i} style={[styles.matrixCell, set.has(slot) ? { backgroundColor: color.primary } : styles.matrixEmpty]}>
                  {set.has(slot) && <Check size={12} color={ink.onColor} weight="bold" />}
                </View>
              ))}
            </View>
          ))}
          <View style={styles.wrap}>
            <View style={styles.row}>
              <View style={[styles.key, { backgroundColor: color.primary }]} />
              <Text style={type.meta}>Logged</Text>
            </View>
            <View style={styles.row}>
              <View style={[styles.key, styles.matrixEmpty]} />
              <Text style={type.meta}>Not logged</Text>
            </View>
          </View>
          <Text style={type.meta}>A day is scored once breakfast, lunch and dinner are in. The snack is optional.</Text>
        </Card>
      )
    },
  },
  {
    group: "Logging",
    form: "Icon grid",
    name: "Thirty days of logging, one bowl a day",
    Draw: ({ month }) => {
      const c = { complete: 0, partial: 0, none: 0 }
      for (const x of month) c[x.status]++
      const hue = { complete: color.primary, partial: TEAL_RAMP[2], none: QUIET }
      return (
        <Card style={styles.pad}>
          <View style={styles.bowls}>
            {month.map((x) => (
              <View key={x.day} style={styles.bowl}>
                <BowlFood size={22} color={hue[x.status]} weight={x.status === "complete" ? "fill" : "regular"} />
              </View>
            ))}
          </View>
          <View style={styles.kpis}>
            {[
              { k: "Every meal", v: c.complete, h: hue.complete },
              { k: "Some meals", v: c.partial, h: hue.partial },
              { k: "Nothing", v: c.none, h: hue.none },
            ].map((x) => (
              <View key={x.k} style={styles.kpiFlat}>
                <View style={styles.row}>
                  <Swatch hue={x.h} round />
                  <Text style={type.label}>{x.k}</Text>
                </View>
                <Text style={type.stat}>{`${x.v} ${x.v === 1 ? "day" : "days"}`}</Text>
              </View>
            ))}
          </View>
        </Card>
      )
    },
  },
  {
    group: "Logging",
    form: "Count bars with a takeaway",
    name: "The main meal most often left unlogged",
    Draw: ({ s, month }) => {
      const missed: Record<string, number> = Object.fromEntries(MAINS.map((m) => [m, 0]))
      for (const x of month) {
        const have = new Set(dayMeals(s, x).map((m) => m.slot))
        for (const m of MAINS) if (!have.has(m)) missed[m]++
      }
      const rows = MAINS.map((m) => ({ slot: m, n: missed[m] })).sort((a, b) => b.n - a.n)
      const top = Math.max(rows[0].n, 1)
      const most = rows[0]
      return (
        <Card style={styles.pad}>
          <Text style={type.section}>{most.n ? `${SLOT_NAME[most.slot]} is the meal most often missed` : "No main meal missed this month"}</Text>
          {rows.map((r) => (
            <View key={r.slot} style={styles.row}>
              <Text style={[type.label, styles.rowHead]}>{SLOT_NAME[r.slot]}</Text>
              <View style={styles.fill}>
                <View style={[styles.countBar, { width: `${Math.max((r.n / top) * 100, 2)}%`, backgroundColor: r.n ? rampOf(0.3 + (r.n / top) * 0.7) : QUIET }]} />
              </View>
              <Text style={[type.value, styles.countValue]}>{`${r.n} of ${month.length}`}</Text>
            </View>
          ))}
          {most.slot === "dinner" && most.n > 0 && <Text style={type.body}>Logging dinner before your evening walk keeps the day scored.</Text>}
          {most.slot !== "dinner" && most.n > 0 && <Text style={type.body}>{`Logging ${SLOT_NAME[most.slot].toLowerCase()} while it is in front of you keeps the day scored.`}</Text>}
        </Card>
      )
    },
  },
  {
    group: "Logging",
    form: "Icon tally",
    name: "How yesterday's meals were logged",
    Draw: ({ s, d }) => {
      const meals = dayMeals(s, d)
      if (!meals.length) return null
      const kinds: { k: Meal["how"]; w: string; Icon: IconType }[] = [
        { k: "photo", w: "Photo", Icon: Camera },
        { k: "voice", w: "Said aloud", Icon: Microphone },
        { k: "typed", w: "Typed", Icon: PencilSimple },
        { k: "again", w: "Logged again", Icon: ArrowsClockwise },
      ]
      const estimated = meals.filter((m) => m.status === "estimated")
      return (
        <Card style={styles.pad}>
          <View style={styles.tally}>
            {kinds.map((x) => {
              const n = meals.filter((m) => m.how === x.k).length
              return (
                <View key={x.k} style={[styles.tallyCell, !n && styles.dim]}>
                  <View style={[styles.icon, styles.tallyIcon, { backgroundColor: n ? color.primaryTint : "#F7F7F7" }]}>
                    <x.Icon size={20} color={n ? color.primary : ink.tertiary} />
                  </View>
                  <Text style={type.stat}>{n}</Text>
                  <Text style={[type.caption, styles.centerText]}>{x.w}</Text>
                </View>
              )
            })}
          </View>
          <Text style={type.meta}>
            {estimated.length
              ? `${estimated.map((m) => SLOT_NAME[m.slot]).join(" and ")} kept as an estimate. Everything else was checked.`
              : "Every meal was checked."}
          </Text>
        </Card>
      )
    },
  },
  {
    group: "Logging",
    form: "Paired meters",
    name: "Weekdays against weekends, how often every meal was logged",
    Draw: ({ month }) => {
      const weekend = month.filter((x) => x.date.getDay() === 0 || x.date.getDay() === 6)
      const weekdays = month.filter((x) => !(x.date.getDay() === 0 || x.date.getDay() === 6))
      const rows = [
        { k: "Weekdays", days: weekdays },
        { k: "Weekends", days: weekend },
      ].map((r) => ({ ...r, full: r.days.filter((x) => x.status === "complete").length }))
      const share = (r: (typeof rows)[number]) => (r.days.length ? r.full / r.days.length : 0)
      const diff = Math.round((share(rows[0]) - share(rows[1])) * 100)
      return (
        <Card style={styles.pad}>
          {rows.map((r) => (
            <View key={r.k} style={styles.stackSm}>
              <View style={styles.between}>
                <Text style={type.title}>{r.k}</Text>
                <Text style={type.value}>
                  {`${Math.round(share(r) * 100)}%`}
                  <Text style={type.unit}>{` ${r.full} of ${r.days.length} days`}</Text>
                </Text>
              </View>
              <Meter share={share(r)} hue={color.primary} h={10} />
            </View>
          ))}
          <Text style={type.body}>
            {Math.abs(diff) < 5
              ? "Weekdays and weekends are logged about the same."
              : diff > 0
                ? `Weekends are logged less often, by ${diff} points. A photo is enough to log a meal.`
                : `Weekdays are logged less often, by ${-diff} points. A photo at lunch is enough.`}
          </Text>
        </Card>
      )
    },
  },

  /* ===== the diet plan and food ideas ===== */
  {
    group: "Diet plan",
    form: "Nutrition label",
    name: "Your daily targets, laid out like a food label",
    Draw: ({ s, d }) => {
      const profile = profileOf(s)
      const atLeast = profile.goals.filter((g) => g.kind === "atLeast").map((g) => ({ k: g.name, v: `${formatNumber(g.target)} ${g.unit}` }))
      const calcium = d.goals.find((g) => g.goal.id === "calcium")
      if (calcium && !profile.goals.some((g) => g.id === "calcium")) atLeast.push({ k: "Calcium", v: `${formatNumber(calcium.goal.target)} mg` })
      const atMost = profile.goals.filter((g) => g.kind === "atMost").map((g) => ({ k: g.name, v: `${formatNumber(g.target)} ${g.unit}` }))
      const v = profile.versions[0]
      return (
        <Card style={styles.pad}>
          <View style={styles.label}>
            <Text style={type.hero}>Daily targets</Text>
            <Text style={type.label}>{`Plan version ${v.version}, approved by ${v.by}`}</Text>
            <View style={styles.labelThick} />
            <Text style={type.metaStrong}>Aim for at least</Text>
            {atLeast.map((r) => (
              <View key={r.k} style={[styles.between, styles.labelRow]}>
                <Text style={type.title}>{r.k}</Text>
                <Text style={type.value}>{r.v}</Text>
              </View>
            ))}
            <View style={styles.labelMid} />
            <Text style={type.metaStrong}>Keep at or under</Text>
            {atMost.map((r) => (
              <View key={r.k} style={[styles.between, styles.labelRow]}>
                <Text style={type.title}>{r.k}</Text>
                <Text style={type.value}>{r.v}</Text>
              </View>
            ))}
            <View style={styles.labelThick} />
            <Text style={type.meta}>{profile.diet.deficit ? `${profile.diet.deficit}.` : profile.diet.summary}</Text>
          </View>
        </Card>
      )
    },
  },
  {
    group: "Diet plan",
    form: "Idea cards with goal meters",
    name: "Food ideas from your plan, by how much of a goal each covers",
    Draw: ({ s, d }) => {
      const ideas = profileOf(s).diet.ideas.map((i) => ({ ...i, a: ideaAmounts(i.line) }))
      const pT = targetOf(d, "protein")
      const cT = targetOf(d, "calcium")
      return (
        <View style={styles.stack}>
          {ideas.map((i) => (
            <Card key={i.name} style={styles.padSm}>
              <View style={styles.between}>
                <Text style={[type.title, styles.fill]}>{i.name}</Text>
                {i.a.kcal !== undefined && <Text style={type.metaStrong}>{`${formatNumber(i.a.kcal)} kcal`}</Text>}
              </View>
              {[
                { k: "Protein", v: i.a.protein, t: pT, unit: "g", hue: GOAL_HUE.protein },
                { k: "Calcium", v: i.a.calcium, t: cT, unit: "mg", hue: GOAL_HUE.calcium },
              ]
                .filter((x) => x.v !== undefined && x.t)
                .map((x) => (
                  <View key={x.k} style={styles.ideaRow}>
                    <Text style={[type.label, styles.ideaName]}>{x.k}</Text>
                    <View style={styles.fill}>
                      <Meter share={x.v! / x.t!} hue={x.hue} h={6} />
                    </View>
                    <Text style={[type.metaStrong, styles.ideaValue]}>{`${formatNumber(x.v!)} ${x.unit}, ${Math.round((x.v! / x.t!) * 100)}%`}</Text>
                  </View>
                ))}
            </Card>
          ))}
          <Text style={type.meta}>Percent of your daily goal in one serving. Ideas, not a meal plan.</Text>
        </View>
      )
    },
  },
  {
    group: "Diet plan",
    form: "Gap filler",
    name: "Foods that would close yesterday's biggest gap",
    Draw: ({ d }) => {
      const short = d.goals
        .filter((g) => (g.goal.id === "protein" || g.goal.id === "calcium") && g.value !== undefined && g.value < g.goal.target)
        .sort((a, b) => (a.value ?? 0) / a.goal.target - (b.value ?? 0) / b.goal.target)[0]
      const g = short ?? d.goals.find((x) => x.goal.id === "protein")
      if (!g || g.value === undefined) return null
      // Read into a plain number: Reanimated's plugin takes `x.value` in a style for a shared value on iOS.
      const eaten = g.value
      const gap = Math.max(g.goal.target - eaten, 0)
      const hue = GOAL_HUE[g.goal.id]
      const name = g.goal.name.toLowerCase()
      const fixes = g.goal.fixes ?? []
      const scale = Math.max(gap, ...fixes.map((f) => f.adds))
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.title}>{`${g.goal.name} yesterday`}</Text>
            <Text style={type.value}>
              {formatNumber(g.value)}
              <Text style={type.unit}>{` of ${formatNumber(g.goal.target)} ${g.goal.unit}`}</Text>
            </Text>
          </View>
          <View style={styles.gapBar}>
            <View style={{ flex: eaten, height: 14, borderRadius: 7, backgroundColor: hue }} />
            {gap > 0 && <View style={[styles.gapHole, { flex: gap, borderColor: hue }]} />}
          </View>
          <Text style={type.body}>{gap ? `${formatNumber(gap)} ${g.goal.unit} short. Any one of these would have closed it:` : `${g.goal.name} was met. These are easy ways to add ${name} on a lower day:`}</Text>
          {fixes.map((f) => {
            const closes = f.adds >= gap
            return (
              <View key={f.what} style={styles.row}>
                <View style={[styles.fill, styles.stackXs]}>
                  <Text style={type.title}>{f.what.charAt(0).toUpperCase() + f.what.slice(1)}</Text>
                  <View style={styles.fixTrack}>
                    <View style={{ width: `${(f.adds / scale) * 100}%`, height: 6, borderRadius: 3, backgroundColor: tint(hue, "99") }} />
                    {gap > 0 && <View style={[styles.fixGap, { left: `${(gap / scale) * 100}%` }]} />}
                  </View>
                </View>
                <View style={styles.fixRight}>
                  <Text style={type.value}>{`+${formatNumber(f.adds)} ${g.goal.unit}`}</Text>
                  {gap > 0 && closes && (
                    <View style={styles.row}>
                      <CheckCircle size={12} color={STATUS.in.mark} weight="fill" />
                      <Text style={[type.caption, { color: STATUS.in.ink }]}>Closes it</Text>
                    </View>
                  )}
                </View>
              </View>
            )
          })}
          {gap > 0 && <Text style={type.meta}>Dark tick on each bar: the size of the gap.</Text>}
        </Card>
      )
    },
  },
  {
    group: "Diet plan",
    form: "Plate model",
    name: "The plate your plan describes, and each meal's focus",
    Draw: ({ s }) => {
      const diet = profileOf(s).diet
      const size = 128
      const c = size / 2
      const r1 = c - 10
      const parts = [
        { k: "Half the plate vegetables", hue: TEAL_RAMP[2], a0: Math.PI, a1: Math.PI * 2 },
        { k: "A palm of protein", hue: GOAL_HUE.protein, a0: 0, a1: Math.PI / 2 },
        { k: "A fist of whole grains", hue: TEAL_RAMP[4], a0: Math.PI / 2, a1: Math.PI },
      ]
      return (
        <Card style={styles.pad}>
          <View style={styles.row}>
            <Svg width={size} height={size}>
              <Circle cx={c} cy={c} r={c - 1} fill={surface.inset} stroke={hairline.edge} strokeWidth={1} />
              {parts.map((p) => (
                <Path key={p.k} d={slice(c, c, 0.01, r1, p.a0 + 0.02, p.a1 - 0.02)} fill={p.hue} />
              ))}
            </Svg>
            <View style={[styles.fill, styles.stackSm]}>
              {parts.map((p) => (
                <View key={p.k} style={styles.row}>
                  <Swatch hue={p.hue} />
                  <Text style={[type.label, styles.fill]}>{p.k}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.rule} />
          {SLOT_ORDER.map((slot) => {
            const line = diet.slots.find((x) => x.slot === slot)?.line
            if (!line) return null
            return (
              <View key={slot} style={styles.planRow}>
                <SlotTile slot={slot} size={28} />
                <View style={styles.fill}>
                  <Text style={type.title}>{SLOT_NAME[slot]}</Text>
                  <Text style={type.label}>{line}</Text>
                </View>
              </View>
            )
          })}
        </Card>
      )
    },
  },
]

/* ------------------------------------------------------------- styles -- */

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centerX: { alignItems: "center" },
  centerText: { textAlign: "center" },
  dim: { opacity: 0.6 },
  row: { flexDirection: "row", alignItems: "center", gap: space.inline },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline },
  stack: { gap: space.inline },
  stackSm: { gap: space.stack },
  stackXs: { gap: space.line },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.inline, alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.item },
  half: { flexBasis: "47%", flexGrow: 1, maxWidth: "49%" },
  pad: { gap: space.item, padding: space.gutter },
  padSm: { gap: space.inline, padding: space.card },
  icon: { alignItems: "center", justifyContent: "center" },
  fillCenter: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  key: { width: 10, height: 10, borderRadius: 2 },
  rule: { height: 1, backgroundColor: hairline.rule },
  totalRule: { borderTopWidth: 1, borderTopColor: hairline.edge, paddingTop: space.inline },

  stackBar: { flexDirection: "row", gap: 2, height: 14 },
  stackSeg: { height: 14, borderRadius: 4 },

  rankRow: { flexDirection: "row", alignItems: "center", gap: space.inline },
  rankNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: surface.inset, alignItems: "center", justifyContent: "center" },

  divRow: { flexDirection: "row", alignItems: "center", gap: space.inline },
  divName: { width: 72 },
  divTrack: { flex: 1, height: 16, justifyContent: "center", position: "relative" },
  divMid: { position: "absolute", left: "50%", width: 2, marginLeft: -1, top: -2, bottom: -2, backgroundColor: DIVERGE.mid },
  divBar: { position: "absolute", height: 12, borderRadius: 4 },
  divValue: { width: 48, textAlign: "right" },

  strip: { height: 36, position: "relative", justifyContent: "center" },
  stripLine: { position: "absolute", left: 0, right: 0, top: 17, height: 2, borderRadius: 1, backgroundColor: EMPTY },
  stripDot: { position: "absolute", top: 18, borderWidth: 2, borderColor: color.background },
  stripTicks: { height: 16, position: "relative" },
  stripTick: { position: "absolute", top: 0 },

  compare: { flexDirection: "row", alignItems: "stretch", gap: space.item },
  compareCol: { flex: 1, gap: space.stack },
  vline: { width: 1, backgroundColor: hairline.rule },

  tr: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingVertical: space.stack },
  trRule: { borderTopWidth: 1, borderTopColor: hairline.rule, paddingTop: space.inline },
  td: { width: 64, textAlign: "right" },
  tdWide: { width: 76, alignItems: "flex-end" },
  sureCol: { alignItems: "flex-end", gap: 2, width: 64 },
  sureBars: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  sureBar: { width: 5, borderRadius: 2 },
  note: { flexDirection: "row", gap: space.mark, padding: space.compact, borderRadius: 8, backgroundColor: surface.inset },

  cal: { flexDirection: "row", flexWrap: "wrap" },
  calHead: { width: "14.2857%", textAlign: "center", paddingBottom: space.stack },
  calCell: { width: "14.2857%", padding: 2 },
  calInner: { height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center", gap: 1 },
  calNone: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: QUIET },

  gaugeCenter: { position: "absolute", left: 0, right: 0, bottom: 4, alignItems: "center" },

  tiles: { flexDirection: "row", gap: 4 },
  tileCol: { flex: 1, alignItems: "center", gap: space.stack },
  ratioTile: { alignSelf: "stretch", height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  axisRow: { flexDirection: "row", paddingHorizontal: 4 },
  axisLabel: { flex: 1, textAlign: "center" },

  slope: { flexDirection: "row", justifyContent: "center" },
  slopeSide: { width: 56, position: "relative" },
  slopeLeft: { position: "absolute", right: space.inline },
  slopeRight: { position: "absolute", left: space.inline },

  range: { height: 16, position: "relative", justifyContent: "center", backgroundColor: EMPTY, borderRadius: 8 },
  rangeSpan: { position: "absolute", height: 16, borderRadius: 8 },
  rangeGoal: { position: "absolute", width: 2, marginLeft: -1, top: -3, bottom: -3, borderRadius: 1, backgroundColor: ink.strong },
  rangeDot: { position: "absolute", width: 12, height: 12, marginLeft: -6, borderRadius: 6, borderWidth: 2, borderColor: color.background },
  rangeKeySpan: { width: 18, height: 10, borderRadius: 5, backgroundColor: "#D7DCE2" },
  rangeKeyGoal: { width: 2, height: 12, borderRadius: 1, backgroundColor: ink.strong },

  rowHead: { width: 68 },
  cellHead: { flex: 1, textAlign: "center" },
  matrixRow: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 2 },
  matrixCell: { flex: 1, height: 26, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  matrixEmpty: { borderWidth: 1.5, borderColor: hairline.outline, borderStyle: "dashed", backgroundColor: color.background },

  bowls: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  bowl: { width: "9%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  kpis: { flexDirection: "row", gap: space.inline },
  kpiFlat: { flex: 1, gap: space.stack, padding: space.compact, borderRadius: 8, backgroundColor: surface.inset },

  countBar: { height: 12, borderRadius: 6 },
  countValue: { width: 56, textAlign: "right" },

  tally: { flexDirection: "row", gap: space.inline },
  tallyCell: { flex: 1, alignItems: "center", gap: space.stack },
  tallyIcon: { width: 44, height: 44, borderRadius: 22 },

  label: { borderWidth: 1.5, borderColor: ink.strong, borderRadius: 8, padding: space.compact, gap: space.stack },
  labelThick: { height: 6, backgroundColor: ink.strong, marginVertical: space.stack },
  labelMid: { height: 3, backgroundColor: ink.strong, marginVertical: space.stack },
  labelRow: { borderBottomWidth: 1, borderBottomColor: hairline.outline, paddingVertical: space.stack },

  ideaRow: { flexDirection: "row", alignItems: "center", gap: space.inline },
  ideaName: { width: 56 },
  ideaValue: { width: 92, textAlign: "right" },

  gapBar: { flexDirection: "row", gap: 2 },
  gapHole: { height: 14, borderRadius: 7, borderWidth: 1.5, borderStyle: "dashed", backgroundColor: color.background },
  fixTrack: { height: 6, borderRadius: 3, backgroundColor: EMPTY, position: "relative" },
  fixGap: { position: "absolute", top: -3, width: 2, height: 12, marginLeft: -1, borderRadius: 1, backgroundColor: ink.strong },
  fixRight: { alignItems: "flex-end", gap: 2, width: 76 },

  planRow: { flexDirection: "row", alignItems: "flex-start", gap: space.lead },
})
