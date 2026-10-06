import { addDays, clockOf, dayLabel, dayScore, localDay, mealsOn, membershipOn, profileOf, sinceStart, thisWeek, today as todayOf, totalsOf, type Meal } from "@/lib/member"
import type { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { FREE_STAYS, TIERS } from "@/lib/plans"
import { APPOINTMENTS, CARE_GAPS, DOCUMENTS, MARKER_CARE, MEDICATIONS, NEW_RESULTS, ORDERS, PROBLEMS, PROCEDURES, VISITS, medDifference, type Biomarker, type Medication, type Origin, type Point } from "@/lib/record"
import { byBodySystem, classify, monthYear, pointDate, pointStatus, questionsOf, valueText, watchList, withUnit, type Status, type Trend } from "@/lib/trends"

/* The assistant's script for the prototype (no model behind it yet), from
   FINAL-SPEC C.4: what it says when it opens, the questions it suggests
   about one result, and every answer, built from the patient's own record.

   Every substantive answer has one shape (S-34, S-38): the direct answer in
   two or three sentences; then, folded, what the record shows, what it
   doesn't tell us and the question to take to Dr. Patel; a confidence line;
   and the facts behind it for "Why Inlay said this". It says "the record
   shows", never "you have"; it never diagnoses, never judges a dose and
   never sells inside an answer. Anything urgent goes to a person first.

   The copy for A1c is the spec's final copy; other markers get the same
   answers in their own words from the same data. Clinical review comes
   before patients see any of it. Counting the free questions lives in
   lib/allowance.ts. */

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]

/* ------------------------------------------------------------ opening -- */

/** Once per thread, under the day: the chat is not watched live (S-35, L-32). */
export const SAFETY_LINE = "Your care team doesn't watch this chat in real time. In an emergency, call 911."

/** Once per conversation, after its first answer. */
export const FOOTER_LINE = "This is educational and based on your record. Dr. Patel can confirm what applies to you."

export const TOPICS = {
  plan: "Help with today's plan",
  result: "Explain one of my results",
  visit: "Prepare for my next visit",
  medicine: "A question about my medicines",
  concern: "Something is bothering me",
} as const

export type Topic = keyof typeof TOPICS

/** The opening's options, in order: a member with a live plan gets help
    with today's plan first. */
export const topicsFor = (planLive: boolean): Topic[] => (planLive ? ["plan", "result", "visit", "medicine", "concern"] : ["result", "visit", "medicine", "concern"])

/** `?topic=` as the links write it. */
export const TOPIC_PARAM: Record<string, Topic> = { results: "result", visit: "visit", medicines: "medicine", concern: "concern", plan: "plan" }

/** The first thing the assistant says, opened from the orb: a member's
    plan first; while the record arrives, what it can't know yet; with
    sharing off, the day the record stopped (C.28). */
export function greeting(name: string, planLive: boolean, opts: { building?: boolean; asOf?: string } = {}) {
  if (planLive) return `Hi ${name}. Ask me about your plan, your results or your day.`
  if (opts.building) return `Hi ${name}, I'm your Inlay assistant. I'll know more once your record arrives.`
  return `Hi ${name}, I'm your Inlay assistant. I answer from your health record${opts.asOf ? ` as of ${opts.asOf}` : ""}.`
}

/** Never connected: nothing to answer from yet (never counted). */
export const NOT_CONNECTED: Answer = {
  text: "I can answer once your records are connected.",
  link: { label: "Connect my records", href: "/connect" },
}

/** After "I'm safe, I have a question", or a question it can't answer. */
export const AGAIN = "What would you like to ask?"

export const PROMPTS = {
  result: "Which result would you like me to explain?",
  medicine: "Which medicine is it about?",
  plan: "What would you like help with?",
  concern: "What's bothering you?",
  concernText: "Tell me in a few words what's bothering you.",
} as const

/* ------------------------------------------------------------- safety -- */

/** One way to reach a person: what its row says, the number it dials, the
    number shown under a name, and what a screen reader says when the row's
    words leave something out. */
export type Call = { label: string; tel: string; detail?: string; spoken?: string }

/** "Something is bothering me" asks this first; urgent words skip to the
    message (L-30: fixed rules, never a model's call). */
/* The urgent message's words, shared by the chat and every page that shows
   it, so the two never drift (C.4.5, C.10). */
const URGENT_WORDS = `This sounds like it needs a person now. If it's an emergency, call 911. You can call or text 988 any time. For anything urgent about your care, call ${PATIENT.practice} at ${PATIENT.practicePhone}.`

export const URGENT = {
  ask: "Is it urgent? For example chest pain, trouble breathing, signs of a stroke, or thoughts of harming yourself.",
  yes: "Yes, it's urgent",
  no: "No, it isn't urgent",
  /** Never says a person was told: nobody watches the chat live (L-32). */
  message: `${URGENT_WORDS} This chat isn't watched by a person in real time.`,
  /** The same message on a page (the medicines page, when the reason she
      types sounds urgent): nobody reads that page live either. */
  page: `${URGENT_WORDS} Answers here aren't read by a person in real time.`,
  /** The person path, a row each under the message and above the replies,
      in the message's order. The clinic's row says "Call Harborview", as
      every other call button in the app does, with its number under it. */
  calls: [
    { label: "Call 911", tel: "911" },
    { label: "Call 988", tel: "988" },
    {
      label: `Call ${PATIENT.practice.split(" ")[0]}`,
      detail: PATIENT.practicePhone,
      spoken: `Call ${PATIENT.practice}, ${PATIENT.practicePhone}`,
      tel: PATIENT.practicePhone,
    },
  ] as readonly Call[],
  safe: "I'm safe, I have a question",
  end: "End chat",
} as const

/** The numbers inside the urgent message, so the screen can make each one a call. */
export const PHONE_NUMBERS = /(911|988|\(\d{3}\) \d{3}-\d{4})/

export const CONCERNS = ["I feel tired all the time", "I want to lose weight", "I'm not sleeping well", "Something else"] as const

/* ------------------------------------------------------ offer, limit -- */

/** The one line that may follow a complete answer to "what can I do"
    (touchpoint assistant-answer, D.2): never after symptoms, medicines or
    an escalation, never a price, never the doctor. */
export const FOLLOW_ON = {
  title: "You don't just have to watch this number.",
  body: "Inlay can build a plan to help improve it.",
  action: "Build my personalized plan",
} as const

/** The calm card in the thread when a free patient sends a question with
    none left (C.4.7, touchpoint allowance). */
export const LIMIT = {
  title: "You've used this week's AI credit",
  body: (resetsOn: string) => `It comes back on ${resetsOn}. Your record, trends and past answers are all still here.`,
  /** A member: add more for this month. */
  topUpBody: (n: number, price: string) => `Or add ${n} more conversations for this week, ${price}.`,
  topUp: "Add more credit",
  /** The quiet line when a chat in progress finishes on grace. */
  grace: "Your AI credit ran out, so we'll let you finish this chat. It comes off next week's credit.",
  save: "Save for my next visit",
  more: "See what members get",
} as const

/* ------------------------------------------------------------ answers -- */

/** One fact an answer used, for "Why Inlay said this": a result with its
    date and source, a medicine list, or a condition in her record. */
export type Fact = { title: string; meta?: string; value?: string; level?: Status }

export type Answer = {
  /** The direct answer, two or three sentences. */
  text: string
  /** "What your record shows" */
  shows?: string
  /** "What it doesn't tell us" */
  limits?: string
  /** "Something to ask Dr. Patel": the question, ready to save. */
  ask?: string
  /** What a saved question is about: a marker or a medicine. */
  about?: string
  /** "Confidence: high. Based on 5 Quest results from 2022 to 2026." */
  confidence?: string
  /** The facts behind it, newest first. */
  facts?: Fact[]
  /** Questions to save, for "What should I ask Dr. Patel?" */
  questions?: string[]
  /** A short ticked list, e.g. what stays free. */
  points?: string[]
  /** Opens with the question to ask showing: an answer that sends her to
      Dr. Patel (a concern, a condition, a dose) ends on her next step. */
  askOpen?: boolean
  /** A place to go next inside the app, e.g. today's exercise. `offer`
      marks the way to the plan page for a free patient: the cap service
      decides whether it shows (lib/offers.ts, touchpoint assistant-plan),
      so the answer's words never depend on it. */
  link?: { label: string; href: string; offer?: boolean }
}

