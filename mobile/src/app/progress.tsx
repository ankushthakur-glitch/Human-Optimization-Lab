import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { CheckInSheet, type CheckInKind } from "@/components/check-in-sheet"
import { CountUp, PressureChart, ProgressChart, RangeBar, ScoreHistory, WeekBars, formatNumber } from "@/components/charts"
import { FlowScreen } from "@/components/flow"
import { AskButton } from "@/components/hol"
import { Scan, Trophy } from "@/components/ph"
import { HeadCard } from "@/components/plan-tab-pieces"
import { NothingYet, Readout, SinceStartRows, changeSince, entryDay, lastDays } from "@/components/progress-parts"
import { RecordIcon } from "@/components/record-icons"
import { TabScreen } from "@/components/tab-bar"
import { Block, Card, Group, HUE, NeedsRow, SmallAction, StatRow, StatTile, Status, TREND_WORD, Tabs, Tag, TextAction, TrendPill, type Trend } from "@/components/record-kit"
import { useExperience, useInlayScore, useMarkers } from "@/lib/experience"
import {
  BODY_GOALS,
  DEXA_SCANS,
  NEXT_BONE_SCAN,
  adherence,
  dateOfAt,
  datedOf,
  dayFrom,
  dayLabel,
  fatLost,
  milestones,
  pressureReadingsOf,
  profileOf,
  progress,
  progressChartOf,
  scoreHistory,
  shortDay,
  weekdayOf,
  type Measure,
} from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { scoreOverTime } from "@/lib/record"
import { meaningOf, pointStatus, type Movement } from "@/lib/trends"
import { space, type } from "@/lib/theme"

/* Progress since the member started (FINAL-SPEC C.25), Ed's progress layer:
   "I started my weight loss program on May 2026. I'm now September 2026.
   I've lost 11 pounds of fat" (M-40 to M-45). Everything is measured from
   the frozen start (May 3), with real dates, and the one forecast says it
   is a forecast.

   Top to bottom: the headline (the fat lost between her two DEXA scans,
   the week of the plan she is in), her weight since the start with the
   forecast, her body composition as journeys toward the plan's goals, her
   blood pressure at home, her lab results against her starting tests, the
   last 30 days as counts (never a run that can break), her milestones, her
   Inlay score at each check in, one question for the assistant, and the
   way to her full history. A bone plan leads with her chair stands, then
   her strength checks and calcium; the weight card stays.

   Readings she adds here (weight, blood pressure, chair stands) open the
   shared check in sheet and join the charts at once. Opened from Since you
   started on the member home; nothing on this page sells. */

/** The cause and effect question Ed suggested (M-45): a plan question,
    never counted; the answer points to the repeat test. */
const ASK = "Did losing body fat move my A1c?"

function ProgressFrame({ tab, footer, children }: { tab: boolean; footer: React.ReactNode; children: React.ReactNode }) {
  return tab ? (
    <TabScreen tab="progress" title="Progress" footer={footer}>
      {children}
    </TabScreen>
  ) : (
    <FlowScreen page title="Progress" footer={footer}>
      {children}
    </FlowScreen>
  )
}

type Progress = ReturnType<typeof progress>
type Store = ReturnType<typeof useOnboarding>

export default function ProgressScreen() {
  const s = useOnboarding()
  const { experience } = useExperience()
  const [sheet, setSheet] = React.useState<CheckInKind>()
  // Progress belongs to a plan that has started; a paused plan keeps it.
  const started = experience === "member" || experience === "paused"

  return (
    <View style={styles.fill}>
      {/* A plan that has started keeps Progress as one of its tabs. */}
      <ProgressFrame tab={started} footer={started ? <AskButton params={{ ask: ASK }} /> : <AskButton params={{ topic: "plan" }} />}>
        {started ? <ProgressSections s={s} onAdd={setSheet} /> : <NothingYet />}
      </ProgressFrame>
      {sheet && <CheckInSheet kind={sheet} onClose={() => setSheet(undefined)} />}
    </View>
  )
}

/** Everything the page shows once the plan has started; the Plan tab's
    Progress section draws the same cards. The owner holds the check in
    sheet that "Add" opens. */
