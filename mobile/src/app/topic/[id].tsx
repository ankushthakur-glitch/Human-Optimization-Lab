import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { PageNotFoundState } from "@/components/error-state"
import { PrimaryButton } from "@/components/hol"
import { MeasureSheet } from "@/components/measure-sheet"
import { CaretRight, Check, ForkKnife, Play, Warning } from "@/components/ph"
import { Block, Card, Group, HUE, NeedsRow, Tag, toast } from "@/components/record-kit"
import { Switch } from "@/components/settings-rows"
import { Sheet } from "@/components/sheet"
import { ScoreDial, TargetCard, TopicPage, Ways, askAbout } from "@/components/topic-kit"
import { MEAL_SLOTS, localDay, mealName, mealsOn, totalsOf, type Meal } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { ALSO_TAKING, CARDIO, INTERACTION, LIFTS, SLEEP_LAST, WARMUP, rowOf, topicOf, type Topic, type Way } from "@/lib/topics"
import { formatNumber } from "@/lib/trends"
import { card, chart, color, font, hairline, ink, space, surface, type } from "@/lib/theme"

/* One topic of the plan, opened from a row on Today (Journey_14 screens 31
   and 33 to 37; the lift's own page is /lift/[id]). Every topic opens the
   same way: today's target on a dark card, then four ways to answer it, so
   a patient never learns a second pattern. What each topic adds around the
   four is its own evidence: Exercise the whole session with each lift's
   load beside last time's, Sleep last night's score and the four parts that
   made it, Medication what she also takes and screened against what was
   prescribed. A way that answers the topic ("Do it as written", "Mark it
   taken") is logged here and Today turns the row to done; the others open
   the screen that already does it, or the assistant, in her own words. */

export default function TopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const topic = topicOf(id)
  if (!topic) return <PageNotFoundState />
  return <TopicBody topic={topic} />
}

function TopicBody({ topic }: { topic: Topic }) {
  const s = useOnboarding()
  const [sheet, setSheet] = React.useState(false)
  const [part, setPart] = React.useState(false)
  const day = localDay()
  const row = rowOf(s, topic, day)
  const logged = s.topicLog?.[day]?.[topic.id]

  function pick(way: Way) {
    const act = way.act
    if (act.kind === "done") {
      s.save({ topicLog: { ...s.topicLog, [day]: { ...s.topicLog?.[day], [topic.id]: { way: way.id, at: new Date().toISOString() } } } })
      toast(`${topic.name === "Medication & supplements" ? "Medication" : topic.name} logged. ${way.badge}.`)
    } else if (act.kind === "go") router.push({ pathname: act.href as never, params: act.params })
    else if (act.kind === "ask") askAbout(act.ask)
    else if (act.kind === "part") setPart(true)
    else setSheet(true)
  }

  return (
    <TopicPage
      title={topic.id === "medication" ? "Medication" : topic.name}
      sheet={(sheet && <MeasureSheet onClose={() => setSheet(false)} />) || (part && <PartSheet onClose={() => setPart(false)} />)}>
      <View style={styles.chip}>
        <Tag tone="primary">{topic.tag}</Tag>
      </View>
      <TargetCard icon={topic.id} title={topic.target.replace(/ · 1,000 mg calcium$/, "")} detail={topic.detail} figure={logged ? row.text : topic.figure} />

      {topic.id === "exercise" && <Session />}
      {topic.id === "eat" && <TodaysMeals />}
      {topic.id === "sleep" && <LastNight />}

      <Ways ways={topic.ways} onPick={pick} picked={logged?.way} />

      {topic.id === "medication" && <AlsoTaking />}
    </TopicPage>
  )
}

/* ------------------------------------------------------------- exercise -- */

/** Today's session in full: the warm-up, every lift with its sets and
    reps, the load, and what was lifted last time; Form opens how it is
    done. Loads are read straight from what was logged, never prescribed
    blind. */
function Session() {
  const s = useOnboarding()
  const log = s.exercises?.[localDay()]
  // A lift she has saved is done: it drops to the foot of the list, struck
  // through and closed, while the rest stay open in the plan's order.
  const done = (id: string) => !!log?.[id]
  const lifts = [...LIFTS.filter((l) => !done(l.id)), ...LIFTS.filter((l) => done(l.id))]
  return (
    <Block title="Today's session" meta="built for you">
      <View style={styles.table}>
        <Line name={WARMUP.name} detail={WARMUP.detail} end={WARMUP.say} shaded />
        {lifts.map((l) => {
          const finished = done(l.id)
          return (
            <View key={l.id} style={[styles.line, styles.rule, finished && styles.closed]}>
              <Pressable
                onPress={() => router.push({ pathname: "/lift/[id]", params: { id: l.id } })}
                disabled={finished}
                accessibilityRole="button"
                accessibilityState={{ disabled: finished }}
                accessibilityLabel={finished ? `${l.name}, done` : `How to do the ${l.name}`}
                hitSlop={8}
                style={({ pressed }) => [styles.lift, styles.fill, pressed && styles.pressed]}
              >
                <View style={[styles.playDot, finished && styles.playDotDone]}>
                  {finished ? <Check size={10} weight="bold" color={color.ok} /> : <Play size={10} weight="fill" color={ink.primary} />}
                </View>
                <Text style={[styles.lineName, styles.fill, finished && styles.struck]}>{l.name}</Text>
              </Pressable>
              <Text style={[styles.sets, type.label, finished && styles.struck]}>{l.sets}</Text>
              <Text style={[styles.load, finished && styles.struck]}>{`${l.load} lb`}</Text>
            </View>
          )
        })}
        <Line name={CARDIO.name} detail={CARDIO.detail} end={CARDIO.say} shaded rule />
      </View>
    </Block>
  )
}

