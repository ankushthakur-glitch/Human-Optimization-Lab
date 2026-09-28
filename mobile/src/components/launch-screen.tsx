import * as React from "react"
import { Animated, Easing, Image, Platform, StyleSheet, Text, View } from "react-native"
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg"

import { color, font } from "@/lib/theme"

/* The launch screen, laid over the app while it loads. It opens exactly
   where the native splash (app.json: the mark 120 wide, centred on white)
   leaves off, so the hand over is invisible; then a soft teal glow blooms
   behind the mark, the mark lifts, the name fades in with a thin progress
   line, and the whole screen fades into the app once it's ready and has
   been seen long enough to read. */

const MARK = require("../../assets/splash-icon.png")
const MARK_SIZE = 120
/** Long enough for the sequence to read, short enough not to be a wait. */
const MIN_MS = 1700
const native = Platform.OS !== "web"

export function LaunchScreen({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const intro = React.useRef(new Animated.Value(0)).current
  const progress = React.useRef(new Animated.Value(0)).current
  const exit = React.useRef(new Animated.Value(1)).current
  const [seen, setSeen] = React.useState(false)

  React.useEffect(() => {
    Animated.timing(intro, {
      toValue: 1,
      duration: 900,
      delay: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: native,
    }).start()
    // Width can't use the native driver; the line is tiny, so JS is fine.
    Animated.timing(progress, {
      toValue: 1,
      // Fills just before the fade starts.
      duration: MIN_MS - 450,
      delay: 300,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start()
    const timer = setTimeout(() => setSeen(true), MIN_MS)
    return () => clearTimeout(timer)
  }, [intro, progress])

  React.useEffect(() => {
    if (!ready || !seen) return
    Animated.timing(exit, { toValue: 0, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: native }).start(
      ({ finished }) => finished && onDone()
    )
  }, [ready, seen, exit, onDone])

  const lift = intro.interpolate({ inputRange: [0, 1], outputRange: [0, -36] })
  const shrink = intro.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] })
  const glow = intro.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.15] })
  const rise = intro.interpolate({ inputRange: [0, 1], outputRange: [12, 0] })
  const textIn = intro.interpolate({ inputRange: [0.35, 1], outputRange: [0, 1], extrapolate: "clamp" })
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] })

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.screen, { opacity: exit }]}
      accessibilityLabel="Human Optimization Lab is loading"
      accessibilityRole="progressbar"
    >
      <View style={styles.centre}>
        <Animated.View style={[styles.glow, { opacity: intro, transform: [{ translateY: lift }, { scale: glow }] }]}>
          <Svg width={340} height={340} viewBox="0 0 340 340">
            <Defs>
              <RadialGradient id="launchGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={color.primary} stopOpacity={0.16} />
                <Stop offset="0.55" stopColor={color.primary} stopOpacity={0.06} />
                <Stop offset="1" stopColor={color.primary} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx="170" cy="170" r="170" fill="url(#launchGlow)" />
          </Svg>
        </Animated.View>
        <Animated.View style={{ transform: [{ translateY: lift }, { scale: shrink }] }}>
          <Image source={MARK} style={styles.mark} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={[styles.words, { opacity: textIn, transform: [{ translateY: rise }] }]}>
          <Text style={styles.name}>Human Optimization Lab</Text>
          <View style={styles.track}>
            <Animated.View style={[styles.bar, { width }]} />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: color.background, zIndex: 10 },
  // The mark sits dead centre, as the native splash draws it.
  centre: { flex: 1, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute" },
  mark: { width: MARK_SIZE, height: MARK_SIZE },
  words: { position: "absolute", top: "50%", marginTop: 44, alignItems: "center", gap: 18 },
  name: { fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: color.text },
  track: { width: 96, height: 3, borderRadius: 2, backgroundColor: color.border, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 2, backgroundColor: color.primary },
})
