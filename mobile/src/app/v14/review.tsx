import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { ScoreRing } from "@/components/charts"
import { FlowScreen } from "@/components/flow"
import { CaretRight } from "@/components/ph"
import { Block, Card, Group, Tag, TextAction } from "@/components/record-kit"
import { PlanNote, TopicTile } from "@/components/v14-kit"
import { hairline, space, type } from "@/lib/theme"
import { TOPICS, yesterdayScore } from "@/lib/v14"

/* Yesterday, scored (Journey_14 screen 39): the same six topics Today
   sets, each against its own goal, averaged into the day. The page says
   how the 84 is made, because a score nobody can rebuild is one nobody
   trusts, and it ends on what today already does about the two misses: the
   review is a handover, not a verdict. Each topic opens its history. */

export default function V14Review() {
  const met = TOPICS.filter((t) => t.yesterday >= 80).length
  return (
    <FlowScreen page title="Yesterday" description="Mon, Oct 5">
      <Card style={styles.score}>
        <ScoreRing percent={yesterdayScore} size={96} of="Yesterday's score" />
        <View style={styles.grow}>
          <Text style={type.section}>{`${met} of ${TOPICS.length} at target`}</Text>
          <Text style={type.body}>Sleep and the evening metformin cost you points. The score is the plain average of the six, nothing weighted.</Text>
          <TextAction chevron onPress={() => router.push("/v14/numbers" as never)}>
            See the numbers
          </TextAction>
        </View>
      </Card>

      <Block title="Each topic against its goal">
        <Group>
          {TOPICS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => router.push(`/v14/history/${t.id}` as never)}
              accessibilityRole="button"
              accessibilityLabel={`${t.name}, ${t.yesterday} of 100. ${t.yesterdayWhy}.`}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <TopicTile id={t.id} size={32} />
              <View style={styles.grow}>
                <Text style={type.title}>{t.name}</Text>
                <Text style={type.meta}>{t.yesterdayWhy}</Text>
              </View>
              <Tag tone={t.yesterday >= 80 ? "ok" : "low"}>{`${t.yesterday}`}</Tag>
              <CaretRight size={14} color={hairline.outline} />
            </Pressable>
          ))}
        </Group>
      </Block>

      <PlanNote>Both misses are already in today's plan: the evening dose has a 7 pm reminder, and tonight's sleep window starts at 10:30.</PlanNote>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  score: { flexDirection: "row", alignItems: "center", gap: space.lead },
  grow: { flex: 1, minWidth: 0, gap: space.stack },
  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY, paddingHorizontal: space.rowX },
  pressed: { opacity: 0.7 },
})
