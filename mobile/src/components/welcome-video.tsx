import * as React from "react"
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native"

import { FilmPlayer } from "@/components/film-player"
import { X } from "@/components/ph"
import { Button } from "@/components/ui"
import { color, font, ink, space } from "@/lib/theme"

/* The welcome video (2 Nov call): Dr. Blanchard's short video of the whole
   program, the AI in it, as a popup over Home the first time the patient
   reaches it (app/index.tsx), headed as the film opens: "What optimization
   gets you". It also serves doctors as the pitch. The clip is the welcome
   film (components/film-frames, 42 seconds) until the real one is made. It
   plays on opening, with the player's own controls; X and "Get started"
   close it for good. */

const native = Platform.OS !== "web"
export function WelcomeVideo({ onClose }: { onClose: () => void }) {
  const [enter] = React.useState(() => new Animated.Value(0))

  React.useEffect(() => {
    Animated.spring(enter, { toValue: 1, friction: 8, tension: 80, useNativeDriver: native }).start()
  }, [enter])

  return (
    <View style={styles.frame} accessibilityViewIsModal>
      <Animated.View style={[styles.scrim, { opacity: enter }]} />
      <Animated.View
        style={[
          styles.card,
          {
            opacity: enter,
            transform: [
              { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
              { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
            ],
          },
        ]}
      >
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            What optimization gets you
          </Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
            <X size={18} color={ink.secondary} weight="bold" />
          </Pressable>
        </View>

        <FilmPlayer film="welcome" autoplay label="What optimization gets you, a 42 second video" />

        <View style={styles.action}>
          <Button onPress={onClose}>Get started</Button>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  frame: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", paddingHorizontal: space.gutter, zIndex: 10 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0, 0, 0, 0.35)" },
  card: { width: "100%", maxWidth: 380, padding: space.gutter, borderRadius: 24, backgroundColor: color.background },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.item },
  title: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, color: ink.strong },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: color.surface },
  action: { marginTop: space.section },
})