/** What she can ask about one result. */
export type Ask = "meaning" | "why" | "diagnosis" | "help" | "doctor"

export type Suggestion = { ask: Ask; label: string }

/* ------------------------------------------------------------- words -- */

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "A, B and C" */
export const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`)

const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** The marker's name inside a sentence: "A1c", "LDL", "triglycerides". */
export const nameIn = (b: Biomarker) => b.short ?? b.name.toLowerCase()

/** "it" or "they" for the marker, and its verbs. */
const they = (b: Biomarker) => (b.plural ? { it: "they", is: "are", has: "have" } : { it: "it", is: "is", has: "has" })

/** The range as a sentence carries it: "below 5.7", "30 to 100". */
const rangeIn = (b: Biomarker) => lower(b.target)

/** Labs have the lab's range; blood pressure and BMI come from visits. */
const rangeOwner = (b: Biomarker) => (b.kind === "vital" ? "the range" : "the lab's range")

/** Where each result came from, as a row's meta and as a short name. */
const SOURCE: Record<Origin, { long: string; short: string }> = {
  lab: { long: "Quest Diagnostics", short: "Quest" },
  doctor: { long: PATIENT.practice, short: "Harborview" },
  hospital: { long: "Scripps Memorial Hospital", short: "Scripps Memorial" },
  you: { long: "You", short: "your own" },
  report: { long: "Your report", short: "your report's" },
}

const sourceOf = (p: Point) => (p.origin === "you" && p.method ? `You, ${lower(p.method)}` : SOURCE[p.origin].long)

const yearOf = (p: { t: number }) => new Date(p.t).getFullYear()

/** "2022 to 2026", or "2026" when the results share a year. */
const years = (first: { t: number }, last: { t: number }) => (yearOf(first) === yearOf(last) ? `${yearOf(last)}` : `${yearOf(first)} to ${yearOf(last)}`)

/** "5 Quest results", "4 readings", "one Quest result". */
function countWords(t: Trend) {
  const origins = [...new Set(t.series.map((p) => p.origin))]
  const from = origins.length === 1 && origins[0] !== "you" ? `${SOURCE[origins[0]].short} ` : ""
  const noun = t.count === 1 ? t.noun.replace(/s$/, "") : t.noun
  return `${t.count === 1 ? "one" : t.count} ${from}${noun}`
}

/** Every comparable value: "5.3, 5.4, 5.6, 5.7 and 5.9". */
const valuesOf = (t: Trend) => list(t.series.map((p) => valueText(t.marker, p)))

/** Values with when: "5.3 in Apr 2022, 5.4 in May 2023 ... and 5.9 in Aug 2026". */
const datedValues = (t: Trend) => list(t.series.map((p) => `${valueText(t.marker, p)} in ${monthYear(p.t)}`))

/** Every comparable result higher (or lower) than the one before. */
function stepwise(t: Trend): "up" | "down" | undefined {
  const v = t.series.map((p) => p.value)
  if (v.length < 2) return undefined
  if (v.every((x, i) => i === 0 || x > v[i - 1])) return "up"
  if (v.every((x, i) => i === 0 || x < v[i - 1])) return "down"
  return undefined
}

/** How many of the latest results in a row share the latest one's
    standing (out of range on the same side, or borderline). */
function runOf(t: Trend) {
  const b = t.marker
  let n = 0
  for (const p of [...t.series].reverse()) {
    if (pointStatus(b, p) !== t.status) break
    n++
  }
  return n
}

/** Whole years from the first comparable result to the latest, in words. */
function spanWords(t: Trend) {
  if (!t.first || !t.latest) return ""
  const n = Math.floor((t.latest.t - t.first.t) / (365.25 * 86400000))
  return n < 1 ? "over the past year" : `over ${NUMBER_WORDS[n] ?? n} ${n === 1 ? "year" : "years"}`
}

/** How far out of range the latest result is, as a share of the limit it
    passed: under 10% reads "a little". */
function nearEdge(t: Trend) {
  const b = t.marker
  const v = t.latest?.value
  if (v === undefined) return false
  const limit = t.side === "below" ? b.low : b.high
  return limit !== undefined && Math.abs(v - limit) / limit < 0.1
}

/** "a little above the lab's range, which is below 5.7" */
function placement(t: Trend) {
  const b = t.marker
  const range = `${rangeOwner(b)}, which is ${rangeIn(b)}`
  if (t.status === "out") return `${nearEdge(t) ? "a little " : ""}${t.side === "below" ? "below" : "above"} ${range}`
  if (t.status === "borderline") return `inside ${range}, close to its edge`
  return `inside ${range}`
}

/* ------------------------------------------------- about each marker -- */

/** The first sentence of a marker's "What this measures". */
function firstSentence(about?: string) {
  const lead = (about ?? "").split(". ")[0].trim()
  return !lead ? "" : lead.endsWith(".") ? lead : `${lead}.`
}

/** What the number stands for, where a plain phrase says it best. */
const MEANS: Record<string, string> = {
  a1c: "your average blood sugar over the last 2 to 3 months",
  glucose: "your blood sugar after a night without eating",
}

/** What can move a marker, said once in "Why might it be going up?". */
const FACTORS: Record<string, string> = {
  a1c: "Weight, activity, sleep and some medicines can all move A1c.",
  glucose: "Food, activity, sleep, stress and some medicines can all move fasting glucose.",
  ldl: "Food, weight, activity, family history and some medicines can all move LDL.",
  hdl: "Activity, weight, smoking and the fats you eat can all move HDL.",
  tg: "Added sugars, alcohol, weight and activity can all move triglycerides.",
  bp: "Salt, weight, alcohol, sleep, stress and some medicines can all move blood pressure.",
  bmi: "Food, activity, sleep, stress and some medicines can all move weight.",
  vitd: "Time in the sun, the season, skin tone, weight and supplements can all move vitamin D.",
  ferritin: "Iron in food, blood loss and some conditions can all move ferritin.",
}
const FACTORS_ANY = "Many things can move a result, from food and activity to sleep, stress and some medicines."

/** Habits that often help, for "What can I do about it?". */
const HELPS: Record<string, string> = {
  a1c: "Things that often help A1c: a short walk after meals, more fiber, fewer added sugars, steady sleep and, if it applies, losing even 5% of body weight.",
  glucose: "Things that often help blood sugar: a short walk after meals, more fiber, fewer added sugars and steady sleep.",
  ldl: "Things that often help LDL: more fiber, olive oil, nuts and fish in place of butter and fatty meats, regular activity and, if it applies, losing some weight.",
  tg: "Things that often help triglycerides: fewer added sugars and refined carbs, less alcohol, regular activity and, if it applies, losing some weight.",
  hdl: "Things that often help HDL: regular activity, healthy fats like olive oil, nuts and fish, and not smoking.",
  bp: "Things that often help blood pressure: less salt, regular activity, less alcohol, steady sleep and, if it applies, losing some weight.",
  bmi: "Things that often help with weight: regular meals with protein and fiber, fewer added sugars, daily movement and steady sleep, changed a little at a time.",
  vitd: "Things that often help vitamin D: some time outdoors, foods like oily fish and eggs, and a supplement if Dr. Patel advises one.",
  ferritin: "Things that often help keep iron stores steady: beans, lentils, leafy greens and lean meat, with fruit rich in vitamin C to help absorb the iron.",
}

/** The step from the why conversation, when it fits a marker's habits. */
const STEP_FITS = new Set(["a1c", "glucose", "ldl", "tg", "hdl", "bp", "bmi"])

/** A second marker that moved alongside, for "Why might it be going up?". */
const ALONGSIDE: Record<string, string> = { a1c: "bmi", glucose: "bmi", tg: "bmi", ldl: "bmi", bp: "bmi" }

/** Problem list entries a diagnosis style question can be about (Q-09),
    with the question in the patient's words. Only where her record lists a
    related condition. */
const DIAGNOSIS: Record<string, { problem: string; question: string }> = {
  a1c: { problem: "prediabetes", question: "Do I have prediabetes?" },
  glucose: { problem: "prediabetes", question: "Do I have prediabetes?" },
  ldl: { problem: "lipids", question: "Do I have high cholesterol?" },
  bp: { problem: "bp", question: "Do I have high blood pressure?" },
}

/** "Your record lists prediabetes, added by Dr. Patel in 2023." */
function conditionLine(markerId: string) {
  const d = DIAGNOSIS[markerId]
  const p = d && PROBLEMS.find((x) => x.id === d.problem)
  if (!p) return undefined
  const by = p.origin === "doctor" ? " by Dr. Patel" : ""
  const other = "difference" in p && p.difference ? ` ${p.difference}.` : ""
  return { line: `Your record lists ${lower(p.name)}, added${by} in ${p.since}.${other}`, fact: { title: p.name, meta: `Your conditions, added${by} in ${p.since}` } as Fact }
}

/* ---------------------------------------------------- one result: ask -- */

/** The prompt over a result's suggested questions. */
export const scopedPrompt = (b: Biomarker) => `What would you like to know about your ${nameIn(b)}?`

/** The questions suggested for one result, in its own words: what the
    number means, why it is moving (or low, or steady), whether it is a
    condition (only where her record lists one), what she can do, and what
    to ask Dr. Patel. */
export function suggestionsFor(t: Trend): Suggestion[] {
  const b = t.marker
  const w = they(b)
  if (!t.latest) return [{ ask: "doctor", label: "What should I ask Dr. Patel?" }]
  const meaning: Suggestion = { ask: "meaning", label: `What does ${t.value} mean?` }
  const why: Suggestion =
    t.movement === "rising"
      ? { ask: "why", label: `Why might ${w.it} be going up?` }
      : t.movement === "falling"
        ? { ask: "why", label: `Why might ${w.it} be going down?` }
        : t.status === "out"
          ? { ask: "why", label: `Why might ${w.it} be ${t.side === "below" ? "low" : "high"}?` }
          : t.status === "borderline"
            ? { ask: "why", label: `Why ${w.is} ${w.it} close to the edge?` }
            : { ask: "why", label: "How has it changed over time?" }
  const diagnosis = DIAGNOSIS[b.id] && t.status !== "in" ? [{ ask: "diagnosis" as const, label: DIAGNOSIS[b.id].question }] : []
  const help: Suggestion = t.status === "in" ? { ask: "help", label: `How can I keep ${w.it} in range?` } : { ask: "help", label: "What can I do about it?" }
  return [meaning, ...(t.count > 1 || t.status !== "in" ? [why] : []), ...diagnosis, help, { ask: "doctor", label: "What should I ask Dr. Patel?" }]
}

/* ------------------------------------------------- one result: answer -- */

/** The facts behind an answer about one marker: every result, newest first,
    with its date and source; another method keeps its own source. */
function resultFacts(t: Trend): Fact[] {
  const b = t.marker
  return [...t.series, ...t.others]
    .sort((x, y) => y.t - x.t)
    .map((p) => ({ title: pointDate(p), meta: sourceOf(p), value: withUnit(b, valueText(b, p)), level: pointStatus(b, p) }))
}

function confidence(level: "high" | "medium" | "low", basis: string) {
  return `Confidence: ${level}. Based on ${basis}.`
}

/** "What does 5.9 mean?" */
function meaningAnswer(t: Trend, s: Snapshot): Answer {
  const b = t.marker
  const latest = t.latest!
  const lead = MEANS[b.id]
  const text = lead
    ? `Your ${nameIn(b)} of ${t.valueWithUnit} means ${lead} was ${placement(t)}.`
    : `${firstSentence(b.about)} Your latest, ${t.valueWithUnit} on ${pointDate(latest)}, is ${placement(t)}.`.trim()

  const step = stepwise(t)
  const moved =
    t.count < 2
      ? "This is the only result so far."
      : step === "up"
        ? "Each was higher than the one before."
        : step === "down"
          ? "Each was lower than the one before."
          : t.movement === "rising"
            ? "Overall they have gone up."
            : t.movement === "falling"
              ? "Overall they have gone down."
              : t.count > 3
                ? "The last three have stayed about the same."
                : "They have stayed about the same."
  // A member's change since her starting tests in May.
  const started = membershipOn(s.membership) ? sinceStart(b) : undefined
  const origins = [...new Set(t.series.map((p) => p.origin))]
  const from = origins.length === 1 && origins[0] !== "you" ? ` from ${SOURCE[origins[0]].short}` : ""
  const history =
    t.count < 2
      ? `One result${from}, ${monthYear(latest.t)}: ${t.value}.`
      : `${t.count} ${t.noun}${from}, ${monthYear(t.first!.t)} to ${monthYear(latest.t)}: ${valuesOf(t)}.`
  const condition = conditionLine(b.id)
  const others = t.others.length ? " One result was measured a different way, so it isn't compared with the others." : ""

  const limits =
    b.id === "a1c"
      ? "One number can't show your day to day highs and lows, and it doesn't say why it has risen."
      : t.movement === "rising"
        ? "One result is a snapshot of a single day, and it doesn't say why it has risen."
        : t.movement === "falling"
          ? "One result is a snapshot of a single day, and it doesn't say why it has fallen."
          : "One result is a snapshot of a single day. It can't show what happens between tests."

  const ask =
    t.count > 1 && t.movement !== "steady" && t.movement !== "unknown"
      ? `My ${nameIn(b)} went from ${valueText(b, t.first!)} to ${t.value} since ${yearOf(t.first!)}. What would you like me to focus on before my next test?`
      : (questionsOf(t)[0] ?? `What does my ${nameIn(b)} of ${t.value} mean for me?`)

  return {
    text,
    shows: `${history} ${moved}${started ? ` ${started.words}.` : ""}${others}${condition ? ` ${condition.line}` : ""}`,
    limits,
    ask,
    about: b.id,
    confidence: confidence(t.count >= 3 ? "high" : "medium", `${countWords(t)} from ${years(t.first!, latest)}`),
    facts: [...resultFacts(t), ...(condition ? [condition.fact] : [])],
  }
}

/** "Why might it be going up?" (or down, low, close to the edge, steady). */
function whyAnswer(t: Trend, markers: Biomarker[]): Answer {
  const b = t.marker
  const latest = t.latest!
  const w = they(b)
  const pairId = ALONGSIDE[b.id]
  const pair = pairId ? markers.find((m) => m.id === pairId) : undefined
  const p = pair ? classify(pair) : undefined
  const along = p && p.movement === t.movement && t.movement !== "steady" && p.count > 1 ? p : undefined
  const factors = FACTORS[b.id] ?? FACTORS_ANY
  const moving = t.movement === "rising" || t.movement === "falling"

  let text: string
  if (t.count < 2) {
    // One result: no trend yet (C.0.8).
    text = `There's one ${nameIn(b)} result so far, ${t.valueWithUnit} in ${monthYear(latest.t)}. A trend needs two results from the same test.`
  } else if (moving) {
    const change = t.change ? Math.abs(t.change.delta) / (b.high ?? b.low ?? t.change.from.value) : 1
    const pace = change < 0.15 ? " slowly" : ""
    const alongside = along ? `, alongside your ${nameIn(along.marker)} going from ${valueText(along.marker, along.first!)} to ${along.value}` : ""
    const now = t.meaning === "improving" && t.status === "in" ? ` ${upper(w.it)} ${w.is} now in your range.` : ""
    text = `The record shows your ${nameIn(b)} ${t.movement === "rising" ? "rising" : "falling"}${pace} ${spanWords(t)}${alongside}.${now} ${factors} Your record alone can't show which matters most for you.`
  } else if (t.status !== "in") {
    const where = t.status === "borderline" ? "close to the edge of" : t.side === "below" ? "below" : "above"
    const run = runOf(t)
    const across = run > 1 ? `across your last ${run} ${t.noun}` : "in your latest result"
    text = `Your ${nameIn(b)} ${w.has} ${run > 1 ? "stayed" : "been"} ${where} your range ${across}. ${factors} Your record alone can't show which matters most for you.`
  } else {
    text = `Your ${nameIn(b)} ${w.has} stayed steady and in range across your last ${t.count} ${t.noun}, from ${valueText(b, t.first!)} in ${monthYear(t.first!.t)} to ${t.value} in ${monthYear(latest.t)}.`
  }

  const shows = [`${upper(nameIn(b))}: ${datedValues(t)}.`, along ? `${upper(nameIn(along.marker))}: ${datedValues(along)}.` : ""].filter(Boolean).join(" ")
  const ask = moving
    ? `Which of these do you think is driving my ${nameIn(b)}?`
    : t.status !== "in"
      ? `What do you think is keeping my ${nameIn(b)} ${t.status === "borderline" ? "close to the edge" : t.side === "below" ? "low" : "high"}?`
      : (questionsOf(t)[0] ?? `Is my ${nameIn(b)} where you'd like it to be?`)
  const firstOf = along && along.first!.t < t.first!.t ? along.first! : t.first!
  const basis = along ? `${t.count} ${nameIn(b)} ${t.noun} and ${along.count} ${nameIn(along.marker)} ${along.noun} from ${years(firstOf, latest)}` : `${countWords(t)} from ${years(t.first!, latest)}`
  return {
    text,
    shows,
    limits: along ? "Timing isn't cause: two things rising together doesn't prove one drives the other." : "Your record shows what changed, not why it changed.",
    ask,
    about: b.id,
    confidence: confidence(moving || t.status !== "in" ? "medium" : "high", basis),
    facts: [...resultFacts(t), ...(along ? resultFacts(along).map((f) => ({ ...f, title: `${upper(nameIn(along.marker))}, ${f.title}` })) : [])],
  }
}

