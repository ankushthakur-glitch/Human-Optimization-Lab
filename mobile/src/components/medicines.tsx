import { router } from "expo-router"
import * as React from "react"
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"

import { ChoiceRow, SheetRows } from "@/components/care-orders-rows"
import { useReducedMotion } from "@/components/chat"
import { PageGround } from "@/components/hol"
import { CaretRight, Check, Info, Phone, Pill } from "@/components/ph"
import { Banner, Card, Chip, Dot, Group, HUE, KeyValue, SmallAction, Tag, TextAction, toast, type Choice } from "@/components/record-kit"
import { FilterChips, ItemRow } from "@/components/record-rows"
import { Sheet } from "@/components/sheet"
import { Button, TextField } from "@/components/ui"
import { questionKind } from "@/lib/allowance"
import { URGENT } from "@/lib/assistant"
import { call } from "@/lib/links"
import { useOnboarding, type MedRecord } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { MEDICATIONS, ORIGIN_LABEL, REVIEW, answeredOn, confirmedOn, medDifference, medHow, type MedAnswer, type Medication, type Origin } from "@/lib/record"
import { card, cardRadius, color, hairline, ink, space, type } from "@/lib/theme"

/* Your medicines (FINAL-SPEC C.10): one list the patient and Dr. Patel both
   trust. Dr. Patel's list is the true one (F-65). Where another place lists
   a medicine differently, both lists show, each with where it came from and
   when (F-70), and she says what she actually takes. Her answer saves at
   once (A-24) and sits beside the lists, never over them: only Dr. Patel
   settles a difference (F-69). The words stay neutral and say who settles
   it (F-72); never conflict, error or wrong. Nothing here sells.

   Every medicine and supplement is confirmed the same way (user, 13 Oct
   2026, Dr. Blanchard): "Taking as listed", or "Taking differently" with
   how she takes it in her own words, which Dr. Patel reads as she wrote
   it. Stopped and never started sit inside "Taking differently". Each
   answer is dated: "Confirmed 12 Oct 2026". A month after the last full
   confirmation To do and the bell ask again (lib/todo confirmDue).

   MedicineConfirm is the whole list: Action needed, Active and Past on
   filter chips, medicines and Supplements on Active, each row opening the
   medicine's own page (app/medicine/[id], MedicineDetails). */

export type MedicineConfirmProps = {
  /** A medicine to bring into view on arrival and mark for a moment, by
      id: the one she tapped on Home, the Record tab or the timeline
      (`/medications?id=cetirizine`). On the list it opens its details. */
  focus?: string
  /** Adds a supplement (the Supplements section's "Add"); without it the
      section lists them and offers no add. */
  onAddSupplement?: () => void
}

/** What she says about one medicine; the time is added on saving. */
type Answer = Omit<MedRecord, "at" | "medication" | "shown">

/** "Dr. Patel", from the doctor who reviews the record ("Dr. Maya Patel"). */
const DOCTOR = REVIEW.by.replace(/^(Dr\.)\s+\S+\s+(\S+)$/, "$1 $2")

/** The practice as she says it: "Harborview". */
const PRACTICE = PATIENT.practice.split(" ")[0]

/** Words held on one line, however narrow the phone. */
const oneLine = (words: string) => words.replace(/ /g, "\u00A0")

/** A line's last two words held together, so a narrow phone never leaves
    one alone: "course, finished". */
const lastTwo = (text: string) => text.replace(/\S+ \S+$/, (pair) => oneLine(pair))

/** The practice's number, held on one line: "(858) 555-0100". */
const PHONE = oneLine(PATIENT.practicePhone)

/** Whose list a line comes from, as a card names it. */
const LIST_NAME: Record<Origin, string> = {
  doctor: `${DOCTOR}'s list`,
  hospital: ORIGIN_LABEL.hospital,
  lab: ORIGIN_LABEL.lab,
  you: "Told by you",
  report: ORIGIN_LABEL.report,
}

/** Who a line comes from, at the end of a row: "10 mg when needed, Dr. Patel". */
const FROM: Record<Origin, string> = {
  doctor: DOCTOR,
  hospital: ORIGIN_LABEL.hospital,
  lab: ORIGIN_LABEL.lab,
  you: "told by you",
  report: "from your report",
}

