import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { color, font, gutter } from "@/lib/theme"

/** A bottom sheet over the screen, for a confirmation (not a native modal,
    so the web build keeps it inside the drawn phone). */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { bottom } = useSafeAreaInsets()
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: Math.max(bottom - 12, 16) }]} accessibilityViewIsModal>
        <View style={styles.grabber} />
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {children}
      </View>
    </View>
  )
}

export const SheetText = ({ children }: { children: React.ReactNode }) => <Text style={styles.text}>{children}</Text>

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0, 0, 0, 0.3)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: gutter,
    paddingTop: 10,
    gap: 16,
  },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: color.border },
  title: { fontFamily: font.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5, color: color.text },
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.text },
})
