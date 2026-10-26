import { router } from "expo-router"
import * as React from "react"
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { useReducedMotion } from "@/components/chat"
import { WASH, planName } from "@/components/enrollment-kit"
import { DarkStatusBar } from "@/components/error-state"
import { PageFooter, PageGround } from "@/components/hol"
import { Check, CaretRight } from "@/components/ph"
import { Card, Steps, TextAction, type Step } from "@/components/record-kit"
import { Button, useTopInset } from "@/components/ui"
import { MEMBER } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { startingTestsLine } from "@/lib/todo"
import { priceLabel } from "@/lib/plans"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* After the plan set-up's last step (Journey_7 screen 7, "Four steps,
   then the plan"): the membership has started. She leaves the purchase
   knowing what happens next, in what order, and who does it; her
   physician's review is named before it happens. A page of its own, no
   header bar and no tab bar. It opens on a moment: the teal tick pops in,
   two rings and a ring of dots spread from it, then the words, the steps
   and the buttons rise in turn (all still under Reduce Motion). The steps
   are the kit's track: enrolled done today, her physician sorting the
   tests into insurance or Inlay now (26 Oct 2026), then scheduling, the
   rest to come. "See my tests" opens that sorting (/your-tests); once it
   is in, "Schedule my tests" opens the day and time for each Inlay test
   (/schedule-tests); "Confirm schedule" there then opens the
   confirmation (/schedule-confirmed), which leads on to the flourishing
   questions. "Schedule later" leaves them in To do, brought up
   every other day, and opens the same health profile and flourishing
   questions (/health-profile). Either way she walks on to her plan with
   Dr. Patel (/plan?walk=1), which this build approves after a moment, so the
   set-up plays through to "Your personalized plan is ready". The
   payment and its receipt were confirmed in a popup just before. */

const native = Platform.OS !== "web"

/** The badge's size, and how far the dots fly from its centre. */
const BADGE = 72
const BURST = 64
const DOTS = 8

