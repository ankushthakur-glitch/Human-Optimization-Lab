import { router, useFocusEffect } from "expo-router"
import * as React from "react"
import { Image, Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import { BiologicalAgeSheet } from "@/components/biological-age-sheet"
import { CheckInSheet, type CheckInKind } from "@/components/check-in-sheet"
import { EnergyBalance } from "@/components/energy-balance"
import { Upcoming } from "@/components/home-free"
import { HomeHeader, StatusBanner } from "@/components/home-header"
import {
  ArrowDownRight,
  Barbell,
  CaretRight,
  Check,
  Play,
  Scales,
  Sparkle,
} from "@/components/ph"
import { Block, Card, Heading, HUE, Rise, Tag } from "@/components/record-kit"
import { TONE_INK, TopicTile } from "@/components/topic-kit"
import { TabScreen, openTab } from "@/components/tab-bar"
import { biologicalAge } from "@/lib/biological-age"
import { reviewDay } from "@/lib/daily-review"
import {
  MEAL_SLOTS,
  MEMBER,
  WALK,
  dayFrom,
  daysBetween,
  dayOfAt,
  mealsOn,
  mealName,
  profileOf,
  progress,
  today,
  totalsOf,
  type Meal,
  type MealSlot,
} from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { TOPICS, doneCount, rowOf, type Topic } from "@/lib/topics"
import { chart, color, hairline, ink, space, type } from "@/lib/theme"
import { formatNumber } from "@/lib/trends"

/* A paid member's Home, the Paid Patient Dashboard (22 Oct 2026), top to
   bottom as the client approved it:
   1. the pinned header: her photo, the greeting and "Day 8 of your plan",
      the bell;
   2. Today's goals: the ring of goals done, then the next three of the
      plan's six topics still to do, See more opening Plan's Today;
   3. Today's workout: the session and Start workout;
   4. Today's meals: the plan first, what she has logged and what is still
      planned (client slide 38, "Home, scrolled down");
   5. Log a meal: one box, four ways in, so nothing has to be typed;
   6. Your progress: weight and biological age side by side, each opening
      its page in Plan;
   7. Energy balance: energy out, food in and the deficit for the last
      finished day, then the past seven days, Details opening Plan;
   8. Upcoming: the next appointment or test, See all opening To do. */

const WORKOUT_PHOTO = require("../../assets/images/exercise-demo.jpg")

export function OptimizedHome() {
  const onboarding = useOnboarding()
  const [sheet, setSheet] = React.useState<CheckInKind>()
  const [age, setAge] = React.useState(false)
  // The goals read the clock (what is on track, what is next), so they are
  // redone on every pull down and every time the home comes back into view.
  const [, setTick] = React.useState(0)
  const refresh = React.useCallback(() => setTick((n) => n + 1), [])
  useFocusEffect(refresh)

  const now = new Date()
  const t = today(onboarding, now)
  const yesterday = reviewDay(onboarding, 1, now)
  const started = dayOfAt(onboarding.membership?.approvedAt ?? onboarding.membership?.startedAt ?? MEMBER.start)
  const planDay = Math.max(1, daysBetween(dayFrom(started), now) + 1)

  return (
    <TabScreen
      tab="home"
      onRefresh={refresh}
      header={<HomeHeader line={`Day ${planDay} of your plan`} />}
      overlay={
        (sheet && <CheckInSheet kind={sheet} onClose={() => setSheet(undefined)} />) ||
        (age && (
          <BiologicalAgeSheet
            onStart={() => {
              setAge(false)
              openTab("/plan", "home")
            }}
            onClose={() => setAge(false)}
          />
        ))
      }
    >
      <View style={styles.page}>
        <StatusBanner variant="member" tab="home" />
        <Rise at={2} id="home:goals">
          <TodaysGoals />
        </Rise>
        {yesterday.energy && (
          <Rise at={3} id="home:energy">
            <EnergyBalance day={yesterday} onDetails={() => openTab("/plan", "home")} />
          </Rise>
        )}
        <Rise at={4} id="home:workout">
          <TodaysWorkout t={t} onWalk={() => setSheet("walk")} />
        </Rise>
        <Rise at={4} id="home:meals">
          <TodaysMeals t={t} />
        </Rise>
        <Rise at={5} id="home:progress">
          <YourProgress onAge={() => setAge(true)} />
        </Rise>
        <Upcoming at={5} />
      </View>
    </TabScreen>
  )
}

type TodayPlan = ReturnType<typeof today>
type Store = ReturnType<typeof useOnboarding>

/* ------------------------------------------------------- today's goals -- */

/** The next three of the plan's six topics, the same rows as Plan's Today:
    each with its programme chip, today's target and where she stands. The
    ones still to do come first; See more opens Plan's Today with all six.
    Tapping a row opens that topic. */
function TodaysGoals() {
  const s = useOnboarding()
  const done = doneCount(s)
  const left = TOPICS.length - done
  const upcoming = [...TOPICS.filter((t) => !rowOf(s, t).done), ...TOPICS.filter((t) => rowOf(s, t).done)].slice(0, 3)
  return (
    <Card style={styles.goals}>
      <View style={styles.goalsHead}>
        <View>
          <Ring percent={(done / TOPICS.length) * 100} size={44} stroke={4} label={`${done}/${TOPICS.length}`} />
        </View>
        <View style={styles.fill}>
          <Text style={styles.goalsTitle} accessibilityRole="header">
            Today's goals
          </Text>
          <Text style={type.label}>{`${done} done, ${left} to go`}</Text>
        </View>
      </View>
      {upcoming.map((topic) => (
        <GoalLine key={topic.id} topic={topic} />
      ))}
      <View style={styles.goalsMore}>
        <Pressable
          onPress={() => router.push({ pathname: "/plan", params: { section: "today" } })}
          accessibilityRole="link"
          hitSlop={8}
          style={({ pressed }) => [styles.goalsMoreLink, pressed && styles.pressed]}
        >
          <Text style={type.seeAll}>See more</Text>
          <CaretRight size={12} color={color.primaryText} />
        </Pressable>
      </View>
    </Card>
  )
}

function GoalLine({ topic }: { topic: Topic }) {
  const row = rowOf(useOnboarding(), topic)
  const name = topic.id === "medication" ? "Medication" : topic.name
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/topic/[id]", params: { id: topic.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${topic.target}. ${row.text}, ${row.note}`}
      style={({ pressed }) => [styles.goal, pressed && styles.pressed]}
    >
      <TopicTile topic={topic} size={32} />
      <View style={[styles.fill, styles.goalBody]}>
        <View style={styles.goalTop}>
          <View style={styles.goalName}>
            <Text style={type.title}>{name}</Text>
            <Tag tone={CHIP[topic.tagTone]}>{topic.tag}</Tag>
          </View>
          <View style={styles.goalFigure}>
            {row.done && row.tone === "good" && <Check size={12} weight="bold" color={ink.good} />}
            <Text style={[type.value, { color: TONE_INK[row.tone] }]}>{row.text}</Text>
          </View>
        </View>
        <Text style={type.label}>{topic.target}</Text>
        <Text style={type.meta}>{row.note}</Text>
      </View>
    </Pressable>
  )
}

