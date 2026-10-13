import { router } from "expo-router"
import * as React from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import { formatNumber } from "@/components/charts"
import { CheckInSheet, type CheckInKind } from "@/components/check-in-sheet"
import { Upcoming } from "@/components/home-free"
import { HomeHeader, StatusBanner } from "@/components/home-header"
import { Barbell, BowlFood, Bone, CaretRight, Check, Clock, Flame, Heartbeat, PersonSimpleRun, PersonSimpleWalk, Scales } from "@/components/ph"
import {
  Block,
  Card,
  HUE,
  Hero,
  Rise,
  heroText,
  type Hue,
} from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { TrendCard } from "@/components/trend-tile"
import { reviewDay, type GoalDay, type ReviewDay, type ReviewGoalId } from "@/lib/daily-review"
import { useMarkers } from "@/lib/experience"
import { clockOf, dayOfAt, localDay, today, type TodayAction } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { card, color, hairline, ink, space, type } from "@/lib/theme"
import { classify, homeTiles, watchList, type Trend } from "@/lib/trends"
import { keepEnd } from "@/lib/words"

/* An Optimization member's home, four sections in this order (13 Oct 2026):
   1. To do: today's tracker, a teal hero with how many of today's tasks are
      done as a ring, the next one, and the three doors (Exercise, Diet plan,
      Log a meal); then the checklist she works through: the walk, the meal,
      the exercise, the weigh in and the blood pressure each open their
      screen or sheet;
   2. Your trends: her results as a sideways strip of graphs;
   3. Yesterday's goals: the score and the four goal tiles the client
      approved (12 Oct 2026), which open the full review;
   4. Upcoming: what is coming next, last because it is the furthest ahead.
   Only what the care plan decisions cover: no step counts, no wearables
   (a later phase). Medicines and new visits live on the Record tab. */

export function OptimizedHome() {
  const onboarding = useOnboarding()
  const [sheet, setSheet] = React.useState<CheckInKind>()
  const t = today(onboarding)
  const day = reviewDay(onboarding, 1)

  return (
    <TabScreen
      tab="home"
      header={<HomeHeader line="Here's your day." />}
      overlay={sheet && <CheckInSheet kind={sheet} onClose={() => setSheet(undefined)} />}
    >
      <View style={styles.page}>
        <StatusBanner variant="member" tab="home" />
        <Rise at={1} id="home:tracker">
          <TodayTracker t={t} />
        </Rise>
        <Rise at={2} id="home:todo">
          <TodoList t={t} onCheckIn={setSheet} />
        </Rise>
        <Rise at={3} id="home:trends">
          <Block title="Your trends" onSeeAll={() => router.push("/results")}>
            <TrendStrip />
          </Block>
        </Rise>
        <Rise at={4} id="home:goals">
          <YesterdayGoals day={day} />
        </Rise>
        <Upcoming at={5} />
      </View>
    </TabScreen>
  )
}

type TodayPlan = ReturnType<typeof today>

const openToday = () => router.push(`/day/${localDay(new Date())}`)
const openReview = () => router.push("/review")

/* ---------------------------------------------------- today's tracker -- */

/** Today's tracker: the hero alone (13 Oct 2026: the Exercise, Diet plan and
    Log a meal tiles left the home; their screens open from the to-do cards
    and the Plan tab). */
function TodayTracker({ t }: { t: TodayPlan }) {
  const next = t.actions.filter((a) => a.counts).find((a) => a.status !== "done")
  const percent = t.of ? Math.round((t.done / t.of) * 100) : 0
  const line = next ? `Next: ${next.title}, ${next.time}` : "Everything is done for today"
  return (
    <View style={styles.tracker}>
      <Hero>
        <View style={styles.heroBody}>
          <Pressable
            onPress={openToday}
            accessibilityRole="button"
            accessibilityLabel={`Today's tracker, ${t.done} of ${t.of} done. ${line}. Opens today's plan`}
            style={({ pressed }) => [styles.heroPanel, pressed && styles.pressed]}
          >
            <TrackerRing percent={percent} />
            <View style={styles.fill}>
              <Text style={styles.heroLabel}>{`Today, ${t.label}`}</Text>
              <Text style={heroText.title}>{`${t.done} of ${t.of} done`}</Text>
              <Text style={heroText.line}>{line}</Text>
            </View>
            <CaretRight size={18} color={ink.onColor} />
          </Pressable>
        </View>
      </Hero>
    </View>
  )
}

