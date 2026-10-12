import type { Href } from "expo-router"

import { GAP_ICON, keepTogether } from "@/components/care-gap"
import type { RecordIconName } from "@/components/record-icons"
import { pickBanner, type BannerFacts, type BannerState, type Hue, type Tone } from "@/components/record-kit"
import { BASELINE_TESTS, REMIND_EVERY_DAYS, lastReminderDay, type BaselineTestId } from "@/lib/baseline-tests"
import { DEFAULT_PERIOD, periodEnd } from "@/lib/consent"
import { dayOfWords } from "@/lib/dates"
import { experience, sharingOff } from "@/lib/experience"
import { NEXT_REVIEW, addDays, clock, dateOfAt, dayFrom, dayLabel, daysBetween, localDay, shortDay, thisWeek, weekdayOf, type SavedQuestion } from "@/lib/member"
import type { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { BASELINE } from "@/lib/program"
import {
  APPOINTMENTS,
  CARE_GAPS,
  MEDICATIONS,
  MEMBER_NOTIFICATIONS,
  NEW_RESULTS,
  NOTIFICATIONS,
  ORDERS,
  ORIGIN_LABEL,
  REVIEW,
  VISITS,
  medDifference,
  type CareGap,
  type Notice,
  type Order,
} from "@/lib/record"
import { timeOf, valueText } from "@/lib/trends"

/* Everything open for the patient, worked out in one place so Home, the To
   do tab and the Record tab count the same things the same way (A-48,
   FINAL-SPEC E.6):

   needs    what needs her now, most urgent first (F-12): orders waiting
            more than six weeks, other overdue items, care gaps to book or
            call about that are being reminded about, medicines her records
            differ on ("Check 2 medicines"), sharing her records ending
   coming   appointments, and tests ordered and not due yet, by date
   visit    for her next visit: care gaps to talk through with Dr. Patel
            and the questions she saved
   booked   tests and visits she booked, until the result arrives
   done     tests whose results came in, and care gaps closed, in the last
            90 days

   An order and the care gap that follows it are one item: the mammogram
   shows once, as the order with the gap's reminders. Home takes the first
   three of a list; To do shows every one; Home's Coming up (comingUp) adds
   the tests she booked and keeps the next 30 days. Words are the
   patient's: "Not booked yet", "Booked", "Overdue" as a tag only, never
   missed or late.

   Dates are local ("2026-10-21T10:30"), the form the record kit reads as a
   local day: a date block, and the order items sort in. The free record's
   dates are fixed; a member's tests and visits this week come from
   lib/member.ts, worked out from today. Hrefs are typed routes as strings,
   ready for router.push. */

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]
type Save = ReturnType<typeof useOnboarding>["save"]

export type TodoGroup = "needs" | "coming" | "visit" | "booked" | "done"

export type TodoItem = {
  /** Unique across lists: "order:mammogram", "gap:follow-up", "meds",
      "sharing", "appointment:cardio-follow-up", "question:q1",
      "new:urgent". */
  id: string
  /** The list it sits in. New in your record items, already in the past,
      say "done"; they sit in `newInRecord`, never in a To do list. */
  group: TodoGroup
  kind: "order" | "gap" | "meds" | "sharing" | "appointment" | "review" | "question" | "visit-outside" | "document"
  icon: RecordIconName
  /** The tile's hue off the hero; rows on the hero are teal. */
  hue: Hue
  /** An action in "needs" ("Book your mammogram"), a name elsewhere. */
  title: string
  /** "Dr. Patel ordered it on Mar 4" */
  meta: string
  /** The local day and time it happens ("2026-10-21T10:30", the form the
      record kit reads as a local day): appointments and booked tests only,
      drawn as a date block. An open order has none, so a due date never
      looks like an appointment. lib/member.ts dateOfAt() reads it back. */
  date?: string
  /** A teal second line: "2 questions saved", a fasting note. */
  note?: string
  /** An exception beside the title: "Overdue" (To do only, never on the
      hero), "Booked", "Outside your clinic". */
  tag?: { tone: Tone; label: string }
  /** The row's one action: a pill that opens a page or dials a number, or
      "Remove" for a saved question (removeQuestion). */
  action?: { label: "Book" | "Schedule" | "Call" | "Check" | "Save" | "Ask" | "Renew" | "Remove"; href?: Href; tel?: string; remove?: string }
  /** What the whole row opens: a typed route, ready for router.push. */
  href: Href
  /** When it happens or is due, local ("2026-11-12T23:59"), for sorting. */
  sortAt: string
}

export type Todo = Record<TodoGroup, TodoItem[]> & {
  /** Outside visits new since the record arrived, unopened, at most 14
      days old: Home's "New in your record" (two at most there). */
  newInRecord: TodoItem[]
  counts: Record<TodoGroup, number>
  /** "3 need you, 4 coming up, 2 for your next visit"; empty when nothing
      is open (the empty state shows). */
  summary: string
}

/** An order waiting this long past its due date leads "Needs you" (F-12). */
const LONG_WAIT_DAYS = 42
/** Booked tests and appointments within this many days join Home's
    "Coming up"; open orders show whatever their due date. */
const COMING_DAYS = 30
/** Results and closed care gaps stay under "Done recently" this long. */
const DONE_DAYS = 90
/** New outside records show on Home this long after they arrive. */
const NEW_DAYS = 14
/** The renewal joins "Needs you" this many days before sharing ends (Q-12). */
const RENEW_DAYS = 30

const pad = (n: number) => String(n).padStart(2, "0")

