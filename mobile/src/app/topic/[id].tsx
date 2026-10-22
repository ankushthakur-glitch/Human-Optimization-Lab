import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { PageNotFoundState } from "@/components/error-state"
import { MeasureSheet } from "@/components/measure-sheet"
import { CaretRight, Check, Play, Warning } from "@/components/ph"
import { Block, Card, Tag, toast } from "@/components/record-kit"
import { Foot, Note, ScoreDial, TONE_INK, TargetCard, TopicHead, TopicPage, Ways, askAbout } from "@/components/topic-kit"
import { localDay } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { ALSO_TAKING, CARDIO, INTERACTION, LIFTS, SLEEP_LAST, WARMUP, rowOf, topicOf, type Topic, type Way } from "@/lib/topics"
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
    else setSheet(true)
  }

  return (
    <TopicPage sheet={sheet && <MeasureSheet onClose={() => setSheet(false)} />}>
      <TopicHead topic={topic} intro={topic.intro} />
      <TargetCard icon={topic.id} title={topic.target.replace(/ · 1,000 mg calcium$/, "")} detail={topic.detail} figure={logged ? row.text : topic.figure} />

      {topic.id === "exercise" && <Session />}
      {topic.id === "sleep" && <LastNight />}

      <Ways ways={topic.ways} onPick={pick} picked={logged?.way} />

      {topic.id === "medication" && <AlsoTaking />}
      {!!topic.tip && topic.id !== "medication" && <Note>{topic.tip}</Note>}
      <Foot>{topic.foot}</Foot>
    </TopicPage>
  )
}

/* ------------------------------------------------------------- exercise -- */

/** Today's session in full: the warm-up, every lift with its sets and
    reps, the load, and what was lifted last time; Form opens how it is
    done. Loads are read straight from what was logged, never prescribed
    blind. */
function Session() {
  return (
    <Block title="Today's session" meta="built for you">
      <View style={styles.table}>
        <Line name={WARMUP.name} detail={WARMUP.detail} end={WARMUP.say} shaded />
        {LIFTS.map((l) => (
          <View key={l.id} style={[styles.line, styles.rule]}>
            <Text style={[styles.lineName, styles.fill]}>{l.name}</Text>
            <Pressable
              onPress={() => router.push({ pathname: "/lift/[id]", params: { id: l.id } })}
              accessibilityRole="button"
              accessibilityLabel={`How to do the ${l.name}`}
              hitSlop={8}
              style={({ pressed }) => [styles.form, pressed && styles.pressed]}
            >
              <Play size={8} weight="fill" color={ink.primary} />
              <Text style={styles.formText}>Form</Text>
            </Pressable>
            <Text style={type.meta}>{l.last === "same" ? "same" : `last ${l.last}`}</Text>
            <Text style={[styles.sets, type.label]}>{l.sets}</Text>
            <Text style={styles.load}>{`${l.load} lb`}</Text>
          </View>
        ))}
        <Line name={CARDIO.name} detail={CARDIO.detail} end={CARDIO.say} shaded rule />
      </View>
    </Block>
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

  table: { borderRadius: 10, overflow: "hidden", backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge, boxShadow: card.shadowXs },
  line: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingHorizontal: space.item, paddingVertical: 10 },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  shaded: { backgroundColor: surface.inset },
  lineName: { ...type.title, color: ink.strong },
  lineEnd: { ...type.metaStrong, color: ink.strong },
  sets: { minWidth: 34, textAlign: "right" },
  load: { ...type.value, minWidth: 44, textAlign: "right", fontVariant: ["tabular-nums"] },
  form: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: color.primarySoft },
  formText: { ...type.tag, fontFamily: font.medium, color: ink.primary },

  score: { flexDirection: "row", alignItems: "center", gap: space.lead, padding: space.item, borderRadius: 12, backgroundColor: color.amberTint, borderWidth: 1, borderColor: color.amberEdge },
  part: { width: 78 },

  flag: { backgroundColor: color.amberTint },
  verdict: { ...type.metaStrong },
  add: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline, paddingHorizontal: space.item, paddingVertical: 10, borderTopWidth: 1, borderTopColor: hairline.rule },
  alert: { flexDirection: "row", gap: space.lead, backgroundColor: color.amberTint, borderWidth: 1, borderColor: color.amberEdge },
  alertTitle: { ...type.title, color: "#A95413" },
  alertBody: { fontSize: 13, lineHeight: 19, marginTop: space.stack },
  alertBold: { fontFamily: font.semibold, color: ink.strong },
})
