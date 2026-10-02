import { useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Switch, Text, View } from "react-native"

import { Art, type ArtName } from "@/components/art"
import {
  AllResultsTile,
  BiomarkerTrend,
  CompositionBar,
  GoalRows,
  PressureChart,
  ProgressChart,
  RangeBar,
  ScoreGauge,
  ScoreHistory,
  ScoreRing,
  StillPreview,
  TrendGrid,
  TrendTile,
  WeekBars,
  type Dated,
  type GoalRow,
  type MarkerSeries,
  type PressureReading,
} from "@/components/charts"
import { FlowScreen } from "@/components/flow"
import { IconBloodPressure, IconBowl, IconCamera, IconCheck, IconClock, IconDumbbell, IconSparkle, IconWalk } from "@/components/icons"
import { RecordIcon } from "@/components/record-icons"
import {
  AllowanceLine,
  AllowanceMeter,
  Block,
  Card,
  ChipRow,
  DateBlock,
  DateTrack,
  EmptyState,
  Group,
  Hero,
  heroText,
  HUE,
  KeyValue,
  NeedsRow,
  Nudge,
  PlanLine,
  ProgressBar,
  Quote,
  ResultRow,
  ReviewBanner,
  SaveQuestion,
  SeeAllRow,
  SmallAction,
  StatRow,
  StatTile,
  Status,
  Steps,
  SummaryLine,
  Tabs,
  Tag,
  TextAction,
  Tile,
  Toast,
  toast,
  TrendPill,
  type BannerState,
} from "@/components/record-kit"
import { Button } from "@/components/ui"
import { BIOMARKERS } from "@/lib/record"
import { chart, color, font, setOutOfRangeColor, type } from "@/lib/theme"
import { chartInput, classify, directionWords, trendCounts } from "@/lib/trends"

/** Not a product screen, and never linked from one: every piece of the
    record kit and the chart kit in every state, with Olivia's data, for the
    review on Mon 5 Oct and for the screen builders (FINAL-SPEC C.29, F.3).
    Like errors/, it sits outside every guard.

    Two switches at the top: "Reduce motion" draws every chart at its final
    frame, as the phone's setting would; "Clay for out of range" swaps the
    out of range mark from red to clay across the page, so HOL can decide
    Q-06 by looking. "Play again" mounts everything afresh, so the
    entrances can be watched. ?part=tiles, trend, range, goals, progress,
    week, pressure, score, rows, words, offers, banners, empty or toast shows
    one group. */
export default function KitScreen() {
  const { part } = useLocalSearchParams<{ part?: string }>()
  const show = (p: string) => !part || part === p
  const [still, setStill] = React.useState(false)
  const [clay, setClay] = React.useState(false)
  const [round, setRound] = React.useState(0)

  // The swap is for this page only: leaving it puts red back.
  React.useEffect(() => () => setOutOfRangeColor(chart.outside), [])

  const toggleClay = () => {
    setOutOfRangeColor(clay ? chart.outside : chart.outsideClay)
    setClay(!clay)
    setRound((r) => r + 1)
  }
  const toggleStill = () => {
    setStill(!still)
    setRound((r) => r + 1)
  }

  return (
    <FlowScreen page title="Kit">
      <View style={styles.controls}>
        <Toggle label="Reduce motion" on={still} onToggle={toggleStill} />
        <Toggle label="Clay for out of range" on={clay} onToggle={toggleClay} last />
      </View>
      <SmallAction onPress={() => setRound((r) => r + 1)} style={styles.replay}>
        Play again
      </SmallAction>
      <StillPreview still={still}>
        <View key={round} style={styles.groups}>
          {show("tiles") && <Tiles />}
          {show("trend") && <Trends />}
          {show("range") && <Ranges />}
          {show("goals") && <Goals />}
          {show("progress") && <Progress />}
          {show("week") && <Weeks />}
          {show("pressure") && <Pressure />}
          {show("score") && <Scores />}
          {show("rows") && <Rows />}
          {show("words") && <Words />}
          {show("offers") && <Offers />}
          {show("banners") && <Banners />}
          {show("empty") && <Empties />}
          {show("toast") && <Toasts />}
        </View>
      </StillPreview>
    </FlowScreen>
  )
}

/** A review switch: the whole row is the control, so its words can be
    tapped. */
function Toggle({ label, on, onToggle, last }: { label: string; on: boolean; onToggle: () => void; last?: boolean }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      style={({ pressed }) => [styles.toggle, !last && styles.toggleRule, pressed && styles.pressed]}
    >
      <Text style={styles.toggleText}>{label}</Text>
      <Switch
        value={on}
        onValueChange={onToggle}
        trackColor={{ false: "#D0D5DD", true: color.primary }}
        thumbColor={color.background}
        {...({ activeThumbColor: color.background } as object)}
      />
    </Pressable>
  )
}