/** A date as a local day and time, "2026-10-21T10:30": the form TodoItem
    dates and store bookings use. */
export const localIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

const href = (path: string) => path as Href

/** A local day and time back to a date (a bare day at local noon). */
const fromLocal = dateOfAt

/* ------------------------------------------------------------- words -- */

/** "Mar 4" from any date the record writes. */
const short = (date: string) => shortDay(new Date(timeOf(date)))

/** "Dr. Maya Patel" as "Dr. Patel"; "Dr. Lee, Pacific Heart" as "Dr. Lee". */
function doctorShort(by: string) {
  const name = by.split(",")[0].trim()
  const parts = name.split(/\s+/)
  return parts[0] === "Dr." && parts.length > 2 ? `Dr. ${parts[parts.length - 1]}` : name
}

/** "Pacific Heart, La Jolla" as "Pacific Heart". */
const placeShort = (where: string) => where.split(",")[0].trim()

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/* Sample copy for the record's items, where the patient's words differ
   from the record's names. Anything not listed reads from the record. */

/** What to call an order in "Book your ...". */
const BOOK_NAME: Record<string, string> = { mammogram: "mammogram" }

/** A care gap's action on "Needs you", and one line on why it is open. */
const GAP_COPY: Record<string, { act?: string; why?: string }> = {
  "follow-up": { act: "Book a follow up visit", why: "After urgent care on Jun 3" },
  colon: { why: "Advised from age 45" },
}

/** "3 things need you", "1 thing needs you": the Needs you hero's title. */
export const needsTitle = (n: number) => (n === 1 ? "1 thing needs you" : `${n} things need you`)

/** The line under "New in your record" (F-82). */
export const NEW_IN_RECORD_NOTE = "Now in your record. Dr. Patel can see it."

/* ------------------------------------------------------------ orders -- */

/** The order page for an order id. */
export const orderHref = (id: string): Href => href(`/order/${ORDERS.find((o) => o.id === id)?.id ?? id}`)

/** A booking's words ("Fri, Oct 2, 7:30 AM", "Sep 15") as a date, in the
    year that puts it nearest today. */
const parseWhen = (when: string, now: Date) => dayOfWords(when, now, "nearest")

/** A day at "10:30 AM". */
function atTime(day: Date, time?: string) {
  const m = time && /(\d{1,2}):(\d{2})\s*(AM|PM)/.exec(time)
  if (!m) return day
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), (Number(m[1]) % 12) + (m[3] === "PM" ? 12 : 0), Number(m[2]))
}

/** A booking as every screen reads it: the day (with its time when there
    is one), where, how to prepare, what was paid through Inlay, and who
    booked it: her plan's setup (`plan`, a starting test), Inlay (paid), or
    she herself, telling us the day (`told`). */
export type Booked = { date: Date; time?: string; where?: string; prep?: string; paid?: string; plan?: boolean; told: boolean }

/** The plan's starting tests (lib/program.ts BASELINE, or the baseline
    tests paid in the set-up, lib/baseline-tests.ts), booked through her
    plan rather than by her. */
const isStartingTest = (id: string) => BASELINE.missing.some((t) => t.id === id) || id in BASELINE_TESTS

/** The page that books or moves one of the set-up's paid tests. */
export const scheduleHref = (id: string) => href(`/schedule-tests?test=${id}`)

/** The one reader of a booking, for a test the doctor ordered, a plan's
    starting test or the visit a care gap asks for: To do, Home's Coming
    up, the member's This week, the test's page, the care gap's page and
    booking with a partner all ask here, and nothing else reads the store's
    `bookings` or `booked`. In order: a member's tests this week as her plan
    has them (lib/member.ts thisWeek), with what she paid; a test booked
    through Inlay, paid, or through her plan; a day she told us (`booked`). */
export function bookingOf(id: string, s: Snapshot, now: Date = new Date()): Booked | undefined {
  const stored = s.bookings?.[id]
  if (experience(s) === "member") {
    const week = thisWeek(s, now).find((i) => i.kind === "test" && (i.orders ?? []).includes(id))
    if (week) return { date: atTime(week.date, week.time), time: week.time, where: week.where, prep: week.prep, paid: stored?.price || undefined, told: false }
  }
  if (stored) {
    const day = stored.at ? dateOfAt(stored.at) : parseWhen(stored.when, now)
    if (day) {
      const timed = !!stored.at && stored.at.length > 10
      const date = timed ? day : atTime(day, stored.time)
      const plan = isStartingTest(id)
      return {
        date,
        time: stored.time ?? (timed ? clock(date.getHours(), date.getMinutes()) : undefined),
        where: stored.where || undefined,
        paid: stored.price || undefined,
        plan,
        told: !stored.price && !plan,
      }
    }
  }
  const told = s.booked?.[id]
  return told ? { date: dateOfAt(told), told: true } : undefined
}

/** A booking whose day has gone by: the test was done, or the visit
    happened, and the record has not caught up yet. */
export const bookingPast = (b: Pick<Booked, "date">, now: Date = new Date()) => daysBetween(b.date, now) > 0

/** The day an order's results came in with a batch of new results: a
    batch dated after the order that holds every marker it measures
    (lib/record.ts NEW_RESULTS). Quest's new draw on /demo/free-new-results
    is the repeat A1c and lipid panel. */
