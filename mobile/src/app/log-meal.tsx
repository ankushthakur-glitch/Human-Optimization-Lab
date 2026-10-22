import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { ProductStep, ScanStep } from "@/components/meal-scan"
import { TypeSheet, VoiceSheet } from "@/components/meal-sheets"
import { ForkKnife, Microphone, PencilSimple, Scan } from "@/components/ph"
import { Block, Card, ChipRow, Group, HUE, NeedsRow, SmallAction, Tabs, Tag, TextAction } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { Kcal, TotalsHead, isSlot, kcalWords, logDay, nutrientLine, recentMeals, saveLabel, slotName, type LogDay } from "@/components/today-food-meals"
import {
  VOICE,
  readTyped,
  readingOf,
  scaled,
  type DraftFood,
  type Portion,
  type Reading,
} from "@/components/today-food-readings"
import type { Product } from "@/components/scan-food"
import { toast } from "@/components/toast"
import { Button, TextField } from "@/components/ui"
import { MEAL_SLOTS, clockOf, mealLine, mealName, profileOf, slotAt, totalsOf, type Food, type Meal, type MealSlot, type NutrientId } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { space, type } from "@/lib/theme"
import { formatNumber } from "@/lib/trends"

/* Log a meal (FINAL-SPEC C.22): logging that takes two taps and never
   guesses silently (M-12, M-16, M-17, M-19). Four steps in one route:
   capture (scanning a package, her voice or typing, or a recent meal
   again), checking what was found (for a scan: how much she had), and
   saved. The back button steps back a step;
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
  | { at: "scan" }
  | { at: "product"; product: Product }
  | { at: "check"; reading: Reading; n: number }

/** When a meal logged for an earlier day is usually eaten. */
const USUAL_TIME: Record<MealSlot, string> = { breakfast: "8:00 AM", lunch: "12:30 PM", snack: "3:30 PM", dinner: "6:30 PM" }

const RETAKE: Record<Meal["how"], string> = { photo: "Retake", voice: "Say it again", typed: "Type it again", again: "Retake", scan: "Scan again" }

const newId = () => `m-${Date.now().toString(36)}`

/* The meal tabs offer breakfast, lunch and dinner only; a snack already
   logged keeps its own tab while it is edited. A snack hour opens on
   dinner. */
const slotTabs = (slot: MealSlot) =>
  MEAL_SLOTS.filter((m) => m.main || m.id === slot).map((m) => ({ value: m.id, label: m.name }))
const mainSlot = (slot: MealSlot): MealSlot => (slot === "snack" ? "dinner" : slot)

