import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Animated, Linking, StyleSheet, Text, View } from "react-native"

import { BiomarkerTrend, PressureChart, RangeBar, rangeDomain, useEntrance, type PressureReading } from "@/components/charts"
import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { AskButton } from "@/components/hol"
import { ArrowRight, Info, TrendDown, TrendUp } from "@/components/ph"
import { Banner, Block, Card, Dot, Group, HUE, NeedsRow, SeeAllRow, SmallAction, Status, type Level } from "@/components/record-kit"
import { experience, useMarkers } from "@/lib/experience"
import { MEMBER, PLAN_START_RESULTS, pressureReadingsOf, pressures, sinceStart, type Measure } from "@/lib/member"
import { useChangeCourse } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { PLACE_NAME, type Biomarker, type Point } from "@/lib/record"
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
  spokenValue,
  valueText,
  type Trend,
} from "@/lib/trends"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* One marker's page (FINAL-SPEC C.3; Figma "Hol" marker page, extended
   frame 40024634:2166). Top to bottom: where the latest result sits (its
   status and direction badges, the value, when and where it was taken,
   the change in words and the range bar); how it has moved, to scale in
   time ("Over time"); the clinical next step; every result with where it
   came from; and last, only for a free patient whose results are moving
   away from her range and only when the cap service allows it, "Want to
   change course?". "Ask to Health Agent" stays pinned in the footer,
   opening the assistant about this marker.

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

/** The offer's action, from its one line ("Want to change course? See how
    a plan works"), so the words live with the offer. */
const courseAction = (c: { title: string; link: string }) => (c.link.startsWith(c.title) ? c.link.slice(c.title.length).trim() : c.link)

/** The arrow on the direction badge: a fact, never a status colour. */
const ARROW: Partial<Record<Trend["movement"], typeof TrendUp>> = { rising: TrendUp, falling: TrendDown, steady: ArrowRight }

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
  const member = experience(onboarding) === "member"
  const review = needsReview(b, t.latest)
  const course = offer.copy
  // A member's own evening readings: a chart of their own.
  const homeList = member && b.id === "bp" ? pressures(onboarding).slice(-30) : []
  const home = homeAverage(homeList)

  return (
    <FlowScreen page title={b.name} footer={<AskButton params={{ marker: b.id }} />}>
      <Readout b={b} t={t} member={member} review={review} />
      {b.points.length > 0 && <OverTime b={b} t={t} />}
      {!!home && <HomeReadings list={homeList} average={home} />}
      <EveryResult b={b} t={t} />
      {!review && offer.show && course && (
        <ChangeCourse
          title={course.title}
          action={courseAction(course)}
          onShow={offer.markShown}
          onPress={() => {
            offer.markOpened()
            router.push({ pathname: "/plans", params: { from: b.id } })
          }}
        />
      )}
    </FlowScreen>
  )
}

/* ---------------------------------------------------------- readout -- */


/** Where the latest result sits: the status and direction badges, the
    value, when and where it was taken, the change in words and the range
    bar, as the Figma's status card sets them (8 between the badges and the
    value, 16 to the words over the bar). */