/** "Do I have prediabetes?" (Q-09 default): the measure, her values, the
    lab's range and what her record lists, never a verdict. */
function diagnosisAnswer(t: Trend): Answer {
  const b = t.marker
  const w = they(b)
  const where = t.status === "out" ? (t.side === "below" ? "below" : "above") : "inside"
  const step = stepwise(t)
  const since = t.first ? yearOf(t.first) : undefined
  const moved =
    step === "up"
      ? `risen at each result since ${since}`
      : step === "down"
        ? `fallen at each result since ${since}`
        : t.movement === "rising"
          ? `gone up since ${since}`
          : t.movement === "falling"
            ? `come down since ${since}`
            : `stayed about the same since ${since}`
  const condition = conditionLine(b.id)
  return {
    text: `I can't tell you whether you have a condition. That's for Dr. Patel. Here's what your record shows: your ${nameIn(b)} ${w.is} ${t.valueWithUnit}, ${where} ${rangeOwner(b)} of ${rangeIn(b)}${t.count > 1 ? `, and ${w.it} ${w.has} ${moved}` : ""}.`,
    shows: condition?.line,
    limits: "A label depends on more than one number, and only your doctor can say what applies to you.",
    ask: `Based on my ${nameIn(b)} of ${t.value}, how would you describe where I am, and what should I watch?`,
    about: b.id,
    confidence: confidence("high", `${countWords(t)} and the conditions in your record`),
    facts: [...resultFacts(t), ...(condition ? [condition.fact] : [])],
    askOpen: true,
  }
}

