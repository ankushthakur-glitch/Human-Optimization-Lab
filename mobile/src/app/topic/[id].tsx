import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import { AlcoholLog } from "@/components/alcohol-week"
import { DAYS_LIMIT, SITTING_LIMIT, daysThisWeek, drinksWord, sittingsOf } from "@/lib/alcohol"
import {
  MAX_ATTACHMENTS,
  type Attachment,
} from "@/components/attach-sheet"
import { PageNotFoundState } from "@/components/error-state"
import { Checkbox } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { ProductStep, ScanStep } from "@/components/meal-scan"
import { MeasureSheet } from "@/components/measure-sheet"
import {
  Check,
  DeviceMobile,
  ForkKnife,
  Microphone,
  Play,
  Plus,
  StopSquare,
  UploadSimple,
  Warning,
  X,
} from "@/components/ph"
import { ChoiceRow, SheetRows } from "@/components/care-orders-rows"
import {
  Block,
  Card,
  Group,
  HUE,
  NeedsRow,
  Tabs,
  Tag,
  TickCircle,
  toast,
  type Hue,
} from "@/components/record-kit"
import { AddToRecordSheet } from "@/components/record-rows"
import { Sheet, useKeyboardHeight } from "@/components/sheet"
import { SetTable } from "@/components/set-table"
import { amount } from "@/components/today-exercise-parts"
import { isSlot, logDay, slotName } from "@/components/today-food-meals"
import type { Product } from "@/components/scan-food"
import { SelectField, TextField } from "@/components/ui"
import {
  ScoreDial,
  TargetCard,
  TopicPage,
  Ways,
  askAbout,
} from "@/components/topic-kit"
import { VoiceBeam } from "@/components/voice-beam"
import { WaistGuideButton, WaistGuideSheet } from "@/components/waist-guide"
import {
  MEAL_SLOTS,
  clockOf,
  localDay,
  mealName,
  mealsOn,
  profileOf,
  totalsOf,
  type Meal,
  type MealSlot,
} from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import {
  ALSO_TAKING,
  CARDIO,
  DOSES,
  LIFTS,
  SEVERITY,
  SLEEP_LAST,
  SPOKEN_FOODS,
  SPOKEN_SAMPLE,
  WARMUP,
  hm,
  inBed,
  rowOf,
  topicOf,
  type Topic,
  type Way,
} from "@/lib/topics"
import { formatNumber } from "@/lib/trends"
import {
  changeTo,
  loadShort,
  setsText,
  targetOf,
  type Target,
} from "@/lib/strength"
import { useVoiceInput } from "@/lib/voice"
import {
  card,
  chart,
  color,
  font,
  hairline,
  ink,
  space,
  surface,
  type,
} from "@/lib/theme"

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
  const { id, slot, day } = useLocalSearchParams<{
    id: string
    slot?: string
    day?: string
  }>()
  const topic = topicOf(id)
  if (!topic) return <PageNotFoundState />
  return (
    <TopicBody
      topic={topic}
      slot={isSlot(slot) ? slot : undefined}
      mealDay={day}
    />
  )
}

/** `slot` and `mealDay` come from a Log a meal door that already knows the
    meal (a planned dinner, a day's empty lunch): Eat's ways then skip the
    question and log straight into it. */
function TopicBody({
  topic,
  slot,
  mealDay,
}: {
  topic: Topic
  slot?: MealSlot
  mealDay?: string
}) {
  const s = useOnboarding()
  const [sheet, setSheet] = React.useState(false)
  const [part, setPart] = React.useState(false)
  const [short, setShort] = React.useState(false)
  const [night, setNight] = React.useState(false)
  // Which way asked for the meal: the photo opens its photos and words, the barcode the scan.
  const [meal, setMeal] = React.useState<"photo" | "barcode">()
  const [photo, setPhoto] = React.useState<MealSlot>()
  const [guide, setGuide] = React.useState(false)
  const [drinks, setDrinks] = React.useState(false)
  const [dose, setDose] = React.useState<"taken" | "side" | "add">()
  const [apps, setApps] =
    React.useState<Extract<Way["act"], { kind: "apps" }>>()
  // The scan opens over this page as its popup.
  const [scan, setScan] = React.useState<MealSlot>()
  const [found, setFound] = React.useState<{
    product: Product
    servings?: number
  }>()
  const closeScan = () => (setScan(undefined), setFound(undefined))
  async function saveScan(draft: Omit<Meal, "id" | "time">) {
    const on = logDay(mealDay, new Date())
    const meal: Meal = {
      ...draft,
      id: `m-${Date.now().toString(36)}`,
      time: clockOf(new Date()),
    }
    await s.save({
      meals: { ...s.meals, [on.key]: [...(s.meals?.[on.key] ?? []), meal] },
    })
    toast(`${slotName(meal.slot)} saved`)
    closeScan()
  }
  const day = localDay()
  const row = rowOf(s, topic, day)
  const logged = s.topicLog?.[day]?.[topic.id]

  function pick(way: Way) {
    const act = way.act
    if (act.kind === "done") {
      s.save({
        topicLog: {
          ...s.topicLog,
          [day]: {
            ...s.topicLog?.[day],
            [topic.id]: { way: way.id, at: new Date().toISOString() },
          },
        },
      })
      toast(
        `${topic.name === "Medication & supplements" ? "Medication" : topic.name} logged. ${way.badge}.`
      )
    } else if (act.kind === "go")
      router.push({ pathname: act.href as never, params: act.params })
    else if (act.kind === "ask") askAbout(act.ask)
    else if (act.kind === "part") setPart(true)
    else if (act.kind === "short") setShort(true)
    else if (act.kind === "night") setNight(true)
    else if (act.kind === "dose") setDose(act.sheet)
    else if (act.kind === "apps") setApps(act)
    else if (act.kind === "meal") {
      if (slot) setPhoto(slot)
      else setMeal("photo")
    } else if (act.kind === "barcode") {
      if (slot) setScan(slot)
      else setMeal("barcode")
    } else setSheet(true)
  }

  return (
    <TopicPage
      title={topic.id === "medication" ? "Medication" : topic.name}
      sheet={
        (sheet && <MeasureSheet onClose={() => setSheet(false)} />) ||
        (drinks && <DrinksSheet onClose={() => setDrinks(false)} />) ||
        (guide && (
          <WaistGuideSheet
            onClose={() => setGuide(false)}
            onEnter={() => setSheet(true)}
          />
        )) ||
        (part && <PartSheet onClose={() => setPart(false)} />) ||
        (short && <ShortSheet onClose={() => setShort(false)} />) ||
        (night && <NightSheet onClose={() => setNight(false)} />) ||
        (dose === "taken" && (
          <TakenSheet onClose={() => setDose(undefined)} />
        )) ||
        (dose === "side" && (
          <SideEffectSheet onClose={() => setDose(undefined)} />
        )) ||
        (dose === "add" && (
          <AddToRecordSheet
            kinds={["medicines", "supplements"]}
            onClose={() => setDose(undefined)}
          />
        )) ||
        (apps && <AppsSheet act={apps} onClose={() => setApps(undefined)} />) ||
        (meal && (
          <WhichMeal
            onPick={(to) => {
              setMeal(undefined)
              if (meal === "photo") setPhoto(to)
              else setScan(to)
            }}
            onClose={() => setMeal(undefined)}
          />
        )) ||
        (photo && (
          <PhotoMeal
            slot={photo}
            onSave={(m) => (setPhoto(undefined), saveScan(m))}
            onClose={() => setPhoto(undefined)}
          />
        )) ||
        (scan && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {found ? (
              <ProductStep
                product={found.product}
                servings={found.servings}
                slot={scan}
                onSlot={setScan}
                day={logDay(mealDay, new Date())}
                ids={profileOf(s)
                  .goals.map((g) => g.id)
                  .filter((g) => g !== "calories")}
                onBack={() => setFound(undefined)}
                onSave={saveScan}
              />
            ) : (
              <ScanStep
                slot={scan}
                onBack={closeScan}
                onFound={(product, servings) => setFound({ product, servings })}
                onSave={saveScan}
              />
            )}
          </View>
        ))
      }
    >
      <View style={styles.chip}>
        <Tag tone="primary">{topic.tag}</Tag>
      </View>
      <TargetCard
        icon={topic.id}
        title={topic.target.replace(/ · 1,000 mg calcium$/, "")}
        detail={topic.detail}
        figure={
          logged ? (topic.id === "sleep" ? undefined : row.text) : topic.figure
        }
      />

      {topic.id === "exercise" && <Session />}
      {topic.id === "eat" && <TodaysMeals />}
      {topic.id === "sleep" && <LastNight />}

      <Ways ways={topic.ways} onPick={pick} picked={logged?.way} />

      {topic.id === "eat" && <AlcoholLog onLog={() => setDrinks(true)} />}

      {topic.id === "medication" && <AlsoTaking />}

      {topic.id === "measure" && (
        <WaistGuideButton onPress={() => setGuide(true)} />
      )}
    </TopicPage>
  )
}

