import * as React from "react"
import { router } from "expo-router"
import { StyleSheet, Text, View } from "react-native"

import { Block, Card, LEVEL_COLOR, LEVEL_TEXT } from "@/components/record-kit"
import { WayRow } from "@/components/topic-kit"
import { WEEK_LIMIT, drinksWord, sittingsOf, weeksOf } from "@/lib/alcohol"
import { useOnboarding } from "@/lib/onboarding"
import { chart, hairline, ink, space, type } from "@/lib/theme"

/* Alcohol in Eat history: this week's total against the seven drink line,
   six weeks of bars, and how many weeks went over it and how many
   sittings had four or more. Eat itself keeps only the
   "Log drinks" row (AlcoholLog). */

const BAR_AREA = 72

const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })

/** Eat's alcohol section: the one row to log a sitting, and the way to its history. */
export function AlcoholLog({ onLog }: { onLog: () => void }) {
  return (
    <Block title="Alcohol" link={{ label: "See history", onPress: () => router.push({ pathname: "/topic-history/[id]", params: { id: "eat" } }) }}>
      <WayRow icon="drink" title="Log drinks" says="How many at one sitting, today or yesterday" onPress={onLog} />
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
