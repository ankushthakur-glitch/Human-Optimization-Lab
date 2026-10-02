import { router, type Href } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View, useWindowDimensions } from "react-native"

import { Art } from "@/components/art"
import { keepTogether } from "@/components/care-gap"
import { AllResultsTile, ScoreGauge, TrendGrid } from "@/components/charts"
import { HomeHeader, StatusBanner } from "@/components/home-header"
import { IconCheck, IconChevronRight, IconSparkle } from "@/components/icons"
import { RecordIcon } from "@/components/record-icons"
import {
  Block,
  Card,
  Group,
  HUE,
  Hero,
  NeedsRow,
  NotConnected,
  Nudge,
  Quote,
  ROW_LIMIT,
  Rise,
  SeeAllRow,
  SmallAction,
  Status,
  Tag,
  Tile,
  heroText,
} from "@/components/record-kit"
import { TabScreen, openTab } from "@/components/tab-bar"
import { toast } from "@/components/toast"
import { Button } from "@/components/ui"
import { useAllowance } from "@/lib/allowance"
import { flourishScore } from "@/lib/conversation"
import { canOffer, useExperience, useInlayScore, useMarkers } from "@/lib/experience"
import { call } from "@/lib/links"
import { planFocus, useOffer } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { scoreOverTime } from "@/lib/record"
import { ink, space, type } from "@/lib/theme"
import { NEW_IN_RECORD_NOTE, caughtUp, comingUp, homeBanner, markSeen, needsTitle, todo, yourMedicines, type TodoItem } from "@/lib/todo"
import { chartInput, directionWords, homeTiles, trendCounts, watchList } from "@/lib/trends"

/* Home on the free record (FINAL-SPEC C.1), in the order Olivia needs it:
   the one status banner when something is true; Needs you, the screen's
   one teal hero, with a one tap action on every row; Coming up; New in
   your record; Your trends, the count line and the dot graph tiles; Your
   medicines by name; Your Inlay score with her own why and her
   flourishing result; Ask about your results with this month's allowance;
   and last and quiet, the plan card.

   The same screen draws every state of the free record (C.1.4, C.28): not
   connected, the record still arriving, sharing turned off, a paused
   member (the paused card above the hero, no plan card) and a cancelled
   one. Whether the plan card shows, and as a card or one quiet line, is
   the cap service's decision (lib/offers.ts), never this screen's.

   RecordSections is the record part on its own (Needs you to Ask), which
   the member home shows under its setup and review heroes with Needs you
   as a white card, so a screen keeps one hero. */

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
              <Rise at={1} id="home:paused">
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
    results. `needsAsCard` draws Needs you as a white card titled "Needs
    you" instead of the teal hero, for a screen that has its own hero (the
    member home's setup and review stages). While the record is still
    arriving nothing can need her yet: practice appointments, and one line
    each where trends and medicines will be. */
export function RecordSections({ needsAsCard = false }: { needsAsCard?: boolean }) {
  const building = useExperience().experience === "building"
  return (
    <View style={styles.page}>
      {!building && <NeedsYou asCard={needsAsCard} />}
      <ComingUp />
      {!building && <NewInRecord />}
      {building ? <Waiting at={5} id="trends" title="Your trends" line={`Your trends appear once your results${NBSP}arrive.`} /> : <Trends />}
      {building ? <Waiting at={6} id="medicines" title="Your medicines" line={`Your medicines appear once your records${NBSP}arrive.`} /> : <Medicines />}
      <ScoreCard />
      <AskRow />
    </View>
  )
}

/* ------------------------------------------------------------ opening -- */

const openToDo = () => openTab("/gaps", "home")

/** A row's own action: a page, or a call to the practice. */
function act(item: TodoItem) {
  const a = item.action
  if (a?.tel) call(a.tel)
  else if (a?.href) router.push(a.href as Href)
}

/* ------------------------------------------------------------- words -- */

const NBSP = "\u00A0"

/** A row's words as they wrap on a narrow phone: the app's one rule
    (care-gap.ts keepTogether), which holds dates, times, names, places and
    "Reminder 2 of 3" whole and never leaves one short word on a line. */
const together = (words?: string) => (words ? keepTogether(words) : undefined)

/* --------------------------------------------------------- needs you -- */