/** "Aug 12" in this year, "Aug 12, 2025" in another. */
function onDay(date: string, now = new Date()) {
  const m = /^([A-Z][a-z]{2} \d{1,2}), (\d{4})$/.exec(date)
  return m && Number(m[2]) === now.getFullYear() ? m[1] : date
}

/** Her answer in her own words, for "You said: ...". */
function saidOf(r: MedRecord): string {
  switch (r.answer) {
    case "dose": {
      const how = medHow(r)
      return how ? `I take it differently: ${how}` : "I take it differently"
    }
    case "stopped":
      return r.why === "other" && r.note ? `${STOPPED_SAID.other}: ${r.note}` : r.why ? STOPPED_SAID[r.why] : "I stopped it"
    case "taking":
      return "I take it as listed"
    case "never":
      return "I never started it"
    case "not-taking":
      return "I don't take it"
  }
}

const STOPPED_SAID: Record<NonNullable<MedRecord["why"]>, string> = {
  "side-effect": "I stopped it because of a side effect",
  doctor: "I stopped it because a doctor told me to",
  "ran-out": "I stopped it because I ran out",
  other: "I stopped it for another reason",
}

const WHY_STOPPED: Choice<NonNullable<MedRecord["why"]>>[] = [
  { value: "side-effect", label: "A side effect" },
  { value: "doctor", label: "A doctor told me to" },
  { value: "ran-out", label: "I ran out" },
  { value: "other", label: "Something else" },
]

/** The two clear choices on every medicine and supplement. */
const CONFIRM: Choice<"listed" | "differently">[] = [
  { value: "listed", label: "Taking as listed" },
  { value: "differently", label: "Taking differently" },
]

/** What the "How do you take it?" field suggests. */
const HOW_PLACEHOLDER = "Dose, how often, time of day"

/** The urgent message's icon, which its pills line up after. */
const URGENT_ICON = 18

/** Her medicines, one list on three filter chips: Action needed (the
    ones her lists differ on, each with its question), Active and Past. Rows open their details. Which medicines
    need her is fixed as the list opens, so answering one never moves it
    from under her. */
export function MedicineConfirm({ focus, onAddSupplement }: MedicineConfirmProps) {
  const onOpen = openMedicine
  const s = useOnboarding()
  const current = MEDICATIONS.filter((m) => !m.resolved)
  const past = MEDICATIONS.filter((m) => m.resolved)
  const [needs] = React.useState(() => current.filter((m) => medDifference(m) && !s.meds?.[m.id]).map((m) => m.id))
  const action = current.filter((m) => needs.includes(m.id))
  const active = current.filter((m) => !action.includes(m))
  const [shelf, setShelf] = React.useState<Shelf>(() => (past.some((m) => m.id === focus) ? "past" : action.length ? "action" : "active"))
  // Each medicine opened by name opens once, on its own chip; one waiting
  // on her answer shows its question instead of its details.
  const opened = React.useRef<string | undefined>(undefined)
  React.useEffect(() => {
    if (!focus || opened.current === focus) return
    opened.current = focus
    const m = MEDICATIONS.find((x) => x.id === focus)
    if (!m) return
    if (needs.includes(m.id)) return setShelf("action")
    setShelf(m.resolved ? "past" : "active")
    onOpen(m)
  }, [focus, needs])

  // Saved with the medicine's name and the lists she saw, so Dr. Patel
  // reads her answer against the same difference (lib/record
  // providerAnswer).
  const answer = (m: Medication, a: Answer) => {
    const record: MedRecord = { medication: m.name, shown: m.lists, ...a, at: new Date().toISOString() }
    void s.save({ meds: { ...s.meds, [m.id]: record } })
    toast("Saved")
  }

  const shelves = SHELVES.filter((o) => o.value !== "action" || action.length > 0)
  const medicines = active.filter((m) => m.kind === "medicine")
  const supplements = current.filter((m) => m.kind === "supplement")
  return (
    <>
      <FilterChips options={shelves} value={shelf} onChange={setShelf} label="Medicines" />
      {shelf === "action" && (
        <>
          {action.map((m) => (
            <InView key={m.id} on={focus === m.id}>
              <CheckCard m={m} saved={s.meds?.[m.id]} onAnswer={(a) => answer(m, a)} spotlight={focus === m.id} />
            </InView>
          ))}
        </>
      )}
      {shelf === "active" && medicines.length > 0 && (
        <Section title="Medicines">
          <Rows>
            {medicines.map((m) => (
              <ConfirmRow key={m.id} m={m} saved={s.meds?.[m.id]} onAnswer={(a) => answer(m, a)} />
            ))}
          </Rows>
        </Section>
      )}
      {shelf === "past" && <MedicineRows list={past} />}
      {shelf !== "past" && (supplements.length > 0 || onAddSupplement) && (
        <Section title="Supplements" action={onAddSupplement ? { label: "Add", onPress: onAddSupplement } : undefined}>
          {supplements.length > 0 && (
            <Rows>
              {supplements.map((m) => (
                <ConfirmRow key={m.id} m={m} saved={s.meds?.[m.id]} onAnswer={(a) => answer(m, a)} />
              ))}
            </Rows>
          )}
        </Section>
      )}
    </>
  )
}

