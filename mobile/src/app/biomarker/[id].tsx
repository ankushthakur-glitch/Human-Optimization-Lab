import { router, useLocalSearchParams, type Href } from "expo-router"
import * as React from "react"
import { Animated, Linking, StyleSheet, Text, View } from "react-native"

import { BiomarkerTrend, PressureChart, RangeBar, rangeDomain, useEntrance, type PressureReading } from "@/components/charts"
import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { IconInfo, IconPlan } from "@/components/icons"
import { RecordIcon } from "@/components/record-icons"
import {
  AllowanceLine,
  Banner,
  Block,
  Card,
  Dot,
  Group,
  HUE,
  NeedsRow,
  Nudge,
  SaveQuestion,
  SeeAllRow,
  SmallAction,
  Status,
  TrendPill,
  type Hue,
  type Level,
} from "@/components/record-kit"
import { Button } from "@/components/ui"
import { experience, useMarkers } from "@/lib/experience"
import { MEMBER, PLAN_START_RESULTS, clockOf, dateOfAt, dayLabel, planLineFor, pressureReadingsOf, pressures, sinceStart, type Measure } from "@/lib/member"
import { useChangeCourse } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { MARKER_CARE, PLACE_NAME, type Biomarker, type Point } from "@/lib/record"
import { orderHref, todo, type TodoItem } from "@/lib/todo"
import {
  STATUS_WORD,
  chartSeries,
  classify,
  directionWords,
  formatNumber,
  needsReview,
  pointDate,
  pointStatus,
  pointTime,
  precisionOf,
  questionsOf,
  spokenValue,
  valueText,
  type Trend,
} from "@/lib/trends"
import { hairline, space, type } from "@/lib/theme"

/* One marker's page: it finishes the thought its tile starts (FINAL-SPEC
   C.3). Top to bottom: where the latest result sits, in words and on the
   range, with the clinical next step inside the same card so it is in the
   first view and always above any offer; how it has moved, to scale in
   time; every result with where it came from; what the marker measures;
   questions to save for Dr. Patel; and last, only for a free patient whose
   results are moving away from her range and only when the cap service
   allows it, "Want to change course?". "Ask about this result" stays
   pinned, with the free questions left above it.

   The words are facts from lib/trends.ts (status, direction, the change
   since the first result); what they mean clinically is the doctor's. A
   clinical value never counts up or slides: the readout fades in place
   with its card. Results measured another way (a home kit) are shown
   hollow and never joined to the line. Members see how far the marker has
   come since their starting tests, and what their plan does about it,
   instead of any offer. */

/** Results shown before "Show all". */
const ROWS = 5

/** The doctor as sentences name her: "Dr. Patel". */
const DOCTOR = MEMBER.doctorShort

/** The practice as a call button names it: "Harborview". */
const PRACTICE = PATIENT.practice.split(" ")[0]

const ONE: Record<Trend["noun"], string> = { results: "result", readings: "reading", measurements: "measurement" }

/** "5 results", "1 result". */
const counted = (n: number, noun: Trend["noun"]) => `${n} ${n === 1 ? ONE[noun] : noun}`

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

