import { router, useFocusEffect } from "expo-router"
import * as React from "react"
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import { ScoreRing, formatNumber } from "@/components/charts"
import { CheckInSheet, type CheckInKind } from "@/components/check-in-sheet"
import { PrimaryButton } from "@/components/hol"
import { Barbell, BowlFood, Camera, CaretLeft, CaretRight, Check, ClipboardText, DownloadSimple, Heartbeat, MagnifyingGlass, PersonSimpleWalk, Play, Scales } from "@/components/ph"
import { Block, HUE, ProgressBar, Rise, TextAction } from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { relativeDay } from "@/lib/dates"
import { WALK, addDays, clockOf, dayOfAt, dayScore, daysBetween, localDay, profileOf, today, type MealSlot, type NutrientId, type TodayAction } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { card, color, hairline, ink, space, type } from "@/lib/theme"
import { keepEnd } from "@/lib/words"

/* The plan's Today tab (design/today/index.html, 15 Oct 2026). The top
   bar steps a day back or forward ("< Today >", after a task app's day
   view); under it a strip of day cards, each showing how many of that
   day's tasks were done. Below, for the chosen day: the to-do with a tick
   on each task, the four goals as rings, the exercise with its start
   button, and the meals: four ways to log one and the day's targets split
   across the three meals. Today's tasks tick off here; a past day is read
   only and opens its full day page; a coming day shows what is planned. */

type Store = ReturnType<typeof useOnboarding>

/** How far the strip reaches: two weeks back, one week ahead. */
const BACK = 14
const AHEAD = 7

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short" })

const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)

export function PlanToday() {
  const s = useOnboarding()
  const [sheet, setSheet] = React.useState<CheckInKind>()
  // The tasks read the clock, so they are redone each time the tab is shown.
  const [, setTick] = React.useState(0)
  useFocusEffect(React.useCallback(() => setTick((n) => n + 1), []))
  const now = new Date()
  const [picked, setPicked] = React.useState(() => startOf(now))
  const offset = daysBetween(now, picked)
  const pick = (d: Date) => {
    setPicked(startOf(d))
  }
  const step = (n: number) => {
    const next = addDays(picked, n)
    const off = daysBetween(now, next)
    if (off >= -BACK && off <= AHEAD) pick(next)
  }

  return (
    <TabScreen
      tab="today"
      header={<DayNav label={relativeDay(picked, now)} onStep={step} canBack={offset > -BACK} canNext={offset < AHEAD} />}
      pinned={<DayStrip s={s} now={now} picked={picked} onPick={pick} />}
      overlay={sheet && <CheckInSheet kind={sheet} onClose={() => setSheet(undefined)} />}
    >
      <Rise at={1} id={`today:todo:${localDay(picked)}`}>
        <TodoCard s={s} date={picked} now={now} onCheckIn={setSheet} />
      </Rise>
      <Rise at={2} id="today:goals">
        <GoalRings s={s} date={picked} now={now} />
      </Rise>
      <Rise at={3} id="today:exercise">
        <ExerciseCard s={s} date={picked} now={now} />
      </Rise>
      <Rise at={4} id="today:meals">
        <Meals s={s} live={offset === 0} />
      </Rise>
    </TabScreen>
  )
}

/* ----------------------------------------------------------------- tasks -- */

type Task = {
  id: TodayAction["id"]
  time: string
  title: string
  meta: string
  done: boolean
  action: TodayAction
}

/** One day's tasks in time order, each done or not. A past day's meals
    count as done once the day is fully logged, its sample day included,
    as the day page scores it. */
