import { router } from "expo-router"
import * as React from "react"
import { Image, Pressable, StyleSheet, Text, View } from "react-native"

import { Badge, Section } from "@/components/flow"
import { IconChevronRight, IconSparkle } from "@/components/icons"
import { TabScreen } from "@/components/tab-bar"
import { Button } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { TIERS, programName, recommend } from "@/lib/plans"
import { color, font } from "@/lib/theme"

/* Plan: the patient's membership and programs once they have one; before
   that, what the record suggests, and the assistant for help choosing. */

const MARK = require("../../assets/splash-icon.png")

export default function PlanScreen() {
  const { membership } = useOnboarding()
  const suggested = React.useMemo(recommend, [])
  const member = membership?.tier === "optimization"
  const programs = member ? membership.programs : suggested.map((r) => r.program)

  return (
    <TabScreen tab="plan" title="Plan">
      {member ? (
        <View style={styles.current}>
          <View style={styles.currentHead}>
            <View style={styles.currentIcon}>
              <IconSparkle color={color.onPrimary} size={18} />
            </View>
            <View style={styles.currentBody}>
              <Text style={styles.currentName}>{TIERS.optimization.name}</Text>
              <Text style={styles.currentMeta}>
                {TIERS.optimization.price} {TIERS.optimization.per}
              </Text>
            </View>
            <Badge>Active</Badge>
          </View>
        </View>
      ) : null}

      <Section title={member ? "Your programs" : "Suggested for you"}>
        <View style={styles.list}>
          {programs.map((p, i) => {
            const why = suggested.find((r) => r.program === p)?.reasons
            return (
              <View key={p} style={[styles.row, i < programs.length - 1 && styles.rule]}>
                <View style={styles.tile}>
                  <IconSparkle color={color.primary} size={16} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowName}>{programName(p)}</Text>
                  {why && (
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {why.join(", ")}
                    </Text>
                  )}
                </View>
              </View>
            )
          })}
        </View>
        <Button variant={member ? "outline" : "primary"} onPress={() => router.push("/plans")}>
          {member ? "Change plan" : "See suggested plans"}
        </Button>
      </Section>

      <Pressable
        onPress={() => router.push("/assistant")}
        accessibilityRole="button"
        style={({ pressed }) => [styles.ask, pressed && styles.pressed]}
      >
        <Image source={MARK} style={styles.mark} resizeMode="contain" />
        <View style={styles.rowBody}>
          <Text style={styles.rowName}>Not sure which plan?</Text>
          <Text style={styles.rowMeta}>Tell the assistant what's bothering you</Text>
        </View>
        <IconChevronRight color={color.muted} />
      </Pressable>
    </TabScreen>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  current: { backgroundColor: color.primaryTint, borderRadius: 20, padding: 16 },
  currentHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  currentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  currentBody: { flex: 1, gap: 2 },
  currentName: { fontFamily: font.semibold, fontSize: 17, color: color.text },
  currentMeta: { fontFamily: font.regular, fontSize: 13, color: color.muted },

  list: { borderWidth: 1, borderColor: color.border, borderRadius: 18, paddingHorizontal: 14 },
  rule: { borderBottomWidth: 1, borderBottomColor: color.border },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  tile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: color.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1, gap: 2 },
  rowName: { fontFamily: font.medium, fontSize: 15, color: color.text },
  rowMeta: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.muted },

  ask: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.canvas,
    borderRadius: 18,
    padding: 14,
  },
  mark: { width: 32, height: 32 },
})
