import { router } from "expo-router"
import * as React from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { DarkStatusBar } from "@/components/error-state"
import { IconHome, IconPlan, IconResults, IconToDo, type TabIconProps } from "@/components/icons"
import { useTopInset } from "@/components/ui"
import { SiriSheet } from "@/components/voiceorbs/siri-sheet"
import { color, font, space, type } from "@/lib/theme"

/* The signed-in app's bottom navigation, after Superpower: a floating white
   pill with four Hugeicons tabs, outline at rest and filled when selected,
   and beside it a white circle holding the assistant's orb (Siri Sheet), which
   opens the assistant full screen. Each tab is its own
   stack screen (switched without animation), so the bar is drawn by the
   screen rather than by a tab navigator. Home stays at the bottom of the
   stack, so Back (the swipe) from any other tab returns home. */

export type TabName = "home" | "results" | "todo" | "plan"

const TABS: { name: TabName; label: string; href: "/" | "/results" | "/gaps" | "/plan"; Icon: React.ComponentType<TabIconProps> }[] = [
  { name: "home", label: "Home", href: "/", Icon: IconHome },
  { name: "results", label: "Record", href: "/results", Icon: IconResults },
  { name: "todo", label: "To do", href: "/gaps", Icon: IconToDo },
  { name: "plan", label: "Plan", href: "/plan", Icon: IconPlan },
]

/** Opens a tab: home by going back to it, another tab over home, or in
    place of the tab that is open. */
export function openTab(href: (typeof TABS)[number]["href"], from: TabName) {
  if (href === "/") router.dismissTo("/")
  else if (from === "home") router.push(href)
  else router.replace(href)
}

const BAR = 60
const INK = "#18181A"
const REST = "#9A9EA6"

/** A tab's page on the cool ground: the title (or a header of its own,
    like home's greeting) and anything pinned beside it stay at the top
    while the content scrolls beneath, clear of the floating bar. */
export function TabScreen({
  tab,
  title,
  header,
  pinned,
  overlay,
  children,
}: {
  /** Drawn over everything, tab bar included, e.g. a detail panel. */
  overlay?: React.ReactNode
  tab: TabName
  title?: string
  header?: React.ReactNode
  /** Stays at the top with the title while the page scrolls, e.g. the
      Record tab's section tabs. */
  pinned?: React.ReactNode
  children: React.ReactNode
}) {
  const top = useTopInset()
  const { bottom } = useSafeAreaInsets()
  // Sits in the home indicator's area, as iOS's own floating bars do,
  // rather than stacked above it.
  const barBottom = Math.max(bottom - 12, 14)
  return (
    <View style={styles.screen}>
      <DarkStatusBar />
      <View style={[styles.body, styles.pinned, { paddingTop: top + 12 }]}>
        {header ?? (
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        )}
        {pinned}
      </View>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingTop: 8, paddingBottom: barBottom + BAR + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {/* Content fades out under the bar instead of showing through
          beneath it. */}
      <View style={[styles.fade, { height: barBottom + BAR + 28 }]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="tabFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color.page} stopOpacity={0} />
              <Stop offset="0.45" stopColor={color.page} stopOpacity={0.92} />
              <Stop offset="1" stopColor={color.page} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#tabFade)" />
        </Svg>
      </View>
      <TabBar active={tab} bottom={barBottom} />
      {overlay}
    </View>
  )
}

function TabBar({ active, bottom }: { active: TabName; bottom: number }) {
  return (
    <View style={[styles.bar, { bottom }]} pointerEvents="box-none">
      <View style={styles.pill} accessibilityRole="tablist">
        {TABS.map(({ name, label, href, Icon }) => {
          const on = name === active
          return (
            <Pressable
              key={name}
              onPress={() => !on && openTab(href, active)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={label}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              <Icon size={21} color={on ? INK : REST} active={on} cut={color.background} />
              <Text style={[styles.tabLabel, { color: on ? INK : REST }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <Pressable
        onPress={() => router.push("/assistant")}
        accessibilityRole="button"
        accessibilityLabel="Ask the assistant"
        style={({ pressed }) => [styles.assistant, pressed && styles.pressed]}
      >
        <SiriSheet size={BAR - 12} background={color.background} />
      </Pressable>
    </View>
  )
}

const lift = { borderWidth: 1, borderColor: "#EDEEEF", boxShadow: "0 8px 24px rgba(16, 24, 40, 0.08)" } as const

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.page },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0 },
  // The signed-in page gutter (Frontline 16); the column stays 420 wide on
  // a large screen.
  body: { width: "100%", maxWidth: 420 + space.gutter * 2, alignSelf: "center", paddingHorizontal: space.gutter, gap: 20 },
  pinned: { gap: 12, paddingBottom: 12, backgroundColor: color.page },
  // The screen title (Frontline H2).
  title: { ...type.tabTitle },
  pressed: { opacity: 0.7 },

  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    width: "100%",
    maxWidth: 420 + 21 * 2,
    alignSelf: "center",
    paddingHorizontal: 21,
  },
  pill: {
    flex: 1,
    height: BAR,
    borderRadius: BAR / 2,
    backgroundColor: color.background,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    ...lift,
  },
  tab: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center", gap: 3 },
  tabLabel: { fontFamily: font.medium, fontSize: 10.5, lineHeight: 13 },
  assistant: {
    width: BAR,
    height: BAR,
    borderRadius: BAR / 2,
    backgroundColor: color.background,
    alignItems: "center",
    justifyContent: "center",
    ...lift,
  },
})
