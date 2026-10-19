import { router } from "expo-router"
import * as React from "react"
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, View } from "react-native"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { useReducedMotion } from "@/components/chat"
import { WASH } from "@/components/enrollment-kit"
import { DarkStatusBar } from "@/components/error-state"
import { PageFooter, PageGround } from "@/components/hol"
import { Bone, CalendarCheck, CaretRight, Drop, MapPin, Wind } from "@/components/ph"
import { Card, CheckLine, HUE, TextAction, Tile } from "@/components/record-kit"
import { Button, useTopInset } from "@/components/ui"
import { BASELINE_TESTS, TEST_SLOTS, chosenTests, type BaselineTestId } from "@/lib/baseline-tests"
import { MEMBER } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* "Your tests are scheduled": opens from "Confirm schedule" on
   /schedule-tests, in place of the health questions that used to open
   straight away. Same page as "You're enrolled" (/enrolled): no header bar,
   no tab bar, the teal wash, a badge that pops in, then the words, the card
   and the buttons rising in turn (all still under Reduce Motion).
   The card lists each booked test with its day, time and place. Under it
   the assistant's offer, with its two buttons:
     "Start conversation" opens "Tell us about you" (/health-profile),
       whose Confirm opens the health questions (/complete-profile), the
       assistant's chat, which saves every answer and whose last answer
       walks on to her plan (/plan?walk=1);
     "Chat later" skips them for now and walks on to her plan the same way.
       The questions stay open: she can start them from the plan, and
       nothing is lost. Either button replaces this page, so back never
       returns to a confirmed schedule. */

const native = Platform.OS !== "web"

const BADGE = 72

const MARK: Record<BaselineTestId, React.ComponentType<{ size?: number; color?: string }>> = {
  panel: Drop,
  dexa: Bone,
  rmr: Wind,
}

export default function ScheduleConfirmedScreen() {
  const top = useTopInset()
  const onboarding = useOnboarding()
  const still = useReducedMotion()
  const [t] = React.useState(() => ({
    badge: new Animated.Value(0),
    rise: [0, 1, 2].map(() => new Animated.Value(0)),
  }))

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

  const tests = chosenTests(onboarding.startingTests?.ids ?? onboarding.baselinePicks)
  const count = tests.length

  const chat = () => router.replace("/health-profile")
  const later = () => router.replace("/plan?walk=1")

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
            <LinearGradient id="confirmedWash" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={WASH.from} stopOpacity={1} />
              <Stop offset="1" stopColor={WASH.from} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#confirmedWash)" />
        </Svg>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: top + space.section }]} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Animated.View style={[styles.halo, { opacity: t.badge, transform: [{ scale: t.badge }] }]}>
            <View style={styles.badge}>
              <CalendarCheck size={34} color={color.onPrimary} weight="bold" />
            </View>
          </Animated.View>
          <Animated.View style={[styles.words, rise(0)]}>
            <Text style={styles.title} accessibilityRole="header">
              Your tests are scheduled
            </Text>
            <Text style={styles.lead}>
              {`You're all set. We've saved your ${count === 1 ? "test" : `${count} tests`} and will remind you before each one.`}
            </Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.stack, rise(1)]}>
          <Card style={styles.card}>
            <Text style={type.section} accessibilityRole="header">
              Your schedule
            </Text>
            {tests.map((test, i) => {
              const booking = onboarding.bookings?.[test.id]
              const Mark = MARK[test.id]
              return (
                <View key={test.id} style={[styles.test, i > 0 && styles.rule]}>
                  <Tile hue="teal" size={36}>
                    <Mark size={18} color={HUE.teal.ink} />
                  </Tile>
                  <View style={styles.testWords}>
                    <Text style={styles.testName} numberOfLines={2}>
                      {BASELINE_TESTS[test.id].name}
                    </Text>
                    <Text style={styles.testWhen}>{booking?.when ?? "Time to confirm"}</Text>
                    <View style={styles.place}>
                      <MapPin size={12} color={ink.tertiary} />
                      <Text style={styles.placeText} numberOfLines={1}>
                        {booking?.where ?? TEST_SLOTS[test.id].where}
                      </Text>
                    </View>
                  </View>
                </View>
              )
            })}
            <View style={styles.rule} />
            <CheckLine>{`You can move any test from To do. No charge until ${MEMBER.doctorShort} approves your plan`}</CheckLine>
          </Card>
        </Animated.View>
      </ScrollView>
      <Animated.View style={rise(2)}>
        <PageFooter style={styles.footer}>
          <Button onPress={chat} trailing={({ color: c }) => <CaretRight size={16} weight="bold" color={c} />}>
            Personalize my care
          </Button>
          <View style={styles.later}>
            <TextAction tone="muted" onPress={later}>
              I’ll do this later
            </TextAction>
          </View>
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
  later: { alignItems: "center", paddingTop: space.stack },
  head: { alignItems: "center", gap: space.item },
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
  title: { fontFamily: font.semibold, fontSize: 26, lineHeight: 34, letterSpacing: -0.4, color: ink.strong, textAlign: "center" },
  lead: { ...type.body, textAlign: "center", paddingHorizontal: space.item },
  stack: { gap: space.item },
  card: { gap: space.item },
  test: { flexDirection: "row", alignItems: "center", gap: space.item },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule, paddingTop: space.item },
  testWords: { flex: 1, gap: 2 },
  testName: { ...type.section },
  testWhen: { ...type.body, color: ink.strong },
  place: { flexDirection: "row", alignItems: "center", gap: 4 },
  placeText: { ...type.meta, flexShrink: 1 },
})
