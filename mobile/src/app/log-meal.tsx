import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { ActivityIndicator, Animated, Easing, Platform, StyleSheet, Text, View } from "react-native"

import { Art } from "@/components/art"
import { useReducedMotion } from "@/components/chat"
import { FlowScreen } from "@/components/flow"
import { IconMic } from "@/components/icons"
import { Block, Card, Chip, ChipRow, Group, HUE, NeedsRow, SmallAction, Tag, TextAction } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { Kcal, TotalsHead, isSlot, kcalWords, logDay, nutrientLine, recentMeals, saveLabel, slotName, type LogDay } from "@/components/today-food-meals"
import {
  FAT_ANSWERS,
  PHOTO,
  VOICE,
  readTyped,
  readingOf,
  scaled,
  type DraftFood,
  type FatAnswer,
  type Portion,
  type Reading,
} from "@/components/today-food-readings"
import { toast } from "@/components/toast"
import { Button, TextField } from "@/components/ui"
import { MEAL_SLOTS, clockOf, mealLine, mealName, profileOf, slotAt, totalsOf, type Food, type Meal, type MealSlot, type NutrientId } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { color, space, type } from "@/lib/theme"
import { formatNumber } from "@/lib/trends"

/* Log a meal (FINAL-SPEC C.22): logging that takes two taps and never
   guesses silently (M-12, M-16, M-17, M-19). Four steps in one route:
   capture (a photo, her voice or typing, or a recent meal again), reading,
   checking what was found, and saved. The back button steps back a step;
   the swipe leaves. Opened from the Log a meal door, the diet plan or a
   day, with ?slot=breakfast|lunch|snack|dinner and ?day=yesterday (or a
   day key) to preselect; ?edit=<meal id> opens a logged meal at the check
   step to change it.

   Nothing is saved until she confirms it, a draft never counts toward the
   day's totals, and a nutrient the reading has no value for stays unknown,
   never zero. The prototype shows no photo; the real build shows her own
   photo as a small thumbnail on the check step only. */

type Step =
  | { at: "capture" }
  | { at: "listening" }
  | { at: "typing" }
  | { at: "reading" }
  | { at: "check"; reading: Reading; n: number }

/** When a meal logged for an earlier day is usually eaten. */
const USUAL_TIME: Record<MealSlot, string> = { breakfast: "8:00 AM", lunch: "12:30 PM", snack: "3:30 PM", dinner: "6:30 PM" }

/** What the reading step says while it works, a line at a time. */
const READING_LINES = ["Finding the foods", "Estimating portions", "Adding up nutrients"]

const RETAKE: Record<Meal["how"], string> = { photo: "Retake", voice: "Say it again", typed: "Type it again", again: "Retake" }

const newId = () => `m-${Date.now().toString(36)}`