/** Tasks done as a white ring on the hero's teal, the percent in its centre. */
function TrackerRing({ percent }: { percent: number }) {
  const size = 68
  const sw = 7
  const r = (size - sw) / 2
  const c = 2 * Math.PI * r
  const share = Math.min(Math.max(percent, 0), 100) / 100
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.25)" strokeWidth={sw} fill="none" />
        {share > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={ink.onColor}
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * share} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringNumber}>
          {percent}
          <Text style={styles.ringUnit}>%</Text>
        </Text>
      </View>
    </View>
  )
}

/* ------------------------------------------------------ today's to-do -- */

/** Today's own reading of a kind (her weigh in, her blood pressure). */
function todayEntry(s: ReturnType<typeof useOnboarding>, kind: "weight" | "bp") {
  const day = localDay()
  return (s.entries ?? []).filter((e) => e.kind === kind && dayOfAt(e.at) === day).at(-1)
}

/** "Labs tomorrow at 7:30 AM" and what to do tonight, from the plan's one
    line. */
function prepParts(prep: string): [string, string | undefined] {
  const at = prep.indexOf(": ")
  if (at < 0) return [prep, undefined]
  const rest = prep.slice(at + 2)
  return [prep.slice(0, at), rest.charAt(0).toUpperCase() + rest.slice(1)]
}

function TodoList({ t, onCheckIn }: { t: TodayPlan; onCheckIn: (kind: CheckInKind) => void }) {
  const onboarding = useOnboarding()
  const tasks = t.actions.filter((a) => a.counts)
  const walk = onboarding.exercises?.[t.day]?.walk
  const [prepTitle, prepLine] = t.prep ? prepParts(t.prep) : []

  const card = (a: TodayAction) => {
    const facts = keepEnd(`${a.time} · ${a.detail}`)
    if (a.id === "walk")
      return (
        <TaskCard
          key={a.id}
          title={a.title}
          icon={<PersonSimpleWalk size={18} color={color.primary} />}
          meta={walk ? `Done at ${clockOf(new Date(walk.at))}` : facts}
          done={!!walk}
          onPress={() => onCheckIn("walk")}
        />
      )
    if (a.id === "meal")
      return (
        <TaskCard
          key={a.id}
          title={a.title}
          icon={<BowlFood size={18} color={color.primary} />}
          meta={a.progress?.words ?? facts}
          done={a.status === "done"}
          onPress={() => router.push({ pathname: "/log-meal", params: { slot: a.slot } })}
        />
      )
    if (a.id === "strength")
      return (
        <TaskCard
          key={a.id}
          title={a.title}
          icon={<Barbell size={18} color={color.primary} />}
          meta={a.status === "progress" && a.progress ? a.progress.words : facts}
          done={a.status === "done"}
          onPress={() => router.push("/exercise")}
        />
      )
    const kind = a.id === "bp" ? "bp" : "weight"
    const entry = todayEntry(onboarding, kind)
    const reading = entry && (kind === "bp" ? `${entry.value}/${entry.value2}` : `${entry.value.toFixed(1)} lb`)
    return (
      <TaskCard
        key={a.id}
        title={a.title}
        icon={kind === "bp" ? <Heartbeat size={18} color={color.primary} /> : <Scales size={18} color={color.primary} />}
        meta={entry ? `${reading} at ${clockOf(new Date(entry.at))}` : facts}
        done={!!entry}
        onPress={() => onCheckIn(kind)}
      />
    )
  }

  return (
    <View style={styles.todo}>
      <View style={styles.todoHead}>
        <View style={styles.fill}>
          <Text style={styles.todoTitle} accessibilityRole="header">
            Today's To-Do
          </Text>
        </View>
      </View>
      {/* Done tasks sink to the bottom; Array.sort is stable, so each group
          keeps its day order. */}
      <View style={styles.list}>{tasks.map(card).sort((x, y) => Number(!!x.props.done) - Number(!!y.props.done))}</View>
      {!!prepTitle && <TaskCard title={prepTitle} meta={prepLine && keepEnd(prepLine)} icon={<Clock size={18} color={color.primary} />} onPress={() => router.push("/gaps")} />}
    </View>
  )
}

/** One task as a card in a list: a round icon tile, the title and its
    facts, and a chevron on the right (13 Oct 2026: no radio button). A done
    task tints its card teal and says when in its facts. Every card opens its
    screen or sheet, the walk's included, and the task is done once logged
    there. */
