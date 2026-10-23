import { router } from "expo-router"
import * as React from "react"
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, View } from "react-native"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { useReducedMotion } from "@/components/chat"
import { WASH } from "@/components/enrollment-kit"
import { DarkStatusBar } from "@/components/error-state"
import { PageFooter, PageGround } from "@/components/hol"
import { CaretRight, Check } from "@/components/ph"
import { Card, Tile, type Hue } from "@/components/record-kit"
import { TopicIcon } from "@/components/topic-kit"
import { Button, useTopInset } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { FINDINGS } from "@/lib/topics"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* All tests complete (Journey_14 screen 28), after the four baseline tests
   are in: shown once, the first time she opens the Plan tab after her plan
   is built. It replaces the two old plan-ready screens: one page says the
   testing is finished and shows what it turned up, rather than announcing
   that a plan has been sent and then asking for an acceptance that already
   happened at payment. Five findings, led by the one that paid for itself
   (moderate sleep apnoea at AHI 18, the $299 sleep study), and the last of
   them from what she told us, which no test would have found. Stated once
   at the foot: the plan is already running. "View my plan" goes on to the
   starting point (/starting-point), where she sets day one's zero.
   Drawn like "Your tests are scheduled": no header bar, the teal wash, a
   badge that pops in, then the words, the findings card and the button
   rising in turn (all still under Reduce Motion). */

const native = Platform.OS !== "web"

const BADGE = 72

/** Each finding's tile, by what it is about. */
const HUE_OF: Record<string, Hue> = { sleep: "violet", measure: "teal", eat: "amber", medication: "blue", mind: "green" }

export default function PlanReadyScreen() {
  const top = useTopInset()
  const onboarding = useOnboarding()
  const still = useReducedMotion()
  const [t] = React.useState(() => ({
    badge: new Animated.Value(0),
    rise: [0, 1, 2].map(() => new Animated.Value(0)),
  }))

  // Seen once: the Plan tab won't open it again.
  React.useEffect(() => {
    if (onboarding.loaded && !onboarding.planReadySeen) onboarding.save({ planReadySeen: true })
  }, [onboarding])

  React.useEffect(() => {
    if (still) return [t.badge, ...t.rise].forEach((v) => v.setValue(1))
    const run = Animated.parallel([
      Animated.spring(t.badge, { toValue: 1, friction: 5, tension: 120, useNativeDriver: native }),
      Animated.stagger(
        90,
        t.rise.map((v) => Animated.timing(v, { toValue: 1, duration: 420, delay: 300, easing: Easing.out(Easing.cubic), useNativeDriver: native })),
      ),
    ])
    run.start()
    return () => run.stop()
  }, [still, t])

  const rise = (i: number) => ({
    opacity: t.rise[i],
    transform: [{ translateY: t.rise[i].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  })

  return (
    <View style={styles.screen}>
      <DarkStatusBar />
      <PageGround />
      <View style={styles.wash} pointerEvents="none">
        <Svg width="100%" height="100%" preserveAspectRatio="none" style={styles.washSvg}>
          <Defs>
            <LinearGradient id="completeWash" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={WASH.from} stopOpacity={1} />
              <Stop offset="1" stopColor={WASH.from} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#completeWash)" />
        </Svg>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: top + space.section }]} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Animated.View style={[styles.halo, { opacity: t.badge, transform: [{ scale: t.badge }] }]}>
            <View style={styles.badge}>
              <Check size={34} weight="bold" color={color.onPrimary} />
            </View>
          </Animated.View>
          <Animated.View style={[styles.words, rise(0)]}>
            <Text style={styles.title} accessibilityRole="header">
              Congratulations
            </Text>
            <Text style={styles.lead}>All four tests are in. Everything you ordered is complete, and your plan has been built from it.</Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.stack, rise(1)]}>
          <Card style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={type.section} accessibilityRole="header">
                What they found
              </Text>
              <Text style={type.meta}>{`${FINDINGS.length} findings`}</Text>
            </View>
            {FINDINGS.map((f, i) => (
              <View key={f.title} style={[styles.row, styles.rule]} accessible accessibilityLabel={`${f.title}. ${f.sub}`}>
                <Tile hue={HUE_OF[f.icon]} size={36}>
                  <TopicIcon name={f.icon} color={f.bad ? "#A95413" : undefined} />
                </Tile>
                <View style={styles.fill}>
                  <Text style={[styles.finding, i === 0 && styles.lead1]}>{f.title}</Text>
                  <Text style={type.label}>{f.sub}</Text>
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>
      </ScrollView>
      <Animated.View style={rise(2)}>
        <PageFooter style={styles.footer}>
          <Button onPress={() => router.push("/starting-point")} trailing={({ color: c }) => <CaretRight size={16} weight="bold" color={c} />}>
            View my plan
          </Button>
        </PageFooter>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  wash: { position: "absolute", top: 0, left: 0, right: 0, height: "55%" },
  washSvg: { width: "100%", height: "100%" },
  body: { flexGrow: 1, justifyContent: "center", paddingHorizontal: space.gutter, paddingBottom: space.section, gap: space.item },
  footer: { backgroundColor: "transparent", borderTopWidth: 0, paddingTop: 0 },
  fill: { flex: 1, minWidth: 0 },
  head: { alignItems: "center", gap: space.item },
  halo: { width: BADGE + 20, height: BADGE + 20, borderRadius: (BADGE + 20) / 2, alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },
  badge: { width: BADGE, height: BADGE, borderRadius: BADGE / 2, alignItems: "center", justifyContent: "center", backgroundColor: color.primary },
  words: { alignItems: "center", gap: space.inline },
  title: { fontFamily: font.semibold, fontSize: 26, lineHeight: 34, letterSpacing: -0.4, color: ink.strong, textAlign: "center" },
  lead: { ...type.body, textAlign: "center", paddingHorizontal: space.item },
  stack: { gap: space.item },
  card: { gap: space.item },
  cardHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  row: { flexDirection: "row", alignItems: "center", gap: space.item },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule, paddingTop: space.item },
  finding: { ...type.title, color: ink.strong },
  lead1: { color: "#A95413" },
})
