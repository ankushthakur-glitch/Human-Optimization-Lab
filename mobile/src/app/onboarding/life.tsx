import { router } from "expo-router"
import * as React from "react"
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useReducedMotion } from "@/components/chat"
import { DarkStatusBar } from "@/components/error-state"
import { HolBar } from "@/components/flow"
import { PageFooter, PageGround } from "@/components/hol"
import { DomainTile } from "@/components/life-kit"
import { CaretRight, Heart } from "@/components/ph"
import { Button } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { DOMAINS } from "@/lib/wellbeing"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* Setup's life questions, page 1: right after "Updates about your care",
   while the record is still arriving, eight questions (about ninety
   seconds), one for each part of life Inlay follows. "Start" opens them;
   "Skip for now" goes straight to the record building and leaves the
   questions for later. Nothing here goes to the clinic unless she sends it. */

export default function LifeIntroScreen() {
  const onboarding = useOnboarding()
  const { bottom } = useSafeAreaInsets()

  async function skip() {
    await onboarding.save({ life: { ratings: onboarding.life?.ratings ?? {}, focus: onboarding.life?.focus, skipped: true }, step: "records" })
    router.push("/onboarding/syncing")
  }

  return (
    <View style={styles.screen}>
      <DarkStatusBar />
      <PageGround />
      <HolBar back={false} />
      {/* The heading and footer follow "What would you like to improve?"
          (components/plan-steps.tsx). */}
      <ScrollView style={styles.fill} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.art}>
          <LifeBadge />
        </View>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            While your record arrives, tell us about your life.
          </Text>
          <Text style={styles.lead}>
            Eight questions, about 90 seconds. No wrong answers. Nothing is shared unless you send it.
          </Text>
        </View>
        <View style={styles.chips}>
          {DOMAINS.map((d) => (
            <View key={d.key} style={styles.chip}>
              <DomainTile domain={d.key} size={20} />
              <Text style={styles.chipText}>{d.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <PageFooter
        style={{ backgroundColor: "transparent", borderTopWidth: 0, paddingTop: space.item, paddingBottom: Math.max(bottom - 10, space.item + 4) }}
      >
        <View style={styles.footer}>
          <Pressable onPress={skip} hitSlop={8} accessibilityRole="button" style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
          <View style={styles.next}>
            <Button onPress={() => router.push("/onboarding/life-question")} trailing={({ color: c }) => <CaretRight size={16} weight="bold" color={c} />}>
              Start
            </Button>
          </View>
        </View>
      </PageFooter>
    </View>
  )
}

/** A heart beating softly in a teal disc, two rings spreading from it: life,
    at an easy pace. Still under Reduce Motion. */
const BADGE = 76
const native = Platform.OS !== "web"

function LifeBadge() {
  const still = useReducedMotion()
  const [beat] = React.useState(() => new Animated.Value(0))
  const [ring] = React.useState(() => new Animated.Value(0))
  React.useEffect(() => {
    if (still) return
    const run = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(beat, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: native }),
          Animated.timing(beat, { toValue: 0, duration: 520, easing: Easing.in(Easing.quad), useNativeDriver: native }),
          Animated.delay(900),
        ]),
        Animated.timing(ring, { toValue: 1, duration: 1840, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      ]),
    )
    run.start()
    return () => run.stop()
  }, [still, beat, ring])

  return (
    <View style={styles.stage} accessible={false} importantForAccessibility="no-hide-descendants">
      {[0, 0.35].map((lag) => (
        <Animated.View
          key={lag}
          style={[
            styles.ring,
            {
              opacity: still ? 0 : ring.interpolate({ inputRange: [0, lag, lag + 0.1, 1], outputRange: [0, 0, 0.5, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, lag, 1], outputRange: [1, 1, 2] }) }],
            },
          ]}
        />
      ))}
      <View style={styles.halo}>
        <View style={styles.disc}>
          <Animated.View style={{ transform: [{ scale: beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }}>
            <Heart size={34} weight="fill" color={color.onPrimary} />
          </Animated.View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  fill: { flex: 1 },
  pressed: { opacity: 0.7 },
  body: { gap: space.section + 8, paddingHorizontal: space.gutter, paddingTop: space.section + 8, paddingBottom: space.section },
  art: { alignItems: "center" },
  stage: { width: BADGE * 2, height: BADGE * 1.7, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: BADGE, height: BADGE, borderRadius: BADGE / 2, borderWidth: 2, borderColor: color.primaryLine },
  halo: { width: BADGE + 20, height: BADGE + 20, borderRadius: (BADGE + 20) / 2, alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },
  disc: { width: BADGE, height: BADGE, borderRadius: BADGE / 2, alignItems: "center", justifyContent: "center", backgroundColor: color.primary },
  head: { gap: space.item },
  title: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2, color: ink.strong },
  lead: { ...type.body },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.item - 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.mark,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: hairline.outline,
    backgroundColor: color.background,
  },
  chipText: { ...type.chip, fontSize: 13, lineHeight: 18 },

  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.section },
  skip: { paddingVertical: space.inline },
  skipText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: ink.secondary },
  next: { width: "52%" },
})