/* ------------------------------------------------------------ samples -- */

const marker = (id: string) => BIOMARKERS.find((b) => b.id === id)!
const trendOf = (id: string) => classify(marker(id))
/** A classified marker as a tile: the data layer's words and marks. */
const tileOf = (id: string) => {
  const t = trendOf(id)
  return { id, ...chartInput(t), direction: directionWords(t), onPress: () => {} }
}

const NONE: MarkerSeries = { name: "Vitamin B12", unit: "pg/mL", low: 232, high: 1245, range: "232 to 1,245", readings: [] }

const DAY = 86_400_000
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d)

/** Olivia's Thursday weigh ins since she joined on May 3: 189.0 to 178.0 lb. */
const WEIGH_INS: Dated[] = Array.from({ length: 22 }, (_, k) => {
  const wobble = k === 0 || k === 21 ? 0 : [0.3, -0.2, 0.4, -0.3, 0.1, -0.1, 0.2][k % 7]
  return { date: new Date(at(2026, 5, 7).getTime() + k * 7 * DAY), value: Math.round((189 - (11 * k) / 21 + wobble) * 10) / 10 }
})
const FORECAST: Dated[] = [
  { date: at(2026, 10, 1), value: 178 },
  { date: at(2026, 11, 1), value: 176.4 },
  { date: at(2026, 12, 3), value: 175 },
]
/** The last month holding at 178. */
const HOLDING: Dated[] = [...WEIGH_INS.slice(0, 18), ...[178.2, 178.4, 177.9, 178.1].map((value, i) => ({ date: new Date(at(2026, 9, 10).getTime() + i * 7 * DAY), value }))]

/** Yesterday for the weight plan (FINAL-SPEC C.2.4): 85%. */
const YESTERDAY: GoalRow[] = [
  { name: "Calories", unit: "kcal", kind: "atMost", goal: 1700, actual: 1590 },
  { name: "Protein", unit: "g", goal: 110, actual: 80, note: "30 g short" },
  { name: "Fiber", unit: "g", goal: 28, actual: 20, note: "8 g short" },
  { name: "Added sugar", unit: "g", kind: "atMost", goal: 25, actual: 29, note: "4 g over" },
  { name: "Sodium", unit: "mg", kind: "atMost", goal: 2300, actual: 1990 },
]
/** The bone plan on a day every goal was met. */
const ALL_MET: GoalRow[] = [
  { name: "Calories", unit: "kcal", kind: "atMost", goal: 2000, actual: 1880 },
  { name: "Calcium", unit: "mg", goal: 1000, actual: 1060 },
  { name: "Protein", unit: "g", goal: 100, actual: 104 },
]
const OVER: GoalRow[] = [
  { name: "Sodium", unit: "mg", kind: "atMost", goal: 2300, actual: 2650, note: "350 mg over" },
  { name: "Added sugar", unit: "g", kind: "atMost", goal: 25, actual: 31, note: "6 g over" },
]
/** Dinner not logged: subtotals so far, no checks. */
const PARTIAL: GoalRow[] = [
  { name: "Calories", unit: "kcal", kind: "atMost", goal: 1700, actual: 1120, partial: true },
  { name: "Protein", unit: "g", goal: 110, actual: 58, partial: true },
  { name: "Fiber", unit: "g", goal: 28, actual: 14, partial: true, estimated: true },
]
/** A goal with nothing known: never zero. */
const UNKNOWN: GoalRow[] = [
  { name: "Protein", unit: "g", goal: 110, actual: 96 },
  { name: "Fiber", unit: "g", goal: 28 },
]

/** Olivia's home cuff since May, with the late August rise. */
const HOME_BP: PressureReading[] = [
  [5, 6, 138, 88],
  [5, 20, 136, 87],
  [6, 3, 134, 86],
  [6, 17, 132, 85],
  [7, 1, 131, 84],
  [7, 15, 129, 83],
  [7, 29, 128, 82],
  [8, 12, 130, 83],
  [8, 26, 135, 87],
  [9, 2, 133, 85],
  [9, 9, 130, 83],
  [9, 16, 128, 81],
  [9, 23, 127, 81],
  [9, 30, 126, 80],
].map(([m, d, systolic, diastolic]) => ({ date: at(2026, m, d), systolic, diastolic, source: "Home cuff" }))

/* ------------------------------------------------------------- groups -- */