function resultsArrived(o: Order, s: Snapshot): Date | undefined {
  const markers = o.markers
  if (!markers?.length) return undefined
  const ordered = timeOf(o.orderedAt)
  const batch = (s.batches ?? [])
    .filter((b) => Date.parse(b.at) > ordered && markers.every((m) => NEW_RESULTS[b.id]?.values.some((v) => v.marker === m)))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0]
  return batch ? new Date(batch.at) : undefined
}

/** A care gap that follows an order is that order's reminders, not an item
    of its own. */
const followsOrder = (g: CareGap) => g.kind === "order" && ORDERS.some((o) => o.id === g.id)

/** "Tue, Oct 6, 7:30 AM" or "Tue, Oct 6". */
const whenWords = (b: Booked) => (b.time ? `${dayLabel(b.date)}, ${b.time}` : dayLabel(b.date))

/** How an order's state is marked (C.0.4): neutral and attention are a
    filled dot (grey, then clay once overdue), booked a teal dot, waiting a
    teal ring (done or done elsewhere, the result on its way), done a green
    check. */
export type OrderTone = "neutral" | "attention" | "booked" | "waiting" | "done"

/** Where an order stands, in the patient's words (F-48), with its tone:
    "Not booked yet" (neutral before it is due, attention once overdue),
    "Booked for Wed, Oct 7, 10:15 AM", "Done, waiting for results" once the
    booked day has passed, "Waiting for the result" after she said it was
    done somewhere else, "Waiting for Dr. Patel to confirm" after she said
    her doctor said she does not need it (Q-22), and "Results in" once a
    result reaches the record (`on`, the day it did). */
export function orderStatus(o: Order, s: Snapshot, now: Date = new Date()): { word: string; tone: OrderTone; on?: Date } {
  const arrived = resultsArrived(o, s)
  if (o.state === "done" || o.completed || arrived) return { word: "Results in", tone: "done", on: arrived ?? (o.completed ? new Date(timeOf(o.completed)) : undefined) }
  const answer = s.testAnswers?.[o.id]?.answer
  if (answer === "elsewhere") return { word: "Waiting for the result", tone: "waiting" }
  if (answer === "not-needed") return { word: "Waiting for Dr. Patel to confirm", tone: "neutral" }
  const b = bookingOf(o.id, s, now)
  if (b) return bookingPast(b, now) ? { word: "Done, waiting for results", tone: "waiting" } : { word: `Booked for ${whenWords(b)}`, tone: "booked" }
  const overdue = o.state === "overdue" || daysBetween(dayFrom(o.dueAt), now) > 0
  return { word: "Not booked yet", tone: overdue ? "attention" : "neutral" }
}

/* ------------------------------------------------------- medicines -- */

export type MedicineRow = {
  id: string
  name: string
  /** The doctor's line, or the other list with its source: "10 mg once a
      day, Scripps Memorial". */
  meta: string
  /** Her lists differ and she has not said what she takes. */
  differs: boolean
}

/** Her medicines as Home and the Record tab count them: everything still
    on a list (5), the prescribed ones her records differ on with no answer
    from her yet (2), up to `rows` prescribed medicines with those first,
    and the supplements in one line. Once she answers for a medicine its
    mark goes: Dr. Patel settles the difference. */
export function yourMedicines(s: Snapshot, rows = 3) {
  const current = MEDICATIONS.filter((m) => !m.resolved)
  const doctor = doctorShort(REVIEW.by)
  const medicines = current
    .filter((m) => m.kind === "medicine")
    .map((m): MedicineRow => {
      const line = m.lists.find((l) => l.origin === "doctor") ?? m.lists[0]
      const from = line.origin === "doctor" ? doctor : ORIGIN_LABEL[line.origin]
      return { id: m.id, name: m.name, meta: `${line.dose}, ${from}`, differs: Boolean(medDifference(m)) && !s.meds?.[m.id] }
    })
    .sort((a, b) => Number(b.differs) - Number(a.differs))
  const toCheck = medicines.filter((m) => m.differs).length
  const supplements = current.filter((m) => m.kind === "supplement").map((m) => m.name)
  return {
    /** Everything still on her lists: 5. */
    total: current.length,
    toCheck,
    rows: medicines.slice(0, rows),
    /** Prescribed medicines beyond `rows`. */
    more: Math.max(0, medicines.length - rows),
    /** "Supplements: Vitamin D3, Fish oil" */
    supplements: supplements.length ? `Supplements: ${supplements.join(", ")}` : undefined,
    /** "5 on your lists, 2 to check" */
    line: `${current.length} on your lists${toCheck ? `, ${toCheck} to check` : ""}`,
  }
}

/* ------------------------------------------------------------- lists -- */

const endOfDay = (d: Date) => localIso(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59))

/** A booked test as a row: a date block for its day, "Booked" beside the
    name, and the time and place (or that she told us the day, which the
    block already shows), with how to prepare. Once the day has gone by it
    is done and waits for its result, as its page says, so it leaves Coming
    up and This week (comingUp, weekItems) and drops "Booked". */
function bookedTest(id: string, title: string, b: Booked, page: Href, now: Date): TodoItem {
  const past = bookingPast(b, now)
  return {
    id,
    group: "booked",
    kind: "order",
    icon: "labs",
    hue: "teal",
    title,
    meta: past ? "Done, waiting for results" : b.where ? [b.time, b.where].filter(Boolean).join(", ") : b.told ? "Told by you" : `Booked for ${whenWords(b)}`,
    date: localIso(b.date),
    note: past ? undefined : b.prep,
    tag: past ? undefined : { tone: "primary", label: "Booked" },
    href: page,
    sortAt: localIso(b.date),
  }
}

