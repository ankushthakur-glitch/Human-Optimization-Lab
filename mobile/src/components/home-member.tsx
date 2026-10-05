import { router, type Href } from "expo-router"
import * as React from "react"
import { Animated, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native"

import { Art } from "@/components/art"
import { CountUp, GoalRows, ProgressChart, ScoreRing, WeekBars } from "@/components/charts"
import { CheckInSheet, type CheckInKind } from "@/components/check-in-sheet"
import { RecordSections } from "@/components/home-free"
import { HomeHeader, StatusBanner } from "@/components/home-header"
import { RecordGlyph, SparkleGlyph, dotted } from "@/components/home-parts"
import { Barbell, BowlFood, Camera, Clock, Heartbeat, PersonSimpleWalk, Scales } from "@/components/ph"
import {
  Block,
  Card,
  Chip,
  ChipRow,
  Group,
  NeedsRow,
  PlanLine,
  ProgressBar,
  Rise,
  SmallAction,
  StatRow,
  StatTile,
  Tag,
  TextAction,
  TickCircle,
  toast,
} from "@/components/record-kit"
import { TabScreen, openTab } from "@/components/tab-bar"
import { useExperience, useMarkers } from "@/lib/experience"
import {
  CHECK_IN,
  DEXA_SCANS,
  NEXT_BONE_SCAN,
  STANDS_GOAL,
  WALK,
  addDays,
  adherence,
  clockOf,
  datedOf,
  dateOfAt,
  dayFrom,
  dayLabel,
  dayOfAt,
  dayScore,
  daysBetween,
  fatLost,
  goalRowsOf,
  localDay,
  milestones,
  profileOf,
  progress,
  progressChartOf,
  scoreHistory,
  slotAt,
  today,
  weekBarsOf,
  weekCheckIn,
  weekdayOf,
  yesterday,
  type MealSlot,
  type TodayAction,
} from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { livePlan } from "@/lib/plans"
import { SETUP, nextSetup } from "@/lib/program"
import { color, hairline, ink, space, type } from "@/lib/theme"
import { opensPage, orderHref, weekItems, yourMedicines } from "@/lib/todo"
import { trendCounts } from "@/lib/trends"
import { keepEnd } from "@/lib/words"

/* Home for an Optimization member (FINAL-SPEC C.2): Ed's three layers on
   one screen. First what is immediate: the plan line that shows Dr. Patel
   approved this version, the Today hero with its three doors (Exercise,
   Diet plan, Log a meal) and the rest of today in time order, Yesterday as
   facts with one fix, never a grade, and what is booked this week. Then
   progress since she started, from where she began. Her history, results
   and medicines sit one tap away under Your record, never on this screen.
   The weekly card joins on Friday to Tuesday until she answers it.

   The same screen draws a member who has not finished setting up, and one
   whose first plan is with Dr. Patel (C.2.9): a hero for that stage, then
   the record sections from the free home with Needs you as a white card,
   so the screen keeps one hero. Nothing on it sells. It draws its own tab
   screen, so the check in sheets pass over the tab bar. */

export function MemberHome() {
  const stage = useExperience().experience
  const [sheet, setSheet] = React.useState<CheckInKind>()

  return (
    <TabScreen tab="home" header={<HomeHeader />} overlay={sheet && <CheckInSheet kind={sheet} onClose={() => setSheet(undefined)} />}>
      {stage === "member-setup" ? <SetupStage /> : stage === "member-review" ? <ReviewStage /> : <LiveHome onCheckIn={setSheet} />}
    </TabScreen>
  )
}

/* ------------------------------------------------------------ motion -- */

/* ---------------------------------------------------------- live plan -- */

function LiveHome({ onCheckIn }: { onCheckIn: (kind: CheckInKind) => void }) {
  const onboarding = useOnboarding()
  const plan = livePlan(onboarding)
  return (
    <View style={styles.page}>
      <Rise at={0} id="member:today">
        <View style={styles.top}>
          {plan && <PlanLine version={plan.version} by={plan.by} on={plan.on} reviewing={plan.reviewing} onPress={() => openTab("/plan", "home")} />}
          <StatusBanner variant="member" tab="home" />
          <TodayHero onCheckIn={onCheckIn} />
        </View>
      </Rise>
      <Rise at={1} id="member:yesterday">
        <Yesterday />
      </Rise>
      <Rise at={2} id="member:week">
        <ThisWeek />
      </Rise>
      <Rise at={3} id="member:progress">
        <SinceYouStarted />
      </Rise>
      <YourWeek at={4} />
      <Rise at={5} id="member:record">
        <YourRecord />
      </Rise>
    </View>
  )
}

/* -------------------------------------------------------------- today -- */

const SLOT_WORD: Record<MealSlot, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" }

/** The meal still to log today that the plan names next, or none once
    every main meal is in. */
const nextMeal = (meal: TodayAction | undefined): MealSlot | undefined => (meal && meal.status !== "done" ? meal.slot : undefined)

/** Today's own reading of a kind (her weigh in, her blood pressure). */
function todayEntry(s: ReturnType<typeof useOnboarding>, kind: "weight" | "bp") {
  const day = localDay()
  return (s.entries ?? []).filter((e) => e.kind === kind && dayOfAt(e.at) === day).at(-1)
}

/** "Labs tomorrow at 7:30 AM" and what to do tonight, from the one line the
    plan keeps. */
function prepParts(prep: string): [string, string | undefined] {
  const at = prep.indexOf(": ")
  if (at < 0) return [prep, undefined]
  const rest = prep.slice(at + 2)
  return [prep.slice(0, at), rest.charAt(0).toUpperCase() + rest.slice(1)]
}

/** The icons on the hero's doors and rows: Phosphor, teal on their tiles
    (Figma "Hol"). */
const iconInk = color.primary

/** The widest word a door holds on one line at its value size, "Breakfast"
    or "2,000 kcal" (about 75 pt), and a door's padding around it (10 a
    side). */
const DOOR_WORD = 75
const DOOR_PADDING = 20

/** Whether the three doors fit side by side in a row this wide with every
    word whole on its line, at the phone's text size (a door's words grow
    with it, up to 1.3 times). StatRow sets the doors space.inline apart. */
const threeAcross = (width: number, fontScale: number) => (width - 2 * space.inline) / 3 >= DOOR_WORD * Math.min(fontScale, 1.3) + DOOR_PADDING

/** Two sentences on one line that break between them when they wrap: a
    short last sentence (four words at most, "Water is fine.", "Next week
    starts fresh.") is held together, so it never leaves a word alone on
    the second line, and a number keeps the word after it ("9:30 PM"). A
    longer last sentence keeps only its last two words together. */
const bySentence = (text: string) => {
  const at = text.lastIndexOf(". ")
  const last = text.slice(at + 2)
  if (at <= 0 || last.split(" ").length > 4) return keepEnd(text)
  return `${text.slice(0, at + 2).replace(/(\d) (?=\S)/g, "$1\u00A0")}${last.replace(/ /g, "\u00A0")}`
}

/** What she does today (C.2.3): how far along, the one focus from
    yesterday, Ed's three doors, and what is left in time order: the walk
    (a tick), the evening blood pressure and the Thursday weigh in (Add),
    and the night before fasting labs, what to do tonight. */
function TodayHero({ onCheckIn }: { onCheckIn: (kind: CheckInKind) => void }) {
  const onboarding = useOnboarding()
  const t = today(onboarding)
  const profile = profileOf(onboarding)
  const strength = t.actions.find((a) => a.id === "strength")
  const meal = t.actions.find((a) => a.id === "meal")
  const allMeals = meal?.status === "done"
  const slot = meal?.slot ?? slotAt()
  const calories = profile.goals.find((g) => g.id === "calories")
  const walk = onboarding.exercises?.[t.day]?.walk
  const rows = t.actions.filter((a) => a.id === "weigh" || a.id === "walk" || a.id === "bp")
  const [prepTitle, prepLine] = t.prep ? prepParts(t.prep) : []

  const toggleWalk = () => {
    const log = onboarding.exercises?.[t.day] ?? {}
    const { walk: _walk, ...rest } = log
    const next = walk ? rest : { ...log, walk: { at: new Date().toISOString(), minutes: WALK.minutes } }
    onboarding.save({ exercises: { ...onboarding.exercises, [t.day]: next } }).catch(() => {})
  }

  // Ed's three doors side by side while each keeps its words whole on one
  // line; on a narrower phone, or with larger text, Log a meal takes the
  // full width under the other two. The row is measured; until then, the
  // phone's width less the page's gutter.
  const screen = useWindowDimensions()
  const [doorRow, setDoorRow] = React.useState(() => screen.width - 2 * space.gutter)
  const across = threeAcross(doorRow, screen.fontScale)
  const doors = [
    <StatTile
      key="exercise"
      icon={<Barbell size={16} color={iconInk} />}
      value={t.session ? t.session.minutes : "Rest"}
      unit={t.session ? "min" : undefined}
      label="Exercise"
      done={strength?.status === "done"}
      onPress={() => router.push("/exercise")}
      accessibilityLabel={t.session ? `Exercise, ${t.session.minutes} minutes${strength?.status === "done" ? ", done" : ""}` : "Exercise, rest day"}
    />,
    <StatTile
      key="diet"
      icon={<BowlFood size={16} color={iconInk} />}
      value={calories?.target ?? 0}
      unit="kcal"
      label="Diet plan"
      onPress={() => router.push("/diet")}
      accessibilityLabel={`Diet plan, up to ${calories?.target ?? 0} kcal`}
    />,
    // The door keeps its name, as Exercise does when done: with every main
    // meal in, its value says "3 of 3" beside the check, and its label
    // stays on one line like the other two, so the three values keep one
    // line across the row.
    <StatTile
      key="meal"
      icon={<Camera size={16} color={iconInk} />}
      value={allMeals && meal?.progress ? `${meal.progress.done} of ${meal.progress.of}` : SLOT_WORD[slot]}
      label="Log a meal"
      done={allMeals}
      onPress={() => router.push(allMeals ? "/log-meal" : { pathname: "/log-meal", params: { slot } })}
      accessibilityLabel={allMeals ? "Log a meal, every meal logged" : `Log a meal, ${SLOT_WORD[slot].toLowerCase()}`}
    />,
  ]

  // The free home's language (user, 5 Oct 2026): a section label over
  // white cards on the page's ground, no teal panel.
  return (
    <Block
      title="Today"
      action={<CountUp value={t.done} format={(v) => `${Math.round(v)} of ${t.of} done`} style={styles.meta} playKey="member:today-done" />}
    >
      <Card style={styles.cardBody}>
        <ProgressBar done={Math.round(t.share * 100)} total={100} />
        <Text style={styles.body}>{t.focus}</Text>
      </Card>

      <View style={styles.doors} onLayout={(e) => setDoorRow(e.nativeEvent.layout.width)}>
        {across ? (
          <StatRow>{doors}</StatRow>
        ) : (
          <>
            <StatRow>{doors.slice(0, 2)}</StatRow>
            <StatRow>{doors[2]}</StatRow>
          </>
        )}
      </View>

      {(rows.length > 0 || !!prepTitle) && (
        <Group>
          {rows.map((a) => {
            if (a.id === "walk")
              return (
                <NeedsRow
                  key="walk"
                  icon={<PersonSimpleWalk size={16} color={iconInk} />}
                  title={a.title}
                  meta={walk ? `Done at ${clockOf(new Date(walk.at))}` : keepEnd(a.detail)}
                  right={<Tick done={!!walk} onPress={toggleWalk} label={a.title} />}
                  onPress={() => onCheckIn("walk")}
                  chevron={false}
                />
              )
            const kind = a.id === "bp" ? "bp" : "weight"
            const entry = todayEntry(onboarding, kind)
            const reading = entry && (kind === "bp" ? `${entry.value}/${entry.value2}` : `${entry.value.toFixed(1)} lb`)
            return (
              <NeedsRow
                key={a.id}
                icon={kind === "bp" ? <Heartbeat size={16} color={iconInk} /> : <Scales size={16} color={iconInk} />}
                title={a.title}
                meta={entry ? `${reading} at ${clockOf(new Date(entry.at))}` : keepEnd(a.detail)}
                right={entry ? <TickCircle done /> : <SmallAction onPress={() => onCheckIn(kind)} accessibilityLabel={`Add ${kind === "bp" ? "your blood pressure" : "your weight"}`}>Add</SmallAction>}
                onPress={() => onCheckIn(kind)}
                chevron={false}
              />
            )
          })}
          {!!prepTitle && (
            <NeedsRow
              icon={<Clock size={16} color={iconInk} />}
              title={prepTitle}
              meta={prepLine && bySentence(prepLine)}
              onPress={() => router.push(orderHref("labs-nov"))}
              chevron={false}
            />
          )}
        </Group>
      )}
    </Block>
  )
}

/** The walk's tick, the same ring as on Today's exercise: tap to mark it
    done (or take it back). The whole circle is the target, 44 pt with its
    slop. */
function Tick({ done, onPress, label }: { done: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <TickCircle done={done} />
    </Pressable>
  )
}

/* ---------------------------------------------------------- yesterday -- */

/** How yesterday went against the plan's goals (C.2.4): the day's share as
    a ring, the largest shortfall as a fact, the estimated energy balance
    for a weight plan, then every goal as a bar against its tick, positive
    or negative in two cues and never in red. A day with nothing logged
    shows no rows and no blame; a partial day shows its subtotals "so far",
    without a score or checks. The card opens the day. */
function Yesterday() {
  const onboarding = useOnboarding()
  const y = yesterday(onboarding)
  const profile = profileOf(onboarding)
  const complete = y.status === "complete" && y.percent !== undefined
  const none = y.status === "none"
  const missing = y.missing[0]
  const openDay = () => router.push({ pathname: "/day/[date]", params: { date: "yesterday" } })
  // After a day with nothing logged, the first meal still to log today.
  const todayNext = nextMeal(today(onboarding).actions.find((a) => a.id === "meal"))

  return (
    <Block title="Yesterday" meta={y.label}>
      <Card onPress={openDay} style={styles.cardBody}>
        <View style={styles.dayTop}>
          <ScoreRing percent={complete ? y.percent : undefined} size={96} stroke={10} label={none ? "No log" : "Partial"} playKey="member:yesterday" />
          <View style={styles.dayWords}>
            {complete && <Text style={styles.dayOf}>of your goals</Text>}
            <Text style={styles.dayCoach}>{y.coaching}</Text>
            {complete && profile.energy && !!y.energy && (
              <View style={styles.energy}>
                <Text style={styles.energyText}>{keepEnd(y.energy.words)}</Text>
                <Tag tone="muted">Estimated</Tag>
              </View>
            )}
            {none && !!todayNext && (
              <SmallAction onPress={() => router.push({ pathname: "/log-meal", params: { slot: todayNext } })} style={styles.dayAction}>
                {`Log today's ${SLOT_WORD[todayNext].toLowerCase()}`}
              </SmallAction>
            )}
            {!complete && !none && !!missing && (
              <SmallAction onPress={() => router.push({ pathname: "/log-meal", params: { slot: missing, day: "yesterday" } })} style={styles.dayAction}>
                {`Add ${SLOT_WORD[missing].toLowerCase()}`}
              </SmallAction>
            )}
          </View>
        </View>
        {!none && (
          <>
            <View style={styles.rule} />
            <GoalRows
              rows={goalRowsOf(y)}
              playKey="member:yesterday-goals"
              onRowPress={(row) => router.push({ pathname: "/day/[date]", params: { date: "yesterday", ...(row.id ? { nutrient: row.id } : {}) } })}
              rowHint="Opens yesterday with this goal"
            />
          </>
        )}
      </Card>
    </Block>
  )
}

/* ---------------------------------------------------------- this week -- */

/** Booked tests and visits in the next seven days, then at most one thing
    that needs her (C.2.5); the rest lives in To do. */
function ThisWeek() {
  const onboarding = useOnboarding()
  const items = weekItems(onboarding)
  const openToDo = () => openTab("/gaps", "home")
  return (
    <Block title="This week" onSeeAll={openToDo}>
      {items.length ? (
        <Group>
          {items.map((i) => (
            <NeedsRow
              key={i.id}
              date={i.date}
              icon={i.date ? undefined : <RecordGlyph name={i.icon} />}
              title={i.title}
              meta={dotted(i.meta, keepEnd)}
              // The fasting note whole in its two lines, its last sentence
              // ("Water is fine.") never split.
              note={i.note && bySentence(i.note)}
              tag={i.tag}
              // A starting test booked in setup has no page of its own, as on
              // To do: its row is all there is, so it is not a button.
              onPress={opensPage(i) ? () => router.push(i.href) : undefined}
              chevron={false}
            />
          ))}
        </Group>
      ) : (
        <Card style={styles.cardBody}>
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>Nothing booked this week</Text>
            <TextAction onPress={openToDo}>See your To do</TextAction>
          </View>
        </Card>
      )}
    </Block>
  )
}

/* -------------------------------------------------- since you started -- */

/** "11 lb" and the rest of the sentence, the number counting up once. */
function Headline({ value, unit, words, playKey }: { value: number; unit: string; words: string; playKey: string }) {
  return (
    <Text style={styles.headline}>
      <CountUp value={value} format={(v) => `${Math.round(v)} ${unit}`} style={styles.headlineNumber} playKey={playKey} />
      <Text style={styles.headlineWords}>{` ${words}`}</Text>
    </Text>
  )
}

const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s)