function Tiles() {
  const counts = trendCounts()
  return (
    <Block title="Trend tiles" variant="title">
      <Sample caption="Out of range and trending up, borderline, in range and improving, and All results in the fourth cell" bare>
        <TrendGrid
          tiles={[tileOf("a1c"), tileOf("hdl"), tileOf("ferritin")]}
          last={<AllResultsTile steady={counts.inRange} inRange={20} borderline={1} out={6} onPress={() => {}} />}
        />
      </Sample>
      <Sample caption="Four to watch, as the free home shows them" bare>
        <TrendGrid tiles={[tileOf("a1c"), tileOf("bmi"), tileOf("ldl"), tileOf("ferritin")]} />
      </Sample>
      <Sample caption="Wide: the only tile, or an odd last one" bare>
        <TrendTile {...tileOf("vitd")} wide />
      </Sample>
      <Sample caption="Nothing to watch: the steady card in place of the tiles" bare>
        <Card>
          <View style={styles.okRow}>
            <Tile hue="green">
              <IconCheck size={18} color={HUE.green.ink} strokeWidth={2.2} />
            </Tile>
            <View style={styles.okBody}>
              <Text style={type.title}>Your results are steady</Text>
              <Text style={type.label}>27 results are in range and steady</Text>
              <SmallAction onPress={() => {}} style={styles.okAction}>
                See all results
              </SmallAction>
            </View>
          </View>
        </Card>
      </Sample>
    </Block>
  )
}

function Trends() {
  const a1c = trendOf("a1c")
  return (
    <Block title="Marker trend" variant="title">
      <Sample caption="Hemoglobin A1c, every result since 2022, scrub to move the readout">
        <BiomarkerTrend {...chartInput(a1c)} takeaway={a1c.takeaway} />
      </Sample>
      <Sample caption="Vitamin D: a home kit result, hollow and not joined">
        <BiomarkerTrend {...chartInput(trendOf("vitd"))} />
      </Sample>
      <Sample caption="TSH: one result so far">
        <BiomarkerTrend {...chartInput(trendOf("tsh"))} />
      </Sample>
      <Sample caption="No results">
        <BiomarkerTrend {...NONE} />
      </Sample>
    </Block>
  )
}

function Ranges() {
  return (
    <Block title="Range bar" variant="title">
      <Sample caption="Two sided: vitamin D 21, range 30 to 100">
        <RangeBar value={21} low={30} high={100} range="30 to 100" unit="ng/mL" />
      </Sample>
      <Sample caption="One sided: A1c 5.9, below 5.7">
        <RangeBar value={5.9} high={5.7} range="Below 5.7" unit="%" />
      </Sample>
      <Sample caption="Borderline: HDL 52, 50 or above">
        <RangeBar value={52} low={50} range="50 or above" unit="mg/dL" status="borderline" />
      </Sample>
      <Sample caption="A journey to a plan goal: body fat since May">
        <RangeBar value={39.3} start={42.5} low={30} high={35} unit="%" status="neutral" zoneLabel="Goal" format={(v) => `${v}%`} />
      </Sample>
      <Sample caption="Compact, 104 by 12, in result rows">
        {(["a1c", "ldl", "vitd", "hdl", "tsh"] as const).map((id) => {
          const t = trendOf(id)
          return (
            <View key={id} style={styles.barRow}>
              <Text style={[type.label, styles.barName]} numberOfLines={1}>
                {t.marker.name}
              </Text>
              <RangeBar compact value={t.latest!.value} low={t.band.low} high={t.band.high} status={t.status} unit={t.marker.unit} style={styles.bar} />
            </View>
          )
        })}
      </Sample>
    </Block>
  )
}

function Goals() {
  return (
    <Block title="Goals and the daily score" variant="title">
      <Sample caption="Yesterday, weight plan: short, over a limit, and met">
        <View style={styles.dayHead}>
          <ScoreRing percent={85} of="Yesterday's goals" />
          <View style={styles.dayText}>
            <Text style={type.label}>of your goals</Text>
            <Text style={type.title}>Fiber was 8 g short</Text>
            <View style={styles.energy}>
              <Text style={type.meta}>About 280 kcal under what you burned</Text>
              <Tag tone="muted">Estimated</Tag>
            </View>
          </View>
        </View>
        <View style={styles.rule} />
        <GoalRows rows={YESTERDAY} />
      </Sample>
      <Sample caption="Every goal met">
        <GoalRows rows={ALL_MET} />
      </Sample>
      <Sample caption="Over a limit: clay past the line">
        <GoalRows rows={OVER} />
      </Sample>
      <Sample caption="Partial day: so far, no checks">
        <GoalRows rows={PARTIAL} />
      </Sample>
      <Sample caption="Unknown: not logged, never zero">
        <GoalRows rows={UNKNOWN} />
      </Sample>
      <Sample caption="Score ring: 85, 100, nothing logged, partial">
        <View style={styles.rings}>
          <ScoreRing percent={85} size={72} />
          <ScoreRing percent={100} size={72} />
          <ScoreRing size={72} />
          <ScoreRing size={72} label="Partial" />
        </View>
      </Sample>
      <Sample caption="Score ring at 40, in history rows and the plan preview" bare>
        <Group>
          {[
            { day: "Sun, Oct 4", line: "85%, 4 meals, walk", percent: 85 },
            { day: "Sat, Oct 3", line: "100%, every goal met", percent: 100 },
            { day: "Wed, Sep 30", line: "Nothing logged" },
          ].map((d) => (
            <View key={d.day} style={styles.historyRow}>
              <ScoreRing percent={d.percent} size={40} />
              <View style={styles.flex}>
                <Text style={type.title}>{d.day}</Text>
                <Text style={type.label}>{d.line}</Text>
              </View>
            </View>
          ))}
        </Group>
      </Sample>
    </Block>
  )
}

