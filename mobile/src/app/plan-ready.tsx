import { router } from "expo-router"
import * as React from "react"
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { useReducedMotion } from "@/components/chat"
import { WASH, planName } from "@/components/enrollment-kit"
import { DarkStatusBar } from "@/components/error-state"
import { PageGround } from "@/components/hol"
import { CaretRight, Sparkle, Trophy } from "@/components/ph"
import { Card, Steps, type Step } from "@/components/record-kit"
import { BAR, TabBar } from "@/components/tab-bar"
import { Button, useTopInset } from "@/components/ui"
import { MEMBER } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { color, font, ink, space, type } from "@/lib/theme"

/* Her first plan is ready (Journey_7, after "Your plan is being
   reviewed"): shown once, the first time she opens the Plan tab after
   Dr. Patel sends version 1. A page of its own like "You're enrolled", no
   header bar, the tab bar kept, with a moment of its own: the trophy rises
   and settles with a small swing, sparkles twinkle round it and a soft
   halo keeps breathing; then the words, the steps and "View my plan" rise
   in turn (all still under Reduce Motion). "View my plan" goes back to
   the plan beneath, to read and accept or request a change. */

const native = Platform.OS !== "web"

/** The badge's size. */
const BADGE = 72

/** Where the sparkles sit round the badge, and their size. */
const SPARKS = [
  { x: -70, y: -34, size: 18 },
  { x: 66, y: -46, size: 14 },
  { x: 78, y: 22, size: 18 },
  { x: -60, y: 40, size: 12 },
  { x: -8, y: -70, size: 12 },
]

