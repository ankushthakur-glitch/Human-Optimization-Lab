import { router } from "expo-router"
import * as React from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import { formatNumber } from "@/components/charts"
import { PrimaryButton } from "@/components/hol"
import { NeedsYou, Upcoming } from "@/components/home-free"
import { HomeHeader, StatusBanner } from "@/components/home-header"
import { BowlFood, Bone, CaretRight, Flame, Lightbulb, PersonSimpleRun } from "@/components/ph"
import { Block, Card, HUE, Hero, Rise, type Hue } from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { TrendCard } from "@/components/trend-tile"
import { reviewDay, type GoalDay, type ReviewDay, type ReviewGoalId } from "@/lib/daily-review"
import { useMarkers } from "@/lib/experience"
import { localDay } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { color, font, ink, space, type } from "@/lib/theme"
import { classify, homeTiles, watchList, type Trend } from "@/lib/trends"

/* An Optimization member's home (redesigned 12 Oct 2026). The client's
   Daily Review screen is the starting point; the free home's care and
   record parts sit around it, kept short so the page reads in about a
   screen and a half:
   - what needs her, one row, as on the free home;
   - Yesterday, a teal hero: the score ring, goals met and the week
     average, the week's scores as small bars, and the one fix;
   - her goals as four tiles, each in its own colour (as in the client's
     screen): the amount against the target, a bar to the goal and the
     last seven days as small columns; the tiles open the full review;
   - today's plan, the screen's one primary action;
   - what is coming up, one row, and her trends as a sideways strip of
     graphs. Medicines and new visits live on the Record tab. */

export function OptimizedHome() {
  const onboarding = useOnboarding()
  const day = reviewDay(onboarding, 1)
  const week = [7, 6, 5, 4, 3, 2, 1].map((back) => reviewDay(onboarding, back))

  return (
    <TabScreen tab="home" header={<HomeHeader line="Here's your day." />}>
      <View style={styles.page}>
        <StatusBanner variant="member" tab="home" />
        <NeedsYou />
        <Rise at={1} id="home:yesterday">
          <YesterdayHero day={day} week={week} />
        </Rise>
        <Rise at={2} id="home:goals">
          <Block title="Yesterday's goals" link={{ label: "Details", onPress: openReview }}>
            <View style={styles.tiles}>
              {day.goals.map((g) => (
                <GoalTile key={g.goal.id} goal={g} />
              ))}
            </View>
          </Block>
        </Rise>
        <PrimaryButton onPress={openToday}>See today's plan</PrimaryButton>
        <Upcoming />
        <TrendStrip />
      </View>
    </TabScreen>
  )
}

const openToday = () => router.push(`/day/${localDay(new Date())}`)
const openReview = () => router.push("/review")

/* ---------------------------------------------------------- yesterday -- */

function YesterdayHero({ day, week }: { day: ReviewDay; week: ReviewDay[] }) {
  const head = day.status === "complete" ? `${day.met} of ${day.total} goals met` : day.status === "partial" ? "Partial day, not scored" : "Nothing logged"
  return (
    <Hero onPress={openReview}>
      <View style={styles.heroBody} accessible accessibilityLabel={`Yesterday, daily goal score ${day.percent ?? "none"}${day.percent !== undefined ? " percent" : ""}, ${head}. Opens your daily review`}>
        <View style={styles.heroTop}>
          <WhiteRing percent={day.percent} />
          <View style={styles.fill}>
            <Text style={styles.heroLabel}>Yesterday</Text>
            <Text style={styles.heroTitle}>Daily goal score</Text>
            <Text style={styles.heroLine}>{head}</Text>
          </View>
          <CaretRight size={18} color={ink.onColor} />
        </View>

        <View style={styles.weekHead}>
          <Text style={styles.heroLabel}>Past 7 days</Text>
          {day.weekAverage !== undefined && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>{`${day.weekAverage}% average`}</Text>
            </View>
          )}
        </View>
        <WeekStrip week={week} />

        <View style={styles.tip}>
          <Lightbulb size={16} color={color.amber} />
          <Text style={[type.label, styles.tipText]}>{day.insight}</Text>
        </View>
      </View>
    </Hero>
  )
}

/** The score as a white ring on the hero's teal. */
function WhiteRing({ percent }: { percent?: number }) {
  const size = 84
  const sw = 8
  const r = (size - sw) / 2
  const c = 2 * Math.PI * r
  const share = percent !== undefined ? Math.min(percent, 100) / 100 : 0
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.22)" strokeWidth={sw} fill="none" />
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
          {percent !== undefined ? percent : "No"}
          <Text style={styles.ringUnit}>{percent !== undefined ? "%" : " log"}</Text>
        </Text>
      </View>
    </View>
  )
}