/** Progress measured from where she started (C.2.6): body fat lost between
    two DEXA scans (or, before a second scan, the scale since May 3), the
    weight chart with its goal and a forecast that calls itself one, and
    three stats. The bone plan leads with chair stands, its monthly checks
    against the goal and no forecast. The trophy shows while the latest
    milestone is under two weeks old, and that milestone is named once when
    the headline does not already say it. The card opens Progress. */
function SinceYouStarted() {
  const onboarding = useOnboarding()
  const profile = profileOf(onboarding)
  const p = progress(onboarding)
  const stands = profile.headline === "stands"
  const fat = stands ? undefined : fatLost()
  const latest = milestones(onboarding)[0]
  const fresh = !!latest && daysBetween(dayFrom(latest.at), new Date()) < 14
  // The headline already says its own kind of milestone: the chair stands,
  // the fat lost, or the scale's pounds.
  const said = !!latest && (stands ? latest.kind === "strength" : fat ? latest.id.startsWith("fat") : latest.kind === "weight")
  const openProgress = () => router.push("/progress")

  let head: React.ReactNode
  let chartView: React.ReactNode
  let stats: React.ReactNode
  if (stands) {
    const st = p.stands
    // Days in the last 30 that met the calcium goal, and the strength
    // sessions of the last four weeks.
    const month = scoreHistory(onboarding, 30)
    const calciumDays = month.filter((d) => d.results.some((r) => r.goal.id === "calcium" && r.met)).length
    const strength = adherence(onboarding, 28).strength
    // "May 2027": the month large, the year as its unit.
    const [scanMonth, scanYear] = NEXT_BONE_SCAN.month.split(" ")
    // Monthly checks are joined point to point, never smoothed into steps.
    const checks = datedOf(st.series)
    head = (
      <>
        {st.now !== undefined && <CountUp value={st.now} format={(v) => `${Math.round(v)} chair stands`} style={styles.headlineNumber} playKey="member:since" />}
        {!!st.line && <Text style={styles.headlineWords}>{st.line}</Text>}
        <Text style={styles.meta}>Strength check, once a month</Text>
      </>
    )
    chartView = (
      <ProgressChart
        compact
        readings={checks}
        trend={checks}
        goal={STANDS_GOAL}
        today={st.series.at(-1)?.at}
        name="chair stands"
        readingsLabel="Monthly checks"
        caption={null}
        playKey="member:since-chart"
      />
    )
    stats = (
      <StatRow>
        <StatTile bare value={`${calciumDays} of ${month.length}`} label="Calcium goal days" />
        <StatTile bare value={`${strength.done} of ${strength.planned}`} label="Strength sessions" />
        <StatTile bare value={scanMonth} unit={scanYear} label="Next bone scan" />
      </StatRow>
    )
  } else {
    const scan = DEXA_SCANS.filter((d) => d.at <= localDay()).at(-1)
    const lb = fat ? fat.lb : Math.round(Math.abs(p.weight.change))
    head = (
      <>
        <Headline value={lb} unit="lb" words={fat ? fat.words : `down ${p.weight.since}`} playKey="member:since" />
        <Text style={styles.meta}>{fat ? fat.meta : `From ${p.weight.start.toFixed(1)} to ${p.weight.now.toFixed(1)} lb`}</Text>
      </>
    )
    chartView = <ProgressChart {...progressChartOf(p)} compact caption={p.weight.forecast?.caption ?? p.weight.note ?? null} playKey="member:since-chart" />
    stats = (
      <StatRow>
        <StatTile bare value={p.weight.now.toFixed(1)} unit="lb" label="Weight" meta={p.weight.words} />
        <StatTile bare value={p.waist.now.toFixed(1)} unit="in" label="Waist" meta={p.waist.words} />
        {fat && scan ? (
          <StatTile bare value={scan.leanLb.toFixed(1)} unit="lb" label="Lean mass" meta={fat.leanWords} />
        ) : p.pressure.now ? (
          <StatTile bare value={p.pressure.now} label="Blood pressure" meta={`From ${p.pressure.start}`} />
        ) : null}
      </StatRow>
    )
  }

  return (
    <Block title="Since you started" link={{ label: "See progress", onPress: openProgress }}>
      <Card onPress={openProgress} style={styles.cardBody}>
        <View style={styles.sinceTop}>
          <View style={styles.sinceWords}>
            {head}
            {!!latest && !said && <Text style={styles.meta}>{`Latest milestone: ${lowerFirst(latest.title)}, ${latest.label}`}</Text>}
          </View>
          {fresh && <Art name="trophy" size={56} />}
        </View>
        {chartView}
        <View style={styles.rule} />
        {stats}
      </Card>
    </Block>
  )
}

