import { router } from "expo-router"
import * as React from "react"
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { DarkStatusBar } from "@/components/error-state"
import { IconCareTeam, IconHome, IconPlan, IconResults } from "@/components/icons"
import { useTopInset } from "@/components/ui"
import { color, font, gutter } from "@/lib/theme"

/* The signed-in app's bottom navigation, after Superpower: a floating white
   pill with four filled tabs, and beside it a white circle holding only the
   brand mark, which opens the assistant full screen. Each tab is its own
   stack screen (switched without animation), so the bar is drawn by the
   screen rather than by a tab navigator. */

const MARK = require("../../assets/splash-icon.png")

export type TabName = "home" | "results" | "plan" | "care-team"

const TABS: { name: TabName; label: string; href: "/" | "/results" | "/plan" | "/care-team"; Icon: React.ComponentType<{ color: string; size?: number }> }[] = [
  { name: "home", label: "Home", href: "/", Icon: IconHome },
  { name: "results", label: "Results", href: "/results", Icon: IconResults },
  { name: "plan", label: "Plan", href: "/plan", Icon: IconPlan },
  { name: "care-team", label: "Care team", href: "/care-team", Icon: IconCareTeam },
]

const BAR = 62
const INK = "#18181A"
const REST = "#9A9EA6"

/** A tab's page: the scrolling content, clear of the floating bar. */
export function TabScreen({ tab, title, children }: { tab: TabName; title?: string; children: React.ReactNode }) {
  const top = useTopInset()
  const { bottom } = useSafeAreaInsets()
  const barBottom = Math.max(bottom, 12) + 4
  return (
    <View style={styles.screen}>
      <DarkStatusBar />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingTop: top + 16, paddingBottom: barBottom + BAR + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {title && (
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        )}
        {children}
      </ScrollView>
      <TabBar active={tab} bottom={barBottom} />
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
              onPress={() => !on && router.replace(href)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={label}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              <Icon size={20} color={on ? INK : REST} />
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
        <Image source={MARK} style={styles.mark} resizeMode="contain" />
      </Pressable>
    </View>
  )
}

const lift = { borderWidth: 1, borderColor: "#EDEEEF", boxShadow: "0 8px 24px rgba(16, 24, 40, 0.08)" } as const

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  body: { width: "100%", maxWidth: 420 + gutter * 2, alignSelf: "center", paddingHorizontal: gutter, gap: 28 },
  title: { fontFamily: font.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: color.text },
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
  tabLabel: { fontFamily: font.medium, fontSize: 11, lineHeight: 14 },
  assistant: {
    width: BAR,
    height: BAR,
    borderRadius: BAR / 2,
    backgroundColor: color.background,
    alignItems: "center",
    justifyContent: "center",
    ...lift,
  },
  mark: { width: 30, height: 30 },
})