const CHIP: Record<Topic["tagTone"], "high" | "soon" | "ok" | "muted"> = { red: "high", amber: "soon", green: "ok", grey: "muted" }

/* ------------------------------------------------------ today's workout -- */

function TodaysWorkout({ t, onWalk }: { t: TodayPlan; onWalk: () => void }) {
  const session = t.session
  const strength = t.actions.find((a) => a.id === "strength")
  const walk = t.actions.find((a) => a.id === "walk")
  const done = strength?.status === "done"
  const title = session ? (session.id === "balance-a" ? session.title : `${session.title}, ${session.focus.toLowerCase()}`) : "Rest day, an easy walk"
  const meta = session ? `${session.minutes + WALK.minutes} minutes · ${strength?.time}` : `${WALK.minutes} minutes · ${walk?.time ?? ""}`
  return (
    <Block title="Today's workout" link={{ label: "Full plan", onPress: () => router.push({ pathname: "/topic/[id]", params: { id: "exercise" } }) }}>
      <Card style={styles.workout}>
        <View style={styles.workoutTop}>
          <Image source={WORKOUT_PHOTO} style={styles.photo} accessibilityIgnoresInvertColors accessibilityLabel="" />
          <View style={styles.fill}>
            <Text style={type.title}>{title}</Text>
            <Text style={type.label}>{meta}</Text>
            <Text style={[type.meta, styles.workoutHint]}>
              {session ? "Do it as written, do part, or ask for an easier version" : "Walk after dinner, 20 minutes, brisk"}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={session ? () => router.push({ pathname: "/topic/[id]", params: { id: "exercise" } }) : onWalk}
          accessibilityRole="button"
          accessibilityLabel={session ? (done ? "View workout" : "Start workout") : "Log your walk"}
          style={({ pressed }) => [styles.start, pressed && styles.startPressed]}
        >
          {session ? <Play size={14} weight="fill" color={ink.onColor} /> : <Barbell size={16} color={ink.onColor} />}
          <Text style={styles.startText}>{session ? (done ? "View workout" : "Start workout") : "Log your walk"}</Text>
        </Pressable>
      </Card>
    </Block>
  )
}

/* -------------------------------------------------------- today's meals -- */