/* ------------------------------------------------------------- exercise -- */

/** Today's session in full: the warm-up, every lift with its sets and
    reps and the load; Form opens how it is done. Reps and loads are this
    week's targets, stepped on from what she logged (lib/strength.ts), never
    prescribed blind; with nothing logged they stay as written. */
function Session() {
  const s = useOnboarding()
  const log = s.exercises?.[localDay()]
  const skipped = s.topicLog?.[localDay()]?.exercise?.skipped
  // A lift she has saved or skipped is closed: it drops to the foot of the
  // list, struck through, while the rest stay open in the plan's order.
  // A lift ticked set by set on its page closes once every set is in.
  const done = (id: string) => {
    const l = LIFTS.find((x) => x.id === id)!
    const entries = log?.[id]?.entries
    return (
      !!skipped?.includes(id) ||
      (!!log?.[id] &&
        (!entries ||
          entries.filter((e) => e.reps !== undefined).length >=
            targetOf(s, l).sets))
    )
  }
  const lifts = [
    ...LIFTS.filter((l) => !done(l.id)),
    ...LIFTS.filter((l) => done(l.id)),
  ]
  return (
    <Block title="Today's session">
      <View style={styles.table}>
        <Line
          name={WARMUP.name}
          detail={WARMUP.detail}
          end={WARMUP.say}
          shaded
        />
        {lifts.map((l) => {
          const finished = done(l.id)
          const t = targetOf(s, l)
          return (
            <View
              key={l.id}
              style={[styles.line, styles.rule, finished && styles.closed]}
            >
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/lift/[id]", params: { id: l.id } })
                }
                disabled={finished}
                accessibilityRole="button"
                accessibilityState={{ disabled: finished }}
                accessibilityLabel={
                  finished
                    ? `${l.name}, ${skipped?.includes(l.id) ? "skipped" : "done"}`
                    : `How to do the ${l.name}`
                }
                hitSlop={8}
                style={({ pressed }) => [
                  styles.lift,
                  styles.fill,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.playDot, finished && styles.playDotDone]}>
                  {finished ? (
                    <Check size={10} weight="bold" color={color.ok} />
                  ) : (
                    <Play size={10} weight="fill" color={ink.primary} />
                  )}
                </View>
                <Text
                  style={[
                    styles.lineName,
                    styles.fill,
                    finished && styles.struck,
                  ]}
                >
                  {l.name}
                </Text>
              </Pressable>
              <Text
                style={[styles.sets, type.label, finished && styles.struck]}
              >
                {setsText(t)}
              </Text>
              <Text style={[styles.load, finished && styles.struck]}>
                {skipped?.includes(l.id) ? "Skipped" : loadShort(l, t.load)}
              </Text>
            </View>
          )
        })}
        <Line
          name={CARDIO.name}
          detail={CARDIO.detail}
          end={CARDIO.say}
          shaded
          rule
        />
      </View>
    </Block>
  )
}

/** "Do part of it": every part of today's session, each As written, Part
    done, Changed or Skipped (HOL, 27 Oct). As written needs no typing and
    saves the plan's sets; a lift marked Part done or Changed opens its sets
    as a compact table, filled with the plan's numbers (or what she already
    saved on the lift's page) for her to correct. A Changed lift can keep its
    new numbers going forward, written to her record as a change of weight
    or reps. Saving writes each lift's sets to the day's log, so the session
    strikes them through, and answers the topic with each part's mark. */
