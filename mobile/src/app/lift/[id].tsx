import { useLocalSearchParams } from "expo-router"
import { useVideoPlayer } from "expo-video"
import * as React from "react"
import { Image, Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { ChoiceRow, SheetRows } from "@/components/care-orders-rows"
import { ProgressChart } from "@/components/charts"
import { PageNotFoundState } from "@/components/error-state"
import { ExerciseVideoModal } from "@/components/exercise-video"
import { Checkbox } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { Play } from "@/components/ph"
import { Readout, entryDay } from "@/components/progress-parts"
import { Block, Tag, TextAction, toast } from "@/components/record-kit"
import { SetTable, type SetEntry } from "@/components/set-table"
import { Sheet, useKeyboardHeight } from "@/components/sheet"
import { amount, saveLog } from "@/components/today-exercise-parts"
import { TopicPage } from "@/components/topic-kit"
import { localDay } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { EFFORT, loadShort, resistanceOf, sessionsOf, setsText, targetOf, type SetLog } from "@/lib/strength"
import { LIFTS, liftOf, type Lift } from "@/lib/topics"
import { card, color, font, hairline, ink, space, surface, type } from "@/lib/theme"

/* How to do one lift (Journey_14 screen 32), opened by "Form" on any lift
   in today's session. The video is the artefact; the three stills are the
   glanceable version for someone already standing at the rack, frames
   taken from the video itself, with the one cue that matters under each. Then three cues in plain language and the two
   mistakes that actually happen. Every lift on every plan carries one.

   Logging is optional: the footer's Log your sets opens her sets in a
   sheet, reps and weight per set, and once saved asks how many more reps
   her last set had left; next week's target steps on from it (lib/strength.ts).
   View progress under it opens the load she has lifted, week by week. */

const CLIP = require("../../../assets/videos/exercise-demo.mp4")
const RATIO = 16 / 9
// The video's opening frame, and three frames from it for the stills.
const POSTER = require("../../../assets/images/lift/video.jpg")
const STILLS = [require("../../../assets/images/lift/step-1.jpg"), require("../../../assets/images/lift/step-2.jpg"), require("../../../assets/images/lift/step-3.jpg")]

export default function LiftScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const lift = liftOf(id)
  if (!lift) return <PageNotFoundState />
  return <LiftBody lift={lift} />
}

function LiftBody({ lift }: { lift: Lift }) {
  const s = useOnboarding()
  const [watching, setWatching] = React.useState(false)
  // The log sheet, then once saved the question about her last set.
  const [open, setOpen] = React.useState<"log" | "progress">()
  const [asking, setAsking] = React.useState(false)
  const keyboard = useKeyboardHeight()
  const day = localDay()
  const target = targetOf(s, lift)
  const saved = s.exercises?.[day]?.[lift.id]?.entries ?? []
  // Her rows as she types: what she saved today, else this week's target.
  const [rows, setRows] = React.useState<SetEntry[]>(() =>
    Array.from({ length: target.sets }, (_, i) => ({
      reps: String(saved[i]?.reps ?? target.reps),
      weight: String(saved[i]?.weightLb ?? target.load),
    })),
  )
  // Ticked, today's sets hold as the target from now on; ticked already for
  // a lift she has held before.
  const [keep, setKeep] = React.useState(!!s.liftHolds?.[lift.id])
  const ready = rows.every((r) => amount(r.reps) !== undefined && amount(r.weight) !== undefined)
  const edit = (i: number, part: Partial<SetEntry>) => setRows((was) => was.map((r, j) => (j === i ? { ...r, ...part } : r)))

  /** Writes the day's sets, the last one carrying how it felt. */
  function write(rir?: number) {
    const entries: SetLog[] = rows.map((r, i) => ({ reps: amount(r.reps), weightLb: amount(r.weight), rir: i === rows.length - 1 ? rir : undefined }))
    return saveLog(s, day, lift.id, { at: new Date().toISOString(), sets: entries.length, reps: entries[0].reps, weightLb: entries[0].weightLb, entries })
  }
  async function save() {
    await write(saved[rows.length - 1]?.rir)
    // Held at the first set's numbers; unticked, the lift goes back to the plan.
    const liftHolds = { ...s.liftHolds }
    if (keep) liftHolds[lift.id] = { sets: rows.length, reps: amount(rows[0].reps)!, load: amount(rows[0].weight)! }
    else delete liftHolds[lift.id]
    await s.save({ liftHolds })
    setOpen(undefined)
    setAsking(true)
  }
  async function felt(rir: number | undefined) {
    setAsking(false)
    if (rir !== undefined) await write(rir)
    toast(`${lift.name} logged`)
  }

  const at = LIFTS.findIndex((l) => l.id === lift.id) + 1
  const player = useVideoPlayer(CLIP, (p) => {
    p.loop = true
  })

  return (
    <TopicPage
      title={lift.name}
      footer={
        <View style={styles.footer}>
          <PrimaryButton onPress={() => setOpen("log")}>{saved.some((e) => e.reps !== undefined) ? "Edit your sets" : "Log your sets"}</PrimaryButton>
          <View style={styles.tertiary}>
            <TextAction onPress={() => setOpen("progress")}>View progress</TextAction>
          </View>
        </View>
      }
      sheet={
        (asking && <EffortSheet onPick={felt} />) ||
        (open === "log" && (
          <View style={[styles.sheetFrame, { bottom: keyboard }]} pointerEvents="box-none">
            <Sheet title="Log your sets" onClose={() => setOpen(undefined)}>
              <SetTable rows={rows} onEdit={edit} target={String(target.reps)} />
              <Checkbox checked={keep} onChange={setKeep}>
                Keep these weights and reps
              </Checkbox>
              <PrimaryButton onPress={save} disabled={!ready}>
                Save your sets
              </PrimaryButton>
            </Sheet>
          </View>
        )) ||
        (open === "progress" && <ProgressSheet lift={lift} onClose={() => setOpen(undefined)} />) || (
          <ExerciseVideoModal visible={watching} player={player} title={lift.name} ratio={RATIO} onClose={() => setWatching(false)} />
        )
      }
    >
      <View style={styles.head}>
        <View style={styles.chip}>
          <Tag tone="primary">{`Lift ${at} of ${LIFTS.length}`}</Tag>
        </View>
        <Text style={type.body}>
          {`${setsText(target)} at `}
          <Text style={styles.load}>{loadShort(lift, target.load)}</Text>
        </Text>
      </View>

      <Pressable onPress={() => setWatching(true)} accessibilityRole="button" accessibilityLabel={`Play the ${lift.name} form video`} style={({ pressed }) => [styles.video, pressed && styles.pressed]}>
        <Image source={POSTER} style={styles.poster} resizeMode="cover" accessibilityIgnoresInvertColors />
        <Svg style={styles.scrim} width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="liftScrim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000" stopOpacity={0.45} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#liftScrim)" />
        </Svg>
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
            <Image source={STILLS[i]} style={styles.stillPhoto} resizeMode="cover" accessibilityIgnoresInvertColors />
            <View style={styles.stillText}>
              <Text style={styles.stillName}>{st.name}</Text>
              <Text style={styles.stillCue}>{st.cue}</Text>
            </View>
          </View>
        ))}
      </View>

      <Block title="How to do it">
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

      <Block title="Common mistakes">
        <View style={styles.cues}>
          {lift.mistakes.map((m, i) => (
            <View key={m.name} style={[styles.cue, i > 0 && styles.cueRule]}>
              <View style={styles.num}>
                <Text style={styles.numText}>{i + 1}</Text>
              </View>
              <Text style={[type.body, styles.fill]}>
                <Text style={styles.mistakeName}>{m.name}</Text>
                {`: ${m.fix}`}
              </Text>
            </View>
          ))}
        </View>
      </Block>
    </TopicPage>
  )
}

