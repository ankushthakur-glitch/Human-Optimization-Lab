import { router } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { Barbell, Brain, CaretRight, ForkKnife, Moon, Pill, Ruler } from "@/components/ph"
import { Card } from "@/components/record-kit"
import { useMarkers } from "@/lib/experience"
import { MEMBER } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { ADDS, SIX_STEPS, matchPlans, type PlanMatch, type SixStep } from "@/lib/plan-match"
import { color, font, hairline, ink, space, type } from "@/lib/theme"
import { watchList } from "@/lib/trends"

/* The upgrade page's top (reference from Fynn's team, 16 Oct 2026; more
   white space between and inside the blocks, 19 Oct). Since 26 Oct there
   is no plan to pick: every plan has the same six steps and AI adds to
   them from her record. The step grid (picked by the user, 26 Oct 2026):
   "Welcome, Liv", the six steps as a 3 by 2 grid where a step her numbers
   add to is filled teal with "+n", then "Added from your numbers", one
   row each with the focus, its step and the number it came from, then
   one line that her physician reviews the tests and the plan first. The
   pinned "Start my optimization plan" (ShowroomActions) stays the one
   action.

   States:
   - one to three additions: the steps they sit in are filled;
   - none: her record is in range, no step is filled and a calm note
     replaces the rows; the six steps still make her plan;
   - no results yet: nothing has been read, so a note replaces the rows;
   - she had a plan before: "Welcome back, Liv". */

/** One icon per step, shared with the six steps page (/goal-plans). */
export const STEP_ICON: Record<SixStep, typeof Barbell> = {
  Exercise: Barbell,
  Eat: ForkKnife,
  Sleep: Moon,
  Mind: Brain,
  Medication: Pill,
  Measure: Ruler,
}

/** What her record adds to the six steps, and whether there are markers to read. */
export function usePlanMatches() {
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const matches = matchPlans(watchList(markers, { improve: onboarding.why?.improve }).filter((t) => t.latest))
  return { matches, noResults: markers.length === 0 }
}

export function PlanMatchSection() {
  const onboarding = useOnboarding()
  const { matches, noResults } = usePlanMatches()

  const name = onboarding.profile?.preferredName || onboarding.profile?.firstName || PATIENT.firstName
  const returning = !!onboarding.membership?.cancelledAt || !!onboarding.planHistory?.length
  const added = (step: SixStep) => matches.filter((m) => ADDS[m.kind].step === step).length

  return (
    <View style={styles.root}>
      <View style={styles.welcome}>
        <Text style={styles.title} accessibilityRole="header">
          {returning ? `Welcome back, ${name}` : `Welcome, ${name}`}
        </Text>
        <Text style={styles.lead}>Your plan, built from your record.</Text>
      </View>

      <View style={styles.grid}>
        {SIX_STEPS.map((step) => {
          const n = added(step)
          const Icon = STEP_ICON[step]
          return (
            <View key={step} style={styles.cell}>
              <View style={[styles.step, n > 0 && styles.stepOn]} accessible accessibilityLabel={n ? `${step}, ${n} added from your numbers` : step}>
                <Icon size={22} color={n ? color.onPrimary : ink.tertiary} />
                <Text style={[styles.stepName, n > 0 && styles.stepNameOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                  {step}
                </Text>
                {n > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{`+${n}`}</Text>
                  </View>
                )}
              </View>
            </View>
          )
        })}
      </View>

      {noResults ? (
        <Card style={styles.note}>
          <Text style={styles.noteTitle}>Nothing read yet</Text>
          <Text style={styles.body}>Your record has no results yet, so nothing has been added. Your plan starts with the six steps.</Text>
        </Card>
      ) : matches.length === 0 ? (
        <Card style={styles.note}>
          <Text style={styles.noteTitle}>Your record is in range</Text>
          <Text style={styles.body}>None of your numbers needs a focus of its own today. Your plan starts with the six steps.</Text>
        </Card>
      ) : (
        <View style={styles.rowsBlock}>
          <Text style={styles.heading} accessibilityRole="header">
            Added from your numbers
          </Text>
          <View style={styles.rows}>
            {matches.map((m, i) => (
              <MatchRow key={m.kind + m.markerId} m={m} rule={i > 0} />
            ))}
          </View>
        </View>
      )}

      <Text style={styles.reviewText}>{`${MEMBER.doctorShort} reviews your tests and your plan before anything starts.`}</Text>
    </View>
  )
}

/** One addition: the focus and its step, then the number it came from with
    how it has moved in red; the row opens that marker. */
function MatchRow({ m, rule }: { m: PlanMatch; rule: boolean }) {
  const adds = ADDS[m.kind]
  // "LDL 162 · up 34 since Apr 2022": the move ("up 34") is the red part.
  const [value, moved = ""] = m.matchedOn.replace(/^Matched on /, "").split(" · ")
  const change = moved.match(/^(up|down) [\d.,]+/)?.[0] ?? ""
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/biomarker/[id]", params: { id: m.markerId } })}
      accessibilityRole="button"
      accessibilityLabel={`${adds.focus}, in ${adds.step}. ${value}${moved ? `, ${moved}` : ""}`}
      style={({ pressed }) => [styles.row, rule && styles.rowRule, pressed && styles.pressed]}
    >
      <View style={styles.rowWords}>
        <Text style={styles.rowName} numberOfLines={1}>
          {adds.focus}
          <Text style={styles.rowStep}>{` in ${adds.step}`}</Text>
        </Text>
        <Text style={styles.matchedText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {value}
          {moved ? " · " : ""}
          <Text style={styles.moved}>{change}</Text>
          {moved.slice(change.length)}
        </Text>
      </View>
      <CaretRight size={16} color={ink.tertiary} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { gap: space.section - 2 },
  welcome: { gap: space.inline },
  title: { ...type.display, fontSize: 18, lineHeight: 24 },
  lead: { ...type.body, fontSize: 14, lineHeight: 21, color: ink.detail },

  // Three steps a row; a step her numbers add to is filled teal.
  grid: { flexDirection: "row", flexWrap: "wrap", margin: -5 },
  cell: { width: "33.333%", padding: 5 },
  step: { gap: space.inline + 2, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 18, backgroundColor: color.background },
  stepOn: { backgroundColor: color.primary },
  stepName: { ...type.title, fontSize: 14, lineHeight: 19, color: ink.strong },
  stepNameOn: { fontFamily: font.semibold, color: color.onPrimary },
  badge: { position: "absolute", top: 10, right: 10, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: color.background },
  badgeText: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14, color: color.primaryText },

  rowsBlock: { gap: space.item },
  heading: { ...type.section, fontSize: 15, lineHeight: 20 },
  rows: { borderRadius: 20, backgroundColor: color.background, paddingHorizontal: space.item + 2 },
  row: { flexDirection: "row", alignItems: "center", gap: space.item, paddingVertical: space.item },
  rowRule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  rowWords: { flex: 1, gap: 3 },
  rowName: { ...type.title, fontSize: 15, lineHeight: 20, color: ink.strong },
  rowStep: { fontFamily: font.regular, color: ink.detail },
  matchedText: { ...type.label, fontSize: 12, lineHeight: 16, flexShrink: 1, color: ink.detail },
  moved: { color: color.high },
  pressed: { opacity: 0.7 },

  note: { gap: space.stack, padding: space.item + 4 },
  noteTitle: { ...type.section },
  body: { ...type.body },

  // Her physician comes before anything starts: one teal line.
  reviewText: { ...type.label, fontSize: 13, lineHeight: 19, fontFamily: font.medium, color: color.primaryText },
})
