import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { CaretRight, Drop, Flame, Heart, Info, Lock, Scales, Sparkle } from "@/components/ph"
import { Card, HUE, Tile, type Hue } from "@/components/record-kit"
import { useMarkers } from "@/lib/experience"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { COUNT_WORD, PLAN_AREAS, PLAN_COUNT, matchPlans, type PlanKind, type PlanMatch } from "@/lib/plan-match"
import { color, font, hairline, ink, space, type } from "@/lib/theme"
import { watchList } from "@/lib/trends"

/* The upgrade page's top (reference from Fynn's team, 16 Oct 2026): a
   welcome, then what the AI found. In order: "Welcome, Liv" and the one
   sentence of what was done for her; the AI PLAN MATCH card (all the plans
   on file, then how many her record supports); "The three your numbers
   point to", one row each with the numbers it was matched on; one quiet
   line on the rest, with "See all 81" opening the list in place; and the
   note that the physicians wrote every plan. The pinned "Build my
   personalized plan" (ShowroomActions) stays the one action.

   States:
   - three, two or one match: the count, the heading and the sentence on
     the rest follow it ("The two your numbers point to", "The other 79");
   - no match: her record is in range, so the card reads 0 and a calm note
     replaces the rows; the plan can still be built around her goals;
   - no results yet: nothing has been compared, so the card says so and
     the rows give way to a note;
   - she had a plan before: "Welcome back, Liv".
   The full list is closed to start with and opens and closes in place. */

const ICON: Record<PlanKind, { Icon: typeof Heart; hue: Hue }> = {
  metabolic: { Icon: Scales, hue: "teal" },
  lipid: { Icon: Heart, hue: "red" },
  insulin: { Icon: Drop, hue: "amber" },
  bone: { Icon: Sparkle, hue: "violet" },
  other: { Icon: Flame, hue: "amber" },
}

/** The areas the other plans sit in, minus those her record points to. */
const AREA_OF: Record<PlanKind, string> = { metabolic: "Metabolic & weight", lipid: "Lipid & cardiovascular", insulin: "Triglyceride & insulin", bone: "Bone strength", other: "" }

