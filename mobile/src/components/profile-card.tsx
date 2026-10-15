import { StyleSheet, View } from "react-native"

import { color } from "@/lib/theme"

/* The profile's progress bar (15 Oct 2026), drawn over the health questions
   (app/onboarding/why.tsx). The "Your profile is 2% complete" card that
   used to sit on both homes is gone: the questions now open from
   "Schedule my tests" on the enrolled page. */

/** The completion as one pill: teal for what is done, the pale tint of the
    same colour for what is left (the set-up's StepBar, as a continuous bar).
    One progress bar to a screen reader. */
export function ProgressBar({ percent }: { percent: number }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Profile completion" accessibilityValue={{ min: 0, max: 100, now: percent }} style={styles.track}>
      {/* A sliver at 0 so the bar still reads as a bar. */}
      <View importantForAccessibility="no" style={[styles.fill, { width: `${Math.max(percent, 2)}%` }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: color.primaryTint, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: color.primary },
})
