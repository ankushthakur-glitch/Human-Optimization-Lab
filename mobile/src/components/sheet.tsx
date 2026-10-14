import * as React from "react"
import { Animated, Easing, Keyboard, Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { X } from "@/components/ph"
import { color, font, hairline, ink, space } from "@/lib/theme"

/** A bottom sheet over the screen (not a native modal, so the web build
    keeps it inside the drawn phone). Figma "Hol" (5 Oct 2026): white, top
    corners 24, a header bar with the title and a round close button over a
    hairline, the content 16 in from the sides. `title` beside it takes a
    node too, e.g. a medicine's name and its badge. */
export function Sheet({
  title,
  titleRight,
  onClose,
  children,
}: {
  title: string
  /** Beside the title, e.g. an "Active" badge. */
  titleRight?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
}) {
  const { bottom } = useSafeAreaInsets()
  // Slides up from the bottom as it opens.
  const [height, setHeight] = React.useState(0)
  const progress = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => {
    if (!height) return
    const run = Animated.timing(progress, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== "web" })
    run.start()
    return () => run.stop()
  }, [height, progress])
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] })
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View
        style={[styles.sheet, { opacity: height ? 1 : 0, transform: [{ translateY }] }]}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
        accessibilityViewIsModal
      >
        <View style={styles.head}>
          <View style={styles.titleRow}>
            <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
              {title}
            </Text>
            {titleRight}
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <X size={20} color={ink.detail} />
          </Pressable>
        </View>
        <View style={[styles.body, { paddingBottom: Math.max(bottom, 24) }]}>{children}</View>
      </Animated.View>
    </View>
  )
}

/** The on-screen keyboard's height, 0 while it is down: a sheet with a
    field rides above it. */
export function useKeyboardHeight() {
  const [height, setHeight] = React.useState(0)
  React.useEffect(() => {
    const ios = Platform.OS === "ios"
    const show = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", (e) => setHeight(e.endCoordinates.height))
    const hide = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () => setHeight(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])
  return height
}

export const SheetText = ({ children }: { children: React.ReactNode }) => <Text style={styles.text}>{children}</Text>

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0, 0, 0, 0.3)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "90%",
    backgroundColor: color.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    boxShadow: "0 -2px 24px rgba(0, 0, 0, 0.12)",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    padding: space.gutter,
    borderBottomWidth: 1,
    borderBottomColor: hairline.edge,
  },
  titleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.inline },
  title: { flexShrink: 1, fontFamily: font.medium, fontSize: 16, lineHeight: 26, color: ink.content },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F7F7F7", alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.7 },
  body: { paddingHorizontal: space.gutter, paddingTop: space.gutter, gap: space.gutter },
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: ink.detail },
})