/* ---------------------------------------------------------- your week -- */

const native = Platform.OS !== "web"

/** The one optional card (C.2.7): last week's recap and its check in in
    one, Friday to Tuesday until she answers (or when a review turns it on).
    Two facts, the week's daily scores, how it went, and what got in the
    way when it was not easy. From Friday to Sunday the week is still
    running, and its count says so ("Days so far"). The answers reach
    Dr. Patel's team as barriers; nothing here is a grade or a streak. */
function YourWeek({ at }: { at: number }) {
  const onboarding = useOnboarding()
  const w = weekCheckIn(onboarding)
  const [answer, setAnswer] = React.useState<string>()
  const [why, setWhy] = React.useState<string[]>([])
  const fold = React.useRef(new Animated.Value(1)).current
  const show = !w.answer && (w.due || !!onboarding.demo?.forceWeekCard)
  if (!show) return null

  // Monday to Sunday; only the days before today have a score.
  const monday = dayFrom(w.key.replace(/^week:/, ""))
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const scores = week.filter((d) => daysBetween(d, new Date()) >= 1).map((d) => dayScore(onboarding, d))
  const running = scores.length < week.length
  // The whole week as columns: the days still to come wait as future days
  // (no bar, no mark, a quieter weekday), so a Thursday reads as a week in
  // progress, never as a three day week.
  const bars = [...weekBarsOf(scores), ...week.slice(scores.length).map((d) => ({ label: weekdayOf(d), future: true }))]
  // The strong bar is the best scored day so far; none while no day has a
  // score, so no weekday is picked out over an empty baseline.
  const best = scores.reduce<number | undefined>((b, d, i) => {
    if (d.percent === undefined) return b
    return b === undefined || d.percent > (scores[b].percent ?? -1) ? i : b
  }, undefined)
  const hard = answer === CHECK_IN.options[2]
  const asks = answer === CHECK_IN.options[1] || hard

  const toggle = (b: string) => setWhy((list) => (list.includes(b) ? list.filter((x) => x !== b) : [...list, b]))
  const save = () => {
    if (!answer) return
    const patch = { ...onboarding.checkIn, [w.key]: answer, ...(asks && why.length ? { [`${w.key}:why`]: why.join(", ") } : {}) }
    Animated.timing(fold, { toValue: 0, duration: 220, useNativeDriver: native }).start(() => {
      onboarding.save({ checkIn: patch }).catch(() => {})
      toast("Thanks. Dr. Patel's team sees this at your next review.")
    })
  }

  return (
    <Rise at={at} id="member:your-week">
      <Animated.View style={{ opacity: fold, transform: [{ scale: fold.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }] }}>
        <Card style={styles.cardBody}>
          <View style={styles.weekHead}>
            <Text style={styles.cardTitle} accessibilityRole="header">
              Your week
            </Text>
            <Text style={styles.meta}>{w.range}</Text>
          </View>
          <StatRow>
            <StatTile bare value={`${w.summary.daysLogged} of ${w.summary.days}`} label={running ? "Days so far" : "Days logged"} />
            {w.summary.average !== undefined ? <StatTile bare value={w.summary.average} unit="%" label="Average" /> : null}
          </StatRow>
          <WeekBars mini days={bars} highlight={best} emptyWord="Nothing logged" playKey="member:your-week" />
          <View style={styles.rule} />
          <View style={styles.ask}>
            <Text style={styles.askTitle}>{CHECK_IN.question}</Text>
            <ChipRow wrap label={CHECK_IN.question} options={CHECK_IN.options.map((o) => ({ value: o, label: o }))} value={answer} onChange={setAnswer} />
          </View>
          {asks && (
            <View style={styles.ask}>
              <Text style={styles.askTitle}>{CHECK_IN.barrierQuestion}</Text>
              <View style={styles.chips}>
                {CHECK_IN.barriers.map((b) => (
                  <Chip key={b} label={b} selected={why.includes(b)} onPress={() => toggle(b)} />
                ))}
              </View>
              {why.includes("Pain or discomfort") && <Text style={styles.safety}>{keepEnd("If you have chest pain or trouble breathing, call 911.")}</Text>}
            </View>
          )}
          {hard && <Text style={styles.body}>{bySentence(CHECK_IN.reassurance)}</Text>}
          {!!answer && <SmallAction onPress={save}>Save</SmallAction>}
        </Card>
      </Animated.View>
    </Rise>
  )
}

