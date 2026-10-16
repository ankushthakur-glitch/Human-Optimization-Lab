import { router } from "expo-router"
import { StyleSheet, Text, View } from "react-native"

import { goalOf, type Goal } from "@/components/goal-list"
import { PlanStepPage } from "@/components/plan-steps"
import { ClipboardText } from "@/components/ph"
import { HUE, Tag, type Tone } from "@/components/record-kit"
import { useMarkers } from "@/lib/experience"
import { useOnboarding } from "@/lib/onboarding"
import type { Biomarker, Point } from "@/lib/record"
import { EVIDENCE } from "@/lib/record-goals"
import { pointSide, valueText, withUnit } from "@/lib/trends"
import { color, hairline, ink, space, type } from "@/lib/theme"

/* Step 2 of the plan's set-up (Journey_7 screen 3, "The record says the
   goal is right"): opens after the goals are chosen. Every chosen goal is
   checked against the patient's own record and says what it found and
   where from, so the plan confirms a choice already made rather than
   selling one. A goal the record can't speak to says which test would,
   or that the plan tracks it from the start. Continue opens step 3, her
   health profile as the record has it (/health-profile). */

type Finding = { tag: string; tone: Tone; says: string; source: string }

const nameOf = (b: Biomarker) => b.short ?? b.name
const latestOf = (b: Biomarker): Point | undefined =>
  b.points[b.points.length - 1]
const listOf = (words: string[]) =>
  words.length < 2
    ? words.join("")
    : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`

/** What the record says about one goal. */
function findingOf(goal: Goal, markers: Biomarker[]): Finding {
  const rule = EVIDENCE.find((e) => e.words.test(goal.label.toLowerCase()))
  if (rule?.test === "body composition")
    return {
      tag: "Test needed",
      tone: "soon",
      says: "No body composition result yet. A DEXA scan is first on your testing list.",
      source: "No body composition on record",
    }
  if (rule?.test === "bone density")
    return {
      tag: "Test needed",
      tone: "soon",
      says: "No bone density result yet. A DEXA scan is on your testing list.",
      source: "No bone density on record",
    }

  const found = (rule?.markers ?? [])
    .map((id) => markers.find((m) => m.id === id))
    .filter((m): m is Biomarker => !!m && !!latestOf(m))
  if (!found.length)
    return {
      tag: "Your goal",
      tone: "primary",
      says: "Nothing on record yet. Your plan tracks it from week one.",
      source: "From your answers",
    }

  const latest = latestOf(found[0])!
  const when = latest.date
  const above = found.filter((m) => pointSide(m, latestOf(m)!) === "above")

  // One result rising over time says it best ("A1c has risen from 5.6 to 5.9").
  if (above.length && found.length <= 2) {
    const m = above[0]
    const pts = m.points.slice(-3)
    const first = pts[0]
    const last = latestOf(m)!
    const rose = pts.length > 1 && last.value > first.value
    return {
      tag: "Confirmed",
      tone: "ok",
      says: rose
        ? `Your ${nameOf(m)} has risen from ${valueText(m, first)} to ${valueText(m, last)}.`
        : `Your ${nameOf(m)} is above range at ${withUnit(m, valueText(m, last))}.`,
      source: `Last ${pts.length} results, most recent ${last.date}`,
    }
  }

  if (above.length) {
    return {
      tag: "Confirmed",
      tone: "ok",
      says: `Your ${listOf(above.map(nameOf))} ${above.length > 1 ? "are" : "is"} above range.`,
      source: `${found.some((m) => m.kind === "vital") ? "Blood panel and vitals" : "Blood panel"}, ${when}`,
    }
  }

  return {
    tag: "In range",
    tone: "muted",
    says: `Your ${listOf(found.map(nameOf))} ${found.length > 1 ? "are" : "is"} in range.`,
    source: `Blood panel, ${when}`,
  }
}

export default function GoalsRecordScreen() {
  const onboarding = useOnboarding()
  const markers = useMarkers()
  // Each goal once: a list saved with a repeat still draws cleanly.
  const goals = [...new Set(onboarding.goals ?? [])].map(goalOf)

  return (
    <PlanStepPage
      step={2}
      title="Your record supports these goals"
      lead="Every goal you chose, checked against your health record."
      onNext={() => router.push("/health-profile")}
    >
      {goals.map((g) => (
        <GoalCard key={g.label} goal={g} finding={findingOf(g, markers)} />
      ))}
    </PlanStepPage>
  )
}

/** One goal: its tinted icon, the name with its status beside it, what
    the record says, and where that came from under a rule. */
function GoalCard({ goal, finding }: { goal: Goal; finding: Finding }) {
  const Icon = goal.icon
  return (
    <View style={styles.card}>
      <View style={[styles.icon, { backgroundColor: HUE[goal.hue].tint }]}>
        <Icon size={16} color={HUE[goal.hue].ink} />
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.label}>{goal.label}</Text>
          <Tag tone={finding.tone}>{finding.tag}</Tag>
        </View>
        <Text style={styles.says}>{finding.says}</Text>
        <View style={styles.source}>
          <ClipboardText size={12} color={ink.tertiary} />
          <Text style={styles.sourceText} numberOfLines={1}>
            {finding.source}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.item,
    paddingVertical: space.card,
    paddingHorizontal: space.rowX,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: space.line },
  top: { flexDirection: "row", alignItems: "center", gap: space.inline, marginBottom: space.line },
  label: { ...type.title, flex: 1, color: ink.strong },
  says: { ...type.body },
  source: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.mark,
    marginTop: space.mark,
    paddingTop: space.inline,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: hairline.rule,
  },
  sourceText: { ...type.meta, flexShrink: 1 },
})
