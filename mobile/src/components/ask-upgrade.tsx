import * as React from "react"
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from "react-native"

import { ArrowRight, Lightning, Sparkle } from "@/components/ph"
import { cardRadius, color, font, ink, space, type } from "@/lib/theme"

/* The upgrade nudge above the Ask Inlay composer, for the free record: one
   compact row on the green mesh image (assets/images/upgrade-card-bg.png). A soft green lightning bolt sits in a glowing ring and tilts,
   two sparkles twinkle, and the white button breathes. The whole card
   opens the plan. */

const MINT = "#B6F2D8"
const BACKGROUND = require("../../assets/images/upgrade-card-bg.png")

/** A 0 to 1 loop, offset by `delay`, easing both ways. */
function useLoop(duration: number, delay = 0, rest = 0) {
  const v = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(rest),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [v, duration, delay, rest])
  return v
}

export function AskUpgrade({ onPress }: { onPress: () => void }) {
  const glow = useLoop(1100)
  const button = useLoop(900, 0, 1200)
  const twinkleA = useLoop(700, 0, 600)
  const twinkleB = useLoop(700, 450, 600)

  const ring = { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }), transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] }
  const bolt = { transform: [{ rotate: glow.interpolate({ inputRange: [0, 1], outputRange: ["-8deg", "8deg"] }) }] }
  const press = { transform: [{ scale: button.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) }] }
  const twinkle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) }],
  })

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Upgrade for more AI credit and a personalized plan"
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <Image source={BACKGROUND} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View style={styles.icon}>
          <Animated.View style={[styles.ring, ring]} />
          <View style={styles.disc}>
            <Animated.View style={bolt}>
              <Lightning size={18} weight="fill" color="#0B5F4F" />
            </Animated.View>
          </View>
          <Animated.View style={[styles.sparkA, twinkle(twinkleA)]}>
            <Sparkle size={10} weight="fill" color="#FFFFFF" />
          </Animated.View>
          <Animated.View style={[styles.sparkB, twinkle(twinkleB)]}>
            <Sparkle size={8} weight="fill" color={MINT} />
          </Animated.View>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          Unlock more AI credit and a personalized plan
        </Text>
        <Animated.View style={[styles.button, press]}>
          <Text style={styles.buttonText}>Upgrade</Text>
          <ArrowRight size={14} weight="bold" color={ink.primary} />
        </Animated.View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: space.gutter, marginBottom: space.inline },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lead,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: cardRadius,
    overflow: "hidden",
    backgroundColor: "#00806F",
  },
  pressed: { opacity: 0.92 },
  icon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 34, height: 34, borderRadius: 17, backgroundColor: MINT },
  disc: { width: 34, height: 34, borderRadius: 17, backgroundColor: MINT, alignItems: "center", justifyContent: "center" },
  sparkA: { position: "absolute", top: -2, right: -3 },
  sparkB: { position: "absolute", bottom: -1, left: -4 },
  title: { ...type.title, flex: 1, color: ink.onColor, fontSize: 13, lineHeight: 18 },
  button: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: color.background,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  buttonText: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: ink.primary },
})
