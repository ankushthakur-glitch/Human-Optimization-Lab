import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { ScoreRing, WeekBars, formatNumber } from "@/components/charts"
import { PrimaryButton } from "@/components/hol"
import { CaretLeft, CaretRight, Lightbulb } from "@/components/ph"
import { Card, Rise, Tag, type Tone } from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { reviewDay, type EnergyDay, type GoalDay, type GoalState, type ReviewDay } from "@/lib/daily-review"
import { localDay } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { chart, color, hairline, ink, space, type } from "@/lib/theme"

/* The paid patient's daily plan, from the client's Journey screen 13
   ("Yesterday: how did I do?", 12 Oct 2026). Two pieces:
   - PlanCard, on the member home: yesterday's score, each goal at a
     glance, the one fix, and today's plan as the action;
   - DailyReviewPage (/review): the whole of a day, one score, one insight
     and a card per goal, with arrows back through earlier days.
   The previous member home stays in components/home-member.tsx
   (/home-previous). */

const openToday = () => router.push(`/day/${localDay(new Date())}`)

/* ------------------------------------------------------- plan card -- */

/** Yesterday on the member home: the score and the goals in one card, so
    the plan reads at a glance between what needs her and her record. The
    card opens the full review; the button opens today. */
export function PlanCard() {
  const onboarding = useOnboarding()
  const day = reviewDay(onboarding, 1)
  const head = day.status === "complete" ? `${day.met} of ${day.total} goals met` : day.status === "partial" ? "Partial day, not scored" : "Nothing logged"
  return (
    <Card style={styles.plan}>
      <Pressable
        onPress={() => router.push("/review")}
        accessibilityRole="button"
        accessibilityLabel={`Yesterday, ${day.percent !== undefined ? `${day.percent} percent, ` : ""}${head}. Opens your daily review`}
        style={({ pressed }) => [styles.planTop, pressed && styles.pressed]}
      >
        <ScoreRing percent={day.percent} size={64} label={day.status === "partial" ? "Partial" : "No log"} playKey="plan-card" />
        <View style={styles.fill}>
          <Text style={type.section}>Yesterday</Text>
          <Text style={type.label}>{head}</Text>
          {day.weekAverage !== undefined && <Text style={styles.week}>{`7 day average: ${day.weekAverage}%`}</Text>}
        </View>
        <CaretRight size={16} color={ink.tertiary} />
      </Pressable>

      <View style={styles.tiles}>
        {day.goals.map((g) => (
          <GoalTile key={g.goal.id} goal={g} />
        ))}
      </View>

      <View style={styles.tip}>
        <Lightbulb size={16} color={color.amber} />
        <Text style={[type.label, styles.fill]}>{day.insight}</Text>
      </View>

      <PrimaryButton onPress={openToday}>See today's plan</PrimaryButton>
    </Card>
  )
}

const TILE_NAME: Record<string, string> = { energy: "Deficit", protein: "Protein", calcium: "Calcium", exercise: "Exercise" }

/** One goal on the plan card: its name with a status dot, the amount
    against the target, and a bar to the goal. */
export function GoalTile({ goal }: { goal: GoalDay }) {
  const share = goal.value !== undefined ? Math.max(0, Math.min(goal.value / goal.goal.target, 1)) : 0
  const tint = goal.state === "met" ? chart.inRange : goal.state === "close" ? chart.borderline : goal.state === "under" ? ink.tertiary : hairline.outline
  const unit = goal.goal.unit
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${goal.goal.name}, ${goal.value === undefined ? "not logged" : `${goal.value} of ${goal.goal.target} ${unit}`}, ${STATE_TAG[goal.state].word}`}>
      <View style={styles.tileHead}>
        <View style={[styles.dot, { backgroundColor: tint }]} />
        <Text style={type.label}>{TILE_NAME[goal.goal.id] ?? goal.goal.name}</Text>
      </View>
      <Text style={styles.tileValue} numberOfLines={1}>
        {goal.value === undefined ? (
          <Text style={styles.amountMuted}>Not logged</Text>
        ) : (
          <>
            {formatNumber(goal.value)}
            <Text style={type.unit}>{` / ${formatNumber(goal.goal.target)} ${unit}`}</Text>
          </>
        )}
      </Text>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${Math.max(share * 100, share ? 4 : 0)}%`, backgroundColor: goal.state === "met" ? color.primary : chart.dataSoft }]} />
      </View>
    </View>
  )
}

/* ------------------------------------------------------ review page -- */