/** Which of the plan's ideas stands for each meal still to log. */
const PLANNED: Partial<Record<MealSlot, number>> = { breakfast: 2, lunch: 0, dinner: 1 }

/** The plan's idea for a meal: its name, and "34 g protein, 11 g fiber,
    420 kcal" read back as the card's facts. */
function plannedMeal(slot: MealSlot, ideas: readonly { name: string; line: string }[]) {
  const idea = ideas[PLANNED[slot] ?? 0] ?? ideas[0]
  const kcal = idea.line.match(/(\d+) kcal/)?.[1]
  const protein = idea.line.match(/(\d+) g protein/)?.[1]
  return { name: idea.name, facts: [kcal && `${kcal} kcal`, protein && `${protein} g protein`].filter(Boolean).join(" · ") }
}

function TodaysMeals({ t }: { t: TodayPlan }) {
  const onboarding = useOnboarding()
  const logged = mealsOn(onboarding, t.day)
  const ideas = profileOf(onboarding).diet.ideas
  // The plan first (client slide 38): breakfast, lunch and dinner always show,
  // logged with what she ate, or planned with the plan's idea. A snack she
  // logged sits among them, in the day's order.
  const slots = MEAL_SLOTS.filter((m) => m.main || logged.some((l) => l.slot === m.id))
  return (
    <Card style={styles.logBox}>
      <Heading title="Today's meals" variant="title" link={{ label: "Log a meal", onPress: () => router.push({ pathname: "/topic/[id]", params: { id: "eat" } }) }} />
      <View style={styles.meals}>
        {slots.map((m) => {
          const meal = logged.find((l) => l.slot === m.id)
          return meal ? <MealCard key={m.id} meal={meal} /> : <PlannedCard key={m.id} slot={m.id} idea={plannedMeal(m.id, ideas)} />
        })}
      </View>
    </Card>
  )
}

function PlannedCard({ slot, idea }: { slot: MealSlot; idea: { name: string; facts: string } }) {
  const name = MEAL_SLOTS.find((m) => m.id === slot)?.name ?? "Meal"
  return (
    <Card
      style={styles.mealCard}
      onPress={() => router.push({ pathname: "/topic/[id]", params: { id: "eat", slot } })}
      accessibilityLabel={`${name}, ${idea.name}, ${idea.facts}, logged. Log it`}
    >
      <View style={styles.fill}>
        <Text style={styles.slot}>{name}</Text>
        <Text style={type.title}>{idea.name}</Text>
        {!!idea.facts && <Text style={type.label}>{idea.facts}</Text>}
      </View>
      <View style={styles.planned}>
        <Text style={styles.plannedText}>Logged</Text>
      </View>
    </Card>
  )
}

function MealCard({ meal }: { meal: Meal }) {
  const totals = totalsOf([meal])
  const facts = [
    totals.calories && `${formatNumber(Math.round(totals.calories.value))} kcal`,
    totals.protein && `${formatNumber(Math.round(totals.protein.value))} g protein`,
  ]
    .filter(Boolean)
    .join(" · ")
  const slot = MEAL_SLOTS.find((m) => m.id === meal.slot)?.name ?? "Meal"
  return (
    <Card style={styles.mealCard} accessibilityLabel={`${slot}, ${mealName(meal)}, ${facts}, logged`}>
      <View style={styles.fill}>
        <Text style={styles.slot}>{slot}</Text>
        <Text style={type.title}>{mealName(meal)}</Text>
        {!!facts && <Text style={type.label}>{facts}</Text>}
      </View>
      <View style={styles.logged}>
        <Check size={10} weight="bold" color={ink.good} />
        <Text style={styles.loggedText}>Logged</Text>
      </View>
    </Card>
  )
}

/* -------------------------------------------------------- your progress -- */

/** Weight and biological age as a glance, side by side. Each opens its page:
    the weight on Progress in Plan, the biological age on its own sheet,
    whose button leads on into Plan. */
