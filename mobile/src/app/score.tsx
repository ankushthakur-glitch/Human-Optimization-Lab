import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { ScoreGauge, ScoreHistory, type CheckIn } from "@/components/charts"
import { FlowScreen } from "@/components/flow"
import { FlourishCard } from "@/components/flourish"
import { Smiley } from "@/components/ph"
import { FocusIcon } from "@/components/plan-tab-pieces"
import { RecordIcon } from "@/components/record-icons"
import { Block, Card, EmptyState, Group, KeyValue, NeedsRow, Nudge, SmallAction, Tag } from "@/components/record-kit"
import { DOMAINS, flourishScore } from "@/lib/conversation"
import { planFor, useExperience, useInlayScore, useMarkers } from "@/lib/experience"
import { nextCheckIn, profileOf } from "@/lib/member"
import { FOCUS_NAME, planFocus, useOffer } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { scoreOverTime, type FocusArea } from "@/lib/record"
import { color, hairline, space, type } from "@/lib/theme"
import { trendCounts, watchList, type Trend } from "@/lib/trends"

/* The Inlay score (FINAL-SPEC C.12): how she said she is doing beside what
   her record shows, as one number out of 100 that is never a risk score.
   Top to bottom: the gauge with the change since her first check in and
   when the next one is; what the number is and is not; every check in so
   far (a first score is one sentence, not an empty chart); the two parts it
   is made of; the results and the part of life that would raise it most,
   each a question for the assistant (never a sales list); for a free
   patient ready for it, one quiet line about a plan that names the same
   areas as those results, with "Not now"; and her flourishing answers. No
   object: the gauge is the focal point. Never invented: without survey
   answers there is no score (A-44), and before her record is here only the
   flourishing part shows (C.28). */

/** "any illness" is held together, so a narrow phone never leaves the last
    word on a line of its own. */
const ABOUT =
  "Your Inlay score combines how you said you're doing with what your record shows. It isn't a risk score and doesn't predict any\u00A0illness."

/** On a tie for her lowest answer, the part of life the assistant can help
    with most comes first. */
const HEALTH = "Physical and mental health"

/** The fewest points between today's score and the previous one for its
    tick to stand clear of the bead on the dial (4 is about 10°). */
const TICK_GAP = 4

/** "keep" as "keeping", "live" as "living", "get" as "getting". */
function gerund(verb: string) {
  if (verb === "be") return "being"
  if (/ie$/.test(verb)) return `${verb.slice(0, -2)}ying`
  if (/[^aeiouy]e$/.test(verb)) return `${verb.slice(0, -1)}ing`
  if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(verb)) return `${verb}${verb.slice(-1)}ing`
  return `${verb}ing`
}

/** Her words turned to face her: "my kids" reads "your kids". */
const toHer = (s: string) =>
  s
    .replace(/\bI'm\b/gi, "you're")
    .replace(/\bmyself\b/gi, "yourself")
    .replace(/\bmine\b/gi, "yours")
    .replace(/\bmy\b/gi, "your")
    .replace(/\bme\b/gi, "you")
    .replace(/\bI\b/g, "you")

/** What she said matters, from her reason in the why conversation: "To
    keep up with my kids and feel like myself again" reads "keeping up with
    your kids". Only a reason that starts with "To" turns; anything else
    gives nothing, and the line goes on without it. */
function whatMatters(reason?: string): string | undefined {
  const m = reason?.trim().match(/^to\s+([a-z]+)\b(.*)$/i)
  if (!m) return undefined
  const rest = m[2].split(/\s+and\s+|[,.;:!?]/i)[0]
  const words = toHer(`${gerund(m[1].toLowerCase())}${rest}`).trim()
  return words || undefined
}

/** Words that read as one, held on one line when a row wraps on a narrow
    phone: "3.5 of 5", "18.5 to 24.9", "Make it a plan". */
const together = (words: string) => words.replace(/ /g, " ")

/** A row title's last two words held together, so a narrow phone wraps
    "Physical and / mental health" and never leaves "health" alone. */
const lastPair = (words: string) => words.replace(/ (\S+)$/, (_all, last: string) => `\u00A0${last}`)

/** The areas as the plan pages name them: "blood sugar and weight", "bone
    health", each name held on one line ("Blood / sugar" never splits). */
function areaWords(areas: FocusArea[]) {
  const names = areas.map((a) => together(FOCUS_NAME[a].toLowerCase()))
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "")
}

/** The quiet plan line (touchpoint `score-page`, D.2): what she said
    matters, then the areas the results above it stand for. "You said
    keeping up with your kids matters most. Blood sugar and weight move
    your score most right now." */
function planLine(reason: string | undefined, areas: FocusArea[]) {
  const said = whatMatters(reason)
  const words = areaWords(areas)
  const focus = `${words.charAt(0).toUpperCase()}${words.slice(1)} ${areas.length > 1 ? "move" : "moves"} your score most right now.`
  return said ? `You said ${said} matters most. ${focus}` : focus
}