/* -------------------------------------------------------- your record -- */

/** Her record one tap away (C.2.8): results and trends, her medicines and
    the history of every day and reading. Lab history and the score live
    behind these rows, never on this screen. */
function YourRecord() {
  const onboarding = useOnboarding()
  const counts = trendCounts(useMarkers())
  const meds = yourMedicines(onboarding)
  return (
    <Block title="Your record">
      <Group>
        <NeedsRow
          icon={<RecordGlyph name="labs" />}
          title="Results and trends"
          meta={`${counts.total} results, ${counts.toWatch} to watch`}
          onPress={() => openTab("/results", "home")}
        />
        <NeedsRow
          icon={<RecordGlyph name="medications" />}
          title="Your medicines"
          meta={meds.line}
          onPress={() => router.push("/medications")}
        />
        <NeedsRow
          icon={<RecordGlyph name="chart" />}
          title="History"
          meta={keepEnd("Every day, weigh in and reading since May")}
          onPress={() => router.push("/history")}
        />
      </Group>
    </Block>
  )
}

/* ------------------------------------------------------------- stages -- */

/** A member who has not finished the paid setup (C.2.9): the next step on
    the hero, then her record. No Yesterday or progress yet. */
function SetupStage() {
  const onboarding = useOnboarding()
  const done = onboarding.setupDone ?? []
  const next = nextSetup(done)
  const step = next ? SETUP.indexOf(next) + 1 : SETUP.length
  return (
    <View style={styles.page}>
      <Rise at={0} id="member:setup">
        <View style={styles.top}>
          <StatusBanner variant="member" tab="home" />
          <Card style={styles.cardBody}>
            <View style={styles.stageTop}>
              <View style={styles.stageWords}>
                <Text style={styles.stageTitle} accessibilityRole="header">
                  Finish setting up your plan
                </Text>
                {next && <Text style={styles.meta}>{`Step ${step} of ${SETUP.length}: ${next.title}`}</Text>}
              </View>
              <Art name="key" size={64} />
            </View>
            <ProgressBar done={SETUP.filter((x) => done.includes(x.id)).length} total={SETUP.length} />
            {next && <SmallAction onPress={() => router.push(next.href)}>Continue</SmallAction>}
          </Card>
        </View>
      </Rise>
      <RecordSections needsAsCard />
    </View>
  )
}