/** The next test or step that measures a marker, as the record holds it. */
function nextStep(b: Biomarker, s: Snapshot, now: Date): string | undefined {
  const care = MARKER_CARE[b.id]
  if (membershipOn(s.membership) && !s.membership?.paused && (care?.orders ?? []).length) {
    const labs = thisWeek(s, now).find((i) => i.kind === "test")
    if (labs) return `Your ${lower(labs.title)} is booked for ${labs.when}.`
  }
  const order = (care?.orders ?? []).map((id) => ORDERS.find((o) => o.id === id)).find(Boolean)
  if (order && order.state !== "done") {
    const booked = s.bookings?.[order.id]
    if (booked) return `Your ${lower(order.name)} is booked for ${booked.when}.`
    const due = order.due.replace(/^By\s+/i, "").replace(/,\s*\d{4}$/, "")
    return `Your ${lower(order.name)} is due by ${due}.`
  }
  const gap = (care?.gaps ?? []).map((id) => CARE_GAPS.find((g) => g.id === id)).find((g) => g && g.action !== "talk")
  if (gap) return `${gap.why}${s.booked?.[gap.id] ? "" : " That visit isn't booked yet."}`
  return undefined
}

/** "What can I do about it?" (or how to keep it in range). */
function helpAnswer(t: Trend, s: Snapshot, now: Date): Answer {
  const b = t.marker
  const helps = HELPS[b.id]
  const latest = t.latest!
  if (!helps)
    return {
      text: `Your record can't say what would move your ${nameIn(b)}. Dr. Patel can tell you what matters most for ${they(b).it === "they" ? "them" : "it"}.`,
      shows: `Your latest result is from ${pointDate(latest)}.`,
      ask: `Is there anything I should do about my ${nameIn(b)}?`,
      about: b.id,
      confidence: confidence("medium", countWords(t)),
      facts: resultFacts(t),
    }
  const member = membershipOn(s.membership) && !s.membership?.paused && Boolean(s.plan)
  const step = s.why?.step ?? ""
  const minutes = step.match(/(\d+)\s*minute/i)?.[1]
  const fits =
    !STEP_FITS.has(b.id)
      ? ""
      : member
        ? " Your plan already works on several of these with you."
        : /walk/i.test(step) && /dinner/i.test(step)
          ? ` The step you chose, a ${minutes ? `${minutes} minute ` : ""}walk after dinner, fits right in.`
          : step
            ? " The step you chose fits right in."
            : ""
  const next = nextStep(b, s, now) ?? `Your latest result is from ${pointDate(latest)}.`
  return {
    text: `${helps}${fits}`,
    shows: next,
    limits: `Which of these will move your ${nameIn(b)} most is something only your next results will show.`,
    ask: "Which one change would you like me to start with?",
    about: b.id,
    confidence: confidence("high", `general guidance and your ${countWords(t)}`),
    facts: resultFacts(t),
  }
}

/** "What should I ask Dr. Patel?": the marker's own questions, to save. */
function doctorAnswer(t: Trend): Answer {
  const b = t.marker
  const own = questionsOf(t)
  const questions = (own.length ? own : [`What does my ${nameIn(b)} of ${t.value || "result"} mean for me?`]).slice(0, 2)
  return {
    text: questions.length > 1 ? "Here are two questions that fit your results." : "Here's a question that fits your results.",
    questions,
    about: b.id,
  }
}

/** The answer to one suggested question about one result. */
export function answerFor(ask: Ask, t: Trend, ctx: { s: Snapshot; markers: Biomarker[]; now?: Date }): Answer {
  if (!t.latest) return doctorAnswer(t)
  const now = ctx.now ?? new Date()
  switch (ask) {
    case "meaning":
      return meaningAnswer(t, ctx.s)
    case "why":
      return whyAnswer(t, ctx.markers)
    case "diagnosis":
      return diagnosisAnswer(t)
    case "help":
      return helpAnswer(t, ctx.s, now)
    case "doctor":
      return doctorAnswer(t)
  }
}

/* --------------------------------------------------- choosing a result -- */

/** Every marker for "Explain one of my results": those to watch first, in
    the home's order (her own "improve" answers break ties), then the rest
    by body system. Nothing is left out (fixes A-22). */
