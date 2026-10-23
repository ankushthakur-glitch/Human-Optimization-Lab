import { router, useFocusEffect } from "expo-router"
import * as React from "react"
import { Image, Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import { BiologicalAgeSheet } from "@/components/biological-age-sheet"
import { CheckInSheet, type CheckInKind } from "@/components/check-in-sheet"
import { EnergyBalance } from "@/components/energy-balance"
import { Trends, Upcoming } from "@/components/home-free"
import { HomeHeader, StatusBanner } from "@/components/home-header"
import {
  ArrowDownRight,
  Barbell,
  BowlFood,
  Brain,
  CaretRight,
  Check,
  Flame,
  Moon,
  PersonSimpleRun,
  Play,
  Scales,
  Sparkle,
} from "@/components/ph"
import { Block, Card, Heading, HUE, Rise } from "@/components/record-kit"
import { TabScreen, openTab } from "@/components/tab-bar"
import { biologicalAge } from "@/lib/biological-age"
import { reviewDay, type ReviewDay } from "@/lib/daily-review"
import {
  LIGHTS_OUT,
  MEAL_SLOTS,
  MEMBER,
  SMART_TODAY,
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
import { chart, color, hairline, ink, space, type } from "@/lib/theme"
import { formatNumber } from "@/lib/trends"

/* A paid member's Home, the Paid Patient Dashboard (22 Oct 2026), top to
   bottom as the client approved it:
   1. the pinned header: her photo, the greeting and "Day 8 of your plan",
      the bell;
   2. yesterday's strip: how many of yesterday's goals she met, and Review
      in Plan;
   3. Today's goals: the ring of goals done, then calories, protein,
      exercise, the SMART session and lights out, each updating as she logs;
   4. Today's workout: the session and Start workout;
   5. Today's meals: the plan first, what she has logged and what is still
      planned (client slide 38, "Home, scrolled down");
   6. Log a meal: one box, four ways in, so nothing has to be typed;
   7. Your progress: weight and biological age side by side, each opening
      its page in Plan;
   8. Energy balance: energy out, food in and the deficit for the last
      finished day, then the past seven days, Details opening Plan;
   9. Your trends: the free home's sparkline tiles, See all opening Results;
   10. Upcoming: the next appointment or test, See all opening To do. */

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
        <Rise at={1} id="home:yesterday">
          <YesterdayStrip day={yesterday} />
        </Rise>
        <Rise at={2} id="home:goals">
          <TodaysGoals t={t} yesterday={yesterday} now={now} />
        </Rise>
        {yesterday.energy && (
          <Rise at={3} id="home:energy">
            <EnergyBalance day={yesterday} onDetails={() => openTab("/plan", "home")} />
          </Rise>
        )}
        <Trends />
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

/* ----------------------------------------------------- yesterday's strip -- */

function YesterdayStrip({ day }: { day: ReviewDay }) {
  const scored = day.status === "complete"
  const words = scored ? `${day.met} of ${day.total} goals met` : "Not every meal was logged"
  return (
    <View style={styles.strip}>
      <Ring percent={scored ? (day.met / day.total) * 100 : 0} size={28} stroke={4} />
      <Text style={styles.stripText} numberOfLines={1}>
        <Text style={styles.stripLead}>Yesterday: </Text>
        <Text style={styles.stripWords}>{words}</Text>
      </Text>
      <Pressable
        onPress={() => openTab("/plan", "home")}
        accessibilityRole="link"
        hitSlop={8}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}
      >
        <Text style={styles.linkText}>Review in Plan</Text>
        <CaretRight size={12} color={color.primary} />
      </Pressable>
    </View>
  )
}

/* ------------------------------------------------------- today's goals -- */

type Standing = "done" | "track" | "open"

type GoalRow = {
  id: string
  name: string
  icon: React.ReactNode
  tint: string
  hue: string
  value?: string
  unit?: string
  /** 0 to 1; no bar when undefined. */
  share?: number
  note: string
  standing: Standing
  /** Shown instead of the value, e.g. "Done". */
  word?: string
}

/** The share of the waking day gone (7 AM to 9 PM), how far along a
    nutrient should be right now to be on track. */
const dayShare = (now: Date) => Math.max(0, Math.min((now.getHours() + now.getMinutes() / 60 - 7) / 14, 1))

function goalRows(s: Store, t: TodayPlan, yesterday: ReviewDay, now: Date): GoalRow[] {
  const profile = profileOf(s)
  const totals = totalsOf(mealsOn(s, t.day))
  const calGoal = profile.goals.find((g) => g.id === "calories")
  const proGoal = profile.goals.find((g) => g.id === "protein")
  const exGoal = yesterday.goals.find((g) => g.goal.id === "exercise")?.goal
  const pace = dayShare(now)
  const rows: GoalRow[] = []

  if (calGoal) {
    const eaten = Math.round(totals.calories?.value ?? 0)
    const over = eaten > calGoal.target
    rows.push({
      id: "calories",
      name: "Calories",
      icon: <Flame size={18} color={color.blue} />,
      tint: color.blueTint,
      hue: color.blue,
      value: formatNumber(eaten),
      unit: ` / ${formatNumber(calGoal.target)} kcal`,
      share: Math.min(eaten / calGoal.target, 1),
      note: over
        ? `${formatNumber(eaten - calGoal.target)} kcal over today's limit`
        : profile.energy
          ? "On track for a 300 kcal deficit"
          : `${formatNumber(calGoal.target - eaten)} kcal left today`,
      standing: over ? "open" : "track",
    })
  }

  if (proGoal) {
    const had = Math.round(totals.protein?.value ?? 0)
    const left = proGoal.target - had
    const met = left <= 0
    rows.push({
      id: "protein",
      name: "Protein",
      icon: <BowlFood size={18} color={color.amber} />,
      tint: color.amberTint,
      hue: color.amber,
      value: formatNumber(had),
      unit: ` / ${formatNumber(proGoal.target)} g`,
      share: Math.min(had / proGoal.target, 1),
      note: met ? "Goal reached" : `${formatNumber(left)} g to go`,
      standing: met ? "done" : had >= proGoal.target * pace * 0.8 ? "track" : "open",
    })
  }

  // Exercise counts the session and the walk once each is done today.
  const session = t.session
  const strength = t.actions.find((a) => a.id === "strength")
  const walk = t.actions.find((a) => a.id === "walk")
  const minutes =
    (strength?.status === "done" && session ? session.minutes : 0) + (walk?.status === "done" ? WALK.minutes : 0)
  const exTarget = exGoal?.target ?? 45
  rows.push({
    id: "exercise",
    name: "Exercise",
    icon: <PersonSimpleRun size={18} color={color.primary} />,
    tint: color.primarySoft,
    hue: chart.data,
    value: formatNumber(minutes),
    unit: ` / ${formatNumber(exTarget)} min`,
    share: Math.min(minutes / exTarget, 1),
    note: minutes >= exTarget ? "Goal reached" : strength ? `Workout planned for ${strength.time}` : `Walk planned for ${walk?.time ?? "this evening"}`,
    standing: minutes >= exTarget ? "done" : "open",
  })

  rows.push({
    id: "smart",
    name: "SMART session",
    icon: <Brain size={18} color={color.primary} />,
    tint: color.primarySoft,
    hue: chart.data,
    share: SMART_TODAY.done ? 1 : 0,
    word: SMART_TODAY.done ? "Done" : "To do",
    note: `Session ${SMART_TODAY.session} · ${SMART_TODAY.minutes} minutes`,
    standing: SMART_TODAY.done ? "done" : "open",
  })

  const late = now.getHours() * 60 + now.getMinutes() > LIGHTS_OUT.hour * 60 + LIGHTS_OUT.minute
  rows.push({
    id: "lights",
    name: "Lights out",
    icon: <Moon size={18} color={color.violet} />,
    tint: color.violetTint,
    hue: color.violet,
    value: LIGHTS_OUT.by,
    unit: undefined,
    note: "Tonight",
    standing: late ? "open" : "track",
  })
  return rows
}

function TodaysGoals({ t, yesterday, now }: { t: TodayPlan; yesterday: ReviewDay; now: Date }) {
  const rows = goalRows(useOnboarding(), t, yesterday, now)
  const done = rows.filter((r) => r.standing === "done").length
  const track = rows.filter((r) => r.standing === "track").length
  return (
    <Card style={styles.goals}>
      <View style={styles.goalsHead}>
        <View>
          <Ring percent={(done / rows.length) * 100} size={44} stroke={4} label={`${done}/${rows.length}`} />
        </View>
        <View style={styles.fill}>
          <Text style={styles.goalsTitle} accessibilityRole="header">
            Today's goals
          </Text>
          <Text style={type.label}>{`${done} done, ${track} on track · updates as you log`}</Text>
        </View>
      </View>
      {rows.map((r) => (
        <GoalLine key={r.id} row={r} />
      ))}
    </Card>
  )
}

function GoalLine({ row }: { row: GoalRow }) {
  return (
    <View
      style={styles.goal}
      accessible
      accessibilityLabel={[row.name, row.word ?? `${row.value ?? ""}${row.unit ?? ""}`, row.note].join(", ")}
    >
      <View style={[styles.goalTile, { backgroundColor: row.tint }]}>{row.icon}</View>
      <View style={styles.fill}>
        <View style={styles.goalTop}>
          <Text style={type.title}>{row.name}</Text>
          {row.word ? (
            <Text style={styles.goalWord}>{row.word}</Text>
          ) : (
            <Text style={type.value}>
              {row.unit === undefined && <Text style={type.unit}>{"by "}</Text>}
              {row.value}
              {!!row.unit && <Text style={type.unit}>{row.unit}</Text>}
            </Text>
          )}
        </View>
        {row.share !== undefined && (
          <View style={[styles.bar, { backgroundColor: row.hue === chart.data ? chart.dataTrack : chart.track }]}>
            <View style={[styles.barFill, { width: `${row.share * 100}%`, backgroundColor: row.hue }]} />
          </View>
        )}
        <Text style={type.label}>{row.note}</Text>
      </View>
    </View>
  )
}

/* ------------------------------------------------------ today's workout -- */

function TodaysWorkout({ t, onWalk }: { t: TodayPlan; onWalk: () => void }) {
  const session = t.session
  const strength = t.actions.find((a) => a.id === "strength")
  const walk = t.actions.find((a) => a.id === "walk")
  const done = strength?.status === "done"
  const title = session ? (session.id === "balance-a" ? session.title : `${session.title}, ${session.focus.toLowerCase()}`) : "Rest day, an easy walk"
  const meta = session ? `${session.minutes + WALK.minutes} minutes · ${strength?.time}` : `${WALK.minutes} minutes · ${walk?.time ?? ""}`
  return (
    <Block title="Today's workout" link={{ label: "Full plan", onPress: () => openTab("/plan", "home") }}>
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
          onPress={session ? () => router.push("/exercise") : onWalk}
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
      <Heading title="Today's meals" variant="title" link={{ label: "Log a meal", onPress: () => router.push("/log-meal") }} />
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
      onPress={() => router.push({ pathname: "/log-meal", params: { slot } })}
      accessibilityLabel={`${name}, ${idea.name}, ${idea.facts}, logged. Log it`}
    >
      <View style={styles.fill}>
        <Text style={styles.slot}>{name.toUpperCase()}</Text>
        <Text style={type.title}>{idea.name}</Text>
        {!!idea.facts && <Text style={type.label}>{idea.facts}</Text>}
      </View>
      <View style={styles.planned}>
        <Text style={styles.plannedText}>LOGGED</Text>
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
        <Text style={styles.slot}>{slot.toUpperCase()}</Text>
        <Text style={type.title}>{mealName(meal)}</Text>
        {!!facts && <Text style={type.label}>{facts}</Text>}
      </View>
      <View style={styles.logged}>
        <Check size={10} weight="bold" color={ink.good} />
        <Text style={styles.loggedText}>LOGGED</Text>
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

  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    padding: space.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.primaryEdge,
    backgroundColor: color.primarySoft,
  },
  stripText: { ...type.label, flex: 1 },
  stripLead: { ...type.title, fontSize: 13, lineHeight: 18, color: ink.strong },
  stripWords: { ...type.label, color: color.primaryText },
  link: { flexDirection: "row", alignItems: "center", gap: space.line },
  linkText: { ...type.seeAll },

  goals: { gap: 0 },
  goalsHead: { flexDirection: "row", alignItems: "center", gap: space.item, paddingBottom: space.inline },
  goalsTitle: { ...type.sectionLabel },
  goal: { flexDirection: "row", alignItems: "flex-start", gap: space.lead, paddingVertical: space.rowY, borderTopWidth: 1, borderTopColor: "#F2F2F7" },
  goalTile: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  goalTop: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.item },
  goalWord: { ...type.metaStrong, color: ink.good },
  bar: { height: 6, borderRadius: 3, overflow: "hidden", marginVertical: space.stack },
  barFill: { height: 6, borderRadius: 3 },

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
  slot: { ...type.caption, color: ink.tertiary, letterSpacing: 0.6 },
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
