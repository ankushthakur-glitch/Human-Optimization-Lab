import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { ScoreRing } from "@/components/charts"
import { CaretRight, ChartLine } from "@/components/ph"
import { Block, Card, Group, NeedsRow, Tag } from "@/components/record-kit"
import { TopicTile } from "@/components/v14-kit"
import { color, hairline, space, type } from "@/lib/theme"
import { TOPICS, yesterdayScore } from "@/lib/v14"

/* The Plan tab's History section: the doors to Yesterday (screen 39), the
   history of every figure together (41), and each topic's own history (42
   to 47). The deck reaches a topic's history only from yesterday's score;
   here each topic is one tap from the Plan tab too. */

export function PlanHistory() {
  return (
    <View style={styles.page}>
      <Card onPress={() => router.push("/v14/review" as never)} style={styles.score} accessibilityLabel={`Yesterday scored ${yesterdayScore} of 100. Open the review.`}>
        <ScoreRing percent={yesterdayScore} size={72} of="Yesterday's score" />
        <View style={styles.grow}>
          <Text style={type.section}>Yesterday</Text>
          <Text style={type.label}>Each topic against its own goal, averaged into the day</Text>
        </View>
        <CaretRight size={14} color={hairline.outline} />
      </Card>

      <Group>
        <NeedsRow icon={<ChartLine size={16} color={color.primary} />} title="Your history" meta="Deficit, steps, exercise and weight over time" onPress={() => router.push("/v14/history/all" as never)} />
      </Group>

      <Block title="By topic" meta="Yesterday's score">
        <Group>
          {TOPICS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => router.push(`/v14/history/${t.id}` as never)}
              accessibilityRole="button"
              accessibilityLabel={`${t.name} history. Yesterday ${t.yesterday}.`}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <TopicTile id={t.id} size={32} />
              <View style={styles.grow}>
                <Text style={type.title}>{t.name}</Text>
                <Text style={type.meta} numberOfLines={1}>
                  {t.yesterdayWhy}
                </Text>
              </View>
              <Tag tone={t.yesterday >= 80 ? "ok" : "low"}>{`${t.yesterday}`}</Tag>
              <CaretRight size={14} color={hairline.outline} />
            </Pressable>
          ))}
        </Group>
      </Block>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: space.section },
  score: { flexDirection: "row", alignItems: "center", gap: space.lead },
  grow: { flex: 1, minWidth: 0, gap: space.line },
  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY, paddingHorizontal: space.rowX },
  pressed: { opacity: 0.7 },
})
