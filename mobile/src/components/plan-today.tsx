import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { CaretRight, Check } from "@/components/ph"
import { Block, Group, Rise, Tag } from "@/components/record-kit"
import { TONE_INK, TopicTile } from "@/components/topic-kit"
import { useOnboarding } from "@/lib/onboarding"
import { TOPICS, doneCount, rowOf, type Topic } from "@/lib/topics"
import { card, chart, color, hairline, ink, space, type } from "@/lib/theme"

/* The Plan screen's "Today" tab (Journey_14 screen 30, "Six topics, every
   plan"), the first of Today, Progress, History and Outlook. It was its own
   screen until 23 Oct 2026; it now lives inside Plan so all four read as one
   place. Every optimization plan instantiates the same six topics
   (Exercise, Eat, Sleep, Mind, Medication and Measure), so days stay
   comparable; what changes patient to patient is the target on each line and
   which programme paid for it (the chip beside the name). State is shown
   honestly: done, partial, short, not started. A topic she has answered
   turns to done here. Tapping a row opens that topic, and every topic opens
   the same four ways to answer it. Above the six: how many are done, the
   next thing due (one tap to mark a dose taken). */

const WEEKDAY_DATE = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })

const CHIP: Record<Topic["tagTone"], "high" | "soon" | "ok" | "muted"> = { red: "high", amber: "soon", green: "ok", grey: "muted" }

export function PlanToday() {
  const s = useOnboarding()
  const now = new Date()
  const done = doneCount(s)

  return (
    <View style={styles.wrap}>
      <Rise at={1} id="today:head">
        <View style={styles.head}>
          <View style={styles.headTop}>
            <View style={styles.fill}>
              <Text style={styles.title} accessibilityRole="header">
                Today
              </Text>
              <Text style={type.meta}>{WEEKDAY_DATE.format(now)}</Text>
            </View>
            <View style={styles.count} accessible accessibilityLabel={`${done} of ${TOPICS.length} done`}>
              <Text style={styles.countText}>{`${done} of ${TOPICS.length} done`}</Text>
            </View>
          </View>
          <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: TOPICS.length, now: done }}>
            <View style={[styles.fillBar, { width: `${Math.round((done / TOPICS.length) * 100)}%` }]} />
          </View>
        </View>
      </Rise>

      <Rise at={4} id="today:goals">
        <Block title="Today's goals" meta="Same six every day">
          <Group>
            {TOPICS.map((t) => {
              const row = rowOf(s, t)
              return (
                <Pressable
                  key={t.id}
                  onPress={() => router.push({ pathname: "/topic/[id]", params: { id: t.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.name}, ${t.target}. ${row.text}, ${row.note}`}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <TopicTile topic={t} />
                  <View style={styles.body}>
                    <View style={styles.top}>
                      <View style={styles.nameRow}>
                        <Text style={styles.name}>{t.id === "medication" ? "Medication" : t.name}</Text>
                        <Tag tone={CHIP[t.tagTone]}>{t.tag}</Tag>
                      </View>
                      <View style={styles.figure}>
                        {row.done && row.tone === "good" && <Check size={12} weight="bold" color={ink.good} />}
                        <Text style={[styles.figureText, { color: TONE_INK[row.tone] }]}>{row.text}</Text>
                      </View>
                    </View>
                    <Text style={type.meta}>{t.target}</Text>
                    <Text style={styles.note2}>{row.note}</Text>
                  </View>
                  <CaretRight size={14} color={card.chevron} />
                </Pressable>
              )
            })}
          </Group>
        </Block>
      </Rise>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.section },
  fill: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },

  head: { gap: 8 },
  headTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item },
  title: { ...type.section, fontSize: 17, lineHeight: 22 },
  count: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: color.primarySoft, borderWidth: 1, borderColor: color.primaryEdge },
  countText: { ...type.metaStrong, color: ink.primary },
  track: { height: 4, borderRadius: 2, backgroundColor: chart.track, overflow: "hidden" },
  fillBar: { height: 4, borderRadius: 2, backgroundColor: color.primary },



  // The tile at the top of the row, the words in one column beside it: the
  // name and the figure on one line, then the target and the note under,
  // each at the full width and free to wrap.
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.lead, paddingVertical: 16 },
  body: { flex: 1, minWidth: 0, gap: 4 },
  top: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.item },
  nameRow: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.inline },
  name: { ...type.title, color: ink.strong },
  figure: { flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 0 },
  figureText: { ...type.value, fontVariant: ["tabular-nums"] },
  note2: { ...type.meta, color: ink.tertiary },

})
