import { router, type Href } from "expo-router"
import { StyleSheet, Text, View } from "react-native"

import { keepTogether } from "@/components/care-gap"
import { HomeHeader, StatusBanner } from "@/components/home-header"
import { openMedicineByName } from "@/components/medicines"
import { ASK_TILE, HeroRow, RecordGlyph, SparkleGlyph, UpgradeBanner, dotted } from "@/components/home-parts"
import { CheckCircle, Pill, Warning } from "@/components/ph"
import { Block, Group, NeedsRow, Rise, Status } from "@/components/record-kit"
import { TabScreen, openTab } from "@/components/tab-bar"
import { TrendTiles } from "@/components/trend-tile"
import { useAllowance } from "@/lib/allowance"
import { useExperience, useMarkers } from "@/lib/experience"
import { useOnboarding } from "@/lib/onboarding"
import { MEDICATIONS } from "@/lib/record"
import { color, space, type } from "@/lib/theme"
import { NEW_IN_RECORD_NOTE, caughtUp, comingUp, homeBanner, markSeen, needsTitle, todo, yourMedicines, type TodoItem } from "@/lib/todo"
import { classify, homeTiles, watchList, type Trend } from "@/lib/trends"

/* Home on the free record (FINAL-SPEC C.1), as the Figma "Hol" Home
   (40024634:963, 5 Oct 2026): the one status banner when something is
   true; the red "3 things need you" banner, collapsed, which opens To do;
   Your trends, a 2 by 2 grid of sparkline tiles; Upcoming; New in your
   record when an outside visit arrived; Your medicines; the teal Ask
   about your results banner. The Inlay score, the "checking" banner and
   the plan card left the home on 5 Oct 2026, at the user's word; the AI is metered in tokens now, so no question count.

   The same screen draws every state of the free record (C.1.4, C.28):
   sharing turned off, a paused member and a cancelled one.

   Since 6 Oct 2026 the Needs you banner is red, a rising result out of
   range is drawn red in its tile, and the teal "A healthier you is
   possible" banner after Upcoming opens Upgrade.

   A member whose first plan is with Dr. Patel gets this home too (9 Oct
   2026), without the upgrade banner: she has upgraded, and the Upgrade
   tab shows where her plan is. */

export function FreeHome() {
  const onboarding = useOnboarding()
  const banner = homeBanner(onboarding)

  return (
    <TabScreen tab="home" header={<HomeHeader variant="free" />}>
      <View style={styles.page}>
        {!!banner && (
          <Rise at={0} id="home:banner">
            <StatusBanner variant="free" tab="home" />
          </Rise>
        )}
        <RecordSections />
      </View>
    </TabScreen>
  )
}

/** The record part of the free home, from Needs you to Ask about your
    results. The upgrade banner only for a patient who can still upgrade:
    not a paused member, nor one whose plan is with Dr. Patel. */
export function RecordSections() {
  const exp = useExperience().experience
  return (
    <View style={styles.page}>
      <NeedsYou />
      <Trends />
      {exp !== "paused" && exp !== "member-review" && <UpgradeCard />}
      <Upcoming />
      <NewInRecord />
      <Medicines />
      <AskRow />
    </View>
  )
}

/* ------------------------------------------------------------ opening -- */

const openToDo = () => openTab("/gaps", "home")

/* ------------------------------------------------------------- words -- */

/** A row's words as they wrap on a narrow phone: the app's one rule
    (care-gap.ts keepTogether), which holds dates, times, names, places and
    "Reminder 2 of 3" whole and never leaves one short word on a line. */
const together = (words?: string) => (words ? keepTogether(words) : undefined)

/* --------------------------------------------------------- needs you -- */

/** "3 pending actions to stay on track." Short enough for one line on a phone. */
const pendingLine = (n: number) => `${n} pending ${n === 1 ? "action" : "actions"} to stay on track.`

/** What needs her now (C.1.2, 3), as a collapsed muted red banner:
    the count as the title, the pending line under it, and the whole banner
    opens To do, where each item has its action. With nothing open, the
    same banner says she is all caught up and opens what is next. */
export function NeedsYou() {
  const onboarding = useOnboarding()
  const needs = todo(onboarding).needs

  if (!needs.length) {
    const next = caughtUp(onboarding)
    const open = next.href ? () => router.push(next.href as Href) : openToDo
    return (
      <Rise at={1} id="home:needs">
        <HeroRow icon={<CheckCircle size={18} color={color.primary} />} title={next.title} line={next.meta} onPress={open} />
      </Rise>
    )
  }

  return (
    <Rise at={1} id="home:needs">
      <HeroRow
        icon={<Warning size={18} color={color.high} />}
        tile={color.highTint}
        alert
        title={needsTitle(needs.length)}
        line={pendingLine(needs.length)}
        onPress={openToDo}
      />
    </Rise>
  )
}

/* ------------------------------------------------------- your trends -- */

const openResults = () => router.push("/results")

/** Her trends (C.1.2, 6) as the Figma's 2 by 2 grid: a tile for each marker
    worth watching, in the F-26 order with her own "improve" answers
    breaking ties and the last cell going to good news when there is some.
    Fewer than four worth watching, the grid fills with results that are in
    range, the ones with the longest history first, so the section always
    shows her data and never an empty cell. See all opens Results. */