/** What needs her now (C.1.2, 3): the count as the title, the first three
    items as actions with a pill each, then See all, which opens To do.
    No status colour and no "Overdue" here: the hero already says it needs
    her. With nothing open, a white card says she is all caught up and
    what is next. */
function NeedsYou({ asCard }: { asCard: boolean }) {
  const onboarding = useOnboarding()
  const needs = todo(onboarding).needs

  if (!needs.length) {
    const next = caughtUp(onboarding)
    return (
      <Rise at={2} id="home:needs">
        <Group>
          <NeedsRow
            icon={<IconCheck size={18} color={HUE.green.ink} strokeWidth={2.2} />}
            hue="green"
            title={next.title}
            meta={together(next.meta)}
            onPress={next.href ? () => router.push(next.href as Href) : undefined}
          />
        </Group>
      </Rise>
    )
  }

  const rows = needs.slice(0, ROW_LIMIT).map((item) => (
    <NeedsRow
      key={item.id}
      icon={<RecordIcon name={item.icon} size={asCard ? 18 : 16} color={HUE.teal.ink} />}
      hue="teal"
      title={item.title}
      meta={together(item.meta)}
      right={
        item.action ? (
          <SmallAction onPress={() => act(item)} accessibilityLabel={item.action.tel ? `Call the practice, ${item.action.tel}` : item.title}>
            {item.action.label}
          </SmallAction>
        ) : undefined
      }
      chevron={false}
      onPress={() => router.push(item.href as Href)}
    />
  ))

  if (asCard)
    return (
      <Rise at={2} id="home:needs">
        <Block title="Needs you" variant="title" onSeeAll={openToDo}>
          <Group>{rows}</Group>
        </Block>
      </Rise>
    )

  return (
    <Rise at={2} id="home:needs">
      <Hero>
        <Text style={heroText.title} accessibilityRole="header">
          {needsTitle(needs.length)}
        </Text>
        <Group inset>{rows}</Group>
        <SeeAllRow onHero onPress={openToDo} />
      </Hero>
    </Rise>
  )
}

/* --------------------------------------------------------- coming up -- */

/** Appointments and booked tests in the next 30 days, and tests ordered
    that are not due yet, by date (C.1.2, 4). A date block only for
    something that happens on that day; an open order keeps its icon and
    says its due date in words. */