function TaskCard({
  icon,
  title,
  meta,
  done,
  onPress,
}: {
  icon: React.ReactNode
  title: string
  meta?: string
  done?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, meta, done === undefined ? undefined : done ? "done" : "to do"].filter(Boolean).join(", ")}
      style={({ pressed }) => [styles.task, done && styles.taskDone, pressed && styles.pressed]}
    >
      <View style={[styles.taskTile, done && styles.taskTileDone]}>{done ? <Check size={18} weight="bold" color={color.primary} /> : icon}</View>
      <View style={styles.fill}>
        <Text style={[styles.taskTitle, done && styles.struck]} numberOfLines={2}>
          {title}
        </Text>
        {!!meta && (
          <Text style={[styles.taskMeta, done && styles.struck]} numberOfLines={3}>
            {meta}
          </Text>
        )}
      </View>
      <CaretRight size={16} color={card.chevron} />
    </Pressable>
  )
}

/* ------------------------------------------------------ yesterday's goals -- */

function YesterdayGoals({ day }: { day: ReviewDay }) {
  return (
    <Block title="Yesterday's goals" link={{ label: "Details", onPress: openReview }}>
      <View style={styles.tiles}>
        {day.goals.map((g) => (
          <GoalTile key={g.goal.id} goal={g} />
        ))}
      </View>
    </Block>
  )
}

/* -------------------------------------------------------------- goals -- */

/** Each goal's colour and icon, as the client's screen gives every goal
    its own. */
const GOAL_LOOK: Record<ReviewGoalId, { hue: Hue; Icon: React.ComponentType<{ size?: number; color?: string }>; name: string }> = {
  energy: { hue: "amber", Icon: Flame, name: "Calorie deficit" },
  protein: { hue: "blue", Icon: BowlFood, name: "Protein" },
  calcium: { hue: "violet", Icon: Bone, name: "Calcium" },
  exercise: { hue: "teal", Icon: PersonSimpleRun, name: "Exercise" },
}

const STATE_WORD = { met: "Met", close: "Close", under: "Short", none: "No log" } as const

/** The colours of a goal's progress bar and day bars: green when the day's
    goal is complete or very near (90% or more), red when it is incomplete; the day in view, still in progress, is blue in the bars. */
const PROGRESS = { done: "#1E9E5A", short: "#E34948", current: "#2A78D6" } as const

function progressColor(value: number | undefined, target: number) {
  const s = value === undefined || target <= 0 ? 0 : value / target
  return s >= 0.9 ? PROGRESS.done : PROGRESS.short
}

/** The member home's goal tile, approved by the user on 12 Oct 2026 ("I
    loved this element, keep it"): leave its look as it is. */
export function GoalTile({ goal }: { goal: GoalDay }) {
  const look = GOAL_LOOK[goal.goal.id]
  const hue = HUE[look.hue]
  const unit = goal.goal.unit
  const share = goal.value !== undefined ? Math.max(0, Math.min(goal.value / goal.goal.target, 1)) : 0
  const max = Math.max(goal.goal.target, ...goal.week.map((w) => w.value ?? 0))
  const footer =
    goal.value === undefined
      ? "Not logged"
      : goal.state === "met"
        ? goal.value > goal.goal.target && goal.goal.id !== "exercise"
          ? `${formatNumber(goal.value - goal.goal.target)} ${unit} over goal`
          : "Goal reached"
        : `${formatNumber(goal.goal.target - goal.value)} ${unit} to go`
  const tone = progressColor(goal.value, goal.goal.target)
  const stateInk = goal.state === "met" ? ink.good : goal.state === "close" ? "#A95413" : ink.tertiary
  return (
    <Pressable
      onPress={openReview}
      accessibilityRole="button"
      accessibilityLabel={`${look.name}, ${goal.value === undefined ? "not logged" : `${goal.value} of ${goal.goal.target} ${unit}`}, ${STATE_WORD[goal.state]}`}
      style={({ pressed }) => [styles.tileWrap, pressed && styles.pressed]}
    >
      <Card style={styles.tile}>
        <View style={styles.tileHead}>
          <View style={[styles.icon, { backgroundColor: hue.tint }]}>
            <look.Icon size={16} color={hue.ink} />
          </View>
          <Text style={[styles.stateWord, { color: stateInk }]}>{STATE_WORD[goal.state]}</Text>
        </View>
        <Text style={type.label}>{look.name}</Text>
        <Text style={styles.value} numberOfLines={1}>
          {goal.value === undefined ? "No log" : formatNumber(goal.value)}
          {goal.value !== undefined && <Text style={type.unit}>{` / ${formatNumber(goal.goal.target)} ${unit}`}</Text>}
        </Text>
        <View style={[styles.bar, { backgroundColor: `${tone}26` }]}>
          <View style={[styles.barFill, { width: `${share * 100}%`, backgroundColor: tone }]} />
        </View>
        <View style={styles.micro}>
          {goal.week.map((w, i) => (
            <View
              key={i}
              style={[
                styles.microBar,
                {
                  height: w.value !== undefined ? Math.max(3, (24 * w.value) / max) : 3,
                  backgroundColor: w.selected ? PROGRESS.current : progressColor(w.value, goal.goal.target),
                  opacity: w.value === undefined ? 0.15 : i === goal.week.length - 1 ? 1 : w.partial ? 0.3 : 0.6,
                },
              ]}
            />
          ))}
        </View>
        <Text style={type.meta}>{footer}</Text>
      </Card>
    </Pressable>
  )
}

