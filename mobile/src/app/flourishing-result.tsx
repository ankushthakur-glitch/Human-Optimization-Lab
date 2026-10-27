import { router } from "expo-router"
import * as React from "react"
import { Animated, Easing, StyleSheet, Text, View } from "react-native"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { useReducedMotion } from "@/components/chat"
import { PlanStepPage } from "@/components/plan-steps"
import { Card, Tag } from "@/components/record-kit"
import { DOMAINS, flourishScore, interpret } from "@/lib/conversation"
import { AREAS } from "@/lib/flourishing"
import { MEMBER } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { chart, color, font, ink, space, type } from "@/lib/theme"

/* The flourishing result, after the last page of the questions
   (/flourishing-questions). Her flourishing index out of 10, counting up
   over a yellow to green bar that fills as the page opens, her
   strongest part of life and the one with most room to grow, then each of
   the eight as a bar that grows in turn. It is shared with her physician
   to shape the plan. Continue opens the sleep apnea screen
   (/sleep-questions), whose result walks on to her plan. */

/* The index bar's soft yellow to soft green, as in the reference. */
const INDEX_FROM = "#EBD89A"
const INDEX_TO = "#A9DDB8"

const SHORT = AREAS.map((a) => a.name)

export default function FlourishingResultScreen() {
  const onboarding = useOnboarding()
  const still = useReducedMotion()
  const { overall, domains } = flourishScore(onboarding.why?.flourish ?? [])
  const ranked = domains.map((score, i) => ({ score, i })).filter((d) => d.score > 0).sort((a, b) => b.score - a.score)
  const best = ranked[0]
  const grow = ranked[ranked.length - 1]

  const [fill] = React.useState(() => new Animated.Value(0))
  const [bars] = React.useState(() => DOMAINS.map(() => new Animated.Value(0)))
  const [shown, setShown] = React.useState(0)

  React.useEffect(() => {
    if (still) {
      fill.setValue(1)
      bars.forEach((b) => b.setValue(1))
      setShown(overall)
      return
    }
    const id = fill.addListener(({ value }) => setShown(value * overall))
    const run = Animated.parallel([
      Animated.timing(fill, { toValue: 1, duration: 1100, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.stagger(
        80,
        bars.map((b) => Animated.timing(b, { toValue: 1, duration: 500, delay: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false })),
      ),
    ])
    run.start()
    return () => {
      run.stop()
      fill.removeListener(id)
    }
  }, [still, fill, bars, overall])

  return (
    <PlanStepPage
      headerTitle="Flourishing"
      title="Your flourishing result"
      onNext={() => router.push("/sleep-questions")}
      nextLabel="Continue"
      nextWide
    >
      <Card style={styles.indexCard}>
        <View style={styles.index} accessibilityRole="image" accessibilityLabel={`Flourishing index ${overall.toFixed(1)} out of 10. ${interpret(overall)}`}>
          <Text style={styles.indexLabel}>Flourishing index</Text>
          <View style={styles.score}>
            <Text style={styles.scoreValue}>{shown.toFixed(1)}</Text>
            <Text style={styles.scoreOf}>/ 10</Text>
          </View>
        </View>
        <View style={styles.indexTrack}>
          <Animated.View style={[styles.indexBar, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${Math.max(2, overall * 10)}%`] }) }]}>
            <Svg width="100%" height="100%" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="flourish" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={INDEX_FROM} />
                  <Stop offset="1" stopColor={INDEX_TO} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#flourish)" />
            </Svg>
          </Animated.View>
        </View>
      </Card>

      {best && grow && best.i !== grow.i && (
        <View style={styles.pair}>
          <Card style={styles.half}>
            <Tag tone="ok">Your strength</Tag>
            <Text style={styles.halfName}>{SHORT[best.i]}</Text>
            <Text style={styles.halfScore}>{best.score.toFixed(1)}</Text>
          </Card>
          <Card style={styles.half}>
            <Tag tone="low">Room to grow</Tag>
            <Text style={styles.halfName}>{SHORT[grow.i]}</Text>
            <Text style={styles.halfScore}>{grow.score.toFixed(1)}</Text>
          </Card>
        </View>
      )}

      <Card style={styles.list}>
        <Text style={type.section} accessibilityRole="header">
          Each part of your life
        </Text>
        {DOMAINS.map((name, i) => (
          <View key={name} style={styles.domain} accessible accessibilityLabel={`${SHORT[i]}, ${domains[i].toFixed(1)} out of 10`}>
            <View style={styles.domainHead}>
              <Text style={styles.domainName}>{SHORT[i]}</Text>
              <Text style={styles.domainValue}>{domains[i] ? domains[i].toFixed(1) : "No answer"}</Text>
            </View>
            <View style={styles.track}>
              <Animated.View style={[styles.bar, { width: bars[i].interpolate({ inputRange: [0, 1], outputRange: ["0%", `${Math.max(2, domains[i] * 10)}%`] }) }]} />
            </View>
          </View>
        ))}
      </Card>

      <Text style={styles.shared}>{`Shared with ${MEMBER.doctorShort} to shape your plan.`}</Text>
    </PlanStepPage>
  )
}

const styles = StyleSheet.create({
  indexCard: { gap: space.item, padding: space.card, paddingTop: space.section },
  index: { alignItems: "center", gap: space.mark },
  indexLabel: { fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: ink.detail },
  score: { flexDirection: "row", alignItems: "baseline", gap: space.mark },
  scoreValue: { fontFamily: font.semibold, fontSize: 56, lineHeight: 64, letterSpacing: -1, color: ink.strong, fontVariant: ["tabular-nums"] },
  scoreOf: { fontFamily: font.medium, fontSize: 16, lineHeight: 20, color: ink.detail },
  indexTrack: { height: 10, borderRadius: 5, backgroundColor: chart.track, overflow: "hidden" },
  indexBar: { height: "100%", borderRadius: 5, overflow: "hidden" },

  pair: { flexDirection: "row", gap: space.inline },
  half: { flex: 1, gap: space.line, alignItems: "flex-start", padding: space.card },
  halfName: { ...type.title, color: ink.strong },
  halfScore: { fontFamily: font.semibold, fontSize: 22, lineHeight: 28, color: ink.strong, fontVariant: ["tabular-nums"] },

  list: { gap: space.item, padding: space.card },
  domain: { gap: space.mark },
  domainHead: { flexDirection: "row", justifyContent: "space-between", gap: space.item },
  domainName: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink.detail },
  domainValue: { ...type.value, color: ink.content },
  track: { height: 6, borderRadius: 3, backgroundColor: chart.track, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 3, backgroundColor: color.primary },

  shared: { ...type.label, textAlign: "center", marginTop: space.inline },
})
