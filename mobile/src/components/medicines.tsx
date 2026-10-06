import * as React from "react"
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"

import { useReducedMotion } from "@/components/chat"
import { PageGround } from "@/components/hol"
import { Check, Info, Phone, Pill } from "@/components/ph"
import { Banner, Block, Card, Chip, Dot, HUE, KeyValue, SmallAction, Tabs, Tag, TextAction, toast, type Choice } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { Button, TextField } from "@/components/ui"
import { questionKind } from "@/lib/allowance"
import { URGENT } from "@/lib/assistant"
import { call } from "@/lib/links"
import { useOnboarding, type MedRecord } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { MEDICATIONS, ORIGIN_LABEL, REVIEW, medDifference, type Medication, type Origin } from "@/lib/record"
import { cardRadius, color, hairline, ink, space, type } from "@/lib/theme"

/* Your medicines (FINAL-SPEC C.10): one list the patient and Dr. Patel both
   trust. Dr. Patel's list is the true one (F-65). Where another place lists
   a medicine differently, both lists show, each with where it came from and
   when (F-70), and she says what she actually takes. Her answer saves at
   once (A-24) and sits beside the lists, never over them: only Dr. Patel
   settles a difference (F-69). The words stay neutral and say who settles
   it (F-72); never conflict, error or wrong. Nothing here sells.

   MedicineConfirm is the whole list for Your medicines, and, `compact`,
   the paid setup's medicines step. Drawn as the Figma "Hol" Your
   medicines (5 Oct 2026): while anything is left to check, the check page
   (To check, Up to date, Past); once everything is checked, Current and
   Past medicines on a segmented control, each opening its details in a
   sheet (MedicineSheet, drawn by the screen over the page). */

export type MedicineConfirmProps = {
  /** The tighter layout for the paid setup's medicines step: the questions
      and the rest of her list, without the count card, the answer chips on
      medicines that agree, or past medicines. */
  compact?: boolean
  /** Runs once every medicine to check has an answer (on arrival too, when
      they were answered before), so setup can go on. */
  onAnswered?: () => void
  /** A medicine to bring into view on arrival and mark for a moment, by
      id: the one she tapped on Home, the Record tab or the timeline
      (`/medications?id=cetirizine`). On the list it opens its details. */
  focus?: string
  /** Which view shows: the check page or the list. Unset, the check page
      while anything is left to check, else the list. */
  view?: MedicineView
  /** Opens a medicine's details (the list's rows). */
  onOpen?: (m: Medication) => void
}

export type MedicineView = "check" | "list"

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
    case "dose":
      return r.dose ?? "Another dose"
    case "stopped":
      return r.why === "other" && r.note ? `${STOPPED_SAID.other}: ${r.note}` : r.why ? STOPPED_SAID[r.why] : "I stopped it"
    case "taking":
      return "I take it"
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

/** The answers on a medicine that only another place lists. */
const OFF_LIST: Choice<"taking" | "stopped" | "never">[] = [
  { value: "taking", label: "I take it" },
  { value: "stopped", label: "I stopped it" },
  { value: "never", label: "I never started it" },
]

const WHY_STOPPED: Choice<NonNullable<MedRecord["why"]>>[] = [
  { value: "side-effect", label: "A side effect" },
  { value: "doctor", label: "A doctor told me to" },
  { value: "ran-out", label: "I ran out" },
  { value: "other", label: "Something else" },
]

/** The optional answers on a medicine her lists agree on. */
const TAKING: Choice<"taking" | "not-taking">[] = [
  { value: "taking", label: "Taking it" },
  { value: "not-taking", label: "Not taking it" },
]

/** The urgent message's icon, which its pills line up after. */
const URGENT_ICON = 18

/** Her medicines. The check page: the ones her lists differ on with a
    question for each, the ones they agree on, and past ones. The list:
    current and past medicines, each opening its details. */
