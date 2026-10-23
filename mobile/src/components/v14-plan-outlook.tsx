import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { AskButton } from "@/components/hol"
import { Block, Card, Group, KeyValue, ProgressBar, StatRow, Tag } from "@/components/record-kit"
import { color, space, type } from "@/lib/theme"
import { AT_HOME, PACE } from "@/lib/v14"

/* Outlook (Journey_14 screen 50): where this is heading, drawn from her
   own twelve weeks rather than a stock before and after. The projection's
   assumptions are on the screen, the slower pace ahead included, and it
   says plainly that it is a projection, not a promise. The longer view
   (30, 60, 120 days, a year) is a question for Ask Inlay (screen 51). */

export function PlanOutlook() {
  return (
    <View style={styles.page}>
      <StatRow>
        <Card style={styles.frame}>
          <Text style={type.label}>Today, Oct 6</Text>
          <Text style={type.hero}>
            {AT_HOME.now.weight}
            <Text style={type.unitLarge}> lb</Text>
          </Text>
          <Text style={type.meta}>34.0 in waist, 37.9% fat</Text>
        </Card>
        <Card style={[styles.frame, styles.projected]}>
          <View style={styles.tagRow}>
            <Text style={type.label}>Jan 1</Text>
            <Tag tone="primary">Simulated</Tag>
          </View>
          <Text style={type.hero}>
            {AT_HOME.goal.weight.toFixed(1)}
            <Text style={type.unitLarge}> lb</Text>
          </Text>
          <Text style={type.meta}>32.2 in waist, 34.5% fat</Text>
        </Card>
      </StatRow>

      <Block title="Toward your goal" meta={`${PACE.lost} of ${PACE.goal} lb`}>
        <Card style={styles.goal}>
          <ProgressBar done={PACE.lost} total={PACE.goal} />
          <View style={styles.goalEnds}>
            <Text style={type.meta}>{`${AT_HOME.start.weight} lb on Jul 1`}</Text>
            <Text style={type.meta}>{`${AT_HOME.goal.weight} lb goal`}</Text>
          </View>
        </Card>
      </Block>

      <Block title="What the projection assumes" meta="From your own data">
        <Group>
          <KeyValue label={`Lost in ${PACE.days} days`} value={`${PACE.lost} lb`} />
          <KeyValue label="Your pace, 8 week average" value={`${PACE.perWeek} lb a week`} />
          <KeyValue label="Pace assumed ahead" value={`${PACE.ahead} lb a week`} tag={{ tone: "muted", label: "Slower" }} />
          <KeyValue label="Left to your goal" value={`${PACE.remaining} lb, about ${PACE.weeksLeft} weeks`} last />
        </Group>
      </Block>

      <View style={styles.note}>
        <Text style={type.body}>
          This is a projection, not a promise. It is redrawn every Monday from your own numbers and moves when they do. Loss slows over time, so it assumes a slower pace than today. Dr. Patel sees the same figure you do.
        </Text>
      </View>

      <AskButton label="Where will I be if I stay the course?" secondary onPress={() => router.push("/v14/ask" as never)} />
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: space.section },
  frame: { gap: space.stack, flex: 1 },
  projected: { borderWidth: 1, borderStyle: "dashed", borderColor: color.primaryLine },
  tagRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.stack },
  goal: { gap: space.inline },
  goalEnds: { flexDirection: "row", justifyContent: "space-between" },
  note: { backgroundColor: color.lowTint, borderRadius: 8, padding: space.card },
})