/** A heading over a card: "Medicines", "Supplements", with an optional
    action at its end. */
function Section({ title, action, children }: { title: string; action?: { label: string; onPress: () => void }; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {action && <TextAction onPress={action.onPress}>{action.label}</TextAction>}
      </View>
      {children}
    </View>
  )
}

/** Rows on one white card, 12 either side of a hairline. */
function Rows({ children }: { children: React.ReactNode }) {
  const rows = React.Children.toArray(children).filter(Boolean)
  return (
    <Card style={styles.rows}>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={styles.rule} />}
          {row}
        </React.Fragment>
      ))}
    </Card>
  )
}

/** The pill on its round teal tile. */
const PillTile = () => (
  <View style={styles.tile}>
    <Pill size={16} color={color.primary} />
  </View>
)

/** A medicine's line, as a row names it: "10 mg when needed, Dr. Patel". */
const lineOf = (m: Medication) => {
  const line = m.lists.find((l) => l.origin === "doctor") ?? m.lists[0]
  return `${line.dose}, ${FROM[line.origin]}`
}

/* ------------------------------------------------------------ list -- */

type Shelf = "action" | "active" | "past"

const SHELVES: { value: Shelf; label: string }[] = [
  { value: "action", label: "Action needed" },
  { value: "active", label: "Active" },
  { value: "past", label: "Past" },
]

/** Past medicines on one card, as every Record list draws its rows
    (ItemRow, chevron included), each opening its own page. */
function MedicineRows({ list }: { list: Medication[] }) {
  if (!list.length) return null
  return (
    <Group>
      {list.map((m) => (
        <ItemRow key={m.id} icon={<PillTile />} title={m.name} meta={pastLine(m)} onPress={() => openMedicine(m)} />
      ))}
    </Group>
  )
}

/** A past medicine's lines: the dose with where and when, then how it
    ended. */
function pastLine(m: Medication) {
  const line = m.lists[0]
  const first = `${line.dose}, ${oneLine(`${FROM[line.origin]}, ${onDay(line.date)}`)}`
  return m.resolved ? `${first}\n${lastTwo(m.resolved)}` : first
}

/** How a past medicine ended, as a value: "Short course, finished". */
const endedOf = (resolved: string) => {
  const how = resolved.replace(/^Dr\. Patel marked this as (a |an )?/, "")
  return how.charAt(0).toUpperCase() + how.slice(1)
}

/** A medicine's details, on its own page: its badge, then each fact on
    one card. A current medicine offers to update what she takes, which
    opens UpdateSheet over the page. */
export function MedicineDetails({ m, onUpdate }: { m: Medication; onUpdate: () => void }) {
  const s = useOnboarding()
  const saved = s.meds?.[m.id]
  const line = m.lists.find((l) => l.origin === "doctor") ?? m.lists[0]
  const others = m.lists.filter((l) => l !== line)
  const rows: { label: string; value: string }[] = [
    { label: "Medication", value: m.name },
    { label: "Dose", value: line.dose },
    { label: "Listed by", value: LIST_NAME[line.origin] },
    { label: "Date", value: line.date },
    ...others.map((l) => ({ label: LIST_NAME[l.origin], value: `${l.dose}, ${onDay(l.date)}` })),
    ...(saved ? [{ label: "You said", value: saidOf(saved) }, { label: "Confirmed", value: answeredOn(saved.at) }] : []),
    ...(m.resolved ? [{ label: "Ended", value: endedOf(m.resolved) }] : []),
  ]
  return (
    <>
      <View style={styles.badge}>
        <Tag tone={m.resolved ? "muted" : "ok"}>{m.resolved ? "Past" : "Active"}</Tag>
      </View>
      <Card style={styles.facts}>
        {rows.map((r, i) => (
          <KeyValue key={r.label} label={r.label} value={r.value} last={i === rows.length - 1} />
        ))}
      </Card>
      {!m.resolved && (
        <Button variant="outline" onPress={onUpdate}>
          Update what you take
        </Button>
      )}
    </>
  )
}

