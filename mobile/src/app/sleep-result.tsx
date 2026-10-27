import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { PlanStepPage } from "@/components/plan-steps"
import { Card, KeyValue, Tag, type Tone } from "@/components/record-kit"
import { MEMBER } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { BANG, fromRecord, sleepRisk, STOP, type SleepRisk } from "@/lib/sleep-screen"
import { chart, font, hairline, ink, space, type } from "@/lib/theme"

/* The sleep apnea screen's result, after the questions (/sleep-questions).
   One card: how many of the eight are yes (her four answers and her
   record) with the risk as a tag beside it, the three zones as a bar with
   her place marked, then one sentence on what it means and what comes
   next (her home sleep study when she kept it at /baseline) and the
   honest limit. A second card shows what counted: her four answers, then
   the four facts from her record (BMI, age, sex; neck size not measured).
   "See my plan" walks on to her plan (/plan?walk=1). */

const RISK: Record<SleepRisk, { tone: Tone; tag: string; line: string }> = {
  low: { tone: "ok", tag: "Low risk", line: "A low chance of sleep apnea." },
  intermediate: { tone: "low", tag: "Some risk", line: "Some chance of sleep apnea." },
  high: { tone: "high", tag: "Higher risk", line: "A higher chance of sleep apnea." },
}

/** The clinic's zones over the nine possible scores, 0 to 8. */
const ZONES: { risk: SleepRisk; name: string; span: number; fill: string }[] = [
  { risk: "low", name: "Low", span: 3, fill: chart.zoneIn },
  { risk: "intermediate", name: "Some", span: 2, fill: chart.zoneBorderline },
  { risk: "high", name: "Higher", span: 4, fill: chart.zoneOut },
]

/** The record's facts by name, not as the questions put them. */
const RECORD_LABEL: Partial<Record<string, string>> = { bmi: "BMI", age: "Age", neck: "Neck size", male: "Sex" }

export default function SleepResultScreen() {
  const onboarding = useOnboarding()
  const record = fromRecord(onboarding.healthProfile)
  const answers = { ...onboarding.sleepScreen, ...record.answers }
  const { yes, risk } = sleepRisk(answers)
  const r = RISK[risk]
  const study = (onboarding.addOns ?? ["sleep", "smart"]).includes("sleep")
  const next =
    risk === "low"
      ? `${MEMBER.doctorShort} will see your answers with your plan.`
      : study
        ? "Your home sleep study, two nights in your own bed, will tell for sure."
        : `${MEMBER.doctorShort} will look at your answers. A home sleep study is one way to find out.`

  return (
    <PlanStepPage headerTitle="Sleep" title="Your sleep result" onNext={() => router.replace("/plan?walk=1")} nextLabel="See my plan" nextWide>
      <Card style={styles.card}>
        <View style={styles.top} accessible accessibilityLabel={`${yes} of 8. ${r.tag}.`}>
          <View style={styles.score}>
            <Text style={styles.scoreValue}>{yes}</Text>
            <Text style={styles.scoreOf}>/ 8</Text>
          </View>
          <Tag tone={r.tone}>{r.tag}</Tag>
        </View>

        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.zones}>
            {ZONES.map((z) => (
              <View key={z.risk} style={[styles.zone, { flex: z.span, backgroundColor: z.fill }]} />
            ))}
            <View style={[styles.marker, { left: `${((yes + 0.5) / 9) * 100}%` }]} />
          </View>
          <View style={styles.zoneNames}>
            {ZONES.map((z) => (
              <Text key={z.risk} style={[styles.zoneName, { flex: z.span }, z.risk === risk && styles.zoneNameOn]}>
                {z.name}
              </Text>
            ))}
          </View>
        </View>

        <Text style={styles.line}>{`${r.line} ${next}`}</Text>
        <Text style={styles.limit}>A screen, not a diagnosis.</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={type.section} accessibilityRole="header">
          What counted
        </Text>
        <View>
          {STOP.map((item, i) => (
            <KeyValue key={item.id} label={item.short} value={answers[item.id] ? "Yes" : "No"} last={i === STOP.length - 1} />
          ))}
        </View>
        <Text style={styles.sub} accessibilityRole="header">
          From your record
        </Text>
        <View>
          {BANG.map((item, i) => (
            <KeyValue key={item.id} label={RECORD_LABEL[item.id] ?? item.short} value={record.values[item.id] ?? "Not measured"} last={i === BANG.length - 1} />
          ))}
        </View>
      </Card>

      <Text style={styles.shared}>{`Shared with ${MEMBER.doctorShort} to shape your plan.`}</Text>
    </PlanStepPage>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.item, padding: space.card },

  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item },
  score: { flexDirection: "row", alignItems: "baseline", gap: space.mark },
  scoreValue: { fontFamily: font.semibold, fontSize: 40, lineHeight: 46, letterSpacing: -0.8, color: ink.strong, fontVariant: ["tabular-nums"] },
  scoreOf: { fontFamily: font.medium, fontSize: 16, lineHeight: 20, color: ink.detail },

  zones: { flexDirection: "row", gap: 3, height: 8 },
  zone: { borderRadius: 4 },
  marker: { position: "absolute", top: -4, width: 4, height: 16, marginLeft: -2, borderRadius: 2, backgroundColor: ink.strong, borderWidth: 1, borderColor: hairline.edge },
  zoneNames: { flexDirection: "row", gap: 3, marginTop: space.mark },
  zoneName: { ...type.meta, textAlign: "center" },
  zoneNameOn: { fontFamily: font.semibold, color: ink.strong },

  line: { ...type.body, color: ink.content },
  limit: { ...type.meta },

  sub: { ...type.label, marginTop: space.mark },
  shared: { ...type.label, textAlign: "center", marginTop: space.inline },
})
