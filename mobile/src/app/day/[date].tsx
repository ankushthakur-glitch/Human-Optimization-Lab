import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View, useWindowDimensions } from "react-native"

import { GoalRows, ScoreRing, WeekBars, formatNumber } from "@/components/charts"
import { CheckInSheet } from "@/components/check-in-sheet"
import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { AskButton, PrimaryButton } from "@/components/hol"
import { Barbell, CheckCircle, Heartbeat, PersonSimpleWalk, Ruler, Scales } from "@/components/ph"
import { NutrientSheet, keepGap } from "@/components/member-day-nutrient"
import { Block, Card, EmptyState, Group, HUE, KeyValue, NeedsRow, SmallAction, Tag } from "@/components/record-kit"
import { MealRow } from "@/components/today-food-meals"
import { relativeDay } from "@/lib/dates"
import {
  BP_CHECK,
  MEAL_SLOTS,
  MEMBER,
  WALK,
  addDays,
  averageOf,
  clockOf,
  dayFrom,
  dayOfAt,
  dayScore,
  daysBetween,
  goalRowsOf,
  localDay,
  memberStage,
  pressures,
  profileOf,
  shortDay,
  slotAt,
  stands,
  waists,
  weekBarsOf,
  weighIns,
  type DayScore,
  type Energy,
  type MealSlot,
  type Measure,
  type MemberProfile,
} from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { chart, space, type } from "@/lib/theme"

/* One day of the member's plan (FINAL-SPEC C.24), opened from Yesterday on
   the member home and from History: the day's score with its largest
   shortfall, every scored goal (a row opens where that nutrient came from),
   the energy balance on a complete day of a weight plan, the meals with
   their times, movement, any check ins, and the week around the day.

   The link names the day as "today", "yesterday" or a local day key
   ("2026-10-04"); `?nutrient=fiber` opens that goal's sheet straight away,
   as a goal row on the home does. Today is never scored, a partly logged
   day shows its subtotals "so far", and a day with nothing logged carries
   no blame, only a way to add a meal. Nothing on this page sells. */

type Store = ReturnType<typeof useOnboarding>

/** What a check in sheet can be opened for from this page (today only). */
type CheckInKind = "walk" | "bp" | "weight"

/** The day a link names, at local noon: today, yesterday, or a day key from
    the plan's start up to today. Undefined for anything else. */
function dayOf(param: string | undefined, now: Date): Date | undefined {
  const today = dayFrom(localDay(now))
  if (param === "today") return today
  if (param === "yesterday") return addDays(today, -1)
  if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return undefined
  const d = dayFrom(param)
  // "2026-02-30" rolls over to March: not a day anyone could have logged.
  if (localDay(d) !== param || daysBetween(now, d) > 0 || param < MEMBER.start) return undefined
  return d
}

/** "Breakfast", "lunch and dinner", "breakfast, lunch and dinner" */
function slotWords(slots: MealSlot[]) {
  const names = slots.map((slot, i) => {
    const name = MEAL_SLOTS.find((m) => m.id === slot)?.name ?? slot
    return i ? name.toLowerCase() : name
  })
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "")
}

/** A sentence whose last two words wrap together, so its last line is never
    one word alone: "lunch and dinner / are logged.", not "logged.". The
    score card's words column is narrow, so its sentences all take it. */
const keepEnd = (line: string) => line.replace(/ (?=\S+$)/, " ")