export function MedicineConfirm({ compact = false, onAnswered, focus, view, onOpen }: MedicineConfirmProps) {
  const s = useOnboarding()
  const current = MEDICATIONS.filter((m) => !m.resolved)
  const differ = current.filter((m) => medDifference(m))
  const agree = current.filter((m) => !medDifference(m))
  const past = MEDICATIONS.filter((m) => m.resolved)
  const open = differ.filter((m) => !s.meds?.[m.id]).length
  // The view is chosen once, as the page opens, so answering the last
  // question never swaps the page from under her.
  const [initial] = React.useState<MedicineView>(open > 0 ? "check" : "list")
  const shown: MedicineView = compact ? "check" : (view ?? initial)

  // Setup goes on once every difference has an answer, already or now.
  const told = React.useRef(false)
  const answered = React.useRef(onAnswered)
  answered.current = onAnswered
  React.useEffect(() => {
    if (open > 0 || told.current) return
    told.current = true
    answered.current?.()
  }, [open])

  // Saved with the medicine's name and the lists she saw, so Dr. Patel
  // reads her answer against the same difference (lib/record
  // providerAnswer).
  const answer = (m: Medication, a: Answer) => {
    const record: MedRecord = { medication: m.name, shown: m.lists, ...a, at: new Date().toISOString() }
    void s.save({ meds: { ...s.meds, [m.id]: record } })
    toast("Saved")
  }

  if (shown === "list") return <MedicineList current={current} past={past} focus={focus} onOpen={onOpen} />

  const sections = (
    <>
      {differ.length > 0 && (
        <Block title={open ? "To check" : "Checked"}>
          {differ.map((m) => (
            <InView key={m.id} on={focus === m.id}>
              <CheckCard m={m} saved={s.meds?.[m.id]} onAnswer={(a) => answer(m, a)} spotlight={focus === m.id} />
            </InView>
          ))}
        </Block>
      )}

      {agree.length > 0 && (
        <Block title="Up to date">
          <Rows>
            {agree.map((m, i) => (
              <InView key={m.id} on={focus === m.id}>
                <AgreeRow m={m} saved={s.meds?.[m.id]} onAnswer={compact ? undefined : (a) => answer(m, a)} spotlight={focus === m.id ? edgesOf(i, agree.length) : undefined} />
              </InView>
            ))}
          </Rows>
        </Block>
      )}

      {!compact && past.length > 0 && (
        <Block title="Past">
          <Rows>
            {past.map((m, i) => (
              <InView key={m.id} on={focus === m.id}>
                <PastRow m={m} spotlight={focus === m.id ? edgesOf(i, past.length) : undefined} />
              </InView>
            ))}
          </Rows>
        </Block>
      )}
    </>
  )

  // On Your medicines the sections sit straight on the page, as far apart
  // as every page's sections; the setup step holds them together under its
  // title.
  return compact ? <View style={styles.compact}>{sections}</View> : sections
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

type Shelf = "current" | "past"

const SHELVES: { value: Shelf; label: string }[] = [
  { value: "current", label: "Current medicines" },
  { value: "past", label: "Past medicines" },
]

/** Once everything is checked: current and past medicines on a segmented
    control, each row opening its details. Opened by name, the medicine's
    details open as the page arrives. */
function MedicineList({ current, past, focus, onOpen }: { current: Medication[]; past: Medication[]; focus?: string; onOpen?: (m: Medication) => void }) {
  const [shelf, setShelf] = React.useState<Shelf>(past.some((m) => m.id === focus) ? "past" : "current")
  // Each medicine opened by name opens once, on its shelf, also when the
  // page is already open and only the name changes.
  const opened = React.useRef<string | undefined>(undefined)
  React.useEffect(() => {
    if (!focus || opened.current === focus) return
    opened.current = focus
    const m = MEDICATIONS.find((x) => x.id === focus)
    if (!m) return
    setShelf(m.resolved ? "past" : "current")
    onOpen?.(m)
  }, [focus, onOpen])
  const list = shelf === "current" ? current : past
  return (
    <>
      <Tabs options={SHELVES} value={shelf} onChange={setShelf} />
      {list.length > 0 && (
        <Rows>
          {list.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => onOpen?.(m)}
              accessibilityRole="button"
              accessibilityLabel={[m.name, lineOf(m), m.resolved].filter(Boolean).join(". ")}
              style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
            >
              <PillTile />
              <View style={styles.words}>
                <Text style={styles.name}>{m.name}</Text>
                <Text style={styles.meta}>{shelf === "past" ? pastLine(m) : lineOf(m)}</Text>
              </View>
            </Pressable>
          ))}
        </Rows>
      )}
    </>
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

/** A medicine's details, in the sheet the list opens: its badge, then each
    fact on an inset card. A current medicine offers to update what she
    takes, which opens the check page. */
