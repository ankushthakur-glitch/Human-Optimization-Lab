import { router } from "expo-router"
import * as React from "react"
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native"

import { CaretRight, Check, Drop, Flame, Heart, Info, Lock, Plus, Scales, Sparkle } from "@/components/ph"
import { Card, HUE, Tile } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { useMarkers } from "@/lib/experience"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { AREA_HUE, COUNT_WORD, PLAN_AREAS, PLAN_COUNT, PLANS, SHORT_NAME, matchPlans, planHue, type PlanKind, type PlanMatch } from "@/lib/plan-match"
import { color, font, hairline, ink, space, type } from "@/lib/theme"
import { watchList } from "@/lib/trends"

/* The upgrade page's top (reference from Fynn's team, 16 Oct 2026; more
   white space between and inside the blocks, 19 Oct): a welcome, then what
   the AI found. In order: "Welcome, Liv" and the one sentence of what was
   done for her; the AI plan match card (all the plans on file, then how
   many her record supports); "The three your numbers point to", one row
   each with the numbers it was matched on; one quiet line on the rest, with
   "See all 81" opening the list in place. The pinned "Build my personalized
   plan" (ShowroomActions) stays the one action.

   States:
   - three, two or one match: the count, the heading and the sentence on
     the rest follow it ("The two your numbers point to", "The other 79");
   - no match: her record is in range, so the card reads 0 and a calm note
     replaces the rows; the plan can still be built around her goals;
   - no results yet: nothing has been compared, so the card says so and
     the rows give way to a note;
   - she had a plan before: "Welcome back, Liv".
   "See all 81" slides the full list up as a bottom sheet (usePlanList). */

const ICON: Record<PlanKind, typeof Heart> = {
  metabolic: Scales,
  lipid: Heart,
  insulin: Drop,
  bone: Sparkle,
  other: Flame,
}


/** The plans her record supports, and how many markers there are to compare. */
export function usePlanMatches() {
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const matches = matchPlans(watchList(markers, { improve: onboarding.why?.improve }).filter((t) => t.latest))
  return { matches, noResults: markers.length === 0 }
}

/** "See all 81" opens the full list as a bottom sheet. The sheet is drawn by
    the page (`sheet`, in its overlay slot) so it covers the screen rather
    than scrolling with the content; `show` is what "See all" calls. In the
    plan's set-up (/goal-plans) `pick` lets her add plans: `chosen` are the
    plans already hers, `added` those she added, `toggle` adds or removes one. */
export function usePlanList(pick?: { chosen: string[]; added: string[]; toggle: (name: string) => void }) {
  const [open, setOpen] = React.useState(false)
  return { show: () => setOpen(true), sheet: open ? <PlanListSheet pick={pick} onClose={() => setOpen(false)} /> : null }
}

export function PlanMatchSection({ onSeeAll }: { onSeeAll: () => void }) {
  const onboarding = useOnboarding()
  const { matches, noResults } = usePlanMatches()

  const name = onboarding.profile?.preferredName || onboarding.profile?.firstName || PATIENT.firstName
  const returning = !!onboarding.membership?.cancelledAt || !!onboarding.planHistory?.length
  const found = matches.length
  const rest = PLAN_COUNT - found

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
          <Text style={styles.matchLabel}>AI plan match</Text>
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
          <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="button" accessibilityLabel={`See all ${PLAN_COUNT} plans`} style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}>
            <Text style={styles.seeAllText}>{`See all ${PLAN_COUNT}`}</Text>
            <CaretRight size={14} color={color.primaryText} />
          </Pressable>
        </View>
      </View>

    </View>
  )
}

/** One matched plan: its icon, its name, what it was matched on, and a
    chevron; the row opens the marker it was matched on. */