function tasksOn(s: Store, date: Date, now: Date): Task[] {
  const offset = daysBetween(now, date)
  const t = today(s, date)
  const day = localDay(date)
  const complete = offset < 0 && dayScore(s, date, now).status === "complete"
  return t.actions
    .filter((a) => a.counts)
    .map((a) => {
      let done = a.status === "done"
      let meta = a.detail
      if (a.id === "meal") {
        done ||= complete
        meta = done ? "Every meal logged" : offset > 0 ? "Breakfast, lunch and dinner" : (a.progress?.words ?? a.detail)
      } else if (a.id === "walk") {
        const walk = s.exercises?.[day]?.walk
        if (walk) meta = `Done at ${clockOf(new Date(walk.at))}`
      } else if (a.id === "strength") {
        if (a.status === "progress" && a.progress) meta = a.progress.words
      } else {
        const kind = a.id === "bp" ? "bp" : "weight"
        const entry = (s.entries ?? []).filter((e) => e.kind === kind && dayOfAt(e.at) === day).at(-1)
        if (entry) meta = `${kind === "bp" ? `${entry.value}/${entry.value2}` : `${entry.value.toFixed(1)} lb`} at ${clockOf(new Date(entry.at))}`
      }
      if (!done && offset < 0) meta = "Not logged"
      // A meal's time is the next one to log, so a finished or other day reads "All day".
      const time = a.id === "meal" && (done || offset !== 0) ? "All day" : a.time
      return { id: a.id, time, title: a.title, meta: keepEnd(meta), done, action: a }
    })
}

/* ----------------------------------------------------------------- head -- */

/** "< Today >" in the middle of the header. */
function DayNav({ label, onStep, canBack, canNext }: { label: string; onStep: (n: number) => void; canBack: boolean; canNext: boolean }) {
  return (
    <View style={styles.nav}>
      <View style={styles.navMiddle}>
        <Pressable
          onPress={() => onStep(-1)}
          disabled={!canBack}
          accessibilityRole="button"
          accessibilityLabel="Day before"
          style={({ pressed }) => [styles.navStep, !canBack && styles.off, pressed && styles.pressed]}
        >
          <CaretLeft size={16} color={ink.content} />
        </Pressable>
        <Text style={styles.navLabel} numberOfLines={1} accessibilityRole="header">
          {label}
        </Text>
        <Pressable
          onPress={() => onStep(1)}
          disabled={!canNext}
          accessibilityRole="button"
          accessibilityLabel="Day after"
          style={({ pressed }) => [styles.navStep, !canNext && styles.off, pressed && styles.pressed]}
        >
          <CaretRight size={16} color={ink.content} />
        </Pressable>
      </View>
    </View>
  )
}

/* ---------------------------------------------------------------- strip -- */

const CARD_W = 52
const CARD_GAP = 8

/** A strip of day cards.
    Each card shows the weekday, the date, and one dot per task, filled for
    each done; the chosen day is lifted with a teal edge on top. */