export default function LogMealScreen() {
  const s = useOnboarding()
  const params = useLocalSearchParams<{ slot?: string; day?: string; edit?: string; via?: string }>()
  const [now] = React.useState(() => new Date())
  const day = React.useMemo(() => logDay(params.day, now), [params.day, now])
  const [editing] = React.useState(() => (params.edit ? s.meals?.[day.key]?.find((m) => m.id === params.edit) : undefined))
  const [slot, setSlot] = React.useState<MealSlot>(() => editing?.slot ?? mainSlot(isSlot(params.slot) ? params.slot : slotAt(now)))
  const [step, setStep] = React.useState<Step>(() =>
    editing ? { at: "check", reading: readingOf(editing, mealName(editing)), n: 0 } : params.via === "scan" ? { at: "scan" } : { at: "capture" }
  )
  const profile = profileOf(s)
  const ids = profile.goals.map((g) => g.id).filter((id) => id !== "calories")

  // The plan's Today tab opens straight on a way in: "scan" or "type".
  const [sheet, setSheet] = React.useState<"voice" | "type" | undefined>(() => (!editing && params.via === "type" ? "type" : undefined))

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

  if (step.at === "scan") return <ScanStep onBack={toCapture} onFound={(product) => setStep({ at: "product", product })} />

  if (step.at === "product")
    return (
      <ProductStep
        product={step.product}
        slot={slot}
        onSlot={setSlot}
        day={day}
        ids={ids}
        onBack={() => setStep({ at: "scan" })}
        onSave={(draft) => save({ ...draft, id: newId(), time: time() })}
      />
    )

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
              ? () => {
                  toCapture()
                  setSheet("voice")
                }
              : step.reading.how === "typed"
                ? () => {
                    toCapture()
                    setSheet("type")
                  }
                : toCapture
        }
        onSave={(draft) => save({ ...draft, id: editing?.id ?? newId(), time: time() })}
      />
    )

  // Log again follows the chips: snacks for a snack, main meals otherwise.
  const recent = recentMeals(s.meals, now, 2, slot)
  return (
    <View style={styles.fill}>
      <FlowScreen page title="Log a meal">
      <View style={styles.slots}>
        {!day.today && <Text style={styles.metaStrong}>{day.yesterday ? `For yesterday, ${day.label}` : `For ${day.label}`}</Text>}
        <Tabs snug options={slotTabs(slot)} value={slot} onChange={setSlot} />
      </View>

      {/* Three ways in, as rows: scanning a package first, then her voice,
          then typing. */}
      <Block title="Log it">
        <Group>
          <NeedsRow icon={<Scan size={16} color={HUE.teal.ink} />} title="Scan food" onPress={() => setStep({ at: "scan" })} />
          <NeedsRow icon={<Microphone size={16} color={HUE.teal.ink} />} title="Say it" onPress={() => setSheet("voice")} />
          <NeedsRow icon={<PencilSimple size={16} color={HUE.teal.ink} />} title="Type it" onPress={() => setSheet("type")} />
        </Group>
      </Block>

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
                  icon={<ForkKnife size={16} color={HUE.teal.ink} />}
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
      {sheet === "voice" && (
        <VoiceSheet
          transcript={VOICE.transcript ?? ""}
          onClose={() => setSheet(undefined)}
          onDone={() => {
            setSheet(undefined)
            setStep({ at: "check", reading: VOICE, n: Date.now() })
          }}
        />
      )}
      {sheet === "type" && (
        <TypeSheet
          onClose={() => setSheet(undefined)}
          onDone={(text) => {
            setSheet(undefined)
            setStep({ at: "check", reading: readTyped(text), n: Date.now() })
          }}
        />
      )}
    </View>
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

const kcalOf = (f: DraftFood, p: Portion, custom?: number) =>
  custom !== undefined ? custom : f.nutrients.calories === undefined ? undefined : f.nutrients.calories * f.portions[p].factor

/** Only digits for a typed calorie amount. */
const kcalDigits = (text: string) => text.replace(/\D/g, "").slice(0, 4)

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
  const [open, setOpen] = React.useState<string>()
  // Calories she typed for a food, which replace its portion's estimate.
  const [custom, setCustom] = React.useState<Record<string, number>>({})

  const kept = reading.foods.filter((f) => portions[f.key] !== "removed")
  const foods: Food[] = kept.map((f) => {
    const p = f.portions[(portions[f.key] as Portion | undefined) ?? "right"]
    const typed = custom[f.key]
    if (typed !== undefined) {
      // Her number replaces the calories; the other nutrients follow it.
      const base = f.nutrients.calories
      const nutrients = scaled(f.nutrients, base ? typed / base : 1)
      return { name: f.name, portion: `Adjusted to ${formatNumber(typed)} kcal`, confidence: f.confidence, nutrients: { ...nutrients, calories: typed } }
    }
    return { name: f.name, portion: p.words, confidence: f.confidence, nutrients: scaled(f.nutrients, p.factor) }
  })
  const changed = kept.length < reading.foods.length
  const draft: Omit<Meal, "id" | "time"> = {
    slot,
    how: reading.how,
    foods,
    status: editing ? editing.status : "estimated",
    note: editing?.note,
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
          <PrimaryButton onPress={() => onSave(draft)} disabled={!kept.length}>
            {editing ? "Save changes" : saveLabel(slot, day)}
          </PrimaryButton>
        }
      >
        {onSlot && <Tabs snug options={slotTabs(slot)} value={slot} onChange={onSlot} />}

        <View style={styles.section}>
          <Block
            title={editing ? "What you had" : "Check what we found"}
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
                  const kcal = kcalOf(f, p, custom[f.key])
                  return (
                    <NeedsRow
                      key={f.key}
                      icon={<ForkKnife size={16} color={HUE.teal.ink} />}
                      title={f.name}
                      meta={custom[f.key] !== undefined ? `Adjusted to ${formatNumber(custom[f.key])} kcal` : f.portions[p].words}
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

          {kept.length > 0 && (
            <Card style={styles.totals}>
              <View style={styles.totalsTop}>
                <TotalsHead kcal={totals.calories} about={estimated} />
                {estimated && <Tag tone="muted">Estimated</Tag>}
              </View>
              <Text style={styles.label}>{known ? nutrientLine(totals, ids.slice(0, 3)) : "It saves as you wrote it, without numbers."}</Text>
            </Card>
          )}
        </View>
      </FlowScreen>

      {food && (
        <PortionSheet
          food={food}
          value={portions[food.key] ?? "right"}
          custom={custom[food.key]}
          onClose={() => setOpen(undefined)}
          onDone={(v, typed) => {
            setPortions((all) => ({ ...all, [food.key]: v }))
            setCustom((all) => {
              const { [food.key]: _gone, ...rest } = all
              return typed !== undefined ? { ...rest, [food.key]: typed } : rest
            })
            setOpen(undefined)
          }}
        />
      )}
    </View>
  )
}

/** How much of one food: less, about right, more, or remove it, or the
    calories typed in. Choosing a chip clears the typed number; typing one
    clears the chip. */
function PortionSheet({
  food,
  value,
  custom,
  onDone,
  onClose,
}: {
  food: DraftFood
  value: Choice
  custom?: number
  onDone: (v: Choice, kcal?: number) => void
  onClose: () => void
}) {
  const [choice, setChoice] = React.useState<Choice>(value)
  const [typed, setTyped] = React.useState(custom !== undefined ? String(custom) : "")
  const entered = typed ? Number(typed) : undefined
  const kcal = choice === "removed" ? undefined : kcalOf(food, choice, entered)
  const line =
    choice === "removed"
      ? "Removed from this meal"
      : `${entered !== undefined ? "Adjusted" : food.portions[choice].words}, ${kcal === undefined ? "energy not known" : `${formatNumber(Math.round(kcal))} kcal`}`
  return (
    <Sheet title={food.name} onClose={onClose}>
      <Text style={styles.body}>{line}</Text>
      <ChipRow
        options={PORTION_OPTIONS}
        value={choice}
        onChange={(c) => {
          setChoice(c)
          setTyped("")
        }}
      />
      <TextField
        label="Calories"
        value={typed}
        onChangeText={(text) => {
          const next = kcalDigits(text)
          setTyped(next)
          if (next && choice === "removed") setChoice("right")
        }}
        keyboardType="number-pad"
        returnKeyType="done"
        placeholder="Enter calories"
        style={styles.input}
        trailing={<Text style={styles.unit}>kcal</Text>}
      />
      <Button onPress={() => onDone(choice, entered)}>Done</Button>
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
  // Lets the input give way to its unit, as on the exercise page.
  input: { minWidth: 0 },
  unit: { ...type.unitLarge, paddingRight: 14 },


  totals: { gap: space.stack },
  totalsTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item },
})
