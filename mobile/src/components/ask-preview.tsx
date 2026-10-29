import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { CategoryPicker } from "@/components/chat-categories"
import { CHAT_GROUPS, ChatHistory } from "@/components/chat-history"
import { PageGround, PageHeader } from "@/components/hol"
import type { ChatCategory, PastChat } from "@/lib/onboarding"
import { color } from "@/lib/theme"

/* A review view of Ask Inlay's opening (29 Oct 2026), reached without a
   live plan: "Choose a category" under the header, and the history drawer
   with sample chats in every built in category and one she made, so each
   group shows. /choose-category opens on the picker, /chat-history with
   the drawer open. Nothing is saved; a category or chat tapped does
   nothing more. */

const DAY = 24 * 60 * 60 * 1000
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString()

const SAMPLE: Record<string, string[]> = {
  other: ["Which hospital is best for thyroid care?", "Is a sauna safe after a workout?"],
  result: ["Why is my LDL going up?", "What does a high ferritin mean?", "Is my vitamin D low?"],
  medicine: ["Can I take metformin with coffee?", "Side effects of atorvastatin"],
  visit: ["What to ask at my cardiology visit", "Notes from my visit with Dr. Patel"],
  plan: ["How do I hit my protein goal?", "Can I swap today's walk for a swim?"],
  sleep: ["Why do I wake up at 3 AM?"],
}

const CATEGORIES: ChatCategory[] = [{ id: "sleep", name: "Sleep" }]

const CHATS: PastChat[] = [...CHAT_GROUPS.map((g) => g.topic), ...CATEGORIES.map((c) => c.id)].flatMap((topic, g) =>
  (SAMPLE[topic] ?? []).map((title, i) => ({ id: `${topic}-${i}`, title, topic, startedAt: ago(g + i * 3), messages: [] }))
)

export function AskPreview({ drawer }: { drawer: boolean }) {
  const [open, setOpen] = React.useState(drawer)
  return (
    <View style={styles.screen}>
      <PageGround />
      <PageHeader title="Ask Inlay" action={{ label: "History", onPress: () => setOpen(true) }} />
      <CategoryPicker chats={CHATS} categories={CATEGORIES} planLive onStart={() => {}} onCreate={(name) => ({ ...CHAT_GROUPS[0], topic: name, name })} />
      <ChatHistory
        open={open}
        chats={CHATS}
        categories={CATEGORIES}
        onClose={() => setOpen(false)}
        onOpen={() => setOpen(false)}
        onNew={() => (router.canGoBack() ? router.back() : setOpen(false))}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.page },
})
