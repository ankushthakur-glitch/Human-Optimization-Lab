import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { CaretRight, ChartLine } from "@/components/ph"
import { RecordIcon } from "@/components/record-icons"
import { Block, Group, HUE, NeedsRow, Tag } from "@/components/record-kit"
import { ScoreDial, TONE_INK, TopicTile } from "@/components/topic-kit"
import { addDays, dayFrom, localDay } from "@/lib/member"
import { TOPICS, topicOf, topicScores } from "@/lib/topics"
import { card, chart, color, ink, space, type } from "@/lib/theme"

/* The Plan screen's "History" tab, after the reference: yesterday's score
   on one card (each topic against its own goal, averaged into the day), one
   row to the trends over time (deficit, steps, exercise and weight, on their
   own page), then every topic with yesterday's score. A topic opens its own
   history (Journey_14 screens 42 to 47). The day's figures sit one tap
   under the score card, and the long view of weigh-ins, blood pressure and
   labs stays on the History page, one row further. Nothing is shown twice:
   the score is here, the graphs are one tap away. */

/** Green at 80 and over, amber below, red when it is far short. */
const chipOf = (score: number): "ok" | "soon" | "high" => (score >= 80 ? "ok" : score >= 40 ? "soon" : "high")

export function YourHistory() {
  const yesterday = React.useMemo(() => addDays(dayFrom(localDay()), -1), [])
  const { scores, average } = topicScores(yesterday)
  const openDay = () => router.push({ pathname: "/yesterday", params: { date: "yesterday" } })

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={openDay}
        accessibilityRole="button"
        accessibilityLabel={`Yesterday, ${average} percent. Each topic against its own goal, averaged into the day. Open the numbers behind it.`}
        style={({ pressed }) => [styles.score, pressed && styles.pressed]}
      >
        <ScoreDial value={average} size={64} stroke={6} tone={chart.data} track={chart.dataTrack} ink={ink.strong} of="%" />
        <View style={styles.fill}>
          <Text style={styles.scoreTitle}>Yesterday</Text>
          <Text style={type.label}>Each topic against its own goal, averaged into the day</Text>
        </View>
        <CaretRight size={14} color={card.chevron} />
      </Pressable>

      <Group>
        <NeedsRow
          icon={<ChartLine size={16} color={HUE.teal.ink} />}
          hue="teal"
          title="Your history"
          meta="Deficit, steps, exercise and weight over time"
          onPress={() => router.push("/history-trends")}
        />
      </Group>

      <Block title="By topic" meta="Yesterday's score">
        <Group>
          {scores.map((s) => {
            const t = topicOf(s.id)!
            return (
              <Pressable
                key={s.id}
                onPress={() => router.push({ pathname: "/topic-history/[id]", params: { id: s.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${t.name} history. Yesterday ${s.score} out of 100. ${s.line}`}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <TopicTile topic={t} size={32} />
                <View style={styles.fill}>
                  <Text style={[type.title, { color: ink.strong }]}>{s.id === "medication" ? "Medication" : t.name}</Text>
                  <Text style={type.label} numberOfLines={1}>
                    {s.line.replace(/ · /g, ", ")}
                  </Text>
                </View>
                <Tag tone={chipOf(s.score)}>{String(s.score)}</Tag>
                <CaretRight size={14} color={card.chevron} />
              </Pressable>
            )
          })}
        </Group>
      </Block>

      <Group>
        <NeedsRow
          icon={<RecordIcon name="labs" size={16} color={HUE.teal.ink} />}
          title="Weigh-ins, blood pressure and lab results"
          meta="Day by day, since you started"
          onPress={() => router.push("/history")}
        />
      </Group>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.section },
  fill: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  score: { flexDirection: "row", alignItems: "center", gap: space.lead, padding: space.card, borderRadius: 8, backgroundColor: color.primarySoft, borderWidth: 1, borderColor: color.primaryEdge },
  scoreTitle: { ...type.section },
  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
})