function PartSheet({ onClose }: { onClose: () => void }) {
  const s = useOnboarding()
  const day = localDay()
  const before = s.topicLog?.[day]?.exercise
  const saved = s.exercises?.[day]
  const [sets, setSets] = React.useState<Record<string, SetRow[]>>(() =>
    Object.fromEntries(
      LIFTS.map((l) => {
        const logged = saved?.[l.id]?.entries?.map((e) => ({
          reps: e.reps !== undefined ? String(e.reps) : "",
          weight: e.weightLb !== undefined ? String(e.weightLb) : "",
        }))
        return [l.id, logged?.length ? logged : planOf(targetOf(s, l))]
      })
    )
  )
  // Each part opens as she marked it; a lift saved on its page with
  // numbers other than the plan's opens as Changed.
  const [status, setStatus] = React.useState<Record<string, Status>>(() => {
    const all = [WARMUP_ID, ...LIFTS.map((l) => l.id), CARDIO_ID]
    return Object.fromEntries(
      all.map((id) => {
        if (before?.marks?.[id]) return [id, before.marks[id]]
        if (before?.skipped?.includes(id)) return [id, "skipped"]
        const lift = LIFTS.find((l) => l.id === id)
        return [
          id,
          lift &&
          sets[id] &&
          JSON.stringify(sets[id]) !== JSON.stringify(planOf(targetOf(s, lift)))
            ? "changed"
            : "written",
        ]
      })
    )
  })
  // Lifts whose Changed numbers she wants to keep going forward.
  const [keep, setKeep] = React.useState<Record<string, boolean>>({})
  const [note, setNote] = React.useState(before?.note ?? "")
  const keyboard = useKeyboardHeight()
  const edit = (id: string, i: number, part: Partial<SetRow>) =>
    setSets((was) => ({
      ...was,
      [id]: was[id].map((r, j) => (j === i ? { ...r, ...part } : r)),
    }))

  const ids = Object.keys(status)
  const done = ids.filter((id) => status[id] !== "skipped")
  const typed = (id: string) =>
    status[id] === "part" || status[id] === "changed"
  const ready = LIFTS.every(
    (l) =>
      !typed(l.id) ||
      sets[l.id].every(
        (r) => amount(r.reps) !== undefined && amount(r.weight) !== undefined
      )
  )

  async function save() {
    // One write for the whole session: each lift done carries its sets, a
    // skipped lift drops anything saved for it today.
    const day_ = { ...s.exercises?.[day] }
    const at = new Date().toISOString()
    for (const l of LIFTS) {
      if (status[l.id] === "skipped") {
        delete day_[l.id]
        continue
      }
      // Her after-set answers from the lift's page stay with their sets.
      const felt = saved?.[l.id]?.entries
      const list = (typed(l.id) ? sets[l.id] : planOf(targetOf(s, l))).map(
        (r, i) => ({
          reps: amount(r.reps)!,
          weightLb: amount(r.weight)!,
          rir: felt?.[i]?.rir,
        })
      )
      day_[l.id] = {
        at,
        sets: list.length,
        reps: list[0].reps,
        weightLb: list[0].weightLb,
        entries: list,
      }
    }
    const skipped = ids.filter((id) => status[id] === "skipped")
    // A Changed lift ticked to keep holds at its first set's numbers from
    // now on, each change written to her record.
    let held: Partial<typeof s> = {}
    for (const l of LIFTS) {
      if (status[l.id] !== "changed" || !keep[l.id]) continue
      held = {
        ...held,
        ...changeTo(
          { ...s, ...held },
          l,
          {
            sets: sets[l.id].length,
            reps: amount(sets[l.id][0].reps)!,
            load: amount(sets[l.id][0].weight)!,
          },
          at
        ),
      }
    }
    await s.save({
      ...held,
      exercises: { ...s.exercises, [day]: day_ },
      topicLog: {
        ...s.topicLog,
        [day]: {
          ...s.topicLog?.[day],
          exercise: {
            way: "part",
            at,
            parts: done,
            skipped,
            marks: status,
            note: note.trim() || undefined,
          },
        },
      },
    })
    toast(
      `Exercise logged: ${done.length} of ${ids.length} done${skipped.length ? `, ${skipped.length} skipped` : ""}.`
    )
    onClose()
  }

  return (
    <View
      style={[styles.sheetFrame, { bottom: keyboard }]}
      pointerEvents="box-none"
    >
      <Sheet title="Log your session" onClose={onClose} tall>
        <Text style={type.meta}>{`${done.length} of ${ids.length} done`}</Text>
        <ScrollView
          style={styles.partScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.parts}>
            <PartCard
              name={WARMUP.name}
              detail={`${WARMUP.detail}, ${WARMUP.say.toLowerCase()}`}
              options={PLAIN}
              status={status[WARMUP_ID]}
              onStatus={(v) => setStatus((was) => ({ ...was, [WARMUP_ID]: v }))}
            />
            {LIFTS.map((l) => (
              <PartCard
                key={l.id}
                name={l.name}
                detail={`${setsText(targetOf(s, l))} at ${loadShort(l, targetOf(s, l).load)}`}
                options={STATUS}
                status={status[l.id]}
                onStatus={(v) => setStatus((was) => ({ ...was, [l.id]: v }))}
              >
                <SetTable
                  rows={sets[l.id]}
                  onEdit={(i, part) => edit(l.id, i, part)}
                  target={String(targetOf(s, l).reps)}
                  onInset
                />
                {status[l.id] === "changed" && (
                  <Checkbox
                    checked={!!keep[l.id]}
                    onChange={(on) =>
                      setKeep((was) => ({ ...was, [l.id]: on }))
                    }
                  >
                    Keep these weights and reps
                  </Checkbox>
                )}
              </PartCard>
            ))}
            <PartCard
              name={CARDIO.name}
              detail={`${CARDIO.detail}, ${CARDIO.say}`}
              options={PLAIN}
              status={status[CARDIO_ID]}
              onStatus={(v) => setStatus((was) => ({ ...was, [CARDIO_ID]: v }))}
            />
            <TextField
              label="Note"
              value={note}
              onChangeText={setNote}
              placeholder="How it went, what you changed"
              multiline
              autoCapitalize="sentences"
            />
          </View>
        </ScrollView>
        <PrimaryButton onPress={save} disabled={!done.length || !ready}>
          Save your session
        </PrimaryButton>
      </Sheet>
    </View>
  )
}

type Status = "written" | "part" | "changed" | "skipped"
type SetRow = { reps: string; weight: string }
const WARMUP_ID = "warmup"
const CARDIO_ID = "cardio"
// A lift can be done in part or changed; the warm-up and cardio are done
// as written, in part, or not at all.
const STATUS: { value: Status; label: string; hue?: Hue }[] = [
  { value: "written", label: "As written" },
  { value: "part", label: "Part done", hue: "amber" },
  { value: "changed", label: "Changed", hue: "amber" },
  { value: "skipped", label: "Skipped", hue: "neutral" },
]
const PLAIN = STATUS.filter((o) => o.value !== "changed")

/** A lift's target sets, one row each with its reps and weight. */
function planOf(t: Target): SetRow[] {
  return Array.from({ length: t.sets }, () => ({
    reps: String(t.reps),
    weight: String(t.load),
  }))
}

/** One part of the session in the log sheet, on a grey card: its name and
    plan, then how it went, and under it, once Part done or Changed, its
    sets. */
function PartCard({
  name,
  detail,
  options,
  status,
  onStatus,
  children,
}: {
  name: string
  detail: string
  options: typeof STATUS
  status: Status
  onStatus: (v: Status) => void
  children?: React.ReactNode
}) {
  return (
    <View style={styles.partCard}>
      <View>
        <Text style={[styles.lineName, status === "skipped" && styles.struck]}>
          {name}
        </Text>
        <Text style={type.label}>{detail}</Text>
      </View>
      <Tabs options={options} value={status} onChange={onStatus} snug />
      {(status === "part" || status === "changed") && children}
    </View>
  )
}

