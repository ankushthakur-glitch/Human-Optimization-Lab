import * as React from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { CaretRight, Check } from "@/components/ph"
import { Sheet } from "@/components/sheet"
import { Button } from "@/components/ui"
import { chosenTests, dollars, dollarsExact } from "@/lib/baseline-tests"
import { CADENCES, TIERS, YEARLY_TEST_DISCOUNT, type Cadence } from "@/lib/plans"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* The plan set-up's last two steps share these: step 5 (/enrollment)
   where she picks her tests and sees the first month, and step 6
   (/payment) where she pays it. The plan named from her goals, what the
   first month costs, and the sheet that breaks it down. Each test at its
   own price; no bundle saving is shown or taken. */

/** What the plan includes, listed in the sheet its card opens. */
const INCLUDES = [
  "Multi-goal plan",
  "Testing and analysis",
  "Nutrition and exercise",
  "AI insights",
  "Physician approval",
  "Progress tracking",
]

/** Each goal's word in the plan's name, by its first words. */
const PLAN_WORDS: { words: RegExp; word: string }[] = [
  { words: /^lose weight/, word: "Weight" },
  { words: /^improve metabolic/, word: "Metabolic" },
  { words: /^improve cholesterol/, word: "Heart" },
  { words: /^gain or preserve muscle/, word: "Muscle" },
  { words: /^improve bone/, word: "Bone" },
  { words: /^improve sleep/, word: "Sleep" },
  { words: /^increase energy/, word: "Energy" },
  { words: /^improve fitness/, word: "Fitness" },
  { words: /^improve kidney/, word: "Kidney" },
]

/** "Metabolic and weight optimization": her first two goals that have a
    word; the membership's own name when none does. */
export function planName(goals: string[] | undefined) {
  const words = (goals ?? [])
    .map((g) => PLAN_WORDS.find((p) => p.words.test(g.toLowerCase()))?.word)
    .filter((w): w is string => !!w)
    .filter((w, i, all) => all.indexOf(w) === i)
    .slice(0, 2)
  if (!words.length) return TIERS.optimization.name
  return `${words.map((w, i) => (i ? w.toLowerCase() : w)).join(" and ")} optimization`
}

/** What she pays today: the tests at their own prices, the membership's
    charge (a month, or the year up front) and, paying yearly, the member
    discount off the tests. `monthlyToday` and `yearlySaving` say what the
    other way of paying would be. */
export function firstMonth(ids: string[] | undefined, billing: Cadence) {
  const tests = chosenTests(ids)
  const subtotal = tests.reduce((sum, t) => sum + t.price, 0)
  const membership = priceNumber(billing)
  const discount =
    billing === "yearly"
      ? Math.round(subtotal * YEARLY_TEST_DISCOUNT) / 100
      : 0
  return {
    tests,
    subtotal,
    membership,
    discount,
    total: subtotal + membership - discount,
    monthlyToday: subtotal + priceNumber("monthly"),
    yearlySaving: priceNumber("monthly") * 12 - priceNumber("yearly"),
  }
}

export const priceNumber = (billing: Cadence) =>
  Number(TIERS.optimization.billing[billing].price.replace(/[^0-9.]/g, ""))

/** "Monthly | Yearly  save 10%": two segments in one track; the chosen one
    is raised and white. */
