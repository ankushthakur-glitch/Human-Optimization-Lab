import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { formatNumber } from "@/components/charts"
import { AskButton } from "@/components/hol"
import { planDayNow } from "@/components/plan-review"
import { Block, Group, HUE, KeyValue } from "@/components/record-kit"
import { MEMBER, outlookOf, progress, shortDay } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { chart, color, font, ink, space, type } from "@/lib/theme"

/* The Plan screen's "Outlook" tab (Journey screen 36, "Where she is likely
   to be"), from the client's reference: two cards side by side, today's
   figures and the same trend carried to 1 January (dashed and marked
   Simulated, so it never reads as a measurement); how far she is toward her
   goal; what the projection assumes, every line from her own data; and a
   plain note that it is a projection, not a promise. Last, one question for
   Inlay, which answers with her trend 30, 60 and 120 days and a year out
   (Journey screen 51). */

const lb = (n: number) => `${formatNumber(n, 1)} lb`

/** One of the two figures at the top: a date, the weight, then waist and
    body fat. The simulated one is dashed in teal with a "Simulated" tag. */
function Figure({ date, weight, waist, fat, simulated }: { date: string; weight: number; waist: number; fat?: number; simulated?: boolean }) {
  const words = `${formatNumber(waist, 1)} in waist${fat !== undefined ? `, ${formatNumber(fat, 1)}% fat` : ""}`
  return (
    <View
      style={[styles.figure, simulated && styles.figureSimulated]}
      accessible
      accessibilityLabel={`${simulated ? "Simulated, " : ""}${date}, ${lb(weight)}, ${words}`}
    >
      <View style={styles.figureTop}>
        <Text style={styles.figureDate}>{date}</Text>
        {simulated && (
          <View style={styles.simulated}>
            <Text style={styles.simulatedText}>Simulated</Text>
          </View>
        )}
      </View>
      <Text style={styles.figureValue}>
        {formatNumber(weight, 1)}
        <Text style={styles.figureUnit}>{" lb"}</Text>
      </Text>
      <Text style={styles.figureMeta}>{words}</Text>
    </View>
  )
}

export function Outlook() {
  const onboarding = useOnboarding()
  const now = new Date()
  const p = progress(onboarding, now)
  const { target } = outlookOf(onboarding, now)
  const days = Math.max(1, planDayNow(onboarding))
  const done = target.total > 0 ? Math.min(1, Math.max(0, target.lost / target.total)) : 0
  const ask = "Where will I be if I stay the course?"
  return (
    <View style={styles.wrap}>
      <View style={styles.figures}>
        <Figure date={`Today, ${shortDay(now)}`} weight={target.weightNow} waist={target.waistNow} fat={target.fatNow} />
        <Figure date={target.label} weight={target.weight} waist={target.waist} fat={target.fatPct} simulated />
      </View>

      <View style={styles.goal}>
        <View style={styles.goalHead}>
          <Text style={styles.goalTitle}>Toward your goal</Text>
          <Text style={type.meta}>{`${formatNumber(target.lost, 1)} of ${formatNumber(target.total, 0)} lb`}</Text>
        </View>
        <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel={`${Math.round(done * 100)} percent of the way to your goal weight`}>
          <View style={[styles.fill, { width: `${Math.round(done * 100)}%` }]} />
        </View>
        <View style={styles.goalEnds}>
          <Text style={type.meta}>{`${formatNumber(p.weight.start, 0)} lb on ${p.start.label}`}</Text>
          <Text style={type.meta}>{`${formatNumber(MEMBER.goalWeight, 0)} lb goal`}</Text>
        </View>
      </View>

      <Block title="What the projection assumes" meta="From your own data">
        <Group>
          <KeyValue label={`Lost in ${days} days`} value={lb(target.lost)} />
          <KeyValue label="Your pace, 8 week average" value={`${formatNumber(target.pace, 1)} lb a week`} />
          <KeyValue
            label="Pace assumed ahead"
            value={`${formatNumber(target.assumed, 1)} lb a week`}
            tag={target.assumed < target.pace ? { tone: "muted", label: "Slower" } : undefined}
          />
          <KeyValue
            label="Left to your goal"
            value={`${lb(target.left)}${target.leftWeeks ? `, about ${target.leftWeeks} weeks` : ""}`}
            last
          />
        </Group>
      </Block>

      <View style={styles.note} accessible>
        <Text style={styles.noteText}>
          {"This is a projection, not a promise. It is redrawn every Monday from your own numbers and moves when they do. Loss slows over time, so it assumes a slower pace than today. "}
          {`${MEMBER.doctorShort} sees the same figure you do.`}
        </Text>
      </View>

      <AskButton label={ask} onPress={() => router.push({ pathname: "/assistant", params: { topic: "plan", outlook: "1" } })} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.section },

  figures: { flexDirection: "row", gap: space.item },
  figure: { flex: 1, minWidth: 0, gap: space.line, padding: space.card, borderRadius: 8, borderWidth: 1, borderColor: HUE.neutral.edge, backgroundColor: color.background },
  figureSimulated: { borderStyle: "dashed", borderColor: color.primaryLine, backgroundColor: color.primaryTint },
  figureTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline, minHeight: 20 },
  figureDate: { ...type.label },
  figureValue: { ...type.hero, fontVariant: ["tabular-nums"] },
  figureUnit: { ...type.label },
  figureMeta: { ...type.meta },
  simulated: { paddingHorizontal: space.inline, paddingVertical: 1, borderRadius: 999, borderWidth: 1, borderColor: color.primaryEdge, backgroundColor: color.primarySoft },
  simulatedText: { fontFamily: font.medium, fontSize: 10, lineHeight: 14, color: ink.primary },

  goal: { gap: space.inline },
  goalHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.item },
  goalTitle: { ...type.sectionLabel },
  track: { height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: chart.dataTrack },
  fill: { height: "100%", borderRadius: 4, backgroundColor: chart.data },
  goalEnds: { flexDirection: "row", justifyContent: "space-between", gap: space.item },

  note: { padding: space.card, borderRadius: 8, borderWidth: 1, borderColor: HUE.amber.edge, backgroundColor: HUE.amber.tint },
  noteText: { ...type.body, color: ink.content },

  pressed: { opacity: 0.7 },
})