function DayStrip({ s, now, picked, onPick }: { s: Store; now: Date; picked: Date; onPick: (d: Date) => void }) {
  const todayKey = localDay(now)
  const days = React.useMemo(() => Array.from({ length: BACK + AHEAD + 1 }, (_, i) => startOf(addDays(new Date(), i - BACK))), [todayKey])
  const counts = days.map((d) => {
    const tasks = tasksOn(s, d, now)
    return { done: tasks.filter((t) => t.done).length, of: tasks.length }
  })
  const index = days.findIndex((d) => localDay(d) === localDay(picked))
  const scroller = React.useRef<ScrollView>(null)
  const [width, setWidth] = React.useState(0)
  // Keep the chosen day in the middle of the strip.
  React.useEffect(() => {
    if (!width || index < 0) return
    const x = index * (CARD_W + CARD_GAP) - (width - CARD_W) / 2
    scroller.current?.scrollTo({ x: Math.max(0, x), animated: true })
  }, [index, width])

  return (
    <View style={styles.strip}>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        contentContainerStyle={styles.days}
      >
        {days.map((d, i) => {
          const on = i === index
          const isToday = localDay(d) === todayKey
          const { done, of } = counts[i]
          const future = daysBetween(now, d) > 0
          return (
            <Pressable
              key={localDay(d)}
              onPress={() => onPick(d)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${relativeDay(d, now)}, ${future ? `${of} tasks planned` : `${done} of ${of} tasks done`}`}
              style={({ pressed }) => [styles.day, on && styles.dayOn, pressed && styles.pressed]}
            >
              <Text style={[styles.dayWeek, on && styles.dayWeekOn]}>{WEEKDAY.format(d)}</Text>
              <View style={[styles.dayNum, on && styles.dayNumOn, !on && isToday && styles.dayNumToday]}>
                <Text style={[styles.dayNumText, on && styles.dayNumTextOn, !on && isToday && styles.dayNumTextToday]}>{d.getDate()}</Text>
              </View>
              <Dots done={future ? 0 : done} of={of} />
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

/** One dot per task, a filled one for each done. */
function Dots({ done, of }: { done: number; of: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: of }, (_, i) => (
        <View key={i} style={[styles.dot, i < done && styles.dotDone]} />
      ))}
    </View>
  )
}

/* ---------------------------------------------------------------- to-do -- */

const ICONS: Record<TodayAction["id"], typeof Barbell> = {
  diet: BowlFood,
  meal: BowlFood,
  strength: Barbell,
  walk: PersonSimpleWalk,
  bp: Heartbeat,
  weigh: Scales,
}

/** One card: the title with its count, the bar, and each task with a
    chevron on the right (20 Oct 2026: no radio button), as on home's To-do.
    Today every task opens where it is logged and is done once logged there.
    Another day is read only. Done tasks sink to the bottom. */
function TodoCard({ s, date, now, onCheckIn }: { s: Store; date: Date; now: Date; onCheckIn: (kind: CheckInKind) => void }) {
  const offset = daysBetween(now, date)
  const live = offset === 0
  const day = localDay(date)
  // Array.sort is stable, so each group keeps its day order.
  const tasks = tasksOn(s, date, now).sort((x, y) => Number(x.done) - Number(y.done))
  const done = tasks.filter((t) => t.done).length

  const open = (t: Task) => {
    if (t.id === "meal") router.push({ pathname: "/log-meal", params: { slot: t.action.slot } })
    else if (t.id === "strength") router.push("/exercise")
    else if (t.id === "walk") onCheckIn("walk")
    else onCheckIn(t.id === "bp" ? "bp" : "weight")
  }

  return (
    <View style={styles.todo}>
      <View style={styles.todoHead}>
        <View style={styles.fill}>
          <Text style={styles.todoTitle} accessibilityRole="header">
            {live ? "Today's To-do" : offset < 0 ? "To-do" : "Planned"}
          </Text>
          {offset <= 0 && <Text style={styles.todoMeta}>{`${done} of ${tasks.length} done`}</Text>}
        </View>
        {/* The share of the day's tasks done, as on home's To-do; a day
            still to come only says how many it holds. */}
        {offset > 0 ? (
          <View style={styles.count}>
            <Text style={styles.countText}>{`${tasks.length} tasks`}</Text>
          </View>
        ) : (
          <ScoreRing percent={tasks.length ? (done / tasks.length) * 100 : 0} size={52} stroke={5} of="To-do done" playKey={`todo:${day}`} />
        )}
      </View>
      <View style={styles.todoBar}>
        <ProgressBar done={offset > 0 ? 0 : done} total={tasks.length} />
      </View>
      {tasks.map((t, i) => {
        const Icon = ICONS[t.id]
        const quiet = t.done || offset < 0
        return (
          <View key={t.id} style={[styles.task, i > 0 && styles.taskRule]}>
            <Pressable
              onPress={() => open(t)}
              disabled={!live}
              accessibilityRole={live ? "button" : undefined}
              accessibilityLabel={`${t.title}, ${t.meta}`}
              style={({ pressed }) => [styles.taskOpen, pressed && styles.pressed]}
            >
              <View style={[styles.taskTile, quiet && styles.taskTileDone]}>
                {t.done ? <Check size={16} weight="bold" color={ink.tertiary} /> : <Icon size={20} color={quiet ? ink.tertiary : color.primary} />}
              </View>
              <View style={styles.fill}>
                <Text style={[styles.taskTitle, t.done && styles.done]} numberOfLines={2}>
                  {t.title}
                </Text>
                <Text style={[styles.taskMeta, t.done && styles.done]} numberOfLines={2}>
                  {t.meta}
                </Text>
              </View>
              {live && <CaretRight size={16} color={card.chevron} />}
            </Pressable>
          </View>
        )
      })}
      {offset < 0 && (
        <View style={styles.todoFoot}>
          <TextAction onPress={() => router.push({ pathname: "/day/[date]", params: { date: offset === -1 ? "yesterday" : day } })} chevron>
            See the full day
          </TextAction>
        </View>
      )}
    </View>
  )
}

/* ---------------------------------------------------------------- goals -- */

/** The rings, in this order: calories, protein, calcium (fiber on a plan
    without it), and the day's exercise minutes. */
const RING_GOALS: NutrientId[][] = [["calories"], ["protein"], ["calcium", "fiber"]]

function GoalRings({ s, date, now }: { s: Store; date: Date; now: Date }) {
  const score = dayScore(s, date, now)
  const profile = profileOf(s)
  const rings = RING_GOALS.map((ids) => score.results.find((r) => ids.includes(r.goal.id)))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({ name: r.goal.name, value: Math.round(r.amount?.value ?? 0), target: r.goal.target, unit: r.goal.unit === "kcal" ? "" : ` ${r.goal.unit}` }))
  // Exercise: the session's minutes once it is done, and the walk's.
  const session = profile.sessionOn(date)
  const log = s.exercises?.[localDay(date)] ?? {}
  const planned = (session?.minutes ?? 0) + WALK.minutes
  const moved = (session && log[session.id] ? session.minutes : 0) + (log.walk ? WALK.minutes : 0)
  rings.push({ name: "Exercise", value: moved, target: planned, unit: " min" })
  const offset = daysBetween(now, date)

  return (
    <Block title={offset === 0 ? "Today's goals" : "Goals"} link={{ label: "Targets", onPress: () => router.push("/diet") }}>
      <View style={styles.rings}>
        {rings.map((g, i) => (
          <View key={g.name} style={[styles.ring, i > 0 && styles.ringRule]} accessible accessibilityLabel={`${g.name}, ${formatNumber(g.value)} of ${formatNumber(g.target)}${g.unit}`}>
            <ValueRing value={g.value} target={g.target} />
            <Text style={styles.ringName}>{g.name}</Text>
            <Text style={styles.ringOf}>{`of ${formatNumber(g.target)}${g.unit}`}</Text>
          </View>
        ))}
      </View>
    </Block>
  )
}

/** A small ring with the amount in its middle. */
function ValueRing({ value, target }: { value: number; target: number }) {
  const size = 56
  const sw = 5
  const r = (size - sw) / 2
  const C = 2 * Math.PI * r
  const share = target ? Math.min(value / target, 1) : 0
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color.primarySoft} strokeWidth={sw} fill="none" />
        {share > 0 && (
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color.primary} strokeWidth={sw} fill="none" strokeLinecap="round" strokeDasharray={`${C} ${C}`} strokeDashoffset={C * (1 - share)} />
        )}
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringValue}>{formatNumber(value)}</Text>
      </View>
    </View>
  )
}

/* ------------------------------------------------------------- exercise -- */

const WORKOUT = require("../../assets/images/exercise-wall-pushup.jpg")

function ExerciseCard({ s, date, now }: { s: Store; date: Date; now: Date }) {
  const session = profileOf(s).sessionOn(date)
  const live = daysBetween(now, date) === 0
  const open = () => router.push("/exercise")
  return (
    <Block title={live ? "Today's exercise" : "Exercise"} link={{ label: "View full plan", onPress: open }}>
      <View style={styles.ex}>
        <View style={styles.exRow}>
          <Pressable onPress={open} accessibilityRole="button" accessibilityLabel="Play the workout video" style={styles.thumb}>
            <Image source={WORKOUT} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={styles.thumbShade} />
            <View style={styles.play}>
              <Play size={14} weight="fill" color={color.primary} />
            </View>
          </Pressable>
          <View style={styles.fill}>
            <Text style={styles.exTitle}>{session ? `${session.title}, ${session.focus.toLowerCase()}` : WALK.title}</Text>
            <Text style={styles.exEst}>{`Estimated time: ${(session?.minutes ?? 0) + WALK.minutes} minutes`}</Text>
            <View style={styles.checks}>
              {session && <CheckLine words={`Strength training (${session.exercises.length} moves)`} />}
              <CheckLine words={`${WALK.minutes} min brisk walk`} />
            </View>
          </View>
        </View>
        {live && <PrimaryButton onPress={open}>{session ? "Start workout" : "Start walk"}</PrimaryButton>}
      </View>
    </Block>
  )
}

function CheckLine({ words }: { words: string }) {
  return (
    <View style={styles.check}>
      <Check size={14} weight="bold" color={color.primary} />
      <Text style={styles.checkText}>{words}</Text>
    </View>
  )
}

/* ---------------------------------------------------------------- meals -- */

/** How the day's targets split across the three meals. */
const SHARE: Record<Exclude<MealSlot, "snack">, number> = { breakfast: 0.27, lunch: 0.33, dinner: 0.4 }
const round = (n: number, to: number) => Math.round(n / to) * to

/** Four ways to log a meal (today only) and the day's targets split across
    its three meals. */
function Meals({ s, live }: { s: Store; live: boolean }) {
  const profile = profileOf(s)
  const target = (id: NutrientId) => profile.goals.find((g) => g.id === id)?.target
  const kcal = target("calories")
  const protein = target("protein")
  const calcium = target("calcium")
  const log = (via?: "photo" | "type") => router.push({ pathname: "/log-meal", params: via ? { via } : {} })
  const ways = [
    { label: "Meal database", Icon: MagnifyingGlass, hue: HUE.blue, onPress: () => log("type") },
    { label: "Today's plan", Icon: ClipboardText, hue: HUE.violet, onPress: () => router.push("/diet") },
    { label: "Photograph it", Icon: Camera, hue: HUE.teal, onPress: () => log("photo") },
    { label: "Import", Icon: DownloadSimple, hue: HUE.amber, onPress: () => log() },
  ]
  return (
    <Block title={live ? "Today's meals" : "Meals"} link={{ label: "Nutrition targets", onPress: () => router.push("/diet") }}>
      {live && (
        <View style={styles.ways}>
          {ways.map(({ label, Icon, hue, onPress }) => (
            <Pressable key={label} onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.way, pressed && styles.pressed]}>
              <View style={[styles.wayTile, { backgroundColor: hue.tint }]}>
                <Icon size={18} color={hue.ink} />
              </View>
              <Text style={styles.wayText} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.plan}>
        <Pressable onPress={() => router.push("/diet")} accessibilityRole="button" style={({ pressed }) => [styles.planHead, pressed && styles.pressed]}>
          <Text style={styles.planHeadText}>{live ? "Today's plan" : "The plan"}</Text>
          <View style={styles.planLink}>
            <Text style={styles.planLinkText}>Swap any meal</Text>
            <CaretRight size={14} color={ink.primary} />
          </View>
        </Pressable>
        {(Object.keys(SHARE) as (keyof typeof SHARE)[]).map((slot, i) => {
          const part = SHARE[slot]
          const words = [
            kcal && `${formatNumber(round(kcal * part, 10))} cal`,
            protein && `${formatNumber(round(protein * part, 1))} g protein`,
            calcium && `${formatNumber(round(calcium * part, 10))} mg calcium`,
          ]
            .filter(Boolean)
            .join(" · ")
          return (
            <View key={slot} style={[styles.planRow, i > 0 && styles.planRule]}>
              <Text style={styles.planMeal}>{slot[0].toUpperCase() + slot.slice(1)}</Text>
              <Text style={styles.planWords}>{words}</Text>
            </View>
          )
        })}
      </View>
    </Block>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pressed: { opacity: 0.7 },
  off: { opacity: 0.35 },

  nav: { flexDirection: "row", alignItems: "center", alignSelf: "stretch", width: "100%", paddingVertical: space.inline },
  navMiddle: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.item },
  navStep: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.background,
    borderWidth: 1,
    borderColor: hairline.edge,
    boxShadow: card.shadowXs,
  },
  navLabel: { ...type.section, color: ink.strong, minWidth: 96, textAlign: "center" },

  strip: { gap: space.item },
  days: { gap: CARD_GAP, paddingBottom: 4, paddingTop: 2 },
  day: {
    width: CARD_W,
    alignItems: "center",
    gap: 6,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 10,
    backgroundColor: card.fill,
    borderWidth: 1,
    borderColor: hairline.edge,
    borderTopWidth: 2,
    borderTopColor: hairline.edge,
  },
  dayOn: { backgroundColor: color.background, borderTopColor: color.primary, boxShadow: card.shadowXs },
  dayWeek: { ...type.label, color: ink.tertiary },
  dayWeekOn: { color: ink.secondary },
  dayNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dayNumOn: { backgroundColor: ink.strong },
  dayNumToday: { backgroundColor: color.primarySoft },
  dayNumText: { ...type.title, color: ink.content },
  dayNumTextOn: { color: ink.onColor },
  dayNumTextToday: { color: ink.primary },
  dots: { flexDirection: "row", gap: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: hairline.outline },
  dotDone: { backgroundColor: color.primary },


  todo: { paddingHorizontal: space.gutter, paddingTop: space.gutter, paddingBottom: 4, borderRadius: 16, backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge, boxShadow: card.shadowXs },
  todoHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item },
  todoTitle: { ...type.section, color: ink.detail },
  count: { paddingHorizontal: space.item, paddingVertical: 4, borderRadius: 999, backgroundColor: color.primarySoft, borderWidth: 1, borderColor: "#C2E1E0" },
  todoMeta: { ...type.label, marginTop: 2 },
  countText: { ...type.label, fontFamily: type.title.fontFamily, color: ink.primary },
  todoBar: { marginTop: space.item, marginBottom: 4 },
  todoFoot: { paddingTop: space.item, paddingBottom: space.item, borderTopWidth: 1, borderTopColor: hairline.edge },
  task: { flexDirection: "row", alignItems: "center", gap: space.item, paddingVertical: 14 },
  taskRule: { borderTopWidth: 1, borderTopColor: hairline.edge },
  taskOpen: { flex: 1, flexDirection: "row", alignItems: "center", gap: 14 },
  taskTile: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },
  taskTileDone: { backgroundColor: "#EFEFF2" },
  taskTitle: { ...type.title, fontSize: 15, lineHeight: 21, color: ink.strong },
  taskMeta: { fontFamily: type.body.fontFamily, fontSize: 13, lineHeight: 18, color: ink.secondary, marginTop: 2 },
  done: { color: ink.tertiary, textDecorationLine: "line-through" },

  rings: {
    flexDirection: "row",
    paddingTop: space.gutter,
    paddingBottom: 14,
    paddingHorizontal: space.inline,
    borderRadius: 10,
    backgroundColor: color.background,
    borderWidth: 1,
    borderColor: hairline.edge,
    boxShadow: card.shadowXs,
  },
  ring: { flex: 1, alignItems: "center" },
  ringRule: { borderLeftWidth: 1, borderLeftColor: hairline.edge },
  ringCenter: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  ringValue: { ...type.value, color: ink.strong },
  ringName: { ...type.label, fontFamily: type.title.fontFamily, color: ink.content, marginTop: space.inline },
  ringOf: { ...type.label, fontSize: 11, lineHeight: 14, marginTop: 1 },

  ex: { gap: space.item, padding: space.item, borderRadius: 10, backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge, boxShadow: card.shadowXs },
  exRow: { flexDirection: "row", gap: space.item },
  thumb: { width: 76, height: 76, borderRadius: 8, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  thumbShade: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0, 0, 0, 0.18)" },
  play: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255, 255, 255, 0.92)", paddingLeft: 2 },
  exTitle: { ...type.section, color: ink.strong },
  exEst: { ...type.label, marginTop: 2 },
  checks: { gap: 4, marginTop: space.inline },
  check: { flexDirection: "row", alignItems: "center", gap: space.mark },
  checkText: { ...type.label, color: ink.detail },

  ways: { flexDirection: "row", flexWrap: "wrap", gap: space.item },
  way: {
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: space.item,
    borderRadius: 10,
    backgroundColor: color.background,
    borderWidth: 1,
    borderColor: hairline.edge,
    boxShadow: card.shadowXs,
  },
  wayTile: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  wayText: { ...type.title, flexShrink: 1 },

  plan: { marginTop: space.item, borderRadius: 10, overflow: "hidden", backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge, boxShadow: card.shadowXs },
  planHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.item,
    paddingVertical: 10,
    backgroundColor: color.primaryTint,
    borderBottomWidth: 1,
    borderBottomColor: hairline.edge,
  },
  planHeadText: { ...type.label, fontFamily: type.title.fontFamily },
  planLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  planLinkText: { ...type.label, fontFamily: type.title.fontFamily, color: ink.primary },
  planRow: { flexDirection: "row", justifyContent: "space-between", gap: space.inline, padding: space.item },
  planRule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  planMeal: { ...type.title },
  planWords: { ...type.label, flexShrink: 1, textAlign: "right" },
})