function Progress() {
  return (
    <Block title="Progress since you started" variant="title">
      <Sample caption="Detail, with the goal and a forecast">
        <View style={styles.hero}>
          <Text style={type.hero}>11 lb</Text>
          <Text style={type.body}>down since May 3</Text>
        </View>
        <ProgressChart readings={WEIGH_INS} start={{ date: at(2026, 5, 3), value: 189 }} forecast={FORECAST} goal={175} unit="lb" name="weight" readingsLabel="Weigh ins" />
      </Sample>
      <Sample caption="Holding steady: no forecast">
        <ProgressChart readings={HOLDING} start={{ date: at(2026, 5, 3), value: 189 }} goal={175} unit="lb" name="weight" readingsLabel="Weigh ins" caption="Holding steady this month" />
      </Sample>
      <Sample caption="Goal reached">
        <ProgressChart readings={WEIGH_INS} start={{ date: at(2026, 5, 3), value: 189 }} goal={180} unit="lb" name="weight" readingsLabel="Weigh ins" caption="You reached your goal of 180 lb on Aug 27." />
      </Sample>
      <Sample caption="Compact, on the member home">
        <ProgressChart
          readings={WEIGH_INS}
          start={{ date: at(2026, 5, 3), value: 189 }}
          forecast={FORECAST}
          goal={175}
          unit="lb"
          compact
          caption="If current habits continue, you may reach 175 lb by early December. A forecast, not a promise."
        />
      </Sample>
    </Block>
  )
}

function Weeks() {
  return (
    <Block title="Week bars" variant="title">
      <Sample caption="Daily scores, a day with nothing logged and a partial day">
        <WeekBars
          name="Daily score"
          format={(v) => `${v}%`}
          emptyWord="Nothing logged"
          days={[
            { label: "Mon", value: 92 },
            { label: "Tue", value: 88 },
            { label: "Wed" },
            { label: "Thu", value: 64, partial: true },
            { label: "Fri", value: 90 },
            { label: "Sat", value: 94 },
            { label: "Sun", value: 85, today: true },
          ]}
          trailing="Average 85% on 6 days"
        />
      </Sample>
      <Sample caption="A nutrient with a goal: calcium, bone plan">
        <WeekBars
          name="Calcium"
          unit="mg"
          goal={1000}
          days={[
            { label: "Mon", value: 800 },
            { label: "Tue", value: 1050 },
            { label: "Wed", value: 920 },
            { label: "Thu", value: 1100 },
            { label: "Fri", value: 760 },
            { label: "Sat", value: 980 },
            { label: "Sun", value: 850, today: true },
          ]}
        />
      </Sample>
      <Sample caption="Mini, in Your week: the best day strong">
        <WeekBars
          mini
          highlight={5}
          days={[
            { label: "Mon", value: 92 },
            { label: "Tue", value: 88 },
            { label: "Wed" },
            { label: "Thu", value: 64, partial: true },
            { label: "Fri", value: 90 },
            { label: "Sat", value: 94 },
            { label: "Sun", value: 85 },
          ]}
        />
      </Sample>
    </Block>
  )
}

function Pressure() {
  return (
    <Block title="Blood pressure" variant="title">
      <Sample caption="Home readings since May, fixed 60 to 160">
        <PressureChart readings={HOME_BP} takeaway="Down from 138/88 in May to 126/80, after a rise in late August." />
      </Sample>
    </Block>
  )
}