function Line({
  name,
  detail,
  end,
  shaded,
  rule,
}: {
  name: string
  detail: string
  end: string
  shaded?: boolean
  rule?: boolean
}) {
  return (
    <View style={[styles.line, shaded && styles.shaded, rule && styles.rule]}>
      <Text style={[styles.lineName, styles.fill]}>{name}</Text>
      <Text style={type.label}>{detail}</Text>
      <Text style={styles.lineEnd}>{end}</Text>
    </View>
  )
}

/* ------------------------------------------------------------------ eat -- */

/** Before any way of logging a meal: which meal it is. Breakfast, lunch
    and dinner, one tap each, then straight into the way she chose. */
function WhichMeal({
  onPick,
  onClose,
}: {
  onPick: (slot: MealSlot) => void
  onClose: () => void
}) {
  return (
    <Sheet title="Which meal are you adding?" onClose={onClose}>
      <SheetRows>
        {MEAL_SLOTS.filter((m) => m.main).map((m) => (
          <NeedsRow
            key={m.id}
            icon={<ForkKnife size={16} color={HUE.teal.ink} />}
            title={m.name}
            onPress={() => onPick(m.id)}
          />
        ))}
      </SheetRows>
    </Sheet>
  )
}

/** Photograph your meal: up to four photos (the plate, a menu, a label)
    and the words about it in one box, typed or spoken, the voice beam along
    its edge while she speaks. The words are read into foods as she goes,
    each with its usual portion; with photos and no words the photos are
    read instead. A food the app does not know is kept by name. Saved as an
    estimate, with her words as the meal's note. */
function PhotoMeal({
  slot,
  onSave,
  onClose,
}: {
  slot: MealSlot
  onSave: (meal: Omit<Meal, "id" | "time">) => void
  onClose: () => void
}) {
  const [photos, setPhotos] = React.useState<Attachment[]>([])
  const [said, setSaid] = React.useState("")
  const [spoke, setSpoke] = React.useState(false)
  const [reading, setReading] = React.useState(false)
  const sample =
    SPOKEN_SAMPLE[slot as keyof typeof SPOKEN_SAMPLE] ?? SPOKEN_SAMPLE.lunch
  const speech = useVoiceInput(setSaid, { sample, keep: true })
  const keyboard = useKeyboardHeight()
  const listening = speech.state === "listening"
  const hearing = speech.state !== "idle"
  const words = said.trim()
  // The prototype "reads" new photos for a moment, as the camera "finds" a barcode.
  React.useEffect(() => {
    if (!photos.length) return
    setReading(true)
    const t = setTimeout(() => setReading(false), 900)
    return () => clearTimeout(t)
  }, [photos.length])
  const busy = reading && !words
  const foods =
    hearing || busy ? [] : foodsIn(words || (photos.length ? sample : ""))
  const name = slotName(slot).toLowerCase()
  const room = MAX_ATTACHMENTS - photos.length

  // The plus opens the phone's own photo picker straight away, several at once.
  async function addPhotos() {
    if (hearing) speech.stop()
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: room,
      quality: 0.8,
    }).catch(() => undefined)
    if (!r || r.canceled) return
    const more = r.assets.map((a) => ({
      id: Math.random().toString(36).slice(2, 10),
      kind: "image" as const,
      uri: a.uri,
      name: a.fileName ?? "Photo",
    }))
    setPhotos((p) => [...p, ...more].slice(0, MAX_ATTACHMENTS))
  }

  return (
    <View
      style={[styles.sheetFrame, { bottom: keyboard }]}
      pointerEvents="box-none"
    >
      <Sheet
        title={`Log your ${name}`}
        onClose={onClose}
        dismissOnScrim={!hearing}
      >
        <View style={styles.photos}>
          {photos.map((p) => (
            <View key={p.id} style={styles.photo}>
              <Image
                source={{ uri: p.uri }}
                style={styles.photoImage}
                accessibilityLabel={p.name}
              />
              <Pressable
                onPress={() =>
                  setPhotos((list) => list.filter((x) => x.id !== p.id))
                }
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                hitSlop={8}
                style={({ pressed }) => [
                  styles.photoRemove,
                  pressed && styles.pressed,
                ]}
              >
                <X size={12} color={color.onPrimary} weight="bold" />
              </Pressable>
            </View>
          ))}
          {room > 0 && (
            <Pressable
              onPress={addPhotos}
              accessibilityRole="button"
              accessibilityLabel="Add photos"
              style={({ pressed }) => [
                styles.photo,
                styles.photoAdd,
                pressed && styles.pressed,
              ]}
            >
              <Plus size={20} color={color.primary} />
              <Text style={[type.metaStrong, { color: color.primary }]}>
                {photos.length ? "More" : "Photo"}
              </Text>
            </Pressable>
          )}
        </View>
        <VoiceBeam
          level={speech.level}
          active={listening}
          processing={speech.state === "processing"}
          radius={16}
          style={styles.speakBox}
        >
          <TextInput
            value={said}
            onChangeText={setSaid}
            editable={!hearing}
            multiline
            placeholder={listening ? "Listening…" : "What did you eat?"}
            placeholderTextColor={ink.tertiary}
            accessibilityLabel={`What you had for ${name}`}
            style={[styles.speakText, styles.describeText]}
          />
          <Pressable
            onPress={() =>
              hearing ? speech.stop() : (setSpoke(true), speech.start(said))
            }
            disabled={speech.state === "processing"}
            accessibilityRole="button"
            accessibilityLabel={hearing ? "Stop listening" : "Speak"}
            hitSlop={8}
            style={({ pressed }) => [
              styles.describeMic,
              hearing && styles.micButtonOn,
              pressed && styles.pressed,
            ]}
          >
            {hearing ? (
              <StopSquare size={16} color={color.primary} weight="fill" />
            ) : (
              <Microphone size={18} color={color.onPrimary} />
            )}
          </Pressable>
        </VoiceBeam>
        {speech.problem && (
          <View style={styles.speakProblem}>
            <Text style={[type.label, styles.fill, { color: ink.primary }]}>
              {speech.problem.words}
            </Text>
            {speech.problem.action && (
              <Pressable
                onPress={speech.problem.action.onPress}
                accessibilityRole="button"
                hitSlop={8}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={[type.metaStrong, { color: color.primary }]}>
                  {speech.problem.action.label}
                </Text>
              </Pressable>
            )}
          </View>
        )}
        {busy && (
          <View style={styles.reading} accessibilityLiveRegion="polite">
            <ActivityIndicator color={color.primary} />
            <Text style={type.label}>Reading your photos</Text>
          </View>
        )}
        {foods.length > 0 && (
          <SheetRows>
            {foods.map((f) => (
              <NeedsRow
                key={f.name}
                icon={<ForkKnife size={16} color={HUE.teal.ink} />}
                title={f.name}
                meta={[
                  f.portion,
                  f.nutrients.calories !== undefined &&
                    `${formatNumber(f.nutrients.calories)} kcal`,
                  f.nutrients.protein !== undefined &&
                    `${f.nutrients.protein} g protein`,
                ]
                  .filter(Boolean)
                  .join(", ")}
                chevron={false}
              />
            ))}
          </SheetRows>
        )}
        <PrimaryButton
          onPress={() =>
            onSave({
              slot,
              how: photos.length ? "photo" : spoke ? "voice" : "typed",
              status: "estimated",
              foods,
              note: words || undefined,
              photos: photos.length ? photos.map((p) => p.uri) : undefined,
            })
          }
          disabled={!foods.length}
        >
          {`Save ${name}`}
        </PrimaryButton>
      </Sheet>
    </View>
  )
}

