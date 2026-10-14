import { router, useFocusEffect } from "expo-router"
import * as React from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

import { formatNumber } from "@/components/charts"
import { CheckInSheet, type CheckInKind } from "@/components/check-in-sheet"
import { EnergyBalance } from "@/components/energy-balance"
import { Upcoming } from "@/components/home-free"
import { HomeHeader, StatusBanner } from "@/components/home-header"
import { Barbell, BowlFood, Bone, CaretRight, Check, Drop, Flame, Heartbeat, PersonSimpleRun, PersonSimpleWalk, Scales } from "@/components/ph"
import {
  Block,
  Card,
  ProgressBar,
  Rise,
} from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { TrendCard } from "@/components/trend-tile"
import { reviewDay, type GoalDay, type ReviewDay, type ReviewGoalId } from "@/lib/daily-review"
import { useMarkers } from "@/lib/experience"
import { clockOf, dayOfAt, localDay, today, type TodayAction } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { card, chart, color, hairline, ink, space, type } from "@/lib/theme"
import { classify, homeTiles, watchList, type Trend } from "@/lib/trends"
import { keepEnd } from "@/lib/words"

/* An Optimization member's home, five sections in this order (13 Oct 2026):
   1. To do: the checklist she works through: the walk, the meal, the
      exercise, the weigh in and the blood pressure each open their screen
      or sheet (the tracker hero was removed 14 Oct 2026);
   2. Energy balance: energy out minus food in, and the past seven days
      (added 14 Oct 2026; every paid plan, shown once yesterday is fully logged);
   3. Yesterday's goals: the score and the four goal tiles the client
      approved (12 Oct 2026), which open the full review;
   4. Your trends: her results as a sideways strip of graphs;
   5. Upcoming: what is coming next, last because it is the furthest ahead.
   Only what the care plan decisions cover: no step counts, no wearables
   (a later phase). Medicines and new visits live on the Record tab. */

export function OptimizedHome() {
  const onboarding = useOnboarding()
  const [sheet, setSheet] = React.useState<CheckInKind>()
  // The to-do reads the clock (what is next, what is late), so it is redone on
  // every pull down and every time the home comes back into view.
  const [, setTick] = React.useState(0)
  const refresh = React.useCallback(() => setTick((n) => n + 1), [])
  useFocusEffect(refresh)
  const t = today(onboarding)
  const day = reviewDay(onboarding, 1)

  return (
    <TabScreen
      tab="home"
      onRefresh={refresh}
      header={<HomeHeader line="Here's your day." />}
      overlay={sheet && <CheckInSheet kind={sheet} onClose={() => setSheet(undefined)} />}
    >
      <View style={styles.page}>
        <StatusBanner variant="member" tab="home" />
        <Rise at={1} id="home:todo">
          <TodoList t={t} onCheckIn={setSheet} />
        </Rise>
        {day.energy && (
          <Rise at={2} id="home:energy">
            <EnergyBalance day={day} onDetails={openReview} />
          </Rise>
        )}
        <Rise at={3} id="home:goals">
          <YesterdayGoals day={day} />
        </Rise>
        <Rise at={4} id="home:trends">
          <Block title="Your trends" onSeeAll={() => router.push("/results")}>
            <TrendStrip />
          </Block>
        </Rise>
        <Upcoming at={5} />
      </View>
    </TabScreen>
  )
}

type TodayPlan = ReturnType<typeof today>

const openReview = () => router.push("/review")

/* ------------------------------------------------------ today's to-do -- */

/** Today's own reading of a kind (her weigh in, her blood pressure). */
function todayEntry(s: ReturnType<typeof useOnboarding>, kind: "weight" | "bp") {
  const day = localDay()
  return (s.entries ?? []).filter((e) => e.kind === kind && dayOfAt(e.at) === day).at(-1)
}

function TodoList({ t, onCheckIn }: { t: TodayPlan; onCheckIn: (kind: CheckInKind) => void }) {
  const onboarding = useOnboarding()
  const tasks = t.actions.filter((a) => a.counts)
  const walk = onboarding.exercises?.[t.day]?.walk

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
            Today's To-do
          </Text>
          <Text style={styles.todoSub}>Small steps toward your daily health goals.</Text>
        </View>
        <View style={styles.todoCount} accessibilityLabel={`${t.done} of ${t.of} tasks done`}>
          <Text style={styles.todoCountText}>{`${t.done}/${t.of}`}</Text>
        </View>
      </View>
      <ProgressBar done={t.done} total={t.of} />
      {/* Done tasks sink to the bottom; Array.sort is stable, so each group
          keeps its day order. */}
      <View style={styles.list}>{tasks.map(card).sort((x, y) => Number(!!x.props.done) - Number(!!y.props.done))}</View>
    </View>
  )
}

