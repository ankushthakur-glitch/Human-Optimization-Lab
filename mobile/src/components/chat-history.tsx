import * as React from "react"
import { Animated, Easing, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { PrimaryButton } from "@/components/hol"
import { CalendarBlank, CaretLeft, CaretRight, ChatText, ClipboardText, Flask, Heartbeat, Pill } from "@/components/ph"
import { relativeDay, rowDate } from "@/lib/dates"
import type { ChatCategory, ChatTopic, PastChat } from "@/lib/onboarding"
import { card, color, font, hairline, ink, space, type } from "@/lib/theme"

/* The assistant's chat history, as a drawer from the left (the ChatGPT
   app's pattern, in the Hol language): white, 82% of the screen over a
   30% black scrim. Recent: the three newest conversations. Categories:
   every conversation grouped by the category chosen before it started; a
   group opens its chats in place, with a back caret to the categories.
   "New chat" at the foot goes back to choosing a category. */

export type ChatGroup = { topic: ChatTopic; name: string; Icon: typeof Pill }

/** The built in categories, in order, with their names and icons. General
    health questions take anything ad hoc ("Which hospital is best for
    thyroid cancer?"). */
export const CHAT_GROUPS: ChatGroup[] = [
  { topic: "other", name: "General health questions", Icon: Heartbeat },
  { topic: "result", name: "Lab results", Icon: Flask },
  { topic: "medicine", name: "Medicines", Icon: Pill },
  { topic: "visit", name: "Visits", Icon: CalendarBlank },
  { topic: "plan", name: "Your plan", Icon: ClipboardText },
]

/** Every category: the built in ones, then the ones she made. */
export const chatGroups = (custom: ChatCategory[] = []): ChatGroup[] => [...CHAT_GROUPS, ...custom.map((c) => ({ topic: c.id, name: c.name, Icon: ChatText }))]

const SLIDE_MS = 260
const native = Platform.OS !== "web"

/** The day a chat was last used: "Today", "Yesterday", or "Sep 18". */
export function dayOf(c: PastChat) {
  const d = new Date(c.lastAt ?? c.startedAt)
  const rel = relativeDay(d)
  return rel === "Today" || rel === "Yesterday" ? rel : rowDate(d)
}

export function ChatHistory({
  open,
  chats,
  categories,
  currentId,
  onClose,
  onOpen,
  onNew,
}: {
  open: boolean
  /** Every conversation, the current one too; sorted here, newest first. */
  chats: PastChat[]
  /** The categories she made. */
  categories?: ChatCategory[]
  /** The conversation on screen: tapping it just closes the drawer. */
  currentId?: string
  onClose: () => void
  onOpen: (id: string) => void
  onNew: () => void
}) {
  const { width } = useWindowDimensions()
  const { top, bottom } = useSafeAreaInsets()
  const drawer = Math.min(Math.round(width * 0.82), 360)
  const t = React.useRef(new Animated.Value(open ? 1 : 0)).current
  const [shown, setShown] = React.useState(open)
  const [group, setGroup] = React.useState<ChatTopic | undefined>()

  React.useEffect(() => {
    if (open) setShown(true)
    const run = Animated.timing(t, { toValue: open ? 1 : 0, duration: SLIDE_MS, easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.quad), useNativeDriver: native })
    run.start(({ finished }) => {
      if (finished && !open) {
        setShown(false)
        setGroup(undefined)
      }
    })
    return () => run.stop()
  }, [open, t])

  // A swipe to the left closes it, as the drawer it imitates.
  const pan = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dx < -12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) => t.setValue(Math.max(0, Math.min(1, 1 + g.dx / drawer))),
        onPanResponderRelease: (_, g) => {
          if (g.dx < -drawer / 3 || g.vx < -0.5) onClose()
          else Animated.timing(t, { toValue: 1, duration: 160, useNativeDriver: native }).start()
        },
      }),
    [t, drawer, onClose]
  )

  const sorted = React.useMemo(
    () => [...chats].sort((a, b) => Date.parse(b.lastAt ?? b.startedAt) - Date.parse(a.lastAt ?? a.startedAt)),
    [chats]
  )
  const groups = chatGroups(categories)
    .map((g) => ({ ...g, chats: sorted.filter((c) => c.topic === g.topic) }))
    .filter((g) => g.chats.length)
  const opened = group ? groups.find((g) => g.topic === group) : undefined

  if (!shown) return null

  const pick = (id: string) => (id === currentId ? onClose() : onOpen(id))
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [-drawer, 0] })

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? "auto" : "none"}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: t }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close chats" />
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        style={[styles.drawer, { width: drawer, paddingTop: top + 16, paddingBottom: Math.max(bottom, space.gutter), transform: [{ translateX }] }]}
        accessibilityViewIsModal
      >
        <View style={styles.head}>
          {opened && (
            <Pressable onPress={() => setGroup(undefined)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to categories" style={({ pressed }) => pressed && styles.pressed}>
              <CaretLeft size={24} color={ink.detail} />
            </Pressable>
          )}
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {opened ? opened.name : "Chats"}
          </Text>
        </View>

        <ScrollView style={styles.fill} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {opened ? (
            <ChatList chats={opened.chats} currentId={currentId} onPick={pick} />
          ) : sorted.length ? (
            <>
              <View style={styles.section}>
                <Text style={styles.label}>Recent</Text>
                <ChatList chats={sorted.slice(0, 3)} currentId={currentId} onPick={pick} />
              </View>
              <View style={styles.section}>
                <Text style={styles.label}>Categories</Text>
                <View>
                  {groups.map((g, i) => (
                    <Pressable
                      key={g.topic}
                      onPress={() => setGroup(g.topic)}
                      accessibilityRole="button"
                      accessibilityLabel={`${g.name}, ${g.chats.length} ${g.chats.length === 1 ? "chat" : "chats"}`}
                      style={({ pressed }) => [styles.row, i > 0 && styles.rule, pressed && styles.pressed]}
                    >
                      <View style={styles.tile}>
                        <g.Icon size={16} color={color.primary} />
                      </View>
                      <Text style={[styles.rowTitle, styles.fill]} numberOfLines={1}>
                        {g.name}
                      </Text>
                      <View style={styles.count}>
                        <Text style={styles.countText}>{g.chats.length}</Text>
                      </View>
                      <CaretRight size={16} color={card.chevron} />
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.empty}>Your chats will show here.</Text>
          )}
        </ScrollView>

        <View style={styles.foot}>
          <PrimaryButton onPress={onNew}>New chat</PrimaryButton>
        </View>
      </Animated.View>
    </View>
  )
}

/** Chats as rows: the title on one line, the day under it, ruled apart. */
function ChatList({ chats, currentId, onPick }: { chats: PastChat[]; currentId?: string; onPick: (id: string) => void }) {
  return (
    <View>
      {chats.map((c, i) => (
        <Pressable
          key={c.id}
          onPress={() => onPick(c.id)}
          accessibilityRole="button"
          accessibilityState={{ selected: c.id === currentId }}
          style={({ pressed }) => [styles.chat, i > 0 && styles.rule, pressed && styles.pressed]}
        >
          <Text style={styles.rowTitle} numberOfLines={1}>
            {c.title}
          </Text>
          <Text style={styles.date}>{c.id === currentId ? "Current chat" : dayOf(c)}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pressed: { opacity: 0.7 },
  scrim: { backgroundColor: "rgba(0, 0, 0, 0.3)" },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: color.background,
    borderRightWidth: 1,
    borderRightColor: hairline.edge,
  },
  head: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingHorizontal: space.gutter, paddingBottom: 16 },
  // Four levels (text hierarchy): the drawer's title 20 semibold, a
  // section label 12 medium grey, a chat's title 14 medium dark, its day
  // 12 regular quiet.
  title: { ...type.hero, flex: 1 },
  body: { paddingHorizontal: space.gutter, paddingBottom: space.section, gap: space.section + 4 },
  section: { gap: space.mark },
  label: { ...type.label, fontFamily: font.medium },
  chat: { paddingVertical: space.rowY, gap: space.line },
  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  rowTitle: { ...type.title, color: ink.strong },
  date: { ...type.meta },
  tile: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.primaryTint, alignItems: "center", justifyContent: "center" },
  count: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: hairline.rule, alignItems: "center", justifyContent: "center" },
  countText: { ...type.captionStrong, color: ink.secondary },
  empty: { ...type.body, color: ink.secondary },
  foot: { paddingHorizontal: space.gutter, paddingTop: space.item },
})