/** What she said, read into foods: split at commas, "and" and "with", each
    piece matched to a known food and its usual portion, the rest kept by
    name with nothing known about it. */
function foodsIn(said: string): Meal["foods"] {
  const out: Meal["foods"] = []
  for (const raw of said
    .toLowerCase()
    .split(/,|\.|\band\b|\bwith\b|\bplus\b/)) {
    const piece = raw
      .replace(
        /^(\s*(i (had|ate)|for (breakfast|lunch|dinner)|some|a|an|the|two|one)\b)+/,
        ""
      )
      .trim()
    if (piece.length < 3) continue
    const known = SPOKEN_FOODS.find((f) => f.says.test(piece))
    const food = known
      ? {
          name: known.name,
          portion: known.portion,
          confidence: "medium" as const,
          nutrients: known.nutrients,
        }
      : {
          name: piece[0].toUpperCase() + piece.slice(1),
          portion: "One serving",
          confidence: "low" as const,
          nutrients: {},
        }
    if (!out.some((f) => f.name === food.name)) out.push(food)
  }
  return out
}

const HOW: Record<Meal["how"], string> = {
  photo: "Logged by photo",
  voice: "Logged by voice",
  typed: "Typed in",
  again: "Logged again",
  scan: "Logged by scan",
}

/** What she has logged today, once she logs a meal: each with how it was
    logged, what it was and its energy and protein, and Swap to log it again. */
function TodaysMeals() {
  const s = useOnboarding()
  const logged = mealsOn(s, localDay())
  if (!logged.length) return null
  const mains = MEAL_SLOTS.filter((m) => m.main).length
  const count = new Set(
    logged
      .filter((m) => MEAL_SLOTS.find((x) => x.id === m.slot)?.main)
      .map((m) => m.slot)
  ).size
  return (
    <Block title="Today's meals" meta={`${count} of ${mains} logged`}>
      <Group>
        {logged.map((m) => {
          const totals = totalsOf([m])
          const facts = [
            mealName(m),
            totals.calories &&
              `${formatNumber(Math.round(totals.calories.value))} kcal`,
            totals.protein &&
              `${formatNumber(Math.round(totals.protein.value))} g protein`,
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
              chevron={false}
            />
          )
        })}
      </Group>
    </Block>
  )
}

const DRINK_DAYS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
] as const

/** "Log drinks": one sitting, which day and how many standard drinks,
    both as fields. */
function DrinksSheet({ onClose }: { onClose: () => void }) {
  const s = useOnboarding()
  const [count, setCount] = React.useState("1")
  const [when, setWhen] =
    React.useState<(typeof DRINK_DAYS)[number]["value"]>("today")
  const [picking, setPicking] = React.useState(false)
  const keyboard = useKeyboardHeight()
  const n = /^\d+$/.test(count.trim()) ? parseInt(count, 10) : 0
  const valid = n >= 1 && n <= 12

  async function save() {
    if (!valid) return
    const date = new Date()
    if (when === "yesterday") date.setDate(date.getDate() - 1)
    const at = new Date().toISOString()
    const drinks = [...(s.drinks ?? []), { id: `d-${Date.now().toString(36)}`, day: localDay(date), count: n, at }]
    await s.save({ drinks })
    // Said plainly when a sitting goes over one of the two limits.
    const days = daysThisWeek(sittingsOf(drinks))
    const over = n > SITTING_LIMIT ? `, more than ${SITTING_LIMIT} at one time` : days > DAYS_LIMIT ? `, ${days} drinking days this week` : ""
    toast(`${drinksWord(n)} logged${over}`)
    onClose()
  }

  return (
    <View
      style={[styles.sheetFrame, { bottom: keyboard }]}
      pointerEvents="box-none"
    >
      <Sheet title="Log drinks" onClose={onClose}>
        <SelectField
          label="When"
          value={DRINK_DAYS.find((d) => d.value === when)?.label}
          placeholder="Choose a day"
          onPress={() => setPicking((p) => !p)}
        />
        {picking && (
          <SheetRows>
            {DRINK_DAYS.map((d) => (
              <ChoiceRow
                key={d.value}
                title={d.label}
                selected={d.value === when}
                onPress={() => (setWhen(d.value), setPicking(false))}
              />
            ))}
          </SheetRows>
        )}
        <TextField
          label="Drinks at this sitting"
          value={count}
          onChangeText={setCount}
          keyboardType="number-pad"
          placeholder="1"
        />
        <PrimaryButton onPress={save} disabled={!valid}>
          Save
        </PrimaryButton>
      </Sheet>
    </View>
  )
}

/* ---------------------------------------------------------------- sleep -- */

/** Last night's score under the target, and the parts that made it:
    a score with no breakdown is a horoscope, naming what cost her the
    points is what makes it something to act on tonight. */
function LastNight() {
  return (
    <>
      <View style={styles.score}>
        <ScoreDial
          value={SLEEP_LAST.score}
          size={52}
          stroke={4}
          tone={color.amber}
          track={color.amberEdge}
          ink={ink.strong}
        />
        <View style={styles.fill}>
          <Text style={type.section}>Last night's sleep score</Text>
          <Text style={type.label}>{SLEEP_LAST.line}</Text>
        </View>
      </View>
      <Block
        title={`What made it ${SLEEP_LAST.score}`}
        meta={`${SLEEP_LAST.parts.length} parts`}
      >
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

/** Clock times on the night's sliders are minutes after 6 pm, so a
    bedtime either side of midnight sits on one straight line. */
const clockAt = (m: number) => {
  const t = (18 * 60 + m) % 1440
  const h = Math.floor(t / 60)
  return `${h % 12 || 12}:${String(t % 60).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`
}

/** "11:50 pm", "23:50", "6" or "6:15": with no am or pm, whichever half
    of the day lands inside the slider's range. */
function parseClock(text: string, min: number, max: number) {
  const m = text
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a|p)?$/)
  if (!m) return undefined
  const h = Number(m[1])
  const mm = Number(m[2] ?? 0)
  if (h > 23 || mm > 59) return undefined
  const after6 = (h24: number) => (h24 * 60 + mm - 18 * 60 + 1440) % 1440
  if (m[3]) return after6((h % 12) + (m[3].startsWith("p") ? 12 : 0))
  const options = h > 12 ? [after6(h)] : [after6(h % 12), after6((h % 12) + 12)]
  return options.find((o) => o >= min && o <= max) ?? options[0]
}

