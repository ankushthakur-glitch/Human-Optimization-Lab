import * as React from "react"
import { router } from "expo-router"
import { StyleSheet, Text } from "react-native"

import { WeekBars } from "@/components/charts"
import { Block, Card, Tabs } from "@/components/record-kit"
import { WayRow } from "@/components/topic-kit"
import { DAYS_LIMIT, SITTING_LIMIT, monthsOf, sittingsOf, weeksOf } from "@/lib/alcohol"
import { useOnboarding } from "@/lib/onboarding"
import { space, type } from "@/lib/theme"

/* Alcohol in Eat history: Dr. Blanchard's two limits, each its own chart
   graphed like calories, the limit as the line and a bar over it out of
   range. Month draws the last five weeks, 6 months one bar a month (its
   average drinking days a week, its most at one time). Eat itself keeps
   only the "Log drinks" row (AlcoholLog). */

type Win = "month" | "half"

const WINDOWS: { value: Win; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "half", label: "6 months" },
]

const weekLabel = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
const monthLabel = (d: Date) => d.toLocaleDateString("en-US", { month: "short" })

/** Eat's alcohol section: the one row to log a sitting, and the way to its history. */
export function AlcoholLog({ onLog }: { onLog: () => void }) {
  return (
    <Block title="Alcohol" link={{ label: "See history", onPress: () => router.push({ pathname: "/topic-history/[id]", params: { id: "eat" } }) }}>
      <WayRow icon="drink" title="Log drinks" says="How many at one sitting, today or yesterday" onPress={onLog} />
    </Block>
  )
}

export function AlcoholHistory() {
  return (
    <Block title="Alcohol">
      <AlcoholCharts />
    </Block>
  )
}

/** The window switch and the two limit charts. */
function AlcoholCharts() {
  const s = useOnboarding()
  const [win, setWin] = React.useState<Win>("month")
  const sittings = sittingsOf(s.drinks)
  const month = win === "month"
  const spans = month ? weeksOf(sittings) : monthsOf(sittings)
  const label = month ? weekLabel : monthLabel
  const word = month ? "weeks" : "months"

  return (
    <>
      <Tabs options={WINDOWS} value={win} onChange={setWin} snug />
      <Card style={styles.card}>
        <Text style={type.section}>{month ? "Drinking days a week" : "Drinking days a week, on average"}</Text>
        <WeekBars
          limit
          days={spans.map((x) => ({ label: label(x.start), value: x.days }))}
          goal={DAYS_LIMIT}
          unit="days"
          name="Drinking days a week"
          dayWord={word}
          playKey={`alcohol:days:${win}`}
        />
      </Card>
      <Card style={styles.card}>
        <Text style={type.section}>Most drinks at one time</Text>
        <WeekBars
          limit
          days={spans.map((x) => ({ label: label(x.start), value: x.most }))}
          goal={SITTING_LIMIT}
          unit="drinks"
          name="Most drinks at one time"
          dayWord={word}
          playKey={`alcohol:most:${win}`}
        />
      </Card>
    </>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.item },
})
