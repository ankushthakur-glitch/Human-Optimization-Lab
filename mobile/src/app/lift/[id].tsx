import { router, useLocalSearchParams } from "expo-router"
import { useVideoPlayer } from "expo-video"
import * as React from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import Svg, { Circle, Path } from "react-native-svg"

import { PageNotFoundState } from "@/components/error-state"
import { ExerciseVideoModal } from "@/components/exercise-video"
import { PrimaryButton } from "@/components/hol"
import { Play } from "@/components/ph"
import { Sheet } from "@/components/sheet"
import { Block, Group, Tag } from "@/components/record-kit"
import { amount, decimal, digits, saveLog } from "@/components/today-exercise-parts"
import { TextField } from "@/components/ui"
import { TopicPage } from "@/components/topic-kit"
import { localDay } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { LIFTS, liftOf, type Lift, type Pose } from "@/lib/topics"
import { card, color, font, hairline, ink, space, surface, type } from "@/lib/theme"

/* How to do one lift (Journey_14 screen 32), opened by "Form" on any lift
   in today's session. The video is the artefact; the three stills are the
   glanceable version for someone already standing at the rack, drawn from
   the side, the angle a form video is shot from, with the one cue that
   matters under each. Then three cues in plain language and the two
   mistakes that actually happen. It opens mid-set without losing her place:
   Session goes back to the lift list, Start set 1 to logging the sets.
   Every lift on every plan carries one. */

const CLIP = require("../../../assets/videos/exercise-demo.mp4")
const RATIO = 16 / 9

export default function LiftScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const lift = liftOf(id)
  if (!lift) return <PageNotFoundState />
  return <LiftBody lift={lift} />
}

function LiftBody({ lift }: { lift: Lift }) {
  const [watching, setWatching] = React.useState(false)
  const [logging, setLogging] = React.useState(false)
  const at = LIFTS.findIndex((l) => l.id === lift.id) + 1
  const store = useOnboarding()
  const day = localDay()
  const log = store.exercises?.[day]?.[lift.id]
  // The sets she has saved, else one set to start; "+ Add Set" adds more. Each carries the plan's
  // load ready to confirm; she types the reps she did.
  const [rows, setRows] = React.useState<{ reps: string; weight: string }[]>(() => {
    const saved = log?.entries?.map((e) => ({ reps: e.reps !== undefined ? String(e.reps) : "", weight: e.weightLb !== undefined ? String(e.weightLb) : "" }))
    if (saved?.length) return saved
    return [{ reps: "", weight: String(lift.load) }]
  })
  const ready = rows.every((r) => amount(r.reps) !== undefined && amount(r.weight) !== undefined)
  const edit = (i: number, part: Partial<{ reps: string; weight: string }>) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...part } : r)))
  // The next lift still to do, in the day's order; none once the rest are in.
  const pending = LIFTS.filter((l) => l.id !== lift.id && !store.exercises?.[day]?.[l.id])
  const next = pending.find((l) => LIFTS.indexOf(l) > at - 1) ?? pending[0]

  /* Saving writes her sets under this lift, so it reads as done in the
     session, and carries her on to the next one in place of this page. */
  async function save() {
    const list = rows.map((r) => ({ reps: amount(r.reps)!, weightLb: amount(r.weight)! }))
    await saveLog(store, day, lift.id, { at: new Date().toISOString(), sets: list.length, reps: list[0].reps, weightLb: list[0].weightLb, entries: list })
    if (next) router.replace({ pathname: "/lift/[id]", params: { id: next.id } })
    else router.back()
  }
  const player = useVideoPlayer(CLIP, (p) => {
    p.loop = true
  })

  return (
    <TopicPage
      title={lift.name}
      footer={<PrimaryButton onPress={() => setLogging(true)}>{log ? "Edit your sets" : "Continue"}</PrimaryButton>}
      sheet={
        <>
          <ExerciseVideoModal visible={watching} player={player} title={lift.name} ratio={RATIO} onClose={() => setWatching(false)} />
          {logging && (
            // The sheet rises with the keyboard while she types her reps.
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={StyleSheet.absoluteFill} pointerEvents="box-none">
              <Sheet title="Your sets" onClose={() => setLogging(false)}>
                <View style={styles.setsHead}>
                  <Text style={type.meta}>{`${lift.name}, ${lift.sets} at ${lift.load} lb`}</Text>
                  <Pressable onPress={() => setRows((r) => [...r, { reps: "", weight: String(lift.load) }])} accessibilityRole="button" accessibilityLabel="Add set" hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
                    <Text style={styles.addText}>+ Add Set</Text>
                  </Pressable>
                </View>
                <ScrollView style={styles.setsScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Group>
                    {rows.map((row, i) => (
                      <View key={i} style={styles.setBlock}>
                        <Text style={type.title}>{`Set ${i + 1}`}</Text>
                        <View style={styles.fields}>
                          <View style={styles.fieldHalf}>
                            <TextField label="Reps" value={row.reps} onChangeText={(t) => edit(i, { reps: digits(t) })} keyboardType="number-pad" returnKeyType="done" style={styles.input} compact />
                          </View>
                          <View style={styles.fieldHalf}>
                            <TextField
                              label="Weight"
                              value={row.weight}
                              onChangeText={(t) => edit(i, { weight: decimal(t) })}
                              keyboardType="decimal-pad"
                              returnKeyType="done"
                              style={styles.input}
                              compact
                              trailing={<Text style={styles.unit}>lb</Text>}
                            />
                          </View>
                        </View>
                      </View>
                    ))}
                  </Group>
                </ScrollView>
                <PrimaryButton onPress={save} disabled={!ready}>
                  Save
                </PrimaryButton>
              </Sheet>
            </KeyboardAvoidingView>
          )}
        </>
      }
    >
      <View style={styles.head}>
        <View style={styles.chip}>
          <Tag tone="primary">{`Lift ${at} of ${LIFTS.length}`}</Tag>
        </View>
        <Text style={type.body}>
          {`${lift.sets} at `}
          <Text style={styles.load}>{`${lift.load} lb`}</Text>
        </Text>
      </View>

      <Pressable onPress={() => setWatching(true)} accessibilityRole="button" accessibilityLabel={`Play the ${lift.name} form video`} style={({ pressed }) => [styles.video, pressed && styles.pressed]}>
        <View style={styles.play}>
          <Play size={20} weight="fill" color={color.primary} />
        </View>
        <View style={styles.videoFoot}>
          <Text style={styles.videoText}>Form demonstration · 1:12</Text>
          <View style={styles.angle}>
            <Text style={styles.angleText}>Side angle</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.stills}>
        {lift.steps.map((st, i) => (
          <View key={st.name} style={styles.still} accessible accessibilityLabel={`${st.name}. ${st.cue}`}>
            <Figure pose={lift.poses[i]} />
            <Text style={styles.stillName}>{st.name}</Text>
            <Text style={styles.stillCue}>{st.cue}</Text>
          </View>
        ))}
      </View>

      <Block title="How to do it" meta="three cues">
        <View style={styles.cues}>
          {lift.cues.map((c, i) => (
            <View key={i} style={[styles.cue, i > 0 && styles.cueRule]}>
              <View style={styles.num}>
                <Text style={styles.numText}>{i + 1}</Text>
              </View>
              <Text style={[type.body, styles.fill]}>{bold(c)}</Text>
            </View>
          ))}
        </View>
      </Block>

      <Block title="Common mistakes" meta="watch for these">
        <View style={styles.cues}>
          {lift.mistakes.map((m, i) => (
            <View key={m.name} style={[styles.cue, i > 0 && styles.cueRule]}>
              <View style={styles.num}>
                <Text style={styles.numText}>{i + 1}</Text>
              </View>
              <Text style={[type.body, styles.fill]}>
                <Text style={styles.mistakeName}>{m.name}</Text>
                {` — ${m.fix}`}
              </Text>
            </View>
          ))}
        </View>
      </Block>
    </TopicPage>
  )
}