function ComingUp() {
  const onboarding = useOnboarding()
  const coming = comingUp(onboarding).slice(0, ROW_LIMIT)
  if (!coming.length) return null
  return (
    <Rise at={3} id="home:coming">
      <Block title="Coming up" variant="title" onSeeAll={openToDo}>
        <Group>
          {coming.map((item) => (
            <NeedsRow
              key={item.id}
              date={item.date}
              icon={item.date ? undefined : <RecordIcon name={item.icon} size={18} color={HUE[item.hue].ink} />}
              hue={item.hue}
              title={item.title}
              meta={together(item.meta)}
              note={item.note}
              tag={item.tag}
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
      <Block title="New in your record" variant="title">
        <Group>
          {items.map((item) => (
            <NeedsRow
              key={item.id}
              icon={<RecordIcon name={item.icon} size={18} color={HUE.blue.ink} />}
              hue="blue"
              title={item.title}
              meta={together(item.meta)}
              tag={item.tag}
              onPress={() => open(item)}
            />
          ))}
        </Group>
        <Text style={styles.footnote}>{NEW_IN_RECORD_NOTE}</Text>
      </Block>
    </Rise>
  )
}

/* ------------------------------------------------------- your trends -- */

const openResults = (filter?: "watch") =>
  router.push({ pathname: "/record/[kind]", params: filter ? { kind: "results", filter } : { kind: "results" } })

/** Her trends (C.1.2, 6): the count line, then a tile for each marker
    worth watching, in the F-26 order with her own "improve" answers
    breaking ties, the fourth cell going to good news when there is some.
    Three tiles leave the fourth cell to All results; one tile spans the
    row; none at all says her results are steady, as good news. */
function Trends() {
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const counts = trendCounts(markers)
  const list = watchList(markers, { improve: onboarding.why?.improve })
  const { tiles, seeAll } = homeTiles(list, { goodNews: true })
  const open = (id: string) => router.push({ pathname: "/biomarker/[id]", params: { id } })

  if (!tiles.length)
    return (
      <Rise at={5} id="home:trends">
        <Block title="Your trends" variant="title" meta={counts.line}>
          <Card>
            <View style={styles.okRow}>
              <Tile hue="green">
                <IconCheck size={18} color={HUE.green.ink} strokeWidth={2.2} />
              </Tile>
              <View style={styles.okBody}>
                <View style={styles.okWords}>
                  <Text style={styles.okTitle}>Your results are steady</Text>
                  <Text style={styles.okMeta}>{`${counts.steady} results are in range and steady`}</Text>
                </View>
                <SmallAction onPress={() => openResults()}>See all results</SmallAction>
              </View>
            </View>
          </Card>
        </Block>
      </Rise>
    )

  const grid = tiles.map((t) => ({
    id: t.id,
    ...chartInput(t),
    direction: directionWords(t),
    // The pre-built sentence, units and months spelled out (C.1.2, 6).
    spoken: t.spoken,
    onPress: () => open(t.id),
    playKey: `home:tile:${t.id}`,
  }))

  return (
    <Rise at={5} id="home:trends">
      <Block title="Your trends" variant="title" meta={counts.line}>
        <TrendGrid
          tiles={grid}
          last={
            tiles.length === 3 ? (
              <AllResultsTile
                steady={counts.steady}
                inRange={counts.inRange}
                borderline={counts.borderline}
                out={counts.out}
                onPress={() => openResults()}
                style={styles.fill}
              />
            ) : undefined
          }
        />
        {seeAll ? (
          <Group>
            <SeeAllRow label={seeAll} onPress={() => openResults("watch")} />
          </Group>
        ) : tiles.length === 1 ? (
          <Group>
            <SeeAllRow label="See all results" onPress={() => openResults()} />
          </Group>
        ) : null}
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
    <Rise at={6} id="home:medicines">
      <Block title="Your medicines" variant="title" onSeeAll={() => router.push("/medications")} count={meds.total}>
        <Group>
          {meds.rows.map((m) => (
            <NeedsRow
              key={m.id}
              title={m.name}
              meta={together(m.meta)}
              right={
                m.differs ? (
                  <Status level="borderline" bare>
                    Records differ
                  </Status>
                ) : undefined
              }
              onPress={() => router.push({ pathname: "/medications", params: { id: m.id } })}
            />
          ))}
          {!!meds.supplements && <Text style={styles.supplements}>{meds.supplements}</Text>}
        </Group>
      </Block>
    </Rise>
  )
}

/* ------------------------------------------------- your inlay score -- */

/** Narrower than this (a 320 pt phone), the score card's words would be
    cut short beside the gauge, so her why moves under it (as the day page
    shrinks its ring there). */
const NARROW = 360

/** Her Inlay score beside her own why and her flourishing result (C.1.2,
    8), the change since her first check in as a tag ("First score" before
    there is one), by the one rule the score page and Progress follow
    (lib/record.ts scoreOverTime). Never invented: with no survey answers
    the card is not here, and while the record is still arriving only the
    flourishing part shows. Opens the score page. */
function ScoreCard() {
  const onboarding = useOnboarding()
  const building = useExperience().experience === "building"
  const narrow = useWindowDimensions().width < NARROW
  const answers = onboarding.why?.flourish
  const today = useInlayScore()
  if (!answers?.length) return null
  const score = building ? undefined : today
  const flourishing = `Flourishing ${flourishScore(answers).overall.toFixed(1)} of 5`
  const why = onboarding.why?.reason?.trim()
  const tag = scoreOverTime(score, onboarding.scores).tag
  // Two lines of her own words, whole: beside the gauge, or on a narrow
  // phone across the card under it, the flourishing line after them so
  // the card still reads title, why, result.
  const quote = !!why && score !== undefined && <Quote text={why} />
  const below = narrow && !!quote
  const foot = (
    <View style={styles.scoreFoot}>
      <Text style={styles.scoreMeta}>{flourishing}</Text>
      <IconChevronRight size={16} color={ink.tertiary} />
    </View>
  )

  return (
    <Rise at={7} id="home:score">
      <Card onPress={() => router.push("/score")}>
        <View style={styles.scoreRow}>
          {score !== undefined && <ScoreGauge score={score} size={88} name="Inlay score" playKey="home:score" />}
          <View style={styles.scoreBody}>
            <View style={styles.scoreHead}>
              <Text style={styles.scoreTitle}>Your Inlay score</Text>
              {tag && <Tag tone={tag.tone}>{tag.label}</Tag>}
            </View>
            {score === undefined && <Text style={styles.waiting}>{`Your score is ready once your record${NBSP}is`}</Text>}
            {!below && quote}
            {!below && foot}
          </View>
        </View>
        {below && (
          <View style={styles.scoreBelow}>
            {quote}
            {foot}
          </View>
        )}
      </Card>
    </Rise>
  )
}

/* ----------------------------------------------- ask about your results -- */

/** The way into the assistant about her results (C.1.2, 9), with this
    month's free questions; a member's are never counted, so no line. */
function AskRow() {
  const allowance = useAllowance()
  return (
    <Rise at={8} id="home:ask">
      <Group>
        <NeedsRow
          icon={<IconSparkle size={18} color={HUE.teal.ink} />}
          hue="teal"
          title="Ask about your results"
          meta={together(allowance.line || undefined)}
          onPress={() => router.push({ pathname: "/assistant", params: { topic: "results" } })}
        />
      </Group>
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

  if (offer.soft)
    return (
      <Rise at={9} id="home:plan">
        <Nudge variant="link" title="A plan can build your days around your results." action={`See${NBSP}how${NBSP}it${NBSP}works`} onAction={see} onShow={offer.markShown} />
      </Rise>
    )

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
    the hero, with the screen's one object. */
function PausedCard() {
  return (
    <Card>
      <View style={styles.pausedTop}>
        <View style={styles.pausedWords}>
          <Text style={styles.pausedTitle} accessibilityRole="header">
            Your plan is paused
          </Text>
          <Text style={styles.pausedBody}>Your record, trends and reminders carry on. Every version of your plan is kept.</Text>
        </View>
        <Art name="target" size={64} />
      </View>
      <View style={styles.pausedAction}>
        <Button onPress={() => router.push({ pathname: "/membership", params: { sheet: "resume" } })}>Resume my plan</Button>
      </View>
    </Card>
  )
}

/** A section whose data is still arriving: its title and one line. */
function Waiting({ at, id, title, line }: { at: number; id: string; title: string; line: string }) {
  return (
    <Rise at={at} id={`home:${id}`}>
      <Block title={title} variant="title">
        <Card>
          <Text style={styles.waiting}>{line}</Text>
        </Card>
      </Block>
    </Rise>
  )
}

const styles = StyleSheet.create({
  // Sections a tab screen's section apart (Frontline 20).
  page: { gap: space.section },
  fill: { flex: 1 },

  footnote: { ...type.meta },
  // The medicines card's last line, at a row's height.
  supplements: { ...type.label, paddingVertical: space.rowY },
  // A sentence standing in for what is still arriving (a card's only line,
  // or the score's place): quieter than the data it waits for, a step
  // above the meta under it, as the kit's empty state line.
  waiting: { ...type.body, color: ink.secondary },

  okRow: { flexDirection: "row", alignItems: "flex-start", gap: space.lead },
  // The words, then their action a heading's distance under them.
  okBody: { flex: 1, gap: space.item },
  okWords: { gap: space.line },
  okTitle: { ...type.title },
  okMeta: { ...type.label },

  scoreRow: { flexDirection: "row", alignItems: "center", gap: space.lead },
  // Title, why and flourishing: lines in a three line stack.
  scoreBody: { flex: 1, gap: space.stack },
  // A longer change ("Up 2 since Aug") wraps under the title rather than
  // cutting it short.
  scoreHead: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: space.inline, rowGap: space.stack },
  scoreTitle: { ...type.title },
  scoreFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline },
  scoreMeta: { ...type.meta, flexShrink: 1 },
  // Her why and the flourishing line under the gauge row on a narrow
  // phone, a heading's distance below it, across the card, stacked as
  // beside the gauge.
  scoreBelow: { marginTop: space.item, gap: space.stack },

  pausedTop: { flexDirection: "row", alignItems: "flex-start", gap: space.lead },
  pausedWords: { flex: 1, gap: space.stack },
  pausedTitle: { ...type.section },
  pausedBody: { ...type.body },
  pausedAction: { marginTop: space.card },

})