export function resultGroups(markers: Biomarker[], improve?: string[]) {
  const watch = watchList(markers, { improve })
  const ids = new Set(watch.map((t) => t.id))
  const rest = byBodySystem(markers.filter((b) => !ids.has(b.id))).flatMap((g) => g.markers.map(classify))
  return { watch, rest }
}

/* ---------------------------------------------------------- medicines -- */

/** Who keeps a medicine list, inside a sentence and as a fact's title. */
const LIST_NAME: Record<Origin, string> = {
  doctor: "Dr. Patel's list",
  hospital: "Scripps Memorial",
  lab: "Quest",
  you: "What you told us",
  report: "Your report",
}

const ASKABLE = MEDICATIONS.filter((m) => !m.resolved)

/** The medicines she can ask about: prescribed ones whose lists differ
    first, then the rest, then her supplements. */
export function medicineChoices() {
  const rank = (m: Medication) => (m.kind === "supplement" ? 2 : medDifference(m) ? 0 : 1)
  return [...ASKABLE]
    .sort((a, b) => rank(a) - rank(b))
    .map((m) => ({ id: m.id, name: m.name, differs: Boolean(medDifference(m)), dose: (m.lists.find((l) => l.origin === "doctor") ?? m.lists[0]).dose }))
}

/** The dose without its timing when both lists share it: "10 mg". */
const doseOnly = (dose: string, like: string) => {
  const [amount, ...rest] = dose.split(/\s(?=once|twice|when|every|at)/)
  return rest.join(" ") && like.endsWith(rest.join(" ")) ? amount : dose
}

const QUESTION_FOR: Record<string, string> = {
  atorvastatin: "Which atorvastatin dose should I be taking?",
  lisinopril: "Should I keep taking lisinopril?",
  "vitamin-d": "I take 2,000 IU of vitamin D3. Is that the right amount for me?",
  "fish-oil": "Is fish oil worth taking for me?",
}

/** A tapped medicine as the question it stands for, kept in the composer
    when the free questions are used: "Is my atorvastatin dose right?" */
export function medicineQuestion(id: string) {
  const m = MEDICATIONS.find((x) => x.id === id)
  return m ? `Is my ${lower(m.name)} dose right?` : "A question about my medicines"
}

/** What the record says about one medicine, with the boundary first: the
    assistant never changes or judges a dose (C.4.5). */
export function medicineAnswer(id: string): Answer | undefined {
  const m = MEDICATIONS.find((x) => x.id === id)
  if (!m) return undefined
  const name = lower(m.name)
  const doctor = m.lists.find((l) => l.origin === "doctor")
  const others = m.lists.filter((l) => l.origin !== "doctor")
  const other = others[0]
  const difference = medDifference(m)
  let text: string
  if (m.kind === "supplement" && !doctor) {
    const told = m.lists.find((l) => l.origin === "you")
    text = `Your record shows ${name}, ${told?.dose ?? m.lists[0].dose}, as you told us on ${(told ?? m.lists[0]).date.replace(/,\s*\d{4}$/, "")}. I can't judge a dose. Dr. Patel can say whether it's right for you.`
  } else if (difference && doctor && other) {
    text = `I can't change or judge a medicine dose. Here's what your record shows: ${LIST_NAME.doctor} says ${doctor.dose}, and ${LIST_NAME[other.origin]} lists ${doseOnly(other.dose, doctor.dose)}. Dr. Patel will review the difference. Please don't change or stop a prescription on your own.`
  } else if (difference && other) {
    text = `I can't change or judge a medicine. Here's what your record shows: ${LIST_NAME[other.origin]} lists ${name} ${other.dose}, and ${LIST_NAME.doctor} doesn't include it. Dr. Patel will review the difference. Please don't change or stop a prescription on your own.`
  } else {
    const line = doctor ?? m.lists[0]
    const agree = m.lists.length > 1 ? ", and the other lists in your record agree" : ""
    text = `${line.origin === "doctor" ? `${LIST_NAME.doctor} says` : `${LIST_NAME[line.origin]} lists`} ${name} ${line.dose}${agree}. I can't change or judge a dose, so if that isn't how you take it, tell Dr. Patel at your next visit.`
  }
  const lines = m.lists.map((l) => `${LIST_NAME[l.origin]}: ${l.dose}, ${l.date}.`)
  if (difference && !doctor) lines.push(`${LIST_NAME.doctor}: not listed.`)
  // A prescription missing from Dr. Patel's list was still checked against it.
  const compared = m.lists.length + (difference && !doctor ? 1 : 0)
  return {
    text,
    shows: lines.join(" "),
    ask: QUESTION_FOR[m.id] ?? `Is ${name} still right for me?`,
    about: m.id,
    confidence: confidence("high", compared > 1 ? `${NUMBER_WORDS[compared]} medicine lists in your record` : m.lists[0].origin === "you" ? "what you told us" : "Dr. Patel's list"),
    facts: m.lists.map((l) => ({ title: LIST_NAME[l.origin], meta: l.date, value: l.dose })),
    askOpen: true,
  }
}

/* ----------------------------------------------------------- concerns -- */

/** The results that can relate to energy, in this order. */
const ENERGY = ["vitd", "ferritin", "tsh", "hemoglobin", "b12"]

/** A short status phrase: "below its range of 30 to 100", "in range". */
function statusPhrase(t: Trend) {
  if (t.status === "out") return `${t.side === "below" ? "below" : "above"} its range of ${rangeIn(t.marker)}`
  if (t.status === "borderline") return "in range, close to its edge"
  return "in range"
}

/** A concern she picked or wrote, answered from her record. It ends on the
    question for Dr. Patel and never on an offer. */
export function concernAnswer(concern: string, markers: Biomarker[], said?: string): Answer {
  const find = (id: string) => {
    const b = markers.find((m) => m.id === id)
    return b ? classify(b) : undefined
  }
  if (concern === CONCERNS[0]) {
    const found = ENERGY.map(find).filter((t): t is Trend => Boolean(t?.latest))
    const off = found.filter((t) => t.status !== "in")
    const offWords = off.map((t) => `${nameIn(t.marker)} at ${t.valueWithUnit}`)
    return {
      text: `Tiredness has many causes, and your record shows only part of the picture. ${
        off.length
          ? `Of the results that can relate to energy, ${off.length === 1 ? "one is" : `${NUMBER_WORDS[off.length] ?? off.length} are`} out of range: ${list(offWords)}.`
          : "The results in it that can relate to energy are in range."
      }`,
      shows: found.map((t) => `${upper(nameIn(t.marker))}: ${t.valueWithUnit}, ${statusPhrase(t)}.`).join(" "),
      limits: "Sleep, stress, mood, activity and many conditions can cause tiredness, and lab results can't show most of them.",
      ask: "I've been feeling tired all the time. Could any of my results explain it?",
      about: "tired",
      confidence: confidence("medium", `${found.length} of your latest results`),
      facts: found.map((t) => ({ title: t.marker.name, meta: `${pointDate(t.latest!)}, ${sourceOf(t.latest!)}`, value: t.valueWithUnit, level: t.status })),
      askOpen: true,
    }
  }
  if (concern === CONCERNS[1]) {
    const bmi = find("bmi")
    const with_ = ["a1c", "tg"].map(find).filter((t): t is Trend => Boolean(t && t.movement === "rising"))
    return {
      text: `${bmi?.first && bmi.count > 1 ? `The record shows your BMI going from ${valueText(bmi.marker, bmi.first)} to ${bmi.value} since ${yearOf(bmi.first)}. ` : ""}Changes that last tend to be small and steady: regular meals with protein and fiber, fewer added sugars, daily movement and steady sleep.`,
      shows: bmi ? `BMI: ${datedValues(bmi)}.${with_.length ? ` Over the same years your ${list(with_.map((t) => nameIn(t.marker)))} went up too.` : ""}` : undefined,
      limits: "BMI doesn't show your body makeup or where weight sits, which say more than the number alone.",
      ask: "What would be a healthy goal for my weight, and how should I start?",
      about: "bmi",
      confidence: confidence("medium", bmi ? countWords(bmi) : "your record"),
      facts: bmi ? resultFacts(bmi) : undefined,
      askOpen: true,
    }
  }
  if (concern === CONCERNS[2])
    return {
      text: "Your record doesn't hold any sleep data, so I can't see your nights. Steady bed and wake times, less caffeine after noon and a cool, dark room often help.",
      shows: "No sleep measurements are in your record yet.",
      limits: "Snoring, waking often or feeling unrested in the morning can have causes that only Dr. Patel can check.",
      ask: "I haven't been sleeping well. Is it worth checking why?",
      about: "sleep",
      confidence: confidence("low", "general guidance, with no sleep data in your record"),
      askOpen: true,
    }
  const words = (said ?? "").trim().replace(/[.!?]+$/, "")
  return {
    text: "Thanks for telling me. I can only answer from your health record, and nothing in it explains this on its own. It's worth raising with Dr. Patel.",
    ask: words ? `I've noticed this: ${lower(words)}. What could be causing it?` : "Something has been bothering me. Could we talk it through?",
    about: "concern",
    askOpen: true,
  }
}

