import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { CalendarBlank, CaretRight, Check, Info, Lightbulb } from "@/components/ph"
import { Block, Group, Rise, Tag } from "@/components/record-kit"
import { TONE_INK, TopicTile } from "@/components/topic-kit"
import { TabScreen, openTab } from "@/components/tab-bar"
import { useOnboarding } from "@/lib/onboarding"
import { CARE_TODAY, TODAY_INSIGHT, TOPICS, doneCount, rowOf, type Topic } from "@/lib/topics"
import { card, color, ink, space, type } from "@/lib/theme"

/* The plan's Today tab (Journey_14 screen 30, "Six topics, every plan"):
   the landing screen is a fixed list, not a bespoke one. Every optimization
   plan instantiates the same six topics (Exercise, Eat, Sleep, Mind,
   Medication and Measure), so days stay comparable and a new programme
   lands in an existing row; what changes patient to patient is the target
   on each line and which programme paid for it (the chip beside the name).
   State is shown honestly: done, partial, short, not started. A topic she
   has answered turns to done here. Tapping a row opens that topic, and
   every topic opens the same four ways to answer it. The note above says
   when the plan moved by itself, and Care says what is due there. This
   replaces the day strip, rings, exercise card and meal list that the tab
   held until 22 Oct 2026; a finished day is read on the Plan tab's Review. */

const WEEKDAY_DATE = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })

const CHIP: Record<Topic["tagTone"], "high" | "soon" | "ok" | "muted"> = { red: "high", amber: "soon", green: "ok", grey: "muted" }

export function PlanToday() {
  const s = useOnboarding()
  const now = new Date()
  const done = doneCount(s)

  return (
    <TabScreen
      tab="today"
      header={
        <View style={styles.header}>
          <Text style={styles.plan} accessibilityRole="header">
            Your Personalized Plan
          </Text>
          <Text style={type.label}>Healthier today. A stronger tomorrow.</Text>
        </View>
      }
    >
      <Rise at={1} id="today:head">
        <View style={styles.head}>
          <View style={styles.fill}>
            <Text style={styles.title} accessibilityRole="header">
              Today
            </Text>
            <Text style={type.label}>{WEEKDAY_DATE.format(now)}</Text>
          </View>
          <View style={styles.count} accessible accessibilityLabel={`${done} of ${TOPICS.length} done`}>
            <Text style={styles.countText}>{`${done} of ${TOPICS.length} done`}</Text>
          </View>
        </View>
      </Rise>

      <Rise at={2} id="today:note">
        <View style={styles.note}>
          <Lightbulb size={16} color={color.primary} />
          <Text style={[type.body, styles.fill]}>{TODAY_INSIGHT}</Text>
        </View>
      </Rise>

      <Rise at={3} id="today:goals">
        <Block title="Today's goals" meta="six every day">
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
                  <View style={styles.fill}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{t.id === "medication" ? "Medication" : t.name}</Text>
                      <Tag tone={CHIP[t.tagTone]}>{t.tag.toUpperCase()}</Tag>
                    </View>
                    <Text style={type.label} numberOfLines={2}>
                      {t.target}
                    </Text>
                  </View>
                  <View style={styles.end}>
                    <View style={styles.figure}>
                      {row.done && row.tone === "good" && <Check size={12} weight="bold" color={ink.good} />}
                      <Text style={[styles.figureText, { color: TONE_INK[row.tone] }]}>{row.text}</Text>
                    </View>
                    <Text style={[type.meta, styles.note2]} numberOfLines={2}>
                      {row.note}
                    </Text>
                  </View>
                  <CaretRight size={14} color={card.chevron} />
                </Pressable>
              )
            })}
          </Group>
        </Block>
      </Rise>

      <Rise at={4} id="today:care">
        <Pressable onPress={() => openTab("/gaps", "today")} accessibilityRole="button" style={({ pressed }) => [styles.care, pressed && styles.pressed]}>
          <CalendarBlank size={16} color={color.amber} />
          <View style={styles.fill}>
            <Text style={styles.careTitle}>{CARE_TODAY.title}</Text>
            <Text style={type.label}>{CARE_TODAY.next}</Text>
          </View>
        </Pressable>
      </Rise>

      <View style={styles.foot}>
        <Info size={14} color={ink.tertiary} />
        <Text style={[type.meta, styles.fill]}>Tap any goal to answer it four ways: do it as written, do part of it, ask for an easier version, or upload what you already follow.</Text>
      </View>
    </TabScreen>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },

  header: { flex: 1, alignItems: "flex-end", gap: 2 },
  plan: { ...type.section, color: ink.primary },

  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item },
  title: { ...type.hero, fontSize: 24, lineHeight: 32 },
  count: { paddingHorizontal: space.item, paddingVertical: 6, borderRadius: 999, backgroundColor: color.primarySoft, borderWidth: 1, borderColor: color.primaryEdge },
  countText: { ...type.metaStrong, color: ink.primary },
  note: { flexDirection: "row", gap: space.lead, padding: space.card, borderRadius: 8, backgroundColor: color.primarySoft },

  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.inline },
  name: { ...type.title, color: ink.strong },
  end: { alignItems: "flex-end", maxWidth: 104, gap: 2 },
  figure: { flexDirection: "row", alignItems: "center", gap: 3 },
  figureText: { ...type.value, fontVariant: ["tabular-nums"] },
  note2: { textAlign: "right" },

  care: { flexDirection: "row", alignItems: "center", gap: space.lead, padding: space.card, borderRadius: 8, backgroundColor: color.amberTint, borderWidth: 1, borderColor: color.amberEdge },
  careTitle: { ...type.title, color: ink.strong },
  foot: { flexDirection: "row", alignItems: "flex-start", gap: space.inline },
})
