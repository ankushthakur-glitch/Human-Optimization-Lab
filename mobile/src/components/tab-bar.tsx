import { BlurView } from "expo-blur"
import { router } from "expo-router"
import * as React from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useDragBack } from "@/components/drag-back"
import { DarkStatusBar } from "@/components/error-state"
import { IconHome, IconPlan, IconResults, IconToDo, type TabIconProps } from "@/components/icons"
import { OrbButton, PageGround, PageHeader } from "@/components/hol"
import { useAllowance } from "@/lib/allowance"
import { color, font, space } from "@/lib/theme"

/* The signed-in app's bottom navigation, from the Figma "Hol" file: a
   floating, see-through teal tinted pill (it blurs the page under it) with four Hugeicons tabs, outline at
   rest and filled when selected, and beside it the assistant's orb in a
   ring (OrbButton), which opens the assistant full screen. Each tab is its own
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

const INK = "#18181A"
const REST = "#818181"

/** A tab's page (Figma "Hol", 5 Oct 2026): the white header bar with the
    tab's title (or a header of its own, like home's greeting), anything
    pinned under it, and the content scrolling on the page gradient right
    down under the tab bar, which floats with no background of its own:
    the pill and the orb blur what passes beneath them (user, 5 Oct). */
export function TabScreen({
  tab,
  title,
  header,
  headerRight,
  pinned,
  overlay,
  children,
}: {
  /** Drawn over everything, tab bar included, e.g. a detail panel. */
  overlay?: React.ReactNode
  tab: TabName
  title?: string
  /** Replaces the title row inside the header bar, e.g. home's greeting. */
  header?: React.ReactNode
  /** On the right of the title, e.g. "Add to your record". */
  headerRight?: React.ReactNode
  /** Stays at the top under the header while the page scrolls, e.g. the
      Record tab's section tabs. */
  pinned?: React.ReactNode
  children: React.ReactNode
}) {
  const allowance = useAllowance()
  const { bottom } = useSafeAreaInsets()
  // Record, To do and Plan open over home with no animation; the left edge
  // swipe still drags them back to it.
  useDragBack("none", tab !== "home")
  // The bar sits in the home indicator's area, as iOS's own floating bars
  // do; the content keeps clear of it when scrolled to the end.
  const barBottom = Math.max(bottom - 8, 12)
  const barSpace = barBottom + BAR
  return (
    <View style={styles.screen}>
      <DarkStatusBar />
      <PageHeader back={false} title={title} right={headerRight} compact={!!header}>
        {header}
      </PageHeader>
      <View style={styles.fill}>
        <PageGround />
        {pinned && <View style={[styles.body, styles.pinned]}>{pinned}</View>}
        <ScrollView
          contentContainerStyle={[styles.body, styles.content, !!pinned && styles.contentPinned, { paddingBottom: barSpace + space.gutter }]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        <TabBar active={tab} bottom={barBottom} used={allowance.member || !allowance.total ? 0 : allowance.used / allowance.total} />
      </View>
      {overlay}
    </View>
  )
}

function TabBar({ active, used, bottom }: { active: TabName; used: number; bottom: number }) {
  return (
    <View style={[styles.bar, { bottom }]} pointerEvents="box-none">
      <View style={styles.barInner} pointerEvents="box-none">
        <View style={styles.pill} accessibilityRole="tablist">
          <BlurView intensity={BLUR} tint="light" style={StyleSheet.absoluteFill} />
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
                <Icon size={18} color={on ? INK : REST} active={on} cut={color.primaryTint} />
                <Text style={[styles.tabLabel, { color: on ? INK : REST }]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <View style={styles.orbWrap}>
          <BlurView intensity={BLUR} tint="light" style={StyleSheet.absoluteFill} />
          <OrbButton used={used} onPress={() => router.push("/assistant")} />
        </View>
      </View>
    </View>
  )
}

/** The bar's height, and how strongly it blurs what scrolls beneath it. */
const BAR = 54
const BLUR = 40

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  fill: { flex: 1 },
  // The signed-in page gutter (16); the column stays 420 wide on a large
  // screen.
  body: { width: "100%", maxWidth: 420 + space.gutter * 2, alignSelf: "center", paddingHorizontal: space.gutter, gap: space.section },
  pinned: { paddingTop: space.gutter, gap: space.item },
  content: { paddingTop: space.gutter, paddingBottom: space.gutter * 2 },
  contentPinned: { paddingTop: space.item },
  pressed: { opacity: 0.7 },

  // No footer of its own: the pill and the orb float over the page, 16 in
  // from its sides, each blurring what is under it.
  bar: { position: "absolute", left: 0, right: 0, paddingHorizontal: space.gutter },
  barInner: { flexDirection: "row", alignItems: "center", gap: 6, width: "100%", maxWidth: 420, alignSelf: "center" },
  pill: {
    flex: 1,
    height: 54,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(230, 243, 242, 0.9)",
    // The tint at about half, so the blur shows through it.
    backgroundColor: "rgba(242, 247, 247, 0.55)",
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
  },
  orbWrap: { width: 52, height: 52, borderRadius: 26, overflow: "hidden", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)" },
  tab: { flex: 1, height: 52, alignItems: "center", justifyContent: "center", gap: 3 },
  tabLabel: { fontFamily: font.medium, fontSize: 10.5, lineHeight: 13 },
})
