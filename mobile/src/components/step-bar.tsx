import { StyleSheet, View } from "react-native"

import { color } from "@/lib/theme"

/** The set-up's progress as one pill per step: the steps done and the one
    she is on are solid, the ones ahead a pale tint of the same colour. One
    progress bar to a screen reader ("Step 3 of 5"), the pills hidden from it. */
export function StepBar({ step, steps }: { step: number; steps: number }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`Step ${step} of ${steps}`} accessibilityValue={{ min: 1, max: steps, now: step }} style={styles.bar}>
      {Array.from({ length: steps }, (_, i) => (
        <View key={i} importantForAccessibility="no" style={[styles.pill, i < step ? styles.done : styles.ahead]} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", gap: 8 },
  pill: { flex: 1, height: 6, borderRadius: 3 },
  done: { backgroundColor: color.primary },
  ahead: { backgroundColor: color.primary, opacity: 0.2 },
})
