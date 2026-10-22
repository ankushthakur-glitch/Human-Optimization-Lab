import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { HistoryView } from "@/components/history-view"
import { CaretRight } from "@/components/ph"
import { RecordIcon } from "@/components/record-icons"
import { Block, Group, HUE, NeedsRow } from "@/components/record-kit"
import { TONE_INK, TopicTile } from "@/components/topic-kit"
import { HISTORY, OVERALL, averageOf, figure } from "@/lib/history"
import { TOPICS } from "@/lib/topics"
import { card, ink, space, type } from "@/lib/theme"

/* The Plan screen's "Your history" tab (Journey_14 screens 41 to 47): the
   same figures graphed over time, in the shape patients already know from
   Apple Health. The first screen is every topic at once (deficit, steps,
   exercise, weight) over the week, month, six months and year; under it a
   row per topic opens that topic's own history, which adds the day as a
   window and the topic's own metrics. The long view of weigh-ins, blood
   pressure and lab results stays on the History page, one row away. */

/** The line under a topic's name: its first metric, this week. */
function latest(id: (typeof TOPICS)[number]["id"]) {
  const metric = HISTORY[id].metrics[0]
  const week = averageOf(metric, "week")
  return week === null ? "No history yet" : `${figure(metric, metric.latest ?? week)} ${metric.unit}`.trim()
}

export function YourHistory() {
  return (
    <View style={styles.wrap}>
      <Text style={type.body}>{OVERALL.intro}</Text>
      <HistoryView history={OVERALL} overall />

      <Block title="History by topic" meta="six topics">
        <Group>
          {TOPICS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => router.push({ pathname: "/topic-history/[id]", params: { id: t.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${t.name} history, ${HISTORY[t.id].metrics[0].title}, ${latest(t.id)}`}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <TopicTile topic={t} size={32} />
              <View style={styles.fill}>
                <Text style={[type.title, { color: ink.strong }]}>{t.id === "medication" ? "Medication" : t.name}</Text>
                <Text style={type.label} numberOfLines={1}>
                  {HISTORY[t.id].metrics.filter((x) => x.chip).map((x) => x.chip).join(" · ")}
                </Text>
              </View>
              <Text style={[styles.latest, { color: TONE_INK.plain }]}>{latest(t.id)}</Text>
              <CaretRight size={14} color={card.chevron} />
            </Pressable>
          ))}
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
  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
  latest: { ...type.value, fontVariant: ["tabular-nums"] },
})