/** Opens a medicine's own page. */
export const openMedicine = (m: Medication) => router.push({ pathname: "/medicine/[id]", params: { id: m.id } })

/** A medicine tapped by name elsewhere (Home, the timeline): its own page,
    or, where her lists differ, Your medicines on it, which shows its
    question while unanswered and its page once answered. */
export const openMedicineByName = (m: Medication) => (medDifference(m) ? router.push({ pathname: "/medications", params: { id: m.id } }) : openMedicine(m))

type Now = "listed" | "differently" | "stopped" | "never"

/** What she takes now, from a medicine's details. */
const NOW: Choice<Now>[] = [
  { value: "listed", label: "Taking as listed" },
  { value: "differently", label: "Taking differently" },
  { value: "stopped", label: "I stopped it" },
  { value: "never", label: "I never started it" },
]

/** "Update what you take": a bottom sheet with one choice, picked from
    radio rows as the "Pay with" sheet picks a card. Taking differently asks
    "How do you take it?" and I stopped it asks why, in place under the
    choice; Save sends her answer, dated, for her doctor to see. A side
    effect also shows the practice's number. */
export function UpdateSheet({ m, onClose }: { m: Medication; onClose: () => void }) {
  const s = useOnboarding()
  const [now, setNow] = React.useState<Now>()
  const [why, setWhy] = React.useState<NonNullable<MedRecord["why"]>>()
  const [how, setHow] = React.useState("")
  const [note, setNote] = React.useState("")

  const answer: Answer | undefined =
    now === "listed"
      ? { answer: "taking" }
      : now === "never"
        ? { answer: "never" }
        : now === "differently"
          ? how.trim()
            ? { answer: "dose", note: how.trim() }
            : undefined
          : now === "stopped" && why
            ? { answer: "stopped", why, ...(why === "other" && note.trim() ? { note: note.trim() } : {}) }
            : undefined

  const save = () => {
    if (!answer) return
    const record: MedRecord = { medication: m.name, shown: m.lists, ...answer, at: new Date().toISOString() }
    void s.save({ meds: { ...s.meds, [m.id]: record } })
    toast("Saved")
    onClose()
  }

  return (
    <Sheet title={m.name} titleRight={<Tag tone="ok">Active</Tag>} onClose={onClose}>
      <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.ask}>What do you take now?</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="What do you take now?">
          <SheetRows>
            {NOW.map((o) => (
              <ChoiceRow key={o.value} title={o.label} selected={now === o.value} onPress={() => setNow(o.value)} />
            ))}
          </SheetRows>
        </View>

        {now === "differently" && (
          <TextField label="How do you take it?" value={how} onChangeText={setHow} placeholder={HOW_PLACEHOLDER} autoFocus returnKeyType="done" onSubmitEditing={save} />
        )}

        {now === "stopped" && (
          <>
            <Text style={styles.ask}>Why did you stop?</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Why did you stop?">
              <SheetRows>
                {WHY_STOPPED.map((o) => (
                  <ChoiceRow key={o.value} title={o.label} selected={why === o.value} onPress={() => setWhy(o.value)} />
                ))}
              </SheetRows>
            </View>
          </>
        )}

        {now === "stopped" && why === "other" && (
          <TextField label="What made you stop?" value={note} onChangeText={setNote} autoFocus returnKeyType="done" onSubmitEditing={save} />
        )}

        {now === "stopped" && why === "side-effect" && (
          <Banner
            hue="teal"
            icon={<Phone size={16} color={HUE.teal.ink} />}
            title={`If you have symptoms now, call ${PRACTICE} at ${PHONE}.`}
            action="Call"
            onPress={() => call(PATIENT.practicePhone)}
          />
        )}

        <Button onPress={save} disabled={!answer}>
          Save
        </Button>
        <Text style={[type.meta, styles.centered]}>{`${DOCTOR} will see this.`}</Text>
      </ScrollView>
    </Sheet>
  )
}