export function MedicineSheet({ m, onClose, onUpdate }: { m: Medication; onClose: () => void; onUpdate: () => void }) {
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
    ...(saved ? [{ label: "You said", value: saidOf(saved) }] : []),
    ...(m.resolved ? [{ label: "Ended", value: endedOf(m.resolved) }] : []),
  ]
  return (
    <Sheet title={m.name} titleRight={<Tag tone={m.resolved ? "muted" : "ok"}>{m.resolved ? "Past" : "Active"}</Tag>} onClose={onClose}>
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

/** Which corners of its Group a row's mark rounds: the first row's top
    ones, the last row's bottom ones. */
type Edges = { first: boolean; last: boolean }
const edgesOf = (i: number, count: number): Edges => ({ first: i === 0, last: i === count - 1 })

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

/** A row's mark reaches its Group's edges, rounded where the Group is. */
function rowSpotlight({ first, last }: Edges): StyleProp<ViewStyle> {
  return [styles.spotRow, first && styles.spotRowFirst, last && styles.spotRowLast]
}

/* --------------------------------------------------------- to check -- */

/** One medicine her lists differ on: each list's line, who settles it, and
    the question, until she answers; then what she said, with Change. A dose
    that differs asks which dose she takes; a medicine only another place
    lists asks whether she takes it, and why she stopped if she did. */
function CheckCard({ m, saved, onAnswer, spotlight }: { m: Medication; saved?: MedRecord; onAnswer: (a: Answer) => void; spotlight?: boolean }) {
  const onList = m.lists.some((l) => l.origin === "doctor")
  const doses = [...new Set(m.lists.map((l) => l.dose))]
  const typed = saved?.answer === "dose" && saved.dose && !doses.includes(saved.dose) ? saved.dose : ""
  const [asking, setAsking] = React.useState(!saved)
  const [another, setAnother] = React.useState(false)
  const [dose, setDose] = React.useState(typed)
  const [note, setNote] = React.useState(saved?.note ?? "")
  const urgent = note.trim().length > 0 && questionKind(note) === "safety"
  const stopped = saved?.answer === "stopped"

  const done = (a: Answer) => {
    onAnswer(a)
    setAnother(false)
    setAsking(false)
  }

  const doseChoices: Choice<string>[] = [
    ...doses.map((d) => ({ value: `dose:${d}`, label: d })),
    { value: "another", label: "Another dose" },
    { value: "not-taking", label: "I don't take it" },
  ]
  const doseValue = another
    ? "another"
    : saved?.answer === "dose"
      ? typed
        ? "another"
        : `dose:${saved.dose}`
      : saved?.answer === "not-taking"
        ? "not-taking"
        : undefined

  const pickDose = (v: string) => {
    if (v.startsWith("dose:")) return done({ answer: "dose", dose: v.slice(5) })
    if (v === "not-taking") return done({ answer: "not-taking" })
    setAnother(true)
  }

  const pickTaking = (v: (typeof OFF_LIST)[number]["value"]) => {
    if (v !== "stopped") return done({ answer: v })
    // Saved at once; why she stopped is the next question.
    if (!stopped) onAnswer({ answer: "stopped" })
  }

  const pickWhy = (why: NonNullable<MedRecord["why"]>) => {
    if (why !== "other") return done({ answer: "stopped", why })
    if (saved?.why !== "other") onAnswer({ answer: "stopped", why })
  }

  // What she typed under "Something else" is kept with her answer, for the
  // practice's review of it (Q-23).
  const saveNote = () => {
    const n = note.trim()
    if (n && n !== saved?.note) onAnswer({ answer: "stopped", why: "other", note: n })
    setAsking(false)
  }

  const saveDose = () => {
    const d = dose.trim()
    if (d) done({ answer: "dose", dose: d })
  }

  const sideEffect = stopped && saved?.why === "side-effect"

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

      {asking ? (
        <>
          <View style={styles.rule} />
          <View style={styles.question}>
            <Text style={styles.ask}>{onList ? "Which dose do you take?" : "Do you take it?"}</Text>
            {onList ? (
              <Chips label="Which dose do you take?" options={doseChoices} value={doseValue} onChange={pickDose} />
            ) : (
              <Chips label="Do you take it?" options={OFF_LIST} value={saved?.answer as (typeof OFF_LIST)[number]["value"] | undefined} onChange={pickTaking} />
            )}
          </View>

          {onList && doseValue === "another" && (
            <TextField
              label="Your dose"
              value={dose}
              onChangeText={setDose}
              autoFocus={another}
              returnKeyType="done"
              onSubmitEditing={saveDose}
              trailing={
                <View style={styles.fieldAction}>
                  <TextAction tone={dose.trim() ? "primary" : "muted"} onPress={saveDose}>
                    Save
                  </TextAction>
                </View>
              }
            />
          )}

          {stopped && (
            <View style={[styles.question, styles.followUp]}>
              <Text style={styles.ask}>Why did you stop?</Text>
              <Chips label="Why did you stop?" options={WHY_STOPPED} value={saved?.why} onChange={pickWhy} />
            </View>
          )}

          {stopped && saved?.why === "other" && (
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
      ) : (
        saved && (
          <>
            <View style={styles.rule} />
            <View style={styles.said}>
              <View style={styles.saidMark}>
                <Check size={10} color={color.onPrimary} weight="bold" />
              </View>
              <View style={styles.grow}>
                <Text style={type.body}>
                  <Text style={styles.saidLead}>You said: </Text>
                  {`${saidOf(saved)}.`}
                </Text>
                <Text style={type.meta}>{`${DOCTOR} will see this.`}</Text>
              </View>
              <View style={styles.change}>
                <TextAction onPress={() => setAsking(true)}>Change</TextAction>
              </View>
            </View>
          </>
        )
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

/** A medicine her lists agree on: its line and who it comes from, with an
    optional "Taking it" or "Not taking it". */
function AgreeRow({ m, saved, onAnswer, spotlight }: { m: Medication; saved?: MedRecord; onAnswer?: (a: Answer) => void; spotlight?: Edges }) {
  const value = saved?.answer === "taking" || saved?.answer === "not-taking" ? saved.answer : undefined
  return (
    <View style={styles.agree}>
      {spotlight && <Spotlight style={rowSpotlight(spotlight)} />}
      <View style={styles.listRow}>
        <PillTile />
        <View style={styles.words}>
          <Text style={styles.name}>{m.name}</Text>
          <Text style={styles.meta}>{lineOf(m)}</Text>
        </View>
      </View>
      {onAnswer && <Chips label={`Are you taking ${m.name}?`} options={TAKING} value={value} onChange={(v) => onAnswer({ answer: v })} />}
      {onAnswer && value === "not-taking" && <Text style={type.meta}>{`${DOCTOR} will see this.`}</Text>}
    </View>
  )
}

/** A medicine she no longer takes, with how it ended. */
function PastRow({ m, spotlight }: { m: Medication; spotlight?: Edges }) {
  return (
    <View style={styles.pastRow}>
      {spotlight && <Spotlight style={rowSpotlight(spotlight)} />}
      <PillTile />
      <View style={styles.words}>
        <Text style={styles.name}>{m.name}</Text>
        {/* Where and when stay together: "400 mg when needed," then
            "Scripps Memorial, Jun 3" on a narrow phone. */}
        <Text style={styles.pastMeta}>{pastLine(m)}</Text>
      </View>
    </View>
  )
}

/** The "You said" check, centred on the first line of her answer. */
const SAID_MARK = 18

/** The kit's TextAction is a 32 pt touch target with its word centred. */
const TEXT_ACTION = 32

const styles = StyleSheet.create({
  // The setup step's sections, a screen's section apart.
  compact: { gap: space.section },
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
  // A past medicine: the tile beside its name and two lines.
  pastRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  pastMeta: { ...type.label },

  // The details sheet's facts: rows edge to edge on the inset card.
  facts: { paddingVertical: 0 },

  // The medicine opened by name: the selected surface's tint behind it.
  spotlight: { position: "absolute", backgroundColor: color.primaryTint },
  // A card's whole inside, with the halo just inside its edge and its
  // corners.
  spotCard: { top: 0, left: 0, right: 0, bottom: 0, borderRadius: cardRadius - 1, borderWidth: 1.5, borderColor: color.primaryHalo },
  // A row's band, out to its card's sides and up to its rules.
  spotRow: { top: -space.card, bottom: -space.card, left: -space.card, right: -space.card },
  spotRowFirst: { borderTopLeftRadius: cardRadius - 1, borderTopRightRadius: cardRadius - 1 },
  spotRowLast: { borderBottomLeftRadius: cardRadius - 1, borderBottomRightRadius: cardRadius - 1 },
})