function Scores() {
  return (
    <Block title="Inlay score" variant="title">
      <Sample caption="Score page: the first score">
        <ScoreGauge score={71} name="Inlay score" />
      </Sample>
      <Sample caption="Up since the last check in, and down, which is never red">
        <View style={styles.gauges}>
          <ScoreGauge score={71} previous={68} size={88} name="Inlay score" change={{ text: "Up 3 since Jul", direction: "up" }} />
          <ScoreGauge score={64} previous={68} size={88} name="Inlay score" change={{ text: "Down 4 since Jul", direction: "down" }} />
        </View>
      </Sample>
      <Sample caption="History: three check ins, fixed 0 to 100">
        <ScoreHistory
          checkIns={[
            { date: "2026-05-03", value: 66 },
            { date: "2026-08-03", value: 69 },
            { date: "2026-10-01", value: 71 },
          ]}
        />
      </Sample>
      <Sample caption="History: one score">
        <ScoreHistory checkIns={[{ date: "Today", value: 71 }]} />
      </Sample>
      <Sample caption="Composition: 20 in range, 1 borderline, 6 out of range">
        <CompositionBar inRange={20} borderline={1} out={6} />
      </Sample>
    </Block>
  )
}

function Rows() {
  return (
    <Block title="Rows and counts" variant="title">
      <Sample caption="On the Hero: the member's doors and the rest of today" bare>
        <Hero>
          <View style={styles.heroHead}>
            <Text style={heroText.title}>Today</Text>
            <Text style={heroText.meta}>1 of 4 done</Text>
          </View>
          <ProgressBar onHero done={1} total={4} />
          <Text style={heroText.line}>Today's focus: fiber at lunch</Text>
          <StatRow>
            <StatTile onHero icon={<IconDumbbell size={16} color={HUE.teal.ink} />} value="20 min" label="Exercise" onPress={() => {}} />
            <StatTile onHero icon={<IconBowl size={16} color={HUE.teal.ink} />} value="1,700" unit="kcal" label="Diet plan" onPress={() => {}} />
            <StatTile onHero icon={<IconCamera size={16} color={HUE.teal.ink} />} value="Lunch" label="Log a meal" done onPress={() => {}} />
          </StatRow>
          <Group inset>
            <NeedsRow icon={<IconWalk size={16} color={HUE.teal.ink} />} title="Walk after dinner" meta="20 minutes, brisk" chevron={false} onPress={() => {}} />
            <NeedsRow
              icon={<IconBloodPressure size={16} color={HUE.teal.ink} />}
              title="Check your blood pressure"
              meta="Tonight, seated, after 5 minutes of rest"
              right={<SmallAction onPress={() => {}}>Add</SmallAction>}
              chevron={false}
              onPress={() => {}}
            />
            <NeedsRow icon={<IconClock size={16} color={HUE.teal.ink} />} title="Labs tomorrow at 7:30 AM" meta="Nothing to eat after 9:30 PM tonight. Water is fine." onPress={() => {}} />
          </Group>
        </Hero>
      </Sample>
      <Sample caption="Stat tiles: plain" bare>
        <StatRow>
          <StatTile value="7 of 7" label="Days logged" />
          <StatTile value="90%" label="Average" />
        </StatRow>
      </Sample>
      <Sample caption="Stat tiles: bare with meta, inside a card">
        <StatRow>
          <StatTile bare value="178.0" unit="lb" label="Weight" meta="11 lb down" />
          <StatTile bare value="36.0" unit="in" label="Waist" meta="2.5 in down" />
          <StatTile bare value="103.6" unit="lb" label="Lean mass" meta="Held steady" />
        </StatRow>
      </Sample>
      <Sample caption="Date blocks">
        <View style={styles.inline}>
          <DateBlock date="2026-10-06" />
          <DateBlock date="2026-10-08" />
          <DateBlock date="2026-10-21" hue="blue" />
        </View>
      </Sample>
      <Sample caption="Needs you, coming up and new in your record" bare>
        <Group>
          <NeedsRow
            icon={<RecordIcon name="labs" size={18} color={HUE.teal.ink} />}
            title="Book your mammogram"
            meta="Dr. Patel ordered it on Mar 4. Reminder 3 of 3."
            tag={{ tone: "low", label: "Overdue" }}
            onPress={() => {}}
          />
          <NeedsRow date="2026-10-21" title="Cardiology follow up" meta="10:30 AM, Dr. Lee, Pacific Heart" note="2 questions saved" onPress={() => {}} />
          <NeedsRow
            icon={<RecordIcon name="labs" size={18} color={HUE.teal.ink} />}
            title="Repeat A1c and lipid panel"
            meta="Not booked yet. Due by Nov 12"
            track={{ dates: [{ label: "Ordered", date: "Aug 12" }, { label: "Booked" }, { label: "Done" }] }}
            onPress={() => {}}
          />
          <NeedsRow
            icon={<RecordIcon name="visits" size={18} color={HUE.blue.ink} />}
            hue="blue"
            title="Urgent care visit"
            meta="Scripps Memorial Hospital, Jun 3"
            tag={{ tone: "muted", label: "Outside your clinic" }}
            onPress={() => {}}
          />
          <NeedsRow title="Atorvastatin" meta="20 mg once a day, Dr. Patel" right={<Status level="borderline" bare>Records differ</Status>} onPress={() => {}} />
          <SeeAllRow count={6} onPress={() => {}} />
        </Group>
      </Sample>
      <Sample caption="Result rows: a mark only when out of range or borderline; a member's since line" bare>
        <Group>
          <ResultRow trend={trendOf("a1c")} onPress={() => {}} />
          <ResultRow trend={trendOf("hdl")} onPress={() => {}} />
          <ResultRow trend={trendOf("ferritin")} onPress={() => {}} />
          <ResultRow trend={trendOf("tsh")} onPress={() => {}} />
          <ResultRow trend={trendOf("ldl")} since="171 at your start, 162 in Aug" onPress={() => {}} />
        </Group>
      </Sample>
    </Block>
  )
}