export default function LogMealScreen() {
  const s = useOnboarding()
  const params = useLocalSearchParams<{ slot?: string; day?: string; edit?: string }>()
  const [now] = React.useState(() => new Date())
  const day = React.useMemo(() => logDay(params.day, now), [params.day, now])
  const [editing] = React.useState(() => (params.edit ? s.meals?.[day.key]?.find((m) => m.id === params.edit) : undefined))
  const [slot, setSlot] = React.useState<MealSlot>(() => editing?.slot ?? (isSlot(params.slot) ? params.slot : slotAt(now)))
  const [step, setStep] = React.useState<Step>(() =>
    editing ? { at: "check", reading: readingOf(editing, mealName(editing)), n: 0 } : { at: "capture" }
  )
  const [typed, setTyped] = React.useState("")
  const profile = profileOf(s)
  const ids = profile.goals.map((g) => g.id).filter((id) => id !== "calories")

  // Reading the photo takes 2.2 s, then she checks what was found.
  React.useEffect(() => {
    if (step.at !== "reading") return
    const done = setTimeout(() => setStep({ at: "check", reading: PHOTO, n: Date.now() }), 2200)
    return () => clearTimeout(done)
  }, [step])

  const toCapture = () => setStep({ at: "capture" })
  const leave = () => (router.canGoBack() ? router.back() : router.navigate("/"))

  async function save(meal: Meal) {
    const list = s.meals?.[day.key] ?? []
    const next = list.some((m) => m.id === meal.id) ? list.map((m) => (m.id === meal.id ? meal : m)) : [...list, meal]
    await s.save({ meals: { ...s.meals, [day.key]: next } })
    toast(`${slotName(meal.slot)} saved`)
    leave()
  }

  const time = () => editing?.time ?? (day.today ? clockOf(new Date()) : USUAL_TIME[slot])

  if (step.at === "check")
    return (
      <CheckStep
        key={step.n}
        reading={step.reading}
        slot={slot}
        onSlot={editing ? setSlot : undefined}
        day={day}
        editing={editing}
        ids={ids}
        onBack={editing ? undefined : toCapture}
        onRetake={
          editing
            ? undefined
            : step.reading.how === "voice"
              ? () => setStep({ at: "listening" })
              : step.reading.how === "typed"
                ? () => setStep({ at: "typing" })
                : toCapture
        }
        onSave={(draft) => save({ ...draft, id: editing?.id ?? newId(), time: time() })}
      />
    )

  if (step.at === "reading")
    return (
      <FlowScreen page title="Log a meal" onBack={toCapture}>
        <ReadingPanel />
      </FlowScreen>
    )

  if (step.at === "listening")
    return (
      <FlowScreen page title="Log a meal" onBack={toCapture}>
        <ListeningPanel
          transcript={VOICE.transcript ?? ""}
          onDone={() => setStep({ at: "check", reading: VOICE, n: Date.now() })}
        />
      </FlowScreen>
    )

  if (step.at === "typing") {
    const go = () => typed.trim() && setStep({ at: "check", reading: readTyped(typed), n: Date.now() })
    return (
      <FlowScreen
        page
        title="Log a meal"
        onBack={toCapture}
        footer={
          <Button onPress={go} disabled={!typed.trim()}>
            Continue
          </Button>
        }
      >
        <TextField
          label="What did you eat?"
          value={typed}
          onChangeText={setTyped}
          autoFocus
          multiline
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={go}
        />
      </FlowScreen>
    )
  }

  // Log again follows the chips: snacks for a snack, main meals otherwise.
  const recent = recentMeals(s.meals, now, 2, slot)
  return (
    <FlowScreen page title="Log a meal">
      <View style={styles.slots}>
        {!day.today && <Text style={styles.metaStrong}>{day.yesterday ? `For yesterday, ${day.label}` : `For ${day.label}`}</Text>}
        <ChipRow options={MEAL_SLOTS.map((m) => ({ value: m.id, label: m.name }))} value={slot} onChange={setSlot} />
      </View>

      <Card style={styles.capture}>
        <Art name="camera" size={96} style={styles.art} />
        <Button onPress={() => setStep({ at: "reading" })}>Take a photo</Button>
        <View style={styles.smallActions}>
          <SmallAction onPress={() => setStep({ at: "listening" })}>Say it</SmallAction>
          <SmallAction onPress={() => setStep({ at: "typing" })}>Type it</SmallAction>
        </View>
      </Card>

      {recent.length > 0 && (
        <Block title="Log again">
          <Group>
            {recent.map((m) => {
              // One tap logs it again: the pill, or anywhere on the row.
              const add = () => save({ ...m, id: newId(), slot, time: time(), how: "again", status: "confirmed", note: undefined })
              const label = `Add ${mealName(m)} to ${slotName(slot).toLowerCase()}`
              return (
                <NeedsRow
                  key={m.id}
                  title={mealName(m)}
                  meta={mealLine(m, profile)}
                  right={
                    <SmallAction accessibilityLabel={label} onPress={add}>
                      Add
                    </SmallAction>
                  }
                  onPress={add}
                  chevron={false}
                  accessibilityLabel={`${label}, ${mealLine(m, profile)}`}
                />
              )
            })}
          </Group>
        </Block>
      )}
    </FlowScreen>
  )
}

/* ------------------------------------------------------------ reading -- */

/** Reading the photo: a teal spinner and one line that changes every 0.7 s
    (still under Reduce Motion). */
function ReadingPanel() {
  const still = useReducedMotion()
  const [i, setI] = React.useState(0)
  React.useEffect(() => {
    if (still) return
    const tick = setInterval(() => setI((n) => Math.min(n + 1, READING_LINES.length - 1)), 700)
    return () => clearInterval(tick)
  }, [still])
  return (
    <Card style={styles.panel}>
      <ActivityIndicator size="large" color={color.primary} />
      <View style={styles.panelWords}>
        <Text style={styles.panelTitle} accessibilityRole="header">
          Reading your photo
        </Text>
        <Text style={styles.label} accessibilityLiveRegion="polite">
          {READING_LINES[still ? 0 : i]}
        </Text>
      </View>
    </Card>
  )
}

const native = Platform.OS !== "web"

/** "Say it": a pulsing mic while it listens, then what it heard, word by
    word, then on to reading it (the prototype always hears the same meal). */
