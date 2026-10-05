import * as React from "react"

import { needsHelp } from "@/lib/conversation"
import { monthKey } from "@/lib/dates"
import { membershipOn } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"

/* The free record's questions to the assistant (F-100 to F-104, Q-02): 8 a
   month, counted per conversation, so a follow up in the same chat is free.
   Never counted: anything about safety (chest pain, stroke signs, a severe
   allergic reaction, thoughts of self harm), anything about the plan, the
   membership, its price, billing or cancelling, and the first explanation
   of each new batch of results. Opening the chat, opening it about one
   result or seeing suggested questions costs nothing until she sends one
   (A-42). Members have no counter (Q-03).

   The store keeps this month's counted conversations (`allowance`), under
   the local month key, so the questions come back on the 1st where she
   lives (A-40): "Nov 1". */

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]
type Save = ReturnType<typeof useOnboarding>["save"]

/** Free questions a month (Q-02 default; configurable from 5 to 10).
    Members have no count. */
export const FREE_QUESTIONS = 8

/** A conversation stays open this long after its last message; a message
    after that starts a new one. */
export const CONVERSATION_MINUTES = 30

/** This month's free conversations (store field `allowance`): the month
    (local, "2026-10"), the conversations already counted, and the result
    batches already explained for free (kept from month to month). */
export type Allowance = { month: string; threads: string[]; batches: string[] }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** The day the questions come back: the 1st of next month, "Nov 1". */
export const resetDate = (now: Date = new Date()) => `${MONTHS[(now.getMonth() + 1) % 12]} 1`

/** The allowance as this month has it: last month's conversations drop,
    the explained batches stay. */
function current(a: Allowance | undefined, now: Date): Allowance {
  const month = monthKey(now)
  return { month, threads: a?.month === month ? (a.threads ?? []) : [], batches: a?.batches ?? [] }
}

/** This month's count and its words. */
export function allowanceOf(a: Allowance | undefined, now: Date = new Date()) {
  const used = Math.min(current(a, now).threads.length, FREE_QUESTIONS)
  const left = FREE_QUESTIONS - used
  const resetsOn = resetDate(now)
  return {
    total: FREE_QUESTIONS,
    used,
    left,
    /** "Nov 1" */
    resetsOn,
    /** The AI is metered in tokens now (user, 5 Oct 2026), so the words
        speak of credit, not questions: "75% of this month's AI credit
        left", "No AI credit left until Nov 1". The orb's ring draws it. */
    line: left === 0 ? `No AI credit left until ${resetsOn}` : `${Math.round((left / FREE_QUESTIONS) * 100)}% of this month's AI credit left`,
  }
}

/* ------------------------------------------------------------ counting -- */

/** What a sent message is about, for counting: her record (counted once a
    conversation), a new batch of results (its first explanation free), the
    plan or the membership, or safety (never counted). */
export type QuestionKind = "record" | "batch" | "plan" | "safety"

/** Red flags that go to a person at once (L-30), on top of the crisis
    words in lib/conversation.ts. A stand in for the clinician designed
    list. */
const RED_FLAGS =
  /chest (pain|pressure|tightness)|can'?t breathe|cannot breathe|trouble breathing|short(ness)? of breath|faint|passed out|stroke|face (is )?droop|slurred|numb(ness)? on one side|severe allergic|anaphyla|throat (is )?(closing|swelling)|seizure/i

/** The plan, the membership and what it costs. */
const PLAN_WORDS = /\b(plans?|membership|member|subscri(be|ption)|price|pricing|costs?|billing|bill(ed)?|charge(d)?|payments?|refund|cancel(l?ing)?|pause|optimization)\b/i

/** Which kind a message is, from its words and the topic the chat was
    opened on ("plan" for "Ask about your plan", "batch" for "Explain my
    new results"). */
export function questionKind(text: string, topic?: string): QuestionKind {
  if (needsHelp(text) || RED_FLAGS.test(text)) return "safety"
  if (topic === "plan" || PLAN_WORDS.test(text)) return "plan"
  if (topic === "batch") return "batch"
  return "record"
}

/** What sending costs: 0 for safety, the plan, the membership, billing or
    cancelling, for a message in a conversation already counted, and for
    the first explanation of a new batch; 1 for the first counted message
    of a new conversation. A safety or plan question is never counted,
    whatever kind the screen passed. */