/** "5 h 40 m", "5h40", "5:40" or "5.5" hours. */
function parseHours(text: string) {
  const t = text.trim().toLowerCase()
  const hours = t.match(/^(\d{1,2})\s*(?:h|:)\s*(\d{1,2})?\s*m?$/)
  if (hours) return Number(hours[1]) * 60 + Number(hours[2] ?? 0)
  const n = Number(t)
  return Number.isFinite(n) && t !== "" ? Math.round(n * 60) : undefined
}

/** "Log what actually happened": the night she had, each part typed into
    its own field, and the time in bed worked out as she goes. Starts on last night's figures. */
function NightSheet({ onClose }: { onClose: () => void }) {
  const s = useOnboarding()
  const day = localDay()
  const before = s.topicLog?.[day]?.sleep
  const [bed, setBed] = React.useState(before?.night?.bed ?? 350)
  const [up, setUp] = React.useState(before?.night?.up ?? 720)
  const [latency, setLatency] = React.useState(before?.night?.latency ?? 15)
  const [woke, setWoke] = React.useState(before?.night?.woke ?? 2)
  const [cpap, setCpap] = React.useState(before?.night?.cpap ?? 340)
  const [note, setNote] = React.useState(before?.note ?? "")
  const keyboard = useKeyboardHeight()
  const total = up - bed

  async function save() {
    const night = { bed, up, latency, woke, cpap: Math.min(cpap, total) }
    await s.save({
      topicLog: {
        ...s.topicLog,
        [day]: {
          ...s.topicLog?.[day],
          sleep: {
            way: "log",
            at: new Date().toISOString(),
            night,
            note: note.trim() || undefined,
          },
        },
      },
    })
    toast(`Sleep logged: ${inBed(night)} in bed.`)
    onClose()
  }

  return (
    <View
      style={[styles.sheetFrame, { bottom: keyboard }]}
      pointerEvents="box-none"
    >
      <Sheet title="Last night" onClose={onClose} tall>
        <Text style={type.meta}>{`${hm(total)} in bed`}</Text>
        <ScrollView
          style={styles.partScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.parts}>
            <ValueField
              label="In bed at"
              value={bed}
              min={180}
              max={480}
              show={clockAt}
              parse={(t) => parseClock(t, 180, 480)}
              onChange={setBed}
              placeholder="11:30 pm"
            />
            <ValueField
              label="Up at"
              value={up}
              min={600}
              max={960}
              show={clockAt}
              parse={(t) => parseClock(t, 600, 960)}
              onChange={setUp}
              placeholder="6:30 am"
            />
            <ValueField
              label="Minutes to fall asleep"
              value={latency}
              min={0}
              max={180}
              show={(n) => `${n} min`}
              parse={(t) =>
                /^\d+/.test(t.trim()) ? parseInt(t, 10) : undefined
              }
              onChange={setLatency}
              keyboardType="number-pad"
            />
            <ValueField
              label="Times you woke"
              value={woke}
              min={0}
              max={20}
              show={(n) => String(n)}
              parse={(t) => (/^\d+$/.test(t.trim()) ? Number(t) : undefined)}
              onChange={setWoke}
              keyboardType="number-pad"
            />
            <ValueField
              label="CPAP worn"
              value={Math.min(cpap, total)}
              min={0}
              max={total}
              show={hm}
              parse={parseHours}
              onChange={setCpap}
              placeholder="5 h 40 m"
            />
            <TextField
              label="Note"
              value={note}
              onChangeText={setNote}
              placeholder="Anything that woke you"
              multiline
              autoCapitalize="sentences"
            />
          </View>
        </ScrollView>
        <PrimaryButton onPress={save}>Save</PrimaryButton>
      </Sheet>
    </View>
  )
}

/* ----------------------------------------------------------------- mind -- */

const SHORT_MAX = 20

/** "Do the short version": how many minutes she did on a slider, eight
    to start, and what she did in her own words. Saving answers the topic
    with both. */
function ShortSheet({ onClose }: { onClose: () => void }) {
  const s = useOnboarding()
  const day = localDay()
  const before = s.topicLog?.[day]?.mind
  const [minutes, setMinutes] = React.useState(before?.minutes ?? 8)
  const [note, setNote] = React.useState(before?.note ?? "")
  const keyboard = useKeyboardHeight()

  async function save() {
    await s.save({
      topicLog: {
        ...s.topicLog,
        [day]: {
          ...s.topicLog?.[day],
          mind: {
            way: "short",
            at: new Date().toISOString(),
            minutes,
            note: note.trim() || undefined,
          },
        },
      },
    })
    toast(`Mind logged: ${minutes} min. Partial credit.`)
    onClose()
  }

  return (
    <View
      style={[styles.sheetFrame, { bottom: keyboard }]}
      pointerEvents="box-none"
    >
      <Sheet title="Your short version" onClose={onClose}>
        <SliderField
          label="Minutes done"
          value={minutes}
          min={1}
          max={SHORT_MAX}
          show={(n) => `${n} min`}
          parse={(t) => (/^\d+/.test(t.trim()) ? parseInt(t, 10) : undefined)}
          onChange={setMinutes}
          keyboardType="number-pad"
        />
        <TextField
          label="What you did"
          value={note}
          onChangeText={setNote}
          placeholder="Breathing, a body scan, a quiet walk"
          multiline
          autoCapitalize="sentences"
        />
        <PrimaryButton onPress={save}>Save</PrimaryButton>
      </Sheet>
    </View>
  )
}

type SliderProps = {
  value: number
  min: number
  max: number
  step?: number
  label: string
  show: (n: number) => string
  onChange: (n: number) => void
}

const snap = (n: number, min: number, max: number, step: number) =>
  Math.max(min, Math.min(max, min + Math.round((n - min) / step) * step))

/** A slider with its value in a small box on the right of the label: drag
    the track, or tap the box and type it. A typed value snaps into the
    slider's range; one it cannot read goes back to what it was. */