export function DailyReviewPage() {
  const onboarding = useOnboarding()
  const [back, setBack] = React.useState(1)
  const day = reviewDay(onboarding, back)

  return (
    <TabScreen tab="home" bare title="Daily review" footer={<PrimaryButton onPress={openToday}>See today's plan</PrimaryButton>}>
      <View style={styles.page}>
        <DayStepper day={day} onBack={() => setBack((b) => b + 1)} onForward={() => setBack((b) => Math.max(1, b - 1))} />
        <Rise at={0} id={`review:score:${day.day}`}>
          <ScoreCard day={day} />
        </Rise>
        <Rise at={1} id={`review:insight:${day.day}`}>
          <Insight text={day.insight} />
        </Rise>
        {day.goals.map((g, i) => (
          <Rise key={g.goal.id} at={2 + i} id={`review:${g.goal.id}:${day.day}`}>
            {g.goal.id === "energy" ? (
              <EnergyCard n={i + 1} goal={g} energy={day.energy} playKey={day.day} />
            ) : (
              <GoalCard n={i + 1} goal={g} playKey={day.day} week={g.goal.id === "calcium" ? day.weekCalcium : undefined} />
            )}
          </Rise>
        ))}
      </View>
    </TabScreen>
  )
}

/* ---------------------------------------------------------- the day -- */

function DayStepper({ day, onBack, onForward }: { day: ReviewDay; onBack: () => void; onForward: () => void }) {
  return (
    <View style={styles.stepper}>
      <StepArrow label="Earlier day" disabled={!day.canBack} onPress={onBack}>
        <CaretLeft size={16} color={day.canBack ? ink.content : hairline.outline} />
      </StepArrow>
      <Text style={styles.stepperText} accessibilityRole="header" accessibilityLiveRegion="polite">
        {`${day.title} · ${day.dateWords}`}
      </Text>
      <StepArrow label="Later day" disabled={!day.canForward} onPress={onForward}>
        <CaretRight size={16} color={day.canForward ? ink.content : hairline.outline} />
      </StepArrow>
    </View>
  )
}

function StepArrow({ label, disabled, onPress, children }: { label: string; disabled: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  )
}

/* ----------------------------------------------------------- score -- */

function ScoreCard({ day }: { day: ReviewDay }) {
  const head =
    day.status === "complete" ? `${day.met} of ${day.total} goals met` : day.status === "partial" ? "Partial day, not scored" : "Nothing logged"
  const week = day.weekAverage !== undefined ? `7 day average: ${day.weekAverage}%` : undefined
  return (
    <Card style={styles.score}>
      <ScoreRing percent={day.percent} size={72} label={day.status === "partial" ? "Partial" : "No log"} playKey={day.day} />
      <View style={styles.scoreWords}>
        <Text style={type.section}>Daily goal score</Text>
        <Text style={type.label}>{head}</Text>
        {week && <Text style={styles.week}>{week}</Text>}
      </View>
    </Card>
  )
}

export function Insight({ text }: { text: string }) {
  return (
    <View style={styles.insight} accessible accessibilityLabel={`Inlay insight. ${text}`}>
      <Lightbulb size={18} color={color.amber} />
      <View style={styles.insightWords}>
        <Text style={type.title}>Inlay insight</Text>
        <Text style={type.body}>{text}</Text>
      </View>
    </View>
  )
}

/* ----------------------------------------------------------- goals -- */

export const STATE_TAG: Record<GoalState, { tone: Tone; word: string }> = {
  met: { tone: "ok", word: "Goal met" },
  close: { tone: "low", word: "Close" },
  under: { tone: "muted", word: "Under goal" },
  none: { tone: "muted", word: "Not scored" },
}

function GoalHead({ n, goal }: { n: number; goal: GoalDay }) {
  const tag = STATE_TAG[goal.state]
  return (
    <View style={styles.goalHead}>
      <View style={styles.number}>
        <Text style={type.captionStrong}>{n}</Text>
      </View>
      <Text style={[type.title, styles.fill]} accessibilityRole="header">
        {goal.goal.name}
      </Text>
      <Tag tone={tag.tone}>{tag.word}</Tag>
    </View>
  )
}

export function EnergyCard({ n, goal, energy, playKey }: { n: number; goal: GoalDay; energy?: EnergyDay; playKey: string }) {
  return (
    <Card style={styles.goalCard}>
      <GoalHead n={n} goal={goal} />
      {energy ? (
        <>
          <View style={styles.energy}>
            <View style={styles.fill}>
              <Line label="Food calories in" value={energy.food} />
              <Line label="Resting burn (RMR)" value={energy.resting} />
              <Line label="Active energy" value={energy.active} plus />
              <View style={styles.total}>
                <Line label="Energy out" value={energy.out} strong />
              </View>
            </View>
            <View style={styles.deficit} accessible accessibilityLabel={`${formatNumber(energy.deficit)} calorie deficit, goal ${goal.goal.target}`}>
              <Text style={styles.deficitNumber}>{formatNumber(energy.deficit)}</Text>
              <Text style={type.label}>calorie deficit</Text>
              <Text style={type.meta}>{`Goal: ${goal.goal.target}`}</Text>
            </View>
          </View>
          <View style={styles.chart}>
            <Text style={type.metaStrong}>Calorie deficit, past 7 days</Text>
            <WeekBars
              days={goal.week.map((w) => ({ label: w.label, value: w.value, partial: w.partial }))}
              selected={6}
              goal={goal.goal.target}
              unit="kcal"
              name="Calorie deficit"
              emptyWord="Nothing logged"
              readout={false}
              playKey={playKey}
            />
          </View>
          <Text style={type.meta}>{energy.source}</Text>
        </>
      ) : (
        <Text style={type.label}>{goal.gapWords}</Text>
      )}
    </Card>
  )
}

function Line({ label, value, plus, strong }: { label: string; value: number; plus?: boolean; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={strong ? type.title : type.label}>{label}</Text>
      <Text style={strong ? type.value : styles.lineValue}>{`${plus ? "+" : ""}${formatNumber(value)}`}</Text>
    </View>
  )
}

export function GoalCard({ n, goal, playKey, week }: { n: number; goal: GoalDay; playKey: string; week?: { total: number; target: number } }) {
  const unit = goal.goal.unit
  return (
    <Card style={styles.goalCard}>
      <GoalHead n={n} goal={goal} />
      <View style={styles.goalBody}>
        <View style={styles.fill}>
          <Text style={styles.amount} accessibilityLabel={goal.value === undefined ? "Not logged" : `${goal.value} of ${goal.goal.target} ${unit}`}>
            {goal.value === undefined ? (
              <Text style={styles.amountMuted}>Not logged</Text>
            ) : (
              <>
                {formatNumber(goal.value)}
                <Text style={styles.amountOf}>{` / ${formatNumber(goal.goal.target)} ${unit}`}</Text>
              </>
            )}
          </Text>
          {goal.value !== undefined && <Text style={[type.label, goal.state === "close" && styles.close]}>{goal.gapWords}</Text>}
          {week && <Text style={type.meta}>{`This week: ${formatNumber(week.total)} of ${formatNumber(week.target)} mg`}</Text>}
        </View>
        <View style={styles.spark}>
          <WeekBars days={goal.week.map((w) => ({ label: w.label.slice(0, 1), value: w.value, partial: w.partial }))} mini highlight={6} name={goal.goal.name} unit={unit} playKey={playKey} />
        </View>
      </View>
    </Card>
  )
}

/* ---------------------------------------------------------- styles -- */

const styles = StyleSheet.create({
  page: { gap: space.item, paddingTop: space.inline, paddingBottom: space.section },

  plan: { gap: space.item },
  planTop: { flexDirection: "row", alignItems: "center", gap: space.lead },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  tile: { flexBasis: "47%", flexGrow: 1, gap: space.stack, padding: space.compact, borderRadius: 8, backgroundColor: color.primaryTint },
  tileHead: { flexDirection: "row", alignItems: "center", gap: space.mark },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tileValue: { ...type.value },
  bar: { height: 4, borderRadius: 2, backgroundColor: chart.track, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
  tip: { flexDirection: "row", gap: space.inline, padding: space.compact, borderRadius: 8, backgroundColor: color.amberTint },
  fill: { flex: 1 },
  pressed: { opacity: 0.6 },

  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.inline, paddingVertical: space.stack },
  stepperText: { ...type.title, color: ink.strong, minWidth: 168, textAlign: "center" },
  arrow: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },

  score: { flexDirection: "row", alignItems: "center", gap: space.lead },
  scoreWords: { flex: 1, gap: space.line },
  week: { ...type.metaStrong, color: ink.primary, marginTop: space.stack },

  insight: {
    flexDirection: "row",
    gap: space.inline,
    padding: space.card,
    borderRadius: 8,
    backgroundColor: color.amberTint,
  },
  insightWords: { flex: 1, gap: space.line },

  goalCard: { gap: space.card },
  goalHead: { flexDirection: "row", alignItems: "center", gap: space.inline },
  number: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.primaryTint,
  },

  energy: { flexDirection: "row", alignItems: "center", gap: space.item },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: space.line },
  lineValue: { ...type.label, color: ink.content },
  total: { borderTopWidth: 1, borderTopColor: hairline.rule, marginTop: space.stack, paddingTop: space.stack },
  deficit: {
    width: 112,
    alignItems: "center",
    paddingVertical: space.card,
    borderRadius: 8,
    backgroundColor: color.primaryTint,
    gap: space.line,
  },
  deficitNumber: { ...type.display, color: chart.dataStrong },
  chart: { gap: space.stack, borderTopWidth: 1, borderTopColor: hairline.rule, paddingTop: space.card },

  goalBody: { flexDirection: "row", alignItems: "center", gap: space.item },
  amount: { ...type.hero },
  amountOf: { ...type.unitLarge },
  amountMuted: { ...type.title, color: ink.tertiary },
  close: { color: "#A95413" },
  spark: { width: 120 },
})
