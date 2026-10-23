import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { CalendarBlank, CaretRight, Pill } from "@/components/ph"
import { Block, Card, Group, NeedsRow, ProgressBar, SmallAction } from "@/components/record-kit"
import { PlanNote, StateTag, TopicTile } from "@/components/v14-kit"
import { color, hairline, space, type } from "@/lib/theme"
import { ADAPTED, PATIENT, TOPICS, doneToday, yesterdayScore, type Topic } from "@/lib/v14"

/* Today (Journey_14 screen 30): the six topics every plan has, in the same
   order every day, so days stay comparable and a new programme lands in a
   row that already exists. Two changes from the deck: the one thing worth
   doing next leads the page as its single action (the evening metformin,
   since a missed evening dose cost yesterday half its medication score),
   and yesterday's score sits above the list as a door to its review rather
   than living only under History. */

export function PlanTodaySection() {
  return (
    <View style={styles.page}>
      <View style={styles.head}>
        <View style={styles.headRow}>
          <Text style={type.hero}>Today</Text>
          <Text style={type.metaStrong}>{`${doneToday} of ${TOPICS.length} done`}</Text>
        </View>
        <Text style={type.label}>{`${PATIENT.weekday}, ${PATIENT.today}`}</Text>
        <ProgressBar done={doneToday} total={TOPICS.length} />
      </View>

      <Block title="Next up">
        <Card style={styles.next} onPress={() => router.push("/v14/topic/medication" as never)} accessibilityLabel="Next up: evening metformin at 7 pm. Mark it taken.">
          <View style={styles.nextIcon}>
            <Pill size={20} color={color.primary} weight="bold" />
          </View>
          <View style={styles.grow}>
            <Text style={type.section}>Evening metformin, 7 pm</Text>
            <Text style={type.label}>Missed last night, so a reminder is set</Text>
          </View>
          <SmallAction onPress={() => router.push("/v14/topic/medication" as never)}>Mark taken</SmallAction>
        </Card>
      </Block>

      <PlanNote>{`${ADAPTED} The plan moved, you did not have to ask.`}</PlanNote>

      <Block title="Today's goals" meta="Same six every day">
        <Group>
          {TOPICS.map((t) => (
            <TopicRow key={t.id} topic={t} />
          ))}
        </Group>
      </Block>

      <Block title="Yesterday">
        <Card onPress={() => router.push("/v14/review" as never)} style={styles.yesterday} accessibilityLabel={`Yesterday scored ${yesterdayScore} of 100. See the review.`}>
          <Text style={type.display}>{yesterdayScore}</Text>
          <View style={styles.grow}>
            <Text style={type.title}>Yesterday scored {yesterdayScore} of 100</Text>
            <Text style={type.label}>Four of six at target. Sleep and the evening dose cost you.</Text>
          </View>
          <CaretRight size={14} color={hairline.outline} />
        </Card>
      </Block>

      <Group>
        <NeedsRow
          icon={<CalendarBlank size={16} color={color.primary} />}
          title="Nothing due in Care today"
          meta="Next: DEXA re-scan, Fri Oct 9 at 8:15 am"
          onPress={() => router.push("/care")}
        />
      </Group>
    </View>
  )
}

/** One of the six: what it is, which programme asked for it, today's
    target, and where it stands, with the device it came from. */
function TopicRow({ topic: t }: { topic: Topic }) {
  return (
    <Pressable
      onPress={() => router.push(`/v14/topic/${t.id}` as never)}
      accessibilityRole="button"
      accessibilityLabel={`${t.name}, ${t.programme}. ${t.target}. ${t.status}.`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <TopicTile id={t.id} />
      {/* One job per line: the name and where it stands, the target,
          today's figure, then which programme asked for it and the device
          the figure came from, quietest last. */}
      <View style={styles.grow}>
        <View style={styles.titleRow}>
          <Text style={[type.title, styles.grow]}>{t.name}</Text>
          <StateTag state={t.state} />
        </View>
        <Text style={type.label} numberOfLines={2}>
          {t.target}
        </Text>
        <Text style={type.value}>{t.status}</Text>
        <Text style={type.meta}>{t.source ? `${t.programme}, from your ${t.source}` : t.programme}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  page: { gap: space.section },
  head: { gap: space.stack },
  headRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  grow: { flex: 1, minWidth: 0, gap: space.line },
  next: { flexDirection: "row", alignItems: "center", gap: space.lead, borderWidth: 1, borderColor: color.primaryEdge, backgroundColor: color.primaryTint },
  nextIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.background, alignItems: "center", justifyContent: "center" },
  yesterday: { flexDirection: "row", alignItems: "center", gap: space.lead },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.lead, paddingVertical: space.rowY, paddingHorizontal: space.rowX },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.mark },
  pressed: { opacity: 0.7 },
})