/** The results that would raise her score most: two at most, each out of
    range, in the order the app watches them (FINAL-SPEC F-26, her own
    "improve" answers first on a tie). `areas` lead:
    - a member's plan areas: her lab results in them first, so a weight plan
      reads A1c and LDL and a bone plan vitamin D;
    - on the free record, the areas the plan line names, one result each (a
      vital counts here, so weight is her BMI), so the line never names an
      area the list leaves out.
    Her other out of range lab results fill the rest. */
function waysToRaise(watched: Trend[], areas: FocusArea[], plan: boolean): Trend[] {
  const out = watched.filter((t) => t.status === "out" && t.latest)
  const labs = out.filter((t) => t.marker.kind === "lab")
  const lead = plan
    ? labs.filter((t) => t.marker.focus !== undefined && areas.includes(t.marker.focus))
    : areas.map((area) => out.find((t) => t.marker.focus === area)).filter((t): t is Trend => t !== undefined)
  return [...new Set([...lead, ...labs])].slice(0, 2)
}

/** A count on the right of a row: "20" in the value style, " of 27" in the
    label style, like "80 of 110 g" on a member's goals. */
function Amount({ value, of }: { value: string | number; of: string }) {
  return (
    <Text style={styles.amount} maxFontSizeMultiplier={1.3}>
      {value}
      <Text style={styles.amountOf}>{` ${of}`}</Text>
    </Text>
  )
}

/** The face that stands for how she feels, on the answers' rows. */
const Feeling = () => <Smiley size={16} color={color.primary} />