const dayLabel = (iso?: string) =>
  new Date(iso ?? Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" })

export default function EnrolledScreen() {
  const top = useTopInset()
  const onboarding = useOnboarding()
  const still = useReducedMotion()
  const [t] = React.useState(() => ({
    badge: new Animated.Value(0),
    tick: new Animated.Value(0),
    ring: new Animated.Value(0),
    burst: new Animated.Value(0),
    rise: [0, 1, 2].map(() => new Animated.Value(0)),
  }))

  React.useEffect(() => {
    const all = [t.badge, t.tick, t.ring, t.burst, ...t.rise]
    if (still) return all.forEach((v) => v.setValue(1))
    const run = Animated.parallel([
      Animated.sequence([
        Animated.spring(t.badge, { toValue: 1, friction: 5, tension: 120, useNativeDriver: native }),
        Animated.spring(t.tick, { toValue: 1, friction: 4, tension: 160, useNativeDriver: native }),
      ]),
      Animated.sequence([
        Animated.delay(220),
        Animated.parallel([
          Animated.timing(t.ring, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
          Animated.timing(t.burst, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: native }),
        ]),
      ]),
      Animated.stagger(
        90,
        t.rise.map((v) => Animated.timing(v, { toValue: 1, duration: 420, delay: 380, easing: Easing.out(Easing.cubic), useNativeDriver: native })),
      ),
    ])
    run.start()
    return () => run.stop()
  }, [still, t])

  const membership = onboarding.membership
  // Scheduled on the step before, the first test's day; left for later,
  // To do with its reminders.
  const tests = startingTestsLine(onboarding)
  // Her physician sorts the tests into insurance or Inlay before any is
  // booked (/your-tests).
  const sorted = !!onboarding.testReview
  const steps: Step[] = [
    { label: "Enrolled in Inlay", date: dayLabel(membership?.startedAt), state: "done" },
    { label: `${MEMBER.doctorShort} checks your tests`, date: sorted ? "Insurance or Inlay, done" : "Insurance or Inlay, within 2 days", state: sorted ? "done" : "now" },
    tests.booked
      ? { label: "Complete your scheduled tests", date: tests.line, state: "now" }
      : { label: "Schedule your tests", date: sorted ? tests.line : "Only the ones booked through Inlay", state: sorted ? "now" : "next" },
    { label: `${MEMBER.doctorShort} reviews your personalized plan`, date: "Once your results are in", state: "next" },
    { label: "Your plan is ready", date: "We let you know right away", state: "next" },
  ]

  // The secret button: a tap on the tick skips the physician's wait and
  // opens her tests already sorted (/your-tests?now=1), for demos.
  const reviewed = () => router.push("/your-tests?now=1")

  const viewPlan = () => router.replace("/plan?walk=1")

  // The schedule comes first; the assistant's chat opens only once she
  // confirms it (app/schedule-tests.tsx).
  const schedule = () => router.push(sorted ? "/schedule-tests" : "/your-tests")

  // Left for later: the tests wait in To do, brought up every other day.
  // The flourishing questions still follow, as after a confirmed schedule.
  async function later() {
    const paid = onboarding.startingTests
    if (paid) await onboarding.save({ startingTests: { ...paid, laterAt: new Date().toISOString() } })
    router.replace("/health-profile")
  }

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
            <LinearGradient id="enrolledWash" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={WASH.from} stopOpacity={1} />
              <Stop offset="1" stopColor={WASH.from} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#enrolledWash)" />
        </Svg>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: top + space.section }]} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={styles.stage} accessible={false}>
            {[0, 1].map((n) => (
              <Animated.View
                key={n}
                style={[
                  styles.ring,
                  {
                    opacity: t.ring.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, n ? 0.35 : 0.55, 0] }),
                    transform: [{ scale: t.ring.interpolate({ inputRange: [0, 1], outputRange: [1, n ? 2.1 : 1.6] }) }],
                  },
                ]}
              />
            ))}
            {Array.from({ length: DOTS }, (_, i) => {
              const a = (i / DOTS) * Math.PI * 2 - Math.PI / 2
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.dot,
                    i % 2 ? styles.dotSoft : null,
                    {
                      opacity: t.burst.interpolate({ inputRange: [0, 0.2, 0.75, 1], outputRange: [0, 1, 1, 0] }),
                      transform: [
                        { translateX: t.burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * BURST] }) },
                        { translateY: t.burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * BURST] }) },
                        { scale: t.burst.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                      ],
                    },
                  ]}
                />
              )
            })}
            <Pressable onPress={reviewed} accessible={false}>
              <Animated.View style={[styles.halo, { opacity: t.badge, transform: [{ scale: t.badge }] }]}>
                <View style={styles.badge}>
                  <Animated.View style={{ opacity: t.tick, transform: [{ scale: t.tick.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }}>
                    <Check size={34} color={color.onPrimary} weight="bold" />
                  </Animated.View>
                </View>
              </Animated.View>
            </Pressable>
          </View>

          <Animated.View style={[styles.words, rise(0)]}>
            <Text style={styles.title} accessibilityRole="header">
              You're enrolled
            </Text>
            <Text style={styles.lead}>Thank you for joining Inlay. Your next step is your baseline testing.</Text>
            <View style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>{`${planName(onboarding.goals)}, ${priceLabel(membership?.billing)}`}</Text>
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[styles.cards, rise(1)]}>
          <Card style={styles.card}>
            <Text style={type.section} accessibilityRole="header">
              What happens next
            </Text>
            <Steps steps={steps} />
          </Card>
        </Animated.View>
      </ScrollView>
      <Animated.View style={rise(2)}>
        <PageFooter style={styles.footer}>
          {/* Booked already (back from the schedule): on to her plan. */}
          {tests.booked ? (
            <Button onPress={viewPlan} trailing={({ color: c }) => <CaretRight size={16} weight="bold" color={c} />}>
              View my plan
            </Button>
          ) : (
            <>
              <Button onPress={schedule} trailing={({ color: c }) => <CaretRight size={16} weight="bold" color={c} />}>
                {sorted ? "Schedule my tests" : "See my tests"}
              </Button>
              <View style={styles.later}>
                <TextAction tone="muted" onPress={() => void later()}>
                  Schedule later
                </TextAction>
              </View>
            </>
          )}
        </PageFooter>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // The teal wash behind the top of the page, fading into the ground.
  // The Svg fills this box explicitly: left alone it keeps the 300px
  // default width on web, tinting only the left side of a wider screen.
  wash: { position: "absolute", top: 0, left: 0, right: 0, height: "55%" },
  washSvg: { width: "100%", height: "100%" },
  // Centred in the space above the button; scrolls on a short phone.
  body: { flexGrow: 1, justifyContent: "center", paddingHorizontal: space.gutter, paddingBottom: space.section, gap: space.item },
  footer: { backgroundColor: "transparent", borderTopWidth: 0, paddingTop: 0 },
  later: { alignItems: "center", paddingTop: space.stack },
  head: { alignItems: "center", gap: space.item },
  stage: { width: BADGE * 2, height: BADGE * 1.7, alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute",
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    borderWidth: 2,
    borderColor: color.primaryLine,
  },
  dot: { position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: color.primary },
  dotSoft: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.primaryHalo },
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

  cards: { gap: space.item },
  card: { gap: space.item },
  // The help line under the card, filling the space above the button.
  rule: { height: 1, backgroundColor: hairline.rule },
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
