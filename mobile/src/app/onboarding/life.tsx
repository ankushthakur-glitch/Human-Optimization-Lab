import { router } from "expo-router"
import * as React from "react"
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"

import { useReducedMotion } from "@/components/chat"
import { DarkStatusBar } from "@/components/error-state"
import { PageFooter, PageGround, PageHeader } from "@/components/hol"
import { Microphone, PaperPlaneRight, StopSquare } from "@/components/ph"
import { useOnboarding } from "@/lib/onboarding"
import { useVoiceInput } from "@/lib/voice"
import { SYMPTOM_COUNT } from "@/lib/wellbeing"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* Setup's "What Matters Most" page, right after "Updates about your care",
   while the record is still arriving: the symptoms that bother her most.
   Numbered examples show what to write; she types or speaks up to three in
   the field at the foot and taps Send, which saves them and goes straight
   on to rate each one on the next page. No Skip or Continue: Send is the
   only way on. Nothing here goes to the clinic unless she sends it. */

const EXAMPLE = "(fatigue, lack of sleep, anxiety)"

/** Her words as up to three symptoms: split on new lines, commas, semicolons
    and "and", with any "1." or "2)" numbering dropped. */
function symptomsFrom(text: string) {
  return text
    .split(/[\n,;]+|\s+and\s+/i)
    .map((s) => s.replace(/^\s*\d+\s*[.)\-:]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, SYMPTOM_COUNT)
}

/** Bar heights, from the mic outward: tallest nearest it, fading away. */
const BARS = [28, 38, 22, 34, 16, 26, 12, 18, 8]

/** The sound bars either side of the mic: soft and still, teal while listening. */
function Bars({ side, active }: { side: "left" | "right"; active: boolean }) {
  const bars = side === "left" ? [...BARS].reverse() : BARS
  return (
    <View style={styles.bars} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {bars.map((h, i) => {
        const near = side === "left" ? i + 1 : BARS.length - i
        return <View key={i} style={[styles.bar, { height: h, opacity: (active ? 0.35 : 0.18) + 0.65 * (near / BARS.length) * (active ? 1 : 0.7) }]} />
      })}
    </View>
  )
}