/** The week's daily scores as white columns, yesterday the brightest. */
function WeekStrip({ week }: { week: ReviewDay[] }) {
  const H = 44
  return (
    <View style={styles.week}>
      {week.map((d, i) => {
        const last = i === week.length - 1
        const h = d.percent !== undefined ? Math.max(4, (H * d.percent) / 100) : 4
        return (
          <View key={d.day} style={styles.weekCol} accessible accessibilityLabel={`${d.date.toLocaleDateString("en-US", { weekday: "long" })}, ${d.percent !== undefined ? `${d.percent} percent` : d.status === "partial" ? "partial day" : "nothing logged"}`}>
            <View style={[styles.weekTrack, { height: H }]}>
              <View
                style={[
                  styles.weekBar,
                  { height: h },
                  d.percent === undefined ? styles.weekEmpty : last ? styles.weekLast : styles.weekPast,
                ]}
              />
            </View>
            <Text style={[styles.weekLabel, last && styles.weekLabelLast]}>{d.date.toLocaleDateString("en-US", { weekday: "narrow" })}</Text>
          </View>
        )
      })}
    </View>
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
        <View style={[styles.bar, { backgroundColor: hue.tint }]}>
          <View style={[styles.barFill, { width: `${share * 100}%`, backgroundColor: hue.ink }]} />
        </View>
        <View style={styles.micro}>
          {goal.week.map((w, i) => (
            <View
              key={i}
              style={[
                styles.microBar,
                {
                  height: w.value !== undefined ? Math.max(3, (24 * w.value) / max) : 3,
                  backgroundColor: hue.ink,
                  opacity: w.value === undefined ? 0.15 : i === goal.week.length - 1 ? 1 : w.partial ? 0.2 : 0.35,
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

/** Her trends as a sideways strip of graphs, worth watching first. */
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
    <Block title="Your trends" onSeeAll={() => router.push("/results")}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.strip}>
        {tiles.map((t) => (
          <View key={t.id} style={styles.trend}>
            <TrendCard trend={t} onPress={() => router.push({ pathname: "/biomarker/[id]", params: { id: t.id } })} />
          </View>
        ))}
      </ScrollView>
    </Block>
  )
}

/* ------------------------------------------------------------- styles -- */

const WHITE_SOFT = "rgba(255, 255, 255, 0.82)"

const styles = StyleSheet.create({
  page: { gap: space.section, paddingBottom: space.section },
  fill: { flex: 1 },
  pressed: { opacity: 0.7 },

  heroBody: { padding: space.gutter, gap: space.item },
  heroTop: { flexDirection: "row", alignItems: "center", gap: space.gutter },
  heroLabel: { ...type.label, color: WHITE_SOFT },
  heroTitle: { ...type.section, fontFamily: font.semibold, color: ink.onColor },
  heroLine: { ...type.label, color: ink.onColor },
  ringCenter: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  ringNumber: { ...type.hero, fontSize: 22, color: ink.onColor },
  ringUnit: { ...type.unit, color: WHITE_SOFT },

  weekHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.stack },
  pill: { borderRadius: 999, paddingHorizontal: space.inline, paddingVertical: space.line, backgroundColor: "rgba(255, 255, 255, 0.18)" },
  pillText: { ...type.metaStrong, color: ink.onColor },
  week: { flexDirection: "row", justifyContent: "space-between" },
  weekCol: { alignItems: "center", gap: space.stack, flex: 1 },
  weekTrack: { justifyContent: "flex-end" },
  weekBar: { width: 10, borderRadius: 5 },
  weekPast: { backgroundColor: "rgba(255, 255, 255, 0.45)" },
  weekLast: { backgroundColor: ink.onColor },
  weekEmpty: { backgroundColor: "rgba(255, 255, 255, 0.2)" },
  weekLabel: { ...type.caption, color: WHITE_SOFT },
  weekLabelLast: { fontFamily: font.semibold, color: ink.onColor },

  tip: { flexDirection: "row", gap: space.inline, padding: space.compact, borderRadius: 8, backgroundColor: color.background },
  tipText: { flex: 1, color: ink.content },

  tiles: { flexDirection: "row", flexWrap: "wrap", gap: space.item },
  tileWrap: { flexBasis: "47%", flexGrow: 1 },
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