/* ------------------------------------------------- opened by name -- */

/** What a host view offers for finding and moving the page it sits in: on
    a phone, React Native's element APIs (each element knows its parent and
    its box on screen, and ScrollView adds its own scrollTo and content view
    to its element); on the web, the page's own DOM. */
type HostNode = {
  parentElement?: HostNode | null
  getBoundingClientRect?: () => { top: number; height: number }
  scrollTo?: (to: { y: number; animated?: boolean }) => void
  getInnerViewRef?: () => HostNode | null
  scrollIntoView?: (options: { block: "center"; behavior: "smooth" | "auto" }) => void
}

/** The push onto the stack lands first, then the page glides to the
    medicine (iOS's push takes about 350 ms). */
const ARRIVE_MS = Platform.OS === "web" ? 300 : 450

/** Room left above a medicine too tall to centre, as between a page's
    sections. */
const ROOM = space.section

/** Scrolls the page a medicine sits in so the medicine is centred in view
    (a tall card's top shows, with a section's room above it). The page's
    scroll belongs to FlowScreen: on a phone it is the nearest element above
    the medicine with ScrollView's scrollTo, and the medicine's place is
    measured against that scroll's content; on the web the browser does it.
    Anything missing, it does nothing and the page stays at the top. */
function bringIntoView(view: View | null, still: boolean) {
  const node = view as unknown as HostNode | null
  if (!node) return
  if (Platform.OS === "web") return node.scrollIntoView?.({ block: "center", behavior: still ? "auto" : "smooth" })
  let scroll = node.parentElement
  while (scroll && typeof scroll.scrollTo !== "function") scroll = scroll.parentElement
  const content = scroll?.getInnerViewRef?.()
  if (!scroll?.scrollTo || !scroll.getBoundingClientRect || !content?.getBoundingClientRect || !node.getBoundingClientRect) return
  const item = node.getBoundingClientRect()
  const page = content.getBoundingClientRect()
  const frame = scroll.getBoundingClientRect()
  const y = item.top - page.top
  const target = item.height <= frame.height - ROOM * 2 ? y - (frame.height - item.height) / 2 : y - ROOM
  const most = Math.max(0, page.height - frame.height)
  scroll.scrollTo({ y: Math.min(most, Math.max(0, target)), animated: !still })
}

/** Brings what it holds into view once, as the page arrives, when it is the
    medicine she opened by name. */
function InView({ on, children }: { on: boolean; children: React.ReactNode }) {
  const ref = React.useRef<View>(null)
  // Read when the page moves, as Reduce Motion is known by then.
  const still = React.useRef(false)
  still.current = useReducedMotion()
  const done = React.useRef(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])
  // Measured once the page has laid it out, never on a later change.
  const onLayout = () => {
    if (!on || done.current) return
    done.current = true
    timer.current = setTimeout(() => bringIntoView(ref.current, still.current), ARRIVE_MS)
  }
  return (
    <View ref={ref} onLayout={on ? onLayout : undefined}>
      {children}
    </View>
  )
}

/** The mark holds while the page glides to the medicine and a moment after
    it lands, then fades. */
const SPOTLIGHT_HOLD_MS = 1600
const SPOTLIGHT_FADE_MS = 700

/** The medicine she opened by name, marked for a moment: the app's
    selected surface (the teal tint with its halo edge) behind it, which
    shows as the page arrives and fades once she has seen where it is. It
    sits behind the words and takes no taps. With Reduce Motion it shows and
    goes without fading. */