/** One task as a card in a list: a round icon tile, the title and its
    facts, and a chevron on the right (13 Oct 2026: no radio button). A done
    task keeps the neutral card (14 Oct 2026): its tile shows a smaller tick,
    the title is struck through and its facts say when. Every card opens its
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
      <View style={[styles.taskTile, done && styles.taskTileDone]}>{done ? <Check size={15} weight="bold" color={ink.tertiary} /> : icon}</View>
      <View style={styles.fill}>
        <Text style={[styles.taskTitle, done && styles.taskTitleDone, done && styles.struck]} numberOfLines={2}>
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

/** The four cards on the home, in this order (14 Oct 2026). */
const HOME_GOALS: ReviewGoalId[] = ["calcium", "protein", "exercise", "water"]

function YesterdayGoals({ day }: { day: ReviewDay }) {
  const goals = HOME_GOALS.map((id) => day.goals.find((g) => g.goal.id === id)).filter((g): g is GoalDay => !!g)
  return (
    <Block title="Yesterday's goals" link={{ label: "Details", onPress: openReview }}>
      <View style={styles.tiles}>
        {goals.map((g) => (
          <GoalTile key={g.goal.id} goal={g} />
        ))}
      </View>
    </Block>
  )
}

/* -------------------------------------------------------------- goals -- */

/** Each goal's icon (all in the primary colour) and name. */
const GOAL_LOOK: Record<ReviewGoalId, { Icon: React.ComponentType<{ size?: number; color?: string }>; name: string }> = {
  energy: { Icon: Flame, name: "Calorie deficit" },
  protein: { Icon: BowlFood, name: "Protein" },
  calcium: { Icon: Bone, name: "Calcium" },
  exercise: { Icon: PersonSimpleRun, name: "Exercise" },
  water: { Icon: Drop, name: "Water" },
}

const STATE_WORD = { met: "Met", close: "Close", under: "Short", none: "No log" } as const

/** The colours of a goal's progress bar and day bars: green when the day's
    goal is complete or very near (90% or more), red when it is incomplete; the day in view, still in progress, is blue in the bars.
    One red only: bars are drawn solid, never faded, so no second shade appears. */
const PROGRESS = { done: "#16A85A", short: "#E8504F", current: "#2A78D6" } as const

function progressColor(value: number | undefined, target: number) {
  const s = value === undefined || target <= 0 ? 0 : value / target
  return s >= 0.9 ? PROGRESS.done : PROGRESS.short
}

/** The member home's goal tile, approved by the user on 12 Oct 2026 ("I
    loved this element, keep it"): leave its look as it is. */
export function GoalTile({ goal }: { goal: GoalDay }) {
  const look = GOAL_LOOK[goal.goal.id]
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
          <View style={[styles.icon, { backgroundColor: color.primarySoft }]}>
            <look.Icon size={16} color={color.primary} />
          </View>
          <Text style={[styles.stateWord, { color: stateInk }]}>{STATE_WORD[goal.state]}</Text>
        </View>
        <Text style={type.label}>{look.name}</Text>
        <Text style={styles.value} numberOfLines={1}>
          {goal.value === undefined ? "No log" : formatNumber(goal.value)}
          {goal.value !== undefined && <Text style={type.unit}>{` / ${formatNumber(goal.goal.target)} ${unit}`}</Text>}
        </Text>
        <View style={[styles.bar, { backgroundColor: chart.track }]}>
          <View style={[styles.barFill, { width: `${share * 100}%`, backgroundColor: tone }]} />
        </View>
        <View style={styles.micro}>
          {goal.week.map((w, i) => (
            <View
              key={i}
              style={[
                styles.microBar,
                {
                  height: w.value !== undefined ? Math.max(3, (28 * w.value) / max) : 3,
                  backgroundColor: w.value === undefined ? chart.track : w.selected ? PROGRESS.current : progressColor(w.value, goal.goal.target),
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

const styles = StyleSheet.create({
  page: { gap: space.section, paddingBottom: space.section },
  fill: { flex: 1 },
  pressed: { opacity: 0.7 },

  // Today's to-do: a heading with its count, then one card per task, a done
  // one tinted teal with its check filled.
  // One card holds the heading, the count, the bar and every task; the
  // tasks are rows in it, a hairline between each.
  todo: { gap: space.item, padding: space.card, borderRadius: 12, backgroundColor: card.fill, boxShadow: card.shadow },
  todoHead: { flexDirection: "row", alignItems: "flex-start", gap: space.item },
  todoTitle: { ...type.sectionLabel },
  todoSub: { ...type.label, marginTop: 2 },
  todoCount: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: color.primarySoft, borderWidth: 1, borderColor: color.primaryEdge },
  todoCountText: { ...type.metaStrong, color: ink.strong },
  list: {},
  task: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lead,
    paddingVertical: space.item,
    borderTopWidth: 1,
    borderTopColor: hairline.rule,
  },
  taskTile: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },
  // Done: the disabled look, the card and its words faded, the tile grey.
  taskDone: { opacity: 0.6 },
  taskTileDone: { backgroundColor: hairline.edge },
  taskTitle: { ...type.title, color: ink.strong },
  taskTitleDone: { color: ink.tertiary },
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
  micro: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 28 },
  microBar: { flex: 1, borderRadius: 3 },

  bleed: { marginHorizontal: -space.gutter },
  strip: { gap: space.item, paddingHorizontal: space.gutter },
  trend: { width: 168 },
})
