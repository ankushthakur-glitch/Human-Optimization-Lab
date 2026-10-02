import { useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Art } from "@/components/art"
import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { IconInfo, IconPlay } from "@/components/icons"
import { Banner, Block, Card, Chip, Group, HUE, KeyValue } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { MARK_SIZE, NumberMark, goBack, keepEnd, saveLog } from "@/components/today-exercise-parts"
import { Button, TextField } from "@/components/ui"
import { EXERCISES, localDay, profileOf, type Exercise } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { cardRadius, color, ink, space, type } from "@/lib/theme"

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
  const [reps, setReps] = React.useState(log?.reps !== undefined ? String(log.reps) : "")
  const [weight, setWeight] = React.useState(log?.weightLb !== undefined ? String(log.weightLb) : "")
  // A move marked done as a whole has every set ticked.
  const sets = log ? (log.sets ?? move.sets) : 0
  const today = !!profileOf(s)
    .sessionOn(new Date())
    ?.exercises.some((e) => e.id === move.id)

  /* Every tap and keystroke is saved at once; with nothing ticked or typed
     the move has no log at all. */
  function write(next: { sets?: number; reps?: string; weight?: string }) {
    const count = next.sets ?? sets
    const r = amount(next.reps ?? reps)
    const w = amount(next.weight ?? weight)
    if (!count && r === undefined && w === undefined) return saveLog(s, day, move.id, undefined)
    return saveLog(s, day, move.id, {
      at: new Date().toISOString(),
      sets: count,
      ...(r !== undefined ? { reps: r } : {}),
      ...(w !== undefined ? { weightLb: w } : {}),
    })
  }

  /* Sets run in order: ticking one ticks those before it, and unticking
     one unticks those after it. */
  const tick = (n: number) => write({ sets: n <= sets ? n - 1 : n })

  /* Done only takes her back (C.20.6), so opening a move to read its cues
     records nothing. Only her taps log it: the last set ticks every set
     in one tap (M-15), and "Finish workout" logs the whole session. */
  const done = () => goBack("/exercise")

  const each = move.side ? ` ${move.side}` : ""

  return (
    <View style={styles.fill}>
      <FlowScreen page title={move.name} footer={<Button onPress={done}>Done</Button>}>
        <Card style={styles.panel}>
          <View style={styles.stage}>
            <Art name="dumbbell" size={96} />
            <View style={styles.watch}>
              <Button variant="outline" icon={IconPlay} onPress={() => setWatching(true)}>
                Watch how
              </Button>
            </View>
          </View>
        </Card>

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
          <Banner hue="teal" icon={<IconInfo size={18} color={HUE.teal.ink} />} title={keepEnd(move.stop)} />
        </Block>

        <Block title="Your sets" meta={sets ? `${sets} of ${move.sets} done` : undefined}>
          <Card style={styles.log}>
            <View style={styles.sets} accessibilityLabel="Sets done">
              {Array.from({ length: move.sets }, (_, i) => (
                <Chip key={i} label={`Set ${i + 1}`} selected={i < sets} onPress={() => tick(i + 1)} />
              ))}
            </View>
            {move.reps !== undefined && (
              <View style={styles.fields}>
                <View style={styles.fieldHalf}>
                  <TextField
                    label="Reps"
                    value={reps}
                    onChangeText={(text) => {
                      const next = digits(text)
                      setReps(next)
                      write({ reps: next })
                    }}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    style={styles.input}
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <TextField
                    label="Weight"
                    value={weight}
                    onChangeText={(text) => {
                      const next = decimal(text)
                      setWeight(next)
                      write({ weight: next })
                    }}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    style={styles.input}
                    trailing={<Text style={styles.unit}>lb</Text>}
                  />
                </View>
              </View>
            )}
          </Card>
        </Block>
      </FlowScreen>

      {watching && <CueSheet move={move} onClose={() => setWatching(false)} />}
    </View>
  )
}

/** The prototype's stand in for the video: the cues one step at a time. */
function CueSheet({ move, onClose }: { move: Exercise; onClose: () => void }) {
  const [step, setStep] = React.useState(0)
  const last = step === move.cues.length - 1
  return (
    <Sheet title={move.name} onClose={onClose}>
      <View style={styles.step}>
        <Text style={styles.stepCount}>{`Step ${step + 1} of ${move.cues.length}`}</Text>
        <Text style={styles.stepCue} accessibilityLiveRegion="polite">
          {keepEnd(move.cues[step])}
        </Text>
      </View>
      <Button onPress={() => (last ? onClose() : setStep(step + 1))}>{last ? "Done" : "Next"}</Button>
    </Sheet>
  )
}

/** The demonstration panel's thin frame: the stage nearly fills its card,
    its corners concentric with the card's. */
const FRAME = 6

/** The frozen TextField's own text inset (ui.tsx), so "lb" sits as far in
    from the right as the number does from the left. */
const FIELD_INSET = 14

const styles = StyleSheet.create({
  fill: { flex: 1 },
  panel: { padding: FRAME },
  // The video's place: 16:9 on the page's cool grey, the object as its poster.
  stage: {
    aspectRatio: 16 / 9,
    borderRadius: cardRadius - FRAME,
    backgroundColor: color.page,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  watch: { alignSelf: "center" },
  // The rows' own 12 plus this keep the first and last words the card's
  // 16 from its edge.
  rows: { paddingVertical: space.card - space.rowY },
  // The 24 pt mark keeps an icon's gap to its words (Frontline's step
  // circle), and the cue's first line centres on it.
  cue: { flexDirection: "row", alignItems: "flex-start", gap: space.inline, paddingVertical: space.rowY },
  cueText: { flex: 1, paddingTop: (MARK_SIZE - type.body.lineHeight) / 2 },
  // A form card: 16 between the chips and the fields.
  log: { gap: space.card },
  sets: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  fields: { flexDirection: "row", gap: space.item },
  fieldHalf: { flex: 1 },
  // Lets the input give way to its unit in a half width box (a browser
  // input will not shrink below its own width otherwise).
  input: { minWidth: 0 },
  // A unit after a large number: the typed reps and weight are 16 pt.
  unit: { ...type.unitLarge, paddingRight: FIELD_INSET },
  // Room for three lines of cue under the count, so the sheet keeps its
  // height step to step.
  step: { gap: space.inline, minHeight: type.metaStrong.lineHeight + space.inline + 3 * type.section.lineHeight },
  // Teal words at 12 pt take the text teal.
  stepCount: { ...type.metaStrong, color: ink.primary },
  // The cue is what she reads mid move: the sheet's largest words after
  // its title.
  stepCue: { ...type.section },
})