export default function ScoreScreen() {
  const s = useOnboarding()
  const { experience } = useExperience()
  const markers = useMarkers()
  const now = new Date()
  const answers = s.why?.flourish ?? []
  // Before anything was collected, or while the record is still arriving,
  // there is no record half: only the flourishing part shows.
  const noRecord = experience === "declined" || experience === "building"
  const today = useInlayScore()
  const score = noRecord ? undefined : today

  const counts = React.useMemo(() => trendCounts(markers), [markers])
  const improve = s.why?.improve
  const watched = React.useMemo(() => watchList(markers, { improve }), [markers, improve])
  // What a plan would focus on for her, as the plan page shows it.
  const focus = planFocus(s, markers)
  // A member's rows follow her own plan (kept while paused); everyone
  // else's follow the areas a plan would focus on.
  const planAreas = planFor(experience) === "member" ? profileOf(s).areas : undefined
  const results = waysToRaise(watched, planAreas ?? focus.areas, planAreas !== undefined)
  // The plan line names only the areas a result above it stands for, and is
  // honest only while one of them has room to rise.
  const lineAreas = focus.areas.filter((area) => results.some((t) => t.marker.focus === area))
  const offer = useOffer("score-page", { eligible: score !== undefined && lineAreas.length > 0 })

  if (!answers.length)
    return (
      <FlowScreen page title="Inlay score">
        <EmptyState title="No score yet" line="Your score appears once you finish your conversation." />
      </FlowScreen>
    )

  const flourish = flourishScore(answers)
  const answersBlock = (
    <Block title="Your answers">
      <FlourishCard answers={answers} />
    </Block>
  )

  if (score === undefined)
    return (
      <FlowScreen page title="Inlay score">
        <EmptyState
          title="No score yet"
          line={experience === "declined" ? "Your score appears once your records are connected." : "Your score appears once your record arrives."}
        />
        {answersBlock}
      </FlowScreen>
    )

  // Her check ins before today with today's last, the change since her
  // first one and the one before today: the one rule Home and Progress
  // follow too (lib/record.ts scoreOverTime).
  const over = scoreOverTime(score, s.scores, now)
  const previous = over.previous
  // The previous check in shows as a tick only when it stands clear of the
  // bead; closer, it reads as a glitch, and the tag says the change anyway.
  const tick = previous !== undefined && Math.abs(score - previous) >= TICK_GAP ? previous : undefined
  const tag = over.tag
  const next = nextCheckIn(now)
  const checkIns: CheckIn[] = over.history

  const ask = (params: { marker: string } | { ask: string }) => router.push({ pathname: "/assistant", params })

  // The part of life she rated lowest, to one decimal as her answers below
  // show it, when one is below the top. Answers come in halves, so ties are
  // common: physical and mental health goes first among equals, and the row
  // then says it is one of her lowest.
  const parts = DOMAINS.map((name, i) => ({ name, value: Number(flourish.domains[i].toFixed(1)) })).filter((d) => d.value > 0)
  const lowest = [...parts].sort((a, b) => a.value - b.value || Number(b.name === HEALTH) - Number(a.name === HEALTH))[0]
  const tied = lowest !== undefined && parts.filter((d) => d.value === lowest.value).length > 1
  const lowestRow =
    lowest && lowest.value < 5
      ? {
          name: lowest.name,
          meta: `${tied ? "One of your lowest answers" : "Your lowest answer"}, ${together(`${lowest.value.toFixed(1)} of 5`)}`,
          open: () => ask({ ask: `What small steps could help my ${lowest.name.toLowerCase()}?` }),
        }
      : undefined

  return (
    <FlowScreen page title="Inlay score">
      <View style={styles.lead}>
        <Card style={styles.scoreCard}>
          <View style={styles.gauge}>
            <ScoreGauge score={score} previous={tick} size={184} name="Inlay score" playKey="score:gauge" />
            {tag && (
              <View style={styles.tag}>
                <Tag tone={tag.tone}>{tag.label}</Tag>
              </View>
            )}
          </View>
          <View style={styles.rule} />
          <KeyValue label="Next check in" value={next} last />
        </Card>
        <Text style={styles.about}>{ABOUT}</Text>
      </View>

      <Block title="Over time">
        {checkIns.length > 1 ? (
          <Card>
            <ScoreHistory checkIns={checkIns} playKey="score:history" />
          </Card>
        ) : (
          // A first score is a sentence, not an empty chart (F.3).
          <Text style={styles.single}>{`One score so far. Your next check in is in ${next}.`}</Text>
        )}
      </Block>

      <Block title="What goes into it">
        <Group>
          <NeedsRow
            icon={<Feeling />}
            title="How you're doing"
            meta={`From your ${together(`${answers.length} answers`)}`}
            right={
              // Kept clear of the chevron's column, so both counts end in line.
              <View style={styles.unlinked}>
                <Amount value={flourish.overall.toFixed(1)} of="of 5" />
              </View>
            }
            accessibilityLabel={`How you're doing, ${flourish.overall.toFixed(1)} of 5, from your ${answers.length} answers`}
          />
          <NeedsRow
            icon={<RecordIcon name="labs" size={16} color={color.primary} />}
            title="Your record"
            meta="Results in range"
            right={<Amount value={counts.inRange} of={`of ${counts.total}`} />}
            accessibilityLabel={`Your record, ${counts.inRange} of ${counts.total} results in range`}
            onPress={() => router.push("/record/results")}
          />
        </Group>
      </Block>

      {(results.length > 0 || lowestRow) && (
        <Block title="Ways to raise it">
          <Group>
            {results.map((t) => {
              const name = t.marker.short ?? t.marker.name
              const range = `range ${together(`${t.marker.target.charAt(0).toLowerCase()}${t.marker.target.slice(1)}`)}`
              const open = () => ask({ marker: t.id })
              return (
                <NeedsRow
                  key={t.id}
                  icon={t.marker.focus ? <FocusIcon area={t.marker.focus} /> : <RecordIcon name="labs" size={16} color={color.primary} />}
                  title={`Your ${name}`}
                  meta={`${together(t.valueWithUnit)}, ${range}`}
                  right={
                    <SmallAction onPress={open} accessibilityLabel={`Ask about your ${name}`}>
                      Ask
                    </SmallAction>
                  }
                  chevron={false}
                  onPress={open}
                  accessibilityLabel={`Ask about your ${name}, ${t.valueWithUnit}, ${range}`}
                />
              )
            })}
            {lowestRow && (
              <NeedsRow
                icon={<Feeling />}
                title={lastPair(lowestRow.name)}
                meta={lowestRow.meta}
                right={
                  <SmallAction onPress={lowestRow.open} accessibilityLabel={`Ask about ${lowestRow.name.toLowerCase()}`}>
                    Ask
                  </SmallAction>
                }
                chevron={false}
                onPress={lowestRow.open}
                accessibilityLabel={`Ask about ${lowestRow.name.toLowerCase()}, ${lowestRow.meta.charAt(0).toLowerCase()}${lowestRow.meta.slice(1)}`}
              />
            )}
          </Group>
          {offer.show && (
            <Nudge
              variant="link"
              title={planLine(s.why?.reason, lineAreas)}
              action={together("Make it a plan")}
              onAction={() => {
                offer.markOpened()
                router.push({ pathname: "/plans", params: { from: "score" } })
              }}
              // Not now: hidden for 30 days (D.2, touchpoint score-page).
              onDismiss={offer.notNow}
              onShow={offer.markShown}
            />
          )}
        </Block>
      )}

      {answersBlock}
    </FlowScreen>
  )
}

/** The record kit's row chevron, which the unlinked count keeps clear of. */
const CHEVRON = 16

const styles = StyleSheet.create({
  // The gauge card and the sentence that says what it is, read as one.
  lead: { gap: space.item },
  // The key value row carries its own padding below, so the card's foot
  // still measures the card's padding.
  scoreCard: { paddingBottom: space.card - space.rowY },
  // The tag sits under the dial as its caption.
  gauge: { alignItems: "center", gap: space.stack },
  tag: { alignSelf: "center" },
  // The record kit's rule between rows, a card's padding under the dial.
  rule: { height: 1, backgroundColor: hairline.rule, marginTop: space.card },
  about: { ...type.body },
  // One score so far: a quiet line where the chart will be, in the chart
  // kit's note style.
  single: { ...type.label },
  // A row's chevron and the row's gap before it.
  unlinked: { paddingRight: CHEVRON + space.lead },
  amount: { ...type.value, fontVariant: ["tabular-nums"] },
  amountOf: { ...type.label },
})