function Words() {
  const [tab, setTab] = React.useState<"days" | "weight">("days")
  const [chip, setChip] = React.useState<"all" | "watch" | "in">("all")
  return (
    <Block title="Words, marks and actions" variant="title">
      <Sample caption="Status: a shape and a word">
        <View style={styles.inline}>
          <Status level="out" />
          <Status level="borderline" />
          <Status level="in" />
        </View>
        <View style={styles.inline}>
          <TrendPill trend="up" />
          <TrendPill trend="steady" />
          <TrendPill trend="up">Trending up, improving</TrendPill>
        </View>
      </Sample>
      <Sample caption="Tags: exceptions only">
        <View style={styles.inline}>
          <Tag tone="low">Overdue</Tag>
          <Tag tone="low">Records differ</Tag>
          <Tag tone="primary">Booked</Tag>
          <Tag tone="ok">Done</Tag>
          <Tag tone="muted">Being checked</Tag>
        </View>
      </Sample>
      <Sample caption="Lines: the summary, the member's plan line, her why">
        <SummaryLine>3 need you, 4 coming up, 2 for your next visit</SummaryLine>
        <PlanLine version={2} by="Dr. Patel" on="Sep 12" reviewing={3} onPress={() => {}} />
        <Quote text="To keep up with my kids and feel like myself again" meta="From your conversation on Oct 1" />
      </Sample>
      <Sample caption="Save a question, then saved">
        <View style={styles.saveRow}>
          <Text style={[type.body, styles.flex]}>When should I have my next A1c?</Text>
          <SaveQuestion text="When should I have my next A1c?" about="a1c" />
        </View>
      </Sample>
      <Sample caption="Actions: tint, outline, on the hero, text">
        <View style={styles.inline}>
          <SmallAction onPress={() => {}}>Renew</SmallAction>
          <SmallAction tone="outline" onPress={() => {}}>
            See the plan
          </SmallAction>
          <TextAction onPress={() => {}} chevron>
            See how it works
          </TextAction>
          <TextAction tone="muted" onPress={() => {}}>
            Not now
          </TextAction>
        </View>
        <Hero>
          <View style={styles.inline}>
            <SmallAction tone="onHero" onPress={() => {}}>
              Continue
            </SmallAction>
          </View>
        </Hero>
      </Sample>
      <Sample caption="Choosers: tabs and single choice chips">
        <Tabs
          options={[
            { value: "days", label: "Days" },
            { value: "weight", label: "Weight" },
          ]}
          value={tab}
          onChange={setTab}
        />
        <ChipRow
          options={[
            { value: "all", label: "All 27" },
            { value: "watch", label: "To watch 8" },
            { value: "in", label: "In range 20" },
          ]}
          value={chip}
          onChange={setChip}
        />
      </Sample>
      <Sample caption="Details and steps">
        <View>
          <KeyValue label="Ordered by" value="Dr. Maya Patel" />
          <KeyValue label="Due" value="By Nov 12, 2026" />
          <KeyValue label="Prep" value="Fast for 10 to 12 hours" last />
        </View>
        <DateTrack dates={[{ label: "Ordered", date: "Mar 4" }, { label: "Booked" }, { label: "Done" }]} late />
        <Steps
          steps={[
            { label: "Ordered by Dr. Patel", date: "Mar 4", state: "done" },
            { label: "Reminder 3 of 3", date: "Sep 20", state: "alert" },
            { label: "Book with a partner", state: "next" },
          ]}
        />
      </Sample>
    </Block>
  )
}

