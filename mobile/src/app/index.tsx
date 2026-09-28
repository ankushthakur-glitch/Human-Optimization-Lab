import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { Badge, Section } from "@/components/flow"
import { BodyLegend, BodyMap, LabTube, PlanBook, RecordSheet } from "@/components/home-art"
import { IconChevronRight, IconSparkle } from "@/components/icons"
import { TabScreen } from "@/components/tab-bar"
import { Button } from "@/components/ui"
import { useAuth } from "@/lib/auth"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { programName, recommend } from "@/lib/plans"
import { FINDINGS, HOL_SCORE, LABS_IN_RANGE, LATEST_LABS } from "@/lib/record"
import { color, font } from "@/lib/theme"

/* The dashboard a patient lands on once their record is built, after
   Superpower's home but on HOL's own data: the body with each system glowing
   by its results, the HOL score and labs in range, the latest lab panel, the
   plan and the record, the programs in focus, then the results that need
   attention. The first of the four tabs. */

export default function DashboardScreen() {
  const { signOut, forget } = useAuth()
  const { membership, profile, reset } = useOnboarding()
  const suggested = React.useMemo(recommend, [])
  const name = profile?.preferredName || profile?.firstName || PATIENT.firstName
  const initials = `${PATIENT.firstName[0]}${PATIENT.lastName[0]}`
  const member = membership?.tier === "optimization"
  const focus = member ? membership.programs : suggested.map((r) => r.program)

  return (
    <TabScreen tab="home">
      <View style={styles.head}>
        <Text style={styles.hello} accessibilityRole="header">
          Welcome back,{"\n"}
          {name}
        </Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      {/* The body, with the two numbers set over its faded waist. */}
      <Pressable onPress={() => router.replace("/results")} accessibilityRole="button" style={styles.body}>
        <BodyMap width={300} />
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {HOL_SCORE}
              <Text style={styles.statOf}>/100</Text>
            </Text>
            <Text style={styles.statLabel}>HOL score</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {LABS_IN_RANGE.inRange}
              <Text style={styles.statOf}>/{LABS_IN_RANGE.total}</Text>
            </Text>
            <Text style={styles.statLabel}>Labs in range</Text>
          </View>
        </View>
      </Pressable>
      <BodyLegend />

      <Pressable
        onPress={() => router.replace("/results")}
        accessibilityRole="button"
        style={({ pressed }) => [styles.labs, pressed && styles.pressed]}
      >
        <View style={styles.labsArt}>
          <LabTube size={40} />
        </View>
        <View style={styles.labsBody}>
          <Text style={styles.labsTitle}>Your latest labs are in</Text>
          <Text style={styles.labsMeta}>
            {LATEST_LABS.source}, {LATEST_LABS.date}
          </Text>
        </View>
        <IconChevronRight color={color.muted} />
      </Pressable>

      <View style={styles.tiles}>
        <Pressable
          onPress={() => router.replace("/plan")}
          accessibilityRole="button"
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        >
          <View style={styles.tileHead}>
            <Text style={styles.tileTitle}>Action plan</Text>
            <IconChevronRight size={16} color={color.muted} />
          </View>
          <PlanBook programs={focus.length} />
        </Pressable>
        <Pressable
          onPress={() => router.replace("/results")}
          accessibilityRole="button"
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        >
          <View style={styles.tileHead}>
            <Text style={styles.tileTitle}>Health record</Text>
            <IconChevronRight size={16} color={color.muted} />
          </View>
          <RecordSheet />
        </Pressable>
      </View>

      <Section title="Your focus">
        <View style={styles.chips}>
          {focus.map((p) => (
            <Pressable
              key={p}
              onPress={() => (member ? router.replace("/plan") : router.push("/plans"))}
              accessibilityRole="button"
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            >
              <View style={styles.chipIcon}>
                <IconSparkle color={color.primary} size={12} />
              </View>
              <Text style={styles.chipText}>{programName(p)}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

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
    </TabScreen>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },

  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  hello: { flex: 1, fontFamily: font.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: color.text },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.canvas,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.semibold, fontSize: 15, color: color.text },

  body: { alignItems: "center", marginTop: -12, marginBottom: -20 },
  stats: { position: "absolute", left: 8, right: 8, bottom: 16, flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "center", gap: 2, minWidth: 100 },
  statValue: { fontFamily: font.semibold, fontSize: 30, letterSpacing: -0.8, color: color.text },
  statOf: { fontFamily: font.regular, fontSize: 15, letterSpacing: 0, color: color.muted },
  statLabel: { fontFamily: font.regular, fontSize: 13, color: color.muted },

  labs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: color.primaryHalo,
    borderRadius: 20,
    padding: 12,
    backgroundColor: color.background,
  },
  labsArt: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: color.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  labsBody: { flex: 1, gap: 2 },
  labsTitle: { fontFamily: font.semibold, fontSize: 16, color: color.text },
  labsMeta: { fontFamily: font.regular, fontSize: 13, color: color.muted },

  tiles: { flexDirection: "row", gap: 12, marginTop: -8 },
  tile: {
    flex: 1,
    backgroundColor: color.canvas,
    borderRadius: 20,
    paddingTop: 14,
    gap: 14,
    overflow: "hidden",
  },
  tileHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14 },
  tileTitle: { fontFamily: font.semibold, fontSize: 15, color: color.text },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 999,
    paddingLeft: 6,
    paddingRight: 14,
    paddingVertical: 6,
  },
  chipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: color.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontFamily: font.medium, fontSize: 14, color: color.text },

  list: { borderWidth: 1, borderColor: color.border, borderRadius: 18, paddingHorizontal: 14 },
  rule: { borderBottomWidth: 1, borderBottomColor: color.border },
  finding: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  flag: { width: 4, alignSelf: "stretch", borderRadius: 2 },
  findingBody: { flex: 1, gap: 2 },
  findingName: { fontFamily: font.medium, fontSize: 15, color: color.text },
  findingMeta: { fontFamily: font.regular, fontSize: 12, color: color.muted },
  findingRight: { alignItems: "flex-end", gap: 4 },
  findingValue: { fontFamily: font.semibold, fontSize: 15, color: color.text },

  actions: { gap: 10 },
})
