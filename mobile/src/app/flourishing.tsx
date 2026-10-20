import { router } from "expo-router"
import * as React from "react"
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { useReducedMotion } from "@/components/chat"
import { ArrowClockwise, Pause, Play } from "@/components/ph"
import { PlanStepPage } from "@/components/plan-steps"
import { Card, Steps, type Step } from "@/components/record-kit"
import { FLOURISH } from "@/lib/conversation"
import { demoToResult } from "@/lib/flourishing"
import { MEMBER } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { color, font, ink, space, type } from "@/lib/theme"

/* "Are you flourishing?" (16 Oct call): the moment before the flourishing
   questions, opened by Confirm on "Tell us about you" (/health-profile).
   Why first, then what. Top to bottom:
   - the video, which reads as one: Dr. Patel on the frame, a play button
     that breathes until tapped, its length, then captions over the picture
     with the bar and the time;
   - "How it works", the three steps as the kit's track: watch, answer,
     see your result. Watching to the end ticks the first;
   "Start the questions" opens the questionnaire (/flourishing-questions).
   Demo only: tapping "Flourishing" in the header jumps to the result.
   The questions are needed before the plan starts, so there is no skip;
   the video can be passed, and back still goes back.

   Until the clip is made, the player plays its script as captions over 30
   seconds, with play, pause, a bar and the time, and Replay at the end. */

const LENGTH = 30
const native = Platform.OS !== "web"

/** The video's script, one line a quarter. */
const SCRIPT = [
  "Your health is more than your numbers.",
  "How you sleep, feel, connect and find meaning shapes it too.",
  `Your answers help ${MEMBER.doctorShort} build a plan around your whole life.`,
  "There are no right answers. Only you and your care team see them.",
]

const clock = (s: number) => `0:${String(Math.min(LENGTH, Math.floor(s))).padStart(2, "0")}`

type State = "ready" | "playing" | "paused" | "ended"

export default function FlourishingScreen() {
  const onboarding = useOnboarding()
  const [watched, setWatched] = React.useState(false)
  const steps: Step[] = [
    { label: "Watch the video", date: "30 seconds", state: watched ? "done" : "now" },
    { label: `Answer ${FLOURISH.length} questions`, date: "One at a time, about 5 minutes", state: watched ? "now" : "next" },
    { label: "See your flourishing result", date: `Shared with ${MEMBER.doctorShort}`, state: "next" },
  ]
  return (
    <PlanStepPage
      headerTitle="Flourishing"
      onTitlePress={() => void demoToResult(onboarding)}
      title="Are you flourishing?"
      lead={`A short video from ${MEMBER.doctorShort}, then a few questions about your life.`}
      onNext={() => router.push("/flourishing-questions")}
      nextLabel="Start the questions"
      nextWide
    >
      <IntroVideo onEnd={() => setWatched(true)} />

      <Card style={styles.card}>
        <Text style={type.section} accessibilityRole="header">
          How it works
        </Text>
        <Steps steps={steps} />
      </Card>

    </PlanStepPage>
  )
}

/** The 30 second intro: Dr. Patel on a teal frame with a play button that
    breathes until it is tapped, then the script as captions. */