/** "1 question saved", "2 questions saved" */
const savedNote = (n: number) => (n ? `${n} ${n === 1 ? "question" : "questions"} saved` : undefined)

/** Everything open for the patient, in its groups, with the counts. Every
    count on Home, To do and Record comes from here. */
export function todo(s: Snapshot, now: Date = new Date()): Todo {
  const exp = experience(s)
  const live = exp === "member"
  const needs: (TodoItem & { rank: number })[] = []
  const coming: TodoItem[] = []
  const visit: TodoItem[] = []
  const booked: TodoItem[] = []
  const done: TodoItem[] = []

  /* Orders, each with the care gap that follows it. */
  for (const o of ORDERS) {
    const id = `order:${o.id}`
    const page = orderHref(o.id)
    const due = dayFrom(o.dueAt)
    const arrived = resultsArrived(o, s)
    if (o.state === "done" || arrived) {
      const completed = arrived ?? (o.completed ? new Date(timeOf(o.completed)) : undefined)
      if (completed && daysBetween(completed, now) <= DONE_DAYS)
        done.push({ id, group: "done", kind: "order", icon: "labs", hue: "green", title: o.name, meta: `Results in, ${shortDay(completed)}`, href: page, sortAt: localIso(completed) })
      continue
    }
    // Done somewhere else, or not needed by her doctor's word (Q-22): it
    // waits for the result, or for Dr. Patel, out of Needs you.
    const answer = s.testAnswers?.[o.id]
    if (answer) {
      booked.push({
        id,
        group: "booked",
        kind: "order",
        icon: "labs",
        hue: "teal",
        title: o.name,
        meta: answer.answer === "elsewhere" ? "Done somewhere else. Waiting for the result" : "Waiting for Dr. Patel to confirm",
        href: page,
        sortAt: localIso(dateOfAt(answer.at)),
      })
      continue
    }
    const b = bookingOf(o.id, s, now)
    if (b) {
      booked.push(bookedTest(id, o.name, b, page, now))
      continue
    }
    const late = daysBetween(due, now)
    if (late > 0 || o.state === "overdue") {
      needs.push({
        id,
        group: "needs",
        kind: "order",
        icon: "labs",
        hue: "teal",
        title: `Book your ${BOOK_NAME[o.id] ?? lowerFirst(o.name)}`,
        meta: `${doctorShort(o.by)} ordered it on ${short(o.ordered)}`,
        tag: { tone: "low", label: "Overdue" },
        action: { label: "Book", href: page },
        href: page,
        sortAt: endOfDay(due),
        rank: late > LONG_WAIT_DAYS ? 1 : 2,
      })
      continue
    }
    coming.push({
      id,
      group: "coming",
      kind: "order",
      icon: "labs",
      // Calm grey: nothing has happened yet (C.0.3), unlike the outside
      // visits in blue under it on Home.
      hue: "neutral",
      title: o.name,
      meta: `Not booked yet. Due by ${short(o.due)}${o.at ? ` at ${placeShort(o.at)}` : ""}`,
      href: page,
      sortAt: endOfDay(due),
    })
  }

  /* The plan's starting tests, booked through her plan (C.27): booked, like an order booked through Inlay, until the
     result arrives. To do, Home's Coming up and This week read them from
     here; they have no page of their own (opensPage). */
  /* The baseline tests paid in the plan's set-up (/payment): each booked
     opens its schedule page to move it; one not booked yet needs her, with
     a reminder every other day from the day she chose to schedule later. */
  const paid = s.startingTests
  if (paid) {
    const since = dateOfAt(paid.laterAt ?? paid.at)
    const reminded = lastReminderDay(since, now)
    for (const id of paid.ids) {
      const t = BASELINE_TESTS[id as BaselineTestId]
      if (!t) continue
      const page = scheduleHref(t.id)
      const b = bookingOf(t.id, s, now)
      if (b) {
        booked.push(bookedTest(`test:${t.id}`, t.name, b, page, now))
        continue
      }
      needs.push({
        id: `test:${t.id}`,
        group: "needs",
        kind: "order",
        icon: "labs",
        hue: "teal",
        title: `Schedule your ${t.name}`,
        meta: `Paid with your plan. Reminder every ${REMIND_EVERY_DAYS === 2 ? "other day" : `${REMIND_EVERY_DAYS} days`}`,
        action: { label: "Schedule", href: page },
        href: page,
        sortAt: localIso(reminded),
        rank: 2,
      })
    }
  } else
    for (const t of BASELINE.missing) {
      const b = bookingOf(t.id, s, now)
      if (b) booked.push(bookedTest(`test:${t.id}`, t.name, b, href("/gaps"), now))
    }

  /* Care gaps that are not an order's reminders. */
  for (const g of CARE_GAPS) {
    if (followsOrder(g)) continue
    const copy = GAP_COPY[g.id] ?? {}
    const id = `gap:${g.id}`
    const page = href(`/task/${g.id}`)
    const doneAt = s.gapsDone?.[g.id]
    if (doneAt) {
      const when = dateOfAt(doneAt)
      if (daysBetween(when, now) <= DONE_DAYS)
        done.push({ id, group: "done", kind: "gap", icon: GAP_ICON[g.kind], hue: "green", title: g.title, meta: `Done, ${shortDay(when)}`, href: page, sortAt: localIso(when) })
      continue
    }
    const visitBooked = bookingOf(g.id, s, now)
    if (visitBooked) {
      const when = visitBooked.date
      booked.push({
        id,
        group: "booked",
        kind: "gap",
        icon: GAP_ICON[g.kind],
        hue: "teal",
        title: g.id === "follow-up" ? "Follow up visit" : g.title,
        // The date block and the tag already say when and that it is
        // booked; the line says who booked it (S-13). A day gone by is no
        // longer "Booked": it waits for the visit to reach her record.
        meta: "Told by you",
        date: localIso(when),
        tag: bookingPast(visitBooked, now) ? undefined : { tone: "primary", label: "Booked" },
        href: page,
        sortAt: localIso(when),
      })
      continue
    }
    const why = copy.why ?? gapWhy(g)
    const reminder = g.reminders ? `Reminder ${g.reminders} of 3` : undefined
    if (g.action !== "talk" && g.reminders > 0) {
      needs.push({
        id,
        group: "needs",
        kind: "gap",
        icon: GAP_ICON[g.kind],
        hue: "teal",
        title: copy.act ?? g.title,
        meta: [why, reminder].filter(Boolean).join(". "),
        action: g.action === "call" ? { label: "Call", tel: PATIENT.practicePhone } : { label: "Book", href: page },
        href: page,
        sortAt: lastReminder(g, now),
        rank: 3,
      })
      continue
    }
    visit.push({
      id,
      group: "visit",
      kind: "gap",
      icon: GAP_ICON[g.kind],
      hue: "violet",
      title: g.title,
      meta: [why, reminder].filter(Boolean).join(". "),
      href: page,
      sortAt: lastReminder(g, now),
    })
  }

  /* Medicines her records differ on: one item. */
  const meds = yourMedicines(s)
  if (meds?.toCheck)
    needs.push({
      id: "meds",
      group: "needs",
      kind: "meds",
      icon: "medications",
      hue: "teal",
      title: `Check ${meds.toCheck} ${meds.toCheck === 1 ? "medicine" : "medicines"}`,
      // "differ on 2" held as one, so a narrow phone wraps "Your records /
      // differ on 2", never leaving "on 2" alone.
      meta: `Your records differ on ${meds.toCheck}`,
      action: { label: "Check", href: href("/medications") },
      href: href("/medications"),
      sortAt: localIso(new Date(now.getFullYear(), now.getMonth(), now.getDate())),
      rank: 4,
    })

  /* Renewing the permission to share her records. */
  const ends = sharingEnds(s)
  if (ends && daysBetween(now, ends) <= RENEW_DAYS)
    needs.push({
      id: "sharing",
      group: "needs",
      kind: "sharing",
      icon: "documents",
      hue: "teal",
      title: "Renew sharing your records",
      meta: daysBetween(now, ends) < 0 ? `Sharing ended on ${shortDay(ends)}` : `Sharing ends on ${shortDay(ends)}`,
      action: { label: "Renew", href: href("/access?sheet=renew") },
      href: href("/access?sheet=renew"),
      sortAt: localIso(ends),
      rank: 5,
    })

  /* Appointments from the practice's schedule, with the questions saved
     for each (one not tied to a visit goes to the next one). */
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const appts = appointments(s, now, live).filter((a) => a.date.getTime() >= today.getTime())
  const questions = s.questions ?? []
  const nextVisit = appts.find((a) => !a.review)
  // Only the next two appointments are listed as coming up.
  for (const a of appts.slice(0, 2)) {
    const saved = questions.filter((q) => q.for === a.id || (!q.for && a === nextVisit)).length
    coming.push({
      id: `appointment:${a.id}`,
      group: "coming",
      kind: a.review ? "review" : "appointment",
      icon: a.review ? "clinic" : "visits",
      hue: "teal",
      title: a.title,
      meta: a.meta,
      date: localIso(a.date),
      note: savedNote(saved),
      href: a.href,
      sortAt: localIso(a.date),
    })
  }

  /* The questions she saved for her visits. */
  for (const q of questions) visit.push(questionItem(q, appts))

  needs.sort((a, b) => a.rank - b.rank || a.sortAt.localeCompare(b.sortAt))
  const bySort = (a: TodoItem, b: TodoItem) => a.sortAt.localeCompare(b.sortAt)
  coming.sort(bySort)
  booked.sort(bySort)
  done.sort((a, b) => b.sortAt.localeCompare(a.sortAt))
  const counts = { needs: needs.length, coming: coming.length, visit: visit.length, booked: booked.length, done: done.length }
  // Every row wraps cleanly wherever it is shown: names, dates, times,
  // places and "Reminder 2 of 3" held whole, no line left with one word.
  const placed = <T extends TodoItem>(list: T[]) => list.map((item) => ({ ...item, title: keepTogether(item.title), meta: keepTogether(item.meta) }))
  return {
    needs: placed(needs.map(({ rank: _rank, ...item }) => item)),
    coming: placed(coming),
    visit: placed(visit),
    booked: placed(booked),
    done: placed(done),
    newInRecord: placed(newOutside(s, now)),
    counts,
    summary: summaryOf(counts),
  }
}

