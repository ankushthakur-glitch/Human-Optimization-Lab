import * as React from "react"
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"

import { useReducedMotion } from "@/components/chat"
import { Check } from "@/components/ph"
import { useTopInset } from "@/components/ui"
import { buttonRadius, color, ink, space, surface, type } from "@/lib/theme"

/* The app's one short confirmation after an action ("Saved for your next
   visit", "Hidden for now. It's always on the Plan tab."): a dark pill with
   a green check that drops in under the status bar, holds for 1.6 s and
   fades (FINAL-SPEC C.0.7, F.2). It never asks anything and never blocks a
   tap. Under Reduce Motion it appears and leaves without moving.

   Call toast(text) from anywhere. One ToastHost is mounted for the whole
   app (app/_layout.tsx); should a second one mount, only the first shows,
   so a message never appears twice. A newer message replaces the one on
   screen. */

type Listener = (message: string) => void

const listeners = new Map<symbol, Listener>()
const hosts: symbol[] = []

/** Shows a short confirmation at the top of the screen. */
export function toast(text: string) {
  const message = text.trim()
  if (!message || !hosts.length) return
  listeners.get(hosts[0])?.(message)
}

/** The name the first route stubs used; the same function as toast. */
export const showToast = toast

const IN_MS = 200
const HOLD_MS = 1600
const OUT_MS = 220

/** Native driver on a phone; the web build has none. */
const native = Platform.OS !== "web"

/** The pill itself, as it looks while it holds: for the kit gallery, and
    drawn by the host for every message. */
export function Toast({ text, style }: { text: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.pill, style]}>
      <View style={styles.check}>
        <Check size={11} color={color.onPrimary} weight="bold" />
      </View>
      <Text style={styles.text} numberOfLines={2} maxFontSizeMultiplier={1.3}>
        {text}
      </Text>
    </View>
  )
}

/** Where toasts appear. Mount once, over everything. */
export function ToastHost() {
  const [id] = React.useState(() => Symbol("toast"))
  const [shown, setShown] = React.useState<{ text: string; n: number }>()

  React.useEffect(() => {
    hosts.push(id)
    listeners.set(id, (text) => setShown((prev) => ({ text, n: (prev?.n ?? 0) + 1 })))
    return () => {
      listeners.delete(id)
      const at = hosts.indexOf(id)
      if (at >= 0) hosts.splice(at, 1)
    }
  }, [id])

  if (!shown) return null
  // A new key per message restarts the drop and the hold.
  return <ToastDrop key={shown.n} text={shown.text} onDone={() => setShown((prev) => (prev?.n === shown.n ? undefined : prev))} />
}

function ToastDrop({ text, onDone }: { text: string; onDone: () => void }) {
  const top = useTopInset()
  const still = useReducedMotion()
  const t = React.useRef(new Animated.Value(still ? 1 : 0)).current
  const done = React.useRef(onDone)
  done.current = onDone

  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility(text)
    if (still) {
      t.setValue(1)
      const timer = setTimeout(() => done.current(), IN_MS + HOLD_MS)
      return () => clearTimeout(timer)
    }
    const run = Animated.sequence([
      Animated.timing(t, { toValue: 1, duration: IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      Animated.delay(HOLD_MS),
      Animated.timing(t, { toValue: 2, duration: OUT_MS, easing: Easing.in(Easing.quad), useNativeDriver: native }),
    ])
    run.start(({ finished }) => finished && done.current())
    return () => run.stop()
  }, [still, t, text])

  // 0 to 1 drops in and appears; 1 to 2 fades away where it stands.
  const opacity = t.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] })
  const translateY = still ? 0 : t.interpolate({ inputRange: [0, 1, 2], outputRange: [-12, 0, 0] })

  return (
    <View style={[styles.layer, { top: top + 8 }]} pointerEvents="none">
      <Animated.View style={{ opacity, transform: [{ translateY }] }} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Toast text={text} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  layer: { position: "absolute", left: 0, right: 0, alignItems: "center", paddingHorizontal: space.gutter, zIndex: 1000, elevation: 1000 },
  // Frontline's toast as a pill: Grey/10, 12 inside, the check 8 from the
  // words, its word 14 medium as a Figma "Hol" row title. Flat, like every
  // pill in the app: no shadow. The check is Phosphor, as every icon in
  // the Hol content is; Success/07 behind it.
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inline,
    maxWidth: 420,
    minHeight: 44,
    paddingVertical: space.compact,
    paddingLeft: space.compact,
    paddingRight: space.card,
    borderRadius: buttonRadius,
    backgroundColor: surface.toast,
  },
  check: { width: 18, height: 18, borderRadius: 9, backgroundColor: color.ok, alignItems: "center", justifyContent: "center" },
  text: { flexShrink: 1, ...type.title, color: ink.onColor },
})