function MatchRow({ m, rule }: { m: PlanMatch; rule: boolean }) {
  const Icon = ICON[m.kind]
  const hue = planHue(SHORT_NAME[m.kind])
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

/** All the plans by area, in a sheet that slides up from the foot. Opened
    from the upgrade page it is view only: the plans her record supports say
    "Matched". Opened in the set-up, those already hers say "In your plans"
    and every other has Add; one she added says "Added" and a tap takes it
    off again. The list scrolls inside the sheet, so the header and its
    close button stay put. */
function PlanListSheet({ pick, onClose }: { pick?: { chosen: string[]; added: string[]; toggle: (name: string) => void }; onClose: () => void }) {
  const { matches } = usePlanMatches()
  const { height } = useWindowDimensions()
  const matched = new Set(matches.map((m) => SHORT_NAME[m.kind]))
  const chosen = new Set(pick?.chosen ?? [])
  const added = new Set(pick?.added ?? [])
  return (
    <Sheet title={`All ${PLAN_COUNT} plans`} onClose={onClose}>
      <ScrollView style={{ maxHeight: Math.round(height * 0.62) }} contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {PLAN_AREAS.map((area) => (
          <View key={area} style={styles.area}>
            <View style={styles.areaHead}>
              <View style={[styles.areaDot, { backgroundColor: HUE[AREA_HUE[area]].ink }]} />
              <Text style={styles.areaName} accessibilityRole="header">{area}</Text>
            </View>
            {PLANS[area].map((name) => (
              <FullRow
                key={name}
                label={name}
                state={pick ? (added.has(name) ? "added" : chosen.has(name) ? "yours" : "add") : matched.has(name) ? "matched" : undefined}
                onPress={pick && !chosen.has(name) ? () => pick.toggle(name) : undefined}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </Sheet>
  )
}

/** One plan: its name and where it stands. A plan she can add or take off
    is one tap. */
function FullRow({ label, state, onPress }: { label: string; state?: "matched" | "yours" | "added" | "add"; onPress?: () => void }) {
  const right =
    state === "matched" || state === "yours" ? (
      <View style={styles.fullChip}>
        <Text style={styles.fullFit}>{state === "matched" ? "Matched" : "In your plans"}</Text>
      </View>
    ) : state === "added" ? (
      <View style={[styles.fullChip, styles.addedChip]}>
        <Check size={12} color={color.onPrimary} weight="bold" />
        <Text style={[styles.fullFit, styles.addedText]}>Added</Text>
      </View>
    ) : state === "add" ? (
      <View style={styles.add}>
        <Plus size={14} color={color.primary} weight="bold" />
        <Text style={styles.addText}>Add</Text>
      </View>
    ) : null
  const words = `${label}${state === "added" ? ", added" : state === "yours" ? ", in your plans" : state === "matched" ? ", matched" : ""}`
  if (!onPress)
    return (
      <View accessible accessibilityLabel={words} style={styles.fullRow}>
        <Text style={styles.fullLabel}>{label}</Text>
        {right}
      </View>
    )
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: state === "added" }}
      accessibilityLabel={state === "added" ? `${label}, added. Tap to remove` : `Add ${label}`}
      style={({ pressed }) => [styles.fullRow, pressed && styles.pressed]}
    >
      <Text style={styles.fullLabel}>{label}</Text>
      {right}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // More air than the first cut (19 Oct 2026): each block stands apart.
  root: { gap: space.section + 4 },
  welcome: { gap: space.inline },
  title: { ...type.display, fontSize: 18, lineHeight: 24 },
  lead: { ...type.body, fontSize: 14, lineHeight: 21, color: ink.detail },

  // The AI plan match card: mint, the two counts side by side.
  match: { gap: space.item, padding: space.item + 4, borderRadius: 18, borderWidth: 1, borderColor: "#CFE8E3", backgroundColor: "#E9F6F3" },
  matchHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  matchLabel: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, color: color.primaryText },
  counts: { flexDirection: "row", alignItems: "center", gap: space.inline },
  count: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, paddingVertical: space.item + 2, paddingHorizontal: space.inline, borderRadius: 14 },
  countFile: { backgroundColor: color.background },
  countFound: { backgroundColor: color.primary },
  countFigure: { ...type.display, fontSize: 26, lineHeight: 32 },
  countWords: { ...type.label, fontSize: 12, lineHeight: 16, textAlign: "center" },
  onDark: { color: color.onPrimary },
  onDarkSoft: { color: color.onPrimary, opacity: 0.85 },

  // The matched plans: a heading over one white card of rows.
  rowsBlock: { gap: space.item },
  heading: { ...type.section, fontSize: 15, lineHeight: 20 },
  rows: { borderRadius: 16, borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.background },
  row: { flexDirection: "row", alignItems: "center", gap: space.item, paddingVertical: space.item + 2, paddingHorizontal: space.item + 2 },
  rowRule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  rowWords: { flex: 1, gap: 3 },
  rowName: { ...type.title, fontSize: 14, lineHeight: 19, color: ink.strong },
  matchedText: { ...type.label, fontSize: 12, lineHeight: 16, flexShrink: 1, fontFamily: font.medium, color: color.ok },
  pressed: { opacity: 0.7 },

  note: { gap: space.stack, padding: space.item + 4 },
  noteTitle: { ...type.section },
  body: { ...type.body },

  rest: { gap: space.inline },
  restLine: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingVertical: space.item, paddingHorizontal: space.item + 2, borderRadius: 14, borderWidth: 1, borderColor: color.amberEdge, backgroundColor: color.amberTint },
  restWords: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.inline },
  restText: { ...type.label, fontSize: 12, lineHeight: 17, flex: 1, fontFamily: font.medium, color: "#7A4210" },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, color: color.primaryText },
  sheetList: { paddingBottom: space.inline },
  fullRow: { flexDirection: "row", alignItems: "center", gap: space.item, minHeight: 48, paddingVertical: 10, borderTopWidth: 1, borderTopColor: hairline.rule },
  fullLabel: { ...type.title, flex: 1 },
  fullChip: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: color.okTint },
  fullFit: { ...type.label, fontFamily: font.semibold, color: color.ok },
  addedChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: color.primary },
  addedText: { color: color.onPrimary },
  add: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: color.primaryEdge },
  addText: { ...type.label, fontFamily: font.semibold, color: color.primary },
  area: { paddingTop: space.item },
  areaHead: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingBottom: space.line },
  areaDot: { width: 8, height: 8, borderRadius: 4 },
  areaName: { ...type.section, fontSize: 14, lineHeight: 20 },

})