/* ------------------------------------------------------------- trends -- */

/** Her results as a sideways strip of graphs, worth watching first. */
function TrendStrip() {
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const list = watchList(markers, { improve: onboarding.why?.improve })
  const tiles: Trend[] = [...homeTiles(list, { goodNews: true }).tiles]
  if (tiles.length < 4) {
    const steady = markers
      .map(classify)
      .filter((t) => !t.watch && !!t.latest && !tiles.some((x) => x.id === t.id))
      .sort((a, b) => b.count - a.count)
    tiles.push(...steady.slice(0, 4 - tiles.length))
  }
  if (!tiles.length) return null
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.strip}>
      {tiles.map((t) => (
        <View key={t.id} style={styles.trend}>
          <TrendCard trend={t} onPress={() => router.push({ pathname: "/biomarker/[id]", params: { id: t.id } })} />
        </View>
      ))}
    </ScrollView>
  )
}

/* ------------------------------------------------------------- styles -- */

const WHITE_SOFT = "rgba(255, 255, 255, 0.82)"

const styles = StyleSheet.create({
  page: { gap: space.section, paddingBottom: space.section },
  fill: { flex: 1 },
  pressed: { opacity: 0.7 },

  // Today's tracker: the hero's gradient with the summary sitting straight on it,
  // then the three doors on white cards.
  tracker: { gap: space.item },
  heroBody: { marginHorizontal: -4, marginVertical: -2 },
  heroPanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    padding: space.item,
    borderRadius: 14,
  },
  heroLabel: { ...type.label, color: WHITE_SOFT },
  ringCenter: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  ringNumber: { ...type.hero, fontSize: 22, lineHeight: 28, color: ink.onColor },
  ringUnit: { ...type.unit, fontSize: 14, color: WHITE_SOFT },

  // Today's to-do: a heading with its count, then one card per task, a done
  // one tinted teal with its check filled.
  todo: { gap: space.item },
  todoHead: { flexDirection: "row", alignItems: "flex-start", gap: space.item },
  todoTitle: { ...type.tabTitle, fontSize: 20, lineHeight: 28, color: ink.strong },
  list: { gap: space.item },
  task: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lead,
    padding: space.item,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
    boxShadow: card.shadow,
  },
  taskDone: { backgroundColor: color.primarySoft, borderColor: color.primaryEdge },
  taskTile: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },
  taskTileDone: { backgroundColor: color.background },
  taskTitle: { ...type.title, color: ink.strong },
  taskMeta: { ...type.label, marginTop: space.line },
  struck: { textDecorationLine: "line-through" },

  // Yesterday's goals.
  score: { flexDirection: "row", alignItems: "center", gap: space.lead },

  tileWrap: { flexBasis: "47%", flexGrow: 1 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: space.item },
  tile: { gap: space.inline },
  tileHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  stateWord: { ...type.metaStrong },
  value: { ...type.hero },
  bar: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  micro: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 24 },
  microBar: { flex: 1, borderRadius: 2 },

  bleed: { marginHorizontal: -space.gutter },
  strip: { gap: space.item, paddingHorizontal: space.gutter },
  trend: { width: 168 },
})