function ListeningPanel({ transcript, onDone }: { transcript: string; onDone: () => void }) {
  const still = useReducedMotion()
  const words = transcript.split(" ")
  const [heard, setHeard] = React.useState(0)
  const pulse = React.useRef(new Animated.Value(0)).current
  const done = React.useRef(onDone)
  done.current = onDone

  React.useEffect(() => {
    if (still) return
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: native }))
    loop.start()
    return () => loop.stop()
  }, [still, pulse])

  React.useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    if (still) timers.push(setTimeout(() => setHeard(words.length), 900))
    else words.forEach((_, n) => timers.push(setTimeout(() => setHeard(n + 1), 900 + n * 160)))
    timers.push(setTimeout(() => done.current(), 900 + words.length * 160 + 1000))
    return () => timers.forEach(clearTimeout)
    // Plays once for the panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] })
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] })
  return (
    <Card style={styles.panel}>
      <View style={styles.mic}>
        {!still && <Animated.View style={[styles.micRing, { opacity, transform: [{ scale }] }]} />}
        <View style={styles.micCore}>
          <IconMic size={28} color={HUE.teal.ink} />
        </View>
      </View>
      <View style={styles.panelWords}>
        <Text style={styles.panelTitle} accessibilityRole="header">
          Listening
        </Text>
        <Text style={[styles.body, styles.centred]} accessibilityLiveRegion="polite">
          {heard ? `“${words.slice(0, heard).join(" ")}${heard === words.length ? "”" : ""}` : " "}
        </Text>
      </View>
    </Card>
  )
}

/* -------------------------------------------------------------- check -- */

type Choice = Portion | "removed"

const PORTION_OPTIONS: { value: Choice; label: string }[] = [
  { value: "less", label: "Less" },
  { value: "right", label: "About right" },
  { value: "more", label: "More" },
  { value: "removed", label: "Remove" },
]

const kcalOf = (f: DraftFood, p: Portion) => (f.nutrients.calories === undefined ? undefined : f.nutrients.calories * f.portions[p].factor)

/** Check what we found: every food with its portion (a tap changes it or
    removes it), the hidden fats question, and the totals, labelled as an
    estimate. "Not sure" keeps the estimate and says by how much it may be
    off. Saving is her confirmation. */
function CheckStep({
  reading,
  slot,
  onSlot,
  day,
  editing,
  ids,
  onBack,
  onRetake,
  onSave,
}: {
  reading: Reading
  slot: MealSlot
  /** Editing a logged meal can move it to another slot. */
  onSlot?: (slot: MealSlot) => void
  day: LogDay
  editing?: Meal
  /** The plan's nutrients for the totals line, without calories. */
  ids: NutrientId[]
  onBack?: () => void
  onRetake?: () => void
  onSave: (meal: Omit<Meal, "id" | "time">) => void
}) {
  const [portions, setPortions] = React.useState<Record<string, Choice>>({})
  const [fat, setFat] = React.useState<FatAnswer>()
  const [open, setOpen] = React.useState<string>()

  const kept = reading.foods.filter((f) => portions[f.key] !== "removed")
  const spoons = FAT_ANSWERS.find((a) => a.id === fat)?.spoons
  const foods: Food[] = kept.map((f) => {
    const p = f.portions[(portions[f.key] as Portion | undefined) ?? "right"]
    return { name: f.name, portion: p.words, confidence: f.confidence, nutrients: scaled(f.nutrients, p.factor) }
  })
  if (reading.fat && spoons)
    foods.push({ name: reading.fat.name, portion: spoons === 1 ? "About 1 tablespoon" : `About ${spoons} tablespoons`, confidence: "medium", nutrients: scaled(reading.fat.per, spoons) })
  const changed = kept.length < reading.foods.length
  const draft: Omit<Meal, "id" | "time"> = {
    slot,
    how: reading.how,
    foods,
    status: editing ? editing.status : fat && fat !== "unsure" ? "confirmed" : "estimated",
    note: editing ? editing.note : fat === "unsure" && reading.fat ? `${reading.fat.name}: not sure` : undefined,
    title: changed ? undefined : reading.title,
  }
  const totals = totalsOf([{ ...draft, id: "draft", time: "" }])
  // A typed meal the prototype could not place: kept as she wrote it.
  const unplaced = reading.foods.length === 1 && reading.foods[0].key === "typed"
  const known = Object.keys(totals).length > 0
  const estimated = known && (!editing || editing.status === "estimated")
  const food = reading.foods.find((f) => f.key === open)

  return (
    <View style={styles.fill}>
      <FlowScreen
        page
        title={editing ? `Edit ${slotName(editing.slot).toLowerCase()}` : "Log a meal"}
        onBack={onBack}
        footer={
          <Button onPress={() => onSave(draft)} disabled={!kept.length}>
            {editing ? "Save changes" : saveLabel(slot, day)}
          </Button>
        }
      >
        {onSlot && <ChipRow options={MEAL_SLOTS.map((m) => ({ value: m.id, label: m.name }))} value={slot} onChange={onSlot} />}

        <View style={styles.section}>
          <Block
            title={editing ? "What you had" : "Check what we found"}
            variant="title"
            action={
              onRetake ? (
                <TextAction tone="muted" onPress={onRetake}>
                  {RETAKE[reading.how]}
                </TextAction>
              ) : undefined
            }
          >
            {!!reading.transcript && !editing && !unplaced && <Text style={styles.label}>{`\u201C${reading.transcript}\u201D`}</Text>}
            {kept.length ? (
              <Group>
                {kept.map((f) => {
                  const p = (portions[f.key] as Portion | undefined) ?? "right"
                  const kcal = kcalOf(f, p)
                  return (
                    <NeedsRow
                      key={f.key}
                      title={f.name}
                      meta={f.portions[p].words}
                      right={<Kcal value={kcal} />}
                      onPress={() => setOpen(f.key)}
                      accessibilityLabel={`${f.name}, ${f.portions[p].words}, ${kcalWords(kcal)}. Change the amount`}
                    />
                  )
                })}
              </Group>
            ) : (
              <Card>
                <Text style={styles.title}>Nothing left to save</Text>
              </Card>
            )}
          </Block>

          {!!reading.fat && !editing && (
            <Card style={styles.question}>
              {/* Each question on its own line: "Was there dressing or oil?" then "About how much?". */}
              <Text style={styles.title}>{reading.fat.question.replace("? ", "?\n")}</Text>
              {/* The kit's chips, wrapping inside the card: one answer of four. */}
              <View style={styles.answers} accessibilityRole="radiogroup" accessibilityLabel={reading.fat.question}>
                {FAT_ANSWERS.map((a) => (
                  <Chip key={a.id} label={a.label} selected={fat === a.id} onPress={() => setFat(a.id)} radio />
                ))}
              </View>
            </Card>
          )}

          {kept.length > 0 && (
            <Card style={styles.totals}>
              <View style={styles.totalsTop}>
                <TotalsHead kcal={totals.calories} about={estimated} />
                {estimated && <Tag tone="muted">Estimated</Tag>}
              </View>
              <Text style={styles.label}>{known ? nutrientLine(totals, ids.slice(0, 3)) : "It saves as you wrote it, without numbers."}</Text>
              {fat === "unsure" && !!reading.fat && <Text style={[styles.meta, styles.unsure]}>{reading.fat.unsure}</Text>}
            </Card>
          )}
        </View>
      </FlowScreen>

      {food && (
        <PortionSheet
          food={food}
          value={portions[food.key] ?? "right"}
          onClose={() => setOpen(undefined)}
          onDone={(v) => {
            setPortions((all) => ({ ...all, [food.key]: v }))
            setOpen(undefined)
          }}
        />
      )}
    </View>
  )
}

