import { router, useLocalSearchParams } from "expo-router"
import { VideoView, useVideoPlayer } from "expo-video"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { PageNotFoundState } from "@/components/error-state"
import { ExerciseVideoModal } from "@/components/exercise-video"
import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { Play } from "@/components/ph"
import { Block, Card, Chip, Group, KeyValue } from "@/components/record-kit"
import { MARK_SIZE, NumberMark, amount, decimal, digits, goBack, keepEnd, saveLog } from "@/components/today-exercise-parts"
import { TextField } from "@/components/ui"
import { EXERCISES, localDay, profileOf, type Exercise } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { card, color, font, ink, space, type } from "@/lib/theme"

/* One move, opened from today's session: how it looks (its reference clip
   opens in a popup from the panel, and expands to a full view), today's sets, reps, rest and effort, how
   to do it with the rule for when to stop, and her sets to tick as she
   goes, saved as she taps (M-14, M-15). Done takes her back to the same
   place in the session (M-18). FINAL-SPEC C.20. */

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  // Own keys only, so an id such as "toString" is not found.
  const move = id && Object.prototype.hasOwnProperty.call(EXERCISES, id) ? EXERCISES[id] : undefined
  if (!move) return <PageNotFoundState />
  return <Move key={move.id} move={move} />
}

/* The reference clips, MP4s bundled with the app so they play on the web
   build and on a phone alike. The push up has its own; a move without one
   plays the shared clip. */
const DEMO_VIDEO = require("../../../assets/videos/exercise-demo.mp4")
const MOVE_VIDEO: Record<string, number> = {
  "push-up": require("../../../assets/videos/push-up.mp4"),
}
/* Each clip's width over height, so its box is the clip's own shape and the
   picture fills it edge to edge with nothing cropped and no bars. */
const DEMO_RATIO = 16 / 9
const MOVE_RATIO: Record<string, number> = {
  "push-up": 1092 / 576,
}

