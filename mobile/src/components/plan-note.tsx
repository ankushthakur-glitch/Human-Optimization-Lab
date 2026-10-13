import { router } from "expo-router"
import * as React from "react"
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native"

import { ArrowRight, Heartbeat, Sparkle, Target, Trophy } from "@/components/ph"
import { HUE } from "@/components/record-kit"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* The closing note on "Your data insights": "Your goals + your health data =
   a personalized optimization plan." Two designs for the same words. Both
   turn the sentence into something she can see and both make "you can adjust
   your goals at any time" an action rather than a promise: it goes back to
   the goals screen. */

const HEADLINE = "Your goals + your health data = a personalized optimization plan."
const REASSURE = "You’re in control. You can adjust your goals at any time."
const label = `${HEADLINE} ${REASSURE}`

const toGoals = () => router.push("/optimize/goals")

/** Fades and lifts a piece into place, `index` apart from the one before. */
function Rise({ index, children, style }: { index: number; children: React.ReactNode; style?: object }) {
  const t = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 420, delay: index * 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [index, t])
  return <Animated.View style={[style, { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>{children}</Animated.View>
}

/* A · The equation. Goals + Health data = Plan, drawn as three tiles that
   rise in one after another, so the sum is read left to right. The plan tile
   is the filled one. "Adjust goals" sits under the sum. */
export function PlanNoteEquation() {
  return (
    <View style={a.wrap} accessible accessibilityLabel={label}>
      <View style={a.sum} importantForAccessibility="no-hide-descendants">
        <Rise index={0} style={a.node}>
          <View style={[a.tile, { backgroundColor: HUE.blue.tint }]}>
            <Target size={24} color={HUE.blue.ink} weight="duotone" />
          </View>
          <Text style={a.nodeText}>Your goals</Text>
        </Rise>
        <Rise index={1}><Text style={a.op}>+</Text></Rise>
        <Rise index={2} style={a.node}>
          <View style={[a.tile, { backgroundColor: HUE.red.tint }]}>
            <Heartbeat size={24} color={HUE.red.ink} weight="duotone" />
          </View>
          <Text style={a.nodeText}>Your health data</Text>
        </Rise>
        <Rise index={3}><Text style={a.op}>=</Text></Rise>
        <Rise index={4} style={a.node}>
          <View style={[a.tile, a.plan]}>
            <Sparkle size={24} color={color.onPrimary} weight="fill" />
          </View>
          <Text style={[a.nodeText, a.planText]}>Your plan</Text>
        </Rise>
      </View>
      <Text style={a.headline}>{HEADLINE}</Text>
      <Text style={a.reassure}>{REASSURE}</Text>
      <Pressable onPress={toGoals} accessibilityRole="button" accessibilityLabel="Adjust goals" hitSlop={8} style={({ pressed }) => [a.link, pressed && a.pressed]}>
        <Text style={a.linkText}>Adjust goals</Text>
        <ArrowRight size={14} color={color.primary} weight="bold" />
      </Pressable>
    </View>
  )
}

/* B · The banner. A deep teal panel with a trophy badge on soft rings: the
   promise stated large, the reassurance in a quieter line, and one white
   "Adjust goals" button. The only dark block on the screen, so it reads as
   the point of the page. */
export function PlanNoteBanner() {
  return (
    <View style={b.wrap} accessible={false}>
      <View style={b.ringOuter} />
      <View style={b.ringInner} />
      <Rise index={0} style={b.badge}>
        <Trophy size={26} color="#B45309" weight="fill" />
      </Rise>
      <Rise index={1} style={b.copy}>
        <Text style={b.headline} accessibilityRole="header">{HEADLINE}</Text>
        <Text style={b.reassure}>{REASSURE}</Text>
      </Rise>
      <Rise index={2}>
        <Pressable onPress={toGoals} accessibilityRole="button" accessibilityLabel="Adjust goals" style={({ pressed }) => [b.button, pressed && a.pressed]}>
          <Text style={b.buttonText}>Adjust goals</Text>
          <ArrowRight size={16} color={ink.primary} weight="bold" />
        </Pressable>
      </Rise>
    </View>
  )
}

const a = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: space.item,
    padding: space.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  sum: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center", gap: 8, paddingTop: 4 },
  node: { alignItems: "center", gap: 6, width: 78 },
  tile: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  plan: { backgroundColor: color.primary },
  nodeText: { ...type.meta, textAlign: "center" },
  planText: { color: ink.primary, fontFamily: font.medium },
  op: { fontFamily: font.medium, fontSize: 22, lineHeight: 52, color: ink.tertiary },
  headline: { ...type.title, color: ink.primary, textAlign: "center" },
  reassure: { ...type.body, textAlign: "center" },
  link: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: space.card },
  linkText: { ...type.title, color: color.primary },
  pressed: { opacity: 0.7 },
})

const b = StyleSheet.create({
  wrap: { overflow: "hidden", gap: space.item, padding: space.card + 4, borderRadius: 20, backgroundColor: ink.primary },
  ringOuter: { position: "absolute", top: -70, right: -70, width: 200, height: 200, borderRadius: 100, borderWidth: 28, borderColor: "rgba(255,255,255,0.05)" },
  ringInner: { position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: 55, borderWidth: 20, borderColor: "rgba(255,255,255,0.07)" },
  badge: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  copy: { gap: space.inline },
  headline: { fontFamily: font.medium, fontSize: 20, lineHeight: 26, color: "#FFFFFF" },
  reassure: { ...type.body, color: "rgba(255,255,255,0.78)" },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 46, borderRadius: 999, backgroundColor: "#FFFFFF" },
  buttonText: { ...type.title, color: ink.primary },
})
