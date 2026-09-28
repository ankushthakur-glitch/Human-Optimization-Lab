import { router } from "expo-router"
import * as React from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { DarkStatusBar } from "@/components/error-state"
import { Badge, Section, SoftOrb } from "@/components/flow"
import { IconChevronRight, IconSparkle } from "@/components/icons"
import { RecordIcon } from "@/components/record-icons"
import { Button, useTopInset } from "@/components/ui"
import { useAuth } from "@/lib/auth"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { TIERS, programName, recommend } from "@/lib/plans"
import { DATA_TYPES, FINDINGS, SOURCES } from "@/lib/record"
import { color, font, gutter } from "@/lib/theme"

/* The dashboard a patient lands on once their record is built. The free
   record at a glance, the programs it suggests (which open the plans
   screen), then the results that need attention. A first cut: the tab bar
   and the other sections come next. */

const HIGHLIGHTS = ["conditions", "medications", "labs"] as const

export default function DashboardScreen() {
  const { signOut, forget } = useAuth()
  const { membership, profile, reset } = useOnboarding()
  const top = useTopInset()
  const { bottom } = useSafeAreaInsets()
  const suggested = React.useMemo(recommend, [])
  const total = DATA_TYPES.reduce((sum, t) => sum + t.count, 0)
  const name = profile?.preferredName || profile?.firstName || PATIENT.firstName
  const initials = `${PATIENT.firstName[0]}${PATIENT.lastName[0]}`
  const member = membership?.tier === "optimization"

  return (
    <View style={styles.screen}>
      <DarkStatusBar />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingTop: top + 16, paddingBottom: bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={styles.practice}>{PATIENT.practice}</Text>
            <Text style={styles.hello} accessibilityRole="header">
              Hi, {name}
            </Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        {/* The record, at a glance. */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroLabel}>Your health record</Text>
              <Text style={styles.heroValue}>{total}</Text>
              <Text style={styles.heroMeta}>records from {SOURCES.length} providers</Text>
            </View>
            <SoftOrb size={96} />
          </View>
          <View style={styles.heroStats}>
            {HIGHLIGHTS.map((key) => {
              const t = DATA_TYPES.find((d) => d.icon === key)!
              return (
                <View key={key} style={styles.heroStat}>
                  <RecordIcon name={key} size={18} color={color.primary} />
                  <Text style={styles.heroStatValue}>{t.count}</Text>
                  <Text style={styles.heroStatLabel}>{t.label}</Text>
                </View>
              )
            })}
          </View>
        </View>

        {member ? (
          <Section title="Your plan">
            <Pressable onPress={() => router.push("/plans")} style={({ pressed }) => [styles.plan, pressed && styles.pressed]}>
              <View style={styles.planIcon}>
                <IconSparkle color={color.onPrimary} size={18} />
              </View>
              <View style={styles.planBody}>
                <Text style={styles.planName}>{TIERS.optimization.name}</Text>
                <Text style={styles.planMeta}>{membership.programs.map(programName).join(", ")}</Text>
              </View>
              <IconChevronRight color={color.muted} />
            </Pressable>
          </Section>
        ) : (
          <Section
            title="Suggested for you"
            action={
              <Pressable onPress={() => router.push("/plans")} hitSlop={8} accessibilityRole="button">
                <Text style={styles.link}>See plans</Text>
              </Pressable>
            }
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.rail}
              contentContainerStyle={styles.railContent}
            >
              {suggested.map((r, i) => (
                <Pressable
                  key={r.program}
                  onPress={() => router.push("/plans")}
                  style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <View style={styles.suggestionTop}>
                    <View style={styles.sparkle}>
                      <IconSparkle color={color.primary} size={18} />
                    </View>
                    {i === 0 && <Badge>Top match</Badge>}
                  </View>
                  <Text style={styles.suggestionName}>{programName(r.program)}</Text>
                  <Text style={styles.suggestionReason} numberOfLines={2}>
                    {r.reasons.join(", ")}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Button onPress={() => router.push("/plans")}>See suggested plans</Button>
          </Section>
        )}

        <Section title="Needs attention" action={<Badge tone="high">{`${FINDINGS.length} results`}</Badge>}>
          <View style={styles.list}>
            {FINDINGS.map((f, i) => (
              <View key={f.id} style={[styles.finding, i < FINDINGS.length - 1 && styles.rule]}>
                <View style={[styles.flag, { backgroundColor: f.flag === "high" ? color.high : color.low }]} />
                <View style={styles.findingBody}>
                  <Text style={styles.findingName}>{f.name}</Text>
                  <Text style={styles.findingMeta}>Target {f.range}</Text>
                </View>
                <View style={styles.findingRight}>
                  <Text style={styles.findingValue}>{f.value}</Text>
                  <Badge tone={f.flag}>{f.flag === "high" ? "High" : "Low"}</Badge>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Account">
          <View style={styles.actions}>
            {/* Prototype reviews: start again as a first-time patient, from
                the one-time password in the invitation. */}
            <Button
              variant="outline"
              onPress={async () => {
                await reset()
                await forget()
              }}
            >
              Start over as a new patient
            </Button>
            <Button variant="outline" onPress={signOut}>
              Sign out
            </Button>
          </View>
        </Section>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  body: { width: "100%", maxWidth: 420 + gutter * 2, alignSelf: "center", paddingHorizontal: gutter, gap: 28 },
  pressed: { opacity: 0.85 },

  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  headText: { flex: 1, gap: 4 },
  practice: { fontFamily: font.medium, fontSize: 13, color: color.muted },
  hello: { fontFamily: font.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: color.text },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.semibold, fontSize: 15, color: color.primary },

  hero: { backgroundColor: color.canvas, borderRadius: 24, padding: 18, gap: 16 },
  heroTop: { flexDirection: "row", alignItems: "center" },
  heroCopy: { flex: 1, gap: 2 },
  heroLabel: { fontFamily: font.medium, fontSize: 14, color: color.muted },
  heroValue: { fontFamily: font.semibold, fontSize: 40, lineHeight: 46, letterSpacing: -1.2, color: color.text },
  heroMeta: { fontFamily: font.regular, fontSize: 14, color: color.muted },
  heroStats: { flexDirection: "row", gap: 8 },
  heroStat: { flex: 1, backgroundColor: color.background, borderRadius: 16, padding: 12, gap: 4 },
  heroStatValue: { fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: color.text, marginTop: 4 },
  heroStatLabel: { fontFamily: font.regular, fontSize: 12, color: color.muted },

  list: { borderWidth: 1, borderColor: color.border, borderRadius: 18, paddingHorizontal: 14 },
  rule: { borderBottomWidth: 1, borderBottomColor: color.border },
  finding: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  flag: { width: 4, alignSelf: "stretch", borderRadius: 2 },
  findingBody: { flex: 1, gap: 2 },
  findingName: { fontFamily: font.medium, fontSize: 15, color: color.text },
  findingMeta: { fontFamily: font.regular, fontSize: 12, color: color.muted },
  findingRight: { alignItems: "flex-end", gap: 4 },
  findingValue: { fontFamily: font.semibold, fontSize: 15, color: color.text },

  link: { fontFamily: font.semibold, fontSize: 14, color: color.primary },
  // The rail runs to the screen edges while its cards line up with the gutter.
  rail: { marginHorizontal: -gutter },
  railContent: { paddingHorizontal: gutter, gap: 10 },
  suggestion: {
    width: 220,
    backgroundColor: color.background,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  suggestionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sparkle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: color.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionName: { fontFamily: font.semibold, fontSize: 16, letterSpacing: -0.2, color: color.text, marginTop: 4 },
  suggestionReason: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.muted },

  plan: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.primaryTint,
    borderRadius: 18,
    padding: 14,
  },
  planIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  planBody: { flex: 1, gap: 2 },
  planName: { fontFamily: font.semibold, fontSize: 16, color: color.text },
  planMeta: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.muted },

  actions: { gap: 10 },
})
