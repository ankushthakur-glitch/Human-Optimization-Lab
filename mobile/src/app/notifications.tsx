import { router, type Href } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { Block, Card, EmptyState, HUE, TextAction } from "@/components/record-kit"
import { clockOf, dateOfAt, shortDay } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { color, space, type } from "@/lib/theme"
import { noticesFor, type Notice } from "@/lib/todo"

/* What Inlay has told her, by day (FINAL-SPEC C.13): her record coming
   together, Dr. Patel's review, new results, care reminders and, for a
   member, her plan and her booked tests. A card she has not opened is
   tinted, with a teal dot before its title; once opened it turns white.
   Every card opens what it is about and marks it read; "Mark all as read"
   clears the bell at once and turns into "All read" in its place. Reading
   never moves anything: the heading keeps its height and a card keeps its
   size. In the app only: a push, a text or an email never carries a
   health detail or an offer (F-106, F-109). */

const DAYS: Notice["day"][] = ["Today", "Yesterday", "Earlier"]

/** When it arrived: the time inside today and yesterday, the day before
    that ("Sep 29"), with the year when it was another year. */
function whenOf(n: Notice, now: Date) {
  if (n.day !== "Earlier") return clockOf(n.at)
  const d = dateOfAt(n.at)
  return d.getFullYear() === now.getFullYear() ? shortDay(d) : `${shortDay(d)}, ${d.getFullYear()}`
}

/** The last two words held together, so a wrapped title or line never
    leaves one word alone ("your record", "age 45." move down as a pair). */
const keepLastPair = (text: string) => text.replace(/ (\S+)$/, (_, last: string) => `\u00A0${last}`)

/** One notification: tinted with a dot while unread, white once opened.
    The dot keeps its own column, so titles line up whether read or not. */
function NoticeCard({ n, read, when, onPress }: { n: Notice; read: boolean; when: string; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={[styles.card, !read && styles.unread]}>
      <View style={styles.mark}>{!read && <View style={styles.dot} accessibilityLabel="Unread" />}</View>
      <View style={styles.body}>
        <View style={styles.head}>
          <Text style={read ? styles.titleRead : styles.title} numberOfLines={2}>
            {keepLastPair(n.title)}
          </Text>
          <Text style={styles.when} maxFontSizeMultiplier={1.3}>
            {when}
          </Text>
        </View>
        <Text style={styles.text} numberOfLines={3}>
          {keepLastPair(n.body)}
        </Text>
      </View>
    </Card>
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

  // The first heading's right side: the action while anything is unread,
  // then "All read" in the same place and height, so nothing under it moves.
  const readAll = (
    <View style={styles.readAll}>
      {unread > 0 ? <TextAction onPress={markAll}>Mark all as read</TextAction> : <Text style={styles.allRead}>All read</Text>}
    </View>
  )

  return (
    <FlowScreen page title="Notifications">
      {groups.map((g, i) => (
        <Block key={g.day} title={g.day} action={i === 0 ? readAll : undefined}>
          <View style={styles.list}>
            {g.list.map((n) => (
              <NoticeCard key={n.id} n={n} read={seen.has(n.id)} when={whenOf(n, now)} onPress={() => open(n)} />
            ))}
          </View>
        </Block>
      ))}
    </FlowScreen>
  )
}

/** The unread dot (FINAL-SPEC C.13: 6 pt, teal). */
const DOT = 6

/** The kit's TextAction is a 32 pt target; "All read" keeps its height. */
const TEXT_ACTION = 32

/** How far down a line of `size` sits to centre on the first line of a
    title set in `title`. */
const firstLine = (title: { lineHeight: number }, size: number) => (title.lineHeight - size) / 2

const styles = StyleSheet.create({
  list: { gap: space.item },
  // "Mark all as read", or "All read" once nothing is unread, at the same
  // height and the same right edge.
  readAll: { minHeight: TEXT_ACTION, justifyContent: "center", alignItems: "flex-end" },
  allRead: { ...type.meta },
  // The kit's card, with a column for the unread dot on the left, a flat
  // card's padding in from the edge (Frontline 12).
  card: { flexDirection: "row", gap: space.inline, paddingLeft: space.compact },
  unread: { backgroundColor: color.primaryTint, borderColor: HUE.teal.edge },
  // The dot centres on the title's first line.
  mark: { width: DOT, paddingTop: firstLine(type.title, DOT) },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: color.primary },
  // Frontline's notification card: 4 between the title and its lines.
  body: { flex: 1, gap: space.stack },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.item },
  title: { ...type.title, flex: 1 },
  // Read, the title drops to the body's weight but keeps the title's line,
  // so a card keeps its height when it is read.
  titleRead: { ...type.body, lineHeight: type.title.lineHeight, flex: 1 },
  // The time centres on the title's first line, read or not.
  when: { ...type.meta, marginTop: firstLine(type.title, type.meta.lineHeight), fontVariant: ["tabular-nums"] },
  text: { ...type.label },
})