function YourProgress({ onAge }: { onAge: () => void }) {
  const onboarding = useOnboarding()
  const p = progress(onboarding)
  const age = biologicalAge()
  const lost = Math.abs(p.weight.change)
  return (
    <Block title="Your progress" link={{ label: "Plan", onPress: () => openTab("/plan", "home") }}>
      <View style={styles.tiles}>
        <Pressable
          onPress={() => router.push("/progress")}
          accessibilityRole="button"
          accessibilityLabel={`Weight ${formatNumber(p.weight.now, 1)} pounds, ${p.weight.change <= 0 ? "down" : "up"} ${formatNumber(lost, 1)} pounds since day 1. Opens your progress`}
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        >
          <View style={styles.tileHead}>
            <View style={[styles.tileIcon, { backgroundColor: color.blueTint }]}>
              <Scales size={16} color={color.blue} />
            </View>
            <View style={styles.fill}>
              <Text style={type.label}>Weight</Text>
              <Text style={styles.tileValue}>
                {formatNumber(p.weight.now, 1)}
                <Text style={type.unit}> lb</Text>
              </Text>
            </View>
          </View>
          <View style={styles.tileNote}>
            {p.weight.change <= 0 && <ArrowDownRight size={12} weight="bold" color={ink.good} />}
            <Text style={[type.label, { color: ink.good }]}>{`${formatNumber(lost, 1)} lb since day 1`}</Text>
          </View>
        </Pressable>
        <Pressable
          onPress={onAge}
          accessibilityRole="button"
          accessibilityLabel={`Biological age ${age.biological}. Retest in January. Opens what is driving it`}
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        >
          <View style={styles.tileHead}>
            <View style={[styles.tileIcon, { backgroundColor: color.violetTint }]}>
              <Sparkle size={16} color={color.violet} />
            </View>
            <View style={styles.fill}>
              <Text style={type.label}>Biological age</Text>
              <Text style={styles.tileValue}>{age.biological}</Text>
            </View>
          </View>
          <Text style={type.label}>Retest in January</Text>
        </Pressable>
      </View>
    </Block>
  )
}

/* --------------------------------------------------------------- ring -- */

/** A small progress ring in the chart kit's data teal, a number inside it
    when given a label. */
function Ring({ percent, size, stroke, label }: { percent: number; size: number; stroke: number; label?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={label ? `${label} goals done` : undefined}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={chart.dataTrack} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={chart.data}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(Math.max(0, Math.min(percent, 100)) / 100) * c} ${c}`}
          fill="none"
        />
      </Svg>
      {!!label && (
        <View style={styles.ringLabel}>
          <Text style={styles.ringText}>{label}</Text>
        </View>
      )}
    </View>
  )
}

/* ------------------------------------------------------------- styles -- */

const styles = StyleSheet.create({
  page: { gap: space.section, paddingBottom: space.section },
  fill: { flex: 1, minWidth: 0, gap: space.line },
  pressed: { opacity: 0.7 },

  goals: { gap: 0 },
  goalsHead: { flexDirection: "row", alignItems: "center", gap: space.item, paddingBottom: space.inline },
  goalsTitle: { ...type.sectionLabel },
  goal: { flexDirection: "row", alignItems: "flex-start", gap: space.lead, paddingVertical: space.rowY, borderTopWidth: 1, borderTopColor: "#F2F2F7" },
  goalBody: { gap: 4 },
  goalsMore: { alignItems: "center", paddingTop: space.rowY, borderTopWidth: 1, borderTopColor: "#F2F2F7" },
  goalsMoreLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  goalTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.item },
  goalName: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.inline },
  goalFigure: { flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 0 },

  ringLabel: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  ringText: { ...type.metaStrong, color: ink.strong, fontVariant: ["tabular-nums"] },

  workout: { gap: space.item },
  workoutTop: { flexDirection: "row", alignItems: "flex-start", gap: space.lead },
  photo: { width: 64, height: 64, borderRadius: 8, backgroundColor: color.primarySoft },
  workoutHint: { marginTop: space.stack },
  start: {
    height: 48,
    borderRadius: 999,
    backgroundColor: color.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.inline,
  },
  startPressed: { backgroundColor: color.primaryPressed },
  startText: { ...type.title, color: ink.onColor },

  meals: { gap: space.item },
  mealCard: { flexDirection: "row", alignItems: "center", gap: space.item },
  slot: { ...type.caption, color: ink.tertiary },
  logged: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.stack,
    paddingHorizontal: space.inline,
    paddingVertical: space.line,
    borderRadius: 999,
    backgroundColor: color.okTint,
  },
  loggedText: { ...type.tag, color: ink.good },
  planned: {
    paddingHorizontal: space.inline,
    paddingVertical: space.line,
    borderRadius: 999,
    backgroundColor: color.primarySoft,
  },
  plannedText: { ...type.tag, color: color.primaryText },
  logBox: { gap: space.item },

  tiles: { flexDirection: "row", gap: space.item },
  tile: {
    flex: 1,
    gap: space.inline,
    padding: space.item,
    borderRadius: 8,
    backgroundColor: color.background,
    borderWidth: 1,
    borderColor: hairline.edge,
  },
  tileHead: { flexDirection: "row", alignItems: "center", gap: space.inline },
  tileIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  tileValue: { ...type.section, fontSize: 19, lineHeight: 24, fontVariant: ["tabular-nums"] },
  tileNote: { flexDirection: "row", alignItems: "center", gap: space.stack },
})