/* -------------------------------------------------- the next visit -- */

export type NextVisit = { id: string; title: string; who: string; date: Date; time: string; when: string; where: string }

/** The next visit on her calendar: a member's this week, otherwise the
    first appointment still ahead (a record review needs no visit). */
export function nextVisit(s: Snapshot, now: Date = new Date()): NextVisit | undefined {
  if (membershipOn(s.membership) && s.plan) {
    const v = thisWeek(s, now).find((i) => i.kind === "visit")
    if (v) {
      const [who, ...where] = v.where.split(", ")
      return { id: v.id, title: v.title, who, date: v.date, time: v.time, when: v.when, where: where.join(", ") }
    }
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const v = APPOINTMENTS.filter((a) => a.kind === "visit")
    .map((a) => ({ ...a, date: new Date(a.at) }))
    .filter((a) => a.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0]
  if (!v) return undefined
  return { id: v.id, title: v.name, who: v.with, date: v.date, time: clockOf(v.date), when: `${dayLabel(v.date)}, ${clockOf(v.date)}`, where: v.place }
}

/** The things worth taking to that visit, each ready to save: the
    appointment's own list (lib/record.ts `prepare`, which the visit page
    shows too), or the medicine list for any visit. */
export function visitSuggestions(v: NextVisit | undefined): string[] {
  const prepare = v ? APPOINTMENTS.find((a) => a.id === v.id)?.prepare : undefined
  return prepare?.length ? [...prepare] : ["Bring your medicine list"]
}

/** "Your next visit is your cardiology follow up with Dr. Lee on Wed, Oct 21." */
export const visitIntro = (v: NextVisit | undefined) =>
  v ? `Your next visit is your ${lower(v.title)} with ${v.who} on ${dayLabel(v.date)}.` : "There's no visit on your calendar yet. Here's what's worth taking to the next one."

/* ------------------------------------------------- a member's plan -- */

export const PLAN_ASKS = ["How much fiber is left today?", "What's my exercise today?", "Ideas for dinner", "Why did my plan change?"] as const

/** "How did yesterday go?", "How is today going so far?", "How did Sun,
    Oct 4 go?": a member's day from her own log, kindly, with the day page
    one tap away. Partial days are never scored. */
export function dayAnswer(question: string, s: Snapshot, now: Date = new Date()): Answer | undefined {
  let date: Date | undefined
  if (/yesterday/i.test(question)) date = addDays(now, -1)
  else if (/today|so far/i.test(question)) date = now
  else {
    const named = question.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})\b/i)
    if (named)
      for (let i = 1; i <= 30 && !date; i++) {
        const d = addDays(now, -i)
        if (MONTHS[d.getMonth()].toLowerCase() === named[1].slice(0, 3).toLowerCase() && d.getDate() === Number(named[2])) date = d
      }
  }
  if (!date) return undefined
  if (localDay(date) === localDay(now)) {
    const t = todayOf(s, now)
    const slots = [...new Set(mealsOn(s, localDay(now)).map((m) => m.slot))]
    const meals = slots.length ? `${upper(list(slots))} ${slots.length === 1 ? "is" : "are"} logged` : ""
    const text = t.done
      ? `So far today: ${t.words} on your list.${meals ? ` ${meals}.` : ""}`
      : meals
        ? `${meals}, and the rest of today's list is still ahead.`
        : "Today's list is still ahead, and no meals are logged yet."
    return { text, link: { label: "Open today", href: "/day/today" } }
  }
  const d = dayScore(s, date, now)
  const yest = localDay(date) === localDay(addDays(now, -1))
  const name = yest ? "Yesterday" : d.label
  const href = `/day/${yest ? "yesterday" : d.day}`
  if (d.status === "none") return { text: `Nothing was logged ${yest ? "yesterday" : `on ${d.label}`}, so there's no score. Today's list starts fresh.`, link: { label: "Open the day", href } }
  if (d.status === "partial" || d.percent === undefined)
    return { text: `${name} is a partial day, so it isn't scored: ${list(d.missing)} wasn't logged.`, link: { label: "Open the day", href } }
  const energy = d.energy ? ` ${d.energy.words.replace(/^About/, "You were about")}, an estimate.` : ""
  return {
    text: `${name} scored ${d.percent}%, with ${d.met} of your ${d.total} goals met. ${d.coaching}.${energy}`,
    confidence: d.estimateNote ? `Confidence: medium. ${d.estimateNote}.` : undefined,
    link: { label: "Open the day", href },
  }
}

/** Plan questions, answered from the member's own plan and log (never
    counted). */
export function planAnswer(question: string, s: Snapshot, now: Date = new Date()): Answer {
  const day = /yesterday|how did|going so far|so far today|how is today/i.test(question) || /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b/.test(question) ? dayAnswer(question, s, now) : undefined
  if (day) return day
  const profile = profileOf(s)
  if (/fiber/i.test(question)) {
    const goal = profile.goals.find((g) => g.id === "fiber")
    const meals: Meal[] = mealsOn(s, localDay(now))
    const fiber = Math.round(totalsOf(meals).fiber?.value ?? 0)
    if (!goal) return { text: "Fiber isn't one of your plan's goals. Your plan's goals are on the Plan tab." }
    const left = goal.target - fiber
    return {
      text: !meals.length
        ? `Your plan's fiber goal is ${goal.target} g, and nothing is logged yet today. A bowl of lentil soup and a pear add about 15 g.`
        : left > 0
          ? `Your plan's fiber goal is ${goal.target} g. You've logged ${fiber} g so far today. A bowl of lentil soup and a pear add about 15 g.`
          : `Your plan's fiber goal is ${goal.target} g, and you've logged ${fiber} g today. That's your goal met.`,
      shows: meals.length ? meals.map((m) => `${upper(m.slot)} at ${m.time}: ${Math.round(totalsOf([m]).fiber?.value ?? 0)} g.`).join(" ") : undefined,
      confidence: meals.some((m) => m.how === "photo" || m.status === "estimated") ? "Confidence: medium. Totals from photos are estimates." : undefined,
    }
  }
  if (/exercise|workout|strength/i.test(question)) {
    const session = profile.sessionOn(now)
    return session
      ? {
          text: `Today is ${session.title}, ${lower(session.focus)}: ${session.exercises.length} moves, about ${session.minutes} minutes, at ${lower(session.effort)} effort.`,
          link: { label: "Open today's exercise", href: "/exercise" },
        }
      : { text: "Today is a rest day. An easy walk after dinner still counts toward your plan." }
  }
  if (/dinner|eat|meal|idea/i.test(question)) {
    const slot = profile.diet.slots.find((x) => x.slot === "dinner")
    const ideas = profile.diet.ideas.slice(0, 2).map((i) => lower(i.name))
    return {
      text: `${slot ? `For dinner: ${lower(slot.line)}.` : ""} Two ideas that fit your plan: ${ideas.join(", or ")}.`.trim(),
      link: { label: "Open your diet plan", href: "/diet" },
    }
  }
  const live = profile.versions.find((v) => v.status === "Active") ?? profile.versions[0]
  return live
    ? { text: `Version ${live.version}, approved by Dr. Patel on ${live.approved.replace(/,\s*\d{4}$/, "")}: ${lower(live.why)}`, shows: live.changes.map((c) => `${c}.`).join(" ") }
    : { text: "Your plan is with Dr. Patel. Once it's approved, I can answer anything about it." }
}