/** "Tue, Oct 6" from a booked slot ("Tue, Oct 6, 7:30 AM" or an ISO time). */
function slotDay(slot: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(slot)) return dayLabel(dateOfAt(slot))
  return slot.split(",").slice(0, 2).join(",").trim()
}

/** Words that wrap as one ("DEXA Wed, Oct 7"). */
const together = (text: string) => text.replace(/ /g, "\u00A0")

/** "Blood panel Tue, Oct 6. DEXA Wed, Oct 7." from the setup's bookings,
    each test's day kept on one line. */
function testsLine(tests: Record<string, string> | undefined) {
  const parts = [tests?.blood && `Blood panel ${together(slotDay(tests.blood))}`, tests?.dexa && together(`DEXA ${slotDay(tests.dexa)}`)].filter(Boolean)
  return parts.length ? `${parts.join(". ")}.` : "See them in To do"
}

/** Version 1 with Dr. Patel (C.2.9): what happens next and what she can do
    meanwhile, then her record. Billing starts with the approval. */
function ReviewStage() {
  const onboarding = useOnboarding()
  return (
    <View style={styles.page}>
      <Rise at={0} id="member:review">
        <View style={styles.top}>
          <StatusBanner variant="member" tab="home" />
          <Card>
            <View style={styles.stageTop}>
              <View style={styles.stageWords}>
                <Text style={styles.stageTitle} accessibilityRole="header">
                  Your plan is with Dr. Patel
                </Text>
                <Text style={styles.meta}>{bySentence("It starts once it's approved. Billing starts then too.")}</Text>
              </View>
              <Art name="document" size={64} />
            </View>
          </Card>
          <Block title="While you wait">
            <Group>
              <NeedsRow
                icon={<RecordGlyph name="labs" />}
                title="Your starting tests"
                meta={testsLine(onboarding.tests)}
                onPress={() => openTab("/gaps", "home")}
              />
              <NeedsRow
                icon={<Camera size={16} color={iconInk} />}
                title="Try logging a meal"
                meta={keepEnd("Your totals show once your targets arrive")}
                onPress={() => router.push("/log-meal")}
              />
              <NeedsRow
                icon={<SparkleGlyph size={16} tone={iconInk} />}
                title="Ask about your plan"
                meta={keepEnd("How it was built and what happens next")}
                onPress={() => router.push({ pathname: "/assistant", params: { topic: "plan" } } as Href)}
              />
            </Group>
          </Block>
        </View>
      </Rise>
      <RecordSections needsAsCard />
    </View>
  )
}