/** "3 need you, 4 coming up, 2 for your next visit", leaving out the
    groups with nothing in them; empty when all three are. Each part is
    held whole, so a narrow phone wraps the line only after a comma. */
export function summaryOf(counts: Pick<Record<TodoGroup, number>, "needs" | "coming" | "visit">): string {
  return [
    counts.needs ? `${counts.needs} ${counts.needs === 1 ? "needs" : "need"} you` : "",
    counts.coming ? `${counts.coming} coming up` : "",
    counts.visit ? `${counts.visit} for your next visit` : "",
  ]
    .filter(Boolean)
    .map((part) => part.replace(/ /g, " "))
    .join(", ")
}

/** The set-up's paid tests in a few words: "First on Tue, Oct 13, then 2
    more" once all are booked; left for later, that they wait in To do;
    else that they are next. */
export function startingTestsLine(s: Snapshot, now: Date = new Date()): { booked: boolean; line: string } {
  const ids = (s.startingTests?.ids ?? []).filter((id) => id in BASELINE_TESTS)
  const dates = ids.map((id) => bookingOf(id, s, now)?.date)
  if (!ids.length || dates.some((d) => !d))
    return { booked: false, line: s.startingTests?.laterAt ? "In To do, reminders every other day" : "Next up, pick a day and time" }
  const first = Math.min(...dates.map((d) => d!.getTime()))
  const more = ids.length - 1
  return { booked: true, line: `First on ${dayLabel(new Date(first))}${more ? `, then ${more} more` : ""}` }
}