export default function DayScreen() {
  const params = useLocalSearchParams<{ date: string; nutrient?: string }>()
  const s = useOnboarding()
  const [nutrient, setNutrient] = React.useState(params.nutrient)
  const [checkIn, setCheckIn] = React.useState<CheckInKind>()
  const [picked, setPicked] = React.useState(6)

  const now = new Date()
  const day = dayOf(params.date, now)
  const stage = memberStage(s)
  // The member's own days only: a plan with the doctor has no days yet,
  // and the free record has none.
  if (!day || !stage || stage === "review") return <PageNotFoundState />

  const key = localDay(day)
  const offset = daysBetween(now, day)
  const isToday = offset === 0
  const score = dayScore(s, day, now)
  const goal = score.results.find((r) => r.goal.id === nutrient)?.goal
  // How log-meal and the assistant name this day.
  const dayParam = isToday ? undefined : offset === -1 ? "yesterday" : key
  const logMeal = (slot: MealSlot) => router.push({ pathname: "/log-meal", params: dayParam ? { slot, day: dayParam } : { slot } })

  // The week the day closes: seven scored days, so today looks back from
  // yesterday (today is never scored).
  const end = isToday ? addDays(day, -1) : day
  const week = Array.from({ length: 7 }, (_, i) => dayScore(s, addDays(end, i - 6), now))
  const viewed = isToday ? -1 : week.length - 1
  const chosen = week[picked]
  const openDay = (d: DayScore) => router.push({ pathname: "/day/[date]", params: { date: daysBetween(now, d.date) === -1 ? "yesterday" : d.day } })
  const average = averageOf(week)
  const trailing =
    average.average !== undefined ? `Average ${average.average}% on ${average.scored} scored ${average.scored === 1 ? "day" : "days"}` : undefined

  const ask = isToday ? "How is today going so far?" : offset === -1 ? "How did yesterday go?" : `How did ${score.label} go?`
  const moves = movementOf(s, day, score, isToday, () => setCheckIn("walk"))
  const checkIns = checkInsOf(s, day, isToday, now, setCheckIn)

  return (
    <View style={styles.fill}>
      <FlowScreen page title={relativeDay(day, now)} footer={<AskButton params={{ ask }} />}>
        <ScoreCard score={score} relative={isToday || offset === -1} onAdd={logMeal} />

        {score.status !== "none" && (
          <Block title="Goals">
            <Card>
              <GoalRows rows={goalRowsOf(score)} playKey={`day:${key}:goals`} onRowPress={(row) => setNutrient(row.id)} rowHint="Shows the week and where it came from" />
            </Card>
          </Block>
        )}

        {score.energy && (
          <Block title="Energy">
            <EnergyCard energy={score.energy} />
          </Block>
        )}

        <Meals score={score} plan={profileOf(s)} isToday={isToday} now={now} onAdd={logMeal} />

        {moves.length > 0 && (
          <Block title="Movement">
            <Group>
              {moves.map((m) => (
                <NeedsRow
                  key={m.id}
                  icon={m.icon}
                  title={m.title}
                  meta={m.meta}
                  right={m.done ? <CheckCircle size={20} color={chart.inRange} weight="fill" /> : undefined}
                  onPress={m.onPress}
                  accessibilityLabel={`${m.title}, ${m.meta}`}
                />
              ))}
            </Group>
          </Block>
        )}

        {checkIns.length > 0 && (
          <Block title="Check ins">
            <Group>
              {checkIns.map((c) => (
                <NeedsRow
                  key={c.id}
                  icon={c.icon}
                  title={c.title}
                  meta={c.meta}
                  right={c.onAdd ? <SmallAction onPress={c.onAdd} accessibilityLabel={`Add ${c.title.toLowerCase()}`}>Add</SmallAction> : undefined}
                />
              ))}
            </Group>
          </Block>
        )}

        <Block title={offset >= -1 ? "This week" : "That week"} meta={`${shortDay(week[0].date)} to ${shortDay(week[week.length - 1].date)}`}>
          <Card style={styles.week}>
            <WeekBars
              days={weekBarsOf(week)}
              goal={100}
              format={(v) => `${v}%`}
              name="Daily score"
              emptyWord="Nothing logged"
              trailing={trailing}
              selected={picked}
              onSelect={setPicked}
              playKey={`day:${key}:week`}
            />
            {picked !== viewed && (
              <SmallAction onPress={() => openDay(chosen)} accessibilityLabel={`Open ${relativeDay(chosen.date, now)}`}>
                Open day
              </SmallAction>
            )}
          </Card>
        </Block>
      </FlowScreen>

      {goal && <NutrientSheet goal={goal} day={day} now={now} onClose={() => setNutrient(undefined)} />}
      {checkIn && <CheckInSheet kind={checkIn} onClose={() => setCheckIn(undefined)} />}
    </View>
  )
}

