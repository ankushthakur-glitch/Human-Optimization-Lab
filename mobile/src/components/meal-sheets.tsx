import * as React from "react"
import { Animated, Easing, Platform, StyleSheet, Text, TextInput, View } from "react-native"

import { useReducedMotion } from "@/components/chat"
import { Microphone } from "@/components/ph"
import { HUE, TextAction } from "@/components/record-kit"
import { Sheet, useKeyboardHeight } from "@/components/sheet"
import { Button, TextField } from "@/components/ui"
import { font, ink, space, type } from "@/lib/theme"

/* "Say it" and "Type it" on Log a meal: bottom sheets like "Add a photo of
   your meal" (14 Oct 2026), over the capture screen rather than pages of
   their own. */

const native = Platform.OS !== "web"

/** The web asks for the microphone; a phone's build has no recogniser yet,
    so it listens for show. Resolves false when the microphone is refused. */
async function micAllowed(): Promise<boolean> {
  if (Platform.OS !== "web" || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return true
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
    return true
  } catch {
    return false
  }
}

type Voice = "idle" | "listening" | "heard" | "denied"

/** Say it: start, stop, then the words it heard (the prototype always hears
    the same meal) and on to checking them. */
export function VoiceSheet({ transcript, onDone, onClose }: { transcript: string; onDone: () => void; onClose: () => void }) {
  const still = useReducedMotion()
  const [state, setState] = React.useState<Voice>("idle")
  const pulse = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    if (still || state !== "listening") return
    pulse.setValue(0)
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: native }))
    loop.start()
    return () => loop.stop()
  }, [still, state, pulse])

  async function start() {
    setState((await micAllowed()) ? "listening" : "denied")
  }

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] })
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] })
  const title = { idle: "Tap to start", listening: "Listening", heard: "Here’s what we heard", denied: "Microphone is off" }[state]
  const line = {
    idle: "Say what you ate, like “I had eggs and toast.”",
    listening: "Tap stop when you’re done",
    heard: `“${transcript}”`,
    denied: "Allow the microphone in your browser or Settings, then try again.",
  }[state]

  return (
    <Sheet title="Say what you ate" onClose={onClose}>
      <View style={styles.stage}>
        <View style={styles.mic}>
          {state === "listening" && !still && <Animated.View style={[styles.ring, { opacity, transform: [{ scale }] }]} />}
          <View style={styles.core}>
            <Microphone size={28} color={HUE.teal.ink} />
          </View>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.line} accessibilityLiveRegion="polite">
          {line}
        </Text>
      </View>
      {state === "listening" ? (
        <Button onPress={() => setState("heard")}>Stop</Button>
      ) : state === "heard" ? (
        <>
          <Button onPress={onDone}>Continue</Button>
          <View style={styles.again}>
            <TextAction tone="muted" onPress={() => setState("idle")}>
              Say it again
            </TextAction>
          </View>
        </>
      ) : (
        <Button onPress={start}>{state === "denied" ? "Try again" : "Start recording"}</Button>
      )}
    </Sheet>
  )
}

/** Type it: the meal in her own words, then on to checking it. */
export function TypeSheet({ onDone, onClose }: { onDone: (text: string) => void; onClose: () => void }) {
  const [text, setText] = React.useState("")
  const keyboard = useKeyboardHeight()
  const go = () => text.trim() && onDone(text)
  // Focused once the sheet is on screen: autoFocus on a sheet that is still
  // mounting shows the caret on iOS but never raises the keyboard.
  const field = React.useRef<TextInput>(null)
  React.useEffect(() => {
    const t = setTimeout(() => field.current?.focus(), 300)
    return () => clearTimeout(t)
  }, [])
  return (
    <View style={[styles.frame, { bottom: keyboard }]} pointerEvents="box-none">
      <Sheet title="Type what you ate" onClose={onClose}>
        <TextField
          ref={field}
          label="What did you eat?"
          value={text}
          onChangeText={setText}
          multiline
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={go}
        />
        <Button onPress={go} disabled={!text.trim()}>
          Continue
        </Button>
      </Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  frame: { position: "absolute", top: 0, left: 0, right: 0 },
  stage: { alignItems: "center", gap: space.item },
  mic: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: HUE.teal.ink },
  core: { width: 72, height: 72, borderRadius: 36, backgroundColor: HUE.teal.tint, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: ink.content, textAlign: "center" },
  line: { ...type.body, textAlign: "center" },
  again: { alignItems: "center" },
})
