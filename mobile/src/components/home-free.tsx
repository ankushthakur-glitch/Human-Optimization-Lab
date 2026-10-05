import { router, type Href } from "expo-router"
import { StyleSheet, Text, View } from "react-native"

import { keepTogether } from "@/components/care-gap"
import { HomeHeader, StatusBanner } from "@/components/home-header"
import { ASK_TILE, HeroRow, RecordGlyph, SparkleGlyph, dotted } from "@/components/home-parts"
import { CheckCircle, Pill, Warning } from "@/components/ph"
import { Block, Card, Group, NeedsRow, NotConnected, Nudge, ROW_LIMIT, Rise, SmallAction, Status } from "@/components/record-kit"
import { DEMO_USED, TabScreen, openTab } from "@/components/tab-bar"
import { toast } from "@/components/toast"
import { TrendTiles } from "@/components/trend-tile"
import { useAllowance } from "@/lib/allowance"
import { canOffer, useExperience, useMarkers } from "@/lib/experience"
import { planFocus, useOffer } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { color, space, type } from "@/lib/theme"
import { NEW_IN_RECORD_NOTE, caughtUp, comingUp, homeBanner, markSeen, needsTitle, todo, yourMedicines, type TodoItem } from "@/lib/todo"
import { classify, homeTiles, watchList, type Trend } from "@/lib/trends"

/* Home on the free record (FINAL-SPEC C.1), as the Figma "Hol" Home
   (40024634:963, 5 Oct 2026): the one status banner when something is
   true; the teal "3 things need you" banner, collapsed, which opens To do;
   Your trends, a 2 by 2 grid of sparkline tiles; Upcoming; New in your
   record when an outside visit arrived; Your medicines; the teal Ask
   about your results banner; and last and quiet, the plan card. The
   Inlay score and the "checking" banner left the home on 5 Oct 2026, at
   the user's word; the AI is metered in tokens now, so no question count.

   The same screen draws every state of the free record (C.1.4, C.28): not
   connected, the record still arriving, sharing turned off, a paused
   member (the paused card above the banner, no plan card) and a cancelled
   one. Whether the plan card shows, and as a card or one quiet line, is
   the cap service's decision (lib/offers.ts), never this screen's.

   RecordSections is the record part on its own (Needs you to Ask), which
   the member home shows under its setup and review heroes with Needs you
   as a white row, so a screen keeps one gradient on top. */

export function FreeHome() {
  const onboarding = useOnboarding()
  const exp = useExperience().experience
  const banner = exp !== "declined" && homeBanner(onboarding)

  return (
    <TabScreen tab="home" header={<HomeHeader variant="free" />}>
      <View style={styles.page}>
        {exp === "declined" ? (
          <Rise at={0} id="home:declined">
            <NotConnected onConnect={() => router.push("/connect")} />
          </Rise>
        ) : (
          <>
            {!!banner && (
              <Rise at={0} id="home:banner">
                <StatusBanner variant="free" tab="home" />
              </Rise>
            )}
            {exp === "paused" && (
              <Rise at={0} id="home:paused">
                <PausedCard />
              </Rise>
            )}
            <RecordSections />
            <PlanCard />
          </>
        )}
      </View>
    </TabScreen>
  )
}

/** The record part of the free home, from Needs you to Ask about your
    results. `needsAsCard` draws Needs you as a white row instead of the
    teal banner, for a screen that has its own hero (the member home's
    setup and review stages). While the record is still arriving nothing
    can need her yet: practice appointments, and one line each where
    trends and medicines will be. */
export function RecordSections({ needsAsCard = false }: { needsAsCard?: boolean }) {
  const building = useExperience().experience === "building"
  return (
    <View style={styles.page}>
      {!building && <NeedsYou asCard={needsAsCard} />}
      {building ? <Waiting at={2} id="trends" title="Your trends" line={`Your trends appear once your results${NBSP}arrive.`} /> : <Trends />}
      <Upcoming />
      {!building && <NewInRecord />}
      {building ? <Waiting at={5} id="medicines" title="Your medicines" line={`Your medicines appear once your records${NBSP}arrive.`} /> : <Medicines />}
      <AskRow />
    </View>
  )
}

/* ------------------------------------------------------------ opening -- */

const openToDo = () => openTab("/gaps", "home")

/* ------------------------------------------------------------- words -- */

const NBSP = "\u00A0"

/** A row's words as they wrap on a narrow phone: the app's one rule
    (care-gap.ts keepTogether), which holds dates, times, names, places and
    "Reminder 2 of 3" whole and never leaves one short word on a line. */
const together = (words?: string) => (words ? keepTogether(words) : undefined)

/* --------------------------------------------------------- needs you -- */

/** "You have 3 pending actions to stay on track." */
const pendingLine = (n: number) => `You have ${n} pending ${n === 1 ? "action" : "actions"} to stay on track.`

/** What needs her now (C.1.2, 3), as the Figma's collapsed teal banner:
    the count as the title, the pending line under it, and the whole banner
    opens To do, where each item has its action. With nothing open, the
    same banner says she is all caught up and opens what is next. As a card
    (the member home's setup and review stages, which have their own hero)
    it is one white row. */
