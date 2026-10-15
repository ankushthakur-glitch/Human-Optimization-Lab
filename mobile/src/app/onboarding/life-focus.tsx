import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { DomainTile } from "@/components/life-kit"
import { PlanStepPage } from "@/components/plan-steps"
import { Check } from "@/components/ph"
import { useOnboarding } from "@/lib/onboarding"
import { DOING_WELL, DOMAINS, FOCUS_COUNT, type DomainKey } from "@/lib/wellbeing"
import { chart, color, font, hairline, ink, space, type } from "@/lib/theme"

/* Setup's life questions, page 3: what she has said so far, one bar for
   each part of life, and "Which three would you most like to improve?".
   She picks the three that matter most to her now, not the lowest numbers.
   Continue keeps them and starts the record building. */

export default function LifeFocusScreen() {
  const onboarding = useOnboarding()
  const ratings = onboarding.life?.ratings ?? {}
  const [picked, setPicked] = React.useState<DomainKey[]>(() => onboarding.life?.focus ?? [])
  const [pending, setPending] = React.useState(false)
  const full = picked.length === FOCUS_COUNT

  const toggle = (key: DomainKey) =>
    setPicked((p) => (p.includes(key) ? p.filter((x) => x !== key) : p.length < FOCUS_COUNT ? [...p, key] : p))

  async function next() {
    setPending(true)
    await onboarding.save({ life: { ...onboarding.life, ratings, focus: picked, skipped: false }, step: "records" })
    setPending(false)
    router.push("/onboarding/syncing")
  }

  return (
    <PlanStepPage
      headerTitle="About your life"
      title="Which three would you most like to improve?"
      onNext={next}
      nextDisabled={!full}
      nextPending={pending}
      nextWide
    >
      {DOMAINS.map((d) => {
        const value = ratings[d.key]
        const on = picked.includes(d.key)
        const locked = full && !on
        return (
          <Pressable
            key={d.key}
            onPress={() => toggle(d.key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on, disabled: locked }}
            accessibilityLabel={`${d.label}${value === undefined ? ", skipped" : `, ${value} out of 10`}`}
            style={({ pressed }) => [styles.row, on && styles.rowOn, locked && styles.locked, pressed && styles.pressed]}
          >
            <DomainTile domain={d.key} />
            <View style={styles.words}>
              <View style={styles.top}>
                <Text style={styles.label} numberOfLines={1}>
                  {d.label}
                </Text>
                <Text style={styles.value}>{value === undefined ? "–" : value}</Text>
              </View>
              <View style={styles.track}>
                {value !== undefined && (
                  <View style={[styles.bar, { width: `${Math.max(value * 10, 2)}%`, backgroundColor: value >= DOING_WELL ? color.primary : color.amber }]} />
                )}
              </View>
            </View>
            <View style={[styles.box, on && styles.boxOn]}>{on && <Check size={12} color={color.onPrimary} weight="bold" />}</View>
          </Pressable>
        )
      })}
    </PlanStepPage>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  locked: { opacity: 0.55 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lead,
    // Slim rows so all eight fit above Continue without scrolling.
    paddingHorizontal: space.card,
    paddingVertical: space.inline,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  rowOn: { borderColor: color.primary, backgroundColor: "#E5F4F1" },
  words: { flex: 1, gap: space.mark },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline },
  label: { ...type.title, flexShrink: 1 },
  value: { ...type.value, color: ink.detail },
  track: { height: 6, borderRadius: 3, backgroundColor: chart.track, overflow: "hidden" },
  bar: { height: 6, borderRadius: 3 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: hairline.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { borderColor: color.primary, backgroundColor: color.primary },
})