function SliderField({
  parse,
  keyboardType,
  ...slider
}: SliderProps & {
  parse: (text: string) => number | undefined
  keyboardType?: "default" | "number-pad"
}) {
  const { value, min, max, step = 1, label, show, onChange } = slider
  const [draft, setDraft] = React.useState<string>()
  const [focused, setFocused] = React.useState(false)
  function commit() {
    const n = draft === undefined ? undefined : parse(draft)
    if (n !== undefined) onChange(snap(n, min, max, step))
    setDraft(undefined)
    setFocused(false)
  }
  return (
    <View style={styles.field}>
      <View style={styles.minutesHead}>
        <Text style={type.title}>{label}</Text>
        <TextInput
          value={draft ?? show(value)}
          onChangeText={setDraft}
          onFocus={() => (setFocused(true), setDraft(show(value)))}
          onBlur={commit}
          onSubmitEditing={commit}
          selectTextOnFocus
          returnKeyType="done"
          keyboardType={keyboardType}
          accessibilityLabel={`${label}, type a value`}
          style={[styles.sliderInput, focused && styles.sliderInputOn]}
        />
      </View>
      <Slider {...slider} />
    </View>
  )
}

/** A typed value in the shared text field: shown formatted, edited as
    free text, read back and kept in range when she leaves the field. */
function ValueField({
  value,
  min,
  max,
  label,
  show,
  parse,
  onChange,
  keyboardType,
  placeholder,
}: Omit<SliderProps, "step"> & {
  parse: (text: string) => number | undefined
  keyboardType?: "default" | "number-pad"
  placeholder?: string
}) {
  const [draft, setDraft] = React.useState<string>()
  function commit() {
    const n = draft === undefined ? undefined : parse(draft)
    if (n !== undefined) onChange(Math.max(min, Math.min(max, n)))
    setDraft(undefined)
  }
  return (
    <TextField
      label={label}
      value={draft ?? show(value)}
      onChangeText={setDraft}
      onFocus={() => setDraft(show(value))}
      onBlur={commit}
      onSubmitEditing={commit}
      selectTextOnFocus
      returnKeyType="done"
      keyboardType={keyboardType}
      placeholder={placeholder}
    />
  )
}

/** A stepped slider: tap or drag along the track, the teal fill and thumb
    following. */
function Slider({
  value,
  min,
  max,
  step = 1,
  label,
  show,
  onChange,
}: SliderProps) {
  const width = React.useRef(0)
  const share = max > min ? (value - min) / (max - min) : 0
  const set = (x: number) => {
    if (width.current > 0)
      onChange(snap(min + (x / width.current) * (max - min), min, max, step))
  }
  return (
    <View
      style={styles.slider}
      onLayout={(e) => {
        width.current = e.nativeEvent.layout.width
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => set(e.nativeEvent.locationX)}
      onResponderMove={(e) => set(e.nativeEvent.locationX)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: show(value) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) =>
        onChange(
          snap(
            value + (e.nativeEvent.actionName === "increment" ? step : -step),
            min,
            max,
            step
          )
        )
      }
    >
      <View style={styles.sliderTrack} pointerEvents="none">
        <View style={[styles.sliderFill, { width: `${share * 100}%` }]} />
      </View>
      <View
        style={[styles.sliderThumb, { left: `${share * 100}%` }]}
        pointerEvents="none"
      />
    </View>
  )
}

/* ----------------------------------------------------------- medication -- */

/** "Mark it taken": today's doses, one tap each to tick. The morning two
    start ticked; saving answers the topic with the doses ticked. */