/* --------------------------------------------------------------- score -- */

/** The day's score: the ring with what it is of, how many goals were met
    and the largest shortfall as a fact. A partial day and today have no
    score and say why; a day with nothing logged offers a meal. */
function ScoreCard({ score, relative, onAdd }: { score: DayScore; relative: boolean; onAdd: (slot: MealSlot) => void }) {
  // 132 on a phone of 360 pt or more; a smaller ring on the narrowest
  // phones keeps the words beside it readable.
  const ring = useWindowDimensions().width < 360 ? 104 : 132
  if (score.status === "none")
    return (
      <EmptyState title={`Nothing logged on ${score.label}`}>
        <View style={styles.emptyAction}>
          <PrimaryButton onPress={() => onAdd("breakfast")}>Add a meal for this day</PrimaryButton>
        </View>
      </EmptyState>
    )

  // The title says "Yesterday" or "Today", so the card names the date; a
  // sample day keeps no meal list, so it says how many were logged.
  const meta = [relative ? score.label : undefined, score.source === "sample" ? `${score.mealCount} meals logged` : undefined].filter(Boolean).join(", ")
  const mains = MEAL_SLOTS.filter((m) => m.main).length
  return (
    <Card style={styles.score}>
      <ScoreRing
        percent={score.percent}
        size={ring}
        label={score.status === "partial" ? "Partial" : "So far"}
        of="Daily score"
        playKey={`day:${score.day}:ring`}
      />
      <View style={styles.scoreWords}>
        {score.percent !== undefined ? (
          <>
            <Text style={type.label}>of your goals</Text>
            <Text style={type.title}>{`${score.met} of ${score.total} goals met`}</Text>
            <Text style={type.body}>{keepEnd(keepGap(score.coaching))}</Text>
          </>
        ) : score.status === "partial" ? (
          <>
            <Text style={type.title}>{keepEnd(`${score.coaching}, so this day has no score.`)}</Text>
            {score.source === "sample" && score.missing[0] && (
              <SmallAction onPress={() => onAdd(score.missing[0])} style={styles.scoreAction}>
                {`Add ${slotWords([score.missing[0]]).toLowerCase()}`}
              </SmallAction>
            )}
          </>
        ) : (
          <>
            <Text style={type.title}>{`${mains - score.missing.length} of ${mains} meals logged`}</Text>
            <Text style={type.body}>
              {keepEnd(
                score.missing.length
                  ? `Your score comes once ${slotWords(score.missing).toLowerCase()} ${score.missing.length > 1 ? "are" : "is"} logged.`
                  : "Your score for today shows tomorrow."
              )}
            </Text>
          </>
        )}
        {!!meta && <Text style={styles.scoreMeta}>{meta}</Text>}
      </View>
    </Card>
  )
}

/* -------------------------------------------------------------- energy -- */

/** What she burned against what she ate (M-27): resting and active are
    estimates until a device connects, so the balance carries the label. */
function EnergyCard({ energy: e }: { energy: Energy }) {
  const balance = Math.abs(e.deficit) < 10 ? "About even" : `About ${formatNumber(Math.abs(e.deficit))} kcal ${e.deficit > 0 ? "under" : "over"}`
  return (
    <Card style={styles.rows}>
      <KeyValue label="Burned" value={`About ${formatNumber(e.burned)} kcal`} />
      <KeyValue label="Resting" value={`${formatNumber(e.resting)} kcal, estimated`} />
      <KeyValue label="Active" value={`${formatNumber(e.active)} kcal, estimated`} />
      <KeyValue label="Ate" value={`${formatNumber(e.intake)} kcal`} />
      <View style={styles.balance} accessible accessibilityLabel={`Balance, ${balance}, estimated`}>
        <Text style={type.metaStrong}>Balance</Text>
        <View style={styles.balanceRight}>
          <Tag tone="muted">Estimated</Tag>
          <Text style={type.value}>{balance}</Text>
        </View>
      </View>
    </Card>
  )
}