/** "Do part of it": every part of today's session with a switch, on for
    what she finished. Lifts she has already logged start on; saving
    answers the topic with the parts she did. */
function PartSheet({ onClose }: { onClose: () => void }) {
  const s = useOnboarding()
  const day = localDay()
  const parts = [
    { id: "warmup", name: WARMUP.name, detail: WARMUP.detail },
    ...LIFTS.map((l) => ({ id: l.id, name: l.name, detail: `${l.sets} at ${l.load} lb` })),
    { id: "cardio", name: CARDIO.name, detail: CARDIO.detail },
  ]
  const before = s.topicLog?.[day]?.exercise?.parts
  const [done, setDone] = React.useState<Set<string>>(() => new Set(before ?? LIFTS.filter((l) => s.exercises?.[day]?.[l.id]).map((l) => l.id)))
  const flip = (id: string, on: boolean) =>
    setDone((was) => {
      const next = new Set(was)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  async function save() {
    const list = parts.filter((p) => done.has(p.id)).map((p) => p.id)
    await s.save({ topicLog: { ...s.topicLog, [day]: { ...s.topicLog?.[day], exercise: { way: "part", at: new Date().toISOString(), parts: list } } } })
    toast(`Exercise logged: ${list.length} of ${parts.length} done.`)
    onClose()
  }

  return (
    <Sheet title="What you finished" onClose={onClose}>
      <Text style={type.meta}>{`${done.size} of ${parts.length} done`}</Text>
      <View style={styles.table}>
        {parts.map((p, i) => {
          const on = done.has(p.id)
          return (
            <Pressable key={p.id} onPress={() => flip(p.id, !on)} accessibilityRole="switch" accessibilityState={{ checked: on }} style={[styles.line, styles.partRow, i > 0 && styles.rule]}>
              <View style={styles.fill}>
                <Text style={styles.lineName}>{p.name}</Text>
                <Text style={type.label}>{on ? `${p.detail}, done` : `${p.detail}, not done`}</Text>
              </View>
              <Switch value={on} onChange={(v) => flip(p.id, v)} label={p.name} />
            </Pressable>
          )
        })}
      </View>
      <PrimaryButton onPress={save} disabled={!done.size}>
        Save what you finished
      </PrimaryButton>
    </Sheet>
  )
}

function Line({ name, detail, end, shaded, rule }: { name: string; detail: string; end: string; shaded?: boolean; rule?: boolean }) {
  return (
    <View style={[styles.line, shaded && styles.shaded, rule && styles.rule]}>
      <Text style={[styles.lineName, styles.fill]}>{name}</Text>
      <Text style={type.label}>{detail}</Text>
      <Text style={styles.lineEnd}>{end}</Text>
    </View>
  )
}

/* ------------------------------------------------------------------ eat -- */

const HOW: Record<Meal["how"], string> = { photo: "Logged by photo", voice: "Logged by voice", typed: "Typed in", again: "Logged again", scan: "Logged by scan" }

/** What she has logged today, once she logs a meal: each with how it was
    logged, what it was and its energy and protein, and Swap to log it again. */
function TodaysMeals() {
  const s = useOnboarding()
  const logged = mealsOn(s, localDay())
  if (!logged.length) return null
  const mains = MEAL_SLOTS.filter((m) => m.main).length
  const count = new Set(logged.filter((m) => MEAL_SLOTS.find((x) => x.id === m.slot)?.main).map((m) => m.slot)).size
  return (
    <Block title="Today's meals" meta={`${count} of ${mains} logged`}>
      <Group>
        {logged.map((m) => {
          const totals = totalsOf([m])
          const facts = [
            mealName(m),
            totals.calories && `${formatNumber(Math.round(totals.calories.value))} kcal`,
            totals.protein && `${formatNumber(Math.round(totals.protein.value))} g protein`,
          ]
            .filter(Boolean)
            .join(", ")
          return (
            <NeedsRow
              key={m.id}
              icon={<ForkKnife size={16} color={HUE.teal.ink} />}
              title={MEAL_SLOTS.find((x) => x.id === m.slot)?.name ?? "Meal"}
              tag={{ tone: "ok", label: HOW[m.how] }}
              meta={facts}
              action={{ label: "Swap", quiet: true, onPress: () => router.push({ pathname: "/log-meal", params: { slot: m.slot } }) }}
              chevron={false}
            />
          )
        })}
      </Group>
    </Block>
  )
}

/* ---------------------------------------------------------------- sleep -- */

/** Last night's score under the target, and the four parts that made it:
    a score with no breakdown is a horoscope, naming what cost her the
    points is what makes it something to act on tonight. */
function LastNight() {
  return (
    <>
      <View style={styles.score}>
        <ScoreDial value={SLEEP_LAST.score} size={52} stroke={4} tone={color.amber} track={color.amberEdge} ink={ink.strong} />
        <View style={styles.fill}>
          <Text style={type.section}>Last night's sleep score</Text>
          <Text style={type.label}>{SLEEP_LAST.line}</Text>
        </View>
      </View>
      <Block title={`What made it ${SLEEP_LAST.score}`} meta="four parts">
        <View style={styles.table}>
          {SLEEP_LAST.parts.map((p, i) => (
            <View key={p.name} style={[styles.line, i > 0 && styles.rule]}>
              <Text style={[styles.lineName, styles.part]}>{p.name}</Text>
              <Text style={[type.label, styles.fill]}>{p.value}</Text>
              <Tag tone={p.tone === "good" ? "ok" : "soon"}>{p.verdict}</Tag>
            </View>
          ))}
        </View>
      </Block>
    </>
  )
}

/* ----------------------------------------------------------- medication -- */

/** What she takes that nobody prescribed, screened against the
    prescribed list as it is entered, and the one interaction that went to
    her doctor. The assistant runs the plan; the physician owns the
    prescription, and this is the one topic whose third path goes to a
    human, so the screen says so. */
function AlsoTaking() {
  return (
    <>
      <Block title="Also taking — added by you" meta="screened on entry">
        <View style={styles.table}>
          {ALSO_TAKING.map((m, i) => (
            <View key={m.name} style={[styles.line, i > 0 && styles.rule, m.interacts && styles.flag]}>
              {m.interacts ? <Warning size={14} color="#A95413" /> : <Check size={14} weight="bold" color={chart.inRange} />}
              <Text style={styles.lineName}>{m.name}</Text>
              <Text style={[type.label, styles.fill]} numberOfLines={1}>
                {m.dose}
              </Text>
              <Text style={[styles.verdict, { color: m.interacts ? "#A95413" : ink.good }]}>{m.interacts ? "Interaction" : "No interaction"}</Text>
            </View>
          ))}
          <Pressable onPress={() => router.push("/medications")} accessibilityRole="button" style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
            <Text style={type.label}>
              <Text style={styles.lineName}>Photograph a label to add</Text>
              {" — medication or supplement"}
            </Text>
            <CaretRight size={14} color={card.chevron} />
          </Pressable>
        </View>
      </Block>
      <Card style={styles.alert}>
        <Warning size={16} color="#A95413" />
        <View style={styles.fill}>
          <Text style={styles.alertTitle}>{INTERACTION.title}</Text>
          <Text style={[type.body, styles.alertBody]}>
            {INTERACTION.body} <Text style={styles.alertBold}>{INTERACTION.bold}</Text>
            {INTERACTION.tail}
          </Text>
        </View>
      </Card>
    </>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  // A finished lift: struck through, in the quiet grey.
  struck: { textDecorationLine: "line-through", color: ink.tertiary },
  playDotDone: { backgroundColor: color.okTint },
  // The programme chip sits left, over the target card, at its own width.
  chip: { alignSelf: "flex-start" },

  table: { borderRadius: 10, overflow: "hidden", backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge, boxShadow: card.shadowXs },
  line: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingHorizontal: space.item, paddingVertical: 10 },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  shaded: { backgroundColor: surface.inset },
  // A finished lift: a deeper grey than the warm-up and cardio rows, so it
  // reads as closed rather than as a heading.
  closed: { backgroundColor: "#ECEDF0" },
  lineName: { ...type.title, color: ink.strong },
  lineEnd: { ...type.metaStrong, color: ink.strong },
  sets: { minWidth: 34, textAlign: "right" },
  load: { ...type.value, minWidth: 44, textAlign: "right", fontVariant: ["tabular-nums"] },
  // The play icon leads the lift's name; the pair opens how it is done.
  lift: { flexDirection: "row", alignItems: "center", gap: space.inline },
  // The icon sits on the chip's pale teal, in a circle.
  playDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },

  score: { flexDirection: "row", alignItems: "center", gap: space.lead, padding: space.item, borderRadius: 12, backgroundColor: color.amberTint, borderWidth: 1, borderColor: color.amberEdge },
  part: { width: 78 },
  partRow: { paddingVertical: space.item },

  flag: { backgroundColor: color.amberTint },
  verdict: { ...type.metaStrong },
  add: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline, paddingHorizontal: space.item, paddingVertical: 10, borderTopWidth: 1, borderTopColor: hairline.rule },
  alert: { flexDirection: "row", gap: space.lead, backgroundColor: color.amberTint, borderWidth: 1, borderColor: color.amberEdge },
  alertTitle: { ...type.title, color: "#A95413" },
  alertBody: { fontSize: 13, lineHeight: 19, marginTop: space.stack },
  alertBold: { fontFamily: font.semibold, color: ink.strong },
})