function IntroVideo({ onEnd }: { onEnd: () => void }) {
  const still = useReducedMotion()
  const [state, setState] = React.useState<State>("ready")
  const [at, setAt] = React.useState(0)
  const [progress] = React.useState(() => new Animated.Value(0))
  const [breathe] = React.useState(() => new Animated.Value(0))
  const fade = React.useRef(new Animated.Value(1)).current
  const line = Math.min(SCRIPT.length - 1, Math.floor((at / LENGTH) * SCRIPT.length))

  React.useEffect(() => {
    const id = progress.addListener(({ value }) => setAt(value * LENGTH))
    return () => progress.removeListener(id)
  }, [progress])

  // The play button's ring breathes until the first tap, saying "tap me".
  React.useEffect(() => {
    if (still || state !== "ready") return
    const loop = Animated.loop(Animated.timing(breathe, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: native }))
    loop.start()
    return () => loop.stop()
  }, [still, state, breathe])

  // Each new caption fades in.
  React.useEffect(() => {
    if (state === "ready") return
    fade.setValue(0)
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: native }).start()
  }, [line, state, fade])

  function play() {
    const from = state === "ended" ? 0 : at / LENGTH
    if (state === "ended") progress.setValue(0)
    setState("playing")
    Animated.timing(progress, { toValue: 1, duration: (1 - from) * LENGTH * 1000, easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => {
      if (!finished) return
      setState("ended")
      onEnd()
    })
  }

  function pause() {
    progress.stopAnimation()
    setState("paused")
  }

  const onPress = state === "playing" ? pause : play
  const label = state === "playing" ? "Pause video" : state === "ended" ? "Replay video" : "Play video, 30 seconds"
  const Icon = state === "playing" ? Pause : state === "ended" ? ArrowClockwise : Play
  const initials = MEMBER.doctor.replace(/^Dr\.\s*/, "").split(" ").map((w) => w[0]).join("")

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.video}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="flourishVideo" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#0E9A92" />
            <Stop offset="1" stopColor="#01635F" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#flourishVideo)" />
      </Svg>

      <View style={styles.who}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View>
          <Text style={styles.whoName}>{MEMBER.doctor}</Text>
          <Text style={styles.whoLine}>Why flourishing matters</Text>
        </View>
      </View>

      {state !== "playing" && (
        <View style={styles.playWrap}>
          {state === "ready" && (
            <Animated.View
              style={[
                styles.pulse,
                {
                  opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                  transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
                },
              ]}
            />
          )}
          <View style={styles.play}>
            <Icon size={26} color={color.primary} weight="fill" />
          </View>
          <Text style={styles.playHint}>{state === "ended" ? "Watch again" : state === "paused" ? "Resume" : "Tap to play"}</Text>
        </View>
      )}

      {state !== "ready" && (
        <Animated.View style={[styles.captionBand, { opacity: fade }]} accessibilityLiveRegion="polite">
          <Text style={styles.caption}>{state === "ended" ? "Ready when you are." : SCRIPT[line]}</Text>
        </Animated.View>
      )}

      <View style={styles.foot}>
        <View style={styles.track}>
          <Animated.View style={[styles.bar, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
        </View>
        <Text style={styles.time}>{state === "ready" ? "0:30" : `${clock(at)} / 0:30`}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  video: { aspectRatio: 16 / 11, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  who: { position: "absolute", top: space.item, left: space.item, right: space.item, flexDirection: "row", alignItems: "center", gap: space.inline },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255, 255, 255, 0.22)", borderWidth: 1.5, borderColor: "rgba(255, 255, 255, 0.6)" },
  avatarText: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18, color: color.onPrimary },
  whoName: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19, color: color.onPrimary },
  whoLine: { ...type.label, fontSize: 12, lineHeight: 16, color: color.onPrimary, opacity: 0.85 },

  playWrap: { alignItems: "center", gap: space.inline },
  pulse: { position: "absolute", top: 0, width: 64, height: 64, borderRadius: 32, backgroundColor: color.background },
  play: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: color.background },
  playHint: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.onPrimary },

  captionBand: { position: "absolute", left: space.item, right: space.item, bottom: 40, paddingVertical: space.inline, paddingHorizontal: space.item, borderRadius: 12, backgroundColor: "rgba(0, 0, 0, 0.28)" },
  caption: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22, color: color.onPrimary, textAlign: "center" },

  foot: { position: "absolute", left: space.item, right: space.item, bottom: space.inline + 2, flexDirection: "row", alignItems: "center", gap: space.inline },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden", backgroundColor: "rgba(255, 255, 255, 0.3)" },
  bar: { height: 4, borderRadius: 2, backgroundColor: color.onPrimary },
  time: { ...type.label, fontSize: 12, color: color.onPrimary, fontVariant: ["tabular-nums"] },

  card: { gap: space.item, marginTop: space.item },
})