export function PlanMatchSection() {
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const [all, setAll] = React.useState(false)

  const name = onboarding.profile?.preferredName || onboarding.profile?.firstName || PATIENT.firstName
  const returning = !!onboarding.membership?.cancelledAt || !!onboarding.planHistory?.length
  const matches = matchPlans(watchList(markers, { improve: onboarding.why?.improve }).filter((t) => t.latest))
  const found = matches.length
  const rest = PLAN_COUNT - found
  const noResults = markers.length === 0

  const matchedAreas = new Set(matches.map((m) => AREA_OF[m.kind]))
  const otherAreas = PLAN_AREAS.filter((a) => !matchedAreas.has(a))

  return (
    <View style={styles.root}>
      <View style={styles.welcome}>
        <Text style={styles.title} accessibilityRole="header">
          {returning ? `Welcome back, ${name}` : `Welcome, ${name}`}
        </Text>
        <Text style={styles.lead} numberOfLines={2}>
          {`We have done the first step: your record was compared against all ${PLAN_COUNT} optimization plans we hold.`}
        </Text>
      </View>

      <View style={styles.match} accessible accessibilityLabel={`AI plan match. ${PLAN_COUNT} plans on file. ${found} your record supports.`}>
        <View style={styles.matchHead}>
          <Info size={14} color={color.primaryText} />
          <Text style={styles.matchLabel}>AI PLAN MATCH</Text>
        </View>
        <View style={styles.counts}>
          <View style={[styles.count, styles.countFile]}>
            <Text style={styles.countFigure}>{PLAN_COUNT}</Text>
            <Text style={styles.countWords}>plans on file</Text>
          </View>
          <CaretRight size={16} color={ink.tertiary} />
          <View style={[styles.count, styles.countFound]}>
            <Text style={[styles.countFigure, styles.onDark]}>{found}</Text>
            <Text style={[styles.countWords, styles.onDarkSoft]}>your record supports</Text>
          </View>
        </View>
      </View>

      {noResults ? (
        <Card style={styles.note}>
          <Text style={styles.noteTitle}>Nothing compared yet</Text>
          <Text style={styles.body}>Your record has no results yet, so no plan has been matched. You can still build a plan around your goals.</Text>
        </Card>
      ) : found === 0 ? (
        <Card style={styles.note}>
          <Text style={styles.noteTitle}>Your record is in range</Text>
          <Text style={styles.body}>None of the plans is a fit for your numbers today. You can still build a plan around your goals.</Text>
        </Card>
      ) : (
        <View style={styles.rowsBlock}>
          <Text style={styles.heading} accessibilityRole="header">
            {`The ${COUNT_WORD[found]} your numbers point to`}
          </Text>
          <View style={styles.rows}>
            {matches.map((m, i) => (
              <MatchRow key={m.kind + m.markerId} m={m} rule={i > 0} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.rest}>
        <View style={styles.restLine}>
          <View style={styles.restWords}>
            <Lock size={15} weight="bold" color={color.amber} />
            <Text style={styles.restText}>{noResults || found === 0 ? `All ${PLAN_COUNT} are not a fit today.` : `The other ${rest} are not a fit for your record today.`}</Text>
          </View>
          <Pressable onPress={() => setAll((v) => !v)} hitSlop={8} accessibilityRole="button" accessibilityState={{ expanded: all }} style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}>
            <Text style={styles.seeAllText}>{all ? "Show less" : `See all ${PLAN_COUNT}`}</Text>
            <CaretRight size={14} color={color.primaryText} style={all ? styles.open : undefined} />
          </Pressable>
        </View>
        {all && (
          <Card style={styles.full}>
            <Text style={styles.fullTitle}>{`All ${PLAN_COUNT} plans, by area`}</Text>
            {matches.map((m) => (
              <FullRow key={m.kind + m.markerId} label={AREA_OF[m.kind] || m.name} fit />
            ))}
            {otherAreas.map((a) => (
              <FullRow key={a} label={a} />
            ))}
          </Card>
        )}
      </View>

      <View style={styles.physicians} accessible accessibilityLabel="Every plan is a protocol our physicians wrote in advance. The AI selects. It does not invent one for you.">
        <Info size={15} color={color.primaryText} />
        <Text style={styles.physiciansText} numberOfLines={2}>Every plan is a protocol our physicians wrote in advance. The AI selects; it never invents one.</Text>
      </View>
    </View>
  )
}

/** One matched plan: its icon, its name, what it was matched on, and a
    chevron; the row opens the marker it was matched on. */
function MatchRow({ m, rule }: { m: PlanMatch; rule: boolean }) {
  const { Icon, hue } = ICON[m.kind]
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/biomarker/[id]", params: { id: m.markerId } })}
      accessibilityRole="button"
      accessibilityLabel={`${m.name}. ${m.matchedOn}`}
      style={({ pressed }) => [styles.row, rule && styles.rowRule, pressed && styles.pressed]}
    >
      <Tile hue={hue} size={34}>
        <Icon size={19} color={HUE[hue].ink} />
      </Tile>
      <View style={styles.rowWords}>
        <Text style={styles.rowName} numberOfLines={1}>{m.name}</Text>
        <Text style={styles.matchedText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{m.matchedOn.replace(/^Matched on /, "")}</Text>
      </View>
      <CaretRight size={16} color={ink.tertiary} />
    </Pressable>
  )
}

function FullRow({ label, fit }: { label: string; fit?: boolean }) {
  return (
    <View style={styles.fullRow} accessible accessibilityLabel={`${label}, ${fit ? "matched" : "not a fit today"}`}>
      <Text style={[styles.fullLabel, !fit && styles.fullMuted]}>{label}</Text>
      <Text style={[styles.fullState, fit && styles.fullFit]}>{fit ? "Matched" : "Not a fit today"}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  welcome: { gap: 4 },
  title: { ...type.display, fontSize: 18, lineHeight: 24 },
  lead: { ...type.body, fontSize: 14, lineHeight: 20, color: ink.detail },

  // The AI plan match card: mint, the two counts side by side.
  match: { gap: 8, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: "#CFE8E3", backgroundColor: "#E9F6F3" },
  matchHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  matchLabel: { fontFamily: font.semibold, fontSize: 11, lineHeight: 16, letterSpacing: 0.8, color: color.primaryText },
  counts: { flexDirection: "row", alignItems: "center", gap: 6 },
  count: { flex: 1, alignItems: "center", justifyContent: "center", gap: 0, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 12 },
  countFile: { backgroundColor: color.background },
  countFound: { backgroundColor: color.primary },
  countFigure: { ...type.display, fontSize: 26, lineHeight: 32 },
  countWords: { ...type.label, fontSize: 12, lineHeight: 16, textAlign: "center" },
  onDark: { color: color.onPrimary },
  onDarkSoft: { color: color.onPrimary, opacity: 0.85 },

  // The matched plans: a heading over one white card of rows.
  rowsBlock: { gap: 8 },
  heading: { ...type.section, fontSize: 15, lineHeight: 20 },
  rows: { borderRadius: 14, borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.background },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  rowRule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  rowWords: { flex: 1, gap: 1 },
  rowName: { ...type.title, fontSize: 14, lineHeight: 19, color: ink.strong },
  matchedText: { ...type.label, fontSize: 12, lineHeight: 16, flexShrink: 1, fontFamily: font.medium, color: color.ok },
  pressed: { opacity: 0.7 },

  note: { gap: space.stack, padding: space.item },
  noteTitle: { ...type.section },
  body: { ...type.body },

  rest: { gap: 8 },
  restLine: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: color.amberEdge, backgroundColor: color.amberTint },
  restWords: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  restText: { ...type.label, fontSize: 12, lineHeight: 16, flex: 1, fontFamily: font.medium, color: "#7A4210" },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, color: color.primaryText },
  open: { transform: [{ rotate: "90deg" }] },
  full: { gap: 0, paddingVertical: 4, paddingHorizontal: space.item },
  fullTitle: { ...type.sectionLabel, paddingVertical: 8 },
  fullRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item, paddingVertical: 10, borderTopWidth: 1, borderTopColor: hairline.rule },
  fullLabel: { ...type.title, flex: 1 },
  fullMuted: { color: ink.secondary },
  fullState: { ...type.label },
  fullFit: { fontFamily: font.semibold, color: color.ok },

  physicians: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#CFE8E3", backgroundColor: "#EEF6F4" },
  physiciansText: { ...type.body, flex: 1, fontSize: 12.5, lineHeight: 18, color: ink.content },
})
