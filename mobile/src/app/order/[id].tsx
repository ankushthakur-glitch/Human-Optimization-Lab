import { router, useLocalSearchParams, usePathname } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { keepTogether, reminderSteps } from "@/components/care-gap"
import { BookedSheet, BookIt, BookSheet, UpdateSheet, contactFor, placeShort, withTold, type TestAnswer } from "@/components/care-orders-book"
import { HeadCard, IconAction, Reminders } from "@/components/care-orders-rows"
import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { AskButton, PrimaryButton } from "@/components/hol"
import { CalendarBlank, MapPin } from "@/components/ph"
import { Block, Card, DateTrack, KeyValue, Status, Tag, type Mark, type Tone, type TrackDate } from "@/components/record-kit"
import { toast } from "@/components/toast"
import { experience } from "@/lib/experience"
import { addToCalendar, call, directions } from "@/lib/links"
import { dateOfAt, shortDay } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { CARE_GAPS, PROVENANCE_LABEL, order as findOrder, type Order } from "@/lib/record"
import { font, ink, space, type } from "@/lib/theme"
import { bookingOf, orderStatus, type Booked, type OrderTone } from "@/lib/todo"
import { timeOf } from "@/lib/trends"

/* One test a doctor ordered, followed to the end (FINAL-SPEC C.8.1): where
   it stands in the patient's words ("Not booked yet", with "Overdue" once
   it is; "Booked for Wed, Oct 7, 10:15 AM"; "Results in"), the fact behind
   it in a sentence that names the doctor and the day (F-49), its three
   dates (F-40), then the ways to book it while it is open, the details,
   and the reminders sent so far. "I booked it" never closes a test: it
   stays open until the result reaches the record (F-43). "Update this
   test" offers what fits: the Q-22 answers while it is open; once it is
   booked, change or cancel it (F-41), never book it again over a booking.
   No offer on this page.

   Figma "Hol" (5 Oct 2026, "Screening mammogram"): the tinted head card
   with the status badge and its tag or place across the top, the sentence,
   then the three date pills; "Book it", "Details" and "Reminders" under
   it; "Update test" in the header and "Ask to Health Agent" (with "See
   your results" once they are in) in the footer. /book/[id] is this page
   with the partner booking sheet open over it. */

/** How each answer from lib/todo.ts's orderStatus is marked (C.0.4): "Not
    booked yet" a filled dot, grey before it is due and clay once overdue
    (with the clay "Overdue" tag beside it, so it is never told by colour
    alone); "Booked for ..." a teal dot; "Done, waiting for results" and
    "Waiting for the result" a teal ring; "Waiting for Dr. Patel to
    confirm" a grey dot; "Results in" a green check. */
const MARK: Record<OrderTone, { tone: Tone; mark: Mark }> = {
  neutral: { tone: "muted", mark: "dot" },
  attention: { tone: "low", mark: "dot" },
  booked: { tone: "primary", mark: "dot" },
  waiting: { tone: "primary", mark: "ring" },
  done: { tone: "ok", mark: "check" },
}

/** What to call a test in a sentence (sample copy); anything not listed is
    "a" and its name. */
const NOUN: Record<string, string> = {
  mammogram: "your mammogram",
  echo: "an echocardiogram",
  "labs-nov": "a repeat A1c and lipid panel",
  "labs-26": "a lipid and metabolic panel",
}

const nounOf = (o: Order) => NOUN[o.id] ?? `${/^[aeiou]/i.test(o.name) ? "an" : "a"} ${o.name.charAt(0).toLowerCase()}${o.name.slice(1)}`

/** "Dr. Maya Patel" as "Dr. Patel"; "Dr. Lee, Pacific Heart" as "Dr. Lee". */
function doctorOf(by: string) {
  const name = by.split(",")[0].trim()
  const parts = name.split(/\s+/)
  return parts[0] === "Dr." && parts.length > 2 ? `Dr. ${parts[parts.length - 1]}` : name
}

/** "Mar 4" from a day key, or from the record's own words ("Aug 14, 2026"). */
const dayWords = (at: string) => shortDay(/^\d{4}-\d{2}-\d{2}/.test(at) ? dateOfAt(at) : new Date(timeOf(at)))

/** "It needs 10 to 12 hours of fasting." from "Fast for 10 to 12 hours." */
function needOf(o: Order) {
  const fast = o.prep && /fast for ([^.]+)\./i.exec(o.prep)
  return fast ? ` It needs ${fast[1]} of fasting.` : ""
}

type Stage = "open" | "booked" | "elsewhere" | "not-needed" | "done"

/** The fact behind the test in one or two sentences: who ordered it and
    when, then what is true now (F-49). A booking she told us about leaves
    the test open until the result arrives (F-43). */