/** The plan page, where its price lives: the assistant never says one (D.4).
    An offer: it shows only when the cap service allows it. */
const PLAN_PAGE = { label: "See the plan", href: "/plans?from=assistant", offer: true }

/** What a free patient hears when she asks about the plan or its price: the
    Plan tab she can open herself, with the way there when it may show. */
export const PLAN_FOR_FREE: Answer = {
  text: "What the Optimization plan costs is on the Plan tab, beside what's included and what isn't.",
  link: PLAN_PAGE,
}

/** `?topic=plan` without a live plan: the free record's questions about the
    plan, and a new member's while the plan is with Dr. Patel. */
export const FREE_PLAN_ASKS = ["What does the plan include?", "How does it start?", "What stays free?", "How do I stop it?"] as const
export const REVIEW_PLAN_ASKS = ["How was my plan built?", "What happens next?", "When does billing start?"] as const

/** About the plan, for anyone without a live one: what it does, how it
    starts and stops, what stays free. Inlay speaks, never the doctor, and
    never a price (D.1, D.4); never counted. */
export function planInfoAnswer(question: string, reviewing = false): Answer {
  if (reviewing) {
    if (/built/i.test(question)) return { text: "From your record, your questionnaire and the why you shared at the start. Dr. Patel reviews it before it starts." }
    if (/bill|charge|pay/i.test(question)) return { text: "Billing starts on the day Dr. Patel approves your plan, not before. Your details are in Membership.", link: { label: "Open Membership", href: "/membership" } }
    return { text: "Once Dr. Patel approves your plan, it goes live here: your targets, your week and your daily score." }
  }
  if (/includ|what (do|does)|get/i.test(question))
    return { text: "It turns your results into a plan for every day, reviewed by a physician every 3 months.", points: TIERS.optimization.included.filter((x) => !/physician/i.test(x)), link: PLAN_PAGE }
  if (/start|begin|work/i.test(question))
    return { text: "A short questionnaire and a few starting tests go into one plan built around you. A physician reviews it before it starts, and the first charge comes only once it's approved.", link: PLAN_PAGE }
  if (/free/i.test(question)) return { text: "Your record stays free, always, with or without the plan.", points: [...FREE_STAYS] }
  if (/stop|cancel|pause|leave/i.test(question))
    return { text: "You can pause or cancel online at any time, with one confirmation. If you stop, you keep your record and every version of your plan." }
  return PLAN_FOR_FREE
}

/* ----------------------------------------------- tests and visits -- */

/** Tests in the record she may ask about, in words she might use. */
const TEST_WORDS: [string, RegExp][] = [
  ["mammogram", /mammogra/i],
  ["echo", /echo(cardiogram)?|heart ultrasound/i],
  ["labs-nov", /lipid panel|repeat (a1c|labs?|test)|blood (test|draw|work)|fasting/i],
  ["colon", /colon|colorectal/i],
]

/** What each test is for, in plain words (sample copy for clinical review). */
const TEST_FOR: Record<string, string> = {
  mammogram: "A screening mammogram is an X-ray of the breasts that looks for early signs of breast cancer, before there are any symptoms.",
  echo: "An echocardiogram is an ultrasound of your heart. It shows how well your heart pumps and how its valves work.",
  "labs-nov": "It's one fasting blood draw that checks your A1c, your cholesterol and your triglycerides, to see how they've moved since August.",
  colon: "Colorectal screening looks for early signs of cancer in the colon, often before there are any symptoms.",
}

/** The tests still to do, to choose one from. */
export const openTests = () => [
  ...ORDERS.filter((o) => o.state !== "done").map((o) => ({ id: o.id, name: o.name })),
  ...CARE_GAPS.filter((g) => g.id === "colon").map((g) => ({ id: g.id, name: g.title })),
]

/** "What is this test for?" about one test: what it does, then where it
    stands in her record. */
export function testAnswer(id: string, s: Snapshot): Answer | undefined {
  const what = TEST_FOR[id]
  if (!what) return undefined
  const order = ORDERS.find((o) => o.id === id)
  const gap = CARE_GAPS.find((g) => g.id === id)
  const by = order?.by.startsWith("Dr. Maya Patel") ? "Dr. Patel" : order?.by
  const booked = order && s.bookings?.[order.id]
  const due = order?.due.replace(/^By\s+/i, "")
  return {
    text: what,
    shows: order
      ? `${by} ordered it on ${order.ordered}${due ? `, due by ${due}` : ""}. ${booked ? `It's booked for ${booked.when}.` : order.state === "booked" ? "It's booked." : "It isn't booked yet."}${order.prep ? ` ${order.prep}` : ""}`
      : gap?.why,
    limits: "A test looks for signs at one moment. It can't rule everything out, and a result sometimes needs a second look.",
    ask: gap?.question ?? `Is there anything I should do before my ${lower(order?.name ?? "test")}?`,
    about: id,
    confidence: confidence("high", order ? "the order in your record" : "your record and the screening guidance for your age"),
    link: order ? { label: "Open the order", href: `/order/${order.id}` } : { label: "Open the reminder", href: `/task/${id}` },
  }
}

/** "Summarize what changed at my urgent care visit" (F-83): what an
    outside visit left in her record. */
export function outsideVisitAnswer(id: string): Answer | undefined {
  const v = VISITS.find((x) => x.id === id)
  if (!v) return undefined
  const sameDay = (date: string) => date === v.date
  if (id === "urgent") {
    // Started there: on the hospital's list from that day and not on Dr.
    // Patel's. Listed at another dose: a difference Dr. Patel settles.
    const fromVisit = MEDICATIONS.filter((m) => !m.resolved && m.lists.some((l) => l.origin === "hospital" && sameDay(l.date)))
    const started = fromVisit.filter((m) => !m.lists.some((l) => l.origin === "doctor"))
    const differs = fromVisit.filter((m) => m.lists.some((l) => l.origin === "doctor") && medDifference(m))
    const done = PROCEDURES.filter((p) => sameDay(p.date)).map((p) => lower(p.name))
    const docs = DOCUMENTS.filter((d) => sameDay(d.date)).map((d) => lower(d.name))
    const actions = [
      ...started.map((m) => `started ${lower(m.name)} ${m.lists.find((l) => l.origin === "hospital")?.dose}`),
      ...done.map((p) => `did an ${p}`),
      `asked you to ${lower(v.askedFor ?? "see your doctor")}`,
    ]
    return {
      text: `The record shows an urgent care visit at Scripps Memorial on ${v.date}, for ${lower(v.reason ?? "a visit")}. They ${list(actions)}.`,
      shows: [
        ...differs.map((m) => `Their list also has ${lower(m.name)} at ${m.lists.find((l) => l.origin === "hospital")?.dose.split(" ").slice(0, 2).join(" ")}, where Dr. Patel's list says ${m.lists.find((l) => l.origin === "doctor")?.dose}.`),
        docs.length ? `Your record has the ${list(docs)} from that day, and Dr. Patel can see them too.` : "",
      ]
        .filter(Boolean)
        .join(" "),
      ask: "Scripps asked me to see you after my urgent care visit. When can I come in?",
      about: "follow-up",
      confidence: confidence("high", "the records Scripps Memorial sent"),
      link: { label: "Book a follow up visit", href: "/task/follow-up" },
    }
  }
  const echo = ORDERS.find((o) => o.id === "echo")
  return {
    text: `The record shows a visit with ${v.where.split(", ")[0]} at ${v.where.split(", ")[1] ?? v.where} on ${v.date}.${echo ? ` Dr. Lee ordered an echocardiogram, due ${lower(echo.due)}.` : ""}`,
    ask: "What did Dr. Lee find, and do you need anything from me?",
    about: "cardiology",
    confidence: confidence("medium", "what you told us about the visit"),
  }
}