/** "**bold**" inside a cue, in the heavier weight. */
function bold(text: string) {
  return text.split("**").map((part, i) =>
    i % 2 ? (
      <Text key={i} style={styles.bold}>
        {part}
      </Text>
    ) : (
      part
    ),
  )
}

/** One still, drawn from the side on a 40 by 60 grid: a head, the limbs as
    one stroke, and the weight in amber. */
function Figure({ pose }: { pose: Pose }) {
  return (
    <Svg width={48} height={72} viewBox="0 0 40 60">
      <Circle cx={pose.head[0]} cy={pose.head[1]} r={3.4} fill={ink.primary} />
      {pose.limbs.map((d, i) => (
        <Path key={i} d={d} stroke={ink.primary} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ))}
      {pose.weight && <Circle cx={pose.weight[0]} cy={pose.weight[1]} r={3} fill={color.amber} />}
      <Path d="M6 58 L34 58" stroke={hairline.outline} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  // The same set rows as a move's page: a rule between sets, 12 above and below.
  setBlock: { gap: space.item, paddingVertical: space.rowY },
  fields: { flexDirection: "row", gap: space.item },
  fieldHalf: { flex: 1 },
  input: { minWidth: 0 },
  unit: { ...type.unitLarge, paddingRight: 14 },
  setsHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item },
  setsScroll: { maxHeight: 360 },
  addText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.primary },
  // The chip sits left and the sets and weight right, on one line.
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline },
  chip: { alignSelf: "center" },
  load: { fontFamily: font.semibold, color: ink.strong },


  video: { height: 150, borderRadius: 8, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft, borderWidth: 1, borderColor: color.primaryEdge },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", paddingLeft: 3, backgroundColor: color.background, boxShadow: card.shadowXs },
  videoFoot: { position: "absolute", left: space.item, right: space.item, bottom: space.inline, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  videoText: { ...type.metaStrong, color: ink.content },
  angle: { paddingHorizontal: space.inline, paddingVertical: 2, borderRadius: 6, backgroundColor: color.background },
  angleText: { ...type.tag, color: ink.strong },

  stills: { flexDirection: "row", gap: space.inline },
  still: { flex: 1, alignItems: "center", gap: 2, paddingVertical: space.item, paddingHorizontal: 4, borderRadius: 12, backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge, boxShadow: card.shadowXs },
  stillName: { ...type.metaStrong, marginTop: space.stack, color: ink.strong },
  stillCue: { ...type.caption, textAlign: "center", color: ink.secondary },

  // The cues sit on a white card, each numbered in a pale teal circle.
  cues: { paddingHorizontal: space.item, borderRadius: 12, backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge, boxShadow: card.shadowXs },
  cue: { flexDirection: "row", gap: space.lead, alignItems: "flex-start", paddingVertical: space.item },
  // A rule between one cue and the next.
  cueRule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  num: { width: 20, height: 20, borderRadius: 10, marginTop: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },
  numText: { ...type.tag, color: ink.primary },
  bold: { fontFamily: font.semibold, color: ink.strong },

  mistakeName: { fontFamily: font.semibold, color: ink.strong },

})

