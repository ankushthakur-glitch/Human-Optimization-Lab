import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { formatNumber } from "@/components/charts"
import { TheirBubble, bubbleText } from "@/components/chat"
import { planDayNow } from "@/components/plan-review"
import { Block, Card, Group, KeyValue, Tag } from "@/components/record-kit"
import { outlookOf, progress, type OutlookHorizon } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { space, type } from "@/lib/theme"

/* Inlay's answer to "Where will I be if I stay the course?" on the Plan
   screen's Outlook tab (Journey screen 51): a line on where her pace points,
   the four horizons with how likely each is, and her weight from the start
   through today to each projected date. Estimates from her own trend and
   from people with a similar start, never a promise. */

export const OUTLOOK_ASK = "If I stay the course, where will I be in 30, 60 and 120 days, and in a year?"

const lb = (n: number) => `${formatNumber(n, 1)} lb`

/** One horizon: the weight, the waist, how much less body fat, how likely.
    A year out reads as a range to hold, as the client's reference shows. */
function Horizon({ h, fatNow }: { h: OutlookHorizon; fatNow?: number }) {
  const year = h.days >= 365
  const round = Math.round(h.weight)
  const weight = year ? `${round - 1} to ${round + 1}` : formatNumber(h.weight, 1)
  const waist = `${formatNumber(h.waist, year ? 0 : 1)} in waist`
  let fat: string | undefined
  if (h.fatPct !== undefined) {
    fat = year
      ? `Body fat ${Math.round(h.fatPct - 1.5)} to ${Math.round(h.fatPct + 1.5)}%`
      : fatNow
        ? `Body fat ${Math.max(0, Math.round((1 - h.fatPct / fatNow) * 100))}% less`
        : undefined
  }
  const likely = `About ${h.likely}% likely`
  return (
    <Card style={styles.horizon} accessibilityLabel={`${h.label}, ${weight} pounds, ${waist}${fat ? `, ${fat}` : ""}, ${likely}`}>
      <Text style={type.meta}>{h.label.replace(/^In /, "")}</Text>
      <Text style={styles.value}>
        {weight}
        <Text style={type.meta}>{" lb"}</Text>
      </Text>
      <Text style={type.meta}>{waist}</Text>
      {fat && <Text style={type.meta}>{fat}</Text>}
      <View style={styles.likely}>
        <Tag tone={h.likely >= 80 ? "ok" : "primary"}>{likely}</Tag>
      </View>
    </Card>
  )
}

/** Inlay's answer in the chat. */
export function OutlookAnswer({ at }: { at?: string }) {
  const onboarding = useOnboarding()
  const now = new Date()
  const p = progress(onboarding, now)
  const { horizons, target } = outlookOf(onboarding, now)
  const weeks = Math.max(1, Math.round(planDayNow(onboarding) / 7))
  return (
    <View style={styles.wrap}>
      <TheirBubble at={at} wide>
        <Text style={bubbleText()}>
          {`Here is where your current pace points, if you keep to the plan as you have so far. These are estimates, drawn from your ${weeks} weeks and from people with a similar start who stayed on track.`}
        </Text>
      </TheirBubble>

      <Block title="Your projected results" meta={`From ${lb(target.weightNow)} today`}>
        <View style={styles.grid}>
          {horizons.map((h) => (
            <Horizon key={h.days} h={h} fatNow={target.fatNow} />
          ))}
        </View>
      </Block>

      <Block title="Weight, actual then projected">
        <Group>
          <KeyValue label={`${p.start.label.replace(/,\s*\d{4}$/, "")}, start`} value={lb(p.weight.start)} />
          <KeyValue label="Today" value={lb(target.weightNow)} />
          {horizons.map((h, i) => (
            <KeyValue key={h.days} label={h.label} value={lb(h.weight)} tag={{ tone: "muted", label: "Projected" }} last={i === horizons.length - 1} />
          ))}
        </Group>
      </Block>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.section },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.item },
  horizon: { flexBasis: "47%", flexGrow: 1, gap: 2, paddingVertical: space.inline },
  value: { ...type.stat },
  likely: { alignSelf: "flex-start", marginTop: space.stack },
})