/** A result's day for a screen reader: "August 14, 2026". */
function spokenDay(p: Point) {
  const d = new Date(pointTime(p))
  return Number.isNaN(d.getTime()) ? p.date : `${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/** The method a marker's line follows (the clinical draw); results measured
    any other way are shown, never joined. */
const referenceOf = (t: Trend) => t.series[0]?.method ?? ""

/** Where a result came from, with its method when it is not the one the
    line follows: "Quest Diagnostics", "You, home finger prick kit". */
function sourceLine(p: Point, t: Trend) {
  const place = PLACE_NAME[p.origin]
  return (p.method ?? "") !== referenceOf(t) && p.method ? `${place}, ${lowerFirst(p.method)}` : place
}

/** The words before the chart: the pre-built takeaway, with how many
    results it rests on when it does not say so already. One result or none
    has no takeaway: the pills and the chart say it. */
function takeawayLine(t: Trend) {
  if (t.count < 2) return undefined
  const line = t.takeaway.replace(/\.$/, "")
  const plain = /^(Up from|Down from|Steady since)\b/.test(line) && !/\b(across|now in your range)\b/.test(line)
  return plain ? `${line}, across ${counted(t.count, t.noun)}.` : `${line}.`
}

/** A booked day and time as a local date: the to do list's "2026-10-06T07:30". */
const dayOf = (at: string | Date) => (typeof at === "string" ? dateOfAt(at) : at)

/** The quiet variant's action, from the offer's one line ("Want to change
    course? See how a plan works"), so the words live with the offer. */
const quietAction = (c: { title: string; link: string }) => (c.link.startsWith(c.title) ? c.link.slice(c.title.length).trim() : c.link)

/** The arrow on the direction pill: a fact, never coloured. */
const ARROW: Partial<Record<Trend["movement"], "up" | "down" | "steady">> = { rising: "up", falling: "down", steady: "steady" }

/** Blood pressure from the record as the pressure chart reads it. */
function clinicReadings(b: Biomarker): PressureReading[] {
  return b.points
    .filter((p) => p.value2 !== undefined)
    .map((p) => ({ date: p.date, at: p.at, systolic: p.value, diastolic: p.value2!, source: PLACE_NAME[p.origin], status: pointStatus(b, p) }))
}

/* ------------------------------------------------------------- page -- */

export default function MarkerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const b = markers.find((m) => m.id === id)
  const offer = useChangeCourse(b)
  if (!b) return <PageNotFoundState />

  const t = classify(b)
  const exp = experience(onboarding)
  const member = exp === "member"
  const review = needsReview(b, t.latest)
  const steps = nextSteps(b, onboarding, member)
  const course = offer.copy
  // A member's own evening readings: a chart of their own, and the average
  // her question quotes.
  const homeList = member && b.id === "bp" ? pressures(onboarding).slice(-30) : []
  const home = homeAverage(homeList)
  const questions = pageQuestions(t, { booked: steps.some((s) => s.booked), home })

  return (
    <FlowScreen
      page
      title={b.name}
      footer={
        <>
          <AllowanceLine align="center" />
          <Button variant="outline" onPress={() => router.push({ pathname: "/assistant", params: { marker: b.id } })}>
            Ask about this result
          </Button>
        </>
      }
    >
      <Readout b={b} t={t} member={member} review={review} steps={steps} />
      {b.points.length > 0 && <OverTime b={b} t={t} />}
      {!!home && <HomeReadings list={homeList} average={home} />}
      <EveryResult b={b} t={t} />
      {!!b.about && (
        <Block title="What this measures" variant="title">
          <Card style={styles.about}>
            <Text style={type.body}>{b.about}</Text>
            <Text style={type.meta}>{b.aboutSource ?? "From MedlinePlus"}</Text>
          </Card>
        </Block>
      )}
      <Questions b={b} list={questions} />
      {!review && offer.show && course && (
        <Nudge
          variant={offer.soft ? "link" : "card"}
          art="compass"
          title={course.title}
          body={course.body}
          note={course.meta}
          action={offer.soft ? quietAction(course) : course.action}
          onAction={() => {
            offer.markOpened()
            router.push({ pathname: "/plans", params: { from: b.id } })
          }}
          dismissLabel={course.dismiss}
          onDismiss={offer.notNow}
          onDecline={offer.notForMe}
          onShow={offer.markShown}
        />
      )}
    </FlowScreen>
  )
}

/* ---------------------------------------------------------- readout -- */

type Step = {
  key: string
  icon: React.ReactNode
  hue: Hue
  title: string
  meta: string
  /** A test of this marker that is booked: its next result is on the way. */
  booked?: boolean
  onPress?: () => void
}

/** The clinical step for this marker, from the To do list so Home, To do
    and this page say the same thing: the plan's work on it (members), the
    test that measures it, and the care gap tied to it. Steps already done
    drop out. */
function nextSteps(b: Biomarker, s: ReturnType<typeof useOnboarding>, member: boolean): Step[] {
  const care = MARKER_CARE[b.id]
  const list = todo(s)
  const open = [...list.needs, ...list.coming, ...list.visit, ...list.booked]
  const tile = (item: TodoItem) => <RecordIcon name={item.icon} size={18} color={HUE[item.hue].ink} />
  const steps: Step[] = []

  const hrefs = [...new Set((care?.orders ?? []).map(orderHref))]
  for (const href of hrefs) {
    const item = open.find((i) => i.kind === "order" && i.href === href)
    if (!item) continue
    const booked = item.group === "booked" && item.date ? dayOf(item.date) : undefined
    steps.push({
      key: item.id,
      icon: tile(item),
      hue: item.hue,
      title: item.title,
      meta: booked ? `Booked for ${dayLabel(booked)}, ${clockOf(booked)}` : item.meta,
      booked: item.group === "booked",
      onPress: () => router.push(item.href as Href),
    })
  }

  // A member's plan works on the marker with Dr. Patel, so it stands in for
  // a care gap that is only something to talk about; one still to book or
  // call about stays.
  const plan = member ? planLineFor(b.id, s) : undefined
  for (const gap of care?.gaps ?? []) {
    const item = open.find((i) => i.id === `gap:${gap}`)
    const talk = item?.group === "visit"
    if (!item || (talk && plan)) continue
    steps.push({
      key: item.id,
      icon: tile(item),
      hue: item.hue,
      title: item.title,
      meta: talk ? "On your list for your next visit" : item.meta,
      onPress: () => router.push(item.href as Href),
    })
  }

  // What the plan does about it comes first, with the next test that
  // measures it when one is booked this week.
  if (plan)
    steps.unshift({
      key: "plan",
      icon: <IconPlan size={18} color={HUE.teal.ink} />,
      hue: "teal",
      title: "In your plan",
      meta: plan,
      onPress: () => router.push("/plan"),
    })
  return steps
}

/** Where the latest result sits: the status and direction, the value, when
    and where it was taken, the change in words, the range bar, and the
    next clinical step. */
function Readout({ b, t, member, review, steps }: { b: Biomarker; t: Trend; member: boolean; review: boolean; steps: Step[] }) {
  const fade = useEntrance(`marker:${b.id}`, { duration: 280 })
  const latest = t.latest
  const since = member ? sinceStart(b) : undefined
  const start = since ? PLAN_START_RESULTS[b.id]?.value : undefined
  const takeaway = takeawayLine(t)
  const arrow = ARROW[t.movement]

  return (
    <Animated.View style={{ opacity: fade }}>
      <Card style={styles.readout}>
        {latest ? (
          <View style={styles.head}>
            <View style={styles.pills}>
              <Status level={t.status} />
              <TrendPill trend={arrow}>{directionWords(t)}</TrendPill>
            </View>
            <View
              style={styles.figure}
              accessible
              accessibilityLabel={`Latest result, ${spokenValue(b, latest)}, ${lowerFirst(STATUS_WORD[t.status])}. ${spokenDay(latest)}, ${PLACE_NAME[latest.origin]}.`}
            >
              <View style={[styles.value, b.unit === "%" && styles.valueTight]}>
                <Text style={type.hero}>{t.value}</Text>
                <Text style={type.unitLarge}>{b.unit}</Text>
              </View>
              <Text style={type.meta}>{`Latest, ${pointDate(latest)}, ${PLACE_NAME[latest.origin]}`}</Text>
              {!!since && <Text style={type.meta}>{since.words}</Text>}
            </View>
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={type.section}>No results yet</Text>
            <Text style={type.label}>{`Range: ${lowerFirst(b.target)}`}</Text>
          </View>
        )}

        {!!latest && (
          <View style={styles.range}>
            {!!takeaway && <Text style={type.body}>{takeaway}</Text>}
            {b.id === "bp" && latest.value2 !== undefined ? (
              <PressureBars b={b} latest={latest} />
            ) : (
              <RangeBar
                value={latest.value}
                low={b.low}
                high={b.high}
                status={t.status}
                start={start}
                unit={b.unit}
                range={b.target}
                format={(v) => formatNumber(v, precisionOf(b))}
                playKey={`marker-range:${b.id}`}
              />
            )}
          </View>
        )}

        {review && (
          <View style={styles.review}>
            <Text style={[type.body, styles.reviewText]}>{`${DOCTOR} will review this result.`}</Text>
            <SmallAction onPress={() => Linking.openURL(`tel:${PATIENT.practicePhone}`)}>{`Call ${PRACTICE}`}</SmallAction>
          </View>
        )}

        {steps.length > 0 && (
          <View style={styles.next}>
            <Text style={type.metaStrong}>Next step</Text>
            <View>
              {steps.map((step, i) => (
                <View key={step.key} style={i > 0 && styles.rule}>
                  <NeedsRow icon={step.icon} hue={step.hue} title={step.title} meta={step.meta} onPress={step.onPress} />
                </View>
              ))}
            </View>
          </View>
        )}
      </Card>
    </Animated.View>
  )
}

/** Blood pressure has two numbers, each with its own limit: one bar for
    each, so neither hides behind the other. Each bar's name sits in its top
    left corner, level with the value over the marker, unless the marker is
    so far left that they would meet; then the name goes above the bar. */
function PressureBars({ b, latest }: { b: Biomarker; latest: Point }) {
  const parts = [
    { label: "Top number", value: latest.value, high: b.high, status: pointStatus({ ...b, high2: undefined }, { value: latest.value }) },
    {
      label: "Bottom number",
      value: latest.value2!,
      high: b.high2,
      status: pointStatus({ ...b, low: undefined, high: b.high2, high2: undefined }, { value: latest.value2! }),
    },
  ]
  return (
    <View style={styles.bars}>
      {parts.map((p) => {
        const [d0, d1] = rangeDomain(undefined, p.high, p.value)
        const inCorner = (p.value - d0) / (d1 - d0) > 0.4
        return (
          <View key={p.label}>
            {!inCorner && <Text style={type.metaStrong}>{p.label}</Text>}
            <RangeBar value={p.value} high={p.high} status={p.status} unit={b.unit} range={p.high !== undefined ? `Below ${p.high}` : undefined} playKey={`marker-range:${b.id}:${p.label}`} />
            {inCorner && (
              <Text style={[type.metaStrong, styles.barName]} importantForAccessibility="no" accessibilityElementsHidden>
                {p.label}
              </Text>
            )}
          </View>
        )
      })}
    </View>
  )
}

/* -------------------------------------------------------- over time -- */

/** How it has moved, to scale in time: the marker trend, or both numbers
    of blood pressure. Scrubbing the plot moves the readout above it. */
function OverTime({ b, t }: { b: Biomarker; t: Trend }) {
  const all = b.points.length
  const bp = b.id === "bp"
  return (
    <View style={styles.overTime}>
      <Card style={styles.chartCard}>
        <View style={styles.cardHead}>
          <Text style={type.section} accessibilityRole="header">
            Over time
          </Text>
          <Text style={type.meta}>{counted(all, t.noun)}</Text>
        </View>
        {bp ? <PressureChart readings={clinicReadings(b)} playKey={`marker-chart:${b.id}`} /> : <BiomarkerTrend {...chartSeries(t)} playKey={`marker-chart:${b.id}`} />}
      </Card>
      {!!b.methodNote && <Banner hue="teal" icon={<IconInfo size={18} color={HUE.teal.ink} />} title={b.methodNote} />}
    </View>
  )
}

/** The average of a member's last 7 evening readings at home ("127/80"),
    as "Your home readings" states it and her question quotes it. */
type HomeAverage = { evenings: number; text: string }

function homeAverage(list: Measure[]): HomeAverage | undefined {
  const week = list.filter((m) => m.value2 !== undefined).slice(-7)
  if (!week.length) return undefined
  const mean = (pick: (m: Measure) => number) => Math.round(week.reduce((sum, m) => sum + pick(m), 0) / week.length)
  return { evenings: week.length, text: `${mean((m) => m.value)}/${mean((m) => m.value2!)}` }
}

/** A member's own blood pressure readings at home: another method, so a
    chart of their own, never joined to the clinic's. */
function HomeReadings({ list, average }: { list: Measure[]; average: HomeAverage }) {
  return (
    <Card style={styles.chartCard}>
      <View style={styles.cardTitle}>
        <Text style={type.section} accessibilityRole="header">
          Your home readings
        </Text>
        <Text style={type.label}>{`Average of the last ${average.evenings} evenings: ${average.text}`}</Text>
      </View>
      <PressureChart readings={pressureReadingsOf(list)} playKey="marker-chart:bp-home" />
    </Card>
  )
}

/* ----------------------------------------------------- every result -- */

/** The chart's table twin: every result, newest first, with where it came
    from. A dot marks only a result that was out of range or borderline. */
function EveryResult({ b, t }: { b: Biomarker; t: Trend }) {
  const [all, setAll] = React.useState(false)
  const rows = [...b.points].sort((x, y) => pointTime(y) - pointTime(x))
  if (!rows.length) return null
  const shown = all ? rows : rows.slice(0, ROWS)
  return (
    <Block title="Every result" variant="title">
      <Group>
        {shown.map((p) => {
          const level: Level = pointStatus(b, p)
          const source = sourceLine(p, t)
          return (
            <NeedsRow
              key={`${p.at ?? p.date}${p.method ?? ""}`}
              title={pointDate(p)}
              meta={source}
              chevron={false}
              accessibilityLabel={`${spokenDay(p)}, ${spokenValue(b, p)}, ${lowerFirst(STATUS_WORD[level])}, ${source}`}
              right={
                <View style={styles.result}>
                  {level !== "in" && <Dot level={level} />}
                  <Text style={[type.value, styles.number]}>
                    {valueText(b, p)}
                    <Text style={type.unit}>{`${b.unit === "%" ? "" : " "}${b.unit}`}</Text>
                  </Text>
                </View>
              }
            />
          )
        })}
        {!all && rows.length > ROWS && <SeeAllRow label={`Show all ${rows.length}`} onPress={() => setAll(true)} />}
      </Group>
    </Block>
  )
}

/* -------------------------------------------------------- questions -- */

/** A question that asks when the marker is tested next. */
const NEXT_TEST = /^When should I have my next\b/

/** The marker's questions as this page sees her, values as they stand
    (lib/trends.ts questionsOf, which the assistant reads too). A question
    the page already answers gives way: with the next test of this marker
    booked, "When should I have my next A1c?" goes; a member who checks her
    blood pressure every evening gets the record's question about which
    numbers to go by, quoting the same average as "Your home readings". */
function pageQuestions(t: Trend, { booked, home }: { booked: boolean; home?: HomeAverage }): string[] {
  const at = t.latest ? new Date(t.latest.t) : undefined
  const month = at ? `${MONTHS_LONG[at.getMonth()]}${at.getFullYear() === new Date().getFullYear() ? "" : ` ${at.getFullYear()}`}` : undefined
  const fill = home && month ? { home: home.text, month } : undefined
  return questionsOf(t, { member: !!home, fill }).filter((q) => !(booked && NEXT_TEST.test(q)))
}

/** Questions she can save for her next visit with Dr. Patel (pageQuestions). */
function Questions({ b, list }: { b: Biomarker; list: string[] }) {
  if (!list.length) return null
  return (
    <Block title={`Questions for ${DOCTOR}`} variant="title">
      <Group>
        {list.map((q) => (
          <View key={q} style={styles.question}>
            <Text style={[type.body, styles.questionText]}>{q}</Text>
            <SaveQuestion text={q} about={b.id} />
          </View>
        ))}
      </Group>
    </Block>
  )
}

const styles = StyleSheet.create({
  readout: { gap: space.card },
  head: { gap: space.item },
  // No results: a block title and the line under it.
  empty: { gap: space.stack },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  figure: { gap: space.stack },
  // A unit follows its value; a share takes no space ("5.9%"), as in the
  // chart's readout and the rows below.
  value: { flexDirection: "row", alignItems: "baseline", gap: space.stack },
  valueTight: { gap: 0 },
  // The takeaway over its bar, as the chart kit sets a takeaway over a chart.
  range: { gap: space.item },
  // Two bars are two rows with no rule between them, as GoalRows stacks its bars.
  bars: { gap: space.card },
  // Level with the value over the marker: the bar sets it on a 14 pt
  // baseline, which a 12/16 label meets 2 from its top.
  barName: { position: "absolute", top: 2, left: 0 },
  review: { flexDirection: "row", alignItems: "center", gap: space.item },
  reviewText: { flex: 1 },
  // The steps sit below a rule as a Group's rows do: the label 12 from the
  // rule, and each row's own padding sets it a heading's distance (12) from
  // the label. The last row's padding stands in for that much of the
  // card's, so its words end a card's padding from the edge.
  next: { paddingTop: space.rowY, marginBottom: -space.rowY, borderTopWidth: 1, borderTopColor: hairline.rule },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule },

  overTime: { gap: space.item },
  chartCard: { gap: space.item },
  cardHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.item },
  cardTitle: { gap: space.stack },

  // A status dot to its value, as in a table row.
  result: { flexDirection: "row", alignItems: "center", gap: space.mark },
  number: { fontVariant: ["tabular-nums"] },

  // The sentence and its source, as the kit's Quote sets them.
  about: { gap: space.stack },

  question: { flexDirection: "row", alignItems: "center", gap: space.item, paddingVertical: space.rowY },
  questionText: { flex: 1 },
})