export function ProgressSections({ s, onAdd }: { s: Store; onAdd: (kind: CheckInKind) => void }) {
  const p = progress(s)
  const bone = profileOf(s).headline === "stands"
  return bone ? (
    <>
      <StandsHeadline p={p} />
      <StrengthCard p={p} onAdd={() => onAdd("stands")} />
      <CalciumCard s={s} />
      <Group>
        <NeedsRow icon={<Scan size={16} color={HUE.teal.ink} />} title="Bone density" meta={NEXT_BONE_SCAN.words} />
      </Group>
      <WeightCard p={p} onAdd={() => onAdd("weight")} />
      <LastThirtyDays s={s} />
      <Milestones s={s} />
      <ScoreCard s={s} />
      <HistoryLink />
    </>
  ) : (
    <>
      <FatHeadline p={p} />
      <WeightCard p={p} onAdd={() => onAdd("weight")} />
      <BodyComposition p={p} />
      <PressureCard p={p} onAdd={() => onAdd("bp")} />
      <SinceStartRows title="Results since you started" />
      <LastThirtyDays s={s} />
      <Milestones s={s} />
      <ScoreCard s={s} />
      <HistoryLink />
    </>
  )
}

/* ------------------------------------------------------------ headline -- */

/** The page's one object beside the number that matters most, the week of
    the plan she is in above it, and where the number came from under it. */
function Headline({ value, format, unit, words, meta, week }: { value: number; format: (v: number) => string; unit?: string; words: string; meta: string; week: number }) {
  return (
    <HeadCard style={styles.headline}>
      <View style={styles.headWords}>
        <Tag tone="primary">{`Week ${week}`}</Tag>
        <View style={styles.headStack}>
          <View style={styles.heroLine}>
            <CountUp value={value} format={format} style={styles.hero} playKey="progress:headline" />
            {!!unit && <Text style={styles.heroUnit}>{unit}</Text>}
          </View>
          <Text style={styles.headText}>{words}</Text>
          <Text style={styles.headMeta}>{meta}</Text>
        </View>
      </View>
    </HeadCard>
  )
}

/** Ed's sentence: the fat lost between her two DEXA scans. Before a second
    scan exists, the scale says it instead ("11 lb", "down since May 3"). */
function FatHeadline({ p }: { p: Progress }) {
  const fat = fatLost()
  const lb = fat?.lb ?? Math.abs(Math.round(p.weight.change))
  return (
    <Headline
      value={lb}
      format={(v) => `${Math.round(v)} lb`}
      words={fat?.words ?? `down ${p.weight.since}`}
      meta={fat?.meta ?? `From ${formatNumber(p.weight.start, 1)} to ${formatNumber(p.weight.now, 1)} lb`}
      week={p.week}
    />
  )
}

/** A bone plan's headline: her chair stands in 30 seconds, from her first
    monthly check. */
function StandsHeadline({ p }: { p: Progress }) {
  return (
    <Headline
      value={p.stands.now ?? 0}
      format={(v) => `${Math.round(v)}`}
      unit="chair stands"
      words={p.stands.line ?? "in 30 seconds"}
      meta="Strength check, once a month"
      week={p.week}
    />
  )
}

/* -------------------------------------------------------------- weight -- */

type Range = "3m" | "all"

const RANGES: { value: Range; label: string }[] = [
  { value: "3m", label: "3 months" },
  { value: "all", label: "Since you started" },
]

/** Her weight since the start: the weigh ins, the trend through them, the
    goal and the forecast, which calls itself a forecast. Without a forecast
    the caption says why (too few weigh ins, holding steady, goal reached). */
function WeightCard({ p, onAdd }: { p: Progress; onAdd: () => void }) {
  const [range, setRange] = React.useState<Range>("all")
  const all = progressChartOf(p)
  const series = range === "all" ? p.weight.series : lastDays(p.weight.series, 91)
  const readings = datedOf(series)
  const label = range === "all" || !series.length ? `${p.weight.words} ${p.weight.since}` : changeSince(series[0], p.weight.now)
  return (
    <Block title="Weight" action={<SmallAction onPress={onAdd}>Add</SmallAction>}>
      <Card style={styles.chartCard}>
        <Tabs options={RANGES} value={range} onChange={setRange} />
        <Readout value={formatNumber(p.weight.now, 1)} unit="lb" label={label} />
        <ProgressChart
          {...all}
          readings={readings}
          start={range === "all" ? all.start : readings[0]}
          caption={p.weight.forecast ? undefined : (p.weight.note ?? null)}
          playKey={`progress:weight:${range}`}
        />
      </Card>
    </Block>
  )
}