/* --------------------------------------------------------------- meals -- */

/** Every meal slot of the day in order: what was eaten with its time and
    its line on her plan (the bone plan's calcium too), in the same row as
    the diet plan's, or the slot not logged with a way to add it. Today
    lists only the slots whose time has come. A sample day keeps totals,
    not meals, so it shows none. */
function Meals({ score, plan, isToday, now, onAdd }: { score: DayScore; plan: MemberProfile; isToday: boolean; now: Date; onAdd: (slot: MealSlot) => void }) {
  if (score.source === "sample" || score.status === "none") return null
  const reached = MEAL_SLOTS.findIndex((m) => m.id === slotAt(now))
  const rows = MEAL_SLOTS.flatMap((slot, i) => {
    const meals = score.meals.filter((m) => m.slot === slot.id)
    if (meals.length) return meals.map((m) => <MealRow key={m.id} meal={m} plan={plan} />)
    if (isToday && i > reached) return []
    return [
      <NeedsRow
        key={slot.id}
        title={`${slot.name} not logged`}
        muted
        right={
          <SmallAction onPress={() => onAdd(slot.id)} accessibilityLabel={`Add ${slot.name.toLowerCase()}`}>
            Add
          </SmallAction>
        }
      />,
    ]
  })
  if (!rows.length) return null
  return (
    <Block title="Meals">
      <Group>{rows}</Group>
    </Block>
  )
}

/* ------------------------------------------------------------ movement -- */

type Move = { id: string; icon: React.ReactNode; title: string; meta: string; done: boolean; onPress?: () => void }

/** The walk after dinner and the day's strength session, as she logged
    them. A sample day keeps no movement log, so it shows none rather than
    guess, and a day with nothing logged lists only what was done, never a
    row of "Not logged" (M-31). Today, what is still to do opens its sheet
    or its session. */
function movementOf(s: Store, day: Date, score: DayScore, isToday: boolean, onWalk: () => void): Move[] {
  const log = s.exercises?.[localDay(day)]
  if (score.source === "sample" && !log) return []
  return movesOf(s, day, log, isToday, onWalk).filter((m) => m.done || score.status !== "none")
}

/** Every movement the plan asks of a day (the walk, and the session on a
    strength day), each with what her log says. */
function movesOf(s: Store, day: Date, log: Record<string, { minutes?: number }> | undefined, isToday: boolean, onWalk: () => void): Move[] {
  const out: Move[] = []
  const walk = log?.walk
  out.push({
    id: "walk",
    icon: <PersonSimpleWalk size={16} color={HUE.teal.ink} />,
    title: WALK.title,
    meta: walk ? `Done, ${walk.minutes ?? WALK.minutes} minutes` : isToday ? WALK.detail : "Not logged",
    done: Boolean(walk),
    onPress: isToday && !walk ? onWalk : undefined,
  })
  const session = profileOf(s).sessionOn(day)
  if (session) {
    const of = session.exercises.length
    const done = log?.[session.id] ? of : session.exercises.filter((e) => log?.[e.id]).length
    out.push({
      id: session.id,
      icon: <Barbell size={16} color={HUE.teal.ink} />,
      title: session.title,
      meta: done === of ? `Done, ${of} of ${of} moves` : done ? `${done} of ${of} moves` : isToday ? `${of} moves, about ${session.minutes} minutes` : "Not logged",
      done: done === of,
      onPress: isToday && done < of ? () => router.push("/exercise") : undefined,
    })
  }
  return out
}

/* ------------------------------------------------------------ check ins -- */