function factOf(o: Order, stage: Stage, overdue: boolean, told: boolean, doneOn?: Date) {
  const origin = `${doctorOf(o.by)} ordered ${nounOf(o)} on ${dayWords(o.orderedAt)}`
  switch (stage) {
    case "open":
      if (overdue) return `${origin}. We haven't seen it booked yet.`
      if (o.at) return `${origin}, to be done at ${placeShort(o.at)} by ${dayWords(o.dueAt)}.`
      return `${origin}, due by ${dayWords(o.dueAt)}.${needOf(o)}`
    case "booked":
      return `${origin}.${needOf(o)}${told ? " We'll mark it done when the result arrives." : ""}`
    case "elsewhere":
      return "We'll look for the result in your record."
    case "not-needed":
      return `${origin}.`
    case "done":
      return `${origin}. The results reached your record on ${doneOn ? shortDay(doneOn) : dayWords(o.completed ?? o.dueAt)}.`
  }
}

/** The sheets this page opens. */
const SHEETS = ["booked", "update", "book"] as const
type Sheet = (typeof SHEETS)[number]

export default function OrderScreen() {
  const { id, sheet: opened } = useLocalSearchParams<{ id: string; sheet?: string }>()
  const onboarding = useOnboarding()
  // Opened as /book/[id], the partner booking sheet is up from the start;
  // a link can open the others too (?sheet=update, as Profile's renew).
  const first = usePathname().startsWith("/book/") ? "book" : SHEETS.find((s) => s === opened)
  const [sheet, setSheet] = React.useState<Sheet | undefined>(first)

  const o = id ? findOrder(id) : undefined
  if (!o) return <PageNotFoundState />

  const status = orderStatus(o, onboarding)
  // Done elsewhere, or not needed: what she said (kept in the store), until
  // the record or Dr. Patel answers.
  const answer = onboarding.testAnswers?.[o.id]?.answer
  // Read where every screen reads a booking (lib/todo.ts bookingOf), so the
  // status, the dates and the place always agree with To do and Home.
  const booking = bookingOf(o.id, onboarding)
  // Booked by her and told to us, not booked and paid through Inlay.
  const told = !!booking?.told
  const done = status.tone === "done"
  const stage: Stage = done ? "done" : (answer ?? (status.tone === "booked" || status.tone === "waiting" || !!booking ? "booked" : "open"))
  const booked = stage === "booked"
  const overdue = stage === "open" && status.tone === "attention"
  const word = status.word
  const { tone, mark } = MARK[status.tone]

  // Under the status: when it is due, or where it is booked and what was
  // paid (a booking she told us about says so), or where it was done.
  const meta =
    stage === "open"
      ? `Due by ${dayWords(o.dueAt)}`
      : stage === "booked" && booking
        ? placeAndPaid(booking)
        : stage === "done" && o.at
          ? o.at
          : undefined

  // A member's plan test: one fact, never an offer.
  const planTest = !done && experience(onboarding) === "member" && (o.markers?.length ?? 0) > 0
  // A day, a time and a place still ahead: worth a calendar entry and
  // directions.
  const where = booking?.where
  const timed = stage === "booked" && !!booking?.time && !!where && status.word.startsWith("Booked for")

  const gap = CARE_GAPS.find((g) => g.id === o.id)
  const track: TrackDate[] = [
    { label: "Ordered", date: dayWords(o.orderedAt) },
    { label: "Scheduled", date: booking ? shortDay(booking.date) : o.scheduled ? dayWords(o.scheduled) : undefined },
    { label: "Done", date: status.on ? shortDay(status.on) : o.completed ? dayWords(o.completed) : undefined },
  ]

  // Who "I need help booking" calls (the clinic), or "Change or cancel" on
  // a booked test: the place it is booked at, or the clinic.
  const contact = contactFor(booked ? booking?.where || o.at : undefined)

  const saveBooked = (day: Date, where?: string) => {
    setSheet(undefined)
    // A test booked and paid through Inlay keeps its booking: nothing she
    // tells us replaces its place, time and payment.
    const bookings = withTold(onboarding.bookings, o.id, day, where)
    if (!bookings) return
    // Booked now: an earlier "done somewhere else" no longer stands.
    const { [o.id]: _answered, ...testAnswers } = onboarding.testAnswers ?? {}
    onboarding.save({ bookings, testAnswers }).catch(() => {})
    toast("Saved. We'll mark it done when the result arrives.")
  }

  const onAnswer = (a: TestAnswer) => {
    if (a === "booked") return setSheet("booked")
    setSheet(undefined)
    if (a === "help" || a === "change") return call(contact.phone)
    onboarding.save({ testAnswers: { ...onboarding.testAnswers, [o.id]: { answer: a, at: new Date().toISOString() } } }).catch(() => {})
    toast("Saved")
  }

  // The test named, so the assistant answers at once rather than asking
  // which test.
  const ask = `What is the ${o.name.charAt(0).toLowerCase()}${o.name.slice(1)} for?`

  return (
    <View style={styles.screen}>
      <FlowScreen
        page
        title={o.name}
        action={done ? undefined : { label: "Update test", onPress: () => setSheet("update") }}
        footer={
          <>
            <AskButton params={{ ask }} />
            {done && <PrimaryButton onPress={() => router.push("/results")}>See your results</PrimaryButton>}
          </>
        }
      >
        <HeadCard style={styles.head}>
          <View style={styles.words}>
            <View style={styles.statusLine}>
              <Status tone={tone} mark={mark}>
                {word}
              </Status>
              {/* Overdue in words as well as colour, as To do says it
                  (C.0.4, C.0.9); otherwise when it is due, or where. */}
              {overdue ? <Tag tone="low">Overdue</Tag> : !!meta && <Text style={styles.statusMeta}>{keepTogether(meta)}</Text>}
            </View>
            <Text style={styles.fact}>{keepTogether(factOf(o, stage, overdue, told, status.on))}</Text>
            {planTest && <Text style={styles.plan}>This result updates your plan.</Text>}
          </View>
          {timed && booking && where && (
            <View style={styles.pills}>
              <IconAction grow icon={<CalendarBlank size={14} color={ink.primary} />} onPress={() => addToCalendar({ title: o.name, start: booking.date, where })}>
                Add to calendar
              </IconAction>
              <IconAction grow icon={<MapPin size={14} color={ink.primary} />} onPress={() => directions(where)}>
                Directions
              </IconAction>
            </View>
          )}
          <DateTrack dates={track} late={overdue} />
        </HeadCard>

        {stage === "open" && <BookIt order={o} onBooked={() => setSheet("booked")} onPartner={() => setSheet("book")} />}

        <Block title="Details">
          <Card style={styles.details}>
            <KeyValue label="Ordered by" value={o.by} />
            <KeyValue label="Due" value={o.due} />
            <KeyValue label="Where" value={keepTogether(booking?.where || o.at || "Not named on the order")} last={!o.prep} />
            {!!o.prep && <KeyValue label="Preparation" value={keepLast(o.prep)} last />}
          </Card>
        </Block>

        {gap && gap.reminders > 0 && !done && (
          <Block title="Reminders">
            <Card>
              <Reminders steps={reminderSteps(gap, "Then Dr. Patel's team will reach out", stage !== "open")} />
            </Card>
          </Block>
        )}
      </FlowScreen>

      {sheet === "booked" && <BookedSheet withWhere onSave={saveBooked} onClose={() => setSheet(undefined)} />}
      {sheet === "update" && <UpdateSheet booked={booked} contact={contact} onAnswer={onAnswer} onClose={() => setSheet(undefined)} />}
      {sheet === "book" && <BookSheet order={o} onClose={() => setSheet(undefined)} />}
    </View>
  )
}