function Readout({ b, t, member, review }: { b: Biomarker; t: Trend; member: boolean; review: boolean }) {
  const fade = useEntrance(`marker:${b.id}`, { duration: 280 })
  const latest = t.latest
  const since = member ? sinceStart(b) : undefined
  const start = since ? PLAN_START_RESULTS[b.id]?.value : undefined
  const takeaway = takeawayLine(t)
  const Arrow = ARROW[t.movement]

  return (
    <Animated.View style={{ opacity: fade }}>
      <Card style={styles.readout}>
        {latest ? (
          <View style={styles.head}>
            <View style={styles.badges}>
              <Status level={t.status} />
              <View style={styles.trend}>
                {Arrow && <Arrow size={12} color={color.primaryText} />}
                <Text style={styles.trendText}>{directionWords(t)}</Text>
              </View>
            </View>
            <View
              style={styles.figure}
              accessible
              accessibilityLabel={`Latest result, ${spokenValue(b, latest)}, ${lowerFirst(STATUS_WORD[t.status])}. ${spokenDay(latest)}, ${PLACE_NAME[latest.origin]}.`}
            >
              <View style={styles.value}>
                <Text style={styles.valueText}>{t.value}</Text>
                <Text style={type.unit}>{b.unit}</Text>
              </View>
              <Text style={type.label}>{`Latest, ${pointDate(latest)}, ${PLACE_NAME[latest.origin]}`}</Text>
              {!!since && <Text style={type.label}>{since.words}</Text>}
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
            {!!takeaway && <Text style={styles.takeaway}>{takeaway}</Text>}
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
    of blood pressure, on the Figma's white chart card. Scrubbing the plot
    moves the readout above it. */
function OverTime({ b, t }: { b: Biomarker; t: Trend }) {
  const bp = b.id === "bp"
  return (
    <View style={styles.overTime}>
      <View style={styles.chartCard}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            Over time
          </Text>
          <Text style={type.label}>{counted(b.points.length, t.noun)}</Text>
        </View>
        {bp ? <PressureChart readings={clinicReadings(b)} playKey={`marker-chart:${b.id}`} /> : <BiomarkerTrend {...chartSeries(t)} playKey={`marker-chart:${b.id}`} />}
      </View>
      {!!b.methodNote && <Banner hue="teal" icon={<Info size={16} color={HUE.teal.ink} />} title={b.methodNote} />}
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
    <View style={styles.chartCard}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          Your home readings
        </Text>
      </View>
      <Text style={type.label}>{`Average of the last ${average.evenings} evenings: ${average.text}`}</Text>
      <PressureChart readings={pressureReadingsOf(list)} playKey="marker-chart:bp-home" />
    </View>
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
    <Block title="Every result">
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
                  <Text style={styles.resultValue}>
                    {valueText(b, p)}
                    <Text style={type.unit}>{` ${b.unit}`}</Text>
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

/* ---------------------------------------------------- change course -- */

/** "Want to change course?" as the Figma's last card: the question on the
    left and "See how a plan works" as a small action on the right. */
function ChangeCourse({ title, action, onShow, onPress }: { title: string; action: string; onShow: () => void; onPress: () => void }) {
  React.useEffect(() => {
    onShow()
    // Counted once, when it first shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <Card style={styles.course}>
      <Text style={styles.courseTitle}>{title}</Text>
      <SmallAction onPress={onPress}>{action}</SmallAction>
    </Card>
  )
}

const styles = StyleSheet.create({
  readout: { gap: space.gutter },
  head: { gap: space.inline },
  // No results: a block title and the line under it.
  empty: { gap: space.stack },
  badges: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline },
  // Figma's direction badge: the teal arrow and word on HOL Primary/bg.
  trend: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.stack,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(33, 80, 89, 0.04)",
    backgroundColor: "#F9FBFB",
  },
  trendText: { ...type.captionStrong, color: ink.primary },
  figure: { gap: space.stack },
  // The value 16 medium, its unit 4 after it.
  value: { flexDirection: "row", alignItems: "baseline", gap: space.stack },
  valueText: { fontFamily: font.medium, fontSize: 16, lineHeight: 26, color: ink.content },
  // The words over their bar, 12 apart.
  range: { gap: space.item },
  takeaway: { ...type.body, lineHeight: 20, color: ink.content },
  // Two bars are two rows with no rule between them, as GoalRows stacks its bars.
  bars: { gap: space.card },
  // Level with the value over the marker: the bar sets it on a 14 pt
  // baseline, which a 12/16 label meets 2 from its top.
  barName: { position: "absolute", top: 2, left: 0 },
  review: { flexDirection: "row", alignItems: "center", gap: space.item, paddingTop: space.item, borderTopWidth: 1, borderTopColor: hairline.rule },
  reviewText: { flex: 1 },

  overTime: { gap: space.item },
  // Figma's chart card: white with a hairline, 16 inside, 16 between parts.
  chartCard: { gap: space.gutter, padding: space.gutter, borderRadius: 8, borderWidth: 1, borderColor: hairline.outline, backgroundColor: color.background },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item },
  cardTitle: { ...type.title, color: ink.detail },

  // A status dot 8 from its value, as in a table row.
  result: { flexDirection: "row", alignItems: "center", gap: space.inline },
  resultValue: { ...type.title, fontVariant: ["tabular-nums"] },

  course: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item, paddingVertical: space.inline },
  courseTitle: { flexShrink: 1, ...type.title, color: ink.detail },
})