/* ---------------------------------------------------- body composition -- */

/** Body fat and lean mass from her two DEXA scans, and her waist from her
    monthly check, each as a journey from her start toward the plan's goal. */
function BodyComposition({ p }: { p: Progress }) {
  const first = DEXA_SCANS[0]
  const last = DEXA_SCANS[DEXA_SCANS.length - 1]
  if (!first || !last || first === last) return null
  const one = (v: number) => formatNumber(v, 1)
  // The plan's sample goals until the physician sets them (H.1 #33).
  const rows: { name: string; from: number; to: number; words: (v: number) => string; low?: number; high?: number; unit: string; tail?: string }[] = [
    { name: "Body fat", from: first.fatPct, to: last.fatPct, words: (v) => `${one(v)}%`, low: BODY_GOALS.fatPct.low, high: BODY_GOALS.fatPct.high, unit: "%" },
    { name: "Lean mass", from: first.leanLb, to: last.leanLb, words: one, low: BODY_GOALS.leanLb.low, unit: "lb", tail: " lb" },
    { name: "Waist", from: p.waist.start, to: p.waist.now, words: one, high: BODY_GOALS.waistIn.high, unit: "in", tail: " in" },
  ]
  return (
    <Block title="Body composition" meta={`DEXA, ${shortDay(dayFrom(first.at))} and ${shortDay(dayFrom(last.at))}`}>
      <Group>
        {rows.map((r) => {
          // The goal's edges read as whole numbers; the journey keeps its
          // decimal, so 36.0 never reads as 36.
          const label = (v: number) => (v === r.low || v === r.high ? formatNumber(v) : one(v)) + (r.unit === "%" ? "%" : "")
          return (
            <View key={r.name} style={styles.journey}>
              <View style={styles.journeyHead}>
                <Text style={styles.journeyName}>{r.name}</Text>
                <Text style={styles.journeyWords}>
                  {`${r.words(r.from)} to `}
                  <Text style={styles.journeyNow}>{r.words(r.to)}</Text>
                  {r.tail ?? ""}
                </Text>
              </View>
              <RangeBar value={r.to} start={r.from} low={r.low} high={r.high} status="neutral" zoneLabel="Goal" unit={r.unit} format={label} playKey={`progress:body:${r.name}`} />
            </View>
          )
        })}
      </Group>
    </Block>
  )
}

/* ------------------------------------------------------ blood pressure -- */

/** Which way her home readings are going: the first week of the chart
    against its last, by the top number. */
function directionOf(list: Measure[]): Trend {
  if (list.length < 4) return "steady"
  const week = Math.min(7, Math.floor(list.length / 2))
  const mean = (xs: Measure[]) => xs.reduce((a, m) => a + m.value, 0) / xs.length
  const change = mean(list.slice(-week)) - mean(list.slice(0, week))
  return change <= -3 ? "down" : change >= 3 ? "up" : "steady"
}

/** Each direction as lib/trends.ts names a movement, so meaningOf can say
    what it means for her range. */
const MOVEMENT: Record<Trend, Movement> = { up: "rising", down: "falling", steady: "steady" }

/** Her home blood pressure: the average of her last evenings with what it
    means and which way it is going, then the last 30 readings. The one
    readout above the chart follows a reading she taps, and goes back to
    the average. */