export function costOf(
  input: { text: string; threadId: string; kind: QuestionKind; batch?: string },
  a: Allowance | undefined,
  now: Date = new Date()
): 0 | 1 {
  const said = questionKind(input.text)
  const kind = said === "safety" || said === "plan" ? said : input.kind
  if (kind === "safety" || kind === "plan") return 0
  const mine = current(a, now)
  if (mine.threads.includes(input.threadId)) return 0
  if (kind === "batch" && input.batch && !mine.batches.includes(input.batch)) return 0
  return 1
}

/** The allowance with one more counted conversation (unchanged when it is
    already counted this month). */
export function spend(a: Allowance | undefined, threadId: string, now: Date = new Date()): Allowance {
  const mine = current(a, now)
  return mine.threads.includes(threadId) ? mine : { ...mine, threads: [...mine.threads, threadId] }
}

/** The allowance with a batch's free explanation used. */
export function markBatch(a: Allowance | undefined, batch: string, now: Date = new Date()): Allowance {
  const mine = current(a, now)
  return mine.batches.includes(batch) ? mine : { ...mine, batches: [...mine.batches, batch] }
}

/** A paid membership that is on: questions are never counted. A paused
    one counts like the free record. */
const memberOf = (s: Snapshot) => membershipOn(s.membership) && !s.membership?.paused

/** The allowance of the patient on this device, with the two writes the
    assistant needs. `spend(threadId)` counts a new conversation and says
    whether the message may go: true when it was counted or is free (a
    member, a conversation already counted), false at the cap, when the
    message stays in the composer and the limit card shows. Check
    `costOf()` first: a message that costs 0 never needs `spend`. For a
    member the count reads as full and the line is empty. */
export function useAllowance() {
  const onboarding = useOnboarding()
  const ref = React.useRef<Writer>({ s: onboarding })
  ref.current.s = onboarding
  const member = memberOf(onboarding)
  const counts = allowanceOf(onboarding.allowance)

  const spendThread = React.useCallback((threadId: string) => {
    const w = ref.current
    if (memberOf(w.s)) return true
    const mine = current(newest(w), new Date())
    if (mine.threads.includes(threadId)) return true
    if (mine.threads.length >= FREE_QUESTIONS) return false
    write(w, spend(mine, threadId))
    return true
  }, [])

  const markBatchUsed = React.useCallback((batch: string) => {
    const w = ref.current
    if (memberOf(w.s)) return
    const mine = current(newest(w), new Date())
    if (!mine.batches.includes(batch)) write(w, markBatch(mine, batch))
  }, [])

  return {
    ...(member ? { ...counts, used: 0, left: counts.total, line: "" } : counts),
    member,
    spend: spendThread,
    markBatch: markBatchUsed,
  }
}

/* Two writes in one moment (a count, then a batch) build on the newer one,
   unless the store was replaced since (a review control). */
type Writer = { s: ReturnType<typeof useOnboarding>; wrote?: { from?: Allowance; next: Allowance } }

function newest(w: Writer) {
  const stored = w.s.allowance
  return w.wrote && (stored === w.wrote.from || stored === w.wrote.next) ? w.wrote.next : stored
}

function write(w: Writer, next: Allowance) {
  w.wrote = { from: w.s.allowance, next }
  w.s.save({ allowance: next }).catch(() => {})
}

/** The calm card in the thread at the cap (F-104): never shown when the app
    opens, and it never cuts an answer short. Saving the question for her
    visit comes first, the membership second and quiet. */
export function limitCard(now: Date = new Date()) {
  return {
    title: "You've used this month's AI credit",
    body: `It comes back on ${resetDate(now)}. Your record, trends and past answers are all still here.`,
    save: "Save for my next visit",
    more: "See what members get",
  }
}

/* ---------------------------------------------------- review controls -- */

/** Review build controls (/demo): use every free question this month, or
    give them all back. */
export function spendAllQuestions(s: Snapshot, save: Save, now: Date = new Date()) {
  const mine = current(s.allowance, now)
  const threads = [...mine.threads]
  for (let i = threads.length; i < FREE_QUESTIONS; i++) threads.push(`demo-${i + 1}`)
  return save({ allowance: { ...mine, threads } })
}

export function giveBackQuestions(s: Snapshot, save: Save, now: Date = new Date()) {
  return save({ allowance: { month: monthKey(now), threads: [], batches: [] } })
}