/** Whether a row has a page of its own to open. A plan's starting test
    and a question saved for no visit have none (their `href` is the To do
    list itself): the row is all there is, so it is not a button. */
export const opensPage = (item: Pick<TodoItem, "href">) => String(item.href) !== "/gaps"

/** When a care gap was last brought up, for sorting. */
function lastReminder(g: CareGap, now: Date) {
  const last = g.sent[g.sent.length - 1]
  return localIso((last && parseWhen(last, now)) || now)
}

/** Why a care gap is open, in a few words, from the record. */
function gapWhy(g: CareGap): string | undefined {
  return g.why.split(". ")[0].replace(/\.$/, "")
}

type Visit = { id: string; title: string; date: Date; meta: string; href: Href; review?: boolean }

/** Appointments on her calendar: the cardiology follow up and Dr. Patel's
    record review. A member's follow up falls this week, as her plan's
    week has it (lib/member.ts). */
function appointments(s: Snapshot, now: Date, live: boolean): Visit[] {
  const week = live ? thisWeek(s, now) : []
  return APPOINTMENTS.map((a): Visit => {
    const review = a.kind === "review"
    const planned = week.find((i) => i.kind === "visit" && i.id === a.id)
    if (planned) return { id: a.id, title: a.name, date: atTime(planned.date, planned.time), meta: `${planned.time}, ${planned.where}`, href: href(`/visit/${a.id}`) }
    const date = review && live ? atTime(dayFrom(NEXT_REVIEW.at), clock(9)) : fromLocal(a.at)
    return {
      id: a.id,
      title: a.name,
      date,
      meta: review ? "No visit needed" : `${weekdayOf(date)}, ${clock(date.getHours(), date.getMinutes())}, ${a.with}, ${placeShort(a.place)}`,
      href: href(`/visit/${a.id}`),
      review,
    }
  })
}

function questionItem(q: SavedQuestion, appts: Visit[]): TodoItem {
  const forVisit = q.for ? appts.find((a) => a.id === q.for) : undefined
  const at = dateOfAt(q.at)
  return {
    id: `question:${q.id}`,
    group: "visit",
    kind: "question",
    icon: "documents",
    hue: "teal",
    title: q.text,
    meta: forVisit ? `For your ${lowerFirst(forVisit.title)}` : `Saved ${shortDay(at)}`,
    action: { label: "Remove", remove: q.id },
    href: forVisit ? forVisit.href : href("/gaps"),
    sortAt: localIso(at),
  }
}

/** When the record came together: new outside records count from here
    (the onboarding day for the first pull). */
function recordArrived(s: Snapshot): Date | undefined {
  const at = s.records?.at ?? s.consentAt
  return at ? new Date(at) : undefined
}

/** Both outside visits arrive with the record, so they keep the order of
    the places they came from: the hospital first, then the specialist. */
const SOURCE_ORDER: Record<string, number> = { hospital: 0, report: 1, you: 2, lab: 3, doctor: 4 }

/** Visits outside her clinic that came in with the record or since, each
    shown until she opens it (seen "visit:<id>") or for 14 days. */
function newOutside(s: Snapshot, now: Date): TodoItem[] {
  const arrived = recordArrived(s)
  if (!arrived || daysBetween(arrived, now) > NEW_DAYS) return []
  const seen = new Set(s.seen ?? [])
  return VISITS.filter((v) => v.outside && !seen.has(`visit:${v.id}`))
    .sort((a, b) => (SOURCE_ORDER[a.origin] ?? 9) - (SOURCE_ORDER[b.origin] ?? 9))
    .map((v): TodoItem => {
      const date = new Date(timeOf(v.date))
      return {
        id: `new:${v.id}`,
        group: "done",
        kind: "visit-outside",
        icon: "visits",
        hue: "blue",
        title: v.name,
        meta: `${v.where}, ${shortDay(date)}`,
        tag: { tone: "muted", label: "Outside your clinic" },
        href: href(`/visit/${v.id}`),
        sortAt: localIso(date),
      }
    })
}

/** Opening an item from "New in your record" takes it off Home. */
export function markSeen(s: Snapshot, save: Save, item: Pick<TodoItem, "id">) {
  const key = item.id.replace(/^new:/, "visit:")
  const seen = s.seen ?? []
  return seen.includes(key) ? Promise.resolve() : save({ seen: [...seen, key] })
}

/** Removes a saved question (the "Remove" action). */
export function removeQuestion(s: Snapshot, save: Save, id: string) {
  return save({ questions: (s.questions ?? []).filter((q) => q.id !== id) })
}