/** How much of one food: less, about right, more, or remove it. */
function PortionSheet({ food, value, onDone, onClose }: { food: DraftFood; value: Choice; onDone: (v: Choice) => void; onClose: () => void }) {
  const [choice, setChoice] = React.useState<Choice>(value)
  const kcal = choice === "removed" ? undefined : kcalOf(food, choice)
  const line =
    choice === "removed"
      ? "Removed from this meal"
      : `${food.portions[choice].words}, ${kcal === undefined ? "energy not known" : `${formatNumber(Math.round(kcal))} kcal`}`
  return (
    <Sheet title={food.name} onClose={onClose}>
      <Text style={styles.body}>{line}</Text>
      <ChipRow options={PORTION_OPTIONS} value={choice} onChange={setChoice} />
      <Button onPress={() => onDone(choice)}>Done</Button>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  section: { gap: space.item },
  // "For yesterday, Fri, Oct 2" labels the chips under it.
  slots: { gap: space.inline },
  title: { ...type.title },
  body: { ...type.body },
  label: { ...type.label },
  meta: { ...type.meta },
  metaStrong: { ...type.metaStrong },
  centred: { textAlign: "center" },

  capture: { gap: space.card },
  art: { alignSelf: "center" },
  smallActions: { flexDirection: "row", justifyContent: "center", gap: space.item },

  // The mic and the spinner: a fixed stage, so the panel never jumps.
  panel: { alignItems: "center", justifyContent: "center", gap: space.card, minHeight: 240 },
  panelWords: { alignItems: "center", gap: space.stack },
  panelTitle: { ...type.section, textAlign: "center" },
  mic: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  micRing: { position: "absolute", width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: color.primary },
  micCore: { width: 72, height: 72, borderRadius: 36, backgroundColor: HUE.teal.tint, alignItems: "center", justifyContent: "center" },

  question: { gap: space.item },
  answers: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  totals: { gap: space.stack },
  unsure: { marginTop: space.stack },
  totalsTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item },
})
