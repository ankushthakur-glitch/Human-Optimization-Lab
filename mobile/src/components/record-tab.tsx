import { router } from "expo-router"
import * as React from "react"
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native"

import { Art } from "@/components/art"
import { keepTogether } from "@/components/care-gap"
import { CompositionBar } from "@/components/charts"
import { StatusBanner } from "@/components/home-header"
import { IconClock, IconEye, IconUpload } from "@/components/icons"
import { Block, Card, EmptyState, Group, ResultRow, SmallAction, TextAction, Tile, toast } from "@/components/record-kit"
import { allergiesToCheck, sinceLine } from "@/components/record-lists"
import { AddToRecordSheet, ItemRow } from "@/components/record-rows"
import { Sheet } from "@/components/sheet"
import { TabScreen } from "@/components/tab-bar"
import { Button, TextField } from "@/components/ui"
import { relativeDay } from "@/lib/dates"
import { useExperience, useInlayScore, useMarkers } from "@/lib/experience"
import { sinceStart } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { ALLERGIES, DATA_TYPES, DOCUMENTS, IMMUNIZATIONS, ORDERS, PROBLEMS, PROCEDURES, SOURCES, UPDATED, VISITS } from "@/lib/record"
import { color, space, type } from "@/lib/theme"
import { homeBanner, todo, yourMedicines } from "@/lib/todo"
import { trendCounts, watchList } from "@/lib/trends"

/* The Record tab (FINAL-SPEC C.5): one place for everything collected,
   every item reachable, with where it came from (F-37, S-10, S-17).

   1. What the record holds: "168 records from 3 places", the places, when
      it last updated, and "Add to your record" (a photo of a report, or
      something she tells us), with the record folder beside it.
   2. Results: the record at a glance as one bar (in range, borderline, out
      of range) and the three results most worth watching; "See all 27"
      opens every result. A member's rows say how far each has moved since
      she started.
   3. In your record: every category as a row with its count, and a mark
      only where something needs her ("2 to check", "Records differ on 1").
   4. A quiet "Ask for a correction" at the end (S-16).

   Before anything was collected it shows the not connected state, and
   while the record is still arriving, that; with sharing turned off, the
   same banner as every tab, over what was collected before. */

/** Every place a record came from, by the short names the patient knows,
    each held whole so a wrapped line never splits "Scripps Memorial". */
const PLACES = SOURCES.map((s) => s.name.replace(/ Hospital$/, "").replace(/ /g, "\u00A0")).join(", ")

/** Every record the pull brought back (the FHIR resources it read). */
const RECORD_COUNT = DATA_TYPES.reduce((n, t) => n + t.count, 0)

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** New results stay on the tab this long after they arrive. */
const NEW_DAYS = 14

/** Whole days since an ISO time or day key. */
const daysAgo = (at: string) => Math.floor((Date.now() - Date.parse(at.length > 10 ? at : `${at}T12:00`)) / 86400000)