const styles = StyleSheet.create({
  // Sections a tab screen's section apart; the plan line, a banner and the
  // hero an item apart.
  page: { gap: space.section },
  top: { gap: space.item },
  pressed: { opacity: 0.7 },
  cardBody: { gap: space.card },
  // A rule across a card between its parts, the colour of the dividers
  // between its stats.
  rule: { height: 1, backgroundColor: hairline.edge },
  meta: { ...type.meta },
  body: { ...type.body },
  cardTitle: { ...type.title, flexShrink: 1 },

  // Two rows of doors sit as far apart as the doors in a row.
  doors: { gap: space.inline },

  // Yesterday: the ring leads its words the way a tile leads a row.
  dayTop: { flexDirection: "row", alignItems: "center", gap: space.lead },
  dayWords: { flex: 1, gap: space.stack },
  dayOf: { ...type.label },
  dayCoach: { ...type.title },
  // The energy words and their "Estimated" tag, set like a row's title and
  // its tag.
  energy: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space.inline, rowGap: space.stack, marginTop: space.line },
  energyText: { ...type.meta, flexShrink: 1 },
  // The one fix, a label's distance under the coaching line.
  dayAction: { marginTop: space.inline - space.stack },

  // This week with nothing booked: one quiet line, as the kit's empty state
  // writes its line, and the link beside it.
  emptyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item },
  emptyText: { ...type.body, color: ink.secondary, flexShrink: 1 },

  sinceTop: { flexDirection: "row", alignItems: "flex-start", gap: space.lead },
  sinceWords: { flex: 1, gap: space.stack },
  // "11 lb" and the words after it share one line at the hero number's
  // height; the words inside it step down to body.
  headline: { ...type.hero },
  headlineNumber: { ...type.hero },
  headlineWords: { ...type.body },

  // Your week: each question a heading's distance over its chips.
  weekHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.item },
  ask: { gap: space.item },
  askTitle: { ...type.title },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  safety: { ...type.title },

  // Setup and review: the words, then their object.
  stageTop: { flexDirection: "row", alignItems: "center", gap: space.lead },
  stageWords: { flex: 1, gap: space.stack },
  // A white card's title, as the free home's plan card.
  stageTitle: { ...type.section },
})