function Spotlight({ style }: { style: StyleProp<ViewStyle> }) {
  const still = useReducedMotion()
  const fade = React.useRef(new Animated.Value(1)).current
  const [gone, setGone] = React.useState(false)
  React.useEffect(() => {
    if (still) {
      const t = setTimeout(() => setGone(true), SPOTLIGHT_HOLD_MS + SPOTLIGHT_FADE_MS)
      return () => clearTimeout(t)
    }
    const run = Animated.sequence([
      Animated.delay(SPOTLIGHT_HOLD_MS),
      Animated.timing(fade, { toValue: 0, duration: SPOTLIGHT_FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
    ])
    run.start(({ finished }) => finished && setGone(true))
    return () => run.stop()
  }, [still, fade])
  if (gone) return null
  return <Animated.View pointerEvents="none" style={[styles.spotlight, style, { opacity: fade }]} />
}

/* --------------------------------------------------------- to check -- */

/** Where a saved answer puts her on the control. */
type Mode = "listed" | "differently" | "stopped" | "ended"

const modeOf = (a?: MedAnswer): Mode | undefined =>
  a === "taking" ? "listed" : a === "dose" ? "differently" : a === "stopped" ? "stopped" : a === "never" || a === "not-taking" ? "ended" : undefined

/** The one way a medicine or supplement is confirmed: "Taking as listed"
    saves at once; "Taking differently" asks "How do you take it?" and
    saves what she writes, as she wrote it. Inside it, "I stopped it" asks
    why and "I never started it" saves at once. Once saved, the row says
    "Confirmed 12 Oct 2026" and that Dr. Patel will see it. A side effect
    shows the practice's number; words that sound urgent show the same
    three calls the assistant offers. */
function ConfirmControl({ m, saved, onAnswer, ask }: { m: Medication; saved?: MedRecord; onAnswer: (a: Answer) => void; ask?: string }) {
  const [mode, setMode] = React.useState(() => modeOf(saved?.answer))
  const [how, setHow] = React.useState(saved?.answer === "dose" ? (medHow(saved) ?? "") : "")
  const [note, setNote] = React.useState(saved?.answer === "stopped" ? (saved.note ?? "") : "")
  const text = mode === "differently" ? how : mode === "stopped" && saved?.why === "other" ? note : ""
  const urgent = text.trim().length > 0 && questionKind(text) === "safety"
  const sideEffect = mode === "stopped" && saved?.answer === "stopped" && saved.why === "side-effect"

  const pick = (v: "listed" | "differently") => {
    if (v === "listed") {
      setMode("listed")
      return onAnswer({ answer: "taking" })
    }
    if (mode === "listed" || !mode) setMode("differently")
  }

  const saveHow = () => {
    const h = how.trim()
    if (h) onAnswer({ answer: "dose", note: h })
  }

  // Saved at once; why she stopped is the next question.
  const stop = () => {
    setMode("stopped")
    if (saved?.answer !== "stopped") onAnswer({ answer: "stopped" })
  }

  const never = () => {
    setMode("ended")
    onAnswer({ answer: "never" })
  }

  const pickWhy = (why: NonNullable<MedRecord["why"]>) => {
    if (why !== "other" || saved?.why !== "other") onAnswer({ answer: "stopped", why })
  }

  // What she typed under "Something else" is kept with her answer, for the
  // practice's review of it (Q-23).
  const saveNote = () => {
    const n = note.trim()
    if (n && n !== saved?.note) onAnswer({ answer: "stopped", why: "other", note: n })
  }

  return (
    <View style={styles.confirm}>
      <View style={styles.question}>
        {!!ask && <Text style={styles.ask}>{ask}</Text>}
        <Chips label={ask ?? `Do you take ${m.name} as listed?`} options={CONFIRM} value={mode === "listed" ? "listed" : mode ? "differently" : undefined} onChange={pick} />
      </View>

      {mode === "differently" && (
        <>
          <TextField
            label="How do you take it?"
            value={how}
            onChangeText={setHow}
            placeholder={HOW_PLACEHOLDER}
            autoFocus={saved?.answer !== "dose"}
            returnKeyType="done"
            onSubmitEditing={saveHow}
            trailing={
              <View style={styles.fieldAction}>
                <TextAction tone={how.trim() ? "primary" : "muted"} onPress={saveHow}>
                  Save
                </TextAction>
              </View>
            }
          />
          <View style={styles.also}>
            <TextAction tone="muted" onPress={stop}>
              I stopped it
            </TextAction>
            <TextAction tone="muted" onPress={never}>
              I never started it
            </TextAction>
          </View>
        </>
      )}

      {mode === "stopped" && (
        <>
          <View style={styles.question}>
            <Text style={styles.ask}>Why did you stop?</Text>
            <Chips label="Why did you stop?" options={WHY_STOPPED} value={saved?.why} onChange={pickWhy} />
          </View>
          {saved?.why === "other" && (
            <TextField
              label="What made you stop?"
              value={note}
              onChangeText={setNote}
              returnKeyType="done"
              onSubmitEditing={saveNote}
              trailing={
                <View style={styles.fieldAction}>
                  <TextAction onPress={saveNote}>Done</TextAction>
                </View>
              }
            />
          )}
        </>
      )}

      {mode === "ended" && saved && <Text style={type.body}>{`${saidOf(saved)}.`}</Text>}

      {(mode === "stopped" || mode === "ended") && (
        <View style={styles.also}>
          <TextAction tone="muted" onPress={() => setMode("differently")}>
            Say how I take it instead
          </TextAction>
        </View>
      )}

      {saved && modeOf(saved.answer) === mode && (
        <View style={styles.said}>
          <View style={styles.saidMark}>
            <Check size={10} color={color.onPrimary} weight="bold" />
          </View>
          <View style={styles.grow}>
            <Text style={[type.meta, styles.saidLead]}>{confirmedOn(saved.at)}</Text>
            <Text style={type.meta}>{`${DOCTOR} will see this.`}</Text>
          </View>
        </View>
      )}

      {sideEffect && (
        <Banner
          hue="teal"
          icon={<Phone size={16} color={HUE.teal.ink} />}
          title={`If you have symptoms now, call ${PRACTICE} at ${PHONE}.`}
          action="Call"
          onPress={() => call(PATIENT.practicePhone)}
        />
      )}

      {urgent && (
        <View style={styles.urgent} accessibilityRole="alert">
          <View style={styles.urgentTop}>
            <View style={styles.urgentIcon}>
              <Info size={URGENT_ICON} color={color.amber} />
            </View>
            <Text style={[type.body, styles.grow]}>{URGENT.page.replace(PATIENT.practicePhone, PHONE)}</Text>
          </View>
          {/* The same three calls the assistant offers, in the same order. */}
          <View style={styles.urgentActions}>
            {URGENT.calls.map((c) => (
              <SmallAction key={c.tel} tone="outline" onPress={() => call(c.tel)} accessibilityLabel={c.spoken ?? c.label}>
                {c.label}
              </SmallAction>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

/** One medicine her lists differ on: each list's line and who settles it,
    then the control to say what she takes. The question names whose list
    "as listed" means: Dr. Patel's, where she has one. */
function CheckCard({ m, saved, onAnswer, spotlight }: { m: Medication; saved?: MedRecord; onAnswer: (a: Answer) => void; spotlight?: boolean }) {
  const onList = m.lists.some((l) => l.origin === "doctor")
  return (
    <Card style={styles.check}>
      {spotlight && <Spotlight style={styles.spotCard} />}
      <View style={styles.checkHead}>
        <View style={styles.checkName}>
          <PillTile />
          <Text style={styles.name}>{m.name}</Text>
        </View>
        {!saved && (
          <View style={styles.differ}>
            <Dot tone="low" />
            <Text style={styles.differText}>Records differ</Text>
          </View>
        )}
      </View>
      <View style={styles.rule} />

      {/* Each list's line on its own tile, side by side; the dose and its
          source read as one line to a screen reader. */}
      <View style={styles.sources}>
        {m.lists.map((l) => (
          <View key={`${l.origin}-${l.dose}`} style={styles.source} accessible accessibilityLabel={`${l.dose}, ${LIST_NAME[l.origin]}, ${onDay(l.date)}`}>
            <PageGround />
            <Text style={styles.sourceDose} numberOfLines={1}>
              {l.dose}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>{`${LIST_NAME[l.origin]}, ${onDay(l.date)}`}</Text>
          </View>
        ))}
      </View>

      <View style={styles.rule} />
      <ConfirmControl m={m} saved={saved} onAnswer={onAnswer} ask={onList ? `Do you take it as ${DOCTOR} lists it?` : "Do you take it as listed?"} />
    </Card>
  )
}

/* ------------------------------------------------- up to date, past -- */

/** Answer chips that wrap inside a card, 12 between lines and 10 side by
    side (Figma); one is chosen at a time. */
function Chips<T extends string>({ options, value, onChange, label }: { options: Choice<T>[]; value?: T; onChange: (v: T) => void; label: string }) {
  return (
    <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} radio />
      ))}
    </View>
  )
}

/** A medicine or supplement on the Active list: its line and who it comes
    from (opening its page), then the control to confirm it. */
function ConfirmRow({ m, saved, onAnswer }: { m: Medication; saved?: MedRecord; onAnswer: (a: Answer) => void }) {
  return (
    <View style={styles.agree}>
      <Pressable
        onPress={() => openMedicine(m)}
        accessibilityRole="button"
        accessibilityLabel={`${m.name}, ${lineOf(m)}`}
        style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
      >
        <PillTile />
        <View style={styles.words}>
          <Text style={styles.name}>{m.name}</Text>
          <Text style={styles.meta}>{lineOf(m)}</Text>
        </View>
        <CaretRight size={16} color={card.chevron} />
      </Pressable>
      <ConfirmControl m={m} saved={saved} onAnswer={onAnswer} />
    </View>
  )
}

/** The "You said" check, centred on the first line of her answer. */
const SAID_MARK = 18

/** The kit's TextAction is a 32 pt touch target with its word centred. */
const TEXT_ACTION = 32

const styles = StyleSheet.create({
  grow: { flex: 1 },
  pressed: { opacity: 0.7 },

  // A card's rows, 12 either side of a hairline.
  rows: { gap: space.card },
  rule: { height: 0.8, backgroundColor: hairline.rule },
  tile: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.primaryTint, alignItems: "center", justifyContent: "center" },
  words: { flex: 1, gap: space.stack },
  name: { ...type.title, color: ink.detail },
  meta: { ...type.label },
  listRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  // A medicine to check: its name, its lists and the question, 12 apart
  // over hairlines.
  check: { gap: space.card },
  checkHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item },
  checkName: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.mark },
  differ: { flexDirection: "row", alignItems: "center", gap: space.mark },
  differText: { ...type.captionStrong, color: ink.detail },
  // Each list on its own tile: the page's gradient inside a hairline.
  sources: { flexDirection: "row", gap: 13 },
  source: {
    flex: 1,
    gap: space.stack,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: hairline.edge,
    overflow: "hidden",
  },
  sourceDose: { ...type.title, color: ink.detail },
  // A question to its answers.
  question: { gap: 10 },
  ask: { ...type.title, color: ink.secondary },
  chips: { flexDirection: "row", flexWrap: "wrap", rowGap: space.item, columnGap: 10 },
  followUp: { marginTop: space.stack },
  // "Change" on the first line of her answer, not above it.
  change: { marginTop: (type.body.lineHeight - TEXT_ACTION) / 2 },
  // "Save" and "Done" inside the field's box, clear of its edge (a metric
  // of the field, not a gap between pieces).
  fieldAction: { paddingRight: 12 },

  said: { flexDirection: "row", alignItems: "flex-start", gap: space.inline },
  saidMark: {
    width: SAID_MARK,
    height: SAID_MARK,
    borderRadius: SAID_MARK / 2,
    marginTop: (type.body.lineHeight - SAID_MARK) / 2,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saidLead: { color: ink.detail },

  urgent: { gap: space.item, padding: space.compact, borderRadius: 8, borderWidth: 1, borderColor: color.amberEdge, backgroundColor: color.amberTint },
  urgentTop: { flexDirection: "row", alignItems: "flex-start", gap: space.inline },
  // The icon centred on the message's first line.
  urgentIcon: { marginTop: (type.body.lineHeight - URGENT_ICON) / 2 },
  // The pills start under the words, past the icon.
  urgentActions: { flexDirection: "row", flexWrap: "wrap", gap: space.inline, paddingLeft: URGENT_ICON + space.inline },

  // A medicine and its answer chips: the row, then the chips 12 under it.
  agree: { gap: space.item },
  // The confirm control: chips, then what follows from them, 12 apart.
  confirm: { gap: space.item },
  // "I stopped it" and "I never started it", quiet under the field.
  also: { flexDirection: "row", flexWrap: "wrap", columnGap: space.gutter },
  // A section over its card: the heading, with its action at the end.
  section: { gap: space.item },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { ...type.sectionLabel },
  // A past medicine: the tile beside its name and two lines.

  // The details sheet's facts: rows edge to edge on the inset card.
  badge: { flexDirection: "row" },
  centered: { textAlign: "center" },
  sheetScroll: { flexGrow: 0 },
  sheetBody: { gap: space.gutter },
  facts: { paddingVertical: 0 },

  // The medicine opened by name: the selected surface's tint behind it.
  spotlight: { position: "absolute", backgroundColor: color.primaryTint },
  // A card's whole inside, with the halo just inside its edge and its
  // corners.
  spotCard: { top: 0, left: 0, right: 0, bottom: 0, borderRadius: cardRadius - 1, borderWidth: 1.5, borderColor: color.primaryHalo },
})
