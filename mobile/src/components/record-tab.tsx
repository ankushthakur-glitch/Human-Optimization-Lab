import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { StatusBanner } from "@/components/home-header"
import { Clock, Plus, UploadSimple } from "@/components/ph"
import { Block, Card, EmptyState, Group, ResultRow, Tile } from "@/components/record-kit"
import { sinceLine } from "@/components/record-lists"
import { AddToRecordSheet, ItemRow, RangeSummary } from "@/components/record-rows"
import { TabScreen } from "@/components/tab-bar"
import { Button } from "@/components/ui"
import { relativeDay } from "@/lib/dates"
import { useExperience, useMarkers } from "@/lib/experience"
import { sinceStart } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { ALLERGIES, IMMUNIZATIONS, ORDERS, PROBLEMS, PROCEDURES, VISITS } from "@/lib/record"
import { color, hairline, space, type } from "@/lib/theme"
import { homeBanner, todo, yourMedicines } from "@/lib/todo"
import { trendCounts, watchList } from "@/lib/trends"

/* The Record tab (FINAL-SPEC C.5; Figma "Hol" Record, extended frame
   40024634:2803): one place for everything collected, every item
   reachable.

   1. The header names the tab and holds "+ Add to your record" (a photo of
      a record, or something she tells us).
   2. Results: "20 of 27 in range" as one bar with its legend, and the one
      result most worth watching; "See all" opens every result. A member's
      row says how far it has moved since she started. New results that
      arrived in the last two weeks sit under it until they are old.
   3. In your record: every category as a row with its count badge.

   Before anything was collected it shows the not connected state, and
   while the record is still arriving, that; with sharing turned off, the
   same banner as every tab, over what was collected before. */

/** New results stay on the tab this long after they arrive. */
const NEW_DAYS = 14

/** Whole days since an ISO time or day key. */
const daysAgo = (at: string) => Math.floor((Date.now() - Date.parse(at.length > 10 ? at : `${at}T12:00`)) / 86400000)

export function RecordTab() {
  const onboarding = useOnboarding()
  const info = useExperience()
  const [adding, setAdding] = React.useState(false)

  if (info.experience === "declined")
    return (
      <TabScreen tab="results" title="Record">
        <EmptyState
          art="folder"
          artSize={112}
          title="Your records aren't connected"
          // The last two words held together, so the line never ends on one.
          line={"Nothing has been collected. Connect when you're ready and we'll bring your history together."}
        >
          <View style={styles.emptyButton}>
            <Button onPress={() => router.push("/connect")}>Connect my records</Button>
          </View>
        </EmptyState>
      </TabScreen>
    )

  if (info.experience === "building") {
    const { got, of } = onboarding.records ?? {}
    return (
      <TabScreen tab="results" title="Record">
        <EmptyState art="record-tube" artSize={96} title="Your record is still arriving" line={of ? `${got ?? 0} of ${of} places so far` : undefined} />
      </TabScreen>
    )
  }

  // A member with a plan reads each result against where she started.
  const member = info.experience === "member" || info.experience === "paused"
  return (
    <TabScreen
      tab="results"
      title="Record"
      headerRight={<AddAction onPress={() => setAdding(true)} />}
      overlay={adding ? <AddToRecordSheet onClose={() => setAdding(false)} /> : undefined}
    >
      <RecordBanner />
      <Results member={member} />
      <InYourRecord />
    </TabScreen>
  )
}

/** The header's "+ Add to your record": the Plus 18 in Primary/07 and the
    words 14 medium in Primary/08, 8 apart. */
function AddAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
      <Plus size={18} color={color.primaryText} />
      <Text style={styles.addText}>Add to your record</Text>
    </Pressable>
  )
}

/** The banner every tab shares when sharing is off or ending, or a place
    had nothing; the others belong to Home. */
function RecordBanner() {
  const onboarding = useOnboarding()
  const banner = homeBanner(onboarding)
  const kinds = ["sharing-off", "sharing-ended", "sharing-ends", "not-found"]
  if (!banner || !kinds.includes(banner.kind)) return null
  return <StatusBanner tab="results" />
}

