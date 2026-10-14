import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { Barbell, CaretLeft, CheckCircle, FileText, Flask, Scales, Trophy, Drop } from "@/components/ph"
import { StepBar } from "@/components/step-bar"
import { HUE, type Hue, type Tone } from "@/components/record-kit"
import { useOnboarding } from "@/lib/onboarding"
import { useSetupStep } from "@/lib/setup"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* Stage 01 · Enroll & Set Up, screen 3 of 26, "Your Data Insights" (Patient
   Journey deck, "The record says the goal is right"): each goal she chose,
   checked against her own longitudinal record. It confirms a decision she
   has already made rather than selling her one. Every card cites where the
   evidence came from and when. No DEXA result is claimed: she has none at
   enrollment, which is why it is first on the testing list on the next
   screen. Step 2 of 5. The words and figures are the deck's. */

/** The set-up is five screens (deck screens 2 to 6), as on the goals screen. */
const STEPS = 5
const STEP = 2

type Insight = {
  /** The goal's label as the goals screen saves it in `intake.goals`. */
  goal: string
  title: string
  Icon: typeof Drop
  hue: Hue
  status: { tone: Tone; word: string }
  text: string
  /** Where the evidence came from and when. */
  source: string
}

const INSIGHTS: Insight[] = [
  {
    goal: "Improve metabolic health (blood sugar, A1C)",
    title: "Improve metabolic health",
    Icon: Drop,
    hue: "blue",
    status: { tone: "ok", word: "Confirmed" },
    text: "Your A1C has risen from 5.6 to 5.9 over the last six months. That is the trend this goal is aimed at.",
    source: "Last 3 blood panels · most recent May 21, 2026",
  },
  {
    goal: "Lose weight / reduce body fat",
    title: "Lose weight / reduce body fat",
    Icon: Scales,
    hue: "teal",
    status: { tone: "ok", word: "Confirmed" },
    text: "Your glucose, triglycerides (142 mg/dL) and blood pressure (134/82) all sit above range. Weight loss is the one change that moves all three.",
    source: "Blood panel and vitals · May 21, 2026",
  },
  {
    goal: "Gain or preserve muscle",
    title: "Gain or preserve muscle",
    Icon: Barbell,
    hue: "violet",
    status: { tone: "soon", word: "Test needed" },
    text: "We hold no body-composition result for you. A DEXA scan is what confirms muscle is holding while weight comes off — it is first on your testing list.",
    source: "No body composition on record",
  },
]

export default function InsightsScreen() {
  const onboarding = useOnboarding()
  const { finish } = useSetupStep("insights")

  // The goals she chose on the last screen; when none of them has a card yet (or she has chosen none), the deck's three.
  const chosen = onboarding.intake?.goals
  const matched = Array.isArray(chosen) ? INSIGHTS.filter((i) => chosen.includes(i.goal)) : []
  const shown = matched.length > 0 ? matched : INSIGHTS

  return (
    <FlowScreen
      page
      fixed={
        <>
          <StepBar step={STEP} steps={STEPS} />
          <View style={styles.intro}>
            <Text style={styles.title} accessibilityRole="header">
              Your record supports these goals
            </Text>
            <Text style={styles.lead}>Every goal you chose, checked against your longitudinal health record.</Text>
          </View>
        </>
      }
      title="Your data insights"
      footer={
        <View style={styles.actions}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <CaretLeft size={16} color={ink.content} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={styles.continue}>
            <PrimaryButton onPress={() => finish()}>Continue</PrimaryButton>
          </View>
        </View>
      }
    >
      <View style={styles.list}>
        {shown.map(({ goal, title, Icon, hue, status, text, source }) => {
          const done = status.tone === "ok"
          const look = done ? HUE.green : HUE.amber
          const StatusIcon = done ? CheckCircle : Flask
          return (
            <View key={goal} style={styles.card} accessible accessibilityLabel={`${title}. ${status.word}. Why this matters: ${text} ${source}.`}>
              <View style={styles.top}>
                <View style={[styles.status, { backgroundColor: look.tint }]}>
                  <StatusIcon size={14} color={look.ink} weight="fill" />
                  <Text style={[styles.statusText, { color: look.ink }]}>{status.word}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: HUE[hue].tint }]}>
                  <Icon size={22} color={HUE[hue].ink} />
                </View>
              </View>
              <Text style={styles.name}>{title}</Text>
              <View style={styles.why}>
                <Text style={styles.whyText}>Why this matters</Text>
              </View>
              <Text style={styles.text}>{text}</Text>
              <View style={styles.source}>
                <FileText size={13} color={ink.tertiary} />
                <Text style={styles.sourceText}>{source}</Text>
              </View>
            </View>
          )
        })}
      </View>

      <View style={styles.note}>
        <Trophy size={20} color={HUE.amber.ink} weight="fill" />
        <Text style={styles.noteTitle}>Your goals + your health data = a personalized optimization plan.</Text>
        <Text style={styles.noteText}>You’re in control. You can adjust your goals at any time.</Text>
      </View>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  intro: { gap: space.inline },
  title: { fontFamily: font.medium, fontSize: 24, lineHeight: 30, color: ink.strong },
  lead: { ...type.body },
  list: { gap: space.item },
  card: {
    gap: space.item,
    padding: space.card + 2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  status: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  statusText: { fontFamily: font.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: "uppercase" },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: font.medium, fontSize: 20, lineHeight: 26, color: ink.strong },
  why: { alignSelf: "stretch", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: color.primaryTint },
  whyText: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: ink.primary },
  text: { ...type.body },
  source: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 2 },
  sourceText: { ...type.meta, flex: 1 },
  note: { alignItems: "center", gap: space.inline, paddingVertical: space.card, paddingHorizontal: space.card },
  noteTitle: { ...type.title, color: ink.primary, textAlign: "center" },
  noteText: { ...type.body, textAlign: "center" },
  actions: { flexDirection: "row", alignItems: "center", gap: space.item },
  back: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 42, paddingRight: space.item },
  backText: { ...type.title },
  continue: { flex: 1 },
  pressed: { opacity: 0.6 },
})