const dayLabel = (iso?: string) => new Date(iso ?? Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" })

export default function PlanReadyScreen() {
  const top = useTopInset()
  // The tab bar sits where every tab page draws it; the button rides above.
  const { bottom } = useSafeAreaInsets()
  const barBottom = Math.max(bottom - 8, 12)
  const onboarding = useOnboarding()
  const still = useReducedMotion()
  const [t] = React.useState(() => ({
    badge: new Animated.Value(0),
    swing: new Animated.Value(0),
    breathe: new Animated.Value(0),
    sparks: SPARKS.map(() => new Animated.Value(0)),
    rise: [0, 1, 2].map(() => new Animated.Value(0)),
  }))

  // Seen once: the Plan tab won't open it again.
  React.useEffect(() => {
    if (onboarding.loaded && !onboarding.planReadySeen) onboarding.save({ planReadySeen: true })
  }, [onboarding])

  React.useEffect(() => {
    if (still) {
      ;[t.badge, t.swing, ...t.rise].forEach((v) => v.setValue(1))
      t.sparks.forEach((v) => v.setValue(0.6))
      return
    }
    const ease = Easing.inOut(Easing.sin)
    const run = Animated.parallel([
      Animated.sequence([
        Animated.spring(t.badge, { toValue: 1, friction: 6, tension: 70, useNativeDriver: native }),
        Animated.timing(t.swing, { toValue: 1, duration: 900, easing: Easing.out(Easing.elastic(1.4)), useNativeDriver: native }),
      ]),
      Animated.stagger(
        90,
        t.rise.map((v) => Animated.timing(v, { toValue: 1, duration: 420, delay: 420, easing: Easing.out(Easing.cubic), useNativeDriver: native }))
      ),
    ])
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(t.breathe, { toValue: 1, duration: 1600, easing: ease, useNativeDriver: native }),
        Animated.timing(t.breathe, { toValue: 0, duration: 1600, easing: ease, useNativeDriver: native }),
      ])
    )
    const twinkle = Animated.stagger(
      260,
      t.sparks.map((v) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: 700, easing: ease, useNativeDriver: native }),
            Animated.timing(v, { toValue: 0, duration: 900, easing: ease, useNativeDriver: native }),
            Animated.delay(500),
          ])
        )
      )
    )
    run.start()
    breathe.start()
    twinkle.start()
    return () => {
      run.stop()
      breathe.stop()
      twinkle.stop()
    }
  }, [still, t])

  const steps: Step[] = [
    { label: "Built from your results", date: dayLabel(onboarding.membership?.startedAt), state: "done" },
    { label: `Reviewed by ${MEMBER.doctorShort}`, date: dayLabel(), state: "done" },
    { label: "Read your plan", date: "Accept it or request a change", state: "now" },
    { label: "Your plan starts", date: "Once you accept it", state: "next" },
  ]

  const rise = (i: number) => ({
    opacity: t.rise[i],
    transform: [{ translateY: t.rise[i].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  })

  return (
    <View style={styles.screen}>
      <DarkStatusBar />
      <PageGround />
      <Svg style={styles.wash} pointerEvents="none">
        <Defs>
          <LinearGradient id="readyWash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={WASH.from} stopOpacity={1} />
            <Stop offset="1" stopColor={WASH.from} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#readyWash)" />
      </Svg>
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: top + space.section }]} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={styles.stage} accessible={false}>
            <Animated.View
              style={[
                styles.glow,
                {
                  opacity: Animated.multiply(t.badge, t.breathe.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.9] })),
                  transform: [{ scale: t.breathe.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.12] }) }],
                },
              ]}
            />
            {SPARKS.map((p, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.spark,
                  {
                    opacity: Animated.multiply(t.badge, t.sparks[i]),
                    transform: [
                      { translateX: p.x },
                      { translateY: p.y },
                      { scale: t.sparks[i].interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                      { rotate: t.sparks[i].interpolate({ inputRange: [0, 1], outputRange: ["-20deg", "20deg"] }) },
                    ],
                  },
                ]}
              >
                <Sparkle size={p.size} color={i % 2 ? color.primaryLine : color.amber} weight="fill" />
              </Animated.View>
            ))}
            <Animated.View
              style={[
                styles.halo,
                {
                  opacity: t.badge,
                  transform: [
                    { translateY: t.badge.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                    { scale: t.badge.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                    { rotate: t.swing.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: ["0deg", "-10deg", "6deg", "0deg"] }) },
                  ],
                },
              ]}
            >
              <View style={styles.badge}>
                <Trophy size={34} color={color.onPrimary} weight="fill" />
              </View>
            </Animated.View>
          </View>

          <Animated.View style={[styles.words, rise(0)]}>
            <Text style={styles.title} accessibilityRole="header">
              {"Your personalized plan is\u00A0ready"}
            </Text>
            <Text style={styles.lead}>{`${MEMBER.doctorShort} reviewed your results and approved your plan.`}</Text>
            <View style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {planName(onboarding.goals)}
              </Text>
            </View>
          </Animated.View>
        </View>

        <Animated.View style={rise(1)}>
          <Card style={styles.card}>
            <Text style={type.section} accessibilityRole="header">
              What happens next
            </Text>
            <Steps steps={steps} />
          </Card>
        </Animated.View>
      </ScrollView>
      <Animated.View style={[styles.footer, { paddingBottom: barBottom + BAR + space.item }, rise(2)]}>
        <Button
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/plan"))}
          trailing={({ color: c }) => <CaretRight size={16} weight="bold" color={c} />}
        >
          View my plan
        </Button>
      </Animated.View>
      <TabBar active="plan" bottom={barBottom} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // The teal wash behind the top of the page, fading into the ground.
  // An SVG is a replaced element: left/right alone don't stretch it on web
  // (it falls back to ~300px, washing only the left side), so give it a width.
  wash: { position: "absolute", top: 0, left: 0, right: 0, width: "100%", height: "55%" },
  // Centred in the space above the button; scrolls on a short phone.
  body: { flexGrow: 1, justifyContent: "center", paddingHorizontal: space.gutter, paddingBottom: space.section, gap: space.item },
  // "View my plan", right above the tab bar.
  footer: { paddingHorizontal: space.gutter },
  head: { alignItems: "center", gap: space.item },
  stage: { width: BADGE * 2.4, height: BADGE * 2, alignItems: "center", justifyContent: "center" },
  // The breathing halo behind the badge.
  glow: { position: "absolute", width: BADGE * 1.7, height: BADGE * 1.7, borderRadius: BADGE * 0.85, backgroundColor: color.primarySoft },
  spark: { position: "absolute" },
  halo: {
    width: BADGE + 20,
    height: BADGE + 20,
    borderRadius: (BADGE + 20) / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.primarySoft,
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.primary,
  },
  words: { alignItems: "center", gap: space.inline },
  title: { fontFamily: font.semibold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4, color: ink.strong, textAlign: "center" },
  lead: { ...type.body, textAlign: "center", paddingHorizontal: space.item },
  card: { gap: space.item },
  chip: {
    marginTop: space.inline,
    paddingHorizontal: space.item,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: color.background,
    borderWidth: 1,
    borderColor: color.primaryEdge,
  },
  chipText: { ...type.label, color: color.primaryText },
})
