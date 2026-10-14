import { useEvent } from "expo"
import { router, useLocalSearchParams } from "expo-router"
import { VideoView, useVideoPlayer, type VideoPlayer } from "expo-video"
import * as React from "react"
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native"

import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { ArrowsOutSimple, Play } from "@/components/ph"
import { Block, Card, Chip, Group, KeyValue } from "@/components/record-kit"
import { MARK_SIZE, NumberMark, goBack, keepEnd, saveLog } from "@/components/today-exercise-parts"
import { TextField } from "@/components/ui"
import { EXERCISES, localDay, profileOf, type Exercise } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { card, color, font, ink, space, type } from "@/lib/theme"

/* One move, opened from today's session: how it looks (the licensed 30
   second video plays in the panel in the real build; the prototype steps
   through the cues in a sheet), today's sets, reps, rest and effort, how
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

/* The card's photo: the move's own where there is one, else the shared one. */
const DEMO_PHOTO = require("../../../assets/images/exercise-demo.jpg")
/* The clips, by move id. A move with no clip here shows its photo alone,
   with no play button, until its video is added. All three are FitnessScape's
   "exercise demonstration video"s on commons.wikimedia.org, CC BY 3.0. They
   are WebMs: they play on the web build; a phone's build needs MP4s. */
const MOVE_VIDEO: Record<string, string> = {
  "sit-to-stand": "https://upload.wikimedia.org/wikipedia/commons/transcoded/5/5c/Squat_-_exercise_demonstration_video.webm/Squat_-_exercise_demonstration_video.webm.480p.vp9.webm",
  "overhead-press": "https://upload.wikimedia.org/wikipedia/commons/transcoded/6/69/Shoulder_press_-_exercise_demonstration_video.webm/Shoulder_press_-_exercise_demonstration_video.webm.480p.vp9.webm",
  "band-row": "https://upload.wikimedia.org/wikipedia/commons/transcoded/b/b2/Bent-over_row_-_exercise_demonstration_video.webm/Bent-over_row_-_exercise_demonstration_video.webm.480p.vp9.webm",
}
const MOVE_PHOTO: Record<string, number> = {
  "wall-push-up": require("../../../assets/images/exercise-wall-pushup.jpg"),
  "sit-to-stand": require("../../../assets/images/exercise-sit-to-stand.jpg"),
  "calf-raise": require("../../../assets/images/exercise-calf-raise.png"),
  "single-leg-stand": require("../../../assets/images/exercise-single-leg-stand.png"),
}
/* Tall photos shown whole on the card's tint (contain), not cropped to 16:9. */
const WHOLE_PHOTO = new Set(["single-leg-stand"])

/* Only digits, for the reps; digits and one point, for a weight. */
const digits = (text: string) => text.replace(/\D/g, "").slice(0, 3)
function decimal(text: string) {
  const [whole, ...rest] = text.replace(/[^\d.]/g, "").split(".")
  return (rest.length ? `${whole}.${rest.join("")}` : whole).slice(0, 5)
}
const amount = (text: string) => (text && Number.isFinite(Number(text)) ? Number(text) : undefined)

function Move({ move }: { move: Exercise }) {
  const s = useOnboarding()
  const day = localDay()
  const log = s.exercises?.[day]?.[move.id]
  const [watching, setWatching] = React.useState(false)
  const player = useVideoPlayer(MOVE_VIDEO[move.id] ?? null, (p) => {
    p.loop = true
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
        {/* The video's place: a teal tinted 16:9 panel with its play
            button, until the licensed clip plays here. */}
        {watching && MOVE_VIDEO[move.id] ? (
          <VideoStage move={move} player={player} />
        ) : !MOVE_VIDEO[move.id] ? (
          <View style={styles.stage}>
            <Image
              source={MOVE_PHOTO[move.id] ?? DEMO_PHOTO}
              style={styles.photo}
              resizeMode={WHOLE_PHOTO.has(move.id) ? "contain" : "cover"}
              accessibilityIgnoresInvertColors
            />
            {WHOLE_PHOTO.has(move.id) && (
              <View style={styles.play} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <Play size={20} color={color.primary} weight="fill" />
              </View>
            )}
          </View>
        ) : (
          <Pressable
            onPress={() => setWatching(true)}
            accessibilityRole="button"
            accessibilityLabel={`Watch how: ${move.name}`}
            style={({ pressed }) => [styles.stage, pressed && styles.pressed]}
          >
            <Image source={MOVE_PHOTO[move.id] ?? DEMO_PHOTO} style={styles.photo} resizeMode="cover" accessibilityIgnoresInvertColors />
            <View style={styles.scrim} />
            <View style={styles.play}>
              <Play size={20} color={color.primary} weight="fill" />
            </View>
            <Text style={styles.watch}>Watch how</Text>
          </Pressable>
        )}

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
    </View>
  )
}

/** The move's clip, playing in the card's own place once she taps it: tap
    the picture to pause and play, the corner button for full screen. */
function VideoStage({ move, player }: { move: Exercise; player: VideoPlayer }) {
  const view = React.useRef<VideoView>(null)
  // Plays as soon as the picture is in place, still inside the tap that opened it.
  React.useEffect(() => player.play(), [player])
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing })
  // Full screen turns the phone to landscape and shows the whole picture
  // (contain, never stretched or cropped); the card keeps its cropped fill.
  const [full, setFull] = React.useState(false)
  // A phone's browser has no native lock; ask its screen for landscape.
  const lock = (on: boolean) => {
    if (Platform.OS !== "web" || typeof screen === "undefined") return
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
    if (on) o?.lock?.("landscape")?.catch(() => {})
    else o?.unlock?.()
  }
  return (
    <View style={styles.stage}>
      <VideoView
        ref={view}
        player={player}
        style={styles.photo}
        contentFit={full ? "contain" : "cover"}
        nativeControls={false}
        fullscreenOptions={{ enable: true, orientation: "landscape", autoExitOnRotate: true }}
        onFullscreenEnter={() => {
          setFull(true)
          lock(true)
        }}
        onFullscreenExit={() => {
          setFull(false)
          lock(false)
        }}
      />
      <Pressable
        onPress={() => (isPlaying ? player.pause() : player.play())}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? `Pause: ${move.name}` : `Play: ${move.name}`}
        style={styles.tap}
      >
        {!isPlaying && (
          <View style={styles.play}>
            <Play size={20} color={color.primary} weight="fill" />
          </View>
        )}
      </Pressable>
      <Pressable
        onPress={() => view.current?.enterFullscreen()}
        accessibilityRole="button"
        accessibilityLabel="Full screen"
        hitSlop={8}
        style={({ pressed }) => [styles.expand, pressed && styles.pressed]}
      >
        <ArrowsOutSimple size={16} color={color.background} weight="bold" />
      </Pressable>
    </View>
  )
}

/** The frozen TextField's own text inset (ui.tsx), so "lb" sits as far in
    from the right as the number does from the left. */
const FIELD_INSET = 14

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pressed: { opacity: 0.7 },
  // The video's place: 16:9 on the teal tint inside its edge.
  stage: {
    aspectRatio: 16 / 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.primaryEdge,
    backgroundColor: color.primaryTint,
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
  // The tap area over a playing clip, with the play mark while it is paused.
  tap: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  // Full screen: a small dark disc in the top right corner.
  expand: { position: "absolute", top: space.inline, right: space.inline, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
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