/* ---------------------------------------------------- home sections -- */

/** Home's "Needs you", most urgent first; the hero shows the first three. */
export const needsYou = (s: Snapshot, now: Date = new Date()) => todo(s, now).needs

/** Home's "Coming up": tests booked and appointments in the next 30 days,
    and tests ordered that are not due yet, by date. The record review and
    anything further off stay in To do. */
export function comingUp(s: Snapshot, now: Date = new Date()): TodoItem[] {
  const t = todo(s, now)
  // Ahead of her and within 30 days: a booking whose day has passed waits
  // for its result on To do, never under Coming up.
  const soon = (i: TodoItem) => {
    if (!i.date) return true
    const days = daysBetween(now, fromLocal(i.date))
    return days >= 0 && days <= COMING_DAYS
  }
  return [...t.booked.filter((i) => i.date && soon(i)), ...t.coming.filter(soon)].sort((a, b) => a.sortAt.localeCompare(b.sortAt))
}

/** Home's "New in your record": at most two outside visits. */
export const newInRecord = (s: Snapshot, now: Date = new Date()) => todo(s, now).newInRecord.slice(0, 2)

/** The card in place of the Needs you hero when nothing needs her: "You're
    all caught up", and the next thing coming, "Next: Screening mammogram,
    Wed, Oct 7", which opens it. */
export function caughtUp(s: Snapshot, now: Date = new Date()) {
  const next = comingUp(s, now)[0]
  const when = next?.date ? dayLabel(fromLocal(next.date)) : undefined
  return {
    title: "You're all caught up",
    meta: next ? `Next: ${next.title}${when ? `, ${when}` : ""}` : undefined,
    href: next?.href,
  }
}

/** A member's "This week": tests booked and appointments in the next seven
    days, then at most one thing that needs her (catalog 3.2). Empty when
    nothing is booked and nothing needs her. */
export function weekItems(s: Snapshot, now: Date = new Date()): TodoItem[] {
  const t = todo(s, now)
  const inWeek = (i: TodoItem) => Boolean(i.date) && daysBetween(now, fromLocal(i.date!)) >= 0 && daysBetween(now, fromLocal(i.date!)) <= 7
  const dated = [...t.booked.filter(inWeek), ...t.coming.filter((i) => i.kind === "appointment" && inWeek(i))].sort((a, b) => a.sortAt.localeCompare(b.sortAt))
  const need = t.needs[0]
  if (!need) return dated
  // On this week's list an order says where it stands, not who ordered it,
  // on the calm grey of an open test (C.0.3), as Coming up draws one.
  const order = need.kind === "order" ? ORDERS.find((o) => need.id === `order:${o.id}`) : undefined
  return [...dated, order ? { ...need, hue: "neutral", meta: keepTogether(`Not booked yet. Ordered ${short(order.ordered)}`), tag: undefined } : need]
}

/* ----------------------------------------------------------- banner -- */

/** The day her permission to share records ends, while it is on. */
export function sharingEnds(s: Snapshot): Date | undefined {
  if (s.consent !== "signed" || !s.consentAt) return undefined
  return periodEnd(s.consentPeriod ?? DEFAULT_PERIOD, new Date(s.consentAt))
}

/** Sharing turned off, in the older form some screens still read (`on`,
    "Oct 3"); homeBanner now returns the record kit's own state,
    `{ kind: "sharing-off", since: "Oct 3" }`. */
export type SharingOffState = { kind: "sharing-off"; on?: string }

/** A home banner: one of the record kit's states (ReviewBanner draws it,
    sharing turned off included). */
export type HomeBanner = BannerState | SharingOffState

/** What the store knows that the status banner can say; pickBanner in the
    record kit chooses the one to show, sharing turned off first. The
    doctor's review reads as checking until the portal marks it done. */
export function bannerFacts(s: Snapshot, now: Date = new Date()): BannerFacts {
  const records = s.records
  const building = records?.status === "building"
  const review = s.review ?? (s.consent === "signed" && !building ? { status: "checking" as const } : undefined)
  const fresh = (s.batches ?? [])
    .filter((b) => !b.opened && daysBetween(new Date(b.at), now) <= NEW_DAYS)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]
  return {
    sharingOff: sharingOff(s) ? (s.sharingOffAt ?? null) : null,
    review: review ? { by: "Dr. Patel", done: review.status === "checked" ? (review.at ?? null) : null } : null,
    newResults: fresh ? { count: fresh.count, from: fresh.source, on: new Date(fresh.at), batch: fresh.id } : null,
    sharingEnds: sharingEnds(s) ?? null,
    arriving: building ? { got: records?.got ?? 0, of: records?.of ?? 3 } : null,
    notFound: records?.notFound ?? null,
    today: now,
  }
}

/** The one status banner for a home, or null. Sharing turned off comes
    first, on every tab, even when the store never kept the day ("You
    turned off sharing"). A member's home shows only sharing and new
    results: the check of a newly built record belongs to the free
    record's first weeks, and her plan line already says when a version is
    with Dr. Patel. */
export function homeBanner(s: Snapshot, opts: { member?: boolean } = {}, now: Date = new Date()): HomeBanner | null {
  const off = sharingOff(s)
  if (off) return { kind: "sharing-off", since: off.on ?? "" }
  const state = pickBanner(bannerFacts(s, now))
  // "Dr. Patel is checking your new record" only informs, and the user took
  // it off the home (5 Oct 2026); the review still shows in the record.
  // "Dr. Patel checked your record on Oct 5" went the same way (7 Oct 2026).
  if (!state || state.kind === "checking" || state.kind === "checked") return null
  if (opts.member && state.kind !== "sharing-ended" && state.kind !== "sharing-ends" && state.kind !== "new-results") return null
  return state
}

