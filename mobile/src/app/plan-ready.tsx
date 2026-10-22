import { router } from "expo-router"
import * as React from "react"
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native"

import { useReducedMotion } from "@/components/chat"
import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { Check, Info } from "@/components/ph"
import { Block, Group, Tile, type Hue } from "@/components/record-kit"
import { TopicIcon } from "@/components/topic-kit"
import { MEMBER } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { FINDINGS } from "@/lib/topics"
import { color, ink, space, type } from "@/lib/theme"

/* All tests complete (Journey_14 screen 28), after the four baseline tests
   are in: shown once, the first time she opens the Plan tab after her plan
   is built. It replaces the two old plan-ready screens: one page says the
   testing is finished and shows what it turned up, rather than announcing
   that a plan has been sent and then asking for an acceptance that already
   happened at payment. Five findings, led by the one that paid for itself
   (moderate sleep apnoea at AHI 18, the $299 sleep study), and the last of
   them from what she told us, which no test would have found. Stated once
   at the foot: the plan is already running. "View my plan" goes on to the
   starting point (/starting-point), where she sets day one's zero. */

const native = Platform.OS !== "web"

/** Each finding's tile, by what it is about. */
const HUE_OF: Record<string, Hue> = { sleep: "violet", measure: "teal", eat: "amber", medication: "blue", mind: "green" }

export default function PlanReadyScreen() {
  const onboarding = useOnboarding()
  const still = useReducedMotion()
  const badge = React.useRef(new Animated.Value(0)).current

  // Seen once: the Plan tab won't open it again.
  React.useEffect(() => {
    if (onboarding.loaded && !onboarding.planReadySeen) onboarding.save({ planReadySeen: true })
  }, [onboarding])

  React.useEffect(() => {
    if (still) {
      badge.setValue(1)
      return
    }
    const run = Animated.spring(badge, { toValue: 1, friction: 6, tension: 70, useNativeDriver: native })
    run.start()
    return () => run.stop()
  }, [still, badge])

  return (
    <FlowScreen
      page
      title="All tests complete"
      footer={<PrimaryButton onPress={() => router.push("/starting-point")}>View my plan</PrimaryButton>}
    >
      <View style={styles.head}>
        <Animated.View style={[styles.badge, { opacity: badge, transform: [{ scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>
          <Check size={28} weight="bold" color={color.primary} />
        </Animated.View>
        <Text style={styles.title} accessibilityRole="header">
          Congratulations
        </Text>
        <Text style={[type.body, styles.lead]}>All four tests are in. Everything you ordered is complete, and your plan has been built from it.</Text>
      </View>

      <Block title="What they found" meta={`${FINDINGS.length} findings`}>
        <Group>
          {FINDINGS.map((f, i) => {
            const hue = HUE_OF[f.icon]
            return (
              <View key={f.title} style={styles.row} accessible accessibilityLabel={`${f.title}. ${f.sub}`}>
                <Tile hue={hue} size={32}>
                  <TopicIcon name={f.icon} color={f.bad ? "#A95413" : undefined} />
                </Tile>
                <View style={styles.fill}>
                  <Text style={[styles.finding, i === 0 && styles.lead1]}>{f.title}</Text>
                  <Text style={type.label}>{f.sub}</Text>
                </View>
              </View>
            )
          })}
        </Group>
      </Block>

      <View style={styles.foot}>
        <Info size={14} color={ink.tertiary} />
        <Text style={[type.meta, styles.fill]}>{`A copy has gone to ${MEMBER.doctorShort}. You accepted the plan when you enrolled, so it is already running.`}</Text>
      </View>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  head: { alignItems: "center", gap: space.inline, paddingTop: space.item },
  badge: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },
  title: { ...type.hero, fontSize: 24, lineHeight: 32, marginTop: space.stack },
  lead: { textAlign: "center", paddingHorizontal: space.item },
  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
  finding: { ...type.title, color: ink.strong },
  lead1: { color: "#A95413" },
  foot: { flexDirection: "row", alignItems: "flex-start", gap: space.inline },
})
