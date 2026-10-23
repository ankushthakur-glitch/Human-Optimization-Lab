import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import { BowlFood, CaretDown, CaretLeft, CaretRight, Check, Flame, Moon, PersonSimpleRun, Brain } from "@/components/ph"
import { Card } from "@/components/record-kit"
import { Foot, ScoreDial, TONE_INK, TopicTile } from "@/components/topic-kit"
import { openTab } from "@/components/tab-bar"
import { periodReview, reviewDay, type GoalDay, type GoalState, type PeriodReview, type PeriodRow, type ReviewDay, type ReviewGoalId } from "@/lib/daily-review"
import { dayOfAt, daysBetween, dayFrom, weekdayOf, MEMBER } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { HANDOVER, scoreTone, topicOf, topicScores, verdictOf } from "@/lib/topics"
import { card, chart, color, font, hairline, ink, space, surface, type } from "@/lib/theme"
import { formatNumber } from "@/lib/trends"

/* Plan > Review (22 Oct 2026, the "Plan Review screen" design): how the
   plan is going, a day, a week or a month at a time. One card holds the
   score and a row per goal (the bar, what is left, MET / CLOSE / BEHIND),
   the calories row opens the energy sum, then the one thing to change and
   what she logged. It replaces the old /review page, so Home's Yesterday
   strip and every link into the review land here. The week and month add
   up the same days goal by goal. */

type Period = "day" | "week" | "month"
type Badge = "met" | "close" | "behind" | "none"

const PERIODS: { id: Period; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
]

/** How each goal draws: its icon, tile and bar colours (the design's
    tokens: teal, amber for protein, green for SMART, violet for sleep). */
const LOOK: Record<ReviewGoalId, { Icon: typeof Flame; tint: string; ink: string; bar: string }> = {
  energy: { Icon: Flame, tint: color.primaryTint, ink: color.primary, bar: chart.data },
  protein: { Icon: BowlFood, tint: color.amberTint, ink: color.amber, bar: color.amber },
  calcium: { Icon: BowlFood, tint: color.amberTint, ink: color.amber, bar: color.amber },
  exercise: { Icon: PersonSimpleRun, tint: color.primaryTint, ink: color.primary, bar: chart.data },
  water: { Icon: Flame, tint: color.blueTint, ink: color.blue, bar: color.blue },
  smart: { Icon: Brain, tint: color.okTint, ink: chart.inRange, bar: chart.data },
  lights: { Icon: Moon, tint: color.violetTint, ink: color.violet, bar: color.violet },
}

const badgeOf = (state: GoalState): Badge => (state === "met" ? "met" : state === "close" ? "close" : state === "under" ? "behind" : "none")

/** The design calls the energy goal "Calories". */
const nameOf = (g: { id: ReviewGoalId; name: string }) => (g.id === "energy" ? "Calories" : g.name)

const monthDay = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })

/** The day of the plan she is on: Day 1 is the day it was approved. */
export function planDayNow(onboarding: ReturnType<typeof useOnboarding>, now = new Date()) {
  const started = dayOfAt(onboarding.membership?.approvedAt ?? onboarding.membership?.startedAt ?? MEMBER.start)
  return daysBetween(dayFrom(started), now) + 1
}