/* --------------------------------------------------------- results -- */

function Results({ member }: { member: boolean }) {
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const counts = trendCounts(markers)
  const watched = watchList(markers, { improve: onboarding.why?.improve })
  // A member's plan markers lead, each with its change since she started.
  const ordered = member ? [...watched].sort((a, b) => Number(!!sinceStart(b.marker)) - Number(!!sinceStart(a.marker))) : watched
  const top = ordered[0]
  // Results that arrived in the last two weeks open on their own page.
  const fresh = (onboarding.batches ?? []).filter((b) => daysAgo(b.at) <= NEW_DAYS).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  return (
    <Block title="Results" onSeeAll={() => router.push("/record/results")}>
      <Card style={styles.results}>
        <RangeSummary inRange={counts.inRange} borderline={counts.borderline} out={counts.out} total={counts.total} />
        {top && (
          <View style={styles.rule}>
            <ResultRow
              trend={top}
              since={member ? sinceLine(top.marker) : undefined}
              onPress={() =>
                router.push({
                  pathname: "/biomarker/[id]",
                  params: { id: top.id },
                })
              }
            />
          </View>
        )}
        {fresh.map((b) => (
          <View key={b.id} style={styles.rule}>
            <ItemRow
              icon="labs"
              title={`${b.count} new ${b.count === 1 ? "result" : "results"} from ${b.source}`}
              meta={relativeDay(b.at)}
              onPress={() =>
                router.push({
                  pathname: "/record/[kind]",
                  params: { kind: "results", batch: b.id },
                })
              }
            />
          </View>
        ))}
      </Card>
    </Block>
  )
}

/* -------------------------------------------------- in your record -- */

function InYourRecord() {
  const onboarding = useOnboarding()
  const t = todo(onboarding)
  const meds = yourMedicines(onboarding)
  const upcoming = t.coming.filter((i) => i.kind === "appointment" || i.kind === "review").length
  // The same score as Home and the score page: her answers and her own
  // record (a steady record keeps its whole record half).
  const added = onboarding.added ?? []
  const list = (kind: string) => () => router.push({ pathname: "/record/[kind]", params: { kind } })
  const glyph = (Icon: typeof Clock) => (
    <Tile>
      <Icon size={16} color={color.primary} />
    </Tile>
  )

  return (
    <Block title="In your record" variant="label">
      <Group style={styles.list}>
        <ItemRow icon="medications" title="Medicines" count={meds.total} onPress={() => router.push("/medications")} />
        <ItemRow icon="allergies" title="Allergies" count={ALLERGIES.length} onPress={list("allergies")} />
        <ItemRow icon="conditions" title="Conditions" count={PROBLEMS.length} onPress={list("conditions")} />
        <ItemRow icon="visits" title="Visits" count={VISITS.length + upcoming} onPress={list("visits")} />
        <ItemRow icon="labs" title="Tests and orders" count={ORDERS.length} onPress={list("tests")} />
        <ItemRow icon="immunizations" title="Immunizations" count={IMMUNIZATIONS.length} onPress={list("immunizations")} />
        <ItemRow icon="procedures" title="Procedures" count={PROCEDURES.length} onPress={list("procedures")} />
        {added.length > 0 && <ItemRow icon={glyph(UploadSimple)} title="Added by you" count={added.length} onPress={list("added")} />}
      </Group>
    </Block>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  // The empty state's 8, and 8 more before its button: 16.
  emptyButton: { alignSelf: "stretch", marginTop: space.inline },

  add: { flexDirection: "row", alignItems: "center", gap: space.inline },
  addText: { ...type.link },

  // The summary, then each row 12 under a rule (the row brings its own
  // 12 below the rule, so the card keeps 12 at its foot).
  results: { paddingBottom: 0 },
  rule: { marginTop: space.item, borderTopWidth: 1, borderTopColor: hairline.rule },

  // "In your record" sits 16 under its label in the Figma, 4 more than a
  // section's 12.
  list: { marginTop: space.stack },
})