export function RecordTab() {
  const onboarding = useOnboarding()
  const info = useExperience()
  const [sheet, setSheet] = React.useState<"add" | "correct">()
  const close = () => setSheet(undefined)

  if (info.experience === "declined")
    return (
      <TabScreen tab="results" title="Record">
        <EmptyState
          art="folder"
          artSize={112}
          title="Your records aren't connected"
          // The last two words held together, so the line never ends on one.
          line={"Nothing has been collected. Connect when you're ready and we'll bring your history\u00A0together."}
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
      overlay={sheet === "add" ? <AddToRecordSheet onClose={close} /> : sheet === "correct" ? <CorrectionSheet onClose={close} /> : undefined}
    >
      <View style={styles.page}>
        <RecordBanner />
        <Summary asOf={info.sharingOff?.on} onAdd={() => setSheet("add")} />
        <Results member={member} />
        <InYourRecord />
        <View style={styles.correction}>
          <TextAction tone="muted" onPress={() => setSheet("correct")}>
            Ask for a correction
          </TextAction>
        </View>
      </View>
    </TabScreen>
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

/* --------------------------------------------------------- summary -- */

function Summary({ asOf, onAdd }: { asOf?: string; onAdd: () => void }) {
  return (
    <Card style={styles.summary}>
      <View style={styles.summaryWords}>
        <Text style={type.section}>{keepTogether(`${RECORD_COUNT} records from ${SOURCES.length} places`)}</Text>
        <Text style={type.label}>{PLACES}</Text>
        <Text style={type.meta}>{asOf ? `As of ${asOf}` : `Updated ${lowerFirst(UPDATED)}`}</Text>
        <SmallAction onPress={onAdd} style={styles.summaryAction}>
          Add to your record
        </SmallAction>
      </View>
      <Art name="folder" size={56} />
    </Card>
  )
}

/* --------------------------------------------------------- results -- */

function Results({ member }: { member: boolean }) {
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const counts = trendCounts(markers)
  const watched = watchList(markers, { improve: onboarding.why?.improve })
  // A member's plan markers lead, each with its change since she started.
  const ordered = member ? [...watched].sort((a, b) => Number(!!sinceStart(b.marker)) - Number(!!sinceStart(a.marker))) : watched
  const rows = ordered.slice(0, 3)
  // Results that arrived in the last two weeks open on their own page.
  const fresh = (onboarding.batches ?? []).filter((b) => daysAgo(b.at) <= NEW_DAYS).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  return (
    <Block title="Results" variant="title" onSeeAll={() => router.push("/record/results")} count={counts.total}>
      <Group>
        {fresh.map((b) => (
          <ItemRow
            key={b.id}
            icon="labs"
            title={`${b.count} new ${b.count === 1 ? "result" : "results"} from ${b.source}`}
            meta={relativeDay(b.at)}
            onPress={() => router.push({ pathname: "/record/[kind]", params: { kind: "results", batch: b.id } })}
          />
        ))}
        <View style={styles.composition}>
          <CompositionBar inRange={counts.inRange} borderline={counts.borderline} out={counts.out} playKey="record:composition" />
        </View>
        {rows.map((t) => (
          <ResultRow
            key={t.id}
            trend={t}
            since={member ? sinceLine(t.marker) : undefined}
            onPress={() => router.push({ pathname: "/biomarker/[id]", params: { id: t.id } })}
          />
        ))}
      </Group>
    </Block>
  )
}

/* -------------------------------------------------- in your record -- */

function InYourRecord() {
  const onboarding = useOnboarding()
  const t = todo(onboarding)
  const meds = yourMedicines(onboarding)
  const differ = allergiesToCheck()
  const upcoming = t.coming.filter((i) => i.kind === "appointment" || i.kind === "review").length
  const notBooked = [...t.needs, ...t.coming].filter((i) => i.kind === "order").length
  // The same score as Home and the score page: her answers and her own
  // record (a steady record keeps its whole record half).
  const score = useInlayScore()
  const added = onboarding.added ?? []
  const list = (kind: string) => () => router.push({ pathname: "/record/[kind]", params: { kind } })
  // The app's icons in the record icons' teal, on the same tile.
  const teal = color.primary

  return (
    <Block title="In your record" variant="title">
      <Group>
        <ItemRow
          icon="medications"
          title="Medicines"
          status={meds.toCheck ? { tone: "low", word: `${meds.toCheck} to check` } : undefined}
          count={meds.total}
          onPress={() => router.push("/medications")}
        />
        <ItemRow
          icon="allergies"
          title="Allergies"
          status={differ ? { tone: "low", word: `Records differ on ${differ}` } : undefined}
          count={ALLERGIES.length}
          onPress={list("allergies")}
        />
        <ItemRow icon="conditions" title="Conditions" count={PROBLEMS.length} onPress={list("conditions")} />
        <ItemRow icon="visits" title="Visits" meta={upcoming ? `${upcoming} coming up` : undefined} count={VISITS.length + upcoming} onPress={list("visits")} />
        <ItemRow
          icon="labs"
          title="Tests and orders"
          meta={notBooked ? `${notBooked} not booked yet` : undefined}
          count={ORDERS.length}
          onPress={list("tests")}
        />
        <ItemRow icon="documents" title="Documents" count={DOCUMENTS.length} onPress={list("documents")} />
        <ItemRow icon="immunizations" title="Immunizations" count={IMMUNIZATIONS.length} onPress={list("immunizations")} />
        <ItemRow icon="procedures" title="Procedures" count={PROCEDURES.length} onPress={list("procedures")} />
        <ItemRow icon={<Glyph>{<IconClock size={18} color={teal} />}</Glyph>} title="Timeline" onPress={() => router.push("/timeline")} />
        <ItemRow icon="vitals" title="Inlay score" count={score} onPress={() => router.push("/score")} />
        {added.length > 0 && (
          <ItemRow icon={<Glyph>{<IconUpload size={18} color={teal} />}</Glyph>} title="Added by you" meta="Being checked" count={added.length} onPress={list("added")} />
        )}
        <ItemRow icon={<Glyph>{<IconEye size={18} color={teal} />}</Glyph>} title="Who has looked at your record" onPress={list("access")} />
      </Group>
    </Block>
  )
}

/** An icon from the app's set on the same teal tile as the record icons. */
const Glyph = ({ children }: { children: React.ReactNode }) => <Tile>{children}</Tile>

/* ----------------------------------------------------------- sheets -- */

/** "Ask for a correction" (S-16): what should change goes to Dr. Patel's
    team, who keep the original, the request and their decision. */
function CorrectionSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = React.useState("")
  const send = () => {
    onClose()
    toast("Sent. Dr. Patel's team will review it.")
  }
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Sheet title="What should we correct?" onClose={onClose}>
        <TextField label="Your note" value={text} onChangeText={setText} multiline placeholder="Which item, and what it should say" />
        <Button onPress={send} disabled={!text.trim()}>
          Send to Dr. Patel's team
        </Button>
      </Sheet>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  // Sections sit a section apart on a tab (Frontline 20).
  page: { gap: space.section },
  // The empty state's 8, and 8 more before its button: 16, as Frontline
  // sets a card's action under its words.
  emptyButton: { alignSelf: "stretch", marginTop: space.inline },

  summary: { flexDirection: "row", alignItems: "flex-start", gap: space.lead, padding: space.card },
  // A 16 pt title over its lines: 4 apart (Frontline).
  summaryWords: { flex: 1, gap: space.stack },
  // 16 under the words: the stack's 4 and 12.
  summaryAction: { marginTop: space.item },

  composition: { paddingTop: space.card, paddingBottom: space.card },

  // The quiet link sits closer to the list it is about than a section.
  correction: { alignItems: "center", marginTop: space.item - space.section },
})
