import { BlurView } from "expo-blur"
import { router } from "expo-router"
import * as React from "react"
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { TourHost, useTourTarget } from "@/components/app-tour"
import { useDragBack } from "@/components/drag-back"
import { DarkStatusBar } from "@/components/error-state"
import {
  IconHome,
  IconPlan,
  IconResults,
  IconToDo,
  IconUpgrade,
  type TabIconProps,
} from "@/components/icons"
import { OrbButton, PageGround, PageHeader } from "@/components/hol"
import { useTopInset } from "@/components/ui"
import { useAllowance } from "@/lib/allowance"
import { upgradeTab, useExperience } from "@/lib/experience"
import { color, font, space } from "@/lib/theme"

/* The signed-in app's bottom navigation, from the Figma "Hol" file: a
   floating, see-through teal tinted pill (it blurs the page under it) with four Hugeicons tabs, outline at
   rest and filled when selected, and beside it the assistant's orb in a
   ring (OrbButton), which opens the assistant full screen. Each tab is its own
   stack screen (switched without animation), so the bar is drawn by the
   screen rather than by a tab navigator. Home stays at the bottom of the
   stack, so Back (the swipe) from any other tab returns home. */

export type TabName = "home" | "results" | "todo" | "plan"

const TABS: {
  name: TabName
  label: string
  href: "/" | "/results" | "/gaps" | "/plan"
  Icon: React.ComponentType<TabIconProps>
}[] = [
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

/** Room the scrolling list leaves for a pinned footer button at its end. */
const FOOTER_SPACE = 76

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
  footer,
  overlay,
  bare,
  headless,
  onRefresh,
  children,
}: {
  /** No tab bar: a back caret in the header instead. */
  bare?: boolean
  /** No header bar at all: the page starts under the status bar and keeps
      the tab bar, e.g. the plan while the doctor reviews it. */
  headless?: boolean
  /** Stays above the tab bar while the page scrolls beneath it, e.g. the
      Plan tab's "Build my personalized plan". */
  footer?: React.ReactNode
  /** Pull down to refresh: the page redoes what it shows (home's to-do). */
  onRefresh?: () => void | Promise<void>
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
  const { bottom } = useSafeAreaInsets()
  const top = useTopInset()
  const [refreshing, setRefreshing] = React.useState(false)
  const pull = async () => {
    setRefreshing(true)
    try {
      await onRefresh?.()
    } finally {
      setRefreshing(false)
    }
  }
  // Record, To do and Plan open over home with no animation; the left edge
  // swipe still drags them back to it.
  useDragBack("none", tab !== "home")
  // The bar sits in the home indicator's area, as iOS's own floating bars
  // do, 8 above the screen edge (more over a home indicator) and 8 under the
  // list, so the strip hugs the pill; the list ends clear of it.
  const barBottom = Math.max(bottom - 16, 8)
  const barSpace = barBottom + BAR
  return (
    <View style={styles.screen}>
      {/* On home, the first-run walk through dims all of this but one part. */}
      <TourHost active={tab === "home"}>
        <DarkStatusBar />
        {headless ? (
          <View style={{ height: top }} />
        ) : (
          <PageHeader
            back={!!bare}
            onBack={bare ? () => (router.canGoBack() ? router.back() : router.replace("/")) : undefined}
            title={title}
            right={headerRight}
            compact={!!header}
          >
            {header}
          </PageHeader>
        )}
        <View style={styles.fill}>
          <PageGround />
          {pinned && <View style={[styles.body, styles.pinned]}>{pinned}</View>}
          {/* The list runs the full height of the page, with no strip under
            it: it scrolls beneath the floating pill and orb, and its last
            card ends clear of them by the padding at its foot. */}
          <ScrollView
            contentContainerStyle={[
              styles.body,
              styles.content,
              !!pinned && styles.contentPinned,
              { paddingBottom: (bare ? bottom : barSpace) + space.inline + (footer ? FOOTER_SPACE : 0) },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={pull} /> : undefined}
          >
            {children}
          </ScrollView>
          {/* The footer floats at the foot of the list, right above the bar;
            the page scrolls beneath it and clears it at the end. */}
          {footer && (
            <View style={[styles.footer, { bottom: (bare ? bottom : barSpace) + space.inline }]} pointerEvents="box-none">
              {footer}
            </View>
          )}
          {!bare && <TabBar active={tab} bottom={barBottom} />}
        </View>
        {overlay}
      </TourHost>
    </View>
  )
}

/** The floating pill and the assistant orb, for a page of its own that
    keeps the tabs (e.g. "Your personalized plan is ready"). */
export function TabBar({ active, bottom }: { active: TabName; bottom: number }) {
  // The plan tab reads "Upgrade", with a crown, for everyone who has no
  // plan to follow yet (5 Oct call), a member in review included.
  const upgradeLabel = upgradeTab(useExperience())
  // The arc draws this week's AI credit used, as the chat's strip says it.
  const { share } = useAllowance()
  const tabsRef = useTourTarget("tabs")
  const orbRef = useTourTarget("assistant")
  return (
    <View style={[styles.bar, { bottom }]} pointerEvents="box-none">
      <View style={styles.barInner} pointerEvents="box-none">
        <View ref={tabsRef} style={styles.pill} accessibilityRole="tablist">
          <BlurView
            intensity={BLUR}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
          {TABS.map(({ name, label: tabLabel, href, Icon: TabIcon }) => {
            const on = name === active
            const upgrade = name === "plan" && upgradeLabel
            const label = upgrade ? "Upgrade" : tabLabel
            const Icon = upgrade ? IconUpgrade : TabIcon
            return (
              <Pressable
                key={name}
                onPress={() => !on && openTab(href, active)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={label}
                style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
              >
                <Icon
                  size={18}
                  color={on ? INK : REST}
                  active={on}
                  cut={color.primaryTint}
                />
                <Text
                  style={[styles.tabLabel, { color: on ? INK : REST }]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <View style={styles.orbColumn}>
          <View ref={orbRef} style={styles.orbWrap}>
            <BlurView
              intensity={BLUR}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
            <OrbButton used={share} onPress={() => router.push("/assistant")} />
          </View>
          {/* No words under the orb: a tooltip over it says "Ask AI" now and then. */}
          <OrbTooltip />
        </View>
      </View>
    </View>
  )
}

/** A small dark tooltip over the orb that fades in every 10 seconds, says
    "Ask AI" with a chatbot emoji and fades out again. It never takes a touch. */
function OrbTooltip() {
  const show = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => {
    const run = Animated.loop(
      Animated.sequence([
        Animated.delay(TIP_EVERY - TIP_FOR),
        Animated.timing(show, { toValue: 1, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: native }),
        Animated.delay(TIP_FOR - 500),
        Animated.timing(show, { toValue: 0, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: native }),
      ]),
    )
    run.start()
    return () => run.stop()
  }, [show])
  return (
    <Animated.View
      style={[
        styles.tip,
        {
          opacity: show,
          transform: [{ translateY: show.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }],
        },
      ]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={styles.tipText} numberOfLines={1}>
        🤖 Ask AI
      </Text>
      <View style={styles.tipArrow} />
    </Animated.View>
  )
}

const native = Platform.OS !== "web"
/** The tooltip comes every 10 seconds and stays for 3. */
const TIP_EVERY = 10000
const TIP_FOR = 3000

/** The bar's height, and how strongly it blurs what scrolls beneath it. */
export const BAR = 54
const BLUR = 40

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  fill: { flex: 1 },
  // The signed-in page gutter (16); the column stays 420 wide on a large
  // screen.
  body: {
    width: "100%",
    maxWidth: 420 + space.gutter * 2,
    alignSelf: "center",
    paddingHorizontal: space.gutter,
    gap: space.section,
  },
  pinned: { paddingTop: space.gutter, gap: space.item },
  footer: { position: "absolute", left: 0, right: 0, paddingHorizontal: space.gutter },
  content: { paddingTop: space.gutter, paddingBottom: space.gutter * 2 },
  contentPinned: { paddingTop: space.item },
  pressed: { opacity: 0.7 },

  // No footer of its own: the pill and the orb float over the page, 16 in
  // from its sides, each blurring what is under it.
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: space.gutter,
  },
  barInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
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
  orbColumn: { width: 52, height: 52 },
  // Sits over the orb with its right edge on the orb's, the arrow under the
  // orb's middle.
  tip: {
    position: "absolute",
    bottom: 58,
    right: 0,
    width: 76,
    maxWidth: 76,
    alignItems: "flex-end",
  },
  tipText: {
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: INK,
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: font.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  tipArrow: {
    marginRight: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: INK,
  },
  orbWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
  },
  tab: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  tabLabel: { fontFamily: font.medium, fontSize: 10.5, lineHeight: 13 },
})