function TakenSheet({ onClose }: { onClose: () => void }) {
  const s = useOnboarding()
  const day = localDay()
  const before = s.topicLog?.[day]?.medication
  const [taken, setTaken] = React.useState<string[]>(
    () =>
      before?.parts ??
      DOSES.filter((d) => "taken" in d && d.taken).map((d) => d.id)
  )
  const flip = (id: string) =>
    setTaken((was) =>
      was.includes(id) ? was.filter((x) => x !== id) : [...was, id]
    )

  async function save() {
    await s.save({
      topicLog: {
        ...s.topicLog,
        [day]: {
          ...s.topicLog?.[day],
          medication: {
            way: "taken",
            at: new Date().toISOString(),
            parts: taken,
          },
        },
      },
    })
    toast(`Medication logged: ${taken.length} of ${DOSES.length} doses taken.`)
    onClose()
  }

  return (
    <Sheet title="Which doses have you taken?" onClose={onClose} tall>
      <Text
        style={type.meta}
      >{`${taken.length} of ${DOSES.length} taken`}</Text>
      <ScrollView
        style={styles.partScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.doses}>
          {DOSES.map((d) => {
            const on = taken.includes(d.id)
            return (
              <Pressable
                key={d.id}
                onPress={() => flip(d.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${d.name} ${d.dose}, ${d.when}`}
                style={({ pressed }) => [
                  styles.dose,
                  on && styles.doseOn,
                  pressed && styles.pressed,
                ]}
              >
                <TickCircle done={on} />
                <View style={styles.fill}>
                  <Text style={styles.lineName}>{d.name}</Text>
                  <Text
                    style={type.label}
                  >{`${d.dose}, ${d.when.toLowerCase()}`}</Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
      <PrimaryButton onPress={save} disabled={!taken.length}>
        Save
      </PrimaryButton>
    </Sheet>
  )
}

/** "Report a side effect": how bad, and what happened in
    her words. It goes to Dr. Patel; it does not answer the topic. */
function SideEffectSheet({ onClose }: { onClose: () => void }) {
  const [how, setHow] = React.useState<(typeof SEVERITY)[number]>("Mild")
  const [what, setWhat] = React.useState("")
  const keyboard = useKeyboardHeight()

  function send() {
    toast(`Sent to Dr. Patel: ${how.toLowerCase()} side effect.`)
    onClose()
  }

  return (
    <View
      style={[styles.sheetFrame, { bottom: keyboard }]}
      pointerEvents="box-none"
    >
      <Sheet title="Report a side effect" onClose={onClose}>
        <View style={styles.field}>
          <Text style={type.title}>How bad</Text>
          <Tabs
            options={SEVERITY.map((v) => ({ value: v, label: v }))}
            value={how}
            onChange={setHow}
            snug
          />
        </View>
        <TextField
          label="What happened"
          value={what}
          onChangeText={setWhat}
          placeholder="Nausea after the morning dose"
          multiline
          autoCapitalize="sentences"
        />
        {how === "Severe" && (
          <Text style={[type.label, styles.urgent]}>
            If it feels like an emergency, call 911 now.
          </Text>
        )}
        <PrimaryButton onPress={send} disabled={!what.trim()}>
          Send to Dr. Patel
        </PrimaryButton>
      </Sheet>
    </View>
  )
}

/** What she takes that nobody prescribed, screened against the prescribed
    list as it is entered.
    Dr. Blanchard asks only whether she takes each one as listed, never
    single missed doses (call, 26 Oct 2026); new ones are added with the
    "Add a new one" way above. */
function AlsoTaking() {
  return (
    <Block title="Also taking, added by you">
      <View style={styles.table}>
        {ALSO_TAKING.map((m, i) => (
          <View
            key={m.name}
            style={[
              styles.line,
              i > 0 && styles.rule,
              m.interacts && styles.flag,
            ]}
          >
            {m.interacts ? (
              <Warning size={14} color={HUE.amber.ink} />
            ) : (
              <Check size={14} weight="bold" color={chart.inRange} />
            )}
            <Text style={styles.lineName}>{m.name}</Text>
            <Text style={[type.label, styles.fill]} numberOfLines={1}>
              {m.dose}
            </Text>
            <Text
              style={[
                styles.verdict,
                { color: m.interacts ? HUE.amber.ink : ink.good },
              ]}
            >
              {m.interacts ? "Interaction" : "No interaction"}
            </Text>
          </View>
        ))}
      </View>
    </Block>
  )
}

/* ----------------------------------------------------------------- apps -- */

/** The apps and devices a topic can post itself from: Connect shows a
    loader, then the row says Connected. Exercise adds a file of her own
    programme above them, which the plan then monitors. */
function AppsSheet({
  act,
  onClose,
}: {
  act: Extract<Way["act"], { kind: "apps" }>
  onClose: () => void
}) {
  const s = useOnboarding()
  const linked = s.linkedApps ?? []
  const [busy, setBusy] = React.useState<string>()
  const [file, setFile] = React.useState<string>()

  function connect(app: string) {
    setBusy(app)
    setTimeout(async () => {
      await s.save({ linkedApps: [...linked.filter((a) => a !== app), app] })
      setBusy(undefined)
      toast(`${app} connected`)
    }, 1200)
  }

  async function upload() {
    const r = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*", "text/plain", "text/csv"],
      copyToCacheDirectory: true,
    })
    if (r.canceled) return
    setFile(r.assets[0].name)
    toast("Programme uploaded. We monitor yours.")
  }

  return (
    <Sheet title={act.title} onClose={onClose}>
      <SheetRows>
        {act.upload && (
          <NeedsRow
            icon={<UploadSimple size={16} color={HUE.teal.ink} />}
            title="Upload a file"
            meta={file ?? "PDF, a photo or a spreadsheet"}
            tag={file ? { tone: "ok", label: "Uploaded" } : undefined}
            action={file ? undefined : { label: "Upload", onPress: upload }}
            chevron={false}
          />
        )}
        {act.apps.map((app) => {
          const on = linked.includes(app)
          return (
            <NeedsRow
              key={app}
              icon={<DeviceMobile size={16} color={HUE.teal.ink} />}
              title={app}
              tag={on ? { tone: "ok", label: "Connected" } : undefined}
              right={
                busy === app ? (
                  <ActivityIndicator color={color.primary} />
                ) : undefined
              }
              action={
                on || busy === app
                  ? undefined
                  : { label: "Connect", onPress: () => connect(app) }
              }
              chevron={false}
            />
          )
        })}
      </SheetRows>
    </Sheet>
  )
}

/* -------------------------------------------------------------- measure -- */

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  // A finished lift: struck through, in the quiet grey.
  struck: { textDecorationLine: "line-through", color: ink.tertiary },
  playDotDone: { backgroundColor: color.okTint },
  // The programme chip sits left, over the target card, at its own width.
  chip: { alignSelf: "flex-start" },

  table: {
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: color.background,
    borderWidth: 1,
    borderColor: hairline.edge,
    boxShadow: card.shadowXs,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inline,
    paddingHorizontal: space.item,
    paddingVertical: 10,
  },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  shaded: { backgroundColor: surface.inset },
  // A finished lift: a deeper grey than the warm-up and cardio rows, so it
  // reads as closed rather than as a heading.
  closed: { backgroundColor: "#ECEDF0" },
  lineName: { ...type.title, color: ink.strong },
  lineEnd: { ...type.metaStrong, color: ink.strong },
  sets: { minWidth: 34, textAlign: "right" },
  load: {
    ...type.value,
    minWidth: 44,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  // The play icon leads the lift's name; the pair opens how it is done.
  lift: { flexDirection: "row", alignItems: "center", gap: space.inline },
  // The icon sits on the chip's pale teal, in a circle.
  playDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.primarySoft,
  },

  score: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lead,
    padding: space.item,
    borderRadius: 12,
    backgroundColor: color.amberTint,
    borderWidth: 1,
    borderColor: color.amberEdge,
  },
  part: { width: 104 },
  partScroll: { flexGrow: 0, flexShrink: 1 },
  parts: { gap: space.item, paddingBottom: space.item },
  partCard: {
    gap: space.item,
    padding: space.item,
    borderRadius: 16,
    backgroundColor: surface.inset,
  },
  minutesHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.inline,
  },
  // The typed value: a small box, right-aligned, teal edge while typing.
  sliderInput: {
    ...type.value,
    color: ink.strong,
    fontVariant: ["tabular-nums"],
    width: 112,
    height: 36,
    paddingHorizontal: 10,
    paddingVertical: 0,
    textAlign: "right",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  sliderInputOn: { borderColor: color.primary },
  slider: { height: 32, justifyContent: "center", marginHorizontal: 11 },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: hairline.rule,
  },
  sliderFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: color.primary,
  },
  sliderThumb: {
    position: "absolute",
    top: 5,
    width: 22,
    height: 22,
    marginLeft: -11,
    borderRadius: 11,
    backgroundColor: color.background,
    borderWidth: 2,
    borderColor: color.primary,
  },
  sheetFrame: { position: "absolute", top: 0, left: 0, right: 0 },
  speakBox: {
    minHeight: 112,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: surface.inset,
  },
  speakText: {
    ...type.body,
    color: ink.strong,
    minHeight: 112,
    padding: space.item,
    textAlignVertical: "top",
  },
  describeText: { paddingRight: 52 },
  describeMic: {
    position: "absolute",
    right: space.inline,
    bottom: space.inline,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.primary,
  },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: surface.inset,
  },
  photoImage: { width: "100%", height: "100%" },
  photoRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  photoAdd: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: hairline.edge,
    borderStyle: "dashed",
  },
  reading: { flexDirection: "row", alignItems: "center", gap: space.inline },
  micButtonOn: { backgroundColor: color.primarySoft },
  speakProblem: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inline,
    padding: space.item,
    borderRadius: 10,
    backgroundColor: color.amberTint,
    borderWidth: 1,
    borderColor: color.amberEdge,
  },

  urgent: { color: "#A95413" },
  flag: { backgroundColor: color.amberTint },
  verdict: { ...type.metaStrong },
  doses: { gap: space.inline, paddingBottom: space.item },
  dose: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lead,
    padding: space.item,
    borderRadius: 10,
    backgroundColor: color.background,
    borderWidth: 1,
    borderColor: hairline.edge,
  },
  doseOn: {
    borderColor: color.primaryLine,
    backgroundColor: color.primaryTint,
  },
  field: { gap: space.inline },
})