/** Where tapping a banner goes: a page, a tab (open it with openTab), or
    nothing for one that only informs (the check under way, records
    arriving). */
export function bannerTarget(b: HomeBanner): { href: Href } | { tab: "results" | "plan" } | undefined {
  switch (b.kind) {
    case "sharing-off":
      return { href: href("/connect") }
    case "sharing-ended":
    case "sharing-ends":
      return { href: href("/access?sheet=renew") }
    case "not-found":
      return { href: href("/tell-us") }
    case "new-results":
    case "checked":
      return { tab: "results" }
    case "plan-review":
      return { tab: "plan" }
    default:
      return undefined
  }
}

/* ---------------------------------------------------- notifications -- */

export type { Notice }

/** "Today", "Yesterday" or "Earlier", the notification's day group. */
function dayGroup(at: string, now: Date): Notice["day"] {
  const days = daysBetween(fromLocal(at), now)
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : "Earlier"
}

/** "8:47 AM" today, "Yesterday", or "Sep 29". */
function whenOf(at: string, now: Date) {
  const d = fromLocal(at)
  const days = daysBetween(d, now)
  return days <= 0 ? clock(d.getHours(), d.getMinutes()) : days === 1 ? "Yesterday" : shortDay(d)
}

/** The free record's notifications, the first two dated from the day her
    record came together. */
function freeNotices(s: Snapshot): Notice[] {
  const arrived = recordArrived(s)
  if (!arrived) return NOTIFICATIONS
  const on = (h: number, m: number) => localIso(new Date(arrived.getFullYear(), arrived.getMonth(), arrived.getDate(), h, m))
  return NOTIFICATIONS.map((n) => (n.id === "n1" ? { ...n, at: on(8, 47) } : n.id === "n2" ? { ...n, at: on(8, 50) } : n))
}

/** A member's notifications: her plan tests booked a week ago, her plan's
    approval, the results and reminders she had. In the app only; a push
    never carries health details or an offer (F-106, F-109). */
function memberNotices(s: Snapshot, now: Date): Notice[] {
  const labs = thisWeek(s, now).find((i) => i.kind === "test")
  const bookedOn = addDays(now, -7)
  const booked: Notice[] = labs
    ? [
        {
          id: "m-tests-booked",
          kind: "reminder",
          title: "Your tests are booked",
          body: `${labs.title}, ${labs.when}.`,
          at: localIso(new Date(bookedOn.getFullYear(), bookedOn.getMonth(), bookedOn.getDate(), 9, 12)),
          when: "",
          day: "Earlier",
          href: String(orderHref("labs-nov")),
        },
      ]
    : []
  return [...booked, ...MEMBER_NOTIFICATIONS]
}

/** Paid tests left to schedule later: the latest of the reminders sent
    every other day from the day she chose later, until all are booked. */
function scheduleNotices(s: Snapshot, now: Date): Notice[] {
  const paid = s.startingTests
  if (!paid?.laterAt) return []
  const open = paid.ids.filter((id) => id in BASELINE_TESTS && !bookingOf(id, s, now))
  if (!open.length) return []
  const day = lastReminderDay(dateOfAt(paid.laterAt), now)
  const first = BASELINE_TESTS[open[0] as BaselineTestId]
  return [
    {
      id: `schedule-tests:${localDay(day)}`,
      kind: "reminder",
      title: open.length === 1 ? "Schedule your test" : "Schedule your tests",
      body: open.length === 1 ? `${first.name} is paid with your plan. Pick a day and time.` : `${open.length} tests are paid with your plan. Pick a day and time for each.`,
      at: localIso(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0)),
      when: "",
      day: "Earlier",
      href: open.length === 1 ? String(scheduleHref(first.id)) : "/gaps",
    },
  ]
}

/** New results that reached the record after it was built, one notice a
    batch, opening the batch's own view: the in app twin of the push "New
    results are in your record." */
function batchNotices(s: Snapshot): Notice[] {
  return (s.batches ?? []).map((b) => ({
    id: `batch:${b.id}`,
    kind: "result",
    title: "New lab results",
    body: `${b.count} ${b.count === 1 ? "result" : "results"} from ${b.source} ${b.count === 1 ? "is" : "are"} in your record.`,
    at: localIso(new Date(b.at)),
    when: "",
    day: "Earlier",
    href: "/results",
  }))
}

/** The notifications this patient has, newest first: a member's own (a
    live or paused plan), the free record's otherwise, with any new results
    since. `day` and `when` follow
    `at`. */
export function noticesFor(s: Snapshot, now: Date = new Date()): Notice[] {
  const exp = experience(s)
  const list = [...(exp === "member" || exp === "paused" ? memberNotices(s, now) : freeNotices(s)), ...batchNotices(s), ...scheduleNotices(s, now)]
  return list.map((n) => ({ ...n, day: dayGroup(n.at, now), when: whenOf(n.at, now) })).sort((a, b) => b.at.localeCompare(a.at))
}

/** How many she has not opened: the bell's count. */
export function unreadCount(s: Snapshot, now: Date = new Date()) {
  const seen = new Set(s.seen ?? [])
  return noticesFor(s, now).filter((n) => !seen.has(n.id)).length
}