function PressureCard({ p, onAdd }: { p: Progress; onAdd: () => void }) {
  const markers = useMarkers()
  const bp = markers.find((b) => b.id === "bp")
  const recent = p.pressure.series.filter((m) => m.value2 !== undefined).slice(-30)
  const readings = pressureReadingsOf(recent)
  const [picked, setPicked] = React.useState<number>()
  // A reading she adds shifts the last 30, so the readout goes back to the
  // average rather than point at a different evening.
  const newest = recent[recent.length - 1]?.at
  React.useEffect(() => setPicked(undefined), [newest])
  const avg = p.pressure.average
  if (!readings.length) return null
  const reading = picked !== undefined ? recent[picked] : undefined
  const shown = reading ?? (avg ? { value: avg.value, value2: avg.value2 } : recent[recent.length - 1])
  // The direction says what it means beside her status: readings falling
  // toward her range read "Trending down, improving" (C.0.4), so an out of
  // range average is never left with a bare direction.
  const dir = directionOf(recent)
  const improving = !!bp && meaningOf(bp, MOVEMENT[dir], { date: recent[recent.length - 1].at, value: shown.value, value2: shown.value2, origin: "you" }) === "improving"
  const label = reading
    ? dayLabel(dateOfAt(reading.at))
    : !avg
      ? "Your last evening"
      : avg.readings >= 7
        ? "Average of the last 7 evenings"
        : avg.readings > 1
          ? `Average of the last ${avg.readings} evenings`
          : "Your last evening"
  return (
    <Block title="Blood pressure at home" action={<SmallAction onPress={onAdd}>Add</SmallAction>}>
      <Card style={styles.chartCard}>
        <View style={styles.summary}>
          <Readout
            value={`${shown.value}/${shown.value2}`}
            unit="mmHg"
            label={label}
            right={
              reading ? (
                <TextAction onPress={() => setPicked(undefined)}>Average</TextAction>
              ) : undefined
            }
          />
          <View style={styles.pills}>
            {bp && <Status level={pointStatus(bp, { value: shown.value, value2: shown.value2 })} />}
            {!reading && <TrendPill trend={dir}>{improving ? `${TREND_WORD[dir]}, improving` : TREND_WORD[dir]}</TrendPill>}
          </View>
        </View>
        <PressureChart readings={readings} selected={picked ?? readings.length - 1} onSelect={setPicked} readout={false} playKey="progress:bp" />
      </Card>
    </Block>
  )
}

/* ------------------------------------------------------------- the plan -- */

/** The last 30 days as counts (M-62): days logged, the average daily score
    and strength sessions done. Never a run that can break. */
function LastThirtyDays({ s }: { s: Store }) {
  const a = adherence(s, 30)
  return (
    <Block title="The last 30 days">
      <Card>
        <StatRow>
          <StatTile bare value={a.logged} unit={`of ${a.of}`} label="Days logged" />
          {a.average !== undefined ? (
            <StatTile bare value={a.average} unit="%" label="Food goals, on average" />
          ) : (
            <StatTile bare value="None yet" label="Food goals, on average" />
          )}
          <StatTile bare value={a.strength.done} unit={`of ${a.strength.planned}`} label="Strength sessions" />
        </StatRow>
      </Card>
    </Block>
  )
}

/** A word that follows a comma starts in lower case ("Aug 12, in 30
    seconds"); an acronym keeps its capitals ("Sep 22, DEXA scan"). */
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s)

/** Credit at milestones (M-62), newest first. */
function Milestones({ s }: { s: Store }) {
  const list = milestones(s)
  if (!list.length) return null
  return (
    <Block title="Milestones">
      <Group>
        {list.map((m) => (
          <NeedsRow
            key={m.id}
            icon={<Trophy size={16} color={HUE.teal.ink} />}
            title={m.title}
            meta={m.meta ? `${m.label}, ${lowerFirst(m.meta)}` : m.label}
          />
        ))}
      </Group>
    </Block>
  )
}

/** Her Inlay score at each check in, today's from her answers and her
    record, with the change since her first check in, by the one rule Home
    follows (lib/record.ts scoreOverTime). */
function ScoreCard({ s }: { s: Store }) {
  const over = scoreOverTime(useInlayScore(), s.scores)
  const checkIns = over.history
  const latest = checkIns[checkIns.length - 1]
  if (!latest) return null
  const tag = over.tag
  return (
    <Block title="Inlay score">
      <Card style={styles.chartCard}>
        <Readout value={String(latest.value)} unit="out of 100" right={tag && <Tag tone={tag.tone}>{tag.label}</Tag>} />
        <ScoreHistory checkIns={checkIns} playKey="progress:score" />
      </Card>
    </Block>
  )
}