function Offers() {
  return (
    <Block title="Offers and the allowance" variant="title">
      <Sample caption="Nudge card: the free home's plan card, last" bare>
        <Nudge
          art="seedling"
          title="A plan built around you"
          body="For blood sugar and weight, from your record and your why."
          points={["A daily diet plan, with meals logged by photo", "An exercise program with short videos", "Watch and scale sync, coming soon"]}
          note="Reviewed by a physician before it starts."
          action="See how it works"
          onAction={() => {}}
          dismissLabel="Hide for now"
          onDismiss={() => {}}
          onDecline={() => {}}
        />
      </Sample>
      <Sample caption="Nudge card: change course, on a marker going the wrong way" bare>
        <Nudge
          art="compass"
          title="Want to change course?"
          body="Your A1c has gone from 5.3 to 5.9 across your last 5 results. A plan works on it with you, one small step at a time."
          note="Reviewed by a physician before it starts."
          action="See how a plan works"
          onAction={() => {}}
          onDismiss={() => {}}
          onDecline={() => {}}
        />
      </Sample>
      <Sample caption="Nudge inline, inside an answer">
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>Small, steady changes to what you eat and how you move are what bring an A1c down over a few months.</Text>
          <Nudge variant="inline" body="If you'd like help turning this into a weekly routine, that's what a plan does." action="See the plan" onAction={() => {}} onDismiss={() => {}} />
        </View>
      </Sample>
      <Sample caption="Nudge link: readiness Somewhat">
        <Nudge variant="link" title="A plan can build your days around your results." action="See how it works" onAction={() => {}} />
      </Sample>
      <Sample caption="The limit card, in the thread at the cap" bare>
        <Nudge
          art="sparkle"
          title="You've used this month's questions"
          body="They come back on Nov 1. Your record, trends and past answers are all still here."
          action="See what members get"
          onAction={() => {}}
        >
          <Button variant="outline" onPress={() => {}}>
            Save for my next visit
          </Button>
        </Nudge>
      </Sample>
      <Sample caption="Allowance meter: 8 left, 1 left, none left">
        <AllowanceMeter left={8} total={8} />
        <AllowanceMeter left={1} total={8} />
        <AllowanceMeter left={0} total={8} line="No free questions left until Nov 1" />
      </Sample>
      <Sample caption="Allowance line, for this device's patient (none for a member)">
        <View style={styles.askRow}>
          <Tile>
            <IconSparkle size={18} color={HUE.teal.ink} />
          </Tile>
          <View style={styles.flex}>
            <Text style={type.title}>Ask about your results</Text>
            <AllowanceLine />
          </View>
        </View>
      </Sample>
    </Block>
  )
}

const BANNERS: { caption: string; state: BannerState }[] = [
  { caption: "Sharing turned off", state: { kind: "sharing-off", since: "Oct 3" } },
  { caption: "Sharing ended", state: { kind: "sharing-ended", on: "Sep 28" } },
  { caption: "Sharing ends soon", state: { kind: "sharing-ends", days: 12, on: "Oct 14" } },
  { caption: "Record still arriving", state: { kind: "arriving", got: 2, of: 3 } },
  { caption: "A place found nothing", state: { kind: "not-found", place: "Scripps Memorial" } },
  { caption: "New results", state: { kind: "new-results", count: 4, from: "Quest", on: "Oct 5" } },
  { caption: "A new plan version with the doctor", state: { kind: "plan-review", version: 3, by: "Dr. Patel" } },
  { caption: "Dr. Patel checking", state: { kind: "checking", by: "Dr. Patel" } },
  { caption: "Dr. Patel checked, for 7 days", state: { kind: "checked", by: "Dr. Patel", on: "Oct 3" } },
]

function Banners() {
  return (
    <Block title="Status banner" variant="title">
      {BANNERS.map((b) => (
        <View key={b.state.kind} style={styles.bannerSample}>
          <Text style={type.meta}>{b.caption}</Text>
          <ReviewBanner state={b.state} onPress={() => {}} />
        </View>
      ))}
    </Block>
  )
}

/** Every object the screens use (FINAL-SPEC C.0.10), at its size there,
    with where it lives. */
