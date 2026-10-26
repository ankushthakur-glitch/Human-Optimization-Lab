import * as React from "react"
import { router } from "expo-router"
import { StyleSheet, Text, View } from "react-native"

import { PrimaryButton } from "@/components/hol"
import { StepButton } from "@/components/meal-scan"
import { Minus, Plus } from "@/components/ph"
import { Block, Card, LEVEL_COLOR, LEVEL_TEXT, Tabs, toast } from "@/components/record-kit"
import { WEEK_LIMIT, drinksWord, sittingsOf, weeksOf } from "@/lib/alcohol"
import { localDay } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { chart, color, hairline, ink, space, type } from "@/lib/theme"

/* Alcohol in Eat history: this week's total against the seven drink line,
   six weeks of bars, and how many weeks went over it and how many
   sittings had four or more. Eat itself keeps the logger (AlcoholLog). */

const BAR_AREA = 72
const MAX_DRINKS = 12

const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })

const DAYS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
] as const

/** Eat's alcohol section: which day, how many drinks at that sitting on a
    stepper, and one button to log it; See history goes to the weeks. */
export function AlcoholLog() {
  const s = useOnboarding()
  const [count, setCount] = React.useState(1)
  const [when, setWhen] = React.useState<(typeof DAYS)[number]["value"]>("today")

  async function log() {
    const date = new Date()
    if (when === "yesterday") date.setDate(date.getDate() - 1)
    await s.save({ drinks: [...(s.drinks ?? []), { id: `d-${Date.now().toString(36)}`, day: localDay(date), count, at: new Date().toISOString() }] })
    toast(`${drinksWord(count)} logged`)
    setCount(1)
  }

  return (
    <Block title="Alcohol" link={{ label: "See history", onPress: () => router.push({ pathname: "/topic-history/[id]", params: { id: "eat" } }) }}>
      <Card style={styles.card}>
        <Tabs options={[...DAYS]} value={when} onChange={setWhen} snug />
        <View style={styles.count}>
          <Text style={[type.title, styles.fill]}>Number of drinks</Text>
          <StepButton label="One fewer" onPress={() => setCount((n) => n - 1)} disabled={count <= 1}>
            <Minus size={20} color={color.primary} />
          </StepButton>
          <Text style={styles.number} accessibilityLiveRegion="polite">
            {count}
          </Text>
          <StepButton label="One more" onPress={() => setCount((n) => n + 1)} disabled={count >= MAX_DRINKS}>
            <Plus size={20} color={color.primary} />
          </StepButton>
        </View>
        <PrimaryButton onPress={log}>{`Log ${drinksWord(count)}`}</PrimaryButton>
      </Card>
    </Block>
  )
}

export function AlcoholHistory() {
  const s = useOnboarding()
  const sittings = sittingsOf(s.drinks)
  const weeks = weeksOf(sittings)
  const now = weeks[weeks.length - 1]
  const max = Math.max(WEEK_LIMIT + 2, ...weeks.map((w) => w.total))
  const line = (BAR_AREA * WEEK_LIMIT) / max
  const heavy = weeks.reduce((n, w) => n + w.heavy, 0)
  const over = weeks.filter((w) => w.total > WEEK_LIMIT).length

  return (
    <Block title="Alcohol">
      <Card style={styles.card}>
        <View style={styles.sum}>
          <View style={styles.fill}>
            <Text style={type.label}>This week</Text>
            <Text style={[type.hero, now.total > WEEK_LIMIT && { color: LEVEL_TEXT.out }]}>{drinksWord(now.total)}</Text>
          </View>
          <View style={styles.right}>
            <Text style={type.label}>Weekly limit</Text>
            <Text style={type.value}>{drinksWord(WEEK_LIMIT)}</Text>
          </View>
        </View>

        <View style={styles.chart} accessible accessibilityLabel={`Past six weeks: ${weeks.map((w) => `week of ${short(w.start)}, ${drinksWord(w.total)}`).join("; ")}. Limit ${WEEK_LIMIT} a week.`}>
          <View style={[styles.line, { bottom: 22 + line }]}>
            <Text style={styles.lineLabel}>{WEEK_LIMIT}</Text>
          </View>
          <View style={styles.bars}>
            {weeks.map((w, i) => {
              const tone = w.total > WEEK_LIMIT ? LEVEL_COLOR.out : w.heavy ? LEVEL_COLOR.borderline : w.now ? chart.dataStrong : chart.dataPast
              return (
                <View key={i} style={styles.col}>
                  <Text style={[styles.barValue, w.total > WEEK_LIMIT && { color: LEVEL_TEXT.out }]}>{w.total || ""}</Text>
                  <View style={[styles.bar, { height: Math.max(3, (BAR_AREA * w.total) / max), backgroundColor: w.total ? tone : chart.track }]} />
                  <Text style={[styles.barDay, w.now && styles.barDayNow]}>{short(w.start)}</Text>
                </View>
              )
            })}
          </View>
        </View>

        <View style={styles.foot}>
          <Text style={type.label}>
            Past 6 weeks: <Text style={[type.metaStrong, over > 0 && { color: LEVEL_TEXT.out }]}>{over === 1 ? "1 week" : `${over} weeks`} over the limit</Text>,{" "}
            <Text style={[type.metaStrong, heavy > 0 && { color: LEVEL_TEXT.borderline }]}>{heavy === 1 ? "1 heavy sitting" : `${heavy} heavy sittings`}</Text>
          </Text>
        </View>
      </Card>
    </Block>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.item },
  fill: { flex: 1 },
  count: { flexDirection: "row", alignItems: "center", gap: space.item },
  number: { ...type.hero, minWidth: 32, textAlign: "center" },
  sum: { flexDirection: "row", alignItems: "flex-end" },
  right: { alignItems: "flex-end" },

  chart: { justifyContent: "flex-end", marginTop: space.inline },
  line: { position: "absolute", left: 0, right: 0, height: 0, borderTopWidth: 1, borderStyle: "dashed", borderColor: chart.goal },
  lineLabel: { ...type.meta, position: "absolute", right: 0, top: -18 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingRight: 16 },
  col: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  bar: { alignSelf: "stretch", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barValue: { ...type.metaStrong, color: ink.primary },
  barDay: { ...type.meta, height: 16 },
  barDayNow: { ...type.metaStrong, color: ink.strong },

  foot: { paddingTop: space.item, borderTopWidth: 1, borderTopColor: hairline.edge },
})