function NeedsYou({ asCard }: { asCard: boolean }) {
  const onboarding = useOnboarding()
  const needs = todo(onboarding).needs

  if (!needs.length) {
    const next = caughtUp(onboarding)
    const open = next.href ? () => router.push(next.href as Href) : openToDo
    return (
      <Rise at={1} id="home:needs">
        {asCard ? (
          <Group>
            <NeedsRow icon={<CheckCircle size={16} color={color.primary} />} title={next.title} meta={together(next.meta)} onPress={open} />
          </Group>
        ) : (
          <HeroRow icon={<CheckCircle size={18} color={color.primary} />} title={next.title} line={next.meta} onPress={open} />
        )}
      </Rise>
    )
  }

  return (
    <Rise at={1} id="home:needs">
      {asCard ? (
        <Group>
          <NeedsRow icon={<Warning size={16} color={color.primary} />} title={needsTitle(needs.length)} meta={pendingLine(needs.length)} onPress={openToDo} />
        </Group>
      ) : (
        <HeroRow icon={<Warning size={18} color={color.primary} />} title={needsTitle(needs.length)} line={pendingLine(needs.length)} onPress={openToDo} />
      )}
    </Rise>
  )
}

/* ------------------------------------------------------- your trends -- */

const openResults = () => router.push({ pathname: "/record/[kind]", params: { kind: "results" } })

/** Her trends (C.1.2, 6) as the Figma's 2 by 2 grid: a tile for each marker
    worth watching, in the F-26 order with her own "improve" answers
    breaking ties and the last cell going to good news when there is some.
    Fewer than four worth watching, the grid fills with results that are in
    range, the ones with the longest history first, so the section always
    shows her data and never an empty cell. See all opens Results. */
function Trends() {
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
function Upcoming() {
  const onboarding = useOnboarding()
  const coming = comingUp(onboarding).slice(0, ROW_LIMIT)
  if (!coming.length) return null
  return (
    <Rise at={3} id="home:coming">
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

/* ------------------------------------------------ new in your record -- */

/** Visits outside her clinic that arrived with the record or since, two
    at most, each until she opens it (C.1.2, 5), and the reassurance that
    her doctor sees them too. */
function NewInRecord() {
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
function Medicines() {
  const onboarding = useOnboarding()
  const meds = yourMedicines(onboarding)
  if (!meds.total) return null
  return (
    <Rise at={5} id="home:medicines">
      <Block title="Your medicines" onSeeAll={() => router.push("/medications")}>
        <Group>
          {meds.rows.map((m) => (
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
              onPress={() => router.push({ pathname: "/medications", params: { id: m.id } })}
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
    grey teal banner with the free credits left, as the orb's ring shows
    them; a member's are never counted, so no line. */
function AskRow() {
  const { member } = useAllowance()
  return (
    <Rise at={7} id="home:ask">
      <HeroRow
        icon={<SparkleGlyph />}
        tile={ASK_TILE}
        muted
        title="Ask about your results"
        line={member ? undefined : `${Math.round((1 - DEMO_USED) * 100)}% of the free credits left`}
        onPress={() => router.push({ pathname: "/assistant", params: { topic: "results" } })}
      />
    </Rise>
  )
}

/* ---------------------------------------------------------- plan card -- */

const BENEFITS = ["A daily diet plan, with meals logged by photo", "An exercise program with short videos", "Watch and scale sync, coming soon"].map(keepTogether)

/** The one offer on the free home, always last (C.1.2, 10; D.2 touchpoint
    5): what a plan would do for her, in Inlay's voice, with no price and
    no doctor. At middling readiness it is one quiet line. "Hide for now"
    puts it away for 60 days; "Not for me", one tap further in, turns
    offers off for 90. Never in the first session, at low readiness, with
    sharing off, while the record is arriving, after a recent cancellation
    or for any member: the cap service decides. */
function PlanCard() {
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const offer = useOffer("home-benefits", { eligible: canOffer(onboarding) })
  if (!offer.show) return null

  const see = () => {
    offer.markOpened()
    router.push({ pathname: "/plans", params: { from: "home" } })
  }

  if (offer.soft) return null

  return (
    <Rise at={9} id="home:plan">
      <Nudge
        art="seedling"
        artSize={64}
        title="A plan built around you"
        body={keepTogether(`For ${planFocus(onboarding, markers).words}, from your record and your why.`)}
        points={BENEFITS}
        note="Reviewed by a physician before it starts."
        action="See how it works"
        onAction={see}
        dismissLabel="Hide for now"
        onDismiss={() => {
          offer.notNow()
          toast("Hidden for now. It's always on the Plan tab.")
        }}
        onDecline={offer.notForMe}
        onShow={offer.markShown}
      />
    </Rise>
  )
}

/* ------------------------------------------------------------- states -- */

/** A paused member (C.1.4): her plan waits, the record carries on. Above
    the Needs you banner, a white card with its one action. */
function PausedCard() {
  return (
    <Card style={styles.paused}>
      <View style={styles.pausedWords}>
        <Text style={styles.pausedTitle} accessibilityRole="header">
          Your plan is paused
        </Text>
        <Text style={styles.pausedBody}>Your record, trends and reminders carry on. Every version of your plan is kept.</Text>
      </View>
      <SmallAction onPress={() => router.push({ pathname: "/membership", params: { sheet: "resume" } })}>Resume my plan</SmallAction>
    </Card>
  )
}

/** A section whose data is still arriving: its label and one line. */
function Waiting({ at, id, title, line }: { at: number; id: string; title: string; line: string }) {
  return (
    <Rise at={at} id={`home:${id}`}>
      <Block title={title}>
        <Card>
          <Text style={styles.waiting}>{line}</Text>
        </Card>
      </Block>
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
  // A sentence standing in for what is still arriving.
  waiting: { ...type.label },

  paused: { gap: space.item, alignItems: "flex-start" },
  pausedWords: { gap: space.stack },
  pausedTitle: { ...type.title },
  pausedBody: { ...type.label },
})