const OBJECTS: { name: ArtName; size: number; where: string }[] = [
  { name: "seedling", size: 64, where: "Plan card" },
  { name: "target", size: 64, where: "Paused, plan header" },
  { name: "trophy", size: 56, where: "Milestone" },
  { name: "key", size: 64, where: "Setup hero" },
  { name: "document", size: 64, where: "Review hero" },
  { name: "compass", size: 64, where: "Change course" },
  { name: "sparkle", size: 64, where: "Limit card" },
  { name: "folder", size: 56, where: "Record summary" },
  { name: "magnifier", size: 64, where: "Nothing to watch" },
  { name: "calendar", size: 64, where: "To do, booked" },
  { name: "bell", size: 64, where: "Notifications" },
  { name: "dumbbell", size: 64, where: "Exercise" },
  { name: "bowl", size: 64, where: "Diet plan" },
  { name: "camera", size: 64, where: "Log a meal" },
  { name: "chart-block", size: 64, where: "Progress, history" },
  { name: "watch", size: 64, where: "Devices" },
  { name: "record-tube", size: 64, where: "Record arriving" },
]

function Empties() {
  return (
    <Block title="Empty states and objects" variant="title">
      <EmptyState art="folder" artSize={112} title="Your records aren't connected" line="Nothing has been collected. Connect when you're ready and we'll bring your history together.">
        <View style={styles.emptyButton}>
          <Button onPress={() => {}}>Connect my records</Button>
        </View>
      </EmptyState>
      <EmptyState art="record-tube" artSize={96} title="Your record is still arriving" line="2 of 3 places so far" />
      <EmptyState art="magnifier" artSize={80} title="Nothing to watch right now" action="See all results" onAction={() => {}} />
      <EmptyState art="calendar" artSize={96} title="Nothing to do right now" />
      <EmptyState art="bell" artSize={96} title="No notifications yet" />
      <EmptyState art="chart-block" artSize={80} title="Nothing here yet" />
      <Sample caption="Every object, at its size on its screen">
        <View style={styles.objects}>
          {OBJECTS.map((o) => (
            <View key={o.name} style={styles.object}>
              <View style={styles.objectArt}>
                <Art name={o.name} size={o.size} />
              </View>
              <Text style={styles.objectName} numberOfLines={1}>
                {o.name}
              </Text>
              <Text style={styles.objectWhere} numberOfLines={2}>
                {o.where}
              </Text>
            </View>
          ))}
        </View>
      </Sample>
    </Block>
  )
}

function Toasts() {
  return (
    <Block title="Toast" variant="title">
      <Sample caption="As it holds under the status bar for 1.6 s">
        <View style={styles.center}>
          <Toast text="Saved for your next visit" />
        </View>
        <SmallAction onPress={() => toast("Saved for your next visit")} style={styles.centerSelf}>
          Show it
        </SmallAction>
      </Sample>
    </Block>
  )
}

/* -------------------------------------------------------------- frame -- */

/** One piece with its caption. `bare` leaves the card out, for pieces that
    draw their own. */
function Sample({ caption, bare, children }: { caption: string; bare?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.sample}>
      <Text style={type.meta}>{caption}</Text>
      {bare ? children : <Card style={styles.sampleCard}>{children}</Card>}
    </View>
  )
}

const styles = StyleSheet.create({
  controls: { backgroundColor: color.background, borderRadius: 20, borderWidth: 1, borderColor: chart.edge, paddingHorizontal: 16 },
  toggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 52 },
  toggleRule: { borderBottomWidth: 1, borderBottomColor: "#F2F2F7" },
  toggleText: { ...type.title },
  pressed: { opacity: 0.7 },
  replay: { marginTop: -8 },
  groups: { gap: 32 },
  sample: { gap: 8 },
  sampleCard: { gap: 14 },
  flex: { flex: 1 },
  center: { alignItems: "center" },
  centerSelf: { alignSelf: "center" },
  inline: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  okRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  okBody: { flex: 1, gap: 2 },
  okAction: { marginTop: 10 },
  barRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  barName: { flex: 1 },
  bar: { width: 104 },
  dayHead: { flexDirection: "row", alignItems: "center", gap: 16 },
  dayText: { flex: 1, gap: 2 },
  energy: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 6, rowGap: 4, marginTop: 2 },
  rule: { height: 1, backgroundColor: "#F2F2F7" },
  rings: { flexDirection: "row", justifyContent: "space-between" },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  gauges: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-start" },
  hero: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  heroHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  saveRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  bubble: { gap: 4, padding: 14, borderRadius: 18, backgroundColor: "#F4F4F2" },
  bubbleText: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: color.text },
  askRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  bannerSample: { gap: 8 },
  emptyButton: { alignSelf: "stretch", marginTop: 8 },
  objects: { flexDirection: "row", flexWrap: "wrap", rowGap: 16 },
  object: { width: "33.33%", alignItems: "center", gap: 2, paddingHorizontal: 4 },
  objectArt: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  objectName: { ...type.metaStrong, color: color.text },
  objectWhere: { ...type.meta, textAlign: "center" },
})
