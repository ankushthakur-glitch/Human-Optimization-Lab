import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { Barbell, Camera, ChartLine, Check, ClipboardText, MagnifyingGlass, Sparkle, Target, Trophy } from "@/components/ph"
import { Block, Group, NeedsRow } from "@/components/record-kit"
import { TopicIcon, TOPIC_HUE, useV14Member } from "@/components/v14-kit"
import { color, space } from "@/lib/theme"
import { TOPICS } from "@/lib/v14"

/* The index of the v14 dummy (23 Oct 2026): every screen of the client's
   Journey_14 short deck (screens 28 to 54), rebuilt from our kit so it can
   be opened beside the current member app and compared. Grouped in the
   order a member meets them; each row names its deck screen. */

type Row = { title: string; meta: string; to: string; icon: React.ReactNode }

const go = (to: string) => () => router.push(to as never)

const TOPIC_DECK: Record<string, string> = { exercise: "31", eat: "33", sleep: "34", mind: "35", medication: "36", measure: "37 and 38" }
const HISTORY_DECK: Record<string, string> = { exercise: "42", eat: "43", sleep: "44", mind: "45", medication: "46", measure: "47" }

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: "After the tests",
    rows: [
      { title: "All your tests are in", meta: "Screen 28", to: "/v14/tests-in", icon: <Check size={16} color={color.primary} /> },
      { title: "Set your starting point", meta: "Screen 29", to: "/v14/starting-point", icon: <Target size={16} color={color.primary} /> },
    ],
  },
  {
    title: "Plan tab",
    rows: [
      { title: "Today", meta: "Screen 30", to: "/plan?section=today", icon: <ClipboardText size={16} color={color.primary} /> },
      { title: "Yesterday, scored", meta: "Screen 39", to: "/v14/review", icon: <Trophy size={16} color={color.primary} /> },
      { title: "Yesterday in numbers", meta: "Screen 40", to: "/v14/numbers", icon: <ChartLine size={16} color={color.primary} /> },
      { title: "History", meta: "Screen 41", to: "/v14/history/all", icon: <ChartLine size={16} color={color.primary} /> },
      { title: "Progress", meta: "Screen 48", to: "/plan?section=progress", icon: <ChartLine size={16} color={color.primary} /> },
      { title: "Photo check in", meta: "Screen 49", to: "/v14/photos", icon: <Camera size={16} color={color.primary} /> },
      { title: "Outlook", meta: "Screen 50", to: "/plan?section=outlook", icon: <Target size={16} color={color.primary} /> },
      { title: "Ask Inlay, where this goes", meta: "Screen 51", to: "/v14/ask", icon: <Sparkle size={16} color={color.primary} /> },
    ],
  },
  {
    title: "Today's topics",
    rows: [
      ...TOPICS.map((t) => ({ title: t.name, meta: `Screen ${TOPIC_DECK[t.id]}`, to: `/v14/topic/${t.id}`, icon: <TopicIcon id={t.id} /> })),
      { title: "Goblet squat, how to do it", meta: "Screen 32", to: "/v14/move/goblet-squat", icon: <Barbell size={16} color={color.primary} /> },
    ],
  },
  {
    title: "Topic history",
    rows: TOPICS.map((t) => ({ title: `${t.name} history`, meta: `Screen ${HISTORY_DECK[t.id]}`, to: `/v14/history/${t.id}`, icon: <TopicIcon id={t.id} /> })),
  },
  {
    title: "Care",
    rows: [
      { title: "Catalog", meta: "Screen 52", to: "/care", icon: <MagnifyingGlass size={16} color={color.primary} /> },
      { title: "Multi cancer blood screening", meta: "Screen 53", to: "/v14/care/galleri", icon: <ClipboardText size={16} color={color.primary} /> },
      { title: "Book your draw", meta: "Screen 54", to: "/v14/book/galleri", icon: <ClipboardText size={16} color={color.primary} /> },
    ],
  },
]

export default function V14Index() {
  useV14Member()
  return (
    <FlowScreen page title="Paid app v14 preview" description="Dummy screens from the client's Journey_14 deck, to compare with the current app.">
      <View style={styles.list}>
        {GROUPS.map((g) => (
          <Block key={g.title} title={g.title}>
            <Group>
              {g.rows.map((r) => {
                const topic = TOPICS.find((t) => r.to.endsWith(`/${t.id}`))
                return <NeedsRow key={r.to} icon={r.icon} hue={topic ? TOPIC_HUE[topic.id] : "teal"} title={r.title} meta={r.meta} onPress={go(r.to)} />
              })}
            </Group>
          </Block>
        ))}
      </View>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  list: { gap: space.section },
})