export function BillingToggle({
  billing,
  onChange,
}: {
  billing: Cadence
  onChange: (next: Cadence) => void
}) {
  return (
    <View
      style={styles.toggle}
      accessibilityRole="radiogroup"
      accessibilityLabel="Billing"
    >
      {CADENCES.map((c) => {
        const on = billing === c
        const save = TIERS.optimization.billing[c].save
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={save ? `${c}, ${save}` : c}
            style={({ pressed }) => [
              styles.segment,
              on && styles.segmentOn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
              {TIERS.optimization.billing[c].name}
            </Text>
            {!!save && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{save.toLowerCase()}</Text>
              </View>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

/** The plan on a deep teal card: the name and how it is billed with the
    price at the right (yearly shows the twelve months' full price struck
    through above it), then one row on its own, "What's included (6)",
    that opens the list in a sheet (`onIncluded`). */
export function PlanCard({
  goals,
  billing,
  onIncluded,
}: {
  goals: string[] | undefined
  billing: Cadence
  onIncluded: () => void
}) {
  const price = TIERS.optimization.billing[billing]
  const yearly = billing === "yearly"
  return (
    <View style={styles.planStack}>
      <View style={styles.plan}>
        <View style={styles.planWords}>
          <Text
            style={styles.planName}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {planName(goals)}
          </Text>
          <Text
            style={styles.planNote}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {yearly
              ? "Billed yearly · cancel any time, no contract"
              : "Billed monthly · cancel anytime, no contract"}
          </Text>
        </View>
        <View style={styles.price}>
          {yearly && (
            <Text style={styles.priceWas}>
              {dollars(priceNumber("monthly") * 12)}
            </Text>
          )}
          <Text style={styles.priceValue}>{price.price}</Text>
          <Text style={styles.pricePeriod}>
            {yearly ? "/ year" : "/ month"}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onIncluded}
        accessibilityRole="button"
        style={({ pressed }) => [styles.includedRow, pressed && styles.pressed]}
      >
        <Text
          style={styles.includedText}
        >{`What's included (${INCLUDES.length})`}</Text>
        <CaretRight size={16} color={ink.secondary} />
      </Pressable>
    </View>
  )
}

/** The plan card's light green gradient (step 6's total card wears it
    too), from the teal's palest tint at
    the top left to near white at the bottom right, drawn at the measured
    size as the page's own ground is (components/hol.tsx). */
export function GreenWash() {
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null)
  const id = `wash${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((s) =>
      s && Math.abs(s.w - width) < 0.5 && Math.abs(s.h - height) < 0.5
        ? s
        : { w: width, h: height }
    )
  }
  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={onLayout}
      pointerEvents="none"
    >
      {size && (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={WASH.from} />
              <Stop offset="1" stopColor={WASH.to} />
            </LinearGradient>
          </Defs>
          <Rect width={size.w} height={size.h} fill={`url(#${id})`} />
        </Svg>
      )}
    </View>
  )
}

/** The wash's two greens and the card's edge: the brand teal at its
    lightest, so the words keep their full contrast. */
export const WASH = {
  from: "#DDF2EE",
  to: "#F5FBFA",
  edge: "#CBE8E2",
  rule: "rgba(1, 131, 126, 0.12)",
}

/** "What's included": the six lines, each with its tick. */
export function IncludedSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="What's included" onClose={onClose}>
      <View style={styles.includedList}>
        {INCLUDES.map((line) => (
          <View key={line} style={styles.include}>
            <View style={styles.tick}>
              <Check size={10} color={color.onPrimary} weight="bold" />
            </View>
            <Text style={styles.includeText}>{line}</Text>
          </View>
        ))}
      </View>
      <Button onPress={onClose}>Done</Button>
    </Sheet>
  )
}

/** A line of money: its words, an optional line under them, the amount. */
export function MoneyRow({
  label,
  meta,
  value,
  strong,
  good,
}: {
  label: string
  meta?: string
  value: string
  strong?: boolean
  good?: boolean
}) {
  return (
    <View style={styles.money}>
      <View style={styles.moneyWords}>
        <Text style={strong ? styles.moneyStrong : styles.moneyLabel}>
          {label}
        </Text>
        {!!meta && <Text style={styles.moneyMeta}>{meta}</Text>}
      </View>
      <Text
        style={[
          strong ? styles.moneyStrong : styles.moneyValue,
          good && styles.good,
        ]}
      >
        {value}
      </Text>
    </View>
  )
}

/** Today's total, the line that ends every summary: a rule
    above it, the words at section size and the amount as the page's one
    big number. No box of its own, so it never nests in its card. */
export function TotalBand({ total }: { total: number }) {
  return (
    <View style={styles.band}>
      <Text style={styles.bandLabel}>Total due today</Text>
      <Text style={styles.bandValue}>{dollarsExact(total)}</Text>
    </View>
  )
}

/** "Cost breakdown", read like a receipt: the tests she picked with
    their prices and subtotal, the membership's first month, the total
    under a rule, and one quiet line on what she pays after it. Every line
    is the same row; only the total is bold. */
export function CostBreakdownSheet({
  tests,
  billing,
  goals,
  onClose,
}: {
  tests: string[] | undefined
  billing: Cadence
  goals: string[] | undefined
  onClose: () => void
}) {
  const cost = firstMonth(tests, billing)
  const price = TIERS.optimization.billing[billing]
  return (
    <Sheet title="Cost breakdown" onClose={onClose}>
      <ScrollView
        style={styles.sheetList}
        contentContainerStyle={styles.sheetBody}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.group}>
          <Text
            style={styles.groupTitle}
          >{`Tests (${cost.tests.length})`}</Text>
          {cost.tests.map((t) => (
            <ReceiptRow key={t.id} label={t.name} value={dollars(t.price)} />
          ))}
          <ReceiptRow
            label="Tests subtotal"
            value={dollars(cost.subtotal)}
            quiet
          />
          {cost.discount > 0 && (
            <ReceiptRow
              label={`Annual member discount, ${YEARLY_TEST_DISCOUNT}% off tests`}
              value={`−${dollarsExact(cost.discount)}`}
              quiet
            />
          )}
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Membership</Text>
          <ReceiptRow
            label={`${planName(goals)}, ${billing === "yearly" ? "12 months" : "first month"}`}
            value={dollars(cost.membership)}
          />
        </View>

        <View>
          <TotalBand total={cost.total} />
          <Text
            style={styles.after}
          >{billing === "yearly"
              ? `Your membership renews at ${price.price} ${price.period}. Cancel anytime.`
              : `Then ${price.price} ${price.period} for the membership. Cancel anytime.`}</Text>
        </View>
      </ScrollView>
      <Button onPress={onClose}>Done</Button>
    </Sheet>
  )
}

/** One receipt line: the words left, the amount right, in one size. */
function ReceiptRow({
  label,
  value,
  quiet,
}: {
  label: string
  value: string
  quiet?: boolean
}) {
  return (
    <View style={styles.receipt}>
      <Text
        style={[styles.receiptLabel, quiet && styles.receiptQuiet]}
        numberOfLines={2}
      >
        {label}
      </Text>
      <Text style={[styles.receiptValue, quiet && styles.receiptQuiet]}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  // The deep teal plan card and the white row under it, one block.
  planStack: { gap: space.inline },
  plan: {
    gap: space.item,
    padding: space.gutter,
    borderRadius: 14,
    backgroundColor: ink.primary,
  },
  planWords: { gap: space.stack },
  planName: { ...type.section, color: ink.onColor },
  planNote: { ...type.label, color: "rgba(255, 255, 255, 0.82)" },
  price: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: space.stack,
  },
  priceWas: {
    ...type.label,
    color: "rgba(255, 255, 255, 0.7)",
    textDecorationLine: "line-through",
    fontVariant: ["tabular-nums"],
  },
  priceValue: {
    fontFamily: font.semibold,
    fontSize: 24,
    lineHeight: 30,
    color: ink.onColor,
    fontVariant: ["tabular-nums"],
  },
  pricePeriod: { ...type.label, color: "rgba(255, 255, 255, 0.82)" },
  includedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: space.gutter,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  includedText: { ...type.title, color: ink.content },

  toggle: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    backgroundColor: color.primarySoft,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.inline,
    minHeight: 40,
    borderRadius: 9,
  },
  segmentOn: {
    backgroundColor: color.background,
    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.08)",
  },
  segmentText: { ...type.title, color: ink.secondary },
  segmentTextOn: { color: ink.strong },
  badge: {
    paddingHorizontal: space.inline,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: color.primary,
  },
  badgeText: { ...type.tag, color: ink.onColor },

  includedList: { gap: space.item },
  include: { flexDirection: "row", alignItems: "center", gap: space.inline },
  tick: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  includeText: { ...type.body, color: ink.content, flexShrink: 1 },

  money: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.item,
  },
  moneyWords: { flex: 1, gap: space.line },
  // The lines that add up sit a level under the list they sum: label
  // grey, regular amounts; only the total is bold.
  moneyLabel: { ...type.body, color: ink.secondary },
  moneyMeta: { ...type.meta },
  moneyValue: {
    ...type.body,
    color: ink.content,
    fontVariant: ["tabular-nums"],
  },
  moneyStrong: {
    ...type.title,
    color: ink.strong,
    fontFamily: font.semibold,
    fontVariant: ["tabular-nums"],
  },
  good: { color: ink.good },

  band: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.stack,
    paddingVertical: space.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: hairline.edge,
  },
  bandLabel: { ...type.section },
  bandValue: { ...type.hero, fontVariant: ["tabular-nums"] },

  sheetList: { maxHeight: 520 },
  sheetBody: { gap: space.section, paddingBottom: space.line },
  group: { gap: space.inline },
  groupTitle: { ...type.sectionLabel },
  receipt: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.item,
  },
  receiptLabel: { ...type.body, color: ink.content, flex: 1 },
  receiptValue: {
    ...type.body,
    color: ink.content,
    fontVariant: ["tabular-nums"],
  },
  receiptQuiet: { color: ink.secondary },
  after: { ...type.meta },
})