export function PlanReview() {
  const onboarding = useOnboarding()
  const [period, setPeriod] = React.useState<Period>("day")
  const [step, setStep] = React.useState(0)
  const [open, setOpen] = React.useState(false)
  const now = React.useMemo(() => new Date(), [])

  const day = React.useMemo(() => (period === "day" ? reviewDay(onboarding, 1 + step, now) : undefined), [onboarding, period, step, now])
  const range = React.useMemo(() => (period === "day" ? undefined : periodReview(onboarding, period, step, now)), [onboarding, period, step, now])

  const choose = (next: Period) => {
    setPeriod(next)
    setStep(0)
    setOpen(false)
  }
  const move = (by: number) => {
    setStep((n) => n + by)
    setOpen(false)
  }
  const canBack = day ? day.canBack : range!.canBack
  const canForward = day ? day.canForward : range!.canForward
  const label = day ? dayWords(day) : range!.label
  const unit = period === "day" ? "day" : period

  return (
    <View style={styles.wrap}>
      <View style={styles.controls}>
        <View style={styles.stepper}>
          <Arrow label={`Previous ${unit}`} disabled={!canBack} onPress={() => move(1)}>
            <CaretLeft size={16} color={card.chevron} />
          </Arrow>
          <Text style={styles.stepperText} numberOfLines={1}>
            {label}
          </Text>
          <Arrow label={`Next ${unit}`} disabled={!canForward} onPress={() => move(-1)}>
            <CaretRight size={16} color={card.chevron} />
          </Arrow>
        </View>
        <View style={styles.segments} accessibilityRole="tablist" accessibilityLabel="Period">
          {PERIODS.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => choose(p.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: period === p.id }}
              style={[styles.segment, period === p.id && styles.segmentOn]}
            >
              <Text style={[styles.segmentText, period === p.id && styles.segmentTextOn]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {day ? <DayView day={day} open={open} onToggle={() => setOpen((v) => !v)} /> : <RangeView review={range!} />}
    </View>
  )
}

/** "Yesterday · Thu Oct 29", or "Wed Oct 28" for an earlier day. */
function dayWords(day: ReviewDay) {
  const when = `${weekdayOf(day.date)} ${monthDay(day.date)}`
  return day.title === "Yesterday" ? `Yesterday · ${when}` : when
}

/* ------------------------------------------------------------------ day -- */

function DayView({ day, open, onToggle }: { day: ReviewDay; open: boolean; onToggle: () => void }) {
  const onboarding = useOnboarding()
  const started = dayOfAt(onboarding.membership?.approvedAt ?? onboarding.membership?.startedAt ?? MEMBER.start)
  const planDay = daysBetween(dayFrom(started), day.date) + 1

  if (day.status === "none")
    return (
      <Card style={styles.empty}>
        <Text style={type.title}>Nothing logged for this day yet</Text>
        <Text style={type.label}>Add what you ate and did and the day gets a score.</Text>
        <Pressable onPress={() => openTab("/results", "plan")} accessibilityRole="button" style={({ pressed }) => [styles.emptyLink, pressed && styles.pressed]}>
          <Text style={styles.link}>Open Record</Text>
        </Pressable>
      </Card>
    )

  return <TopicDay day={day} planDay={planDay} />
}

/** One day against the six topics (Journey_14 screen 39, "Each topic
    against its goal"): the day's score on a teal tinted card, then Exercise, Eat,
    Sleep, Mind, Medication and Measure, each scored against its own goal
    with what she did printed beside it, and the day is the plain average of
    the six. The screen says so, because a score nobody can reconstruct is a
    score nobody trusts. A miss is already carried into today's plan, so the
    review is not a verdict, it is a handover. Each row opens its topic and
    the card opens the figures under it. */
function TopicDay({ day, planDay }: { day: ReviewDay; planDay: number }) {
  const { scores, average } = topicScores(day.date)
  const yesterday = day.title === "Yesterday"
  const when = yesterday ? "yesterday" : `${weekdayOf(day.date)} ${monthDay(day.date)}`
  const open = () => router.push({ pathname: "/yesterday", params: { date: yesterday ? "yesterday" : day.day } })
  return (
    <>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`How ${when} went, ${average} out of 100. ${verdictOf(scores)} Open the numbers behind it.`} style={({ pressed }) => [styles.dark, pressed && styles.pressed]}>
        <ScoreDial value={average} size={56} stroke={4} tone={chart.data} track={chart.dataTrack} ink={ink.strong} />
        <View style={styles.fill}>
          <Text style={styles.darkTitle}>{planDay > 0 && !yesterday ? `Day ${planDay} · how it went` : `How ${when} went`}</Text>
          <Text style={styles.darkBody}>{verdictOf(scores)}</Text>
          <View style={styles.darkLink}>
            <Text style={styles.darkLinkText}>Tap for the numbers behind it</Text>
            <CaretRight size={12} color={ink.primary} />
          </View>
        </View>
      </Pressable>

      <View style={styles.logged}>
        <View style={styles.topicHead}>
          <Text style={styles.loggedTitle} accessibilityRole="header">
            Each topic, against its goal
          </Text>
          <Text style={type.label}>{yesterday ? "yesterday" : when}</Text>
        </View>
        <Card style={styles.loggedCard}>
          {scores.map((t, i) => {
            const topic = topicOf(t.id)!
            return (
              <Pressable
                key={t.id}
                onPress={() => router.push({ pathname: "/topic/[id]", params: { id: t.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${topic.name}, ${t.score} out of 100. ${t.line}`}
                style={({ pressed }) => [styles.topic, i > 0 && styles.rowRule, pressed && styles.rowPressed]}
              >
                <TopicTile topic={topic} size={32} />
                <View style={styles.fill}>
                  <Text style={type.title}>{t.id === "medication" ? "Medication" : topic.name}</Text>
                  <Text style={type.label} numberOfLines={1}>
                    {t.line}
                  </Text>
                </View>
                <Text style={[styles.topicScore, { color: TONE_INK[scoreTone(t.score)] }]}>{t.score}</Text>
                <CaretRight size={14} color={card.chevron} />
              </Pressable>
            )
          })}
        </Card>
      </View>

      <Takeaway text={HANDOVER} />
      <Foot>A topic scores against its own goal, and the day is the average of the six. Nothing is weighted behind your back.</Foot>
    </>
  )
}

/** The score ring: 40 pt, a 4 pt teal stroke on its track, the number inside
    (the design's ring; no number when the day has no score). */
function ScoreCircle({ percent, none, of }: { percent?: number; none: string; of: string }) {
  const size = 40
  const stroke = 4
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(percent ?? 0, 100))
  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel={percent === undefined ? `${of}, ${none.toLowerCase()}` : `${of}, ${percent} percent`}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={chart.dataTrack} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={chart.data} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(p / 100) * c} ${c}`} fill="none" />
      </Svg>
      <View style={styles.ringLabel}>
        <Text style={styles.ringText}>{percent === undefined ? "—" : `${percent}%`}</Text>
      </View>
    </View>
  )
}


function GoalRow({ goal: g, day, open, onToggle }: { goal: GoalDay; day: ReviewDay; open: boolean; onToggle: () => void }) {
  const look = LOOK[g.goal.id]
  const scored = day.status === "complete"
  const badge = scored ? badgeOf(g.state) : "none"
  const energy = g.goal.id === "energy" ? day.energy : undefined
  const expandable = !!energy
  const value = valueOf(g)
  const share = g.goal.id === "smart" || g.value === undefined ? undefined : Math.min(1, Math.max(0, g.credit ?? (g.goal.id === "energy" ? 0 : g.value / g.goal.target)))
  const sub = subLine(g, scored)
  const press = expandable ? onToggle : () => router.push("/history")
  return (
    <View style={styles.rowRule}>
      <Pressable
        onPress={press}
        accessibilityRole="button"
        accessibilityState={expandable ? { expanded: open } : undefined}
        accessibilityLabel={`${nameOf(g.goal)}, ${value.say}, ${sub}${scored ? `, ${badgeWord(badge).toLowerCase()}` : ""}. ${expandable ? (open ? "Collapse energy breakdown" : "Expand energy breakdown") : "Open history"}`}
        style={({ pressed }) => [styles.goal, pressed && styles.rowPressed]}
      >
        <View style={[styles.tile, { backgroundColor: look.tint }]}>
          <look.Icon size={16} color={look.ink} />
        </View>
        <View style={styles.fill}>
          <View style={styles.goalTop}>
            <Text style={type.title}>{nameOf(g.goal)}</Text>
            <Text style={type.value}>
              {value.main}
              {!!value.unit && <Text style={type.unit}>{value.unit}</Text>}
            </Text>
          </View>
          {share !== undefined && (
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${share * 100}%`, backgroundColor: look.bar }]} />
            </View>
          )}
          <View style={styles.goalBottom}>
            <Text style={[type.label, styles.fill]}>{sub}</Text>
            <StateBadge badge={badge} />
          </View>
        </View>
        <View style={styles.caret}>{expandable ? <CaretDown size={16} color={card.chevron} style={open ? styles.flip : undefined} /> : <CaretRight size={16} color={card.chevron} />}</View>
      </Pressable>
      {expandable && open && energy && (
        <View style={styles.energy}>
          <Sum label="Eaten" value={energy.food} />
          <Sum label="Resting metabolism, measured" value={energy.resting} />
          <Sum label="Active energy" note={energy.source.replace(/, synced.*/, "").replace(/^From/, "from")} value={energy.active} plus />
          <View style={styles.sumRule}>
            <Sum label="Energy out" value={energy.out} strong />
          </View>
          <Sum label={`${formatNumber(energy.out)} − ${formatNumber(energy.food)}`} value={energy.deficit} tail="kcal deficit" accent />
        </View>
      )}
    </View>
  )
}

/** The number on the row's right and how it reads aloud. */
function valueOf(g: GoalDay): { main: string; unit?: string; say: string } {
  const none = { main: "—", say: "not logged" }
  if (g.value === undefined) return none
  switch (g.goal.id) {
    case "energy":
      return { main: formatNumber(Math.round(g.value)), unit: " kcal deficit", say: `${formatNumber(Math.round(g.value))} kilocalorie deficit` }
    case "protein":
      return { main: formatNumber(Math.round(g.value)), unit: ` / ${g.goal.target} g`, say: `${Math.round(g.value)} of ${g.goal.target} grams` }
    case "calcium":
      return { main: formatNumber(Math.round(g.value)), unit: ` / ${formatNumber(g.goal.target)} mg`, say: `${Math.round(g.value)} of ${g.goal.target} milligrams` }
    case "water":
      return { main: formatNumber(Math.round(g.value)), unit: ` / ${formatNumber(g.goal.target)} ml`, say: `${Math.round(g.value)} of ${g.goal.target} millilitres` }
    case "exercise":
      return { main: formatNumber(Math.round(g.value)), unit: ` / ${g.goal.target} min`, say: `${Math.round(g.value)} of ${g.goal.target} minutes` }
    case "smart":
      return { main: g.value ? "Done" : "Skipped", say: g.value ? "done" : "skipped" }
    case "lights": {
      const h = Math.floor(g.value / 60) % 24
      const clock = `${h % 12 || 12}:${String(g.value % 60).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
      return { main: clock, say: clock }
    }
  }
}

/** The line under the bar: what is left, or the goal. */
function subLine(g: GoalDay, scored: boolean): string {
  if (g.value === undefined) return "Not logged"
  if (!scored && g.goal.id !== "exercise") return "Day not scored"
  switch (g.goal.id) {
    case "protein":
    case "calcium":
    case "water": {
      const short = Math.round(g.goal.target - g.value)
      return short > 0 ? `${formatNumber(short)} ${g.goal.unit} short` : g.goal.targetWords
    }
    case "smart":
      return g.value ? "Session done" : "Not done yet"
    default:
      return g.goal.targetWords
  }
}

function Sum({ label, value, note, plus, strong, accent, tail = "kcal" }: { label: string; value: number; note?: string; plus?: boolean; strong?: boolean; accent?: boolean; tail?: string }) {
  return (
    <View style={styles.sum}>
      <View style={styles.fill}>
        <Text style={[type.label, strong && styles.sumStrong]}>{label}</Text>
        {!!note && <Text style={type.caption}>{note}</Text>}
      </View>
      <Text style={[type.value, accent && { color: ink.primary }]}>
        {plus ? "+" : ""}
        {formatNumber(Math.round(value))}
        <Text style={type.unit}>{` ${tail}`}</Text>
      </Text>
    </View>
  )
}

/* ------------------------------------------------------- week and month -- */

function RangeView({ review }: { review: PeriodReview }) {
  const week = review.kind === "week"
  const none = review.percent === undefined
  const verdictWord = none ? "" : ` · ${rangeVerdict(review.percent!)} ${week ? "week" : "month"}`
  return (
    <>
      <Card style={styles.score}>
        <View style={styles.scoreHead}>
          <ScoreCircle percent={review.percent} none="No log" of={week ? "Week score" : "Month score"} />
          <View style={styles.fill}>
            <Text style={type.section}>{week ? "Week score" : "Month score"}</Text>
            <Text style={type.label}>{`Average of ${review.scored} days · ${review.metGoals} of ${review.total} goals met${verdictWord}`}</Text>
          </View>
        </View>
        <Bars bars={review.bars} week={week} />
        {review.rows.map((r) => (
          <RangeRow key={r.goal.id} row={r} />
        ))}
      </Card>
      <Takeaway text={review.insight} />
      <Logged rows={review.logged.map((l) => ({ label: l.label, value: l.value }))} />
    </>
  )
}

const rangeVerdict = (percent: number) => (percent >= 85 ? "great" : percent >= 70 ? "solid" : percent >= 55 ? "steady" : "building")

function Bars({ bars, week }: { bars: PeriodReview["bars"]; week: boolean }) {
  return (
    <View style={styles.bars} accessible accessibilityLabel={`Scores: ${bars.map((b) => `${b.label} ${b.percent ?? "not scored"}`).join(", ")}`}>
      {bars.map((b, i) => (
        <View key={i} style={styles.barCol}>
          {!week && <Text style={styles.barPercent}>{b.percent !== undefined ? `${b.percent}%` : "—"}</Text>}
          <View style={styles.barTrack}>
            <View style={[styles.barColFill, { height: `${b.percent ?? 0}%`, backgroundColor: b.current ? chart.dataStrong : chart.dataPast }]} />
          </View>
          <Text style={styles.barLabel} numberOfLines={1}>
            {b.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

function RangeRow({ row }: { row: PeriodRow }) {
  const look = LOOK[row.goal.id]
  const share = row.of ? row.met / row.of : 0
  return (
    <Pressable
      onPress={() => router.push("/history")}
      accessibilityRole="button"
      accessibilityLabel={`${nameOf(row.goal)}, ${row.title}, ${row.note}, ${badgeWord(row.state).toLowerCase()}. Open history`}
      style={({ pressed }) => [styles.goal, styles.rowRule, pressed && styles.rowPressed]}
    >
      <View style={[styles.tile, { backgroundColor: look.tint }]}>
        <look.Icon size={16} color={look.ink} />
      </View>
      <View style={styles.fill}>
        <View style={styles.goalTop}>
          <Text style={type.title}>{nameOf(row.goal)}</Text>
          <Text style={type.value}>{row.title}</Text>
        </View>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${share * 100}%`, backgroundColor: look.bar }]} />
        </View>
        <View style={styles.goalBottom}>
          <Text style={[type.label, styles.fill]}>{row.note}</Text>
          <StateBadge badge={row.state} />
        </View>
      </View>
      <View style={styles.caret}>
        <CaretRight size={16} color={card.chevron} />
      </View>
    </Pressable>
  )
}

/* ------------------------------------------------------------- pieces -- */

const badgeWord = (b: Badge) => (b === "met" ? "Met" : b === "close" ? "Close" : b === "behind" ? "Behind" : "Not scored")

/** MET (green tint, a check), CLOSE (amber tint, an amber dot) or BEHIND
    (grey): the word always says it, never colour alone. Amber stays on the
    dot, the word is dark (amber text does not pass AA). */
function StateBadge({ badge }: { badge: Badge }) {
  if (badge === "none") return null
  const tone =
    badge === "met"
      ? { bg: color.okTint, fg: ink.good }
      : badge === "close"
        ? { bg: color.amberTint, fg: ink.content }
        : { bg: surface.inset, fg: ink.detail }
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      {badge === "met" ? <Check size={10} weight="bold" color={chart.inRange} /> : badge === "close" ? <View style={styles.dot} /> : null}
      <Text style={[type.tag, { color: tone.fg }]}>{badgeWord(badge)}</Text>
    </View>
  )
}

function Takeaway({ text, fix }: { text: string; fix?: string }) {
  return (
    <View style={styles.takeaway}>
      <Text style={type.body}>{text}</Text>
      {!!fix && (
        <Pressable
          onPress={() => router.push({ pathname: "/log-meal", params: { slot: "dinner", via: "type" } })}
          accessibilityRole="link"
          style={({ pressed }) => [styles.takeLink, pressed && styles.pressed]}
        >
          <Text style={styles.link}>{`Add ${fix} to tonight's plan`}</Text>
        </Pressable>
      )}
    </View>
  )
}

type LoggedRow = { label: string; value: string; detail?: string; to?: string }

function Logged({ rows }: { rows: LoggedRow[] }) {
  return (
    <View style={styles.logged}>
      <Text style={styles.loggedTitle} accessibilityRole="header">
        What you logged
      </Text>
      <Card style={styles.loggedCard}>
        {rows.map((r, i) => {
          const body = (
            <>
              <Text style={[type.label, styles.loggedLabel]}>{r.label}</Text>
              <Text style={styles.loggedValue} numberOfLines={2}>
                {r.value}
                {!!r.detail && <Text style={type.meta}>{` · ${r.detail}`}</Text>}
              </Text>
              {r.to ? <CaretRight size={14} color={card.chevron} /> : null}
            </>
          )
          return r.to ? (
            <Pressable key={r.label} onPress={() => router.push(r.to as never)} accessibilityRole="button" style={({ pressed }) => [styles.loggedRow, i > 0 && styles.rowRule, pressed && styles.rowPressed]}>
              {body}
            </Pressable>
          ) : (
            <View key={r.label} style={[styles.loggedRow, i > 0 && styles.rowRule]}>
              {body}
            </View>
          )
        })}
      </Card>
    </View>
  )
}

function Arrow({ label, disabled, onPress, children }: { label: string; disabled: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={{ top: 4, bottom: 4, left: 6, right: 6 }}
      style={({ pressed }) => [styles.arrow, disabled && styles.arrowOff, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.item },
  fill: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  rowPressed: { backgroundColor: surface.inset },
  rowRule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  link: { ...type.link, color: ink.primary },

  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline, minHeight: 44 },
  stepper: {
    flex: 1,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: hairline.outline,
    backgroundColor: color.background,
    boxShadow: card.shadowXs,
  },
  stepperText: { ...type.metaStrong, flex: 1, textAlign: "center", color: ink.content },
  arrow: { width: 28, height: 36, alignItems: "center", justifyContent: "center" },
  arrowOff: { opacity: 0.35 },
  segments: {
    width: 148,
    height: 36,
    flexDirection: "row",
    padding: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: hairline.outline,
    backgroundColor: color.background,
  },
  segment: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 999 },
  segmentOn: { backgroundColor: color.primaryTint },
  segmentText: { ...type.meta, color: ink.secondary },
  segmentTextOn: { ...type.metaStrong, color: ink.primary },

  ringLabel: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  ringText: { ...type.caption, fontFamily: font.semibold, color: ink.strong, fontVariant: ["tabular-nums"] },

  score: { paddingBottom: 0, gap: 0 },
  scoreHead: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingBottom: space.item },
  empty: { gap: space.stack, alignItems: "flex-start" },
  emptyLink: { minHeight: 44, justifyContent: "center" },

  goal: { flexDirection: "row", alignItems: "flex-start", gap: space.lead, paddingVertical: space.rowY },
  tile: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  goalTop: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.item },
  goalBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline },
  bar: { height: 4, borderRadius: 2, overflow: "hidden", backgroundColor: chart.track, marginVertical: space.stack },
  barFill: { height: 4, borderRadius: 2 },
  caret: { marginTop: 6 },
  flip: { transform: [{ rotate: "180deg" }] },

  badge: { flexDirection: "row", alignItems: "center", gap: space.stack, height: 20, paddingHorizontal: 8, borderRadius: 999 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.amber },

  energy: { marginLeft: 28 + space.lead, marginBottom: space.item, padding: space.compact, borderRadius: 8, backgroundColor: surface.inset, gap: space.inline },
  sum: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.inline },
  sumRule: { paddingTop: space.inline, borderTopWidth: 1, borderTopColor: hairline.outline },
  sumStrong: { ...type.metaStrong, color: ink.content },

  bars: { flexDirection: "row", alignItems: "flex-end", gap: space.inline, paddingBottom: space.item },
  barCol: { flex: 1, alignItems: "center", gap: space.stack },
  barTrack: { width: "100%", height: 40, borderRadius: 4, backgroundColor: chart.dataTrack, justifyContent: "flex-end", overflow: "hidden" },
  barColFill: { width: "100%", borderRadius: 4 },
  barPercent: { ...type.metaStrong, color: ink.content },
  barLabel: { ...type.caption },

  dark: { flexDirection: "row", alignItems: "center", gap: space.lead, padding: space.item, borderRadius: 8, backgroundColor: color.primarySoft, borderWidth: 1, borderColor: color.primaryEdge },
  darkTitle: { ...type.section },
  darkBody: { ...type.label, color: ink.detail, marginTop: 2 },
  darkLink: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: space.inline },
  darkLinkText: { ...type.metaStrong, color: ink.primary },
  topicHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topic: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
  topicScore: { ...type.stat, minWidth: 32, textAlign: "right", fontVariant: ["tabular-nums"] },
  takeaway: { gap: space.stack, padding: space.card, borderRadius: 8, backgroundColor: color.primarySoft },
  takeLink: { minHeight: 44, justifyContent: "center" },

  logged: { gap: space.item, paddingTop: space.inline },
  loggedTitle: { ...type.sectionLabel },
  loggedCard: { paddingVertical: 0, gap: 0 },
  loggedRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: space.inline, paddingVertical: space.card },
  loggedLabel: { width: 72 },
  loggedValue: { ...type.value, flex: 1, textAlign: "right" },
})