/** When nothing in the record answers a typed question: what it can help with. */
export const CANT_ANSWER = "I can answer questions about your record: your results, your medicines, your visits and what to ask Dr. Patel."

/* ----------------------------------------------------- typed words -- */

/** The words that point at each marker. Bare short names such as "ALT" or
    "AST" sit inside other words ("salt", "breakfast"), so every pattern
    keeps to whole words. */
const MARKER_WORDS: [string, RegExp][] = [
  ["a1c", /\ba1c\b|hemoglobin a1c|blood sugar|prediabet|diabet/i],
  ["glucose", /\bglucose\b/i],
  ["ldl", /\bldl\b|cholesterol/i],
  ["hdl", /\bhdl\b/i],
  ["tg", /triglycer/i],
  ["bp", /blood pressure|\bbp\b/i],
  ["bmi", /\bbmi\b|body mass/i],
  ["vitd", /vitamin d\b(?!3)/i],
  ["ferritin", /ferritin|\biron\b/i],
  ["tsh", /\btsh\b|thyroid/i],
  ["ft4", /free t4|\bt4\b/i],
  ["b12", /\bb12\b/i],
  ["hemoglobin", /\bhemoglobin\b(?! a1c)/i],
  ["egfr", /\begfr\b|kidney/i],
  ["creatinine", /creatinine/i],
  ["alt", /\balt\b/i],
  ["ast", /\bast\b/i],
  ["potassium", /potassium/i],
  ["sodium", /\bsodium\b/i],
  ["calcium", /\bcalcium\b/i],
  ["platelets", /platelet/i],
  ["wbc", /white (blood )?cells?/i],
]

export type Intent =
  | { kind: "marker"; id: string; ask: Ask }
  | { kind: "test"; id?: string }
  | { kind: "outside"; id: string }
  | { kind: "medicine"; id: string }
  | { kind: "visit" }
  | { kind: "concern"; concern: (typeof CONCERNS)[number] }
  | { kind: "plan" }
  | { kind: "none" }

/** What a typed question is about, so the prototype can answer it. A
    member's plan words and the safety check come first (lib/allowance.ts
    reads them for counting; the screen checks safety before this). */
export function readQuestion(text: string, opts: { markerId?: string; planLive?: boolean } = {}): Intent {
  if (opts.planLive && PLAN_TALK.test(text)) return { kind: "plan" }
  const med = MEDICATIONS.find((m) => new RegExp(`\\b${m.name.toLowerCase()}\\b`, "i").test(text))
  if (med) return { kind: "medicine", id: med.id }
  const named = MARKER_WORDS.find(([, re]) => re.test(text))?.[0]
  const ask: Ask | undefined = /do i have|diagnos|am i (pre)?diabetic/i.test(text)
    ? "diagnosis"
    : /\bwhy\b|cause|going up|going down|rising|falling/i.test(text)
      ? "why"
      : /what can i do|how can i|improve|bring (it )?down|lower it|reduce|keep it/i.test(text)
        ? "help"
        : /\bask\b|question/i.test(text)
          ? "doctor"
          : /\bmean|what is|what's|explain|normal|okay|ok\b|good|bad/i.test(text)
            ? "meaning"
            : undefined
  // A marker named in the question, or the one this conversation is about
  // when the question clearly asks something of it.
  if (named) return { kind: "marker", id: named, ask: ask ?? "meaning" }
  if (opts.markerId && ask) return { kind: "marker", id: opts.markerId, ask }
  const test = TEST_WORDS.find(([, re]) => re.test(text))?.[0]
  if (test) return { kind: "test", id: test }
  if (/\b(test|scan|panel)\b/i.test(text) && /\b(for|what|why)\b/i.test(text)) return { kind: "test" }
  if (/urgent care|scripps|emergency (room|department)/i.test(text)) return { kind: "outside", id: "urgent" }
  if (/what changed|summar/i.test(text) && /cardiolog|dr\.? lee|pacific heart/i.test(text) && !/prepare|follow up/i.test(text)) return { kind: "outside", id: "cardiology" }
  if (/\b(visit|appointment|cardiolog|dr\.? lee)\b/i.test(text)) return { kind: "visit" }
  if (/tired|exhaust|fatigue|no energy|low energy/i.test(text)) return { kind: "concern", concern: CONCERNS[0] }
  if (/lose weight|weight loss|losing weight/i.test(text)) return { kind: "concern", concern: CONCERNS[1] }
  if (/sleep|insomnia/i.test(text)) return { kind: "concern", concern: CONCERNS[2] }
  return { kind: "none" }
}

/** A member's questions about her day: answered from her plan, never counted. */
const PLAN_TALK = /fiber|protein|calorie|sugar|sodium|exercise|workout|strength|session|dinner|lunch|breakfast|snack|meal|walk|today'?s plan|diet|yesterday|how did|so far|how is today/i

/* -------------------------------------------------------- new results -- */

/** A batch of new results as it arrived: where from and how many. */
export function batchOf(id: string, s: Snapshot) {
  const stored = s.batches?.find((b) => b.id === id)
  const sample = NEW_RESULTS[id]
  if (!stored && !sample) return undefined
  const source = sample?.source ?? stored?.source ?? "the lab"
  return { id, source, short: source.split(" ")[0], count: sample?.values.length ?? stored?.count ?? 0, at: stored?.at }
}

/** "Your 4 new results from Quest are in." */
export const batchIntro = (b: { short: string; count: number }) =>
  `Your ${b.count === 1 ? "new result" : `${b.count} new results`} from ${b.short} ${b.count === 1 ? "is" : "are"} in. Want me to explain ${b.count === 1 ? "it" : "them"}?`

export const BATCH_ASK = "Explain my new results"

/** Opened from the results: "Your 4 new results from Quest are in." */
export const batchArrived = (b: { short: string; count: number }) =>
  `Your ${b.count === 1 ? "new result" : `${b.count} new results`} from ${b.short} ${b.count === 1 ? "is" : "are"} in.`

/** The free first explanation of a new batch (F-103): what changed since
    each marker's previous result, in plain words. */
export function batchAnswer(id: string, markers: Biomarker[]): Answer | undefined {
  const sample = NEW_RESULTS[id]
  if (!sample) return undefined
  const rows = sample.values
    .map((v) => markers.find((m) => m.id === v.marker))
    .filter((b): b is Biomarker => Boolean(b))
    .map(classify)
    .filter((t) => t.latest && t.previous)
  if (!rows.length) return undefined
  // Facts only, never a verdict on a single change: "your A1c went from
  // 5.9% to 6.0%, LDL from 162 to 158 mg/dL".
  const clause = (t: Trend, i: number) => {
    const b = t.marker
    const pct = b.unit === "%"
    const from = `${valueText(b, t.previous!)}${pct ? "%" : ""}`
    const to = `${t.value}${pct ? "%" : ` ${b.unit}`}`
    return `${i === 0 ? `your ${nameIn(b)} went` : nameIn(b)} from ${from} to ${to}`
  }
  const short = sample.source.split(" ")[0]
  return {
    text: `Here's what changed since your last results: ${list(rows.map(clause))}. Dr. Patel sees them in your record too.`,
    shows: rows
      .map((t) => `${upper(nameIn(t.marker))}: ${t.valueWithUnit}, ${statusPhrase(t)}, after ${valueText(t.marker, t.previous!)} in ${monthYear(t.previous!.t)}.`)
      .join(" "),
    limits: "One set of results is a snapshot. It can't say yet whether a change will last.",
    ask: "What do my new results mean for my next steps?",
    about: "new-results",
    confidence: confidence("high", `${rows.length} new ${short} results and your earlier ones`),
    facts: rows.map((t) => ({ title: t.marker.name, meta: `${pointDate(t.latest!)}, ${sourceOf(t.latest!)}`, value: t.valueWithUnit, level: t.status })),
  }
}
