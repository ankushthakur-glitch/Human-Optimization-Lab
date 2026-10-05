import { router, type Href } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { EmptyState } from "@/components/record-kit"
import { clockOf, dateOfAt, shortDay } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { card, cardRadius, color, ink, space, type } from "@/lib/theme"
import { noticesFor, type Notice } from "@/lib/todo"

/* What Inlay has told her, by day (FINAL-SPEC C.13), drawn as the Figma
   "Hol" Notifications (5 Oct 2026): her record coming together, Dr.
   Patel's review, new results, care reminders and, for a member, her plan
   and her booked tests. A card she has not opened sits on the faint teal
   ground with a teal edge along its foot; once opened it turns into the
   page's white card. Every card opens what it is about and marks it read;
   "Mark all read" in the header clears the bell at once and leaves the
   header once nothing is unread. Reading never moves anything: a card
   keeps its size. In the app only: a push, a text or an email never
   carries a health detail or an offer (F-106, F-109). */

const DAYS: Notice["day"][] = ["Today", "Yesterday", "Earlier"]

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** A day group's label: "Today, 5 Oct 2026", "Yesterday, 4 Oct 2026",
    then "Earlier". */
function dayLabel(day: Notice["day"], now: Date) {
  if (day === "Earlier") return day
  const d = new Date(now)
  if (day === "Yesterday") d.setDate(d.getDate() - 1)
  return `${day}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** When it arrived: how long ago today ("21 min ago", "2 hr ago"), the
    time yesterday, the day before that ("Sep 29"), with the year when it
    was another year. */
function whenOf(n: Notice, now: Date) {
  const d = dateOfAt(n.at)
  if (n.day === "Today") {
    const minutes = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60000))
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes} min ago`
    return `${Math.floor(minutes / 60)} hr ago`
  }
  if (n.day === "Yesterday") return clockOf(n.at)
  return d.getFullYear() === now.getFullYear() ? shortDay(d) : `${shortDay(d)}, ${d.getFullYear()}`
}

/** The last two words held together, so a wrapped title or line never
    leaves one word alone ("your record", "age 45." move down as a pair). */
const keepLastPair = (text: string) => text.replace(/ (\S+)$/, (_, last: string) => ` ${last}`)

/** One notification: the faint teal card with its teal foot while unread,
    the page's white card once opened. */
function NoticeCard({ n, read, when, onPress }: { n: Notice; read: boolean; when: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${read ? "" : "Unread. "}${n.title}. ${n.body}. ${when}`}
      style={({ pressed }) => [styles.card, read ? styles.read : styles.unread, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <Text style={styles.title} numberOfLines={2}>
          {keepLastPair(n.title)}
        </Text>
        <Text style={read ? styles.whenRead : styles.when} maxFontSizeMultiplier={1.3}>
          {when}
        </Text>
      </View>
      <Text style={styles.text} numberOfLines={3}>
        {keepLastPair(n.body)}
      </Text>
    </Pressable>
  )
}

export default function NotificationsScreen() {
  const s = useOnboarding()
  const now = new Date()
  const notices = noticesFor(s, now)
  const seen = new Set(s.seen ?? [])
  const unread = notices.filter((n) => !seen.has(n.id)).length
  const groups = DAYS.map((day) => ({ day, list: notices.filter((n) => n.day === day) })).filter((g) => g.list.length)

  function open(n: Notice) {
    if (!seen.has(n.id)) s.save({ seen: [...(s.seen ?? []), n.id] }).catch(() => {})
    if (n.href) router.push(n.href as Href)
  }

  function markAll() {
    s.save({ seen: [...new Set([...(s.seen ?? []), ...notices.map((n) => n.id)])] }).catch(() => {})
  }

  if (!notices.length)
    return (
      <FlowScreen page title="Notifications">
        <EmptyState art="bell" artSize={96} title="No notifications yet" />
      </FlowScreen>
    )

  return (
    <FlowScreen page title="Notifications" action={unread > 0 ? { label: "Mark all read", onPress: markAll } : undefined}>
      {/* The groups sit 12 apart, closer than a page's sections. */}
      <View style={styles.groups}>
        {groups.map((g) => (
          <View key={g.day} style={styles.group}>
            <Text style={styles.day} accessibilityRole="header">
              {dayLabel(g.day, now)}
            </Text>
            <View style={styles.list}>
              {g.list.map((n) => (
                <NoticeCard key={n.id} n={n} read={seen.has(n.id)} when={whenOf(n, now)} onPress={() => open(n)} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </FlowScreen>
  )
}

/** Figma's HOL Primary/bg: the unread card's faint teal ground. */
const UNREAD_GROUND = "#F9FBFB"

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  groups: { gap: space.item },
  group: { gap: space.item },
  // The day: 12 medium in Grey/06.
  day: { ...type.metaStrong, color: card.chevron },
  list: { gap: space.inline },

  card: { padding: space.card, borderRadius: cardRadius, gap: space.line },
  unread: { backgroundColor: UNREAD_GROUND, borderBottomWidth: 1, borderBottomColor: color.primaryEdge },
  // Read, the page's card; the 1 pt foot stays as padding so the card keeps
  // its height.
  read: { backgroundColor: card.fill, boxShadow: card.shadow, paddingBottom: space.card + 1 },

  head: { flexDirection: "row", alignItems: "center", gap: space.line },
  title: { flex: 1, ...type.title },
  when: { ...type.label, color: ink.detail, fontVariant: ["tabular-nums"] },
  whenRead: { ...type.caption, color: card.chevron, fontVariant: ["tabular-nums"] },
  text: { ...type.label },
})
