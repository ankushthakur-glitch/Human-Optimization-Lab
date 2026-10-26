import { router } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { CaretRight, Drop, Flame, Heart, Info, Plus, Scales, ShieldCheck, Sparkle } from "@/components/ph"
import { Card, HUE, Tile } from "@/components/record-kit"
import { useMarkers } from "@/lib/experience"
import { MEMBER } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { ADDS, COUNT_WORD, SHORT_NAME, SIX_STEPS, matchPlans, planHue, type PlanKind, type PlanMatch } from "@/lib/plan-match"
import { color, font, hairline, ink, space, type } from "@/lib/theme"
import { watchList } from "@/lib/trends"

/* The upgrade page's top (reference from Fynn's team, 16 Oct 2026; more
   white space between and inside the blocks, 19 Oct). Since 26 Oct there
   is no plan to pick: every plan has the same six steps and AI adds to
   them from her record. In order: "Welcome, Liv" and the one sentence of
   what was done for her; the AI plan builder card (the six steps, then how
   many her numbers add); "The three your numbers add", one row each with
   what it adds, the step it sits in and the number it came from; one
   line that her physician reviews the tests and the plan first. The
   pinned "Start my optimization plan" (ShowroomActions) stays the one
   action.

   States:
   - three, two or one addition: the count and the heading follow it
     ("The two your numbers add");
   - none: her record is in range, so the card reads 0 and a calm note
     replaces the rows; the six steps still make her plan;
   - no results yet: nothing has been read, so the card says so and the
     rows give way to a note;
   - she had a plan before: "Welcome back, Liv". */

const ICON: Record<PlanKind, typeof Heart> = {
  metabolic: Scales,
  lipid: Heart,
  insulin: Drop,
  bone: Sparkle,
  other: Flame,
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
  const found = matches.length

  return (
    <View style={styles.root}>
      <View style={styles.welcome}>
        <Text style={styles.title} accessibilityRole="header">
          {returning ? `Welcome back, ${name}` : `Welcome, ${name}`}
        </Text>
        <Text style={styles.lead} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>
          Your record was read to build your plan.
        </Text>
      </View>

      <View style={styles.match} accessible accessibilityLabel={`AI plan builder. ${SIX_STEPS.length} steps in every plan. ${found} added from your numbers.`}>
        <View style={styles.matchHead}>
          <Info size={14} color={color.primaryText} />
          <Text style={styles.matchLabel}>AI plan builder</Text>
        </View>
        <View style={styles.counts}>
          <View style={[styles.count, styles.countFile]}>
            <Text style={styles.countFigure}>{SIX_STEPS.length}</Text>
            <Text style={styles.countWords}>steps in every plan</Text>
          </View>
          <Plus size={16} color={ink.tertiary} />
          <View style={[styles.count, styles.countFound]}>
            <Text style={[styles.countFigure, styles.onDark]}>{found}</Text>
            <Text style={[styles.countWords, styles.onDarkSoft]}>added from your numbers</Text>
          </View>
        </View>
      </View>

      {noResults ? (
        <Card style={styles.note}>
          <Text style={styles.noteTitle}>Nothing read yet</Text>
          <Text style={styles.body}>Your record has no results yet, so nothing has been added. Your plan starts with the six steps.</Text>
        </Card>
      ) : found === 0 ? (
        <Card style={styles.note}>
          <Text style={styles.noteTitle}>Your record is in range</Text>
          <Text style={styles.body}>None of your numbers needs a focus of its own today. Your plan starts with the six steps.</Text>
        </Card>
      ) : (
        <View style={styles.rowsBlock}>
          <Text style={styles.heading} accessibilityRole="header">
            {`The ${COUNT_WORD[found]} your numbers add`}
          </Text>
          <View style={styles.rows}>
            {matches.map((m, i) => (
              <MatchRow key={m.kind + m.markerId} m={m} rule={i > 0} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.review}>
        <ShieldCheck size={16} color={color.primary} />
        <Text style={styles.reviewText}>{`${MEMBER.doctorShort} reviews your tests and your plan before anything starts.`}</Text>
      </View>
    </View>
  )
}

/** One addition: its icon, what it adds and to which step, the number it
    came from, and a chevron; the row opens that marker. */
function MatchRow({ m, rule }: { m: PlanMatch; rule: boolean }) {
  const Icon = ICON[m.kind]
  const hue = planHue(SHORT_NAME[m.kind])
  const adds = ADDS[m.kind]
  const label = `${adds.focus}, in ${adds.step}`
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/biomarker/[id]", params: { id: m.markerId } })}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${m.matchedOn}`}
      style={({ pressed }) => [styles.row, rule && styles.rowRule, pressed && styles.pressed]}
    >
      <Tile hue={hue} size={34}>
        <Icon size={19} color={HUE[hue].ink} />
      </Tile>
      <View style={styles.rowWords}>
        <Text style={styles.rowName} numberOfLines={1}>{label}</Text>
        <Text style={styles.matchedText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{m.matchedOn.replace(/^Matched on /, "")}</Text>
      </View>
      <CaretRight size={16} color={ink.tertiary} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // More air than the first cut (19 Oct 2026): each block stands apart.
  // The page does not scroll, so the blocks sit closer (20 → 14).
  root: { gap: space.section - 2 },
  welcome: { gap: space.inline },
  title: { ...type.display, fontSize: 18, lineHeight: 24 },
  lead: { ...type.body, fontSize: 14, lineHeight: 21, color: ink.detail },

  match: { gap: space.inline, padding: space.item, borderRadius: 18, borderWidth: 1, borderColor: "#CFE8E3", backgroundColor: "#E9F6F3" },
  matchHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  matchLabel: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, color: color.primaryText },
  counts: { flexDirection: "row", alignItems: "center", gap: space.inline },
  count: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, paddingVertical: space.item - 2, paddingHorizontal: space.inline, borderRadius: 14 },
  countFile: { backgroundColor: color.background },
  countFound: { backgroundColor: color.primary },
  countFigure: { ...type.display, fontSize: 26, lineHeight: 32 },
  countWords: { ...type.label, fontSize: 12, lineHeight: 16, textAlign: "center" },
  onDark: { color: color.onPrimary },
  onDarkSoft: { color: color.onPrimary, opacity: 0.85 },

  rowsBlock: { gap: space.item },
  heading: { ...type.section, fontSize: 15, lineHeight: 20 },
  rows: { borderRadius: 16, borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.background },
  row: { flexDirection: "row", alignItems: "center", gap: space.item, paddingVertical: space.item - 2, paddingHorizontal: space.item + 2 },
  rowRule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  rowWords: { flex: 1, gap: 3 },
  rowName: { ...type.title, fontSize: 14, lineHeight: 19, color: ink.strong },
  matchedText: { ...type.label, fontSize: 12, lineHeight: 16, flexShrink: 1, fontFamily: font.medium, color: color.ok },
  pressed: { opacity: 0.7 },

  note: { gap: space.stack, padding: space.item + 4 },
  noteTitle: { ...type.section },
  body: { ...type.body },

  // Her physician comes before anything starts: one teal line, where the
  // amber "not a fit" line was.
  review: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingVertical: space.item, paddingHorizontal: space.item + 2, borderRadius: 14, borderWidth: 1, borderColor: color.primaryEdge, backgroundColor: color.primaryTint },
  reviewText: { ...type.label, fontSize: 12, lineHeight: 17, flex: 1, fontFamily: font.medium, color: color.primaryText },
})