/** After saving: how close to failure her last set was. One tap answers and closes;
    Skip saves the sets with no answer. */
function EffortSheet({ onPick }: { onPick: (rir: number | undefined) => void }) {
  return (
    <Sheet title="Last set: to failure?" onClose={() => onPick(undefined)}>
      <Text style={type.body}>How many more reps could you have done?</Text>
      <View accessibilityRole="radiogroup">
        <SheetRows>
          {EFFORT.map((e) => (
            <ChoiceRow key={e.rir} title={e.label} selected={false} onPress={() => onPick(e.rir)} />
          ))}
        </SheetRows>
      </View>
      <View style={styles.skip}>
        <TextAction tone="muted" onPress={() => onPick(undefined)}>
          Skip
        </TextAction>
      </View>
    </Sheet>
  )
}

/** The heaviest load of every session, oldest first. */
function ProgressSheet({ lift, onClose }: { lift: Lift; onClose: () => void }) {
  const s = useOnboarding()
  const points = resistanceOf(sessionsOf(s, lift))
  const latest = points[points.length - 1]
  const first = points[0]
  const up = latest ? latest.value - first.value : 0
  return (
    <Sheet title={`${lift.name} progress`} onClose={onClose}>
      {latest && (
        <>
          <Readout value={String(latest.value)} unit="lb" label={up > 0 ? `Up ${up} lb since ${entryDay(String(first.date))}` : `Since ${entryDay(String(first.date))}`} />
          <ProgressChart readings={points} trend={points} name={`${lift.name.toLowerCase()} load`} readingsLabel="Sessions" unit="lb" caption={null} playKey={`lift:${lift.id}`} />
        </>
      )}
    </Sheet>
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

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  // The chip sits left and the sets and weight right, on one line.
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline },
  chip: { alignSelf: "center" },
  load: { fontFamily: font.semibold, color: ink.strong },


  video: { aspectRatio: RATIO, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },
  poster: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  // A soft shade fading in along the foot so the caption reads on the photo.
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 72 },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", paddingLeft: 3, backgroundColor: color.background, boxShadow: card.shadowXs },
  videoFoot: { position: "absolute", left: space.item, right: space.item, bottom: space.inline, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  videoText: { ...type.metaStrong, color: color.background },
  angle: { paddingHorizontal: space.inline, paddingVertical: 2, borderRadius: 6, backgroundColor: color.background },
  angleText: { ...type.tag, color: ink.strong },

  stills: { flexDirection: "row", gap: space.inline },
  still: { flex: 1, overflow: "hidden", borderRadius: 12, backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge, boxShadow: card.shadowXs },
  stillPhoto: { width: "100%", height: 72, backgroundColor: surface.inset },
  stillText: { alignItems: "center", gap: 2, paddingTop: space.inline, paddingBottom: space.item, paddingHorizontal: 4 },
  stillName: { ...type.metaStrong, color: ink.strong },
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

  skip: { alignItems: "center" },

  footer: { gap: space.inline },
  tertiary: { alignItems: "center" },
  sheetFrame: { position: "absolute", top: 0, left: 0, right: 0 },

})