type CheckIn = { id: string; icon: React.ReactNode; title: string; meta: string; onAdd?: () => void }

/** ", 9:05 PM" when a reading kept its time; sample readings keep only the day. */
const timeOf = (m: { at: string }) => (m.at.length > 10 ? `, ${clockOf(new Date(m.at))}` : "")

/** The day's readings, entered by hand: weight, waist, blood pressure and,
    on a bone plan, chair stands. Today shows only what she has entered,
    and the evening blood pressure check (and Thursday's weigh in) while
    still to do. */
function checkInsOf(s: Store, day: Date, isToday: boolean, now: Date, open: (kind: CheckInKind) => void): CheckIn[] {
  const key = localDay(day)
  const bone = profileOf(s).focus === "bone"
  const on = (list: Measure[]) => list.filter((m) => dayOfAt(m.at) === key)
  // Today has no sample readings: only what she entered.
  const own = (kind: "weight" | "waist" | "bp" | "stands") =>
    (s.entries ?? []).filter((e) => e.kind === kind && dayOfAt(e.at) === key).map((e): Measure => ({ at: e.at, value: e.value, value2: e.value2, source: "Entered by you" }))
  const pick = (kind: "weight" | "waist" | "bp" | "stands", sample: () => Measure[]) => (isToday ? own(kind) : on(sample()))

  const weight = pick("weight", () => weighIns(s, now))
  const waist = pick("waist", () => waists(s, now))
  const bp = pick("bp", () => pressures(s, now))
  const chair = bone ? pick("stands", () => stands(s, now)) : []

  const out: CheckIn[] = []
  weight.forEach((m, i) =>
    out.push({ id: `weight${i}`, icon: <Scales size={16} color={HUE.teal.ink} />, title: "Weight", meta: `${formatNumber(m.value, 1)} lb${timeOf(m)}` })
  )
  if (isToday && !weight.length && day.getDay() === 4)
    out.push({ id: "weight-due", icon: <Scales size={16} color={HUE.teal.ink} />, title: "Weight", meta: "Before breakfast", onAdd: () => open("weight") })
  waist.forEach((m, i) => out.push({ id: `waist${i}`, icon: <Ruler size={16} color={HUE.teal.ink} />, title: "Waist", meta: `${formatNumber(m.value, 1)} in${timeOf(m)}` }))
  bp.forEach((m, i) =>
    out.push({ id: `bp${i}`, icon: <Heartbeat size={16} color={HUE.teal.ink} />, title: "Blood pressure", meta: `${m.value}/${m.value2}${timeOf(m)}` })
  )
  if (isToday && !bp.length)
    out.push({ id: "bp-due", icon: <Heartbeat size={16} color={HUE.teal.ink} />, title: "Blood pressure", meta: keepEnd(BP_CHECK.detail), onAdd: () => open("bp") })
  chair.forEach((m, i) =>
    out.push({ id: `stands${i}`, icon: <Barbell size={16} color={HUE.teal.ink} />, title: "Chair stands", meta: `${m.value} in 30 seconds${timeOf(m)}` })
  )
  return out
}

const styles = StyleSheet.create({
  fill: { flex: 1 },

  // The ring and its words share the card, a card's padding apart.
  score: { flexDirection: "row", alignItems: "center", gap: space.card },
  scoreWords: { flex: 1, gap: space.line },
  scoreMeta: { ...type.meta, marginTop: space.stack },
  scoreAction: { marginTop: space.inline },
  emptyAction: { alignSelf: "stretch", marginTop: space.inline },

  // Key value rows keep a row's 12 over and under their words; the card
  // adds the rest of its padding, so the first and last words sit 16 from
  // its edge, as on its sides.
  rows: { paddingVertical: space.card - space.rowY },
  // The balance closes the card as a key value row would, its label in
  // medium.
  balance: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item, paddingVertical: space.rowY },
  balanceRight: { flexDirection: "row", alignItems: "center", gap: space.inline, flexShrink: 1 },

  week: { gap: space.item },
})
