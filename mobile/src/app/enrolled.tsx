import { router } from "expo-router"
import * as React from "react"
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, View } from "react-native"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { useReducedMotion } from "@/components/chat"
import { WASH } from "@/components/enrollment-kit"
import { DarkStatusBar } from "@/components/error-state"
import { PageFooter, PageGround } from "@/components/hol"
import { Check, CaretRight, Info } from "@/components/ph"
import { TextAction } from "@/components/record-kit"
import { Button, useTopInset } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { startingTestsLine } from "@/lib/todo"
import { dueToday, usd } from "@/lib/upgrade"
import { chart, color, font, hairline, ink, space, type } from "@/lib/theme"

/* After the plan set-up's last step (Journey_7 screen 7, "Four steps,
   then the plan"): the membership has started. She leaves the purchase
   knowing what happens next and in what order. A page of its own, no
   header bar and no tab bar. It opens on a moment: the teal tick pops in,
   two rings and a ring of dots spread from it, then the words, the steps
   and the buttons rise in turn (all still under Reduce Motion). The steps
   are the kit's track: enrolled done today, scheduling the tests now,
   the plan ready next. Nothing goes to her physician for review (27 Oct
   2026). "Schedule my tests" opens the day and time for each test
   (/schedule-tests); "Confirm schedule" there then opens the
   confirmation (/schedule-confirmed), which leads on to the flourishing
   questions. "Schedule later" leaves them in To do, brought up
   every other day, and opens the same health profile and flourishing
   questions (/health-profile). Either way she walks on to her plan
   (/plan?walk=1), live from the moment she enrolled. The
   payment and its receipt were confirmed in a popup just before. */

const native = Platform.OS !== "web"

/** The badge's size, and how far the dots fly from its centre. */
const BADGE = 72
const BURST = 64
const DOTS = 8

const fullDay = (iso?: string) =>
  new Date(iso ?? Date.now()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

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
  const billing = membership?.billing ?? onboarding.billingPick ?? "yearly"
  const cost = dueToday(onboarding.removedOpps, billing)
  const testingTotal = cost.total - cost.membership
  // The four steps (client deck, screen 28): enrolled and paid is done, and
  // the only one the patient owns, scheduling, is marked as next.
  const steps = [
    { label: "Enrolled and paid", sub: `${fullDay(membership?.startedAt)} · ${billing} plan`, done: true },
    tests.booked
      ? { label: "Complete your scheduled tests", sub: tests.line }
      : { label: "Schedule your testing", sub: "Next — book whichever suits you first" },
    { label: "We send the order to Dr. Patel", sub: "In the background — nothing for you to chase" },
    { label: "Your plan is built from your results", sub: "Automatically, as soon as the results are in" },
  ]

  const viewPlan = () => router.replace("/plan?walk=1")

  // The schedule comes first; the assistant's chat opens only once she
  // confirms it (app/schedule-tests.tsx).
  const schedule = () => router.push("/schedule-tests")

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
            <Animated.View style={[styles.halo, { opacity: t.badge, transform: [{ scale: t.badge }] }]}>
              <View style={styles.badge}>
                <Animated.View style={{ opacity: t.tick, transform: [{ scale: t.tick.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }}>
                  <Check size={34} color={color.onPrimary} weight="bold" />
                </Animated.View>
              </View>
            </Animated.View>
          </View>

          <Animated.View style={[styles.words, rise(0)]}>
            <Text style={styles.title} accessibilityRole="header">
              You're enrolled
            </Text>
            <Text style={styles.lead}>
              {`Paid today, ${usd(cost.total)} — ${billing === "yearly" ? `${usd(cost.membership)} for the year` : `${usd(cost.membership)} for the first month`} plus ${usd(testingTotal)} of testing, in full. Here is what happens next.`}
            </Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.cards, rise(1)]}>
          <View style={styles.list}>
            {steps.map((st, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.rail}>
                  <View style={[styles.node, st.done && styles.nodeDone]}>
                    {st.done ? <Check size={11} color={color.onPrimary} weight="bold" /> : <Text style={styles.nodeText}>{i + 1}</Text>}
                  </View>
                  {i < steps.length - 1 && <View style={styles.line} />}
                </View>
                <View style={styles.stepWords}>
                  <Text style={styles.stepName}>{st.label}</Text>
                  <Text style={styles.stepSub}>{st.sub}</Text>
                </View>
              </View>
            ))}
          </View>
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
                Schedule my tests
              </Button>
              <View style={styles.later}>
                <TextAction tone="muted" onPress={() => void later()}>
                  Schedule later
                </TextAction>
                <View style={styles.note}>
                  <Info size={13} color={ink.tertiary} />
                  <Text style={styles.noteText}>Scheduling later keeps your testing at the top of your To do list.</Text>
                </View>
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
  list: { paddingHorizontal: space.inline },
  stepRow: { flexDirection: "row", gap: space.lead },
  rail: { alignItems: "center", width: 22 },
  node: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: hairline.outline, backgroundColor: color.background },
  nodeDone: { borderColor: chart.inRange, backgroundColor: chart.inRange },
  nodeText: { fontFamily: font.medium, fontSize: 11, lineHeight: 14, color: ink.secondary },
  line: { flex: 1, width: 1, minHeight: 18, marginVertical: 2, backgroundColor: hairline.outline },
  stepWords: { flex: 1, gap: 1, paddingBottom: space.item },
  stepName: { ...type.title, fontFamily: font.semibold, color: ink.strong },
  stepSub: { ...type.label, color: ink.secondary },
  note: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingTop: space.item, paddingHorizontal: space.gutter },
  noteText: { ...type.meta, flex: 1, textAlign: "center" },
})