/** The place and what was paid ("Basha Diagnostics, La Jolla. Paid" and
    the partner's price) for a test booked and paid through Inlay;
    "Coastal Imaging, told by you" or "Told by you" for one she booked
    herself; the place alone for one her plan booked. */
function placeAndPaid(b: Booked) {
  if (b.paid) return `${b.where}. Paid ${b.paid}.`
  const told = PROVENANCE_LABEL.patient
  if (!b.told) return b.where
  return b.where ? `${b.where}, ${told.charAt(0).toLowerCase()}${told.slice(1)}` : told
}

/** "Fast for 10 to 12 hours. Water is fine." with a short last sentence
    kept whole, so a wrapped value never ends on a lone word. */
function keepLast(text: string) {
  const end = text.lastIndexOf(". ", text.length - 2)
  if (end < 0) return text
  const last = text.slice(end + 2)
  return last.length <= 16 ? `${text.slice(0, end + 2)}${last.replace(/ /g, "\u00A0")}` : text
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // The words 8 apart, the date pills 12 under them.
  head: { gap: space.item },
  words: { gap: space.inline },
  // The status badge on the left, its tag or the place on the right; on a
  // narrow phone the right side wraps under the badge.
  statusLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: space.inline },
  statusMeta: { ...type.caption, flexShrink: 1, textAlign: "right" },
  fact: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: ink.detail },
  plan: { ...type.label },
  pills: { flexDirection: "row", gap: space.item },
  // The first and last rows' words sit a card's padding from its edge,
  // as its sides do.
  details: { paddingVertical: space.card - space.rowY },
})
