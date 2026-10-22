import { router, useLocalSearchParams } from "expo-router"
import { useVideoPlayer } from "expo-video"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Circle, Path } from "react-native-svg"

import { PageNotFoundState } from "@/components/error-state"
import { ExerciseVideoModal } from "@/components/exercise-video"
import { PrimaryButton } from "@/components/hol"
import { CaretLeft, Play, WarningCircle } from "@/components/ph"
import { Block } from "@/components/record-kit"
import { Foot, TopicPage } from "@/components/topic-kit"
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
  const player = useVideoPlayer(CLIP, (p) => {
    p.loop = true
  })
  const at = LIFTS.findIndex((l) => l.id === lift.id) + 1
  const same = lift.last === "same"

  return (
    <TopicPage
      footer={
        <View style={styles.foot}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back to the session" hitSlop={8} style={({ pressed }) => [styles.session, pressed && styles.pressed]}>
            <CaretLeft size={16} color={ink.content} />
            <Text style={styles.sessionText}>Session</Text>
          </Pressable>
          <View style={styles.fill}>
            <PrimaryButton onPress={() => router.push("/exercise")}>Start set 1</PrimaryButton>
          </View>
        </View>
      }
      sheet={<ExerciseVideoModal visible={watching} player={player} title={lift.name} ratio={RATIO} onClose={() => setWatching(false)} />}
    >
      <View style={styles.head}>
        <View style={styles.headRow}>
          <Text style={styles.title} accessibilityRole="header">
            {lift.name}
          </Text>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{`LIFT ${at} OF ${LIFTS.length}`}</Text>
          </View>
        </View>
        <Text style={type.body}>{`${lift.sets} at ${lift.load} lb${same ? " · same as last session" : ` · up from ${lift.last} last session`}`}</Text>
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
            <View key={i} style={styles.cue}>
              <View style={styles.num}>
                <Text style={styles.numText}>{i + 1}</Text>
              </View>
              <Text style={[type.body, styles.fill]}>{bold(c)}</Text>
            </View>
          ))}
        </View>
      </Block>

      <Block title="Common mistakes" meta="watch for these">
        <View style={styles.mistakes}>
          {lift.mistakes.map((m) => (
            <View key={m.name} style={styles.mistake}>
              <WarningCircle size={14} color="#A95413" />
              <Text style={[type.label, styles.fill]}>
                <Text style={styles.mistakeName}>{m.name}</Text>
                {` — ${m.fix}`}
              </Text>
            </View>
          ))}
        </View>
      </Block>

      <Foot>Every lift on your plan has this. Open it mid-set without losing your place.</Foot>
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

  head: { gap: space.stack },
  headRow: { flexDirection: "row", alignItems: "center", gap: space.inline, flexWrap: "wrap" },
  title: { ...type.hero, fontSize: 24, lineHeight: 32 },
  chip: { paddingHorizontal: space.inline, paddingVertical: space.line, borderRadius: 16, backgroundColor: color.highTint },
  chipText: { ...type.tag, color: "#A95413" },

  video: { height: 150, borderRadius: 8, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft, borderWidth: 1, borderColor: color.primaryEdge },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", paddingLeft: 3, backgroundColor: color.background, boxShadow: card.shadowXs },
  videoFoot: { position: "absolute", left: space.item, right: space.item, bottom: space.inline, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  videoText: { ...type.metaStrong, color: ink.content },
  angle: { paddingHorizontal: space.inline, paddingVertical: 2, borderRadius: 6, backgroundColor: color.background },
  angleText: { ...type.tag, color: ink.strong },

  stills: { flexDirection: "row", gap: space.inline },
  still: { flex: 1, alignItems: "center", gap: 2, paddingVertical: space.item, paddingHorizontal: 4, borderRadius: 10, backgroundColor: color.primaryTint, borderWidth: 1, borderColor: hairline.edge },
  stillName: { ...type.metaStrong, marginTop: space.stack, color: ink.strong },
  stillCue: { ...type.caption, textAlign: "center", color: ink.secondary },

  cues: { gap: space.item },
  cue: { flexDirection: "row", gap: space.lead, alignItems: "flex-start" },
  num: { width: 20, height: 20, borderRadius: 10, marginTop: 1, alignItems: "center", justifyContent: "center", backgroundColor: ink.primary },
  numText: { ...type.tag, color: ink.onColor },
  bold: { fontFamily: font.semibold, color: ink.strong },

  mistakes: { gap: space.inline },
  mistake: { flexDirection: "row", alignItems: "center", gap: space.inline, padding: space.card, borderRadius: 8, backgroundColor: color.amberTint, borderWidth: 1, borderColor: color.amberEdge },
  mistakeName: { fontFamily: font.semibold, color: "#A95413" },

  foot: { flexDirection: "row", alignItems: "center", gap: space.item },
  session: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44, paddingHorizontal: space.inline, borderRadius: 8, backgroundColor: surface.inset },
  sessionText: { ...type.title, color: ink.content },
})