export default function WhatMattersMostScreen() {
  const onboarding = useOnboarding()
  const [text, setText] = React.useState(() => (onboarding.life?.symptoms ?? []).join(", "))
  const [pending, setPending] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const speech = useVoiceInput(setText)
  const listening = speech.state === "listening"
  const still = useReducedMotion()
  const pulse = React.useRef(new Animated.Value(0)).current
  const toggleTalk = () => (listening ? speech.stop() : speech.start(text))

  React.useEffect(() => {
    if (still || !listening) return
    pulse.setValue(0)
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }))
    loop.start()
    return () => loop.stop()
  }, [still, listening, pulse])
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] })
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] })

  const symptoms = symptomsFrom(text)
  const canSend = symptoms.length > 0 && !pending

  async function send() {
    if (!canSend) return
    setPending(true)
    await onboarding.save({
      life: { ratings: onboarding.life?.ratings ?? {}, focus: onboarding.life?.focus, symptoms, skipped: false },
      step: "life",
    })
    setPending(false)
    router.push("/onboarding/life-question")
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <DarkStatusBar />
      <PageGround />
      <PageHeader title="What Matters Most" onBack={() => router.back()} />
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          What are the three physical or emotional symptoms that bother you most?
        </Text>
      </View>
      <ScrollView style={styles.fill} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>{`For example: ${EXAMPLE}`}</Text>
        <View style={styles.stage}>
          <View style={styles.beam}>
            <Bars side="left" active={listening} />
            <View style={styles.mic}>
              {listening && !still && <Animated.View style={[styles.pulse, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />}
              <View style={styles.halo}>
                <View style={styles.ring}>
                  <Pressable
                    onPress={toggleTalk}
                    accessibilityRole="button"
                    accessibilityLabel={listening ? "Stop listening" : "Speak your symptoms"}
                    style={({ pressed }) => [styles.core, pressed && styles.corePressed]}
                  >
                    {listening ? <StopSquare size={24} color={color.onPrimary} weight="fill" /> : <Microphone size={32} color={color.onPrimary} />}
                  </Pressable>
                </View>
              </View>
            </View>
            <Bars side="right" active={listening} />
          </View>
          <Text style={styles.cue} accessibilityLiveRegion="polite">
            {listening ? "Listening… tap to stop" : "Tap the mic and tell us\nwhat's been bothering you."}
          </Text>
        </View>
      </ScrollView>
      <PageFooter style={styles.foot}>
        <View style={styles.row}>
        <View style={[styles.field, focused && styles.fieldFocused]}>
          <TextInput
            value={text}
            onChangeText={setText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={send}
            placeholder="Type your three symptoms..."
            placeholderTextColor={ink.secondary}
            accessibilityLabel="Your three most bothersome symptoms"
            style={styles.input}
            returnKeyType="send"
          />
          <Pressable
            onPress={() => (listening ? speech.stop() : speech.start(text))}
            accessibilityRole="button"
            accessibilityLabel={listening ? "Stop listening" : "Speak"}
            hitSlop={8}
            style={({ pressed }) => [styles.talk, pressed && styles.pressed]}
          >
            {listening ? <StopSquare size={16} color={color.primary} weight="fill" /> : <Microphone size={20} color={ink.detail} />}
          </Pressable>
        </View>
        <Pressable
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={({ pressed }) => [styles.send, !canSend && styles.sendOff, pressed && styles.pressed]}
        >
          <PaperPlaneRight size={20} weight="fill" color={color.onPrimary} />
        </Pressable>
        </View>
      </PageFooter>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  fill: { flex: 1 },
  pressed: { opacity: 0.7 },
  head: { paddingHorizontal: space.gutter, paddingTop: space.section, paddingBottom: space.item },
  title: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2, color: ink.strong },
  list: { gap: space.inline, paddingHorizontal: space.gutter, paddingTop: space.line, paddingBottom: space.item },
  lead: { ...type.body },

  /* The mic block, centred in the space above the field (the voice sheet's
     mic, larger: a teal disc in two soft rings, sound bars either side). */
  stage: { alignItems: "center", gap: space.section, paddingTop: 72 },
  beam: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.item },
  bars: { flexDirection: "row", alignItems: "center", gap: 4 },
  bar: { width: 4, borderRadius: 2, backgroundColor: color.primary },
  mic: { width: 132, height: 132, alignItems: "center", justifyContent: "center" },
  pulse: { position: "absolute", width: 132, height: 132, borderRadius: 66, borderWidth: 2, borderColor: color.primary },
  halo: { width: 132, height: 132, borderRadius: 66, borderWidth: 1, borderColor: color.primaryEdge, backgroundColor: color.primaryTint, alignItems: "center", justifyContent: "center" },
  ring: { width: 100, height: 100, borderRadius: 50, backgroundColor: color.background, borderWidth: 1, borderColor: color.primaryEdge, alignItems: "center", justifyContent: "center" },
  core: { width: 72, height: 72, borderRadius: 36, backgroundColor: color.primary, alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(1, 131, 126, 0.3)" },
  corePressed: { backgroundColor: color.primaryPressed },
  cue: { ...type.body, textAlign: "center" },

  foot: {
    backgroundColor: "transparent",
    borderTopWidth: 0,
    paddingTop: space.item,
  },
  /* The field and Send on one line, as in the chat composer. */
  row: { flexDirection: "row", alignItems: "center", gap: space.item },
  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    paddingHorizontal: space.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: hairline.outline,
    backgroundColor: color.background,
  },
  /* The design system's field state (ui.tsx inputBoxFocused): a teal edge and a soft teal halo. */
  fieldFocused: { borderColor: color.primary, boxShadow: `0 0 0 3px ${color.primaryHalo}` },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: ink.strong,
    ...({ outlineStyle: "none" } as object),
  },
  talk: { alignItems: "center", justifyContent: "center" },
  send: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: color.primary },
  sendOff: { opacity: 0.4 },
})