export function Trends() {
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const list = watchList(markers, { improve: onboarding.why?.improve })
  const tiles = [...homeTiles(list, { goodNews: true }).tiles]
  if (tiles.length < 4) {
    const steady = markers
      .map(classify)
      .filter((t) => !t.watch && !!t.latest && !tiles.some((x) => x.id === t.id))
      .sort((a, b) => b.count - a.count)
    tiles.push(...steady.slice(0, 4 - tiles.length))
  }
  if (!tiles.length) return null
  const open = (t: Trend) => router.push({ pathname: "/biomarker/[id]", params: { id: t.id } })

  return (
    <Rise at={2} id="home:trends">
      <Block title="Your trends" onSeeAll={openResults}>
        <TrendTiles trends={tiles} onOpen={open} />
      </Block>
    </Rise>
  )
}

/* ---------------------------------------------------------- upcoming -- */

/** Appointments and booked tests in the next 30 days, and tests ordered
    that are not due yet, by date (C.1.2, 4). A date block only for
    something that happens on that day; an open order keeps its glyph and
    says its due date in words, its facts split by a dot as in the Figma. */
export function Upcoming({ at = 3 }: { at?: number }) {
  const onboarding = useOnboarding()
  // One row, so the home fits a screen without scrolling; See all has the rest.
  const coming = comingUp(onboarding).slice(0, 1)
  if (!coming.length) return null
  return (
    <Rise at={at} id="home:coming">
      <Block title="Upcoming" onSeeAll={openToDo}>
        <Group>
          {coming.map((item) => (
            <NeedsRow
              key={item.id}
              date={item.date}
              icon={item.date ? undefined : <RecordGlyph name={item.icon} />}
              title={item.title}
              meta={dotted(item.meta, keepTogether)}
              note={item.note}
              tag={item.tag}
              chevron={false}
              onPress={() => router.push(item.href as Href)}
            />
          ))}
        </Group>
      </Block>
    </Rise>
  )
}

/* ------------------------------------------------------- upgrade card -- */

/** The way into Optimization, after Upcoming: the home's teal
    banner, the target glyph on its tile, a title and one line; the whole
    banner opens the Upgrade tab. */
function UpgradeCard() {
  return (
    <Rise at={4} id="home:upgrade">
      <UpgradeBanner
        title="A healthier you is possible"
        line="We can turn your insights into a personalized plan to help you improve."
        hint="Opens your plan options"
        onPress={() => openTab("/plan", "home")}
      />
    </Rise>
  )
}

/* ------------------------------------------------ new in your record -- */

/** Visits outside her clinic that arrived with the record or since, two
    at most, each until she opens it (C.1.2, 5), and the reassurance that
    her doctor sees them too. */
export function NewInRecord() {
  const onboarding = useOnboarding()
  const items = todo(onboarding).newInRecord.slice(0, 2)
  if (!items.length) return null
  const open = (item: TodoItem) => {
    markSeen(onboarding, onboarding.save, item)
    router.push(item.href as Href)
  }
  return (
    <Rise at={4} id="home:new">
      <Block title="New in your record">
        <Group>
          {items.map((item) => (
            <NeedsRow
              key={item.id}
              icon={<RecordGlyph name={item.icon} />}
              title={item.title}
              meta={together(item.meta)}
              tag={item.tag}
              chevron={false}
              onPress={() => open(item)}
            />
          ))}
          <Text style={styles.footnote}>{NEW_IN_RECORD_NOTE}</Text>
        </Group>
      </Block>
    </Rise>
  )
}

/* ---------------------------------------------------- your medicines -- */

/** Her medicines by name, the ones her records differ on first (C.1.2,
    7), and her supplements in one line. Once she answers for a medicine
    its mark goes: Dr. Patel settles the difference. */
export function Medicines() {
  const onboarding = useOnboarding()
  const meds = yourMedicines(onboarding)
  if (!meds.total) return null
  return (
    <Rise at={5} id="home:medicines">
      <Block title="Your medicines" onSeeAll={() => router.push("/medications")}>
        <Group>
          {meds.rows.slice(0, 1).map((m) => (
            <NeedsRow
              key={m.id}
              icon={<Pill size={16} color={color.primary} />}
              title={m.name}
              meta={together(m.meta)}
              right={
                m.differs ? (
                  <Status level="borderline" bare>
                    Records differ
                  </Status>
                ) : undefined
              }
              chevron={false}
              onPress={() => {
                const med = MEDICATIONS.find((x) => x.id === m.id)
                if (med) openMedicineByName(med)
              }}
            />
          ))}
          {!!meds.supplements && <Text style={styles.supplements}>{meds.supplements}</Text>}
        </Group>
      </Block>
    </Rise>
  )
}

/* ----------------------------------------------- ask about your results -- */

/** The way into the assistant about her results (C.1.2, 9), the Figma's
    grey teal banner with the share of this week's AI credit used, as the
    orb's ring shows it. */
export function AskRow() {
  const { line } = useAllowance()
  return (
    <Rise at={7} id="home:ask">
      <HeroRow
        icon={<SparkleGlyph />}
        tile={ASK_TILE}
        muted
        title="Ask about your results"
        line={line}
        onPress={() => router.push({ pathname: "/assistant", params: { topic: "results" } })}
      />
    </Rise>
  )
}

const styles = StyleSheet.create({
  // Sections a tab screen's section apart (Figma 20).
  page: { gap: space.section },

  // The outside visits' note, the card's last line at a row's height.
  footnote: { ...type.label, paddingVertical: space.rowY },
  // The medicines card's last line, at a row's height.
  supplements: { ...type.label, paddingVertical: space.rowY },
})