function Move({ move }: { move: Exercise }) {
  const s = useOnboarding()
  const day = localDay()
  const log = s.exercises?.[day]?.[move.id]
  const [watching, setWatching] = React.useState(false)
  const clip = MOVE_VIDEO[move.id] ?? DEMO_VIDEO
  const ratio = MOVE_RATIO[move.id] ?? DEMO_RATIO
  const player = useVideoPlayer(clip, (p) => {
    p.loop = true
  })
  // The card's picture is the clip's own first moment, held still.
  const still = useVideoPlayer(clip, (p) => {
    p.muted = true
    p.currentTime = 0.5
  })
  // Each set has its own reps and weight; a log from before holds one.
  const [rows, setRows] = React.useState<{ reps: string; weight: string }[]>(() => {
    const saved = log?.entries?.map((e) => ({
      reps: e.reps !== undefined ? String(e.reps) : "",
      weight: e.weightLb !== undefined ? String(e.weightLb) : "",
    }))
    if (saved?.length) return saved
    return [{ reps: log?.reps !== undefined ? String(log.reps) : "", weight: log?.weightLb !== undefined ? String(log.weightLb) : "" }]
  })
  // A move marked done as a whole has every set ticked.
  const sets = log ? (log.sets ?? move.sets) : 0
  const today = !!profileOf(s)
    .sessionOn(new Date())
    ?.exercises.some((e) => e.id === move.id)

  /* Every tap and keystroke is saved at once; with nothing ticked or typed
     the move has no log at all. A set counts as done once it has reps or a
     weight. */
  function write(next: { sets?: number; rows?: { reps: string; weight: string }[] }) {
    const list = (next.rows ?? rows).map((r) => ({ reps: amount(r.reps), weight: amount(r.weight) }))
    const filled = list.filter((r) => r.reps !== undefined || r.weight !== undefined).length
    const count = next.sets ?? (next.rows ? filled : sets)
    if (!count && !filled) return saveLog(s, day, move.id, undefined)
    const first = list[0]
    return saveLog(s, day, move.id, {
      at: new Date().toISOString(),
      sets: count,
      ...(first?.reps !== undefined ? { reps: first.reps } : {}),
      ...(first?.weight !== undefined ? { weightLb: first.weight } : {}),
      ...(filled
        ? { entries: list.map((r) => ({ ...(r.reps !== undefined ? { reps: r.reps } : {}), ...(r.weight !== undefined ? { weightLb: r.weight } : {}) })) }
        : {}),
    })
  }

  const edit = (i: number, part: Partial<{ reps: string; weight: string }>) => {
    const next = rows.map((r, j) => (j === i ? { ...r, ...part } : r))
    setRows(next)
    write({ rows: next })
  }
  const addSet = () => setRows((r) => [...r, { reps: "", weight: "" }])

  /* Sets run in order: ticking one ticks those before it, and unticking
     one unticks those after it. */
  const tick = (n: number) => write({ sets: n <= sets ? n - 1 : n })

  /* Done only takes her back (C.20.6), so opening a move to read its cues
     records nothing. Only her taps log it: the last set ticks every set
     in one tap (M-15), and "Finish workout" logs the whole session. */
  const done = () => goBack("/exercise")

  /* On every move but the last of today's session the foot says Next: it
     completes this move (every set ticked, so its mark in the session turns
     to a check) and opens the one after it in place of this page. Only the
     last move says Done. */
  const moves = profileOf(s).sessionOn(new Date())?.exercises ?? []
  const at = moves.findIndex((e) => e.id === move.id)
  const after = at >= 0 ? moves[at + 1] : undefined
  async function next() {
    if (!after) return
    await write({ sets: move.sets })
    router.replace({ pathname: "/exercise/[id]", params: { id: after.id } })
  }

  const each = move.side ? ` ${move.side}` : ""

  return (
    <View style={styles.fill}>
      <FlowScreen page title={move.name} footer={after ? <PrimaryButton onPress={next}>Next</PrimaryButton> : <PrimaryButton onPress={done}>Done</PrimaryButton>}>
        {/* The video's place: the move's photo with a play button. Tapping
            it opens the clip in a popup over this screen (and from there
            the full view). */}
        <Pressable
          onPress={() => {
            // Started inside the tap itself, which browsers always allow.
            player.play()
            setWatching(true)
          }}
          accessibilityRole="button"
          accessibilityLabel={`Watch how: ${move.name}`}
          style={({ pressed }) => [styles.stage, { aspectRatio: ratio }, pressed && styles.pressed]}
        >
          <VideoView player={still} style={styles.photo} contentFit="cover" nativeControls={false} pointerEvents="none" />
          <View style={styles.scrim} />
          <View style={styles.play}>
            <Play size={20} color={color.primary} weight="fill" />
          </View>
          <Text style={styles.watch}>Watch how</Text>
        </Pressable>

        <Block title={today ? "Today" : "Each time"}>
          <Card style={styles.rows}>
            <KeyValue label="Sets" value={String(move.sets)} />
            {move.reps !== undefined ? (
              <KeyValue label="Reps" value={`${move.reps}${each}`} />
            ) : (
              <KeyValue label="Hold" value={`${move.seconds} seconds${each}`} />
            )}
            <KeyValue label="Rest" value={`${move.rest} seconds`} />
            <KeyValue label="Effort" value={`${move.effort} of 10`} />
            <KeyValue label="You need" value={move.equipment} last />
          </Card>
        </Block>

        <Block title="How to do it">
          <Group>
            {move.cues.map((cue, i) => (
              <View key={cue} style={styles.cue}>
                <NumberMark n={i + 1} />
                <Text style={[type.body, styles.cueText]}>{keepEnd(cue)}</Text>
              </View>
            ))}
          </Group>
        </Block>

        <Block
          title="Your sets"
          action={
            <View style={styles.setsAction}>
              {sets > 0 && <Text style={type.meta}>{`${sets} of ${move.sets} done`}</Text>}
              {move.reps !== undefined && (
                <Pressable
                  onPress={addSet}
                  accessibilityRole="button"
                  accessibilityLabel="Add set"
                  hitSlop={8}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={styles.addText}>+ Add Set</Text>
                </Pressable>
              )}
            </View>
          }
        >
          {move.reps !== undefined ? (
            <Group>
              {rows.map((row, i) => (
                <View key={i} style={styles.setBlock}>
                  <Text style={type.title}>{`Set ${i + 1}`}</Text>
                  <View style={styles.fields}>
                    <View style={styles.fieldHalf}>
                      <TextField
                        label="Reps"
                        value={row.reps}
                        onChangeText={(text) => edit(i, { reps: digits(text) })}
                        keyboardType="number-pad"
                        returnKeyType="done"
                        style={styles.input}
                        compact
                      />
                    </View>
                    <View style={styles.fieldHalf}>
                      <TextField
                        label="Weight"
                        value={row.weight}
                        onChangeText={(text) => edit(i, { weight: decimal(text) })}
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
          ) : (
            <Card style={styles.log}>
              <View style={styles.sets} accessibilityLabel="Sets done">
                {Array.from({ length: move.sets }, (_, i) => (
                  <Chip key={i} label={`Set ${i + 1}`} selected={i < sets} onPress={() => tick(i + 1)} />
                ))}
              </View>
            </Card>
          )}
        </Block>
      </FlowScreen>
      <ExerciseVideoModal visible={watching} player={player} title={move.name} ratio={ratio} onClose={() => setWatching(false)} />
    </View>
  )
}

/** The frozen TextField's own text inset (ui.tsx), so "lb" sits as far in
    from the right as the number does from the left. */
const FIELD_INSET = 14

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pressed: { opacity: 0.7 },
  // The video's place, in the clip's own shape, inside its edge.
  stage: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.primaryEdge,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: space.inline,
    boxShadow: card.shadow,
    overflow: "hidden",
  },
  photo: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  // A light dark wash so the white play button and label stay readable.
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.28)" },
  // A 48 white circle holding the play mark.
  play: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.background, alignItems: "center", justifyContent: "center", boxShadow: card.shadowXs },
  watch: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.background },
  // The rows' own 12 plus this keep the first and last words the card's
  // 16 from its edge.
  rows: { paddingVertical: space.card - space.rowY },
  // The 28 mark sits a tile's lead from its words, and the cue's first
  // line centres on it.
  cue: { flexDirection: "row", alignItems: "flex-start", gap: space.lead, paddingVertical: space.rowY },
  cueText: { flex: 1, paddingTop: (MARK_SIZE - type.body.lineHeight) / 2 },
  // A form card: 16 between the chips and the fields.
  log: { gap: space.card },
  sets: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  // Each set is a row of the group, so the rules between them and the 12
  // above and below match the "How to do it" rows.
  setBlock: { gap: space.item, paddingVertical: space.rowY },
  setsAction: { flexDirection: "row", alignItems: "center", gap: space.item },
  addText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.primary },
  fields: { flexDirection: "row", gap: space.item },
  fieldHalf: { flex: 1 },
  // Lets the input give way to its unit in a half width box (a browser
  // input will not shrink below its own width otherwise).
  input: { minWidth: 0 },
  // A unit after a large number: the typed reps and weight are 16 pt.
  unit: { ...type.unitLarge, paddingRight: FIELD_INSET },
})