/** Every day, weigh in and reading since she started. */
function HistoryLink() {
  return (
    <Group>
      <NeedsRow icon={<RecordIcon name="chart" size={18} color={HUE.teal.ink} />} title="See your history" onPress={() => router.push("/history")} />
    </Group>
  )
}

/* ----------------------------------------------------------- bone plan -- */

/** The bone plan's strength checks, once a month, against the goal. No
    forecast: a strength check is not a trend to project. The line runs
    through the checks themselves. */
function StrengthCard({ p, onAdd }: { p: Progress; onAdd: () => void }) {
  const list = p.stands.series
  const latest = list[list.length - 1]
  if (!latest) return null
  const dated = datedOf(list)
  return (
    <Block title="Strength" action={<SmallAction onPress={onAdd}>Add</SmallAction>}>
      <Card style={styles.chartCard}>
        <Readout value={String(latest.value)} unit="chair stands" label={`Latest check, ${entryDay(latest.at)}`} />
        <ProgressChart readings={dated} trend={dated} goal={p.stands.goal} name="chair stands" readingsLabel="Monthly checks" caption={null} playKey="progress:stands" />
      </Card>
    </Block>
  )
}

/** Calcium on each of the last seven days against the goal. A day with
    nothing logged is a dot on the baseline, never a zero; a day not fully
    logged reads "so far". Tapping a bar moves the readout to that day. */
function CalciumCard({ s }: { s: Store }) {
  const goal = profileOf(s).goals.find((g) => g.id === "calcium")
  const scores = scoreHistory(s, 7)
  const [picked, setPicked] = React.useState(scores.length - 1)
  if (!goal) return null
  const days = scores.map((d) => {
    const amount = d.results.find((r) => r.goal.id === "calcium")?.amount
    return { label: weekdayOf(d.date), value: amount ? Math.round(amount.value) : undefined, partial: d.status === "partial" || undefined }
  })
  const day = days[picked] ?? days[days.length - 1]
  const logged = days.filter((d) => d.value !== undefined)
  const onGoal = logged.filter((d) => d.value! >= goal.target).length
  // A count only when some days made it: "0 of 6" would read as a verdict.
  const trailing = onGoal ? `${onGoal} of ${logged.length} days on goal` : undefined
  return (
    <Block title="Calcium">
      <Card style={styles.chartCard}>
        <Readout
          value={day.value !== undefined ? formatNumber(day.value) : "Not logged"}
          unit={day.value !== undefined ? `${goal.unit}${day.partial ? " so far" : ""}` : undefined}
          dim={day.value === undefined}
          label={scores[picked]?.label}
          right={trailing ? <Text style={styles.trailing}>{trailing}</Text> : undefined}
        />
        <WeekBars days={days} goal={goal.target} unit={goal.unit} name="Calcium" emptyWord="Not logged" selected={picked} onSelect={setPicked} readout={false} playKey="progress:calcium" />
      </Card>
    </Block>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },

  // The week's tag heads the stack under it: the number, the sentence,
  // then where it came from.
  headline: { gap: 0 },
  headWords: { flex: 1, alignItems: "flex-start", gap: space.item },
  headStack: { alignSelf: "stretch", gap: space.line },
  heroLine: { flexDirection: "row", alignItems: "baseline", gap: space.stack },
  hero: { ...type.hero },
  heroUnit: { ...type.unitLarge },
  headText: { ...type.body },
  headMeta: { ...type.meta, marginTop: space.stack },

  chartCard: { gap: space.card },
  summary: { gap: space.inline },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },

  // The bar's labels carry their own leading, so the row's foot is a
  // little shorter than its head.
  journey: { gap: space.inline, paddingTop: space.rowY, paddingBottom: space.rowY - space.stack },
  journeyHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.item },
  journeyName: { ...type.title },
  journeyWords: { ...type.label, fontVariant: ["tabular-nums"] },
  // Where she is now, in the value's weight and ink at the line's size.
  journeyNow: { fontFamily: type.value.fontFamily, color: type.value.color },

  // On the value's line: the meta's box ends where the stat's does.
  trailing: { ...type.meta, alignSelf: "flex-start", marginTop: type.stat.lineHeight - type.meta.lineHeight },

})
